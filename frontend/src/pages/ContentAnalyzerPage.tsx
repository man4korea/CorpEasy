// 📁 frontend/src/pages/ContentAnalyzerPage.tsx
// Create at 2504240110 Ver7.0

import React, { useState } from 'react';
import Layout from '../components/Layout';

/**
 * 단순한 YouTube 자막 추출 페이지
 * 복잡한 기능 없이 자막만 추출하여 표시
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
      
      // 첨부한 프로그램 코드 참고: content.js의 getTranscript 함수 방식 사용
      const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const pageText = await pageResponse.text();

      // 자막 트랙 찾기
      const captionTracks = pageText.match(/"captionTracks":\[(.*?)\]/);
      if (!captionTracks) {
        throw new Error('자막 트랙을 찾을 수 없습니다.');
      }

      const tracks = JSON.parse(`[${captionTracks[1]}]`);

      // 한국어 자막 찾기 (없으면 영어 자막)
      const track = tracks.find((track: any) => 
        track.languageCode === 'ko'
      ) || tracks.find((track: any) => 
        track.languageCode === 'en'
      ) || tracks[0];

      if (!track) {
        throw new Error('자막 트랙을 찾을 수 없습니다.');
      }

      // 자막 URL 생성
      const transcriptUrl = track.baseUrl;

      // 자막 가져오기
      const transcriptResponse = await fetch(transcriptUrl);
      const data = await transcriptResponse.text();
      
      // XML 파싱
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, 'text/xml');
      
      // 텍스트 노드 추출
      const textNodes = Array.from(xmlDoc.getElementsByTagName('text'));
      const lines = textNodes.map(node => node.textContent).filter(Boolean);
      
      setTranscript(lines.join('\n'));
      
    } catch (error: any) {
      console.error('자막 가져오기 오류:', error);
      setError(error.message || '자막을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
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
    </Layout>
  );
};

export default ContentAnalyzerPage;