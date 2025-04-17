// 📁 src/pages/GPT35.tsx
import React, { useState, useCallback } from 'react';
import axios from 'axios';

const GPT35 = () => {
  const [input, setInput] = useState('');
  const [responses, setResponses] = useState<Array<{text: string, timestamp: string}>>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const clearResponses = useCallback(() => {
    setResponses([]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/openai/gpt35', {
        messages: [
          {
            role: 'system',
            content: "당신은 정확하고 사실에 입각한 답변을 제공하는 AI 어시스턴트입니다. 확실하지 않은 정보는 추측하지 말고, 모르는 것은 솔직히 모른다고 말하세요. 답변할 때는 신뢰할 수 있는 정보와 논리적 근거를 바탕으로 설명하세요."
          },
          { 
            role: 'user', 
            content: input 
          }
        ]
      });

      setResponses(prev => [...prev, {
        text: response.data?.content || '응답을 받지 못했습니다.',
        timestamp: new Date().toISOString()
      }]);
      setInput('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 상단 헤더 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 text-blue-600">
              🤖
            </div>
            <h1 className="text-xl font-bold">OpenAI GPT-3.5</h1>
          </div>
          <button
            onClick={clearResponses}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
          >
            대화 내용 지우기
          </button>
        </div>
      </div>

      {/* 응답 영역 - 스크롤 가능 */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
            <p className="font-medium">오류 발생</p>
            <p>{error}</p>
          </div>
        )}
        
        {responses.map((response, index) => (
          <div key={response.timestamp} className="bg-white shadow rounded-md p-4 mb-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 text-blue-600">
                🤖
              </div>
              <p className="font-medium">GPT-3.5</p>
              <span className="ml-2 text-sm text-gray-500">
                {new Date(response.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="mt-2 prose prose-sm max-w-none">
              {response.text}
            </div>
          </div>
        ))}
        
        {responses.length === 0 && !error && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <p>GPT-3.5에게 질문하면 응답이 여기에 표시됩니다.</p>
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">응답 생성 중...</span>
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="bg-white p-4 border-t">
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
            className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="메시지를 입력하세요..."
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
          >
            {isLoading ? '생성 중...' : '전송'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GPT35;
