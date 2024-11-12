import { WebSocketServer } from 'ws';
import { createOpenAIConnection } from './openai-connection';
import { logger } from './logger';

const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 8080;

export function startWebSocketServer() {
  const server = new WebSocketServer({ port: Number(WEBSOCKET_PORT) });

  server.on('connection', (clientWs) => {
    logger.info('Client connected');

    const openAiConnection = createOpenAIConnection(clientWs);

    clientWs.on('close', () => {
      logger.info('Client disconnected');
      openAiConnection.close();
    });

    clientWs.on('error', (error) => {
      logger.error('Client error:', error);
      openAiConnection.close();
    });
  });

  server.on('error', (error) => {
    logger.error('WebSocket server error:', error);
  });

  logger.info(`WebSocket server started on port ${WEBSOCKET_PORT}`);
  return server;
}