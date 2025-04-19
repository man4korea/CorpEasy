// 📁 frontend/src/pages/KnowledgeBasePage.tsx
// Create at 2504191145

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contentAnalysisApi from '../utils/contentAnalysisApi';
import Layout from '../components/Layout';
import SkeletonLoader from '../components/SkeletonLoader';

// 카테고리 목록
const CATEGORIES = [
  '전체',
  '기술/IT',
  '비즈니스/경영',
  '마케팅',
  '교육/학습',
  '라이프스타일',
  '건강/의학',
  '엔터테인먼트',
  '과학',
  '예술/문화',
  '여행',
  '스포츠',
  '기타',
];

// 콘텐츠 타입 아이콘 맵핑
const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  youtube: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-red-600"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path
        fillRule="evenodd"
        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
        clipRule="evenodd"
      />
    </svg>
  ),
  url: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-blue-600"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
        clipRule="evenodd"
      />
    </svg>
  ),
  keyword: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-green-600"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  file: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-purple-600"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

interface ContentAnalysisItem {
  id: string;
  data: {
    url: string;
    type: 'youtube' | 'url' | 'keyword' | 'file';
    source_title: string;
    source_category: string;
    h1_h4_summary: string;
    keywords: string[];
    tags: string[];
    summaryOnly: boolean;
    blogGenerated: boolean;
    createdAt: {
      seconds: number;
      nanoseconds: number;
    };
  };
}

const KnowledgeBasePage: React.FC = () => {
  const [analyses, setAnalyses] = useState<ContentAnalysisItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<string | null>(null);
  const navigate = useNavigate();

  // 콘텐츠 분석 결과 조회
  const fetchContentAnalyses = async (category: string) => {
    try {
      setIsLoading(true);
      setError(null);

      let response;

      if (category === '전체') {
        response = await contentAnalysisApi.getAllContentAnalyses(20);
      } else {
        response = await contentAnalysisApi.getContentAnalysesByCategory(category, 20);
      }

      if (response.success) {
        setAnalyses(response.analyses);
        setLastVisible(response.lastVisible);
      } else {
        setError('콘텐츠 분석 결과를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('콘텐츠 분석 결과 조회 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 카테고리 변경 시 데이터 다시 불러오기
  useEffect(() => {
    fetchContentAnalyses(selectedCategory);
  }, [selectedCategory]);

  // 콘텐츠 상세 페이지로 이동
  const handleViewContent = (id: string) => {
    navigate(`/content-analysis/${id}`);
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

  // 검색 결과 필터링
  const filteredAnalyses = analyses.filter((item) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    return (
      item.data.source_title.toLowerCase().includes(searchLower) ||
      item.data.keywords.some((keyword) => keyword.toLowerCase().includes(searchLower)) ||
      item.data.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">지식정보창고</h1>
          <p className="text-gray-600">
            지금까지 분석된 모든 콘텐츠를 검색하고 조회할 수 있습니다.
          </p>
        </div>

        {/* 필터 및 검색 */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* 검색 */}
            <div className="w-full md:w-64">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="제목, 키워드, 태그 검색..."
                  className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute right-3 top-2.5 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
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
          </div>
        </div>

        {/* 콘텐츠 목록 */}
        {isLoading ? (
          // 로딩 스켈레톤
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <SkeletonLoader className="h-6 w-3/4 mb-4" />
                <SkeletonLoader className="h-4 w-full mb-2" count={3} />
                <SkeletonLoader className="h-4 w-1/2 mt-4" />
              </div>
            ))}
          </div>
        ) : error ? (
          // 오류 메시지
          <div className="p-6 bg-red-50 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredAnalyses.length === 0 ? (
          // 결과 없음
          <div className="p-6 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">검색 결과가 없습니다.</p>
          </div>
        ) : (
          // 콘텐츠 카드 목록
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnalyses.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewContent(item.id)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {item.data.source_category}
                    </span>
                    <span className="flex items-center">
                      {CONTENT_TYPE_ICONS[item.data.type]}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 line-clamp-2">
                    {item.data.source_title}
                  </h3>
                  
                  {/* 첫 번째 단락만 추출하여 표시 */}
                  <div className="mb-4 h-12 overflow-hidden text-gray-600 text-sm">
                    {(() => {
                      const firstParagraph = item.data.h1_h4_summary.match(/<p>(.*?)<\/p>/);
                      if (firstParagraph && firstParagraph[1]) {
                        return <p>{firstParagraph[1].replace(/<[^>]*>/g, '')}...</p>;
                      }
                      return <p>{item.data.h1_h4_summary.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>;
                    })()}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.data.keywords.slice(0, 3).map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs"
                      >
                        {keyword}
                      </span>
                    ))}
                    {item.data.keywords.length > 3 && (
                      <span className="text-xs text-gray-500">+{item.data.keywords.length - 3} 더보기</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{formatDate(item.data.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      {!item.data.summaryOnly && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          상세분석 완료
                        </span>
                      )}
                      {item.data.blogGenerated && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                          블로그 생성됨
                        </span>
                      )}
                    </div>
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

export default KnowledgeBasePage;