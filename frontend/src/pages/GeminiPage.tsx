// 📁 Frontend/src/pages/GeminiPage.tsx

import React, { useState, useCallback } from 'react';
import axios from 'axios';

export default function GeminiPage() {
  const [input, setInput] = useState('');
  const [responses, setResponses] = useState<Array<{text: string, timestamp: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 마크다운 스타일의 강조 텍스트를 HTML bold로 변환
  const convertBoldText = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  const clearResponses = useCallback(() => {
    setResponses([]);
  }, []);

  const handleAnalyze = async () => {
    if (!input.trim()) {
      setError('분석할 내용을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const isYouTubeUrl = input.includes('youtube.com/watch') || input.includes('youtu.be');
      let content = input;

      if (isYouTubeUrl) {
        // YouTube 자막 추출
        const res = await fetch(`http://localhost:3002/api/youtube-transcript?url=${encodeURIComponent(input)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '자막 추출 실패');
        content = data.script;
      }

      // Gemini API로 분석 요청
      const response = await axios.post('/api/gemini', {
        prompt: content,
        options: {
          model: 'gemini-1.5-flash-8b',
          temperature: 0.7
        }
      });

      setResponses(prev => [...prev, {
        text: response.data?.response || '분석 결과가 없습니다.',
        timestamp: new Date().toISOString()
      }]);
      setInput('');
    } catch (err: any) {
      setError(`오류 발생: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 상단 헤더 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3 text-green-600">
              🌐
            </div>
            <h1 className="text-xl font-bold">Google Gemini</h1>
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
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2 text-green-600">
                🌐
              </div>
              <p className="font-medium">Gemini</p>
              <span className="ml-2 text-sm text-gray-500">
                {new Date(response.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div 
              className="mt-2 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: convertBoldText(response.text) }}
            />
          </div>
        ))}
        
        {responses.length === 0 && !error && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <p>Gemini에게 질문하면 응답이 여기에 표시됩니다.</p>
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            <span className="ml-3 text-gray-600">응답 생성 중...</span>
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="bg-white p-4 border-t">
        <div className="flex items-center">
          <input
            type="text"
            className="flex-1 p-3 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="분석하고 싶은 내용이나 질문을 입력해주세요"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-r transition-colors duration-200 disabled:bg-green-400"
            onClick={handleAnalyze}
            disabled={isLoading}
          >
            {isLoading ? '분석 중...' : '분석 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}
