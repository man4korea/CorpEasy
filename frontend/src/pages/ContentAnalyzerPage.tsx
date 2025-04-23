// 📁 frontend/src/pages/ContentAnalyzerPage.tsx
// Create at 2504231848 Ver15.0

import React, { useState, useEffect } from 'react';
import api from '../utils/api-client';

/**
 * YouTube 자막 추출 페이지
 * 백엔드 API를 통해 안전하게 자막 추출
 */
const ContentAnalyzerPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{id: string, title?: string} | null>(null);
  const [browserWarning, setBrowserWarning] = useState<string | null>(null);

  // 브라우저 호환성 확인
  useEffect(() => {
    // 크로미움 기반 브라우저 확인 (Chrome, Edge, Opera, Brave 등)
    const isChromium = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      return userAgent.includes('chrome') || userAgent.includes('chromium');
    };

    if (!isChromium()) {
      setBrowserWarning('최적의 자막 추출을 위해 Chrome, Edge, Brave, 웨일(Whale) 등 크로미움 기반 브라우저를 사용해주세요.');
    }
  }, []);

  // 자막 가져오기 함수 - 백엔드 API 사용
  const getTranscript = async () => {
    if (!url) {
      setError('URL을 입력해주세요.');
      return;
    }
    
    // YouTube URL 검증
    if (!url.includes('youtube.com/watch') && !url.includes('youtu.be/')) {
      setError('유효한 YouTube URL이 아닙니다.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setTranscript(null);
    setVideoInfo(null);
    
    try {
      // 백엔드 API 호출 - 환경에 맞는 경로 사용
      console.log('백엔드 API 호출:', url);
      const response = await api.get(`/api/youtube/transcript?url=${encodeURIComponent(url)}`);
      
      console.log('API 응답:', response.data);
      
      // 성공적으로 자막을 가져왔는지 확인
      if (response.data && response.data.success && response.data.transcript) {
        setTranscript(response.data.transcript);
        
        // 비디오 정보 설정
        if (response.data.videoId) {
          setVideoInfo({
            id: response.data.videoId,
            title: response.data.transcript.split('\n')[0]?.startsWith('#') 
              ? response.data.transcript.split('\n')[0].substring(2) 
              : undefined
          });
        }
      } else {
        throw new Error(response.data.message || '자막을 가져올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('자막 가져오기 오류:', error);
      
      // 상세 에러 메시지 표시
      let errorMessage = '자막을 가져오는 중 오류가 발생했습니다.';
      
      if (error.response) {
        // 서버에서 응답이 있는 경우
        errorMessage = error.response.data?.message || errorMessage;
        console.log('서버 응답 에러:', error.response.data);
      } else if (error.request) {
        // 요청은 보냈지만 응답이 없는 경우 (네트워크 문제 등)
        errorMessage = '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.';
        console.log('네트워크 에러:', error.request);
      } else {
        // 요청 설정 중 오류
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // YouTube ID 추출 함수
  const extractVideoId = (url: string): string | null => {
    try {
      // youtu.be 형식
      if (url.includes('youtu.be/')) {
        return url.split('youtu.be/')[1].split(/[?#]/)[0];
      }
      
      // youtube.com/watch 형식
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('v');
      }
      
      return null;
    } catch (error) {
      console.error('YouTube URL 파싱 오류:', error);
      return null;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-6">YouTube 자막 추출기</h1>
        
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
          {/* 브라우저 경고 메시지 */}
          {browserWarning && (
            <div className="p-4 mb-6 bg-yellow-50 text-yellow-700 rounded-md border border-yellow-200">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {browserWarning}
              </div>
            </div>
          )}
          
          {/* 입력 폼 */}
          <div className="mb-6">
            <label className="block mb-2 text-gray-700">YouTube URL</label>
            <div className="flex">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={getTranscript}
                disabled={loading || !url.trim()}
                className={`px-4 py-2 rounded-r-md font-medium ${
                  loading || !url.trim()
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {loading ? '로딩 중...' : '자막 가져오기'}
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              예: https://www.youtube.com/watch?v=dQw4w9WgXcQ
            </p>
          </div>
          
          {/* 오류 메시지 */}
          {error && (
            <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          {/* 로딩 표시 */}
          {loading && (
            <div className="flex justify-center items-center mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {/* 자막 표시 */}
          {transcript && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">
                  {videoInfo?.title ? `추출된 자막: ${videoInfo.title}` : '추출된 자막'}
                </h3>
                <div className="space-x-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(transcript)}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    복사
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([transcript], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = videoInfo?.title 
                        ? `${videoInfo.title.replace(/[^\w\s]/gi, '')}-transcript.txt`
                        : `youtube-transcript-${Date.now()}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    다운로드
                  </button>
                </div>
              </div>
              
              {/* 비디오 정보 표시 (선택적) */}
              {videoInfo && (
                <div className="mb-3 p-3 bg-blue-50 rounded-md">
                  <a 
                    href={`https://www.youtube.com/watch?v=${videoInfo.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    YouTube에서 보기
                  </a>
                </div>
              )}
              
              <div className="h-96 overflow-y-auto p-4 bg-gray-50 rounded border border-gray-200 whitespace-pre-wrap">
                {transcript}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentAnalyzerPage;