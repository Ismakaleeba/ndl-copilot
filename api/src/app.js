import express from 'express';
import cors from 'cors';
import projects from './routes/projects.js';
import queue from './services/queue.js';

const app = express();

// Security & parsing middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health and root endpoints
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) =>
	res.json({ status: 'ok', service: 'ndl-copilot API', endpoints: ['/health', '/projects'] })
);

// Readiness endpoint: lightweight check that Redis is reachable and
// reports worker consumer status when available. Returns 200 if Redis
// is reachable; includes worker status in the JSON body.
app.get('/health/ready', async (req, res) => {
	const client = queue && queue.client;
	if (!client) {
		return res.status(503).json({ status: 'degraded', error: 'redis client unavailable' });
	}

	try {
		await client.ping();
	} catch (err) {
		return res.status(503).json({ status: 'degraded', error: 'redis unreachable', detail: String(err) });
	}

	// Determine worker group/consumer presence when possible; don't fail readiness
	// if consumers are not present — include status for visibility.
	let worker = 'unknown';
	try {
		const groups = await client.sendCommand(['XINFO', 'GROUPS', 'copilot-jobs']).catch(() => null);
		if (Array.isArray(groups) && groups.length > 0) {
			// If groups exist, check for any consumers
			const consumers = await client.sendCommand(['XINFO', 'CONSUMERS', 'copilot-jobs', 'copilot-group']).catch(() => null);
			worker = Array.isArray(consumers) && consumers.length > 0 ? 'ok' : 'no-consumers';
		} else {
			worker = 'no-group';
		}
	} catch (err) {
		worker = 'unknown';
	}

	return res.status(200).json({ status: 'ok', services: { redis: 'ok', worker } });
});

// Mount project routes under the API versioned path
app.use('/api/v1/projects', projects);

export default app;
