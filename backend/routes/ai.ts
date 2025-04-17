import express from 'express';
import { callGemini } from '../services/gemini';
import { callClaude } from '../services/claude';
import { callGrok } from '../services/grok';

const router = express.Router();

// ✅ Gemini는 prompt 기반 요청 → 기존 그대로 유지
router.post('/gemini', async (req, res) => {
  const { prompt } = req.body;
  try {
    const output = await callGemini(prompt);
    res.json({ content: output });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ message: error.message || 'Gemini API 호출 실패' });
  }
});

// ✅ Claude는 messages 배열 기반 요청
router.post('/claude', async (req, res) => {
  const { messages } = req.body;
  try {
    const output = await callClaude(messages);
    res.json({ content: output });
  } catch (error: any) {
    console.error('Claude API Error:', error);
    res.status(500).json({ message: error.message || 'Claude API 호출 실패' });
  }
});

// ✅ Grok 라우터
router.post('/grok', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages 필드가 없습니다' });
  }

  try {
    const result = await callGrok(messages);
    res.json({ content: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Grok API 호출 실패' });
  }
});

export default router;
