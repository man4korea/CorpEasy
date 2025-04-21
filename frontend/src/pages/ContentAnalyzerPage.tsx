// 📁 frontend/src/pages/ContentAnalyzerPage.tsx
// Create at 2504211515 Ver1.2

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contentAnalysisApi from '../utils/contentAnalysisApi';
import Layout from '../components/Layout';
import SkeletonLoader from '../components/SkeletonLoader';

/**
 * 콘텐츠 심층분석기 페이지
 * URL 또는 텍스트 입력을 받아 AI로 분석하는 페이지
 * 우리가 디자인한 UI/UX 스타일 적용
 */
const ContentAnalyzerPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'youtube' | 'text' | 'file'>('url');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 분석 처리 함수
  const handleAnalyze = async () => {
    if (!inputValue.trim()) {
      setError("분석할 콘텐츠를 입력해주세요.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      
      // 활성 탭에 따라 다른 API 호출
      if (activeTab === 'youtube') {
        // YouTube URL 패턴 검증
        if (!inputValue.includes('youtube.com') && !inputValue.includes('youtu.be')) {
          throw new Error('유효한 YouTube URL을 입력해주세요.');
        }
        response = await contentAnalysisApi.analyzeYouTubeContent(inputValue);
      } else {
        // 일반 URL/텍스트 분석
        response = await contentAnalysisApi.analyzeContent(inputValue);
      }
      
      if (response.success && response.analysisId) {
        // 분석 결과 페이지로 리다이렉트
        navigate(`/analysis/${response.analysisId}`);
      } else {
        setError(response.message || "분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } catch (err: any) {
      console.error("분석 중 오류 발생:", err);
      setError(err.response?.data?.message || err.message || "서버 연결 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 파일 업로드 처리
  const [file, setFile] = useState<File | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // 파일 크기 검증 (10MB 제한)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("파일 크기는 10MB를 초과할 수 없습니다.");
        e.target.value = '';
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };
  
  const handleFileUpload = async () => {
    if (!file) {
      setError("업로드할 파일을 선택해주세요.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await contentAnalysisApi.analyzeFile(file);
      
      if (response.success && response.analysisId) {
        // 분석 결과 페이지로 리다이렉트
        navigate(`/analysis/${response.analysisId}`);
      } else {
        setError(response.message || "파일 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } catch (err: any) {
      console.error("파일 분석 중 오류 발생:", err);
      setError(err.response?.data?.message || err.message || "서버 연결 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 탭 변경 시 입력 초기화
  const handleTabChange = (tab: 'url' | 'youtube' | 'text' | 'file') => {
    setActiveTab(tab);
    setInputValue('');
    setFile(null);
    setError(null);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">콘텐츠 심층분석기</h1>
          
          {/* 탭 메뉴 */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <ul className="flex flex-wrap -mb-px">
                <li className="mr-2">
                  <button
                    onClick={() => handleTabChange('url')}
                    className={`inline-block p-4 ${
                      activeTab === 'url' 
                        ? 'text-blue-600 border-b-2 border-blue-600 rounded-t-lg active' 
                        : 'text-gray-500 hover:text-gray-600 border-b-2 border-transparent rounded-t-lg'
                    }`}
                  >
                    URL 분석
                  </button>
                </li>
                <li className="mr-2">
                  <button
                    onClick={() => handleTabChange('youtube')}
                    className={`inline-block p-4 ${
                      activeTab === 'youtube' 
                        ? 'text-blue-600 border-b-2 border-blue-600 rounded-t-lg active' 
                        : 'text-gray-500 hover:text-gray-600 border-b-2 border-transparent rounded-t-lg'
                    }`}
                  >
                    YouTube 분석
                  </button>
                </li>
                <li className="mr-2">
                  <button
                    onClick={() => handleTabChange('text')}
                    className={`inline-block p-4 ${
                      activeTab === 'text' 
                        ? 'text-blue-600 border-b-2 border-blue-600 rounded-t-lg active' 
                        : 'text-gray-500 hover:text-gray-600 border-b-2 border-transparent rounded-t-lg'
                    }`}
                  >
                    텍스트 분석
                  </button>
                </li>
                <li className="mr-2">
                  <button
                    onClick={() => handleTabChange('file')}
                    className={`inline-block p-4 ${
                      activeTab === 'file' 
                        ? 'text-blue-600 border-b-2 border-blue-600 rounded-t-lg active' 
                        : 'text-gray-500 hover:text-gray-600 border-b-2 border-transparent rounded-t-lg'
                    }`}
                  >
                    파일 분석
                  </button>
                </li>
              </ul>
            </div>
          </div>
          
          {/* 입력 안내 */}
          <div className="mb-4">
            <p className="text-gray-600 mb-2">
              {activeTab === 'url' && '웹사이트 URL을 입력하여 분석을 시작하세요.'}
              {activeTab === 'youtube' && 'YouTube 비디오 URL을 입력하여 분석을 시작하세요.'}
              {activeTab === 'text' && '텍스트를 직접 입력하여 분석을 시작하세요.'}
              {activeTab === 'file' && '텍스트 파일을 업로드하여 분석을 시작하세요. (최대 10MB)'}
            </p>
          </div>
          
          {/* URL/텍스트/YouTube 입력 폼 */}
          {(activeTab === 'url' || activeTab === 'youtube' || activeTab === 'text') && (
            <div className="mb-4">
              {activeTab === 'text' ? (
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={activeTab === 'text' ? "분석할 텍스트를 입력하세요..." : (activeTab === 'youtube' ? "YouTube URL을 입력하세요..." : "URL을 입력하세요...")}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                />
              ) : (
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={activeTab === 'youtube' ? "YouTube URL을 입력하세요..." : "URL을 입력하세요..."}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              
              <button
                onClick={handleAnalyze}
                disabled={isLoading || !inputValue.trim()}
                className={`mt-4 px-6 py-2 rounded-md font-medium ${
                  isLoading || !inputValue.trim()
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isLoading ? '분석중...' : '분석하기'}
              </button>
            </div>
          )}
          
          {/* 파일 업로드 폼 */}
          {activeTab === 'file' && (
            <div className="mb-4">
              <div className="mb-4">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".txt,.doc,.docx,.pdf,.md"
                  className="block w-full text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-sm text-gray-500">지원 형식: TXT, DOC, DOCX, PDF, MD (최대 10MB)</p>
              </div>
              
              <button
                onClick={handleFileUpload}
                disabled={isLoading || !file}
                className={`px-6 py-2 rounded-md font-medium ${
                  isLoading || !file
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isLoading ? '분석중...' : '파일 분석하기'}
              </button>
            </div>
          )}
          
          {/* 오류 메시지 */}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}
          
          {/* 로딩 표시 */}
          {isLoading && (
            <div className="bg-gray-50 rounded-md p-8 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">분석 중입니다. 잠시만 기다려주세요...</p>
              <p className="text-gray-500 text-sm mt-2">콘텐츠 길이에 따라 최대 1분 정도 소요될 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ContentAnalyzerPage;