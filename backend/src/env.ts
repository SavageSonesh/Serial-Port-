import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env (secrets never leave this process; never sent to the frontend).
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export const env = {
  port: Number(process.env.PORT || 3001),
  host: '127.0.0.1', // hard-coded loopback: this app is never exposed publicly
  youtubeApiKey: process.env.YOUTUBE_API_KEY?.trim() || null,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL?.trim() || 'llama3.2',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
};
