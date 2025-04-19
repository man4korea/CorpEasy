// 📁 backend/services/youtubeContentService.ts
// Create at 2504191107

import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * 유튜브 콘텐츠 서비스
 * - 유튜브 영상 ID 추출
 * - 유튜브 자막 추출
 * - 유튜브 영상 정보 조회
 */
export class YoutubeContentService {
  /**
   * 유튜브 URL에서 영상 ID 추출
   * @param url 유튜브 URL
   * @returns 유튜브 영상 ID
   */
  static extractVideoId(url: string): string | null {
    try {
      const urlObj = new URL(url);

      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.substring(1);
      }

      if (urlObj.hostname.includes('youtube.com')) {
        const searchParams = new URLSearchParams(urlObj.search);
        return searchParams.get('v');
      }

      return null;
    } catch (error) {
      logger.error('유튜브 URL 파싱 오류:', error);
      return null;
    }
  }

  /**
   * 유튜브 자막 추출
   * @param videoId 유튜브 영상 ID
   * @returns 자막 텍스트
   */
  static async fetchTranscript(videoId: string): Promise<string> {
    try {
      const response = await axios.get(`${process.env.API_BASE_URL}/api/youtube-transcript?videoId=${videoId}`);

      if (response.status !== 200 || !response.data) {
        throw new Error(`자막 추출 실패: ${response.status}`);
      }

      if (Array.isArray(response.data)) {
        return response.data
          .map((item: { text: string }) => item.text)
          .join(' ')
          .replace(/\s+/g, ' ');
      }

      if (typeof response.data === 'string') {
        return response.data;
      }

      if (response.data.transcript) {
        return response.data.transcript;
      }

      throw new Error('자막 데이터 형식이 예상과 다릅니다.');
    } catch (error) {
      logger.error(`유튜브 자막 추출 오류 (videoId: ${videoId}):`, error);
      throw new Error(`유튜브 자막을 추출할 수 없습니다: ${(error as Error).message}`);
    }
  }

  /**
   * 유튜브 영상 정보 조회
   * @param videoId 유튜브 영상 ID
   * @returns 영상 정보 (제목, 설명, 썸네일 등)
   */
  static async fetchVideoInfo(videoId: string): Promise<any> {
    try {
      if (!process.env.YOUTUBE_API_KEY) {
        throw new Error('YouTube API 키가 설정되어 있지 않습니다.');
      }

      const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
        params: {
          part: 'snippet,contentDetails,statistics',
          id: videoId,
          key: process.env.YOUTUBE_API_KEY
        }
      });

      if (response.status !== 200 || !response.data || !response.data.items || response.data.items.length === 0) {
        throw new Error(`영상 정보 조회 실패: ${response.status}`);
      }

      return response.data.items[0];
    } catch (error) {
      logger.error(`유튜브 영상 정보 조회 오류 (videoId: ${videoId}):`, error);
      throw new Error(`유튜브 영상 정보를 조회할 수 없습니다: ${(error as Error).message}`);
    }
  }

  /**
   * 유튜브 콘텐츠 분석에 필요한 모든 정보 조회
   * @param url 유튜브 URL
   * @returns 영상 정보와 자막
   */
  static async getYoutubeContentData(url: string): Promise<{
    videoId: string;
    videoInfo: any;
    transcript: string;
  }> {
    const videoId = this.extractVideoId(url);

    if (!videoId) {
      throw new Error('유효한 유튜브 URL이 아닙니다.');
    }

    const [videoInfo, transcript] = await Promise.all([
      this.fetchVideoInfo(videoId),
      this.fetchTranscript(videoId)
    ]);

    return {
      videoId,
      videoInfo,
      transcript
    };
  }

  /**
   * 유튜브 URL 유효성 검사
   * @param url 유튜브 URL
   * @returns 유효성 여부
   */
  static isValidYoutubeUrl(url: string): boolean {
    try {
      const videoId = this.extractVideoId(url);
      return videoId !== null;
    } catch (error) {
      return false;
    }
  }
}

// ✅ 이 부분이 새로 추가됨!
export const getYoutubeContent = YoutubeContentService.getYoutubeContentData;

export default YoutubeContentService;
