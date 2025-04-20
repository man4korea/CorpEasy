// 📁 backend/functions/src/index.ts
// Create at 2504202030 Ver1.0

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';

// 라우터 임포트
import { aiRouter } from '../../routes/ai-router';
import { analyzeRouter } from '../../routes/analyze-router';
import { claudeRouter } from '../../routes/claude-router';
import { claudeStreamRouter } from '../../routes/claude-stream-router';
import { cojiRouter } from '../../routes/coji-router';
import { geminiRouter } from '../../routes/gemini-router';
import { grokRouter } from '../../routes/grok-router';
import { openaiRouter } from '../../routes/openai-router';
import { youtubeRouter } from '../../routes/youtube-router';

// 미들웨어 임포트
import { authMiddleware } from '../../middlewares/auth-middleware';
import { errorHandler } from '../../middlewares/error-handler';
import { responseTime } from '../../middlewares/response-time';

// 환경 변수 설정
dotenv.config();

// Firebase 초기화
admin.initializeApp();

// Express 애플리케이션 생성
const app = express();

// 기본 미들웨어 설정
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(compression());
app.use(helmet());
app.use(responseTime);

// API 라우터 설정 
app.use('/api/ai', authMiddleware, aiRouter);
app.use('/api/analyze', authMiddleware, analyzeRouter);
app.use('/api/claude', authMiddleware, claudeRouter);
app.use('/api/claude-stream', authMiddleware, claudeStreamRouter);
app.use('/api/coji', authMiddleware, cojiRouter);
app.use('/api/gemini', authMiddleware, geminiRouter);
app.use('/api/grok', authMiddleware, grokRouter);
app.use('/api/openai', authMiddleware, openaiRouter);
app.use('/api/youtube-transcript', authMiddleware, youtubeRouter);

// 기본 라우트
app.get('/api', (req, res) => {
  res.status(200).send('CorpEasy API is running');
});

// 에러 핸들러
app.use(errorHandler);

// Firebase Functions로 API 내보내기
export const api = functions.https.onRequest(app);