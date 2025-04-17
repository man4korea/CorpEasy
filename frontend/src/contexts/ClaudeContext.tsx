// 📁 frontend/src/contexts/ClaudeContext.tsx
// Claude API 상태 관리를 위한 Context 구현

import React, { createContext, useContext, useReducer, ReactNode, useRef, useCallback } from 'react';

// 토큰 정보 타입
interface TokenInfo {
  input: number;
  output: number;
}

// Claude API 상태 타입
interface ClaudeState {
  message: string;
  response: string;
  loading: boolean;
  error: string | null;
  streamedResponse: string;
  tokens: TokenInfo;
  requestTimeout: number;
}

// 액션 타입 정의
type ClaudeAction =
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'SET_RESPONSE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STREAMED_RESPONSE'; payload: string }
  | { type: 'SET_TOKENS'; payload: TokenInfo }
  | { type: 'SET_TIMEOUT'; payload: number }
  | { type: 'RESET_STATE' }
  | { type: 'CANCEL_REQUEST' };

// 초기 상태
const initialState: ClaudeState = {
  message: '',
  response: '',
  loading: false,
  error: null,
  streamedResponse: '',
  tokens: { input: 0, output: 0 },
  requestTimeout: 30000,
};

// 리듀서 함수
const claudeReducer = (state: ClaudeState, action: ClaudeAction): ClaudeState => {
  switch (action.type) {
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'SET_RESPONSE':
      return { ...state, response: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_STREAMED_RESPONSE':
      return { ...state, streamedResponse: action.payload };
    case 'SET_TOKENS':
      return { ...state, tokens: action.payload };
    case 'SET_TIMEOUT':
      return { ...state, requestTimeout: action.payload };
    case 'RESET_STATE':
      return { ...initialState, message: state.message }; // 메시지는 유지
    case 'CANCEL_REQUEST':
      return { ...state, loading: false, error: '요청이 취소되었습니다.' };
    default:
      return state;
  }
};

// Context 생성
interface ClaudeContextType {
  state: ClaudeState;
  dispatch: React.Dispatch<ClaudeAction>;
  handleApiCall: (msg: string) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => void;
  handleTestMessage: () => void;
  handleCancelRequest: () => void;
  checkServerStatus: () => Promise<void>;
}

const ClaudeContext = createContext<ClaudeContextType | undefined>(undefined);

// 요청 식별자 관리용 클래스
class RequestManager {
  private static requestId = 0;
  private static pendingRequests = new Map<number, AbortController>();

  static getNewRequestId(): number {
    return ++this.requestId;
  }

  static registerRequest(id: number, controller: AbortController): void {
    this.pendingRequests.set(id, controller);
  }

  static abortPreviousRequests(currentId: number): void {
    this.pendingRequests.forEach((controller, id) => {
      if (id < currentId) {
        controller.abort();
        this.pendingRequests.delete(id);
      }
    });
  }

  static abortAllRequests(): void {
    this.pendingRequests.forEach((controller) => {
      controller.abort();
    });
    this.pendingRequests.clear();
  }

  static removeRequest(id: number): void {
    this.pendingRequests.delete(id);
  }
}

// Context Provider 컴포넌트
interface ClaudeProviderProps {
  children: ReactNode;
}

export const ClaudeProvider: React.FC<ClaudeProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(claudeReducer, initialState);
  
  // 요청 타임아웃 타이머 참조
  const timeoutRef = useRef<number | null>(null);
  
  // 캐시 구현
  const responseCache = useRef<Map<string, {response: string, tokens: TokenInfo}>>(new Map());

  // 타임아웃 설정 함수 - 메시지 길이에 따라 동적으로 타임아웃 설정
  const calculateTimeout = (msg: string): number => {
    // 기본 타임아웃 30초에 메시지 길이에 따른 추가 시간 계산
    const dynamicTimeout = 30000 + Math.min(Math.floor(msg.length / 100) * 1000, 60000);
    return dynamicTimeout; // 최대 90초(30초 + 60초)
  };

  // API 호출 처리
  const handleApiCall = useCallback(async (msg: string): Promise<void> => {
    // 캐시 키 생성 (간단한 해시)
    const cacheKey = msg.trim();
    
    // 캐시 확인
    if (responseCache.current.has(cacheKey)) {
      console.log('🎯 캐시 히트: 저장된 응답 사용');
      const cachedData = responseCache.current.get(cacheKey)!;
      dispatch({ type: 'SET_RESPONSE', payload: cachedData.response });
      dispatch({ type: 'SET_TOKENS', payload: cachedData.tokens });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    
    const requestId = RequestManager.getNewRequestId();
    const controller = new AbortController();
    RequestManager.registerRequest(requestId, controller);
    
    // 이전 요청 중단
    RequestManager.abortPreviousRequests(requestId);
    
    // 타임아웃 계산 및 설정
    const timeout = calculateTimeout(msg);
    dispatch({ type: 'SET_TIMEOUT', payload: timeout });
    
    // 타임아웃 타이머 설정
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    
    // 클라이언트 측 타임아웃 설정
    const timeoutId = window.setTimeout(() => {
      console.log(`⏱️ 클라이언트 타임아웃: ${timeout}ms 초과`);
      controller.abort();
      dispatch({ 
        type: 'SET_ERROR', 
        payload: `요청 시간이 ${Math.round(timeout/1000)}초를 초과했습니다. 짧은 메시지로 다시 시도하세요.` 
      });
      dispatch({ type: 'SET_LOADING', payload: false });
      RequestManager.removeRequest(requestId);
    }, timeout);
    
    timeoutRef.current = timeoutId as unknown as number;
    
    try {
      console.log(`🚀 Claude API 요청 전송 중... (ID: ${requestId}, 타임아웃: ${timeout}ms)`);
      
      // API 요청 시간 측정
      console.time(`⏱️ API 요청 #${requestId}`);
      
      // 백엔드 요청 구조와 일치하도록 업데이트된 요청 형식
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ 
            role: 'user', 
            content: msg 
          }],
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1024,
        }),
        signal: controller.signal
      });
      
      // 타임아웃 타이머 제거 (응답 수신 완료)
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // 응답 상태 확인 및 더 자세한 오류 처리
      if (!res.ok) {
        let errorMessage = '알 수 없는 API 오류';
        try {
          const errorText = await res.text();
          console.error('Response error text:', errorText);
          
          // 유효한 JSON인 경우에만 파싱
          if (errorText && errorText.trim()) {
            try {
              const errorData = JSON.parse(errorText);
              // 타임아웃 오류 특별 처리
              if (errorData.error === 'API 요청 타임아웃') {
                errorMessage = `${errorData.message} (서버 타임아웃: ${errorData.timeout || timeout}ms)`;
              } else {
                errorMessage = errorData.error || (errorData.message ? errorData.message : errorMessage);
              }
            } catch (parseError) {
              errorMessage = `API 오류 (${res.status}): ${errorText}`;
            }
          } else {
            errorMessage = `API 오류 (${res.status}): 응답이 비어있습니다`;
          }
        } catch (readError) {
          errorMessage = `API 오류 (${res.status}): 응답을 읽을 수 없습니다`;
        }
        throw new Error(errorMessage);
      }
      
      // 응답 텍스트를 먼저 받아서 로깅
      const responseText = await res.text();
      console.log('API 응답 수신 (길이):', responseText.length);
      
      // 응답이 비어있는지 확인
      if (!responseText || responseText.trim() === '') {
        throw new Error('API 응답이 비어있습니다.');
      }
      
      let responseData;
      try {
        // 유효한 JSON인 경우에만 파싱
        responseData = JSON.parse(responseText);
        console.log('API 응답 파싱 성공:', responseData.id ? `ID: ${responseData.id}` : '응답 수신');
      } catch (parseError) {
        console.error('응답 JSON 파싱 오류:', parseError);
        throw new Error(`응답 파싱 오류: ${parseError.message}. 원시 응답: ${responseText.substring(0, 100)}...`);
      }
      
      let textResponse = '';
      
      if (responseData.content && responseData.content.length > 0) {
        textResponse = responseData.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');
      } else {
        console.warn('응답에 콘텐츠가 없습니다:', responseData);
        textResponse = '(응답 콘텐츠 없음)';
      }
      
      dispatch({ type: 'SET_RESPONSE', payload: textResponse });
      
      // 토큰 사용량 설정
      if (responseData.usage) {
        dispatch({
          type: 'SET_TOKENS',
          payload: {
            input: responseData.usage.input_tokens,
            output: responseData.usage.output_tokens
          }
        });
      } else {
        // 토큰 사용량 정보가 없는 경우 추정
        const estimatedTokens = {
          input: Math.ceil(msg.length / 4),
          output: Math.ceil(textResponse.length / 4)
        };
        dispatch({ type: 'SET_TOKENS', payload: estimatedTokens });
      }
      
      // 응답 캐싱
      responseCache.current.set(cacheKey, {
        response: textResponse,
        tokens: responseData.usage || { 
          input: Math.ceil(msg.length / 4), 
          output: Math.ceil(textResponse.length / 4) 
        }
      });
      
      // 캐시 크기 제한 (최대 20개)
      if (responseCache.current.size > 20) {
        const oldestKey = responseCache.current.keys().next().value;
        responseCache.current.delete(oldestKey);
      }
      
      console.timeEnd(`⏱️ API 요청 #${requestId}`);
      
    } catch (err: any) {
      // 타임아웃 타이머 제거 (오류 발생)
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (err.name === 'AbortError') {
        console.log(`🛑 요청 #${requestId} 취소됨`);
        return; // 취소된 요청은 오류로 처리하지 않음
      }
      
      console.error('❌ 오류:', err);
      
      if (err.message.includes('API 키')) {
        dispatch({ type: 'SET_ERROR', payload: '메시지 인증 오류가 발생했습니다. 서버 환경 변수를 확인해주세요.' });
      } else if (err.message.includes('CORS')) {
        dispatch({ type: 'SET_ERROR', payload: 'CORS 오류가 발생했습니다. 백엔드 서버가 실행 중인지 확인해주세요.' });
      } else if (err.message.includes('Failed to fetch')) {
        dispatch({ type: 'SET_ERROR', payload: '백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.' });
      } else if (err.message.includes('타임아웃')) {
        dispatch({ type: 'SET_ERROR', payload: `${err.message} 메시지 길이: ${msg.length}자` });
      } else {
        dispatch({ type: 'SET_ERROR', payload: `오류가 발생했습니다: ${err.message}` });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      RequestManager.removeRequest(requestId);
    }
  }, [dispatch]);

  // 폼 제출 처리
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (state.message.trim() === '') return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_STREAMED_RESPONSE', payload: '' });
    
    // API 호출
    handleApiCall(state.message);
  }, [state.message, handleApiCall]);

  // 테스트 메시지 설정
  const handleTestMessage = useCallback(() => {
    dispatch({ type: 'SET_MESSAGE', payload: '안녕하세요! 당신은 누구인가요?' });
  }, []);

  // 요청 취소 처리
  const handleCancelRequest = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // 현재 진행 중인 모든 요청 취소
    RequestManager.abortAllRequests();
    
    dispatch({ type: 'CANCEL_REQUEST' });
  }, []);

  // 서버 상태 확인
  const checkServerStatus = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const res = await fetch('/api/claude/status');
      const data = await res.json();
      
      if (data.status === 'ok') {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: '서버가 정상적으로 실행 중입니다. API 키 상태: ' + 
                  (data.apiValid ? '✅ 유효함' : '❌ 유효하지 않음')
        });
      } else {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `서버 상태 확인 결과: ${data.message || '알 수 없는 오류'}`
        });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: `서버 연결 오류: ${err.message}` });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  // Context 값 생성
  const contextValue = {
    state,
    dispatch,
    handleApiCall,
    handleSubmit,
    handleTestMessage,
    handleCancelRequest,
    checkServerStatus
  };

  return (
    <ClaudeContext.Provider value={contextValue}>
      {children}
    </ClaudeContext.Provider>
  );
};

// Custom Hook - Context 사용을 위한 훅
export const useClaudeContext = () => {
  const context = useContext(ClaudeContext);
  if (context === undefined) {
    throw new Error('useClaudeContext must be used within a ClaudeProvider');
  }
  return context;
};