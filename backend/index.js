// 📁 backend/index.js
// Create at 2504251030 Ver1.2

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');
const util = require('util');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

/**
 * YouTube 자막 추출 API 엔드포인트
 * 
 * @route POST /api/extract-captions
 * @param {string} url - YouTube 동영상 URL
 * @returns {Object} 동영상 제목, URL, 자막 내용을 포함한 JSON 응답
 */
app.post('/api/extract-captions', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: '분석할 URL이 필요합니다.' });
    }

    // YouTube URL에서 비디오 ID 추출
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
        // YouTube 페이지에서 자막 정보 가져오기
        const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const pageText = await pageResponse.text();

        // 동영상 제목 추출
        const titleMatch = pageText.match(/"title":"(.*?)"/);
        const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : '제목 없음';

        // 자막 트랙 찾기
        const captionTracks = pageText.match(/"captionTracks":\[(.*?)\]/);
        if (!captionTracks) {
            return res.status(400).json({ error: '이 동영상에서 자막을 찾을 수 없습니다.' });
        }

        const tracks = JSON.parse(`[${captionTracks[1]}]`);

        // 한국어 자막 찾기
        const koreanTrack = tracks.find(track => 
            track.languageCode === 'ko' && 
            (track.kind === 'asr' || track.kind === 'standard')
        );

        if (!koreanTrack) {
            return res.status(400).json({ error: '한국어 자막을 찾을 수 없습니다.' });
        }

        // 자막 URL 생성 및 가져오기
        const transcriptUrl = koreanTrack.baseUrl + '&fmt=json3';
        const transcriptResponse = await fetch(transcriptUrl);
        
        if (!transcriptResponse.ok) {
            throw new Error('자막을 가져오는데 실패했습니다.');
        }

        const transcriptData = await transcriptResponse.json();

        // 자막 텍스트 추출 및 정리
        const segments = transcriptData.events
            .filter(event => event.segs && event.segs.length > 0)
            .map(event => {
                const text = event.segs.map(seg => seg.utf8).join('').trim();
                const startTime = formatTime(event.tStartMs);
                return `[${startTime}] ${text}`;
            })
            .filter(text => text.trim());

        // 성공 응답 반환
        return res.json({
            title: title,
            url: url,
            captions: segments.join('\n')
        });

    } catch (error) {
        console.error('자막 추출 중 오류:', error);
        return res.status(500).json({ 
            error: '자막 추출 실패: ' + (error.message || '알 수 없는 오류가 발생했습니다.') 
        });
    }
});

/**
 * HTML 엔티티를 디코딩하는 함수
 * @param {string} text - 디코딩할 텍스트
 * @returns {string} 디코딩된 텍스트
 */
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

/**
 * 밀리초를 시:분:초 형식으로 변환
 * @param {number} ms - 밀리초
 * @returns {string} 시:분:초 형식의 문자열
 */
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});