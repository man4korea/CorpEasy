// 📁 backend/functions/src/index.ts
// Create at 2504232150 Ver4.0 

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';
import axios from 'axios'; // 이 import 추가 필요
import { YoutubeTranscript } from 'youtube-transcript-api';

// 환경 변수 설정
dotenv.config();

// Firebase 초기화
admin.initializeApp();

// Express 애플리케이션 생성
const app = express();

// 기본 미들웨어 설정
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(compression());
app.use(helmet());

// 간단한 응답 시간 미들웨어
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// 간단한 인증 미들웨어 (항상 통과하도록 수정)
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // 항상 인증 통과 (개발 및 테스트용)
  return next();
};

// YouTube 비디오 ID 추출 함수
function extractYouTubeVideoId(url: string): string | null {
  // YouTube URL에서 비디오 ID 추출
  let videoId = null;
  
  // 정규식 패턴으로 비디오 ID 추출
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*v=)([^&\s]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      videoId = match[1];
      break;
    }
  }
  
  return videoId;
}

// YouTube 자막 추출 함수 개선
async function getYouTubeTranscript(videoId: string): Promise<string> {
  console.log(`YouTube 자막 가져오기 시작: 비디오 ID ${videoId}`);
  let captionsData = null;
  let errorMessages: string[] = [];

  try {
    // 1. 방법 1: 직접 YouTube 페이지 요청
    console.log('YouTube 페이지 요청 시작');
    const pageResponse = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000 // 10초 타임아웃
    });
    
    const pageText = pageResponse.data;
    console.log('YouTube 페이지 응답 받음, 길이:', pageText.length);

    // 디버그: ytInitialPlayerResponse 찾기
    if (pageText.includes('ytInitialPlayerResponse')) {
      console.log('ytInitialPlayerResponse 발견됨');
    } else {
      console.log('ytInitialPlayerResponse 없음');
    }

    // 2. 다양한 패턴으로 자막 데이터 추출 시도
    const patterns = [
      /"captionTracks":\s*(\[.*?\])/,
      /"playerCaptionsTracklistRenderer":\s*(\{.*?\})/,
      /"captions":\s*(\{.*?\})/,
      /ytInitialPlayerResponse\s*=\s*(\{.*?\});/
    ];

    for (const pattern of patterns) {
      try {
        const match = pageText.match(pattern);
        if (match && match[1]) {
          console.log(`패턴 매치 성공: ${pattern}`);
          
          let data;
          try {
            // JSON 파싱 시도
            data = JSON.parse(match[1]);
            console.log('JSON 파싱 성공:', typeof data);
            
            // 자막 트랙 찾기
            let tracks: any[] = [];
            
            if (Array.isArray(data)) {
              // 직접 captionTracks 배열인 경우
              tracks = data;
            } else if (data.captionTracks) {
              // 객체 내부에 captionTracks 있는 경우
              tracks = data.captionTracks;
            } else if (data.playerCaptionsTracklistRenderer?.captionTracks) {
              // 다른 구조
              tracks = data.playerCaptionsTracklistRenderer.captionTracks;
            }
            
            if (tracks.length > 0) {
              console.log(`${tracks.length}개의 자막 트랙 발견`);
              
              // 한국어 자막 찾기 (없으면 첫 번째 자막 사용)
              const koreanTrack = tracks.find((track: any) => 
                track.languageCode === 'ko'
              );
              
              const selectedTrack = koreanTrack || tracks[0];
              
              if (selectedTrack?.baseUrl) {
                console.log('자막 URL 발견:', selectedTrack.baseUrl.substring(0, 50) + '...');
                
                try {
                  // 자막 데이터 가져오기
                  const captionResponse = await axios.get(selectedTrack.baseUrl, {
                    timeout: 5000
                  });
                  
                  captionsData = captionResponse.data;
                  console.log('자막 데이터 가져오기 성공');
                  
                  // 데이터 형식 확인
                  if (typeof captionsData === 'string') {
                    console.log('자막 데이터는 문자열 형식, XML 파싱 필요');
                  } else if (typeof captionsData === 'object') {
                    console.log('자막 데이터는 객체 형식');
                  }
                  
                  break; // 성공했으므로 반복 중단
                } catch (captionError: any) {
                  console.error('자막 URL 접근 오류:', captionError.message);
                  errorMessages.push(`자막 URL 접근 오류: ${captionError.message}`);
                }
              }
            }
          } catch (jsonError: any) {
            console.error('JSON 파싱 오류:', jsonError.message);
            errorMessages.push(`JSON 파싱 오류: ${jsonError.message}`);
          }
        }
      } catch (patternError: any) {
        console.error('패턴 매치 오류:', patternError.message);
        errorMessages.push(`패턴 매치 오류: ${patternError.message}`);
      }
    }
  } catch (pageError: any) {
    console.error('YouTube 페이지 요청 실패:', pageError.message);
    errorMessages.push(`페이지 요청 실패: ${pageError.message}`);
  }

  // 3. 방법 2: YouTube Data API 사용 (API 키가 있는 경우)
  if (!captionsData && process.env.YOUTUBE_API_KEY) {
    try {
      console.log('YouTube Data API 시도');
      const apiKey = process.env.YOUTUBE_API_KEY;
      
      // 동영상 정보 가져오기
      const videoInfoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
      const videoInfoResponse = await axios.get(videoInfoUrl);
      
      if (videoInfoResponse.data?.items?.length > 0) {
        const videoTitle = videoInfoResponse.data.items[0].snippet.title;
        console.log('동영상 제목:', videoTitle);
        
        // 자막 트랙 목록 가져오기
        const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
        const captionsResponse = await axios.get(captionsUrl);
        
        if (captionsResponse.data?.items?.length > 0) {
          console.log(`${captionsResponse.data.items.length}개의 자막 트랙 발견 (API)`);
          
          // 나중에 구현
          // API로는 자막 파일 직접 다운로드가 제한됨
        }
      }
    } catch (apiError: any) {
      console.error('YouTube API 오류:', apiError.message);
      errorMessages.push(`YouTube API 오류: ${apiError.message}`);
    }
  }

  // 4. 방법 3: youtube-transcript-api 사용
  if (!captionsData) {
    try {
      console.log('youtube-transcript-api 시도');
      const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);
      if (transcriptList && transcriptList.length > 0) {
        console.log('youtube-transcript-api 성공');
        const segments = transcriptList.map(item => {
          const startTime = Math.floor(item.offset / 1000);
          const minutes = Math.floor(startTime / 60);
          const seconds = startTime % 60;
          return `[${minutes}:${seconds.toString().padStart(2, '0')}] ${item.text}`;
        });
        return segments.join('\n');
      }
    } catch (apiError: any) {
      console.error('youtube-transcript-api 실패:', apiError.message);
      errorMessages.push(`youtube-transcript-api 실패: ${apiError.message}`);
    }
  }

  // 5. 자막 데이터 처리
  if (captionsData) {
    try {
      console.log('자막 데이터 처리 시작');
      let transcript = '';
      
      // XML 형식 처리 (문자열)
      if (typeof captionsData === 'string') {
        // 시간과 텍스트 추출을 위한 정규식
        const textRegex = /<text[^>]*start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>(.*?)<\/text>/g;
        let match;
        let segments: string[] = [];
        
        while ((match = textRegex.exec(captionsData)) !== null) {
          const startTime = parseFloat(match[1]);
          const text = decodeHtmlEntities(match[3]).trim();
          
          if (text) {
            const formattedTime = formatTime(startTime);
            segments.push(`[${formattedTime}] ${text}`);
          }
        }
        
        // 세그먼트가 없으면 간단한 정규식으로 재시도
        if (segments.length === 0) {
          const simpleTextRegex = /<text[^>]*>(.*?)<\/text>/g;
          while ((match = simpleTextRegex.exec(captionsData)) !== null) {
            const text = decodeHtmlEntities(match[1]).trim();
            if (text) {
              segments.push(text);
            }
          }
        }
        
        transcript = segments.join('\n');
      } 
      // JSON 형식 처리 (객체)
      else if (typeof captionsData === 'object') {
        // events 배열이 있는 경우 (일반적인 형식)
        if (captionsData.events) {
          const segments = captionsData.events
            .filter((event: any) => event.segs && event.segs.length > 0)
            .map((event: any) => {
              const startTime = Math.floor((event.tStartMs || 0) / 1000);
              const formattedTime = formatTime(startTime);
              const text = event.segs.map((seg: any) => seg.utf8).join('').trim();
              return text ? `[${formattedTime}] ${text}` : '';
            })
            .filter((segment: string) => segment);
          
          transcript = segments.join('\n');
        }
      }
      
      if (transcript) {
        console.log('자막 추출 성공, 길이:', transcript.length);
        return transcript;
      } else {
        throw new Error('자막 텍스트를 추출할 수 없습니다.');
      }
    } catch (processingError: any) {
      console.error('자막 데이터 처리 실패:', processingError.message);
      errorMessages.push(`자막 데이터 처리 실패: ${processingError.message}`);
    }
  }

  // 모든 시도 실패
  console.error('모든 자막 추출 방법 실패');
  throw new Error(`자막을 찾을 수 없습니다. ${errorMessages.join(', ')}`);
}

