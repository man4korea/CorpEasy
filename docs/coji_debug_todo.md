// 📁 docs/coji_debug_todo.md
// Create at 2504210355 Ver1.0

# 🧩 Coji 챗봇 GPT-3.5 연동 문제점 점검 로그

## ✅ 문제 요약
- Coji 챗봇이 GPT-3.5에 연결되어 있음에도, 단순 질문에도 "지금은 그 정보를 찾을 수 없어요"와 같은 fallback 응답을 출력함

---

## 🧠 현재까지 점검 완료 항목

### 🔹 프론트엔드
- [x] `src/pages/GPT35.tsx`: GPT-3.5 호출 로직 확인 → `/api/coji`로 POST 요청 전송 확인됨
- [x] `src/pages/Coji.tsx`: 코지 UI 내부에서 `cojiService.generateResponse()` 호출
- [x] 응답 처리 시 fallback 텍스트가 존재함: `응답을 받지 못했습니다`, `죄송해요, 응답을 받지 못했어요`

### 🔹 백엔드 구조 분석
- [x] `services/gpt35-service.ts` 존재 확인
- [x] `routes/openai-router.ts` 존재 확인
- [x] `routes/coji-router.ts` 존재 확인
- [x] `services/coji-service.ts` 존재 확인

---

## 🛠 점검 필요 항목 (To-Do)

### 🔸 1. `/api/coji` 백엔드 라우터 확인
- [ ] `routes/coji-router.ts`에서 request body를 잘 받는지
- [ ] GPT-3.5 서비스 호출이 실제 이뤄지는지 확인
- [ ] 응답 구조에 `reply`, `text`, `message` 등의 필드가 포함되어 있는지 확인

### 🔸 2. `cojiService.ts` 서비스 확인
- [ ] `generateResponse()` 내부에서 어떤 API 호출이 이뤄지는지
- [ ] `axios.post('/api/coji', ...)`의 응답을 어떻게 파싱하고 있는지 확인

### 🔸 3. GPT-3.5 서비스 동작 확인
- [ ] `services/gpt35-service.ts`에서 OpenAI API 호출 구조 확인
- [ ] `model: 'gpt-3.5-turbo'` 정확히 사용되고 있는지
- [ ] `system`, `user` role 포함 여부 및 메시지 배열 구성 확인

---

## 🗂 관련된 파일 경로 정리

```
frontend/src/pages/Coji.tsx
frontend/src/pages/GPT35.tsx
frontend/src/services/cojiService.ts
backend/routes/coji-router.ts
backend/services/coji-service.ts
backend/services/gpt35-service.ts
```

---

## 🔄 이후 계획
- 위 점검 필요 항목을 하나씩 확인하며 ✅ 표시로 업데이트 예정
- 문제 원인 확인 즉시 패치 적용 및 해당 md에 기록 추가 예정
- 문제가 해결되면 Ver1.1로 버전 업데이트
