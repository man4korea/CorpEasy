// 📁 frontend/src/pages/BlogDetailPage.tsx
// Create at 2504191210

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import contentAnalysisApi from '../utils/contentAnalysisApi';
import Layout from '../components/Layout';
import SkeletonLoader from '../components/SkeletonLoader';

interface BlogDetail {
  blog: {
    ref_analysis_id: string;
    title: string;
    html_content: string;
    createdAt: {
      seconds: number;
      nanoseconds: number;
    };
    status: 'draft' | 'published';
    isVisible: boolean;
  };
  analysis: {
    url: string;
    type: 'youtube' | 'url' | 'keyword' | 'file';
    source_title: string;
    source_category: string;
    keywords: string[];
    tags: string[];
  } | null;
}

const BlogDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [blogDetail, setBlogDetail] = useState<BlogDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 블로그 상세 정보 조회
  useEffect(() => {
    const fetchBlogDetail = async () => {
      if (!id) {
        setError('블로그 ID가 필요합니다.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await contentAnalysisApi.getBlogDetail(id);
        
        if (response.success && response.blog) {
          setBlogDetail({
            blog: response.blog,
            analysis: response.analysis,
          });
        } else {
          setError('블로그 내용을 불러오는데 실패했습니다.');
        }
      } catch (err) {
        console.error('블로그 상세 조회 오류:', err);
        setError('블로그 내용을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogDetail();
  }, [id]);

  // 날짜 형식 변환
  const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 소스 콘텐츠로 이동
  const handleViewSource = () => {
    if (blogDetail?.analysis?.url) {
      if (blogDetail.analysis.type === 'youtube' || blogDetail.analysis.type === 'url') {
        window.open(blogDetail.analysis.url, '_blank');
      } else if (blogDetail.analysis.ref_analysis_id) {
        navigate(`/content-analysis/${blogDetail.analysis.ref_analysis_id}`);
      }
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          // 로딩 스켈레톤
          <div className="bg-white rounded-lg shadow-md p-6">
            <SkeletonLoader className="h-10 w-3/4 mb-6" />
            <SkeletonLoader className="h-4 w-1/2 mb-8" />
            <SkeletonLoader className="h-6 w-1/3 mb-4" />
            <SkeletonLoader className="h-4 w-full mb-2" count={15} />
          </div>
        ) : error ? (
          // 오류 메시지
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 bg-red-50 text-red-700 rounded-md mb-4">
              {error}
            </div>
            <button
              onClick={() => navigate('/blog')}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              블로그 목록으로 돌아가기
            </button>
          </div>
        ) : blogDetail ? (
          // 블로그 상세 내용
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* 헤더 */}
            <div className="p-8 border-b border-gray-200">
              <div className="mb-2 flex gap-2">
                {blogDetail.analysis?.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl font-bold mb-4">{blogDetail.blog.title}</h1>
              <div className="flex justify-between items-center text-gray-600">
                <span>작성일: {formatDate(blogDetail.blog.createdAt)}</span>
                {blogDetail.analysis && (
                  <button
                    onClick={handleViewSource}
                    className="text-blue-600 hover:underline flex items-center"
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
                  </button>
                )}
              </div>
            </div>
            
            {/* 블로그 콘텐츠 */}
            <div className="p-8">
              <div 
                className="prose max-w-none prose-lg"
                dangerouslySetInnerHTML={{ __html: blogDetail.blog.html_content }}
              />
            </div>
            
            {/* 키워드 및 카테고리 */}
            {blogDetail.analysis && (
              <div className="p-8 bg-gray-50 border-t border-gray-200">
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">카테고리</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {blogDetail.analysis.source_category}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">핵심 키워드</h3>
                  <div className="flex flex-wrap gap-2">
                    {blogDetail.analysis.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-800 rounded-md text-sm"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* 푸터 */}
            <div className="p-8 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => navigate('/blog')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                블로그 목록으로 돌아가기
              </button>
              <button
                onClick={() => navigate('/analyze')}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                새로운 분석 시작하기
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default BlogDetailPage;