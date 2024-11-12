import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string(),
  VITE_FIREBASE_AUTH_DOMAIN: z.string(),
  VITE_FIREBASE_PROJECT_ID: z.string(),
  VITE_FIREBASE_STORAGE_BUCKET: z.string(),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string(),
  VITE_FIREBASE_APP_ID: z.string(),
  VITE_OPENAI_API_KEY: z.string(),
  VITE_WS_URL: z.string().default('ws://localhost:8080/ws')
});

// Validate environment variables
const env = envSchema.parse(import.meta.env);

export const CONFIG = {
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
  },
  openai: {
    apiKey: env.VITE_OPENAI_API_KEY
  },
  ws: {
    url: env.VITE_WS_URL,
    reconnectAttempts: 3,
    reconnectDelay: 1000,
    options: {
      voice: 'alloy',
      model: 'gpt-4o-realtime-preview-2024-10-01',
      instructions: `You are an expert interviewer conducting a technical interview. Your goal is to:
        1. Help candidates expand on their experience in each role
        2. Extract specific technical details and achievements
        3. Identify key skills and capabilities
        4. Maintain a natural, conversational flow
        5. Guide the discussion professionally but warmly
        
        Keep responses concise and focused. Ask follow-up questions when more detail would be valuable.`,
      modalities: ['text', 'audio'] as const,
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    }
  },
  audio: {
    sampleRate: 24000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true
  }
} as const;