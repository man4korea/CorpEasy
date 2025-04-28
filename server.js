// 📁 server.js (개발용 Node.js 프록시 서버)

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = 3002; // 개발용 포트

app.use(cors()); // 모든 CORS 허용 (개발 시 필요)

app.get('/api/youtube-transcript', async (req, res) => {
  try {
    const { videoUrl } = req.query;
    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl parameter' });
    }

    console.log('Fetching from YouTube:', videoUrl);

    const pageResponse = await fetch(videoUrl);
    const pageText = await pageResponse.text();

    const captionTracksMatch = pageText.match(/"captionTracks":\[(.*?)\]/);
    if (!captionTracksMatch) {
      return res.status(404).json({ error: 'No caption tracks found' });
    }

    const tracks = JSON.parse(`[${captionTracksMatch[1]}]`);
    const koreanTrack = tracks.find(track =>
      track.languageCode === 'ko' && (track.kind === 'asr' || track.kind === 'standard')
    );

    if (!koreanTrack) {
      return res.status(404).json({ error: 'No Korean captions found' });
    }

    const transcriptUrl = koreanTrack.baseUrl + '&fmt=json3';
    const transcriptResponse = await fetch(transcriptUrl);
    const transcriptData = await transcriptResponse.json();

    const segments = transcriptData.events
      .filter(event => event.segs && event.segs.length > 0)
      .map(event => event.segs.map(seg => seg.utf8).join(''))
      .filter(text => text.trim());

    res.json({
      transcript: segments.join('\n')
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});
