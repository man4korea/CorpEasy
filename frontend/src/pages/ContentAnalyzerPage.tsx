// 📁 frontend/src/pages/ContentAnalyzerPage.tsx
// Create at 2504240010 Ver5.0

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contentAnalysisApi from '../utils/contentAnalysisApi';
import Layout from '../components/Layout';
import SkeletonLoader from '../components/SkeletonLoader';
import axios from 'axios';

// 에러 모니터링 객체
const ErrorMonitor = {
  logs: [],
  
  // 에러 로깅 함수
  logError: function(context, error, extraInfo = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      context,
      message: error?.message || String(error),
      stack: error?.stack,
      extraInfo,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.logs.push(errorLog);
    console.error("ErrorMonitor captured:", errorLog);
    
    // 로컬 스토리지에 로그 저장 (최신 20개만 유지)
    try {
      const savedLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      const updatedLogs = [...savedLogs, errorLog].slice(-20);
      localStorage.setItem('errorLogs', JSON.stringify(updatedLogs));
    } catch (e) {
      console.error("Error saving logs to localStorage:", e);
    }
    
    return errorLog;
  },
  
  // API 요청 시도 정보 로깅
  logApiAttempt: function(endpoint, params, headers = {}) {
    const apiLog = {
      timestamp: new Date().toISOString(),
      endpoint,
      params,
      headers: { ...headers, Authorization: headers.Authorization ? '[REDACTED]' : undefined },
      url: window.location.href
    };
    
    console.log("API attempt:", apiLog);
    
    // 최근 API 요청 로그 유지 (최대 10개)
    try {
      const savedApiLogs = JSON.parse(localStorage.getItem('apiLogs') || '[]');
      const updatedLogs = [...savedApiLogs, apiLog].slice(-10);
      localStorage.setItem('apiLogs', JSON.stringify(updatedLogs));
    } catch (e) {
      console.error("Error saving API logs to localStorage:", e);
    }
    
    return apiLog;
  },
  
  // 모든 에러 로그 조회
  getErrorLogs: function() {
    return this.logs;
  },
  
  // 에러 로그 화면에 표시
  showErrorDialog: function() {
    // 이미 표시된 경우 처리
    if (document.getElementById('error-monitor-dialog')) {
      return;
    }
    
    // 로컬 스토리지에서 로그 가져오기
    let logs = [];
    try {
      logs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
    } catch (e) {
      console.error("Error reading logs from localStorage:", e);
    }
    
    // 대화상자 생성
    const dialog = document.createElement('div');
    dialog.id = 'error-monitor-dialog';
    dialog.style.cssText = 'position: fixed; top: 20px; right: 20px; width: 80%; max-width: 600px; max-height: 80vh; overflow-y: auto; background: white; border: 1px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.2); z-index: 9999; padding: 15px; border-radius: 8px;';
    
    // 헤더 추가
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;';
    header.innerHTML = '<h3 style="margin: 0; color: #e53e3e;">Error Monitor</h3>';
    
    // 닫기 버튼
    const closeButton = document.createElement('button');
    closeButton.innerText = '닫기';
    closeButton.style.cssText = 'background: #e53e3e; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;';
    closeButton.onclick = () => document.body.removeChild(dialog);
    header.appendChild(closeButton);
    
    dialog.appendChild(header);
    
    // 로그 내용 추가
    const content = document.createElement('div');
    
    if (logs.length === 0) {
      content.innerHTML = '<p>저장된 오류 로그가 없습니다.</p>';
    } else {
      // 로그 내용 구성
      logs.forEach((log, index) => {
        const logEntry = document.createElement('div');
        logEntry.style.cssText = 'margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 4px;';
        
        logEntry.innerHTML = `
          <div style="color: #666; font-size: 0.8rem;">${log.timestamp}</div>
          <div style="font-weight: bold; color: #e53e3e; margin: 5px 0;">${log.context}</div>
          <div style="margin-bottom: 5px;">${log.message}</div>
          ${log.extraInfo ? `<div style="font-size: 0.9rem; margin-top: 5px; color: #666;">추가 정보: ${JSON.stringify(log.extraInfo)}</div>` : ''}
        `;
        
        if (log.stack) {
          const stackDiv = document.createElement('pre');
          stackDiv.style.cssText = 'font-size: 0.8rem; background: #f0f0f0; padding: 5px; border-radius: 3px; overflow-x: auto; max-height: 150px; margin-top: 5px;';
          stackDiv.textContent = log.stack;
          logEntry.appendChild(stackDiv);
        }
        
        content.appendChild(logEntry);
      });
    }
    
    dialog.appendChild(content);
    
    // API 로그 버튼 추가
    const apiLogButton = document.createElement('button');
    apiLogButton.innerText = 'API 로그 보기';
    apiLogButton.style.cssText = 'background: #3182ce; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 10px;';
    apiLogButton.onclick = () => {
      // API 로그 대화상자 표시
      try {
        const apiLogs = JSON.parse(localStorage.getItem('apiLogs') || '[]');
        alert(JSON.stringify(apiLogs, null, 2));
      } catch (e) {
        alert('API 로그를 불러올 수 없습니다: ' + e.message);
      }
    };
    
    // 하단 버튼 그룹
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display: flex; justify-content: flex-start; margin-top: 15px;';
    buttonGroup.appendChild(apiLogButton);
    
    // 로그 삭제 버튼
    const clearButton = document.createElement('button');
    clearButton.innerText = '로그 삭제';
    clearButton.style.cssText = 'background: #718096; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;';
    clearButton.onclick = () => {
      localStorage.removeItem('errorLogs');
      localStorage.removeItem('apiLogs');
      document.body.removeChild(dialog);
      alert('모든 로그가 삭제되었습니다.');
    };
    buttonGroup.appendChild(clearButton);
    
    dialog.appendChild(buttonGroup);
    
    // 문서에 추가
    document.body.appendChild(dialog);
  }
};

