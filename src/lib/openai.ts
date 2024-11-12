import OpenAI from 'openai';

if (!import.meta.env.VITE_OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key in environment variables');
}

export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
});

// Initialize with default configuration
openai.baseURL = 'https://api.openai.com/v1';
openai.timeout = 30000; // 30 second timeout
openai.maxRetries = 3;