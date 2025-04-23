// 📁 backend/functions/src/index.ts
// Create at 2504221915 Ver2.4

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';
import axios from 'axios';

// 환경 변수 설정
dotenv.config();

// Firebase 초기화
admin.initializeApp();

// Express 애플리케이션 생성
const app = express();

// 기본 미들웨어 설정
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(compression());
app.use(helmet());

// 간단한 응답 시간 미들웨어
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// 간단한 인증 미들웨어 (항상 통과하도록 수정)
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // 항상 인증 통과 (개발 및 테스트용)
  return next();
};

// YouTube 비디오 ID 추출 함수
function extractYouTubeVideoId(url: string): string | null {
  // YouTube URL에서 비디오 ID 추출
  let videoId = null;
  
  // 정규식 패턴으로 비디오 ID 추출
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*v=)([^&\s]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      videoId = match[1];
      break;
    }
  }
  
  return videoId;
}

// YouTube 자막 추출 함수
async function getYouTubeTranscript(videoId: string): Promise<string> {
  try {
    console.log(`YouTube 자막 가져오기 시작: 비디오 ID ${videoId}`);
    
    // YouTube 페이지의 HTML 가져오기
    console.log('YouTube 페이지 요청 시작');
    const pageResponse = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    console.log('YouTube 페이지 응답 받음');
    const pageText = pageResponse.data;

    // 자막 정보 추출 시도 (여러 패턴)
    console.log('자막 정보 검색 시작');
    let captionsData;
    
    // 패턴 1: 일반 자막
    const pattern1 = /"captionTracks":\[(.*?)\]/;
    // 패턴 2: 자동 생성 자막
    const pattern2 = /"playerCaptionsTracklistRenderer":\{(.*?)\}/;
    // 패턴 3: 새로운 형식의 자막
    const pattern3 = /"captions":\{(.*?)\}/;
    
    let match = pageText.match(pattern1) || pageText.match(pattern2) || pageText.match(pattern3);
    
    if (!match) {
      console.log('기본 패턴으로 자막을 찾을 수 없음, 전체 데이터에서 자막 URL 검색');
      // 직접 자막 URL 찾기 시도
      const urlPattern = /https:\/\/www\.youtube\.com\/api\/timedtext[^"]+/;
      const urlMatch = pageText.match(urlPattern);
      
      if (urlMatch) {
        console.log('자막 URL 직접 찾음:', urlMatch[0]);
        const transcriptResponse = await axios.get(urlMatch[0]);
        captionsData = transcriptResponse.data;
      } else {
        throw new Error('자막 정보를 찾을 수 없습니다.');
      }
    } else {
      console.log('자막 정보 찾음');
      const jsonStr = `{${match[1]}}`;
      try {
        captionsData = JSON.parse(jsonStr);
      } catch (e) {
        console.log('JSON 파싱 실패, 직접 URL 추출 시도');
        const urlPattern = /https:\/\/www\.youtube\.com\/api\/timedtext[^"]+/;
        const urlMatch = match[1].match(urlPattern);
        
        if (urlMatch) {
          console.log('자막 URL 찾음:', urlMatch[0]);
          const transcriptResponse = await axios.get(urlMatch[0]);
          captionsData = transcriptResponse.data;
        } else {
          throw new Error('자막 데이터를 파싱할 수 없습니다.');
        }
      }
    }

    // 자막 텍스트 추출 및 포맷팅
    let segments: string[] = [];
    
    if (captionsData.events) {
      // 새로운 형식
      segments = captionsData.events
        .filter((event: any) => event.segs && event.segs.length > 0)
        .map((event: any) => {
          const startTime = Math.floor(event.tStartMs / 1000);
          const minutes = Math.floor(startTime / 60);
          const seconds = startTime % 60;
          const text = event.segs.map((seg: any) => seg.utf8).join('').trim();
          return `[${minutes}:${seconds.toString().padStart(2, '0')}] ${text}`;
        });
    } else if (captionsData.transcript) {
      // 기존 형식
      segments = captionsData.transcript
        .map((item: any) => {
          const startTime = Math.floor(parseFloat(item.start));
          const minutes = Math.floor(startTime / 60);
          const seconds = startTime % 60;
          return `[${minutes}:${seconds.toString().padStart(2, '0')}] ${item.text}`;
        });
    }

    if (segments.length === 0) {
      throw new Error('자막 텍스트를 추출할 수 없습니다.');
    }

    console.log('자막 추출 완료:', segments.length, '개의 세그먼트');
    return segments.join('\n');
  } catch (error) {
    console.error('YouTube 자막 가져오기 오류:', error);
    throw new Error(`자막을 가져오는 중 오류가 발생했습니다: ${error.message}`);
  }
}

// 기본 라우트 (루트 경로)
app.get('/', (req, res) => {
  res.status(200).send('CorpEasy API is running');
});

// 분석 API 엔드포인트 (경로에서 /api 제거)
app.post('/analyze/content', authMiddleware, (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({
        success: false,
        message: '분석할 콘텐츠가 없습니다.',
      });
    }
    
    console.log(`콘텐츠 분석 요청 수신: ${input.substring(0, 50)}...`);
    
    // 임시 분석 응답 (실제로는 AI 서비스 호출 필요)
    const analysisId = `temp-${Date.now()}`;
    
    // 임시 분석 결과
    const analysis = {
      url: input.startsWith('http') ? input : 'https://example.com',
      type: input.startsWith('http') ? 'url' : 'keyword',
      source_title: '임시 분석 결과',
      source_category: '기술/IT',
      h1_h4_summary: '<h1>임시 분석 결과</h1><p>Firebase Functions 설정 중입니다.</p>',
      keywords: ['Firebase', 'Functions', '설정', '배포', '테스트'],
      tags: ['#Firebase', '#Functions', '#배포'],
      summaryOnly: true,
      blogGenerated: false,
      createdAt: admin.firestore.Timestamp.now()
    };
    
    return res.status(200).json({
      success: true,
      analysisId,
      analysis,
    });
  } catch (error: any) {
    console.error('콘텐츠 분석 오류:', error);
    
    return res.status(500).json({
      success: false,
      message: `콘텐츠 분석 중 오류가 발생했습니다: ${error.message}`,
    });
  }
});

