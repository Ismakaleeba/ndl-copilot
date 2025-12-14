import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create a client. We connect eagerly so errors surface early in Codespaces.
const client = createClient({ url: REDIS_URL });

client.on('error', (err) => {
  // Log but don't crash the process; enqueueJob will throw if called without a connection.
  console.error('[queue] Redis client error:', err);
});

client.on('connect', () => console.log('[queue] Connecting to Redis...'));
client.on('ready', () => console.log('[queue] Redis client ready'));

// Connect at module load (top-level await supported in Node >= 18)
try {
  await client.connect();
} catch (err) {
  console.error('[queue] Redis connection failed:', err);
}

/**
 * Enqueue a job to the `copilot-jobs` stream.
 * @param {object} job - job payload (will be JSON-stringified)
 * @returns {Promise<string>} - redis stream id for the added entry
 */
export async function enqueueJob(job) {
  if (!client || client.isOpen === false) {
    const msg = '[queue] Redis client not connected';
    console.error(msg);
    throw new Error(msg);
  }

  try {
    // Use XADD to append to the stream. Store the full job under field 'job'.
    const id = await client.sendCommand(['XADD', 'copilot-jobs', '*', 'job', JSON.stringify(job)]);
    console.log(`[queue] Enqueued job ${job.id} as stream id ${id}`);
    return id;
  } catch (err) {
    console.error('[queue] Failed to enqueue job:', err);
    throw err;
  }
}

export default { enqueueJob, client };

