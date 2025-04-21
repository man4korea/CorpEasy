import { OpenAI } from 'openai';
import { logger } from '../utils/logger';

let openai: OpenAI;

try {
  openai = new OpenAI({
    apiKey: process.env.NODE_ENV === 'development' 
      ? process.env.OPENAI_API_KEY 
      : process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY
  });
} catch (error) {
  const err = error as Error;
  logger.error(err);
  throw new Error(`OpenAI 클라이언트 초기화 실패: ${err.message}`);
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export async function callGPT35(
  messages: Message[],
  temperature: number = 0.7,
  maxTokens: number = 2000
) {
  try {
    const requestOptions = {
      model: "gpt-3.5-turbo",
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        name: msg.role // name 필드 추가
      })),
      temperature,
      max_tokens: maxTokens
    };

    const response = await openai.chat.completions.create(requestOptions);
    return response.choices[0].message;

  } catch (error) {
    const err = error as Error;
    logger.error(err);
    throw new Error(`GPT-3.5 호출 오류: ${err.message}`);
  }
}

export async function callGPT4(
  messages: Message[],
  temperature: number = 0.7,
  maxTokens: number = 2000
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        name: msg.role // name 필드 추가
      })),
      temperature,
      max_tokens: maxTokens
    });

    return response.choices[0].message;
  } catch (error) {
    const err = error as Error;
    logger.error(err);
    throw new Error(`GPT-4 호출 오류: ${err.message}`);
  }
} 