// 페이지 전역에 ErrorMonitor 노출 (콘솔에서 디버깅 가능하도록)
window.ErrorMonitor = ErrorMonitor;

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
  const [debugMode, setDebugMode] = useState(false);
  
  // 디버그 모드 토글 핸들러 (Shift + D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'D') {
        setDebugMode(prev => !prev);
        if (!debugMode) {
          ErrorMonitor.showErrorDialog();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [debugMode]);

  // YouTube 자막 가져오기 함수 - 직접 텍스트 추출
  const fetchYouTubeTranscript = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setTranscript(null);
    
    try {
      // 유효한 YouTube URL인지 확인
      if (!url.includes('youtube.com/watch') && !url.includes('youtu.be/')) {
        throw new Error('유효한 YouTube URL이 아닙니다');
      }

      // Video ID 추출
      let videoId = '';
      if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        videoId = urlParams.get('v') || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
      }

      if (!videoId) {
        throw new Error('YouTube 비디오 ID를 추출할 수 없습니다');
      }

      console.log(`YouTube 비디오 ID 추출: ${videoId}`);

      // API 기본 URL과 현재 URL 로깅
      const currentUrl = window.location.href;
      const apiUrl = '/api/youtube/transcript';
      
      // API 시도 로깅
      ErrorMonitor.logApiAttempt(apiUrl, { videoId }, { 'Content-Type': 'application/json' });
      
      console.log(`현재 페이지 URL: ${currentUrl}`);
      console.log(`YouTube 자막 API 호출: ${apiUrl}`);

      // 다양한 API 경로 시도
      let response;
      let successMethod = '';
      
      try {
        // 방법 1: 상대 경로 GET 요청 (videoId 쿼리)
        response = await axios.get(apiUrl, { params: { videoId } });
        successMethod = '방법 1: GET /api/youtube/transcript?videoId=...';
      } catch (error1) {
        console.error("방법 1 실패:", error1);
        ErrorMonitor.logError("YouTube API 방법 1 실패", error1, { videoId, apiUrl });
        
        try {
          // 방법 2: 전체 경로 GET 요청 (url 쿼리)
          const fullUrl = '/api/youtube/transcript';
          response = await axios.get(fullUrl, { params: { url } });
          successMethod = '방법 2: GET /api/youtube/transcript?url=...';
        } catch (error2) {
          console.error("방법 2 실패:", error2);
          ErrorMonitor.logError("YouTube API 방법 2 실패", error2, { url, apiUrl: '/api/youtube/transcript' });
          
          try {
            // 방법 3: 분석 API POST 요청
            const analyzeUrl = '/api/analyze/content';
            response = await axios.post(analyzeUrl, { 
              url, 
              type: 'youtube',
              extractTranscript: true
            });
            successMethod = '방법 3: POST /api/analyze/content';
          } catch (error3) {
            console.error("방법 3 실패:", error3);
            ErrorMonitor.logError("YouTube API 방법 3 실패", error3, { 
              url, 
              apiUrl: '/api/analyze/content',
              body: { url, type: 'youtube', extractTranscript: true }
            });
            
            // 모든 방법 실패 - 마지막 에러 던지기
            throw error3;
          }
        }
      }

      console.log('API 호출 성공 방법:', successMethod);
      console.log('API 응답:', response.data);
      
      // 응답 처리
      if (response.data && response.data.success && response.data.data) {
        // 새로운 응답 구조 처리 (success + data 패턴)
        const data = response.data.data;
        if (data.transcript) {
          setTranscript(data.transcript);
          setShowTranscript(true);
        } else {
          throw new Error('자막 데이터가 응답에 없습니다');
        }
      } else if (response.data && response.data.transcript) {
        // 이전 응답 구조 처리 (직접 transcript 필드)
        setTranscript(response.data.transcript);
        setShowTranscript(true);
      } else if (response.data && typeof response.data === 'string') {
        // 문자열 응답인 경우
        setTranscript(response.data);
        setShowTranscript(true);
      } else {
        // 응답 구조 로깅 후 오류 발생
        ErrorMonitor.logError("알 수 없는 응답 형식", new Error("자막 데이터 없음"), { responseData: response.data });
        throw new Error('알 수 없는 응답 형식입니다');
      }
    } catch (err: any) {
      console.error("YouTube 자막 가져오기 오류:", err);
      
      // 자세한 오류 정보 로깅
      if (axios.isAxiosError(err)) {
        if (err.response) {
          console.error("응답 상태:", err.response.status);
          console.error("응답 데이터:", err.response.data);
          
          // 오류 로깅
          ErrorMonitor.logError("YouTube API 응답 오류", err, {
            status: err.response.status,
            data: err.response.data,
            url: err.config?.url,
            method: err.config?.method,
          });
        } else if (err.request) {
          console.error("요청은 전송되었지만 응답이 없음:", err.request);
          ErrorMonitor.logError("YouTube API 요청 후 응답 없음", err, {
            url: err.config?.url,
            method: err.config?.method,
          });
        } else {
          console.error("요청 설정 중 오류 발생:", err.message);
          ErrorMonitor.logError("YouTube API 요청 설정 오류", err);
        }
      } else {
        ErrorMonitor.logError("YouTube 자막 가져오기 일반 오류", err);
      }
      
      setError(err.response?.data?.message || err.message || "자막을 가져오는 중 오류가 발생했습니다. 네트워크 연결을 확인하세요.");
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
      // API 호출 시도 로깅
      ErrorMonitor.logApiAttempt('/api/analyze/content', { input: transcriptText.substring(0, 100) + '...' });
      
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
      ErrorMonitor.logError("자막 분석 오류", err);
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
        // API 호출 시도 로깅
        ErrorMonitor.logApiAttempt('/api/analyze/content', { input: inputValue });
        
        response = await contentAnalysisApi.analyzeContent(inputValue);
      } else if (activeTab === 'text') {
        ErrorMonitor.logApiAttempt('/api/analyze/content', { 
          input: inputValue.substring(0, 100) + (inputValue.length > 100 ? '...' : '') 
        });
        
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
      ErrorMonitor.logError("콘텐츠 분석 오류", err, { activeTab, inputLength: inputValue.length });
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
      // API 호출 시도 로깅
      ErrorMonitor.logApiAttempt('/api/analyze/file', { 
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      const response = await contentAnalysisApi.analyzeFile(file);
      
      if (response.success && response.analysisId) {
        // 분석 결과 페이지로 리다이렉트
        navigate(`/analysis/${response.analysisId}`);
      } else {
        setError(response.message || "파일 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } catch (err: any) {
      console.error("파일 분석 중 오류 발생:", err);
      ErrorMonitor.logError("파일 분석 오류", err, { 
        fileName: file.name, 
        fileSize: file.size,
        fileType: file.type
      });
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

  // 디버그 버튼 클릭 핸들러
  const handleDebugClick = () => {
    ErrorMonitor.showErrorDialog();
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">콘텐츠 심층분석기</h1>
          
          {/* 디버그 버튼 */}
          <button
            onClick={handleDebugClick}
            className="absolute top-4 right-4 text-xs bg-gray-200 hover:bg-gray-300 p-1 rounded"
            title="디버그 정보 표시 (Shift+D)"
          >
            디버그
          </button>
          
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
            // 📁 frontend/src/pages/ContentAnalyzerPage.tsx
// 파일 끝 부분 수정 (650-655 라인)

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