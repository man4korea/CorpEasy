// 📁 backend/routes/openai-router.ts
// Create at 2504201630 Ver1.1

import express from 'express';
import { logger } from '../utils/logger.js';
import { callGPT35, callGPT4 } from '../services/openai.js';

const router = express.Router();

/**
 * GPT-3.5 채팅 API 엔드포인트
 */
router.post('/gpt35', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;
    
    // 요청 검증
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: '유효한 messages 배열이 필요합니다'
      });
    }
    
    logger.info(`GPT-3.5 요청: 메시지 수=${messages.length}`);
    
    // GPT-3.5 API 호출
    const content = await callGPT35(messages, options);
    
    // 결과 반환
    res.json({
      content,
      role: 'assistant',
      model: options.model || 'gpt-3.5-turbo',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('GPT-3.5 라우터 오류:', error.message);
    
    // 클라이언트에 오류 응답
    res.status(500).json({
      error: '서버 오류가 발생했습니다',
      message: error.message
    });
  }
});

/**
 * GPT-4 채팅 API 엔드포인트
 */
router.post('/gpt4', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;
    
    // 요청 검증
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: '유효한 messages 배열이 필요합니다'
      });
    }
    
    logger.info(`GPT-4 요청: 메시지 수=${messages.length}`);
    
    // GPT-4 API 호출
    const content = await callGPT4(messages, options);
    
    // 결과 반환
    res.json({
      content,
      role: 'assistant',
      model: options.model || 'gpt-4',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('GPT-4 라우터 오류:', error.message);
    
    // 클라이언트에 오류 응답
    res.status(500).json({
      error: '서버 오류가 발생했습니다',
      message: error.message
    });
  }
});

/**
 * GPT-3.5과 GPT-4의 상태를 확인하는 엔드포인트
 */
router.get('/status', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const apiKeyValid = !!apiKey && apiKey.length > 10;
    const isProjectKey = apiKey?.startsWith('sk-proj-');
    
    res.json({
      status: apiKeyValid ? 'ok' : 'error',
      apiKeyValid,
      keyType: isProjectKey ? 'project' : 'standard',
      sdkVersion: 'v4+',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;