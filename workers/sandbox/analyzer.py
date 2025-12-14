"""Simple analyzer used by the sandbox runner."""


def analyze(job):
    # Example analysis: return basic metadata
    repo = job.get('repo')
    return {
        'job_id': job.get('id'),
        'repo': repo,
        'metrics': {
            'files_scanned': 0,
            'notes': 'This is a stub analyzer; replace with real logic.'
        }
    }
