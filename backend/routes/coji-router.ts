// 📁 backend/routes/coji-router.ts
// Create at 2404211730 Ver1.0

import express from 'express';
import { CojiService } from '../services/coji-service';
import { logger } from '../utils/logger';

const router = express.Router();
const cojiService = new CojiService();

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    const response = await cojiService.generateResponse(message);
    res.json({ response });
  } catch (error) {
    logger.error('COJI 채팅 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

export default router;