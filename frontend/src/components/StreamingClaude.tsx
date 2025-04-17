// 📁 src/components/StreamingClaude.tsx
import React, { useState, useRef, useEffect } from 'react';
import SkeletonLoader from './SkeletonLoader';
import TypedResponse from './TypedResponse';

// 스트리밍 응답 처리를 위한 상태 타입
interface StreamState {
  message: string;
  status: 'idle' | 'loading' | 'streaming' | 'complete' | 'error';
  error: string | null;
}

// 토큰 사용량 추적 인터페이스
interface TokenUsage {
  input: number;
  output: number;
}

const StreamingClaude: React.FC = () => {
  const [message, setMessage] = useState<string>(''); // 사용자 입력
  const [streamState, setStreamState] = useState<StreamState>({
    message: '',
    status: 'idle',
    error: null
  });
  const [typingEffect, setTypingEffect] = useState<boolean>(true); // 타이핑 효과 활성화 여부
  const [speedMode, setSpeedMode] = useState<boolean>(false); // 속도 우선 모드
  const [tokens, setTokens] = useState<TokenUsage>({input: 0, output: 0}); // 토큰 사용량
  
  // 스트리밍 이벤트 소스 참조
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // 컴포넌트 언마운트 시 이벤트 소스 정리
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // 스트리밍 요청 처리
  const handleStreamRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 이전 연결 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    if (!message.trim()) {
      setStreamState({
        ...streamState,
        error: '메시지를 입력해주세요.',
      });
      return;
    }
    
    // 초기 상태 설정
    setStreamState({
      message: '',
      status: 'loading',
      error: null
    });
    
    try {
      // 요청 데이터 준비
      const requestData = {
        messages: [{
          role: 'user',
          content: message
        }],
        options: {
          speedMode: speedMode,
          max_tokens: 1024,
          temperature: speedMode ? 0.3 : 0.7
        }
      };
      
      // 스트리밍 API 엔드포인트 설정
      const endpoint = '/api/claude/stream';
      
      // 서버에 요청 전송
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }
      
      // 스트리밍 상태로 전환
      setStreamState(prev => ({
        ...prev,
        status: 'streaming'
      }));
      
      // 스트리밍 처리를 위한 reader 설정
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      
      let accumulatedResponse = '';
      
      // 스트리밍 데이터 처리 함수
      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6); // 'data: ' 부분 제거
                
                if (data === '[DONE]') continue;
                
                try {
                  const parsedData = JSON.parse(data);
                  
                  // 메타데이터 처리
                  if (parsedData.type === 'metadata') {
                    console.log('스트리밍 메타데이터:', parsedData);
                    continue;
                  }
                  
                  // 오류 처리
                  if (parsedData.type === 'error') {
                    setStreamState(prev => ({
                      ...prev,
                      status: 'error',
                      error: parsedData.message || '알 수 없는 오류가 발생했습니다.'
                    }));
                    return;
                  }
                  
                  // 콘텐츠 처리
                  if (parsedData.type === 'content_block_delta' || 
                      (parsedData.content && parsedData.content[0]?.type === 'text')) {
                    
                    // 텍스트 추출
                    const textDelta = parsedData.type === 'content_block_delta' 
                      ? parsedData.delta?.text 
                      : parsedData.content[0]?.text || '';
                    
                    if (textDelta) {
                      accumulatedResponse += textDelta;
                      
                      setStreamState(prev => ({
                        ...prev,
                        message: accumulatedResponse
                      }));
                    }
                  }
                  
                  // 완료 처리
                  if (parsedData.type === 'message_stop') {
                    setStreamState(prev => ({
                      ...prev,
                      status: 'complete'
                    }));
                    
                    // 토큰 사용량 설정
                    if (parsedData.usage) {
                      setTokens({
                        input: parsedData.usage.input_tokens || 0,
                        output: parsedData.usage.output_tokens || 0
                      });
                    }
                    break;
                  }
                } catch (parseError) {
                  console.error('스트리밍 데이터 파싱 오류:', parseError);
                }
              }
            }
          }
          
          // 스트리밍 완료 후 상태 업데이트
          setStreamState(prev => ({
            ...prev,
            status: 'complete'
          }));
          
        } catch (streamError) {
          console.error('스트리밍 처리 오류:', streamError);
          
          setStreamState(prev => ({
            ...prev,
            status: 'error',
            error: '스트리밍 데이터 처리 중 오류가 발생했습니다.'
          }));
        }
      };
      
      // 스트리밍 처리 시작
      processStream();
      
    } catch (error: any) {
      console.error('스트리밍 요청 오류:', error);
      
      setStreamState({
        message: '',
        status: 'error',
        error: `오류가 발생했습니다: ${error.message}`
      });
    }
  };

  // 테스트 메시지 설정
  const handleTestMessage = () => {
    setMessage('안녕하세요! 당신은 누구인가요?');
  };

  // 취소 처리
  const handleCancel = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      
      setStreamState({
        ...streamState,
        status: 'idle',
        error: '사용자가 요청을 취소했습니다.'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-2xl">✨</span> Claude 스트리밍 API 테스트
        </h1>
        <p className="text-gray-600 mt-2">
          실시간 스트리밍으로 응답을 받아 즉시 화면에 표시합니다.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleStreamRequest} className="space-y-4">
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
              placeholder="Claude에게 물어볼 내용을 입력하세요..."
              required
            />
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              id="speedMode"
              checked={speedMode}
              onChange={() => setSpeedMode(!speedMode)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="speedMode" className="text-sm text-gray-700">
              속도 우선 모드 (더 빠른 응답, 짧은 답변)
            </label>
            
            <input
              type="checkbox"
              id="typingEffect"
              checked={typingEffect}
              onChange={() => setTypingEffect(!typingEffect)}
              className="ml-4 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="typingEffect" className="text-sm text-gray-700">
              타이핑 효과 활성화
            </label>
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={streamState.status === 'loading' || streamState.status === 'streaming' || message.trim() === ''}
              className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {streamState.status === 'loading' ? '연결 중...' : 
               streamState.status === 'streaming' ? '수신 중...' : 
               '메시지 전송'}
            </button>
            
            {(streamState.status === 'loading' || streamState.status === 'streaming') && (
              <button
                type="button"
                onClick={handleCancel}
                className="py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                취소
              </button>
            )}
            
            <button
              type="button"
              onClick={handleTestMessage}
              className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              테스트 메시지
            </button>
          </div>
        </form>

        {streamState.error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            <h2 className="font-semibold mb-1">상태:</h2>
            <p>{streamState.error}</p>
          </div>
        )}

        {streamState.status === 'loading' && (
          <div className="mt-6">
            <h2 className="font-semibold mb-2">연결 중...</h2>
            <SkeletonLoader />
          </div>
        )}

        {(streamState.status === 'streaming' || streamState.status === 'complete') && streamState.message && (
          <div className="mt-6">
            <h2 className="font-semibold mb-2">Claude 응답:</h2>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              {typingEffect && streamState.status === 'streaming' ? (
                <TypedResponse text={streamState.message} />
              ) : (
                <p className="whitespace-pre-wrap">{streamState.message}</p>
              )}
            </div>
            
            {streamState.status === 'complete' && (
              <div className="mt-2 text-xs text-gray-500 flex justify-between">
                <span>토큰 사용: 입력 {tokens.input}, 출력 {tokens.output}, 총 {tokens.input + tokens.output}</span>
                <span>
                  {speedMode ? '빠른 모드' : '일반 모드'} | 
                  {typingEffect ? ' 타이핑 효과 켜짐' : ' 타이핑 효과 꺼짐'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamingClaude;