// 📁 backend/routes/claude-haiku-router.ts
// Create at 2504201445 Ver1.0

import express from 'express';
import { logger } from '../utils/logger.js';
import { callClaude } from '../services/claude.js';

const router = express.Router();

/**
 * Claude Haiku API 엔드포인트 - 더 빠른 응답 속도와 저렴한 비용의 Claude 모델
 * Haiku 모델을 사용하여 텍스트 생성 요청을 처리합니다.
 */
router.post('/', async (req, res) => {
  try {
    const { messages, model = 'claude-3-haiku-20240307', max_tokens = 1024, temperature = 0.7 } = req.body;
    
    logger.info(`Claude Haiku API 요청: 메시지 수=${messages?.length}, 모델=${model}, 온도=${temperature}`);
    
    // 요청 검증
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '유효한 메시지 배열이 필요합니다.' });
    }
    
    // speedMode를 true로 설정하여 속도 최적화
    const claudeResponse = await callClaude(messages, {
      model,
      max_tokens,
      temperature,
      speedMode: true // 속도 최적화 모드 활성화
    });
    
    // 응답 구조에 따라 데이터 추출
    let responseText = '';
    let usage = {
      input_tokens: 0,
      output_tokens: 0
    };
    
    if (claudeResponse.content && Array.isArray(claudeResponse.content)) {
      responseText = claudeResponse.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
    } else if (typeof claudeResponse.content === 'string') {
      responseText = claudeResponse.content;
    }
    
    // 토큰 사용량 추출
    if (claudeResponse.usage) {
      usage = {
        input_tokens: claudeResponse.usage.input_tokens || 0,
        output_tokens: claudeResponse.usage.output_tokens || 0
      };
    }
    
    // 응답 구성
    const response = {
      id: claudeResponse.id || `haiku-${Date.now()}`,
      role: 'assistant',
      content: responseText,
      model: model,
      usage
    };
    
    logger.info(`Claude Haiku API 응답 완료: 토큰=${usage.input_tokens + usage.output_tokens}`);
    
    res.json(response);
  } catch (error) {
    logger.error(`Claude Haiku API 오류: ${error.message}`);
    
    // 에러 응답
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * 서버 및 API 키 상태 확인 엔드포인트
 */
router.get('/status', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const apiValid = !!apiKey && apiKey.length > 10;
    
    res.json({
      status: 'ok',
      apiValid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;