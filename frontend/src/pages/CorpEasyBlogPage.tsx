// 📁 frontend/src/pages/CorpEasyBlogPage.tsx
// Create at 2504191150

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contentAnalysisApi from '../utils/contentAnalysisApi';
import Layout from '../components/Layout';
import SkeletonLoader from '../components/SkeletonLoader';

interface BlogArticle {
  id: string;
  data: {
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
}

const CorpEasyBlogPage: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lastVisible, setLastVisible] = useState<string | null>(null);
  const navigate = useNavigate();

  // 블로그 아티클 조회
  const fetchBlogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await contentAnalysisApi.getPublishedBlogs(20);

      if (response.success) {
        setBlogs(response.blogs);
        setLastVisible(response.lastVisible);
      } else {
        setError('블로그 아티클을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('블로그 아티클 조회 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchBlogs();
  }, []);

  // 블로그 상세 페이지로 이동
  const handleViewBlog = (id: string) => {
    navigate(`/blog/${id}`);
  };

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

  // HTML에서 텍스트 추출
  const extractTextFromHtml = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // HTML에서 첫 번째 이미지 URL 추출
  const extractFirstImageUrl = (html: string): string | null => {
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return imgMatch ? imgMatch[1] : null;
  };

  // 검색 결과 필터링
  const filteredBlogs = blogs.filter((blog) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const title = blog.data.title.toLowerCase();
    const content = extractTextFromHtml(blog.data.html_content).toLowerCase();
    
    return title.includes(searchLower) || content.includes(searchLower);
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">CorpEasy 블로그</h1>
          <p className="text-gray-600">
            AI가 생성한 고품질 SEO 최적화 블로그 콘텐츠를 확인하세요.
          </p>
        </div>

        {/* 검색 */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="블로그 제목이나 내용 검색..."
              className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* 블로그 목록 */}
        {isLoading ? (
          // 로딩 스켈레톤
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <SkeletonLoader className="h-48 w-full" />
                <div className="p-6">
                  <SkeletonLoader className="h-6 w-3/4 mb-4" />
                  <SkeletonLoader className="h-4 w-full mb-2" count={3} />
                  <SkeletonLoader className="h-4 w-1/2 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // 오류 메시지
          <div className="p-6 bg-red-50 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          // 결과 없음
          <div className="p-6 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">검색 결과가 없습니다.</p>
          </div>
        ) : (
          // 블로그 카드 목록
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewBlog(blog.id)}
              >
                {/* 블로그 이미지 */}
                <div className="h-48 bg-gray-200 relative">
                  {(() => {
                    const imageUrl = extractFirstImageUrl(blog.data.html_content);
                    return imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={blog.data.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // 이미지 로드 실패 시 플레이스홀더로 대체
                          (e.target as HTMLImageElement).src = '/api/placeholder/400/320';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-16 w-16 opacity-30"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                          />
                        </svg>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-3 line-clamp-2">
                    {blog.data.title}
                  </h3>
                  
                  <div className="mb-4 h-12 overflow-hidden text-gray-600 text-sm">
                    {extractTextFromHtml(blog.data.html_content).substring(0, 120)}...
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{formatDate(blog.data.createdAt)}</span>
                    <span className="text-blue-600 hover:underline">자세히 보기</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 더보기 버튼 */}
        {!isLoading && lastVisible && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={async () => {
                try {
                  setIsLoading(true);
                  // TODO: 페이지네이션 API 호출 구현 필요
                  setIsLoading(false);
                } catch (err) {
                  console.error('페이지네이션 오류:', err);
                  setIsLoading(false);
                }
              }}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              더보기
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CorpEasyBlogPage;