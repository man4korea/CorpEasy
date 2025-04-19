// 📁 frontend/src/pages/ContentAnalysisPage.tsx
// Create at 2504191205

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import contentAnalysisApi from '../utils/contentAnalysisApi';
import Layout from '../components/Layout';
import ContentAnalysisResult from '../components/ContentAnalysisResult';
import SkeletonLoader from '../components/SkeletonLoader';

const ContentAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 분석 결과 조회
  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!id) {
        setError('분석 ID가 필요합니다.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await contentAnalysisApi.getContentAnalysisById(id);
        
        if (response.success && response.analysis) {
          setAnalysis(response.analysis);
        } else {
          setError('분석 결과를 불러오는데 실패했습니다.');
        }
      } catch (err) {
        console.error('분석 결과 조회 오류:', err);
        setError('분석 결과를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  // 새 분석 시작
  const handleNewAnalysis = () => {
    navigate('/analyze');
  };

  // 콘텐츠 분석 API 임시 확장
  contentAnalysisApi.getContentAnalysisById = async (analysisId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/analyze/content/${analysisId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('분석 결과 조회 API 오류:', error);
      throw error;
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {isLoading ? (
          // 로딩 스켈레톤
          <div className="bg-white rounded-lg shadow-md p-6">
            <SkeletonLoader className="h-8 w-2/3 mb-4" />
            <SkeletonLoader className="h-4 w-full mb-2" count={10} />
          </div>
        ) : error ? (
          // 오류 메시지
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 bg-red-50 text-red-700 rounded-md mb-4">
              {error}
            </div>
            <button
              onClick={handleNewAnalysis}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              새로운 분석 시작하기
            </button>
          </div>
        ) : (
          // 콘텐츠 분석 결과
          <>
            <div className="mb-6 flex justify-between items-center">
              <button
                onClick={handleNewAnalysis}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                새로운 분석 시작하기
              </button>
              <button
                onClick={() => navigate('/knowledge-base')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                지식정보창고 보기
              </button>
            </div>
            
            <ContentAnalysisResult
              analysisId={id || ''}
              initialAnalysis={analysis}
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default ContentAnalysisPage;