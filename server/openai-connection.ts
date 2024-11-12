import WebSocket from 'ws';
import { logger } from './logger';

const OPENAI_API_URL = 'wss://api.openai.com/v1/realtime';
const MODEL = 'gpt-4o-realtime-preview-2024-10-01';

export function createOpenAIConnection(clientWs: WebSocket) {
  const url = `${OPENAI_API_URL}?model=${MODEL}`;
  
  const openAiWs = new WebSocket(url, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });

  openAiWs.on('open', () => {
    logger.info('Connected to OpenAI');
  });

  openAiWs.on('message', (message) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(message.toString());
    }
  });

  openAiWs.on('error', (error) => {
    logger.error('OpenAI connection error:', error);
    clientWs.close();
  });

  openAiWs.on('close', () => {
    logger.info('OpenAI connection closed');
    clientWs.close();
  });

  // Forward messages from client to OpenAI
  clientWs.on('message', (message) => {
    if (openAiWs.readyState === WebSocket.OPEN) {
      openAiWs.send(message.toString());
    }
  });

  return {
    close: () => {
      if (openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close();
      }
    }
  };
}