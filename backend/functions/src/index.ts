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
    const pageResponse = await axios.get(`https://www.youtube.com/watch?v=${videoId}`);
    const pageText = pageResponse.data;

    // HTML에서 자막 트랙 정보 추출
    const captionTracksMatch = pageText.match(/"captionTracks":\[(.*?)\]/);
    if (!captionTracksMatch) {
      throw new Error('자막 트랙을 찾을 수 없습니다.');
    }

    const tracks = JSON.parse(`[${captionTracksMatch[1]}]`);

    // 한국어 자막 우선 시도
    const koreanTrack = tracks.find((track: any) => 
      track.languageCode === 'ko' && 
      (track.kind === 'asr' || track.kind === 'standard')
    );

    const selectedTrack = koreanTrack || tracks[0]; // 한국어 없으면 첫 번째 자막
    if (!selectedTrack) {
      throw new Error('사용 가능한 자막이 없습니다.');
    }

    // 자막 데이터 가져오기
    const transcriptUrl = selectedTrack.baseUrl + '&fmt=json3';
    const transcriptResponse = await axios.get(transcriptUrl);
    const transcriptData = transcriptResponse.data;

    // 자막 텍스트 추출 및 포맷팅
    const segments = transcriptData.events
      .filter((event: any) => event.segs && event.segs.length > 0)
      .map((event: any) => {
        const startTime = Math.floor(event.tStartMs / 1000);
        const minutes = Math.floor(startTime / 60);
        const seconds = startTime % 60;
        const text = event.segs.map((seg: any) => seg.utf8).join('').trim();
        return `[${minutes}:${seconds.toString().padStart(2, '0')}] ${text}`;
      })
      .filter((text: string) => text.trim());

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
app.get('/api/youtube-transcript', authMiddleware, async (req, res) => {
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