// 📁 frontend/src/components/BlogGenerator.tsx
// Create at 2504191140

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import contentAnalysisApi from '../utils/contentAnalysisApi';
import SkeletonLoader from './SkeletonLoader';

interface BlogGeneratorProps {
  analysisId: string;
  title: string;
  onBlogGenerated: () => void;
}

const BlogGenerator: React.FC<BlogGeneratorProps> = ({
  analysisId,
  title,
  onBlogGenerated,
}) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [blogId, setBlogId] = useState<string | null>(null);
  const [blogPreview, setBlogPreview] = useState<string | null>(null);
  const navigate = useNavigate();

  // 블로그 생성 진행 상황 시뮬레이션
  const simulateProgress = () => {
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 95) {
          clearInterval(interval);
          return prevProgress;
        }
        return prevProgress + Math.random() * 10;
      });
    }, 1000);
    
    return interval;
  };

  // 블로그 생성 요청
  const handleGenerateBlog = async () => {
    try {
      setError(null);
      setIsGenerating(true);
      
      // 진행 상황 시뮬레이션 시작
      const progressInterval = simulateProgress();
      
      // 블로그 생성 API 호출
      const response = await contentAnalysisApi.generateBlogContent(analysisId, title);
      
      // 진행 상황 시뮬레이션 종료
      clearInterval(progressInterval);
      setProgress(100);
      
      if (response.success && response.blogId) {
        setBlogId(response.blogId);
        
        // 블로그 미리보기 설정 (HTML 콘텐츠의 일부)
        if (response.blog && response.blog.html_content) {
          // HTML에서 첫 번째 단락만 추출
          const firstParagraph = response.blog.html_content.match(/<p>(.*?)<\/p>/);
          if (firstParagraph && firstParagraph[1]) {
            setBlogPreview(firstParagraph[1]);
          }
        }
        
        // 콜백 함수 호출
        onBlogGenerated();
      } else {
        setError('블로그 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      console.error('블로그 생성 오류:', err);
      setError('블로그 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 블로그 상세 페이지로 이동
  const handleViewBlog = () => {
    if (blogId) {
      navigate(`/blog/${blogId}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">블로그 콘텐츠 생성</h2>
      
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">선택한 SEO 제목</h3>
        <p className="text-xl font-semibold p-3 bg-blue-50 rounded-md">{title}</p>
      </div>
      
      {!isGenerating && !blogId && (
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            선택한 제목을 바탕으로 AI가 최적화된 블로그 콘텐츠를 자동으로 생성합니다.
            생성된 콘텐츠는 HTML 형식으로 저장되며, CorpEasy 블로그에서 확인할 수 있습니다.
          </p>
          <button
            onClick={handleGenerateBlog}
            className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium w-full"
          >
            블로그 콘텐츠 생성 시작
          </button>
        </div>
      )}
      
      {/* 생성 진행 상황 */}
      {isGenerating && (
        <div className="mb-6">
          <div className="mb-2 flex justify-between">
            <span className="text-sm font-medium text-gray-700">
              블로그 콘텐츠 생성 중...
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-500 italic">
            AI가 고품질 콘텐츠를 생성하는 중입니다. 이 작업은 약 1-2분 정도 소요됩니다.
          </p>
        </div>
      )}
      
      {/* 생성 완료 */}
      {blogId && (
        <div className="mb-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-4">
            <div className="flex items-center text-green-700 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">블로그 콘텐츠 생성 완료!</span>
            </div>
            
            {blogPreview && (
              <div className="mb-2">
                <p className="text-gray-600">{blogPreview}...</p>
              </div>
            )}
            
            <button
              onClick={handleViewBlog}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
            >
              생성된 블로그 보기
            </button>
          </div>
        </div>
      )}
      
      {/* 오류 메시지 */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default BlogGenerator;