// YouTube 자막 가져오기 엔드포인트 (GET 메서드)
app.get('/youtube-transcript', authMiddleware, async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'YouTube URL이 필요합니다.',
      });
    }
    
    // YouTube URL 검증
    if (!url.toString().includes('youtube.com/watch') && !url.toString().includes('youtu.be/')) {
      return res.status(400).json({
        success: false,
        message: '유효한 YouTube URL이 아닙니다.',
      });
    }
    
    console.log(`YouTube 자막 가져오기 요청: ${url}`);
    
    // YouTube 비디오 ID 추출
    const videoId = extractYouTubeVideoId(url.toString());
    
    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'YouTube 비디오 ID를 추출할 수 없습니다.',
      });
    }
    
    // 새로운 방식으로 자막 가져오기
    const transcript = await getYouTubeTranscript(videoId);
    
    return res.status(200).json({
      success: true,
      videoId,
      transcript,
    });
  } catch (error: any) {
    console.error('YouTube 자막 가져오기 오류:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'YouTube 자막 가져오기 중 오류가 발생했습니다.',
    });
  }
});

// YouTube 분석 엔드포인트
app.post('/analyze/youtube', authMiddleware, (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'YouTube URL이 필요합니다.',
      });
    }
    
    // YouTube URL 검증
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return res.status(400).json({
        success: false,
        message: '유효한 YouTube URL이 아닙니다.',
      });
    }
    
    console.log(`YouTube 콘텐츠 분석 요청: ${url}`);
    
    // 임시 분석 응답
    const analysisId = `youtube-${Date.now()}`;
    
    // 임시 분석 결과
    const analysis = {
      url,
      type: 'youtube',
      source_title: 'YouTube 분석 결과',
      source_category: '엔터테인먼트',
      h1_h4_summary: '<h1>YouTube 분석 결과</h1><p>Firebase Functions 설정 중입니다.</p>',
      keywords: ['YouTube', 'Firebase', 'Functions', '테스트'],
      tags: ['#YouTube', '#Firebase', '#테스트'],
      summaryOnly: true,
      blogGenerated: false,
      createdAt: admin.firestore.Timestamp.now()
    };
    
    return res.status(200).json({
      success: true,
      analysisId,
      analysis,
    });
  } catch (error: any) {
    console.error('YouTube 분석 오류:', error);
    
    return res.status(500).json({
      success: false,
      message: `YouTube 분석 중 오류가 발생했습니다: ${error.message}`,
    });
  }
});

