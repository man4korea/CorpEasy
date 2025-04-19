// 📁 frontend/src/pages/HaikuPage.tsx
// Create at 2504201415 Ver1.0

import React, { useState, useRef, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce'; // 필요한 경우 npm으로 설치해주세요

// Haiku API 응답 타입 정의
interface HaikuResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

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

  static removeRequest(id: number): void {
    this.pendingRequests.delete(id);
  }
}

const HaikuPage: React.FC = () => {
  const [message, setMessage] = useState<string>(''); // 사용자 입력을 저장
  const [response, setResponse] = useState<string>(''); // Claude의 응답을 저장
  const [loading, setLoading] = useState<boolean>(false); // 로딩 상태를 나타내는 변수
  const [error, setError] = useState<string | null>(null); // 오류 메시지 저장
  const [tokens, setTokens] = useState<{input: number, output: number}>({input: 0, output: 0}); // 토큰 사용량 추적
  
  // 캐시 구현
  const responseCache = useRef<Map<string, {response: string, tokens: {input: number, output: number}}>>(new Map());
  
  // 요청 생성 및 중복 요청 방지를 위한 디바운스 적용
  const debouncedApiCall = useDebouncedCallback(
    async (msg: string) => {
      await handleApiCall(msg);
    },
    300 // 300ms 디바운스
  );

  // 실제 API 호출 처리
  const handleApiCall = async (msg: string) => {
    // 캐시 키 생성 (간단한 해시)
    const cacheKey = msg.trim();
    
    // 캐시 확인
    if (responseCache.current.has(cacheKey)) {
      console.log('🎯 캐시 히트: 저장된 응답 사용');
      const cachedData = responseCache.current.get(cacheKey)!;
      setResponse(cachedData.response);
      setTokens(cachedData.tokens);
      setLoading(false);
      return;
    }
    
    const requestId = RequestManager.getNewRequestId();
    const controller = new AbortController();
    RequestManager.registerRequest(requestId, controller);
    
    // 이전 요청 중단
    RequestManager.abortPreviousRequests(requestId);
    
    try {
      console.log(`🚀 Claude Haiku API 요청 전송 중... (ID: ${requestId})`);
      
      // API 요청 시간 측정
      console.time(`⏱️ API 요청 #${requestId}`);
      
      // 백엔드 요청 구조와 일치하도록 업데이트된 요청 형식
      const res = await fetch('/api/claude-haiku', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ 
            role: 'user', 
            content: msg 
          }],
          model: 'claude-3-haiku-20240307', // Haiku 모델 ID 사용
          max_tokens: 1024,
          temperature: 0.7
        }),
        signal: controller.signal
      });
      
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
              errorMessage = errorData.error || (errorData.message ? errorData.message : errorMessage);
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
        console.log('API 응답 파싱 성공:', responseData);
      } catch (parseError) {
        console.error('응답 JSON 파싱 오류:', parseError);
        throw new Error(`응답 파싱 오류: ${parseError.message}. 원시 응답: ${responseText.substring(0, 100)}...`);
      }
      
      // 응답 텍스트 추출 로직 개선
      let textResponse = '';
      
      // content 객체의 형식 확인 및 처리
      if (responseData.content && Array.isArray(responseData.content)) {
        // 배열 형태의 content (Claude API v1 형식)
        textResponse = responseData.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');
          
        console.log('Content 배열 처리됨:', textResponse.substring(0, 100) + '...');
      } else if (typeof responseData.content === 'string') {
        // 문자열 형태의 content
        textResponse = responseData.content;
        console.log('Content 문자열 처리됨:', textResponse.substring(0, 100) + '...');
      } else {
        // 다른 구조 확인 (Anthropic API 응답 구조 변경 가능성)
        console.log('응답 구조 로깅:', JSON.stringify(responseData, null, 2));
        
        if (responseData.completion) {
          // 이전 버전 API 호환성
          textResponse = responseData.completion;
        } else if (responseData.text) {
          // 단순 텍스트 응답
          textResponse = responseData.text;
        } else {
          // 알 수 없는 응답 형식
          console.warn('응답에 콘텐츠가 없거나 알 수 없는 형식입니다:', responseData);
          textResponse = JSON.stringify(responseData, null, 2);
        }
      }
      
      setResponse(textResponse);
      
      // 토큰 사용량 설정
      if (responseData.usage) {
        setTokens({
          input: responseData.usage.input_tokens || 0,
          output: responseData.usage.output_tokens || 0
        });
      } else {
        // 토큰 사용량 정보가 없는 경우 추정
        const estimatedTokens = {
          input: Math.ceil(msg.length / 4),
          output: Math.ceil(textResponse.length / 4)
        };
        setTokens(estimatedTokens);
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
      if (err.name === 'AbortError') {
        console.log(`🛑 요청 #${requestId} 취소됨`);
        return; // 취소된 요청은 오류로 처리하지 않음
      }
      
      console.error('❌ 오류:', err);
      
      if (err.message.includes('API 키')) {
        setError('API 키 인증 오류가 발생했습니다. 서버 환경 변수를 확인해주세요.');
      } else if (err.message.includes('CORS')) {
        setError('CORS 오류가 발생했습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      } else if (err.message.includes('Failed to fetch')) {
        setError('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      } else {
        setError(`오류가 발생했습니다: ${err.message}`);
      }
    } finally {
      setLoading(false);
      RequestManager.removeRequest(requestId);
    }
  };

  // handleSubmit 함수 - 간소화
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // 메시지가 비어있는지 확인
    if (!message.trim()) {
      setError('메시지를 입력해주세요.');
      setLoading(false);
      return;
    }
    
    // API 호출 처리 함수 호출
    await handleApiCall(message);
  };

  // 간단한 테스트 메시지 사용
  const handleTestMessage = () => {
    setMessage('안녕하세요! 당신은 누구인가요?');
  };

  // 서버 상태 확인
  const checkServerStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/claude-haiku/status');
      const data = await res.json();
      
      if (data.status === 'ok') {
        setError('서버가 정상적으로 실행 중입니다. API 키 상태: ' + 
                (data.apiValid ? '✅ 유효함' : '❌ 유효하지 않음'));
      } else {
        setError(`서버 상태 확인 결과: ${data.message || '알 수 없는 오류'}`);
      }
    } catch (err: any) {
      setError(`서버 연결 오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-2xl">💨</span> Claude Haiku (빠른 속도 모델) 테스트
        </h1>
        <p className="text-gray-600 mt-2">
          가볍고 빠른 Claude Haiku 모델을 테스트해보세요. 빠른 응답 시간과 낮은 비용이 특징입니다.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              메시지
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Claude Haiku에게 물어볼 내용을 입력하세요..."
              required
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || message.trim() === ''}
              className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {loading ? '처리 중...' : '메시지 전송'}
            </button>
            
            <button
              type="button"
              onClick={handleTestMessage}
              className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              테스트 메시지
            </button>
            
            <button
              type="button"
              onClick={checkServerStatus}
              className="py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              서버 상태 확인
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            <h2 className="font-semibold mb-1">상태:</h2>
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="mt-6">
            <div className="flex items-center justify-center p-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2">API 요청 처리 중...</span>
            </div>
          </div>
        )}

        {!loading && response && (
          <div className="mt-6">
            <h2 className="font-semibold mb-2">Claude Haiku 응답:</h2>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="whitespace-pre-wrap">{typeof response === 'string' ? response : JSON.stringify(response)}</p>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              토큰 사용: 입력 {tokens.input}, 출력 {tokens.output}, 총 {tokens.input + tokens.output}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HaikuPage;