// 📁 functions/index.js
// 250428 VER1.0
import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// ✅ [추가] YouTube Proxy API
app.get('/api/youtube-proxy', async (req, res) => {
  const { videoUrl } = req.query;
  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing videoUrl' });
  }
  try {
    const youtubeResponse = await fetch(videoUrl);
    const text = await youtubeResponse.text();
    res.send(text);
  } catch (error) {
    console.error('Proxy fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch YouTube page' });
  }
});

// 기존 API
app.get('/', (req, res) => {
  res.send('Hello from 2nd Gen Functions!');
});

export const api = onRequest({ cors: true }, app);
