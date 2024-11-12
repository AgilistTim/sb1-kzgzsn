import { config } from 'dotenv';
import { startWebSocketServer } from './websocket-server';
import { logger } from './logger';

// Load environment variables
config();

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Set log level from environment
logger.setLevel((process.env.LOG_LEVEL || 'info') as any);

// Start WebSocket server
const server = startWebSocketServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});