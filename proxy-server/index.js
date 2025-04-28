// 📁 D:\APP\corpeasy\proxy-server\index.js

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

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

app.listen(3002, () => {
  console.log('✅ Proxy server running at http://localhost:3002');
});
