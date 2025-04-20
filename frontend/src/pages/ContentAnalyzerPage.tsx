// 📁 frontend/src/pages/ContentAnalyzerPage.tsx
// Create at 2504211423 Ver1.1

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contentAnalysisApi from '../utils/contentAnalysisApi';
import Layout from '../components/Layout';

/**
 * 콘텐츠 심층분석기 페이지
 * URL 또는 텍스트 입력을 받아 AI로 분석하는 페이지
 * 우리가 디자인한 UI/UX 스타일 적용
 */
const ContentAnalyzerPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!inputValue.trim()) {
      setError("분석할 콘텐츠를 입력해주세요.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 실제 API 호출
      const response = await contentAnalysisApi.analyzeContent(inputValue);
      
      if (response.success && response.analysisId) {
        // 분석 결과 페이지로 리다이렉트
        navigate(`/analysis/${response.analysisId}`);
      } else {
        setError(response.message || "분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } catch (err: any) {
      console.error("분석 중 오류 발생:", err);
      setError(err.response?.data?.message || "서버 연결 중 오류가 발생했습니다. 다시 시도해주세요.");
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
      setError(err.response?.data?.message || "서버 연결 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
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
                  <a href="#url-input" className="inline-block p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active">URL/텍스트 입력</a>
                </li>
                <li className="mr-2">
                  <a href="#file-upload" className="inline-block p-4 text-gray-500 hover:text-gray-600 border-b-2 border-transparent rounded-t-lg">파일 업로드</a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* URL/텍스트 입력 폼 */}
          <div id="url-input" className="mb-6">
            <p className="text-gray-600 mb-2">
              다음 중 하나를 입력하여 분석을 시작하세요:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 pl-2">
              <li>유튜브 URL</li>
              <li>일반 웹사이트 URL</li>
              <li>분석하고 싶은 키워드 또는 주제</li>
              <li>텍스트 파일 업로드 (10MB 이하)</li>
            </ul>
            
            <div className="mb-4">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="URL 또는 텍스트 입력"
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              />
            </div>
            
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !inputValue.trim()}
              className={`px-6 py-2 rounded-md font-medium ${
                isLoading || !inputValue.trim()
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isLoading ? '분석중...' : '분석하기'}
            </button>
          </div>
          
          {/* 파일 업로드 폼 */}
          <div id="file-upload" className="mb-6">
            <p className="text-gray-600 mb-4">텍스트 파일을 업로드하여 분석할 수 있습니다. (최대 10MB)</p>
            
            <div className="mb-4">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".txt,.doc,.docx,.pdf"
                className="block w-full text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
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