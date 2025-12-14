import express from 'express';
import crypto from 'crypto';
import queue from '../services/queue.js';

const router = express.Router();

// In-memory store for project metadata (replace with DB in production)
const projectsStore = new Map();

// Example route - list projects
router.get('/', (req, res) => {
  const projects = Array.from(projectsStore.values());
  res.json({ projects: projects.length ? projects : [{ id: 'example', name: 'Example project' }] });
});

// Create a new project and enqueue an analysis job
router.post('/', async (req, res) => {
  const body = req.body || {};
  const id = body.id;
  const repo = body.repo || body.github_url || body.repo_url;
  const commit = body.commit;
  const payload = body.payload;

  if (!repo) {
    return res.status(400).json({ error: 'repo (or github_url) is required' });
  }

  const projectId = id || crypto.randomUUID();
  const project = {
    id: projectId,
    repo,
    commit: commit || 'HEAD',
    payload: payload || {},
    created_at: new Date().toISOString(),
  };

  // Persist metadata in-memory (sufficient for local dev / demos)
  projectsStore.set(projectId, project);

  // Enqueue the job to Redis stream
  try {
    const queueId = await queue.enqueueJob({ id: projectId, repo, commit: project.commit, payload: project.payload });
    console.log(`[projects] Enqueued project ${projectId} as ${queueId}`);
    return res.status(201).json({ project_id: projectId, status: 'queued', queue_id: queueId });
  } catch (err) {
    console.error('[projects] Failed to enqueue job', err);
    return res.status(500).json({ error: 'failed to enqueue job' });
  }
});

// Retrieve auto-generated report for a project
router.get('/:project_id/auto-report', async (req, res) => {
  const projectId = req.params.project_id;
  const key = `report:${projectId}`;

  try {
    if (!queue.client || queue.client.isOpen === false) {
      return res.status(503).json({ error: 'redis unavailable' });
    }

    const raw = await queue.client.get(key);
    if (!raw) {
      return res.status(404).json({ error: 'report not found' });
    }

    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[projects] failed to read report', err);
    return res.status(500).json({ error: 'failed to read report' });
  }
});

export default router;

// Project status endpoint
router.get('/:project_id/status', async (req, res) => {
  const projectId = req.params.project_id;
  try {
    // Check if a report exists
    if (queue.client && queue.client.isOpen) {
      const raw = await queue.client.get(`report:${projectId}`);
      if (raw) return res.json({ project_id: projectId, status: 'auto-done' });

      // Check stream for a matching job entry
      const entries = await queue.client.sendCommand(['XRANGE', 'copilot-jobs', '-', '+']);
      if (Array.isArray(entries)) {
        for (const e of entries) {
          const fields = e[1];
          for (let i = 0; i < fields.length; i += 2) {
            const key = fields[i];
            const val = fields[i + 1];
            if (key === 'job') {
              try {
                const job = JSON.parse(val);
                if (job.id === projectId) {
                  return res.json({ project_id: projectId, status: 'queued' });
                }
              } catch (err) {
                // ignore parse errors
              }
            }
          }
        }
      }
      return res.json({ project_id: projectId, status: 'pending' });
    }

    return res.status(503).json({ error: 'redis unavailable' });
  } catch (err) {
    console.error('[projects] status check failed', err);
    return res.status(500).json({ error: 'status check failed' });
  }
});