// 시간을 00:00:00 형식으로 변환하는 함수
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// HTML 엔티티 디코딩 함수
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)));
}

// 기본 라우트 (루트 경로)
app.get('/', (req, res) => {
  res.status(200).send('CorpEasy API is running');
});

// YouTube 자막 가져오기 엔드포인트 (GET 메서드)
app.get('/api/youtube-transcript', authMiddleware, async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(200).json({
        success: false,
        message: 'YouTube URL이 필요합니다.',
      });
    }
    
    // YouTube URL 검증
    if (!url.toString().includes('youtube.com/watch') && !url.toString().includes('youtu.be/')) {
      return res.status(200).json({
        success: false,
        message: '유효한 YouTube URL이 아닙니다.',
      });
    }
    
    console.log(`YouTube 자막 가져오기 요청: ${url}`);
    
    // YouTube 비디오 ID 추출
    const videoId = extractYouTubeVideoId(url.toString());
    
    if (!videoId) {
      return res.status(200).json({
        success: false,
        message: 'YouTube 비디오 ID를 추출할 수 없습니다.',
      });
    }
    
    try {
      // 자막 가져오기
      const transcript = await getYouTubeTranscript(videoId);
      
      return res.status(200).json({
        success: true,
        videoId,
        transcript,
      });
    } catch (transcriptError: any) {
      // 자막 가져오기 실패 시 200 응답으로 에러 전달
      console.error(`자막 가져오기 실패 (videoId: ${videoId}):`, transcriptError.message);
      return res.status(200).json({
        success: false,
        videoId,
        message: transcriptError.message,
      });
    }
  } catch (error: any) {
    console.error('YouTube 자막 가져오기 오류:', error);
    
    // 서버 에러일 경우에만 500 응답
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

// 분석 API 엔드포인트 (경로에서 /api 제거)
app.post('/analyze/content', authMiddleware, (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({
        success: false,
        message: '분석할 콘텐츠가 없습니다.',
      });
    }
    
    console.log(`콘텐츠 분석 요청 수신: ${input.substring(0, 50)}...`);
    
    // 임시 분석 응답 (실제로는 AI 서비스 호출 필요)
    const analysisId = `temp-${Date.now()}`;
    
    // 임시 분석 결과
    const analysis = {
      url: input.startsWith('http') ? input : 'https://example.com',
      type: input.startsWith('http') ? 'url' : 'keyword',
      source_title: '임시 분석 결과',
      source_category: '기술/IT',
      h1_h4_summary: '<h1>임시 분석 결과</h1><p>Firebase Functions 설정 중입니다.</p>',
      keywords: ['Firebase', 'Functions', '설정', '배포', '테스트'],
      tags: ['#Firebase', '#Functions', '#배포'],
      summaryOnly: true,
      blogGenerated: false,
      createdAt: admin.firestore.Timestamp.now()
    };
    
    return res.status(200).json({
      success: true,
      analysisId,
      analysis,
    });
  } catch (error: any) {
    console.error('콘텐츠 분석 오류:', error);
    
    return res.status(500).json({
      success: false,
      message: `콘텐츠 분석 중 오류가 발생했습니다: ${error.message}`,
    });
  }
});

