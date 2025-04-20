// 📁 backend/routes/coji-router.ts
// Create at 2504191525 Ver1.1

import express from 'express';
import { logger } from '../utils/logger';
import { generateCojiResponse, stripHtmlTags } from '../services/coji-service';
import { getFromCache, setToCache } from '../utils/cache';
import { cache } from '../utils/cache-factory';

const router = express.Router();

/**
 * @route POST /api/coji
 * @desc GPT-3.5 기반 Coji 응답 생성 라우터
 */
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    // 요청 검증: message 필드 존재 여부 및 타입 확인
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '유효한 메시지가 필요합니다.' });
    }

    // HTML 태그 포함 여부 확인 및 로그 기록
    const containsHtml = /<[^>]*>/.test(message);
    if (containsHtml) {
      logger.warn(`코지 요청에 HTML 태그 감지: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    } else {
      logger.info(`코지 요청 수신: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    }

    // HTML 태그 제거
    const sanitizedMessage = stripHtmlTags(message);

    // 캐시 키 구성 (소문자 + 공백 제거 후 앞 100자)
    const cacheKey = `coji:${sanitizedMessage.toLowerCase().trim().substring(0, 100)}`;

    // 캐시 확인
    const cachedResponse = await getFromCache(cacheKey);
    if (cachedResponse) {
      logger.info('코지 캐시 응답 사용');
      return res.json({ message: cachedResponse });
    }

    // GPT-3.5 기반 응답 생성 (기존 Claude → coji-service 내부에서 변경됨)
    const response = await generateCojiResponse(sanitizedMessage);

    // 생성된 응답에서 HTML 제거 (추가 보안 필터링)
    const sanitizedResponse = stripHtmlTags(response);

    // 캐시에 1시간 저장
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