// 📁 backend/routes/coji-router.ts
// Create at 2504191525

import express from 'express';
import { logger } from '../utils/logger';
import { generateCojiResponse, stripHtmlTags } from '../services/coji-service';
import { cache } from '../utils/cache-factory';

const router = express.Router();

// 코지 응답 생성 엔드포인트
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '유효한 메시지가 필요합니다.' });
    }
    
    // HTML 태그 확인 및 로깅
    const containsHtml = /<[^>]*>/.test(message);
    if (containsHtml) {
      logger.warn(`코지 요청에 HTML 태그 감지: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    } else {
      logger.info(`코지 요청 수신: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    }
    
    // 메시지에서 HTML 태그 제거
    const sanitizedMessage = stripHtmlTags(message);
    
    // 캐시 확인
    const cacheKey = `coji:${sanitizedMessage.toLowerCase().trim().substring(0, 100)}`;
    const cachedResponse = await getFromCache(cacheKey);
    
    if (cachedResponse) {
      logger.info('코지 캐시 응답 사용');
      return res.json({ message: cachedResponse });
    }
    
    // 응답 생성
    const response = await generateCojiResponse(sanitizedMessage);
    
    // 응답에서 HTML 태그 제거 (이중 안전장치)
    const sanitizedResponse = stripHtmlTags(response);
    
    // 응답 캐싱 (1시간)
    await setToCache(cacheKey, sanitizedResponse, 60 * 60);
    
    return res.json({ message: sanitizedResponse });
  } catch (error) {
    logger.error('코지 처리 오류:', error);
    return res.status(500).json({ 
      error: '응답 생성 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

export default router;