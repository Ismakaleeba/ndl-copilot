import request from 'supertest';
import { strict as assert } from 'assert';
import app from '../src/app.js';
import queue from '../src/services/queue.js';

describe('Projects endpoint', () => {
  before(() => {
    // Monkey-patch `enqueueJob` on the exported queue object to avoid depending on Redis during tests
    queue.enqueueJob = async (job) => {
      // simulate returning a stream id
      return 'mock-0-123';
    };
  });

  it('rejects without repo', async () => {
    const res = await request(app).post('/api/v1/projects').send({});
    assert.equal(res.status, 400);
  });

  it('creates project and enqueues job', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send({ repo: 'https://example.com/repo.git' });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'queued');
    assert.ok(res.body.project_id);
    assert.equal(res.body.queue_id, 'mock-0-123');
  });

  it('returns 404 for missing report, then 200 when present', async () => {
    const create = await request(app).post('/api/v1/projects').send({ repo: 'https://example.com/repo.git' });
    const pid = create.body.project_id;

    // ensure report missing
    const miss = await request(app).get(`/api/v1/projects/${pid}/auto-report`);
    assert.equal(miss.status, 404);

    // Monkeypatch redis client get to return a report
    const report = { project_id: pid, status: 'done', metrics: { tests_passed: true } };
    queue.client.get = async (key) => JSON.stringify(report);

    const ok = await request(app).get(`/api/v1/projects/${pid}/auto-report`);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.project_id, pid);
  });

  it('accepts github_url alias in POST', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send({ github_url: 'https://example.com/repo.git' });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'queued');
    assert.ok(res.body.project_id);
  });

  it('lists projects', async () => {
    const res = await request(app).get('/api/v1/projects');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.projects));
    assert.ok(res.body.projects.length >= 1);
  });
});