// YouTube 분석 엔드포인트
app.post('/analyze/youtube', authMiddleware, (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'YouTube URL이 필요합니다.',
      });
    }
    
    // YouTube URL 검증
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return res.status(400).json({
        success: false,
        message: '유효한 YouTube URL이 아닙니다.',
      });
    }
    
    console.log(`YouTube 콘텐츠 분석 요청: ${url}`);
    
    // 임시 분석 응답
    const analysisId = `youtube-${Date.now()}`;
    
    // 임시 분석 결과
    const analysis = {
      url,
      type: 'youtube',
      source_title: 'YouTube 분석 결과',
      source_category: '엔터테인먼트',
      h1_h4_summary: '<h1>YouTube 분석 결과</h1><p>Firebase Functions 설정 중입니다.</p>',
      keywords: ['YouTube', 'Firebase', 'Functions', '테스트'],
      tags: ['#YouTube', '#Firebase', '#테스트'],
      summaryOnly: true,
      blogGenerated: false,
      createdAt: admin.firestore.Timestamp.now()
    };
    
    return res.status(200).json({
      success: true,
      analysisId,
      analysis,
    });
  } catch (error: any) {
    console.error('YouTube 분석 오류:', error);
    
    return res.status(500).json({
      success: false,
      message: `YouTube 분석 중 오류가 발생했습니다: ${error.message}`,
    });
  }
});

