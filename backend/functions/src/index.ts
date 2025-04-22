// 📁 backend/functions/src/index.ts
// Create at 2504221810 Ver2.2

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';

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

// YouTube 분석 엔드포인트 (경로에서 /api 제거)
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