// 📁 backend/services/youtubeContentService.ts
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const fetch = (...args: any[]) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const youtube = google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY });

export function extractVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7]?.length === 11) ? match[7] : null;
}

export async function getVideoInfo(videoId: string) {
  const response = await youtube.videos.list({
    part: 'snippet,contentDetails,statistics',
    id: videoId,
  });
  const video = response.data.items?.[0];
  if (!video) throw new Error('영상을 찾을 수 없습니다.');

  return {
    title: video.snippet?.title,
    description: video.snippet?.description,
    publishedAt: video.snippet?.publishedAt,
    channel: video.snippet?.channelTitle,
    thumbnail: video.snippet?.thumbnails?.high?.url,
    duration: video.contentDetails?.duration,
    viewCount: video.statistics?.viewCount,
  };
}

export async function getTranscriptFallback(videoId: string) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    const captionTrackMatch = html.match(/"captionTracks":\[(.*?)\]/);
    if (!captionTrackMatch) return null;

    const captionTracks = JSON.parse(`[${captionTrackMatch[1]}]`);
    const track = captionTracks.find((t: any) =>
      t.languageCode === 'ko' || t.languageCode === 'en') || captionTracks[0];

    if (!track?.baseUrl) return null;

    const captionRes = await fetch(track.baseUrl);
    const captionXml = await captionRes.text();
    const textSegments = captionXml.match(/<text.*?>(.*?)<\/text>/g) || [];

    const script = textSegments.map(segment => {
      const match = segment.match(/<text.*?>(.*?)<\/text>/);
      return match ? match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
    }).join(' ');

    return {
      script,
      source: 'transcript'
    };
  } catch (err: any) {
    console.warn('자막 추출 실패:', err.message);
    return null;
  }
}

export async function getYoutubeContent(url: string) {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('유효한 YouTube URL이 아닙니다.');

  const video = await getVideoInfo(videoId);
  const transcriptResult = await getTranscriptFallback(videoId);

  return {
    success: true,
    title: video.title,
    channel: video.channel,
    script: transcriptResult?.script || video.description,
    description: video.description,
    thumbnailUrl: video.thumbnail,
    duration: video.duration,
    viewCount: video.viewCount,
    captionLanguage: transcriptResult ? transcriptResult.source : 'description',
    publishDate: video.publishedAt,
    source: transcriptResult ? 'transcript' : 'description'
  };
}
