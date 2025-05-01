// 📁 backend/yt-dlp-server.js
// Create at 2505011212 Ver1.0 (Tokyo time)

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3003;

app.use(cors());

// 자막 추출 API
app.get('/api/subtitle', async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  const ytDlpPath = 'D:/Tools/yt-dlp/yt-dlp.exe';
  const outputName = `${videoId}.ko.vtt`;
  const outputPath = path.resolve(__dirname, outputName);

  // yt-dlp 명령어
  const command = `"${ytDlpPath}" --write-auto-sub --sub-lang ko --skip-download -o "${videoId}" https://www.youtube.com/watch?v=${videoId}`;

  exec(command, { cwd: __dirname }, async (error, stdout, stderr) => {
    if (error) {
      console.error('[yt-dlp error]', stderr);
      return res.status(500).json({ error: 'yt-dlp execution failed' });
    }

    if (!fs.existsSync(outputPath)) {
      return res.status(404).json({ error: 'Subtitle file not found' });
    }

    // .vtt 파일 읽기 및 텍스트 파싱
    const raw = fs.readFileSync(outputPath, 'utf-8');
    const lines = raw.split('\n');
    const textLines = lines.filter(line => line.trim() && !/^\d+$/.test(line) && !line.includes('-->') && !line.startsWith('WEBVTT'));
    const transcript = textLines.join('\n');

    // 응답 및 임시 파일 삭제
    res.json({ videoId, transcript });
    fs.unlinkSync(outputPath);
  });
});

app.listen(PORT, () => {
  console.log(`yt-dlp subtitle API server running on port ${PORT}`);
});