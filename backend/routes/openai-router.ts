// 📁 backend/routes/openai-router.ts
// Create at 2504201650 Ver1.2

import express from 'express';
import { logger } from '../utils/logger.js';
import { callGPT35, callGPT4 } from '../services/openai.js';

const router = express.Router();

/**
 * 디버깅 미들웨어
 */
router.use((req, res, next) => {
  console.log(`🔍 OpenAI 라우터 요청: ${req.method} ${req.path}`);
  console.log('📝 요청 본문:', JSON.stringify(req.body).substring(0, 500));
  
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`📤 응답 본문: ${body?.substring?.(0, 500) || JSON.stringify(body).substring(0, 500)}`);
    return originalSend.call(this, body);
  };
  
  next();
});

/**
 * GPT-3.5 채팅 API 엔드포인트
 */
router.post('/gpt35', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;
    
    // 요청 검증
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      logger.error('GPT-3.5 API 요청 검증 실패: 메시지 배열 없음');
      return res.status(400).json({
        error: '유효한 messages 배열이 필요합니다',
        received: typeof messages
      });
    }
    
    logger.info(`GPT-3.5 요청: 메시지 수=${messages.length}`);
    console.log('📊 GPT-3.5 메시지 내용:', JSON.stringify(messages).substring(0, 500));
    
    // 환경 변수 디버깅
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다');
      return res.status(500).json({
        error: 'API 키가 설정되지 않았습니다',
        configCheck: 'OPENAI_API_KEY 환경 변수를 확인하세요'
      });
    }
    
    console.log(`🔑 API 키 확인: ${apiKey.substring(0, 10)}... (${apiKey.length}자), Project 키 여부: ${apiKey.startsWith('sk-proj-')}`);
    
    // GPT-3.5 API 호출
    try {
      console.time('⏱️ GPT-3.5 API 호출 시간');
      const content = await callGPT35(messages, options);
      console.timeEnd('⏱️ GPT-3.5 API 호출 시간');
      
      if (!content) {
        logger.warn('GPT-3.5 API에서 빈 응답 반환');
        return res.status(500).json({
          error: 'API에서 빈 응답 반환됨',
          debug: '응답 내용이 없습니다'
        });
      }
      
      // 결과 반환
      logger.info(`GPT-3.5 API 응답 성공: 길이=${content.length}`);
      res.json({
        content,
        role: 'assistant',
        model: options.model || 'gpt-3.5-turbo',
        timestamp: new Date().toISOString()
      });
    } catch (apiError) {
      logger.error(`GPT-3.5 API 직접 호출 오류: ${apiError.message}`);
      console.error('📌 API 호출 오류 상세:', apiError);
      
      // 클라이언트에 자세한 오류 정보 제공
      return res.status(500).json({
        error: 'API 호출 중 오류 발생',
        message: apiError.message,
        stack: process.env.NODE_ENV === 'development' ? apiError.stack : undefined
      });
    }
  } catch (error) {
    logger.error('GPT-3.5 라우터 일반 오류:', error.message);
    console.error('📌 라우터 오류 상세:', error);
    
    // 클라이언트에 오류 응답
    res.status(500).json({
      error: '서버 오류가 발생했습니다',
      message: error.message,
      type: error.name
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
  } catch (error) {
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
    
    // .env 파일 및 환경 변수 디버깅 정보
    const envDebug = {
      'NODE_ENV': process.env.NODE_ENV,
      'API_KEY_LENGTH': apiKey?.length || 0,
      'API_KEY_PREFIX': apiKey?.substring(0, 7) || 'missing',
      'HAS_OPENAI_KEY': !!process.env.OPENAI_API_KEY,
      'RUNNING_DIR': process.cwd()
    };
    
    res.json({
      status: apiKeyValid ? 'ok' : 'error',
      apiKeyValid,
      keyType: isProjectKey ? 'project' : 'standard',
      sdkVersion: 'v4+',
      dotEnvLoaded: !!process.env.OPENAI_API_KEY,
      debug: envDebug,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('상태 확인 오류:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;