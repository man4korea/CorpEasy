// 📁 backend/services/openai.ts
import axios from 'axios';
import { logger } from '../utils/logger';

export async function callGPT35(messages: any[]) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    return response.data.choices[0].message.content;
  } catch (error: any) {
    logger.error('GPT-3.5 API 호출 오류:', error);
    throw new Error(error.response?.data?.error?.message || 'GPT-3.5 API 호출 중 오류가 발생했습니다.');
  }
}

export async function callGPT4(messages: any[]) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    return response.data.choices[0].message.content;
  } catch (error: any) {
    logger.error('GPT-4 API 호출 오류:', error);
    throw new Error(error.response?.data?.error?.message || 'GPT-4 API 호출 중 오류가 발생했습니다.');
  }
} 