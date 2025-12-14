import request from 'supertest';
import { strict as assert } from 'assert';
import app from '../src/app.js';

describe('Health endpoint', () => {
  it('responds 200 and {status:ok}', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('root returns service info', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(Array.isArray(res.body.endpoints));
  });

  it('readiness endpoint checks redis and returns worker status', async () => {
    const res = await request(app).get('/health/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.services.redis, 'ok');
    assert.ok(['ok', 'no-consumers', 'no-group', 'unknown'].includes(res.body.services.worker));
  });
});
