// 📁 backend/services/youtubeContentService.ts
// Create at 2504232055 Ver4.0

import axios from 'axios';
import cache from '../utils/cache';

/**
 * YouTube 콘텐츠 관련 서비스
 * 자막 추출 기능 구현
 */
const youtubeContentService = {
  /**
   * YouTube 자막 가져오기
   * 직접 YouTube 페이지에서 자막 데이터를 추출
   * 
   * @param videoId YouTube 동영상 ID
   * @param useCache 캐시 사용 여부 (기본값: true)
   * @returns 자막 텍스트
   */
  getYouTubeTranscript: async (videoId: string, useCache = true): Promise<string> => {
    try {
      // 캐시 키 생성
      const cacheKey = `youtube-transcript-${videoId}`;
      
      // 캐시 확인
      if (useCache) {
        const cachedData = await cache.get(cacheKey);
        if (cachedData) {
          console.log(`캐시에서 YouTube 자막 가져옴: ${videoId}`);
          return cachedData as string;
        }
      }
      
      // 먼저 동영상 정보 가져오기 (제목 등)
      let videoTitle = '';
      try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (apiKey) {
          const videoInfoResponse = await axios.get(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
          );
          
          if (videoInfoResponse.data?.items?.length > 0) {
            videoTitle = videoInfoResponse.data.items[0].snippet.title;
          }
        }
      } catch (error) {
        console.warn('YouTube API 동영상 정보 가져오기 실패:', error);
        // 동영상 정보는 필수가 아니므로 계속 진행
      }
      
      // 방법 1: YouTube 페이지에서 직접 자막 데이터 추출
      console.log(`YouTube 페이지에서 자막 가져오기 시도: ${videoId}`);
      const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const html = response.data;
      
      // 자막 트랙 찾기
      const captionTracksMatch = html.match(/"captionTracks":\[(.*?)\]/);
      if (!captionTracksMatch) {
        throw new Error('자막 트랙을 찾을 수 없습니다.');
      }
      
      const captionTracksJson = `[${captionTracksMatch[1]}]`;
      const captionTracks = JSON.parse(captionTracksJson);
      
      // 한국어 자막 찾기 (없으면 영어, 아니면 첫 번째 자막)
      const track = captionTracks.find((track: any) => 
        track.languageCode === 'ko'
      ) || captionTracks.find((track: any) => 
        track.languageCode === 'en'
      ) || captionTracks[0];
      
      if (!track || !track.baseUrl) {
        throw new Error('사용 가능한 자막을 찾을 수 없습니다.');
      }
      
      // 자막 URL에서 실제 자막 데이터 가져오기
      console.log(`자막 URL에서 데이터 가져오기: ${track.baseUrl}`);
      const transcriptResponse = await axios.get(track.baseUrl);
      const transcriptXml = transcriptResponse.data;
      
      // 자막 XML 파싱
      const textRegex = /<text[^>]*start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>(.*?)<\/text>/g;
      let match;
      let formattedTranscript = '';
      let timeIndex = 0;
      
      // 제목 추가 (있는 경우)
      if (videoTitle) {
        formattedTranscript += `# ${videoTitle}\n\n`;
      }
      
      formattedTranscript += `URL: https://www.youtube.com/watch?v=${videoId}\n\n`;
      
      // 시간 정보와 함께 텍스트 추출
      while ((match = textRegex.exec(transcriptXml)) !== null) {
        const startTime = parseFloat(match[1]);
        const duration = parseFloat(match[2]);
        const text = decodeHtmlEntities(match[3]).trim();
        
        if (text) {
          timeIndex++;
          const formattedTime = formatTime(startTime);
          formattedTranscript += `[${formattedTime}] ${text}\n`;
        }
      }
      
      // 자막이 추출되지 않은 경우
      if (formattedTranscript === `URL: https://www.youtube.com/watch?v=${videoId}\n\n`) {
        // 단순 텍스트만 추출 시도
        const simpleTextRegex = /<text[^>]*>(.*?)<\/text>/g;
        let simpleMatch;
        
        while ((simpleMatch = simpleTextRegex.exec(transcriptXml)) !== null) {
          const text = decodeHtmlEntities(simpleMatch[1]).trim();
          if (text) {
            formattedTranscript += `${text}\n`;
          }
        }
      }
      
      // 여전히 자막이 없는 경우
      if (formattedTranscript === `URL: https://www.youtube.com/watch?v=${videoId}\n\n`) {
        throw new Error('자막을 추출할 수 없습니다.');
      }
      
      // 캐시에 저장 (1일)
      if (useCache) {
        await cache.set(cacheKey, formattedTranscript, 86400);
      }
      
      return formattedTranscript;
    } catch (error: any) {
      console.error('YouTube 자막 가져오기 오류:', error);
      throw error;
    }
  }
};

// 시간을 00:00:00 형식으로 변환하는 함수
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

// HTML 엔티티 디코딩 함수
const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
};

export default youtubeContentService;