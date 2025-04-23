// 📁 backend/routes/analyze-router.ts
// Create at 2504232300 Ver1.4

import express from 'express';
import { ContentAnalysisService } from '../services/contentAnalysisService';
import { BlogGenerationService } from '../services/blogGenerationService';
import { logger } from '../utils/logger';
import multer from 'multer';
import { createReadStream } from 'fs';
import { promisify } from 'util';
import * as fs from 'fs';
import { YoutubeContentService } from '../services/youtubeContentService';
import axios from 'axios';
import firestoreModel from '../models/firestoreModel';  // 임포트 위치 수정 - 파일 상단으로 이동

const readFileAsync = promisify(fs.readFile);
const router = express.Router();

// 파일 업로드를 위한 multer 설정
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  }
});

// Services 초기화
const contentAnalysisService = new ContentAnalysisService();
const blogGenerationService = new BlogGenerationService();

// 업로드 디렉토리 생성 확인
try {
  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads', { recursive: true });
    logger.info('uploads 디렉토리 생성 완료');
  }
} catch (error) {
  logger.error('uploads 디렉토리 생성 중 오류:', error);
}

// 응답 시간 로깅 미들웨어
router.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

/**
 * 콘텐츠 분석 엔드포인트
 * URL, 키워드, 텍스트 등을 분석하여 결과 반환
 */
router.post('/content', async (req, res) => {
  try {
    // 요청 본문 로깅 (디버깅용)
    logger.info(`콘텐츠 분석 요청 받음: ${JSON.stringify(req.body).substring(0, 200)}...`);
    
    // 두 가지 요청 형식 지원
    // 1. { input: string } - 기존 방식
    // 2. { url: string, type: string, extractTranscript?: boolean } - 클라이언트 방식
    
    let input = req.body.input;
    const { url, type, extractTranscript } = req.body;
    
    // url & type이 있는 경우 새로운 형식으로 처리
    if (url && type) {
      logger.info(`새 형식 요청 감지: url=${url}, type=${type}, extractTranscript=${extractTranscript}`);
      
      // YouTube 유형 + 자막 추출 요청인 경우
      if (type === 'youtube' && extractTranscript === true) {
        try {
          logger.info(`YouTube 자막 추출 시도: ${url}`);
          
          // YouTube 자막 API 직접 호출
          // 참고: 클라이언트에서는 /youtube-transcript 호출 (리디렉션은 index.ts에 설정되어 있음)
          const youtubeData = await YoutubeContentService.getYoutubeContentData(url);
          
          logger.info(`YouTube 자막 추출 성공: videoId=${youtubeData.videoId}`);
          
          // 자막 데이터만 반환 (브라우저 클라이언트와 호환)
          return res.status(200).json({
            success: true,
            transcript: youtubeData.transcript,
            videoInfo: {
              title: youtubeData.videoInfo.snippet.title,
              description: youtubeData.videoInfo.snippet.description,
              channelTitle: youtubeData.videoInfo.snippet.channelTitle,
              publishedAt: youtubeData.videoInfo.snippet.publishedAt
            }
          });
        } catch (youtubeError) {
          logger.error(`YouTube 자막 추출 오류:`, youtubeError);
          return res.status(500).json({
            success: false,
            message: `YouTube 자막 추출 중 오류가 발생했습니다: ${youtubeError.message || 'Unknown error'}`
          });
        }
      }
      
      // 다른 url 기반 분석 요청인 경우
      input = url; // url을 input으로 사용
    }
    
    // input 검사 (어떤 형식이든 최종적으로 input이 필요)
    if (!input) {
      return res.status(400).json({
        success: false,
        message: '분석할 콘텐츠가 없습니다.',
      });
    }
    
    logger.info(`콘텐츠 분석 처리 시작: ${input.substring(0, 50)}...`);
    
    // 콘텐츠 분석 수행
    const analysisId = await contentAnalysisService.analyzeContent(input);
    
    // 분석 결과 조회
    const analysis = await firestoreModel.getContentAnalysisById(analysisId);
    
    return res.status(200).json({
      success: true,
      analysisId,
      analysis,
    });
  } catch (error) {
    logger.error('콘텐츠 분석 오류:', error);
    
    return res.status(500).json({
      success: false,
      message: `콘텐츠 분석 중 오류가 발생했습니다: ${(error as Error).message}`,
    });
  }
});

