// 📁 backend/routes/example-router.ts
// 공통 오류 처리를 적용한 라우터 예시

import express from 'express';
import { asyncHandler, ApiError } from '../middlewares/error-handler';
import { logger } from '../utils/logger';

const router = express.Router();

// asyncHandler로 감싸서 오류 자동 처리
router.get('/items', asyncHandler(async (req, res) => {
  const items = await fetchItems();
  res.json(items);
}));

// 명시적 오류 처리 예시
router.get('/items/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!id || !/^\d+$/.test(id)) {
    throw ApiError.badRequest('유효하지 않은 아이템 ID', { id });
  }
  
  const item = await fetchItemById(id);
  
  if (!item) {
    throw ApiError.notFound(`ID가 ${id}인 아이템을 찾을 수 없습니다`);
  }
  
  res.json(item);
}));

// 외부 API 오류 처리 예시
router.post('/external', asyncHandler(async (req, res) => {
  try {
    const result = await callExternalApi(req.body);
    res.json(result);
  } catch (error) {
    // 특정 외부 API 오류를 우리 시스템의 오류로 변환
    if (error.response?.status === 401) {
      throw ApiError.unauthorized('외부 API 인증 실패', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      throw ApiError.timeout('외부 API 응답 시간 초과', { timeout: error.config?.timeout });
    } else {
      throw ApiError.apiClientError('외부 API 요청 실패', error);
    }
  }
}));

// 검증 오류 처리 예시
router.post('/validate', asyncHandler(async (req, res) => {
  const { username, email } = req.body;
  
  const errors = [];
  
  if (!username || username.length < 3) {
    errors.push('사용자 이름은 3글자 이상이어야 합니다');
  }
  
  if (!email || !email.includes('@')) {
    errors.push('유효한 이메일 주소가 필요합니다');
  }
  
  if (errors.length > 0) {
    throw ApiError.badRequest('입력 검증 실패', { fields: { username, email }, errors });
  }
  
  // 검증 통과 시 처리
  const user = await createUser(username, email);
  res.status(201).json(user);
}));

// 권한 오류 처리 예시
router.delete('/items/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user; // 가정: 인증 미들웨어가 req에 user 객체를 추가함
  
  if (!user) {
    throw ApiError.unauthorized('인증이 필요합니다');
  }
  
  const item = await fetchItemById(id);
  
  if (!item) {
    throw ApiError.notFound(`ID가 ${id}인 아이템을 찾을 수 없습니다`);
  }
  
  if (item.ownerId !== user.id && !user.isAdmin) {
    throw ApiError.forbidden('이 아이템을 삭제할 권한이 없습니다');
  }
  
  await deleteItem(id);
  res.status(204).end();
}));

// 예시를 위한 더미 함수들
async function fetchItems() {
  return [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
}

async function fetchItemById(id: string) {
  const items = await fetchItems();
  return items.find(item => item.id === parseInt(id));
}

async function deleteItem(id: string) {
  logger.info(`아이템 삭제: ${id}`);
  return true;
}

async function callExternalApi(data: any) {
  // 외부 API 호출 시뮬레이션
  return { success: true, data };
}

async function createUser(username: string, email: string) {
  return { id: Date.now(), username, email, createdAt: new Date() };
}

export default router;