// 콘텐츠 분석 결과 조회 엔드포인트 (경로에서 /api 제거)
app.get('/analyze/content/:analysisId', authMiddleware, (req, res) => {
  try {
    const { analysisId } = req.params;
    
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: '분석 ID가 필요합니다.',
      });
    }
    
    // 임시 분석 결과
    const analysis = {
      url: 'https://example.com',
      type: 'url',
      source_title: '임시 분석 결과',
      source_category: '기술/IT',
      h1_h4_summary: '<h1>임시 분석 결과</h1><p>Firebase Functions 설정 중입니다.</p>',
      keywords: ['Firebase', 'Functions', '설정', '배포', '테스트'],
      tags: ['#Firebase', '#Functions', '#배포'],
      summaryOnly: true,
      blogGenerated: false,
      createdAt: admin.firestore.Timestamp.now()
    };
    
    return res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error(`분석 결과 조회 오류 (analysisId: ${req.params.analysisId}):`, error);
    
    return res.status(500).json({
      success: false,
      message: `분석 결과 조회 중 오류가 발생했습니다: ${error.message}`,
    });
  }
});

// 상세 분석 엔드포인트 (경로에서 /api 제거)
app.get('/analyze/detail/:analysisId', authMiddleware, (req, res) => {
  try {
    const { analysisId } = req.params;
    
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: '분석 ID가 필요합니다.',
      });
    }
    
    // 임시 상세 분석 결과
    const detailedAnalysis = {
      relatedBlogs: [
        { id: 'blog1', title: '관련 블로그 1' },
        { id: 'blog2', title: '관련 블로그 2' }
      ],
      trendInsights: [
        { id: 'trend1', title: '업계 트렌드 1', summary: '트렌드 요약 1' },
        { id: 'trend2', title: '업계 트렌드 2', summary: '트렌드 요약 2' }
      ],
      seoTitles: [
        '최적화된 SEO 제목 1',
        '최적화된 SEO 제목 2',
        '최적화된 SEO 제목 3',
        '최적화된 SEO 제목 4',
        '최적화된 SEO 제목 5'
      ]
    };
    
    return res.status(200).json({
      success: true,
      detailedAnalysis,
    });
  } catch (error: any) {
    console.error(`상세 분석 오류 (analysisId: ${req.params.analysisId}):`, error);
    
    return res.status(500).json({
      success: false,
      message: `상세 분석 중 오류가 발생했습니다: ${error.message}`,
    });
  }
});

// 에러 핸들러
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? '서버 오류가 발생했습니다.' : err.message
  });
});

// Firebase Functions로 API 내보내기
export const api = functions.https.onRequest(app);

// Coji 함수 (기존 함수 유지)
export const askCoji = functions.https.onRequest((req, res) => {
  // 간단한 응답
  res.json({
    success: true,
    response: "Coji 설정 중입니다. 곧 서비스가 정상화될 예정입니다."
  });
});

// 대화 기록 함수
export const getConversationHistory = functions.https.onRequest((req, res) => {
  // 간단한 응답
  res.json({
    success: true,
    history: []
  });
});