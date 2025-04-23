// 📁 backend/routes/youtube-router.ts
// Create at 2504232057 Ver4.0

import express, { Request, Response } from 'express';
import youtubeContentService from '../services/youtubeContentService';

const router = express.Router();

/**
 * YouTube 자막 가져오기 API
 * GET /api/youtube-transcript?url=<YOUTUBE_URL>
 * 또는
 * GET /api/youtube-transcript?videoId=<VIDEO_ID>
 */
router.get('/youtube-transcript', async (req: Request, res: Response) => {
  try {
    const { url, videoId: directVideoId } = req.query;
    let videoId: string | null = null;
    
    // URL이 제공된 경우 URL에서 videoId 추출
    if (url && typeof url === 'string') {
      try {
        if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
        } else if (url.includes('youtube.com/watch')) {
          const urlObj = new URL(url);
          videoId = urlObj.searchParams.get('v');
        }
      } catch (error) {
        console.error('YouTube URL 파싱 오류:', error);
      }
    } 
    // 직접 videoId가 제공된 경우
    else if (directVideoId && typeof directVideoId === 'string') {
      videoId = directVideoId;
    }
    
    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: '유효한 YouTube URL 또는 동영상 ID가 필요합니다.'
      });
    }
    
    // 캐시 사용 여부 확인 (선택적)
    const useCache = req.query.cache !== 'false';
    
    // YouTube 자막 가져오기
    console.log(`YouTube 자막 가져오기 요청: ${videoId}`);
    const transcript = await youtubeContentService.getYouTubeTranscript(videoId, useCache);
    
    return res.json({
      success: true,
      videoId,
      url: url || `https://www.youtube.com/watch?v=${videoId}`,
      transcript
    });
  } catch (error: any) {
    console.error('YouTube 자막 가져오기 오류:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'YouTube 자막을 가져오는 중 오류가 발생했습니다.'
    });
  }
});

export default router;