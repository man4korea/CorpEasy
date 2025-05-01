// 📁 functions/index.js
// Create at 2505011553 Ver1.3

import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

// 모든 출처에서의 요청 허용
app.use(cors({ origin: true }));

// 로깅 미들웨어 추가
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ✅ YouTube Proxy API (다양한 사용자 에이전트와 추가 헤더 사용)
app.get('/youtube-proxy', async (req, res) => {
  const { videoUrl } = req.query;
  if (!videoUrl) {
    console.error('Missing videoUrl parameter');
    return res.status(400).json({ error: 'Missing videoUrl parameter' });
  }
  
  console.log('처리 요청 URL:', videoUrl);
  
  try {
    // 다양한 사용자 에이전트 준비
    const userAgents = [
      'Mozilla/5.0 (Linux; Android 10; SM-G973N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    ];
    
    // 랜덤하게 사용자 에이전트 선택
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // 모바일 주소로 변경하여 captionTracks 노출 가능성 증가
    const mobileUrl = videoUrl.replace('www.youtube.com', 'm.youtube.com');
    console.log('요청 보낼 URL:', mobileUrl);
    console.log('사용할 User-Agent:', userAgent);

    const youtubeResponse = await fetch(mobileUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://m.youtube.com/',
        'sec-ch-ua': '"Google Chrome";v="114", "Chromium";v="114", "Not=A?Brand";v="99"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"'
      }
    });

    console.log('유튜브 응답 상태:', youtubeResponse.status, youtubeResponse.statusText);
    
    if (!youtubeResponse.ok) {
      console.error(`유튜브 응답 실패: ${youtubeResponse.status} ${youtubeResponse.statusText}`);
      return res.status(youtubeResponse.status).json({ 
        error: `Failed to fetch YouTube page: ${youtubeResponse.statusText}` 
      });
    }

    const text = await youtubeResponse.text();
    console.log(`유튜브 응답 길이: ${text.length} 바이트`);
    console.log('[captionTracks 포함 여부]', text.includes('"captionTracks"'));
    
    // CORS 헤더 명시적 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    res.send(text);

  } catch (error) {
    console.error('Proxy fetch error:', error);
    res.status(500).json({ error: `Failed to fetch YouTube page: ${error.message}` });
  }
});

// 기존 API
app.get('/', (req, res) => {
  res.send('Content Analyzer API is running!');
});

// 상태 확인용 엔드포인트 추가
app.get('/status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 메모리와 타임아웃 설정 추가
export const api = onRequest({ 
  cors: true,
  memory: '256MiB',  // 메모리 할당량 증가
  timeoutSeconds: 60  // 타임아웃 증가
}, app);