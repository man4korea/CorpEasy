// 📁 Frontend/src/pages/GeminiPage.tsx
// Create at 2504201500 Ver1.1

import React, { useState, useCallback } from 'react';
import axios from 'axios';

// Gemini 모델 정보 정의
const GEMINI_MODELS = [
  { 
    id: 'gemini-1.5-flash-8b', 
    name: 'Gemini 1.5 Flash-8B', 
    description: '경량화된 모델, 빠른 응답과 저비용' 
  },
  { 
    id: 'gemini-1.5-flash', 
    name: 'Gemini 1.5 Flash', 
    description: '고속 + 저비용, 실시간 응답에 적합' 
  },
  { 
    id: 'gemini-2.0-flash-lite', 
    name: 'Gemini 2.0 Flash-Lite', 
    description: '초경량화, FAQ 및 고객 응대용' 
  },
  { 
    id: 'gemini-2.0-flash', 
    name: 'Gemini 2.0 Flash', 
    description: '균형형 멀티모달, 상품 설명 및 실시간 보고에 적합' 
  },
  { 
    id: 'gemini-1.5-pro', 
    name: 'Gemini 1.5 Pro', 
    description: '200만 토큰 처리 가능, 복잡한 문서 분석' 
  },
  { 
    id: 'gemini-2.5-pro', 
    name: 'Gemini 2.5 Pro', 
    description: '최신 모델, 추론 능력 최강, 기술문서 및 전문 자문에 적합' 
  }
];

export default function GeminiPage() {
  const [input, setInput] = useState('');
  const [responses, setResponses] = useState<Array<{text: string, timestamp: string, model: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Gemini 관련 설정
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash-8b');
  const [temperature, setTemperature] = useState(0.7);

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
        const res = await fetch(`/api/youtube-transcript?url=${encodeURIComponent(input)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '자막 추출 실패');
        content = data.script;
      }

      // Gemini API로 분석 요청
      const response = await axios.post('/api/gemini', {
        prompt: content,
        options: {
          model: selectedModel,
          temperature: temperature
        }
      });

      setResponses(prev => [...prev, {
        text: response.data?.response || '분석 결과가 없습니다.',
        timestamp: new Date().toISOString(),
        model: selectedModel
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

  // 현재 선택된 모델 정보 가져오기
  const currentModelInfo = GEMINI_MODELS.find(model => model.id === selectedModel) || GEMINI_MODELS[0];

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

      {/* 모델 선택 및 설정 영역 */}
      <div className="bg-white border-b p-4">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
          <div className="mb-2 md:mb-0 flex-1">
            <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-1">
              Gemini 모델
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {GEMINI_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-2 md:mb-0 md:w-48">
            <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
              온도 (창의성): {temperature}
            </label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          <p><strong>현재 모델:</strong> {currentModelInfo.name}</p>
          <p><strong>특성:</strong> {currentModelInfo.description}</p>
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
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                {response.model.replace('gemini-', '')}
              </span>
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
            <p className="font-medium">{currentModelInfo.name}에게 질문하면 응답이 여기에 표시됩니다.</p>
            <p className="mt-2 text-sm">{currentModelInfo.description}</p>
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            <span className="ml-3 text-gray-600">{currentModelInfo.name} 응답 생성 중...</span>
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