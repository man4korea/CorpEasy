// 📁 frontend/src/pages/GrokPage.tsx
// Grok AI 인터페이스 페이지 (최적화 버전)

import React, { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';

// 텍스트 형식 변환 함수 (더 견고하게 개선)
function formatResponse(text: string): string {
  if (!text) return '<div class="text-base leading-relaxed">No response</div>';
  
  try {
    // 제목 형식 변환
    text = text.replace(/### (.*?)(\n|$)/g, '<h3 class="text-2xl font-bold mt-6 mb-3">$1</h3>');
    text = text.replace(/## (.*?)(\n|$)/g, '<h2 class="text-3xl font-bold mt-8 mb-4">$1</h2>');
    text = text.replace(/# (.*?)(\n|$)/g, '<h1 class="text-4xl font-bold mt-10 mb-5">$1</h1>');
    
    // 목록 항목 변환
    text = text.replace(/^\s*[-*]\s+(.*?)$/gm, '<li class="ml-6 my-2 text-base">$1</li>');
    text = text.replace(/(<li.*?>.*?<\/li>)\n(<li.*?>)/g, '$1$2'); // 목록 항목 간 줄바꿈 제거
    
    // 목록 그룹화
    text = text.replace(/(<li.*?>.*?<\/li>)(?:\n(?!<li)|\s*$)/g, '<ul class="list-disc my-4">$1</ul>');
    
    // 강조 텍스트 변환
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    
    // 코드 블록 스타일링
    text = text.replace(/```(.*?)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="bg-gray-100 p-4 rounded-md my-4 overflow-x-auto text-sm"><code class="language-${lang || 'plaintext'}">${code}</code></pre>`;
    });
    
    // 인라인 코드 스타일링
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>');
    
    // 링크 변환
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 hover:underline">$1</a>');
    
    // 단락 구분 (비어있지 않은 줄만)
    text = text.replace(/\n\n+/g, '</p><p class="my-4 text-base">');
    
    // 이미 HTML 태그가 있는 경우 처리
    if (/<\/?[a-z][\s\S]*>/i.test(text)) {
      return `<div class="text-base leading-relaxed">${text}</div>`;
    }
    
    return `<div class="text-base leading-relaxed"><p class="my-4 text-base">${text}</p></div>`;
  } catch (error) {
    console.error('응답 형식 변환 오류:', error);
    return `<div class="text-base leading-relaxed"><p class="my-4 text-base">${text}</p></div>`;
  }
}

export default function GrokPage() {
  // 상태 관리
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState<Array<{
    content: string;
    timestamp: number;
    processingTime?: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Array<{
    prompt: string;
    timestamp: number;
  }>>([]);
  
  // 자동 스크롤을 위한 참조
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responsesContainerRef = useRef<HTMLDivElement>(null);
  
  // 네트워크 상태 감지
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log('온라인 상태 감지');
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      console.log('오프라인 상태 감지');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // 초기 네트워크 상태 확인
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 오프라인 시 요청 저장, 온라인 복귀 시 재처리
  useEffect(() => {
    if (!isOffline && pendingRequests.length > 0) {
      // 가장 최근 요청만 처리
      const latestRequest = pendingRequests[pendingRequests.length - 1];
      setPendingRequests([]);
      
      console.log('오프라인 요청 복구:', latestRequest.prompt);
      
      // 1초 후 API 호출 (네트워크 완전 복구를 위한 지연)
      setTimeout(() => {
        callGrokAPI(latestRequest.prompt);
      }, 1000);
    }
  }, [isOffline, pendingRequests]);

  // 새 메시지가 추가될 때 스크롤 처리
  useEffect(() => {
    scrollToBottom();
  }, [responses, loading]);

  // 메시지 영역 하단으로 스크롤
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 타이머 시작 함수
  const startTimer = useCallback(() => {
    // 기존 타이머가 있으면 정리
    if (timer) {
      clearInterval(timer);
    }
    
    // 경과 시간 초기화
    setElapsedTime(0);
    
    // 1초마다 경과 시간 증가
    const newTimer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    setTimer(newTimer);
  }, [timer]);

  // 타이머 정지 함수
  const stopTimer = useCallback(() => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  }, [timer]);

  // API 호출 함수
  const callGrokAPI = async (inputPrompt?: string) => {
    const trimmedPrompt = (inputPrompt || prompt).trim();
    
    // 입력 검증
    if (!trimmedPrompt) {
      setError('질문을 입력해주세요.');
      return;
    }
    
    // 오프라인 상태 처리
    if (isOffline) {
      setPendingRequests(prev => [...prev, {
        prompt: trimmedPrompt,
        timestamp: Date.now()
      }]);
      
      setError('오프라인 상태입니다. 네트워크 연결이 복구되면 자동으로 요청이 처리됩니다.');
      return;
    }
    
    // 로딩 상태 설정 및 타이머 시작
    setLoading(true);
    setError('');
    startTimer();
    
    const startTime = Date.now();
    
    try {
      // API 호출
      const response = await axios.post('/api/grok', {
        messages: [{
          role: 'user',
          content: trimmedPrompt
        }],
        temperature: 0.7,
        timeout: 45000 // 45초 타임아웃
      }, {
        timeout: 50000 // axios 타임아웃
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // 응답 저장
      setResponses(prev => [...prev, {
        content: response.data.content,
        timestamp: Date.now(),
        processingTime
      }]);
      
      // 입력 필드 초기화
      setPrompt('');
    } catch (err: any) {
      // 오류 처리
      console.error('Grok API 오류:', err);
      
      let errorMessage = '응답 생성 중 오류가 발생했습니다.';
      
      // 오류 유형에 따른 메시지
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = '응답 생성 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.response?.status === 429) {
        errorMessage = '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      // 로딩 상태 해제 및 타이머 정지
      setLoading(false);
      stopTimer();
    }
  };

  // 엔터 키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      callGrokAPI();
    }
  };

  // 응답 지우기
  const clearResponses = () => {
    setResponses([]);
    setError('');
  };

  // 로딩 상태 렌더링
  const renderLoadingState = () => {
    let message = "응답 생성 중...";
    let additionalInfo = "";
    
    // 경과 시간에 따른 메시지 변경
    if (elapsedTime > 30) {
      message = "조금만 더 기다려주세요...";
      additionalInfo = "복잡한 질문은 처리 시간이 더 걸릴 수 있습니다.";
    } else if (elapsedTime > 15) {
      message = "응답을 준비하고 있습니다...";
      additionalInfo = `${elapsedTime}초 경과`;
    } else if (elapsedTime > 5) {
      additionalInfo = `${elapsedTime}초 경과`;
    }
    
    return (
      <div className="bg-white shadow rounded-md p-6 mb-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center mr-2 text-sky-600">
              🌠
            </div>
            <p className="font-medium text-lg">Grok</p>
          </div>
          <span className="text-xs text-gray-500">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 relative mb-4">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-lg text-gray-700 font-medium">{message}</span>
            {additionalInfo && (
              <span className="text-sm text-gray-500 mt-2">{additionalInfo}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 상단 헤더 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center mr-3 text-sky-600">
              🌠
            </div>
            <h1 className="text-xl font-bold">Grok 3 (xAI)</h1>
          </div>
          <button
            onClick={clearResponses}
            disabled={responses.length === 0 && !error}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            대화 내용 지우기
          </button>
        </div>
      </div>

      {/* 응답 영역 - 스크롤 가능 */}
      <div 
        ref={responsesContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {responses.length === 0 && !error && !loading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-sky-50 rounded-full mx-auto flex items-center justify-center mb-4">
              <span className="text-4xl">🌠</span>
            </div>
            <p className="text-lg text-gray-700 font-medium mb-2">Grok에게 질문해보세요</p>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              복잡한 질문, 코드 작성, 아이디어 등 다양한 주제에 대해 물어볼 수 있습니다.
            </p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">오류 발생</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {responses.map((response, index) => (
          <div key={index} className="mb-6">
            <div className="bg-white shadow rounded-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center mr-2 text-sky-600">
                    🌠
                  </div>
                  <p className="font-medium text-lg">Grok</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(response.timestamp).toLocaleTimeString()}
                  {response.processingTime && (
                    <span className="ml-2">({(response.processingTime / 1000).toFixed(1)}초)</span>
                  )}
                </span>
              </div>
              <div 
                className="prose prose-sky max-w-none"
                dangerouslySetInnerHTML={{ __html: formatResponse(response.content) }}
              />
            </div>
          </div>
        ))}
        
        {loading && renderLoadingState()}
        
        {/* 자동 스크롤을 위한 참조 지점 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 오프라인 알림 */}
      {isOffline && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mb-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                오프라인 상태입니다. 인터넷 연결을 확인해 주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="bg-white p-4 border-t">
        <div className="flex space-x-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Grok에게 질문하세요..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[56px] max-h-[200px]"
            rows={1}
            disabled={loading || isOffline}
          />
          <button
            onClick={() => callGrokAPI()}
            disabled={loading || isOffline || !prompt.trim()}
            className="bg-sky-500 text-white px-6 py-3 rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:bg-sky-400 flex-shrink-0"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                처리중
              </span>
            ) : (
              <span>전송</span>
            )}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2 text-right">
          Shift+Enter: 줄바꿈, Enter: 전송
        </div>
      </div>
    </div>
  );
}