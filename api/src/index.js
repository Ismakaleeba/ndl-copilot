import app from './app.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
	console.log(`API listening on http://${HOST}:${PORT}`);
});

// Graceful shutdown
const shutdown = (signal) => {
	console.log(`Received ${signal}, shutting down...`);
	server.close(() => {
		console.log('HTTP server closed');
		process.exit(0);
	});
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
	console.error('Uncaught exception:', err);
	shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
	console.error('Unhandled promise rejection:', reason);
	shutdown('unhandledRejection');
});