// 콘텐츠 분석 결과 조회 엔드포인트 (경로에서 /api 제거)
app.get('/analyze/content/:analysisId', authMiddleware, (req, res) => {
  try {
    const { analysisId } = req.params;
    
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: '분석 ID가 필요합니다.',
      });
    }
    
    // 임시 분석 결과
    const analysis = {
      url: 'https://example.com',
      type: 'url',
      source_title: '임시 분석 결과',
      source_category: '기술/IT',
      h1_h4_summary: '<h1>임시 분석 결과</h1><p>Firebase Functions 설정 중입니다.</p>',
      keywords: ['Firebase', 'Functions', '설정', '배포', '테스트'],
      tags: ['#Firebase', '#Functions', '#배포'],
      summaryOnly: true,
      blogGenerated: false,
      createdAt: admin.firestore.Timestamp.now()
    };
    
    return res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error(`분석 결과 조회 오류 (analysisId: ${req.params.analysisId}):`, error);
    
    return res.status(500).json({
      success: false,
      message: `분석 결과 조회 중 오류가 발생했습니다: ${error.message}`,
    });
  }
});

// 상세 분석 엔드포인트 (경로에서 /api 제거)
app.get('/analyze/detail/:analysisId', authMiddleware, (req, res) => {
  try {
    const { analysisId } = req.params;
    
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: '분석 ID가 필요합니다.',
      });
    }
    
    // 임시 상세 분석 결과
    const detailedAnalysis = {
      relatedBlogs: [
        { id: 'blog1', title: '관련 블로그 1' },
        { id: 'blog2', title: '관련 블로그 2' }
      ],
      trendInsights: [
        { id: 'trend1', title: '업계 트렌드 1', summary: '트렌드 요약 1' },
        { id: 'trend2', title: '업계 트렌드 2', summary: '트렌드 요약 2' }
      ],
      seoTitles: [
        '최적화된 SEO 제목 1',
        '최적화된 SEO 제목 2',
        '최적화된 SEO 제목 3',
        '최적화된 SEO 제목 4',
        '최적화된 SEO 제목 5'
      ]
    };
    
    return res.status(200).json({
      success: true,
      detailedAnalysis,
    });
  } catch (error: any) {
    console.error(`상세 분석 오류 (analysisId: ${req.params.analysisId}):`, error);
    
    return res.status(500).json({
      success: false,
      message: `상세 분석 중 오류가 발생했습니다: ${error.message}`,
    });
  }
});

// 에러 핸들러
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? '서버 오류가 발생했습니다.' : err.message
  });
});

// Firebase Functions로 API 내보내기
export const api = functions.https.onRequest(app);

// Coji 함수 (기존 함수 유지)
export const askCoji = functions.https.onRequest((req, res) => {
  // 간단한 응답
  res.json({
    success: true,
    response: "Coji 설정 중입니다. 곧 서비스가 정상화될 예정입니다."
  });
});

// 대화 기록 함수
export const getConversationHistory = functions.https.onRequest((req, res) => {
  // 간단한 응답
  res.json({
    success: true,
    history: []
  });
});