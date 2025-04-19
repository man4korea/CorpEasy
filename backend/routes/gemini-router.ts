// 📁 backend/routes/gemini-router.ts
// Create at 2504201510 Ver1.1

import express from 'express';
import { logger } from '../utils/logger.js';
import { callGemini, GEMINI_MODELS, GEMINI_MODEL_GROUPS } from '../services/gemini.js';

const router = express.Router();

/**
 * Gemini API 엔드포인트
 * Google Gemini API를 사용하여 텍스트 생성 요청을 처리합니다.
 */
router.post('/', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    
    // 옵션 파싱
    const model = options.model || GEMINI_MODEL_GROUPS.DEFAULT;
    const temperature = options.temperature !== undefined ? options.temperature : 0.7;
    const maxOutputTokens = options.maxOutputTokens || (
      GEMINI_MODELS[model] ? GEMINI_MODELS[model].maxOutputTokens : 2048
    );
    
    logger.info(`Gemini API 요청: 모델=${model}, 온도=${temperature}, 프롬프트 길이=${prompt?.length || 0}`);
    
    // 입력 검증
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({
        error: '유효한 프롬프트가 필요합니다.'
      });
    }
    
    // Gemini API 호출
    const text = await callGemini(prompt, model, temperature, {
      maxOutputTokens,
      topK: options.topK,
      topP: options.topP,
      safetySettings: options.safetySettings
    });
    
    // 성공 응답
    res.json({
      model,
      response: text,
      // 토큰 사용량은 Google API에서 직접 제공하지 않아 추정치 제공
      estimatedUsage: {
        promptTokens: Math.ceil(prompt.length / 4),
        responseTokens: Math.ceil((text || '').length / 4),
      }
    });
  } catch (error) {
    logger.error(`Gemini API 오류: ${error.message}`);
    
    // 오류 응답
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * 지원하는 Gemini 모델 목록 제공
 */
router.get('/models', (req, res) => {
  const modelList = Object.entries(GEMINI_MODELS).map(([id, info]) => ({
    id,
    name: info.name,
    maxOutputTokens: info.maxOutputTokens,
    pricePerInputToken: info.pricePerInputToken,
    pricePerOutputToken: info.pricePerOutputToken
  }));
  
  res.json({
    models: modelList,
    defaultModel: GEMINI_MODEL_GROUPS.DEFAULT
  });
});

/**
 * Gemini API 상태 확인
 */
router.get('/status', async (req, res) => {
  try {
    const apiKey = process.env.SERVER_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const apiKeyValid = !!apiKey && apiKey.length > 10;
    
    if (!apiKeyValid) {
      return res.json({
        status: 'error',
        message: 'Gemini API 키가 설정되지 않았습니다.',
        apiKeyValid: false
      });
    }
    
    // 간단한 API 호출로 상태 확인
    try {
      const response = await callGemini(
        'hello', 
        GEMINI_MODEL_GROUPS.DEFAULT, 
        0.1, 
        { maxOutputTokens: 10 }
      );
      
      res.json({
        status: 'ok',
        apiKeyValid: true,
        message: '정상적으로 동작 중입니다.',
        testResponse: response ? '성공' : '응답 없음'
      });
    } catch (testError) {
      res.json({
        status: 'error',
        apiKeyValid: true, // 키는 있지만 API 호출 실패
        message: '테스트 호출 실패',
        error: testError.message
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;