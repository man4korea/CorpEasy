// 📁 backend/routes/youtube-router.ts
// YouTube 트랜스크립트 및 정보 추출 라우터

import express from 'express';
import axios from 'axios';
import { cache } from '../utils/cache-factory';
import { logger } from '../utils/logger';
import { asyncHandler, ApiError } from '../middlewares/error-handler';
import { getYoutubeContent } from '../services/youtubeContentService';

const router = express.Router();
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// 응답 시간 측정 미들웨어
router.use((req, res, next) => {
  req.startTime = Date.now();
  
  // 응답 완료 후 시간 기록
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    logger.info(`📊 YouTube API 처리 시간: ${duration}ms`);
  });
  
  next();
});

// 기존 엔드포인트: URL로부터 트랜스크립트 가져오기
router.get('/transcript', asyncHandler(async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    throw ApiError.badRequest('URL 파라미터가 없습니다.');
  }

  // 캐시 키 생성
  const cacheKey = `youtube:url:${url}`;
  
  // 캐시 확인
  const cachedData = await cache.get(cacheKey);
  
  if (cachedData) {
    logger.info('🎯 YouTube 캐시 히트: 저장된 데이터 반환');
    return res.json(cachedData);
  }
  
  logger.info('🔍 YouTube 캐시 미스: 콘텐츠 추출 수행');

  try {
    const content = await getYoutubeContent(url);
    
    // 결과 캐싱 (6시간)
    await cache.set(cacheKey, content, 21600);
    
    res.json(content);
  } catch (err: any) {
    logger.error('❌ YouTube 콘텐츠 추출 실패:', err);
    throw ApiError.apiClientError('콘텐츠 추출 중 오류 발생', {
      message: err.message,
      url
    });
  }
}));

// YouTube ID에서 트랜스크립트 가져오기
router.get('/:videoId', asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { format = 'text' } = req.query;
  
  if (!videoId) {
    throw ApiError.badRequest('유효하지 않은 요청: videoId가 필요합니다');
  }
  
  if (!YOUTUBE_API_KEY) {
    throw ApiError.internalError('YouTube API 키가 설정되지 않았습니다');
  }
  
  // 캐시 키 생성
  const cacheKey = `youtube:transcript:${videoId}:${format}`;
  
  // 캐시 확인
  const cachedData = await cache.get(cacheKey);
  
  if (cachedData) {
    logger.info('🎯 YouTube 캐시 히트: 저장된 데이터 반환');
    return res.json(cachedData);
  }
  
  logger.info('🔍 YouTube 캐시 미스: API 요청 수행');
  
  try {
    // 1. 먼저 비디오 정보 가져오기
    const videoResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      throw ApiError.notFound('YouTube 비디오를 찾을 수 없습니다');
    }
    
    const videoInfo = videoResponse.data.items[0];
    
    // 2. 캡션 트랙 목록 가져오기
    // 참고: 자막 직접 다운로드는 YouTube Data API v3에서 제공하지 않음
    // 여기서는 간단한 비디오 정보만 제공하고, 실제 자막은 별도 라이브러리 구현 필요
    
    const result = {
      videoId,
      title: videoInfo.snippet.title,
      description: videoInfo.snippet.description,
      publishedAt: videoInfo.snippet.publishedAt,
      channelTitle: videoInfo.snippet.channelTitle,
      viewCount: videoInfo.statistics.viewCount,
      likeCount: videoInfo.statistics.likeCount,
      duration: videoInfo.contentDetails.duration,
      transcript: "YouTube Data API v3는 직접 자막을 제공하지 않습니다. 실제 구현 시 youtube-transcript 또는 다른 라이브러리 사용이 필요합니다.",
      thumbnails: videoInfo.snippet.thumbnails
    };
    
    // 결과 캐싱 (1일)
    await cache.set(cacheKey, result, 86400);
    
    res.json(result);
  } catch (error: any) {
    logger.error('🔥 YouTube API 호출 오류:', error);
    
    if (error.response) {
      throw ApiError.apiClientError('YouTube API 호출 실패', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw error;
  }
}));

// YouTube URL에서 ID 추출
router.post('/extract-id', (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    throw ApiError.badRequest('유효하지 않은 요청: YouTube URL이 필요합니다');
  }
  
  try {
    let videoId = null;
    
    // 다양한 YouTube URL 형식 처리
    if (url.includes('youtu.be/')) {
      // 짧은 URL (youtu.be/VIDEO_ID)
      videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
    } else if (url.includes('youtube.com/watch')) {
      // 표준 URL (youtube.com/watch?v=VIDEO_ID)
      const urlObj = new URL(url);
      videoId = urlObj.searchParams.get('v');
    } else if (url.includes('youtube.com/embed/')) {
      // 임베드 URL (youtube.com/embed/VIDEO_ID)
      videoId = url.split('youtube.com/embed/')[1].split(/[?#]/)[0];
    } else if (url.includes('youtube.com/shorts/')) {
      // 쇼츠 URL (youtube.com/shorts/VIDEO_ID)
      videoId = url.split('youtube.com/shorts/')[1].split(/[?#]/)[0];
    }
    
    if (!videoId) {
      throw ApiError.badRequest('유효하지 않은 YouTube URL 형식');
    }
    
    res.json({
      url,
      videoId,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    });
  } catch (error: any) {
    logger.error('YouTube ID 추출 오류:', error);
    throw ApiError.badRequest('YouTube URL 처리 중 오류: ' + error.message);
  }
});

// 기본 정보 제공
router.get('/', (req, res) => {
  res.json({
    message: 'YouTube 트랜스크립트 API',
    endpoints: [
      {
        path: '/transcript',
        method: 'GET',
        description: 'YouTube URL로부터 자막 및 콘텐츠 추출 (기존 API)',
        parameters: {
          url: '쿼리 파라미터 - YouTube 비디오 URL'
        }
      },
      {
        path: '/:videoId',
        method: 'GET',
        description: 'YouTube 비디오 ID로 자막 및 정보 가져오기',
        parameters: {
          videoId: 'URL 경로에 포함된 YouTube 비디오 ID',
          format: '쿼리 파라미터 - 출력 형식 (text 또는 json, 기본값: text)'
        }
      },
      {
        path: '/extract-id',
        method: 'POST',
        description: 'YouTube URL에서 비디오 ID 추출',
        parameters: {
          url: '요청 바디에 포함된 YouTube URL'
        }
      }
    ]
  });
});

export default router;