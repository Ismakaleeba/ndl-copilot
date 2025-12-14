"""Sandbox worker runner.

Connects to Redis stream `copilot-jobs` in a consumer group and processes
jobs by cloning the repo, running analysis in a sandbox (Docker), and
writing a JSON report back to Redis under `report:<project_id>` and
appending an entry to `copilot-results`.

Notes:
- Requires `git` and `docker` in PATH for sandboxing. If `docker` is
  not available the worker will log and mark job as failed.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from typing import Dict, Any

import redis

from analyzer import analyze


REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
STREAM = 'copilot-jobs'
GROUP = 'copilot-group'
CONSUMER = f'worker-{os.getpid()}'


def ensure_group(r: redis.Redis):
    try:
        # Use id='0' so new consumer groups will process existing backlog during development.
        # In production you may prefer '$' to only process new messages.
        r.xgroup_create(STREAM, GROUP, id='0', mkstream=True)
    except redis.exceptions.ResponseError as e:
        # group already exists
        if 'BUSYGROUP' in str(e):
            pass
        else:
            raise


def run_in_docker(language: str, path: str) -> Dict[str, Any]:
    """Run linter and tests inside a language-appropriate docker container.

    Returns a dict with `tests_passed` (bool), `linter_output` (str),
    and `test_output` (str).
    """
    docker_bin = shutil.which('docker')
    if not docker_bin:
        return {
            'error': 'docker-not-available',
            'tests_passed': False,
            'linter_output': '',
            'test_output': 'docker binary not found',
        }

    if language == 'python':
        image = 'python:3.11-slim'
        linter_cmd = 'flake8 .'  # may not be present
        test_cmd = 'pytest -q'
        install_cmd = 'pip install -r requirements.txt || true'
    elif language == 'node':
        image = 'node:20-bullseye'
        linter_cmd = 'npx eslint . || true'
        test_cmd = 'npm test'
        install_cmd = 'npm ci --no-audit --no-fund || npm install --no-audit --no-fund'
    else:
        # Unknown language - skip tests
        return {'error': 'unsupported-language', 'tests_passed': False, 'linter_output': '', 'test_output': ''}

    # Build the shell command to run inside the container
    shell = f"{install_cmd} && {linter_cmd} > /tmp/linter 2>&1 || true; {test_cmd} > /tmp/tests 2>&1"

    cmd = [
        docker_bin,
        'run',
        '--rm',
        '-v',
        f'{path}:/work',
        '-w',
        '/work',
        image,
        'bash',
        '-lc',
        shell,
    ]

    proc = subprocess.run(cmd, capture_output=True, text=True)

    # After container run, to get outputs read from a helper container that cat files out
    out = {
        'tests_passed': proc.returncode == 0,
        'linter_output': '',
        'test_output': '',
        'exit_code': proc.returncode,
    }

    # If run created /tmp/linter or /tmp/tests inside container, we can't access them now.
    # Instead, attempt to rerun linter/test in a short helper container that prints outputs
    dump_cmd = [
        docker_bin,
        'run',
        '--rm',
        '-v',
        f'{path}:/work',
        '-w',
        '/work',
        image,
        'bash',
        '-lc',
        f"( {install_cmd} >/dev/null 2>&1 ; {linter_cmd} ) 2>&1 || true; echo '---TESTS---'; ( {test_cmd} ) 2>&1 || true",
    ]

    dump = subprocess.run(dump_cmd, capture_output=True, text=True)
    combined = dump.stdout + "\n" + dump.stderr
    # Split by marker
    if '---TESTS---' in combined:
        lout, tout = combined.split('---TESTS---', 1)
        out['linter_output'] = lout.strip()
        out['test_output'] = tout.strip()
    else:
        out['linter_output'] = combined.strip()
        out['test_output'] = ''

    return out


def detect_language(path: str) -> str:
    # Simple heuristics
    if os.path.exists(os.path.join(path, 'package.json')):
        return 'node'
    if os.path.exists(os.path.join(path, 'requirements.txt')) or os.path.exists(os.path.join(path, 'pyproject.toml')):
        return 'python'
    # fallback: look for .py files
    for root, _, files in os.walk(path):
        for f in files:
            if f.endswith('.py'):
                return 'python'
            if f.endswith('.js'):
                return 'node'
    return 'unknown'


def process_job(r: redis.Redis, job: Dict[str, Any], msg_id: str):
    project_id = job.get('id') or job.get('project_id') or f"job-{int(time.time())}"
    repo = job.get('repo') or job.get('github_url') or job.get('repo_url')
    commit = job.get('commit') or job.get('ref') or 'HEAD'

    print(f"[worker] Job received: project_id={project_id} repo={repo}")

    report = {
        'project_id': project_id,
        'received_at': time.time(),
        'repo': repo,
        'commit': commit,
        'status': 'failed',
        'metrics': {},
    }

    if not repo:
        report['error'] = 'no repo provided'
        r.set(f'report:{project_id}', json.dumps(report))
        r.xadd('copilot-results', {'project': project_id, 'report': json.dumps(report)})
        r.xack(STREAM, GROUP, msg_id)
        print('[worker] Missing repo in job; acked and saved report')
        return

    # Clone repository
    try:
        with tempfile.TemporaryDirectory() as td:
            clone_cmd = ['git', 'clone', '--depth', '1', repo, td]
            subprocess.run(clone_cmd, check=True, capture_output=True)
            # If a specific commit is requested, try to checkout
            if commit and commit != 'HEAD':
                subprocess.run(['git', '-C', td, 'fetch', 'origin', commit], check=False)
                subprocess.run(['git', '-C', td, 'checkout', commit], check=False)

            lang = detect_language(td)
            print(f"[worker] Detected language: {lang}")

            # Run analysis in container
            sandbox_out = run_in_docker(lang, td)

            # Compute scores simplistically
            tests_passed = sandbox_out.get('tests_passed', False)
            linter_out = sandbox_out.get('linter_output', '')
            linter_issues = len([l for l in linter_out.splitlines() if l.strip()])

            functionality = 100 if tests_passed else 50
            clean_code = max(0, 100 - linter_issues * 2)

            report.update({
                'status': 'done',
                'language': lang,
                'metrics': {
                    'tests_passed': tests_passed,
                    'linter_issues': linter_issues,
                    'functionality_score': functionality,
                    'clean_code_score': clean_code,
                },
                'raw': {
                    'linter_output': linter_out,
                    'test_output': sandbox_out.get('test_output', ''),
                },
            })

            # Save report
            r.set(f'report:{project_id}', json.dumps(report))
            r.xadd('copilot-results', {'project': project_id, 'report': json.dumps(report)})
            r.xack(STREAM, GROUP, msg_id)
            print(f"[worker] Job complete: project_id={project_id}")
            return
    except subprocess.CalledProcessError as e:
        report['error'] = f'git error: {e.stderr.decode() if e.stderr else str(e)}'
        r.set(f'report:{project_id}', json.dumps(report))
        r.xadd('copilot-results', {'project': project_id, 'report': json.dumps(report)})
        r.xack(STREAM, GROUP, msg_id)
        print('[worker] Git clone failed; acked and saved report')
        return


def main():
    print('[worker] Starting sandbox worker')
    r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    try:
        r.ping()
        print('[worker] Connected to Redis, waiting for jobs...')
    except Exception as e:
        print('[worker] Redis connection failed:', e)
        sys.exit(1)

    ensure_group(r)
    # After creating group, attempt to read any existing backlog once so we don't miss jobs
    try:
        backlog = r.xreadgroup(GROUP, CONSUMER, {STREAM: '0'}, count=10, block=1000)
        if backlog:
            for stream, msgs in backlog:
                for msg_id, body in msgs:
                    raw = body.get('job') or body.get('payload') or next(iter(body.values()))
                    try:
                        job = json.loads(raw)
                    except Exception:
                        job = {'raw': raw}
                    process_job(r, job, msg_id)
    except Exception:
        # ignore backlog read errors and continue
        pass

    while True:
        try:
            # XREADGROUP to get next message
            entries = r.xreadgroup(GROUP, CONSUMER, {STREAM: '>'}, count=1, block=5000)
            if not entries:
                continue

            # entries is a list of (stream, [(id, {field: value}), ...])
            for stream, msgs in entries:
                for msg_id, body in msgs:
                    # body should contain 'job' field with JSON
                    raw = body.get('job') or body.get('payload') or next(iter(body.values()))
                    try:
                        job = json.loads(raw)
                    except Exception:
                        job = {'raw': raw}
                    process_job(r, job, msg_id)

        except Exception as e:
            print('[worker] Error in main loop:', e)
            time.sleep(2)


if __name__ == '__main__':
    main()
