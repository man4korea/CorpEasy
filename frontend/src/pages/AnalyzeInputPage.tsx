// 📁 frontend/src/pages/AnalyzeInputPage.tsx
// Create at 2504191130

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contentAnalysisApi from '../utils/contentAnalysisApi';
import Layout from '../components/Layout';
import SkeletonLoader from '../components/SkeletonLoader';

const AnalyzeInputPage: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // 타이머 시작
  const startTimer = () => {
    // 기존 타이머 정리
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    setProcessingTime(0);
    const interval = window.setInterval(() => {
      setProcessingTime(prev => prev + 1);
    }, 1000);
    
    setTimerInterval(interval);
  };

  // 타이머 중지
  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // 파일 업로드 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // 파일이 선택되면 입력창 비우기
      setInput('');
    }
  };

  // 파일 삭제
  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 콘텐츠 분석 요청
  const handleAnalyze = async () => {
    try {
      setError(null);
      setIsAnalyzing(true);
      startTimer();

      let response;
      
      // 파일이 있으면 파일 분석, 없으면 텍스트 분석
      if (file) {
        response = await contentAnalysisApi.analyzeFile(file);
      } else if (input.trim()) {
        response = await contentAnalysisApi.analyzeContent(input);
      } else {
        setError('URL, 키워드 또는 파일을 입력해주세요.');
        setIsAnalyzing(false);
        stopTimer();
        return;
      }

      // 분석 완료 후 결과 페이지로 이동
      if (response.success && response.analysisId) {
        navigate(`/content-analysis/${response.analysisId}`);
      } else {
        setError('분석에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      console.error('분석 오류:', err);
      setError('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsAnalyzing(false);
      stopTimer();
    }
  };

  // 엔터 키 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  // 시간 형식 변환 (초 -> MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold text-center mb-8">콘텐츠 상세분석기</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-6">
            <p className="text-lg mb-2">다음 중 하나를 입력하여 분석을 시작하세요:</p>
            <ul className="list-disc pl-5 mb-4 text-gray-600">
              <li>유튜브 URL</li>
              <li>일반 웹사이트 URL</li>
              <li>분석하고 싶은 키워드 또는 주제</li>
              <li>텍스트 파일 업로드 (10MB 이하)</li>
            </ul>
          </div>
          
          {/* 입력 폼 */}
          <div className="mb-6">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAnalyzing || file !== null}
              placeholder="URL이나 키워드를 입력하세요. 엔터 키를 누르면 자동으로 분석이 시작됩니다."
              className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* 파일 업로드 */}
          <div className="mb-6">
            <div className="flex items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isAnalyzing || input.trim() !== ''}
                accept=".txt,.doc,.docx,.pdf,.csv"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`px-4 py-2 rounded-md mr-2 cursor-pointer ${
                  input.trim() !== '' 
                    ? 'bg-gray-300 text-gray-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                파일 업로드
              </label>
              {file && (
                <div className="flex items-center">
                  <span className="mr-2">{file.name}</span>
                  <button
                    onClick={handleRemoveFile}
                    disabled={isAnalyzing}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* 분석 버튼 */}
          <div className="flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (input.trim() === '' && file === null)}
              className={`px-6 py-3 rounded-md text-lg font-medium ${
                isAnalyzing || (input.trim() === '' && file === null)
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isAnalyzing ? '분석 중...' : '분석하기'}
            </button>
          </div>
          
          {/* 처리 시간 표시 */}
          {isAnalyzing && (
            <div className="mt-4 text-center">
              <p className="text-gray-600">처리 시간: {formatTime(processingTime)}</p>
              <SkeletonLoader className="h-4 w-full mt-2" />
            </div>
          )}
          
          {/* 오류 메시지 */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AnalyzeInputPage;