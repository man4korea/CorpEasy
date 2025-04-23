// 📁 frontend/src/pages/ContentAnalyzerPage.tsx
// Create at 2504232020 Ver13.0

import React, { useState } from 'react';

/**
 * 단순한 YouTube 자막 추출 페이지
 * API 키를 직접 하드코딩하여 테스트 (실제 프로덕션에서는 제거 필요)
 */
const ContentAnalyzerPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // 자막 가져오기 함수 - 직접 테스트용
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
    
    try {
      // 동영상 ID 가져오기
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error('동영상 ID를 추출할 수 없습니다.');
      }

      console.log(`동영상 ID: ${videoId}`);
      
      // 테스트용 하드코딩 API 키 (실제 프로덕션에서는 제거 필요)
      const apiKey = "AIzaSyDoen_D-fQhNCadioLmC5LixlB2dI1_xII";
      
      // 1. 비디오 정보 가져오기
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
      );
      
      // API 응답 확인 (실패 시 오류 표시)
      if (!videoResponse.ok) {
        const errorData = await videoResponse.json();
        throw new Error(`YouTube API 오류: ${errorData.error?.message || '알 수 없는 오류'}`);
      }
      
      const videoData = await videoResponse.json();
      
      if (!videoData.items || videoData.items.length === 0) {
        throw new Error('비디오 정보를 찾을 수 없습니다.');
      }
      
      const videoTitle = videoData.items[0].snippet.title;
      console.log(`비디오 제목: ${videoTitle}`);
      
      // 대체 방법: 자막이 없거나 접근할 수 없는 경우 간단한 정보만 표시
      // YouTube API는 인증된 사용자만 자막 내용에 접근을 허용합니다.
      setTranscript(`
비디오 ID: ${videoId}
제목: ${videoTitle}
채널: ${videoData.items[0].snippet.channelTitle}
업로드 날짜: ${new Date(videoData.items[0].snippet.publishedAt).toLocaleDateString()}
설명: ${videoData.items[0].snippet.description.substring(0, 500)}${videoData.items[0].snippet.description.length > 500 ? '...' : ''}

참고: YouTube API를 통해 자막 내용을 직접 다운로드하려면 OAuth 인증이 필요합니다.
이 테스트에서는 비디오 정보만 표시합니다.
      `);
    } catch (error: any) {
      console.error('YouTube API 오류:', error);
      setError(error.message || '자막을 가져오는 중 오류가 발생했습니다.');
      
      // 오류 발생 시 테스트용 더미 데이터 표시
      setTranscript(`
테스트용 더미 자막 데이터입니다.
실제 YouTube API 호출에 실패했습니다: ${error.message}

00:00:01,000 --> 00:00:05,000
안녕하세요, YouTube 동영상에 오신 것을 환영합니다.

00:00:05,100 --> 00:00:10,000
이 영상에서는 다양한 주제에 대해 이야기할 예정입니다.

00:00:10,100 --> 00:00:15,000
자막 추출 테스트를 위한 예시 텍스트입니다.
      `);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-6">YouTube 자막 추출기</h1>
        
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
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
                <h3 className="text-lg font-semibold">추출된 자막</h3>
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
                      a.download = `youtube-transcript-${Date.now()}.txt`;
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