/**
 * YouTube 비디오 분석 엔드포인트 (추가된 부분)
 * YouTube URL을 분석하여 결과 반환
 */
router.post('/youtube', async (req, res) => {
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
    
    logger.info(`YouTube 콘텐츠 분석 요청: ${url}`);
    
    // YouTube 콘텐츠 분석 수행
    const analysisId = await contentAnalysisService.analyzeYoutubeContent(url);
    
    // 분석 결과 조회
    const analysis = await firestoreModel.getContentAnalysisById(analysisId);
    
    return res.status(200).json({
      success: true,
      analysisId,
      analysis,
    });
  } catch (error) {
    logger.error('YouTube 분석 오류:', error);
    
    return res.status(500).json({
      success: false,
      message: `YouTube 분석 중 오류가 발생했습니다: ${(error as Error).message}`,
    });
  }
});

/**
 * 콘텐츠 분석 결과 조회 엔드포인트 (추가된 부분)
 */
router.get('/content/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;
    
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: '분석 ID가 필요합니다.',
      });
    }
    
    // 분석 결과 조회
    const analysis = await firestoreModel.getContentAnalysisById(analysisId);
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: '분석 결과를 찾을 수 없습니다.',
      });
    }
    
    return res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    logger.error(`분석 결과 조회 오류 (analysisId: ${req.params.analysisId}):`, error);
    
    return res.status(500).json({
      success: false,
      message: `분석 결과 조회 중 오류가 발생했습니다: ${(error as Error).message}`,
    });
  }
});

/**
 * 파일 업로드 분석 엔드포인트
 * 업로드된 파일을 분석하여 결과 반환
 */
router.post('/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '파일이 업로드되지 않았습니다.',
      });
    }
    
    logger.info(`파일 업로드 분석 요청: ${req.file.originalname}, 크기: ${req.file.size} bytes`);
    
    // 파일 읽기
    const fileContent = await readFileAsync(req.file.path, 'utf8');
    
    // 콘텐츠 분석 수행
    const analysisId = await contentAnalysisService.analyzeContent(
      fileContent,
      req.file.originalname
    );
    
    // 분석 결과 조회
    const analysis = await firestoreModel.getContentAnalysisById(analysisId);
    
    // 임시 파일 삭제
    fs.unlink(req.file.path, (err) => {
      if (err) {
        logger.error(`임시 파일 삭제 오류: ${req.file?.path}`, err);
      }
    });
    
    return res.status(200).json({
      success: true,
      analysisId,
      analysis,
    });
  } catch (error) {
    logger.error('파일 분석 오류:', error);
    
    // 임시 파일 삭제 시도
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    
    return res.status(500).json({
      success: false,
      message: `파일 분석 중 오류가 발생했습니다: ${(error as Error).message}`,
    });
  }
});

/**
 * 상세 분석 엔드포인트
 * 기본 분석 결과를 기반으로 상세 분석 수행
 */
router.get('/detail/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;
    
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: '분석 ID가 필요합니다.',
      });
    }
    
    // 상세 분석 수행
    const detailedAnalysis = await contentAnalysisService.performDetailedAnalysis(analysisId);
    
    return res.status(200).json({
      success: true,
      detailedAnalysis,
    });
  } catch (error) {
    logger.error(`상세 분석 오류 (analysisId: ${req.params.analysisId}):`, error);
    
    return res.status(500).json({
      success: false,
      message: `상세 분석 중 오류가 발생했습니다: ${(error as Error).message}`,
    });
  }
});

/**
 * 블로그 생성 엔드포인트
 * 분석 결과와 SEO 제목을 기반으로 블로그 콘텐츠 생성
 */
router.post('/blog', async (req, res) => {
  try {
    const { analysisId, title } = req.body;
    
    if (!analysisId || !title) {
      return res.status(400).json({
        success: false,
        message: '분석 ID와 제목이 필요합니다.',
      });
    }
    
    // 블로그 콘텐츠 생성
    const blogId = await blogGenerationService.generateBlogContent(analysisId, title);
    
    // 블로그 아티클 상세 조회
    const blogDetail = await blogGenerationService.getBlogArticleDetail(blogId);
    
    return res.status(200).json({
      success: true,
      blogId,
      blog: blogDetail?.blog,
    });
  } catch (error) {
    logger.error(`블로그 생성 오류 (analysisId: ${req.body.analysisId}, title: ${req.body.title}):`, error);
    
    return res.status(500).json({
      success: false,
      message: `블로그 생성 중 오류가 발생했습니다: ${(error as Error).message}`,
    });
  }
});

/**
 * 모든 콘텐츠 분석 결과 조회 엔드포인트
 */
router.get('/content-analyses', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    // 모든 콘텐츠 분석 결과 조회
    const analyses = await firestoreModel.getAllContentAnalysis(limit);
    
    return res.status(200).json({
      success: true,
      analyses: analyses.items,
      lastVisible: analyses.lastVisible ? analyses.lastVisible.id : null,
    });
  } catch (error) {
    logger.error('콘텐츠 분석 결과 조회 오류:', error);
    
    return res.status(500).json({
      success: false,
      message: `콘텐츠 분석 결과 조회 중 오류가 발생했습니다: ${(error as Error).message}`,
    });
  }
});

/**
 * 카테고리별 콘텐츠 분석 결과 조회 엔드포인트
 */
router.get('/content-analyses/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: '카테고리가 필요합니다.',
      });
    }
    
    // 카테고리별 콘텐츠 분석 결과 조회
    const analyses = await firestoreModel.getContentAnalysisByCategory(category, limit);
    
    return res.status(200).json({
      success: true,
      analyses: analyses.items,
      lastVisible: analyses.lastVisible ? analyses.lastVisible.id : null,
    });
  } catch (error) {
    logger.error(`카테고리별 콘텐츠 분석 결과 조회 오류 (category: ${req.params.category}):`, error);
    
    return res.status(500).json({
      success: false,
      message: `카테고리별 콘텐츠 분석 결과 조회 중 오류가 발생했습니다: ${(error as Error).message}`,
    });
  }
});

/**
 * 게시된 블로그 아티클 조회 엔드포인트
 */
router.get('/blogs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    // 게시된 블로그 아티클 조회
    const blogs = await firestoreModel.getPublishedBlogArticles(limit);
    
    return res.status(200).json({
      success: true,
      blogs: blogs.items,
      lastVisible: blogs.lastVisible ? blogs.lastVisible.id : null,
    });
  } catch (error) {
    logger.error('게시된 블로그 아티클 조회 오류:', error);
    
    return res.status(500).json({
      success: false,
      message: `게시된 블로그 아티클 조회 중 오류가 발생했습니다: ${(error as Error).message}`,
    });
  }
});

/**
 * 블로그 아티클 상세 조회 엔드포인트
 */
router.get('/blog/:blogId', async (req, res) => {
  try {
    const { blogId } = req.params;
    
    if (!blogId) {
      return res.status(400).json({
        success: false,
        message: '블로그 ID가 필요합니다.',
      });
    }
    
    // 블로그 아티클 상세 조회
    const blogDetail = await blogGenerationService.getBlogArticleDetail(blogId);
    
    if (!blogDetail) {
      return res.status(404).json({
        success: false,
        message: '블로그 아티클을 찾을 수 없습니다.',
      });
    }
    
    return res.status(200).json({
      success: true,
      blog: blogDetail.blog,
      analysis: blogDetail.analysis,
    });
  } catch (error) {
    logger.error(`블로그 아티클 상세 조회 오류 (blogId: ${req.params.blogId}):`, error);
    
    return res.status(500).json({
      success: false,
      message: `블로그 아티클 상세 조회 중 오류가 발생했습니다: ${(error as Error).message}`,
    });
  }
});

export default router;