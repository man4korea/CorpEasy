// 📁 backend/index.js
// Create at 2504292200 Ver1.3

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002; // 3002가 바로 탑시 폰트

// 미드워어 설정
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

app.post('/api/extract-captions', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: '분석할 URL이 필요합니다.' });
    }

    let videoId;
    try {
        if (url.includes('youtube.com/watch')) {
            videoId = new URL(url).searchParams.get('v');
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        }

        if (!videoId) {
            return res.status(400).json({ error: '유효한 YouTube URL이 아닙니다.' });
        }
    } catch (error) {
        return res.status(400).json({ error: '유효한 URL 형식이 아닙니다.' });
    }

    try {
        const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const pageText = await pageResponse.text();

        const titleMatch = pageText.match(/"title":"(.*?)"/);
        const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : '제목 없음';

        const captionTracks = pageText.match(/"captionTracks":\[(.*?)\]/);
        if (!captionTracks) {
            return res.status(400).json({ error: '이 동영상에서 자막을 찾을 수 없습니다.' });
        }

        const tracks = JSON.parse(`[${captionTracks[1]}]`);

        const koreanTrack = tracks.find(track =>
            track.languageCode === 'ko' &&
            (track.kind === 'asr' || track.kind === 'standard')
        );

        if (!koreanTrack) {
            return res.status(400).json({ error: '한국어 자막을 찾을 수 없습니다.' });
        }

        const transcriptUrl = koreanTrack.baseUrl + '&fmt=json3';
        const transcriptResponse = await fetch(transcriptUrl);

        if (!transcriptResponse.ok) {
            throw new Error('자막을 가져오는데 실패했습니다.');
        }

        const transcriptData = await transcriptResponse.json();

        const segments = transcriptData.events
            .filter(event => event.segs && event.segs.length > 0)
            .map(event => {
                const text = event.segs.map(seg => seg.utf8).join('').trim();
                const startTime = formatTime(event.tStartMs);
                return `[${startTime}] ${text}`;
            })
            .filter(text => text.trim());

        return res.json({
            title: title,
            url: url,
            captions: segments.join('\n')
        });

    } catch (error) {
        console.error('자막 추출 중 오류:', error);
        return res.status(500).json({ error: '자막 추출 실패: ' + (error.message || '알 수 없는 오류가 발생했습니다.') });
    }
});

function decodeHtmlEntities(text) {
    const entities = {
        '&quot;': '"',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&#39;': "'",
        '&apos;': "'",
    };
    return text.replace(/&quot;|&amp;|&lt;|&gt;|&#39;|&apos;/g, match => entities[match]);
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
