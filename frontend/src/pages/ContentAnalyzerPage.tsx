// 📁 frontend/src/pages/ContentAnalyzerPage.tsx
// Create at 2504191735

import React, { useState } from 'react';

/**
 * 콘텐츠 심층분석기 페이지
 * URL 또는 텍스트 입력을 받아 AI로 분석하는 페이지
 * 우리가 디자인한 UI/UX 스타일 적용
 */
const ContentAnalyzerPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!inputValue.trim()) return;
    
    setIsLoading(true);
    // 실제 구현에서는 백엔드 API 호출
    try {
      // 임시 지연 효과 (실제 구현에서는 API 호출로 대체)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAnalysisResult({
        title: "분석 결과",
        summary: "여기에 분석된 콘텐츠 요약이 표시됩니다.",
        keywords: ["키워드1", "키워드2", "키워드3"],
        sentiment: "긍정적",
        recommendations: [
          "이 콘텐츠에 기반한 추천 사항 1",
          "이 콘텐츠에 기반한 추천 사항 2"
        ]
      });
    } catch (error) {
      console.error("분석 중 오류 발생:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">콘텐츠 심층분석기</h1>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">심층 분석할 대상을 입력하세요.</p>
          <div className="flex">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="URL 또는 텍스트 입력"
              className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !inputValue.trim()}
              className={`px-6 py-2 rounded-r-md font-medium ${
                isLoading || !inputValue.trim()
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isLoading ? '분석중...' : '요약해줘'}
            </button>
          </div>
        </div>
        
        {/* 결과 영역 */}
        {isLoading && (
          <div className="bg-gray-50 rounded-md p-8 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">분석 중입니다. 잠시만 기다려주세요...</p>
          </div>
        )}
        
        {!isLoading && analysisResult && (
          <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{analysisResult.title}</h3>
            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-700 mb-2">요약</h4>
              <p className="text-gray-600">{analysisResult.summary}</p>
            </div>
            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-700 mb-2">주요 키워드</h4>
              <div className="flex flex-wrap gap-2">
                {analysisResult.keywords.map((keyword: string, index: number) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-700 mb-2">감성 분석</h4>
              <p className="text-gray-600">{analysisResult.sentiment}</p>
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-700 mb-2">추천 사항</h4>
              <ul className="list-disc list-inside text-gray-600">
                {analysisResult.recommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {!isLoading && !analysisResult && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-8 flex flex-col items-center justify-center">
            <p className="text-gray-500">URL이나 텍스트를 입력하면 AI가 분석 결과를 보여줍니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentAnalyzerPage;