import * as functions from 'firebase-functions';
import cors = require('cors');
import { callGPT35 } from './services/openai';
import { logger } from './utils/logger';

const corsHandler = cors({ origin: true });

export const askGPT = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      logger.info('1. 함수 호출됨');
      logger.info('요청 메소드:', req.method);
      logger.info('요청 본문:', req.body);

      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      logger.info('2. GPT 요청 시작');
      const response = await callGPT35([
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: message,
        }
      ]);
      logger.info('3. GPT 응답 받음');

      return res.json({
        response,
        success: true
      });

    } catch (error: any) {
      logger.error('오류 발생:', error);
      logger.error('오류 세부정보:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  });
}); 