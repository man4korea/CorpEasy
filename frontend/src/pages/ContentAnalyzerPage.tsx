// 📁 frontend/src/pages/ContentAnalyzerPage.tsx
// Create at 2504231051 Ver2.1

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contentAnalysisApi from '../utils/contentAnalysisApi';
import Layout from '../components/Layout';
import SkeletonLoader from '../components/SkeletonLoader';
import axios from 'axios';

/**
 * 콘텐츠 심층분석기 페이지
 * URL 또는 텍스트 입력을 받아 AI로 분석하는 페이지
 * 우리가 디자인한 UI/UX 스타일 적용
 */
const ContentAnalyzerPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'youtube' | 'text' | 'file'>('youtube'); // 기본값을 'youtube'로 변경
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // YouTube 자막을 위한 상태 추가
  const [transcript, setTranscript] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  // YouTube 자막 가져오기 함수
  const fetchYouTubeTranscript = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setTranscript(null);
    
    try {
      // API 기본 URL 가져오기
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
      
      console.log(`YouTube 자막 API 호출: ${API_BASE_URL}/api/youtube-transcript`);
      
      // YouTube 자막 API 호출 (수정된 경로)
      const response = await axios.post(`${API_BASE_URL}/api/youtube-transcript`, { url });
      
      console.log('API 응답:', response.data);
      
      // API 응답 구조에 맞게 처리 (백엔드 응답 형식에 따라 조정 필요)
      if (response.data && response.data.transcript) {
        setTranscript(response.data.transcript);
        setShowTranscript(true);
      } else if (response.data && response.data.text) {
        // 백엔드에서 'text' 필드로 반환하는 경우
        setTranscript(response.data.text);
        setShowTranscript(true);
      } else {
        setError(response.data?.message || "자막을 가져오는 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      console.error("YouTube 자막 가져오기 오류:", err);
      setError(err.response?.data?.message || err.message || "자막을 가져오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 자막으로 분석 처리 함수
  const analyzeTranscript = async (transcriptText: string) => {
    if (!transcriptText) {
      setError("분석할 자막이 없습니다.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 텍스트 분석 API 사용 (자막은 텍스트로 취급)
      const response = await contentAnalysisApi.analyzeContent(transcriptText);
      
      if (response.success && response.analysisId) {
        // 분석 결과 페이지로 리다이렉트
        navigate(`/analysis/${response.analysisId}`);
      } else {
        setError(response.message || "분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } catch (err: any) {
      console.error("자막 분석 중 오류 발생:", err);
      setError(err.response?.data?.message || err.message || "서버 연결 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 분석 처리 함수
  const handleAnalyze = async () => {
    if (!inputValue.trim()) {
      setError("분석할 콘텐츠를 입력해주세요.");
      return;
    }
    
    // YouTube 탭이 활성화되어 있는 경우
    if (activeTab === 'youtube') {
      // YouTube URL 패턴 검증
      if (!inputValue.includes('youtube.com') && !inputValue.includes('youtu.be')) {
        setError('유효한 YouTube URL을 입력해주세요.');
        return;
      }
      
      await fetchYouTubeTranscript(inputValue);
      return; // 여기서 함수 종료 (자막만 가져오기 위해)
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      
      // 활성 탭에 따라 다른 API 호출
      if (activeTab === 'url') {
        response = await contentAnalysisApi.analyzeContent(inputValue);
      } else if (activeTab === 'text') {
        response = await contentAnalysisApi.analyzeContent(inputValue);
      }
      
      if (response && response.success && response.analysisId) {
        // 분석 결과 페이지로 리다이렉트
        navigate(`/analysis/${response.analysisId}`);
      } else {
        setError((response && response.message) || "분석 중 오류가 발생했습니다. 다시 시도해주세요.");
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
    setTranscript(null);
    setShowTranscript(false);
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
              {activeTab === 'youtube' && 'YouTube 비디오 URL을 입력하여 자막을 가져오세요.'}
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
                {isLoading ? '처리중...' : (activeTab === 'youtube' ? '자막 가져오기' : '분석하기')}
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
          
          {/* YouTube 자막 표시 */}
          {showTranscript && transcript && (
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">YouTube 자막</h2>
              <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                {transcript}
              </div>
              <div className="mt-4 flex justify-between">
                <button
                  onClick={() => setShowTranscript(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  닫기
                </button>
                <button
                  onClick={() => analyzeTranscript(transcript)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  자막으로 분석하기
                </button>
              </div>
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
              <p className="text-gray-600">처리 중입니다. 잠시만 기다려주세요...</p>
              <p className="text-gray-500 text-sm mt-2">콘텐츠 길이에 따라 최대 1분 정도 소요될 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ContentAnalyzerPage;