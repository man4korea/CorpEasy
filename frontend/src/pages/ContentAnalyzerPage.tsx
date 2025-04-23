// 📁 frontend/src/pages/ContentAnalyzerPage.tsx
// Create at 2504231930 Ver11.0

import React, { useState } from 'react';

/**
 * 단순한 YouTube 자막 추출 페이지
 * YouTube API를 활용한 자막 추출 구현
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

  // 자막 가져오기 함수
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
      
      // YouTube API 키 (.env 파일에서 가져옴)
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      
      if (!apiKey) {
        throw new Error('YouTube API 키가 설정되지 않았습니다.');
      }
      
      // 1. 비디오 정보 가져오기
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
      );
      
      const videoData = await videoResponse.json();
      
      if (!videoData.items || videoData.items.length === 0) {
        throw new Error('비디오 정보를 찾을 수 없습니다.');
      }
      
      // 2. 자막 목록 가져오기
      const captionsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
      );
      
      const captionsData = await captionsResponse.json();
      
      if (!captionsData.items || captionsData.items.length === 0) {
        throw new Error('이 동영상에는 자막이 없거나 자막에 접근할 수 없습니다.');
      }
      
      // 한국어 자막 찾기 (없으면 영어 자막)
      const caption = captionsData.items.find((item: any) => 
        item.snippet.language === 'ko'
      ) || captionsData.items.find((item: any) => 
        item.snippet.language === 'en'
      ) || captionsData.items[0];
      
      const captionId = caption.id;
      
      // 3. 자막 내용 가져오기
      const transcriptResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions/${captionId}?key=${apiKey}`
      );
      
      // API 응답 확인
      if (!transcriptResponse.ok) {
        // YouTube API는 직접 자막 콘텐츠 다운로드를 허용하지 않음을 안내
        throw new Error('YouTube API를 통해 자막 콘텐츠를 직접 다운로드할 수 없습니다. 대체 방식으로 자막을 추출합니다.');
      }
      
      const transcriptData = await transcriptResponse.text();
      setTranscript(transcriptData);
      
    } catch (error: any) {
      console.error('자막 가져오기 오류:', error);
      
      // 실패 시 대체 방법: 간단한 예시 자막 표시 (테스트용)
      if (error.message.includes('YouTube API를 통해 자막 콘텐츠를 직접 다운로드할 수 없습니다')) {
        setTranscript(`
이 동영상에는 자막이 있지만, YouTube API는 자막 콘텐츠를 직접 다운로드할 권한을 제공하지 않습니다.

실제 구현에서는 다음과 같은 대안을 사용할 수 있습니다:
1. 백엔드 서버를 통한 자막 추출
2. YouTube 임베디드 플레이어의 자막 기능 활용
3. 서드파티 서비스를 통한 자막 추출

현재 화면은 테스트 목적으로만 표시됩니다.
        `);
      } else {
        setError(error.message || '자막을 가져오는 중 오류가 발생했습니다.');
      }
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