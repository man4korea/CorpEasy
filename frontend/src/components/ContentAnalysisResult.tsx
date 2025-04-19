// 📁 frontend/src/components/ContentAnalysisResult.tsx
// Create at 2504191135

import React, { useState } from 'react';
import contentAnalysisApi from '../utils/contentAnalysisApi';
import SkeletonLoader from './SkeletonLoader';
import BlogGenerator from './BlogGenerator';

// 콘텐츠 분석 결과 타입 정의
interface ContentAnalysis {
  url: string;
  type: 'youtube' | 'url' | 'keyword' | 'file';
  source_title: string;
  source_category: string;
  h1_h4_summary: string;
  keywords: string[];
  tags: string[];
  summaryOnly: boolean;
  blogGenerated: boolean;
  wasTranslated?: boolean; // 번역 여부
  originalLanguage?: string; // 원본 언어
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

// 상세 분석 결과 타입 정의
interface DetailedAnalysis {
  relatedBlogs: Array<{ id: string; title: string }>;
  trendInsights: Array<{ id: string; title: string; summary: string }>;
  seoTitles: string[];
}

interface ContentAnalysisResultProps {
  analysisId: string;
  initialAnalysis?: ContentAnalysis;
}

const ContentAnalysisResult: React.FC<ContentAnalysisResultProps> = ({
  analysisId,
  initialAnalysis,
}) => {
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(initialAnalysis || null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<DetailedAnalysis | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeoTitle, setSelectedSeoTitle] = useState<string | null>(null);
  const [showBlogGenerator, setShowBlogGenerator] = useState<boolean>(false);

  // 상세 분석 요청
  const handleDetailedAnalysis = async () => {
    try {
      setError(null);
      setIsLoadingDetails(true);
      
      const response = await contentAnalysisApi.getDetailedAnalysis(analysisId);
      
      if (response.success && response.detailedAnalysis) {
        setDetailedAnalysis(response.detailedAnalysis);
        
        // analysis 업데이트 (summaryOnly 플래그가 변경됨)
        if (analysis) {
          setAnalysis({
            ...analysis,
            summaryOnly: false,
          });
        }
      } else {
        setError('상세 분석에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      console.error('상세 분석 오류:', err);
      setError('상세 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // SEO 제목 선택 처리
  const handleSelectSeoTitle = (title: string) => {
    setSelectedSeoTitle(title);
    setShowBlogGenerator(true);
  };

  // 블로그 생성 완료 처리
  const handleBlogGenerated = () => {
    // analysis 업데이트 (blogGenerated 플래그가 변경됨)
    if (analysis) {
      setAnalysis({
        ...analysis,
        blogGenerated: true,
      });
    }
    
    // 블로그 생성 UI 숨기기
    setShowBlogGenerator(false);
    setSelectedSeoTitle(null);
  };

  // 날짜 형식 변환
  const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 분석 결과가 없는 경우
  if (!analysis) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <SkeletonLoader className="h-8 w-2/3 mb-4" />
        <SkeletonLoader className="h-4 w-full mb-2" count={5} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* 헤더 섹션 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap justify-between items-center">
          <div>
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-2">
              {analysis.source_category}
            </span>
            <h1 className="text-3xl font-bold mb-2">{analysis.source_title}</h1>
            <p className="text-gray-500 text-sm">
              분석 시간: {formatDate(analysis.createdAt)}
            </p>

        {/* 번역 정보 표시 */}
        {analysis.wasTranslated && (
            <div className="mt-2 flex items-center text-sm">
              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.20l-2.86 7.15a1 1 0 01-.92.59H3a1 1 0 110-2h1.68l2.95-7.35A1 1 0 018.5 4H9V3a1 1 0 011-1zM5 12a1 1 0 100 2h10a1 1 0 100-2H5z" clipRule="evenodd" />
                </svg>
                {analysis.originalLanguage === 'en' 
                  ? '영어에서 한국어로 번역됨' 
                  : `${analysis.originalLanguage || '외국어'}에서 한국어로 번역됨`}
              </span>
            </div>
          )}
        </div>
          
          {/* 원본 URL 링크 */}
          {(analysis.type === 'youtube' || analysis.type === 'url') && (
            <a
              href={analysis.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center text-blue-600 hover:underline"
            >
              <span>원본 콘텐츠 보기</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </div>
        
        {/* 키워드와 태그 */}
        <div className="mt-4">
          <div className="mb-2">
            <h3 className="text-sm font-medium text-gray-500 mb-1">핵심 키워드</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">태그</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-sm text-blue-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* 요약 콘텐츠 */}
      <div className="p-6">
        <div 
          className="prose max-w-none prose-lg"
          dangerouslySetInnerHTML={{ __html: analysis.h1_h4_summary }}
        />
      </div>
      
      {/* 상세 분석 결과 */}
      {detailedAnalysis && (
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <h2 className="text-2xl font-bold mb-4">상세 분석</h2>
          
          {/* 관련 블로그 아티클 */}
          {detailedAnalysis.relatedBlogs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">관련 블로그 아티클</h3>
              <ul className="space-y-2">
                {detailedAnalysis.relatedBlogs.map((blog) => (
                  <li key={blog.id}>
                    <a
                      href={`/blog/${blog.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {blog.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* 트렌드 인사이트 */}
          {detailedAnalysis.trendInsights.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">업계 트렌드 인사이트</h3>
              <div className="space-y-4">
                {detailedAnalysis.trendInsights.map((insight) => (
                  <div key={insight.id} className="p-4 bg-white rounded-md shadow-sm">
                    <h4 className="text-lg font-medium mb-2">{insight.title}</h4>
                    <p className="text-gray-700">{insight.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* SEO 최적화 제목 */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">추천 SEO 최적화 제목</h3>
            <p className="text-gray-600 mb-3">
              다음 제목 중 하나를 선택하여 블로그 콘텐츠를 자동으로 생성할 수 있습니다.
            </p>
            <ul className="space-y-2">
              {detailedAnalysis.seoTitles.map((title, index) => (
                <li key={index} className="flex items-center">
                  <button
                    onClick={() => handleSelectSeoTitle(title)}
                    className="text-left py-2 px-4 w-full hover:bg-blue-50 rounded-md flex justify-between items-center"
                  >
                    <span>{title}</span>
                    <span className="text-blue-600">선택</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* 블로그 생성기 */}
      {showBlogGenerator && selectedSeoTitle && (
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <BlogGenerator
            analysisId={analysisId}
            title={selectedSeoTitle}
            onBlogGenerated={handleBlogGenerated}
          />
        </div>
      )}
      
      {/* 상세 분석 버튼 */}
      {analysis.summaryOnly && !isLoadingDetails && (
        <div className="p-6 border-t border-gray-200 flex justify-center">
          <button
            onClick={handleDetailedAnalysis}
            className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium"
          >
            상세 분석 보기
          </button>
        </div>
      )}
      
      {/* 로딩 상태 */}
      {isLoadingDetails && (
        <div className="p-6 border-t border-gray-200">
          <SkeletonLoader className="h-6 w-full mb-4" />
          <SkeletonLoader className="h-4 w-full mb-2" count={3} />
        </div>
      )}
      
      {/* 오류 메시지 */}
      {error && (
        <div className="p-6 border-t border-gray-200">
          <div className="p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentAnalysisResult;