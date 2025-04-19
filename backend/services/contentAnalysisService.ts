// 📁 backend/services/contentAnalysisService.ts
// Create at 2504191110

import { logger } from '../utils/logger';
import { Anthropic } from '@anthropic-ai/sdk';
import { YoutubeContentService } from './youtubeContentService';
import firestoreModel, { ContentAnalysis } from '../models/firestoreModel';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * 콘텐츠 분석 서비스
 * - 콘텐츠 유형 판별
 * - 콘텐츠 분석 수행
 * - 결과 저장 및 조회
 * - 영어 자막 번역 지원
 */
export class ContentAnalysisService {
  private anthropic: Anthropic;

  constructor() {
    // Claude API 클라이언트 초기화
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    if (!process.env.ANTHROPIC_API_KEY) {
      logger.warn('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
    }
  }

  /**
   * 입력 콘텐츠 유형 판별
   * @param input 사용자 입력 (URL, 키워드, 파일 내용 등)
   * @returns 콘텐츠 유형 ('youtube', 'url', 'keyword', 'file')
   */
  determineContentType(input: string): 'youtube' | 'url' | 'keyword' | 'file' {
    // 유튜브 URL 패턴 확인
    if (YoutubeContentService.isValidYoutubeUrl(input)) {
      return 'youtube';
    }
    
    // 일반 URL 패턴 확인
    try {
      const url = new URL(input);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return 'url';
      }
    } catch (error) {
      // URL이 아님
    }
    
    // 파일 내용인지 확인 (보통 여러 줄이고 길이가 긴 경우)
    if (input.includes('\n') && input.length > 500) {
      return 'file';
    }
    
    // 그 외에는 키워드로 간주
    return 'keyword';
  }

/**
   * 텍스트 언어 감지
   * @param text 감지할 텍스트
   * @returns 감지된 언어 코드 ('ko', 'en' 등)
   */
private detectLanguage(text: string): string {
    // 간단한 언어 감지 로직 (한글 vs 영어)
    // 한글 문자 비율이 10% 이상이면 한국어로 간주
    const koreanChars = text.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g);
    const koreanRatio = koreanChars ? koreanChars.length / text.length : 0;
    
    if (koreanRatio > 0.1) {
      return 'ko';
    }
    
    // 영어 문자 비율이 50% 이상이면 영어로 간주
    const englishChars = text.match(/[a-zA-Z]/g);
    const englishRatio = englishChars ? englishChars.length / text.length : 0;
    
    if (englishRatio > 0.5) {
      return 'en';
    }
    
    // 기본값은 한국어
    return 'ko';
  }

/**
   * 영어 텍스트를 한글로 번역
   * @param text 번역할 영어 텍스트
   * @returns 번역된 한글 텍스트
   */
private async translateToKorean(text: string): Promise<string> {
    try {
      // Claude를 사용하여 번역 (API 기반 번역 서비스 대체 가능)
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        temperature: 0.2,
        system: '당신은 영어를 한국어로 번역하는 전문가입니다. 원문의 의미를 정확하게 전달하면서 자연스러운 한국어로 번역해주세요.',
        messages: [
          { role: 'user', content: `다음 영어 텍스트를 한국어로 번역해주세요. 번역만 제공하고 다른 설명은 하지 마세요:\n\n${text}` }
        ],
      });
      
      return response.content[0].text;
    } catch (error) {
      logger.error('번역 오류:', error);
      throw new Error(`번역 중 오류가 발생했습니다: ${(error as Error).message}`);
    }
  }
/**
   * 영어 텍스트를 한글로 번역
   * @param text 번역할 영어 텍스트
   * @returns 번역된 한글 텍스트
   */
  private async translateToKorean(text: string): Promise<string> {
    try {
      // Claude를 사용하여 번역 (API 기반 번역 서비스 대체 가능)
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        temperature: 0.2,
        system: '당신은 영어를 한국어로 번역하는 전문가입니다. 원문의 의미를 정확하게 전달하면서 자연스러운 한국어로 번역해주세요.',
        messages: [
          { role: 'user', content: `다음 영어 텍스트를 한국어로 번역해주세요. 번역만 제공하고 다른 설명은 하지 마세요:\n\n${text}` }
        ],
      });
      
      return response.content[0].text;
    } catch (error) {
      logger.error('번역 오류:', error);
      throw new Error(`번역 중 오류가 발생했습니다: ${(error as Error).message}`);
    }
  }


  /**
   * 유튜브 콘텐츠 분석
   * @param url 유튜브 URL
   * @returns 분석 결과 ID
   */
  async analyzeYoutubeContent(url: string): Promise<string> {
    try {
      // 1. 기존 분석 결과 확인
      const existingAnalysis = await firestoreModel.getContentAnalysisByUrl(url);
      if (existingAnalysis) {
        logger.info(`기존 유튜브 콘텐츠 분석 결과 사용: ${existingAnalysis.id}`);
        return existingAnalysis.id;
      }
      
      // 2. 유튜브 데이터 가져오기
      const { videoId, videoInfo, transcript } = await YoutubeContentService.getYoutubeContentData(url);
      
      if (!transcript || transcript.trim().length === 0) {
        throw new Error('유튜브 자막을 추출할 수 없습니다.');
      }
      
      // 3. 영상 정보 추출
      const title = videoInfo.snippet?.title || '제목 없음';
      const description = videoInfo.snippet?.description || '';
     
      // 4. 언어 감지 및 필요 시 번역
      const detectedLanguage = this.detectLanguage(transcript);
      let processedTranscript = transcript;
      let translatedTitle = title;
      let translatedDescription = description;
      let wasTranslated = false;
      
      if (detectedLanguage === 'en') {
        // 영어 자막인 경우 한국어로 번역
        logger.info(`영어 자막 감지: ${videoId} - 번역 시작`);
        processedTranscript = await this.translateToKorean(transcript);
        
        // 제목과 설명도 영어인 경우 번역
        if (this.detectLanguage(title) === 'en') {
          translatedTitle = await this.translateToKorean(title);
        }
        
        if (description && this.detectLanguage(description) === 'en') {
          translatedDescription = await this.translateToKorean(description);
        }
        
        wasTranslated = true;
        logger.info(`영어 자막 번역 완료: ${videoId}`);
      }
      

      // 5. Claude를 사용하여 콘텐츠 분석
      const analysisResult = await this.generateContentSummary(
        processedTranscript,
        translatedTitle,
        translatedDescription
      );
      
      // 6. 분석 결과 저장
      const analysisData: Omit<ContentAnalysis, 'createdAt'> = {
        url,
        type: 'youtube',
        source_title: title,
        source_category: analysisResult.category,
        h1_h4_summary: analysisResult.summary,
        keywords: analysisResult.keywords,
        tags: analysisResult.tags,
        summaryOnly: true,
        blogGenerated: false,
        wasTranslated: wasTranslated, // 번역 여부 저장
        originalLanguage: detectedLanguage, // 원본 언어 저장
      };
      
      const analysisId = await firestoreModel.saveContentAnalysis(analysisData);
      logger.info(`유튜브 콘텐츠 분석 결과 저장 완료: ${analysisId}`);
      
      return analysisId;
    } catch (error) {
      logger.error('유튜브 콘텐츠 분석 오류:', error);
      throw error;
    }
  }

  /**
   * 일반 URL 콘텐츠 분석
   * @param url 웹 URL
   * @returns 분석 결과 ID
   */
  async analyzeWebContent(url: string): Promise<string> {
    try {
      // 1. 기존 분석 결과 확인
      const existingAnalysis = await firestoreModel.getContentAnalysisByUrl(url);
      if (existingAnalysis) {
        logger.info(`기존 웹 콘텐츠 분석 결과 사용: ${existingAnalysis.id}`);
        return existingAnalysis.id;
      }
      
      // 2. 웹 콘텐츠 가져오기
      const response = await axios.get(url);
      const html = response.data;
      
      // 3. HTML 파싱
      const $ = cheerio.load(html);
      
      // 4. 웹 페이지 정보 추출
      const title = $('title').text() || $('h1').first().text() || '제목 없음';
      
      // 메타 설명 추출
      let description = $('meta[name="description"]').attr('content') || '';
      
      // 본문 텍스트 추출 (p 태그 내용)
      const bodyText = $('p').map((_, el) => $(el).text()).get().join('\n');
      
      // 5. Claude를 사용하여 콘텐츠 분석
      const analysisResult = await this.generateContentSummary(bodyText, title, description);
      
      // 6. 분석 결과 저장
      const analysisData: Omit<ContentAnalysis, 'createdAt'> = {
        url,
        type: 'url',
        source_title: title,
        source_category: analysisResult.category,
        h1_h4_summary: analysisResult.summary,
        keywords: analysisResult.keywords,
        tags: analysisResult.tags,
        summaryOnly: true,
        blogGenerated: false,
      };
      
      const analysisId = await firestoreModel.saveContentAnalysis(analysisData);
      logger.info(`웹 콘텐츠 분석 결과 저장 완료: ${analysisId}`);
      
      return analysisId;
    } catch (error) {
      logger.error('웹 콘텐츠 분석 오류:', error);
      throw error;
    }
  }

  /**
   * 키워드 기반 콘텐츠 분석
   * @param keyword 키워드 또는 질문
   * @returns 분석 결과 ID
   */
  async analyzeKeyword(keyword: string): Promise<string> {
    try {
      // 1. 기존 분석 결과 확인 (키워드는 URL 대신 키워드 자체를 사용)
      const existingAnalysis = await firestoreModel.getContentAnalysisByUrl(keyword);
      if (existingAnalysis) {
        logger.info(`기존 키워드 분석 결과 사용: ${existingAnalysis.id}`);
        return existingAnalysis.id;
      }
      
      // 2. Claude를 사용하여 키워드 분석
      const analysisResult = await this.generateKeywordAnalysis(keyword);
      
      // 3. 분석 결과 저장
      const analysisData: Omit<ContentAnalysis, 'createdAt'> = {
        url: keyword, // 키워드 자체를 URL로 저장
        type: 'keyword',
        source_title: keyword,
        source_category: analysisResult.category,
        h1_h4_summary: analysisResult.summary,
        keywords: analysisResult.keywords,
        tags: analysisResult.tags,
        summaryOnly: true,
        blogGenerated: false,
      };
      
      const analysisId = await firestoreModel.saveContentAnalysis(analysisData);
      logger.info(`키워드 분석 결과 저장 완료: ${analysisId}`);
      
      return analysisId;
    } catch (error) {
      logger.error('키워드 분석 오류:', error);
      throw error;
    }
  }

  /**
   * 파일 내용 분석
   * @param content 파일 내용
   * @param filename 파일 이름
   * @returns 분석 결과 ID
   */
  async analyzeFileContent(content: string, filename: string): Promise<string> {
    try {
      // 1. 분석 ID 생성 (파일은 매번 새로 분석)
      
      // 2. Claude를 사용하여 파일 내용 분석
      const analysisResult = await this.generateContentSummary(content, filename, '');
      
      // 3. 분석 결과 저장
      const analysisData: Omit<ContentAnalysis, 'createdAt'> = {
        url: filename, // 파일명을 URL로 사용
        type: 'file',
        source_title: filename,
        source_category: analysisResult.category,
        h1_h4_summary: analysisResult.summary,
        keywords: analysisResult.keywords,
        tags: analysisResult.tags,
        summaryOnly: true,
        blogGenerated: false,
      };
      
      const analysisId = await firestoreModel.saveContentAnalysis(analysisData);
      logger.info(`파일 내용 분석 결과 저장 완료: ${analysisId}`);
      
      return analysisId;
    } catch (error) {
      logger.error('파일 내용 분석 오류:', error);
      throw error;
    }
  }

  /**
   * 입력에 따른 콘텐츠 분석 수행
   * @param input 사용자 입력 (URL, 키워드, 파일 내용 등)
   * @param filename 파일 이름 (파일 분석 시)
   * @returns 분석 결과 ID
   */
  async analyzeContent(input: string, filename?: string): Promise<string> {
    // 콘텐츠 유형 판별
    const contentType = this.determineContentType(input);
    
    // 유형별 분석 수행
    switch (contentType) {
      case 'youtube':
        return this.analyzeYoutubeContent(input);
      case 'url':
        return this.analyzeWebContent(input);
      case 'keyword':
        return this.analyzeKeyword(input);
      case 'file':
        return this.analyzeFileContent(input, filename || '파일');
      default:
        throw new Error('지원하지 않는 콘텐츠 유형입니다.');
    }
  }

  /**
   * Claude를 사용하여 콘텐츠 요약 생성
   * @param content 분석할 콘텐츠
   * @param title 콘텐츠 제목
   * @param description 콘텐츠 설명
   * @returns 분석 결과 (카테고리, 요약, 키워드, 태그)
   */
  private async generateContentSummary(
    content: string,
    title: string,
    description: string
  ): Promise<{
    category: string;
    summary: string;
    keywords: string[];
    tags: string[];
  }> {
    try {
      // 1. 프롬프트 구성
      const prompt = `
<content>
제목: ${title}
설명: ${description}
내용: ${content.substring(0, 20000)} ${content.length > 20000 ? '...(생략됨)' : ''}
</content>

당신은 콘텐츠 분석 전문가입니다. 위의 콘텐츠를 분석하여 다음 정보를 제공해주세요:

1. 카테고리: 콘텐츠의 주제에 가장 적합한 카테고리 하나를 다음 중에서 선택하세요.
   - 기술/IT
   - 비즈니스/경영
   - 마케팅
   - 교육/학습
   - 라이프스타일
   - 건강/의학
   - 엔터테인먼트
   - 과학
   - 예술/문화
   - 여행
   - 스포츠
   - 기타

2. 콘텐츠 요약: 콘텐츠를 H1~H4 제목과 글머리 기호를 사용하여 구조화된 HTML 형식으로 요약해주세요. 
   시니어 사용자도 읽기 쉽도록 간결하고 명확하게 작성해주세요.
   요약은 최소 300단어에서 최대 1000단어로 작성해주세요.

3. 핵심 키워드: 콘텐츠에서 가장 중요한 키워드 10개를 추출해주세요.

4. 추천 태그: 콘텐츠와 관련된 해시태그 5개를 추천해주세요.

JSON 형식으로 응답해주세요:
{
  "category": "선택한 카테고리",
  "summary": "HTML 형식의 구조화된 요약",
  "keywords": ["키워드1", "키워드2", ...],
  "tags": ["#태그1", "#태그2", ...]
}
`;

      // 2. Claude API 호출
      const response = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        temperature: 0.3,
        system: '사용자가 제공한 콘텐츠를 분석하여 구조화된 요약과 메타데이터를 생성합니다. 항상 JSON 형식으로 응답합니다.',
        messages: [
          { role: 'user', content: prompt }
        ],
      });
      
      // 3. 응답 파싱
      const content = response.content[0].text;
      
      // JSON 파싱 시도
      try {
        // JSON 추출 (텍스트 내에서 JSON 찾기)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('응답에서 JSON을 찾을 수 없습니다.');
        }
        
        const jsonString = jsonMatch[0];
        const result = JSON.parse(jsonString);
        
        // 필수 필드 확인
        if (!result.category || !result.summary || !result.keywords || !result.tags) {
          throw new Error('응답에 필수 필드가 누락되었습니다.');
        }
        
        return {
          category: result.category,
          summary: result.summary,
          keywords: result.keywords,
          tags: result.tags,
        };
      } catch (parseError) {
        logger.error('Claude 응답 파싱 오류:', parseError);
        
        // 기본값 반환
        return {
          category: '기타',
          summary: `<h1>${title}</h1><p>${content.substring(0, 500)}...</p>`,
          keywords: [title.split(' ')[0]],
          tags: [`#${title.split(' ')[0]}`],
        };
      }
    } catch (error) {
      logger.error('콘텐츠 요약 생성 오류:', error);
      throw error;
    }
  }

  /**
   * Claude를 사용하여 키워드 분석
   * @param keyword 분석할 키워드 또는 질문
   * @returns 분석 결과 (카테고리, 요약, 키워드, 태그)
   */
  private async generateKeywordAnalysis(
    keyword: string
  ): Promise<{
    category: string;
    summary: string;
    keywords: string[];
    tags: string[];
  }> {
    try {
      // 1. 프롬프트 구성
      const prompt = `
<keyword>${keyword}</keyword>

당신은 키워드 분석 전문가입니다. 위의 키워드 또는 질문을 분석하여 다음 정보를 제공해주세요:

1. 카테고리: 키워드에 가장 적합한 카테고리 하나를 다음 중에서 선택하세요.
   - 기술/IT
   - 비즈니스/경영
   - 마케팅
   - 교육/학습
   - 라이프스타일
   - 건강/의학
   - 엔터테인먼트
   - 과학
   - 예술/문화
   - 여행
   - 스포츠
   - 기타

2. 키워드 분석: 키워드나 질문에 대한 깊이 있는 분석을 H1~H4 제목과 글머리 기호를 사용하여 구조화된 HTML 형식으로 작성해주세요.
   시니어 사용자도 읽기 쉽도록 간결하고 명확하게 작성해주세요.
   분석은 최소 300단어에서 최대 800단어로 작성해주세요.

3. 관련 키워드: 이 키워드와 관련된 다른 키워드 10개를 추천해주세요.

4. 추천 태그: 키워드와 관련된 해시태그 5개를 추천해주세요.

JSON 형식으로 응답해주세요:
{
  "category": "선택한 카테고리",
  "summary": "HTML 형식의 구조화된 분석",
  "keywords": ["키워드1", "키워드2", ...],
  "tags": ["#태그1", "#태그2", ...]
}
`;

      // 2. Claude API 호출
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.7,
        system: '사용자가 제공한 키워드를 분석하여 키워드에 대한 통찰력 있는 분석과 메타데이터를 생성합니다.',
        messages: [
          { role: 'user', content: prompt }
        ],
      });
      
      // 3. 응답 파싱
      const content = response.content[0].text;
      
      // JSON 파싱 시도
      try {
        // JSON 추출 (텍스트 내에서 JSON 찾기)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('응답에서 JSON을 찾을 수 없습니다.');
        }
        
        const jsonString = jsonMatch[0];
        const result = JSON.parse(jsonString);
        
        // 필수 필드 확인
        if (!result.category || !result.summary || !result.keywords || !result.tags) {
          throw new Error('응답에 필수 필드가 누락되었습니다.');
        }
        
        return {
          category: result.category,
          summary: result.summary,
          keywords: result.keywords,
          tags: result.tags,
        };
      } catch (parseError) {
        logger.error('Claude 응답 파싱 오류:', parseError);
        
        // 기본값 반환
        return {
          category: '기타',
          summary: `<h1>${keyword}</h1><p>이 키워드에 대한 정보가 준비 중입니다.</p>`,
          keywords: [keyword],
          tags: [`#${keyword.replace(/\s+/g, '')}`],
        };
      }
    } catch (error) {
      logger.error('키워드 분석 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 상세 분석 수행
   * @param analysisId 기본 분석 결과 ID
   * @returns 상세 분석 결과
   */
  async performDetailedAnalysis(analysisId: string): Promise<{
    relatedBlogs: Array<{ id: string; title: string; }>;
    trendInsights: Array<{ id: string; title: string; summary: string; }>;
    seoTitles: string[];
  }> {
    try {
      // 1. 기본 분석 결과 조회
      const analysis = await firestoreModel.getContentAnalysisById(analysisId);
      
      if (!analysis) {
        throw new Error('분석 결과를 찾을 수 없습니다.');
      }
      
      // 2. 키워드 기반 관련 트렌드 조회
      const trendInsights = await firestoreModel.getTrendInsightsByKeywords(analysis.keywords);
      
      // 3. 키워드 기반 관련 블로그 조회 (유사한 content_analysis의 ID 목록 필요)
      // 간단한 구현: 동일한 카테고리의 다른 콘텐츠 조회
      const relatedAnalyses = await firestoreModel.getContentAnalysisByCategory(analysis.source_category, 5);
      
      const relatedAnalysisIds = relatedAnalyses.items
        .filter(item => item.id !== analysisId) // 현재 분석 제외
        .map(item => item.id);
      
      const relatedBlogArticles = await firestoreModel.getBlogArticlesByKeywords(relatedAnalysisIds);
      
      // 4. SEO 제목 추천 (Claude 사용)
      const seoTitles = await this.generateSeoTitles(analysis.source_title, analysis.keywords);
      
      // 5. 상세 분석 플래그 업데이트
      await firestoreModel.updateContentAnalysis(analysisId, {
        summaryOnly: false,
      });
      
      // 6. 결과 반환
      return {
        relatedBlogs: relatedBlogArticles.map(blog => ({
          id: blog.id,
          title: blog.data.title,
        })),
        trendInsights: trendInsights.map(trend => ({
          id: trend.id,
          title: trend.data.insight_title,
          summary: trend.data.summary,
        })),
        seoTitles,
      };
    } catch (error) {
      logger.error(`상세 분석 수행 오류 (analysisId: ${analysisId}):`, error);
      throw error;
    }
  }

  /**
   * SEO 최적화 제목 생성
   * @param originalTitle 원본 제목
   * @param keywords 키워드 목록
   * @returns SEO 최적화 제목 목록
   */
  private async generateSeoTitles(originalTitle: string, keywords: string[]): Promise<string[]> {
    try {
      // 1. 프롬프트 구성
      const prompt = `
<title>${originalTitle}</title>
<keywords>${keywords.join(', ')}</keywords>

당신은 SEO 전문가입니다. 위의 제목과 키워드를 바탕으로 검색 엔진 최적화(SEO)에 효과적인 블로그 제목 5개를 제안해주세요.

제목 작성 가이드라인:
1. 60자 이내로 작성해주세요.
2. 핵심 키워드를 앞쪽에 배치해주세요.
3. 숫자, 질문, 감정적 단어를 적절히 사용해주세요.
4. 클릭을 유도하는 매력적인 제목이어야 합니다.
5. 달라붙는 수식어를 피하고 핵심 정보를 명확하게 전달해주세요.

JSON 형식으로 응답해주세요:
{
  "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"]
}
`;

      // 2. Claude API 호출
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.8,
        system: 'SEO 전문가로서 사용자에게 검색 엔진 최적화된 블로그 제목을 제안합니다.',
        messages: [
          { role: 'user', content: prompt }
        ],
      });
      
      // 3. 응답 파싱
      const content = response.content[0].text;
      
      // JSON 파싱 시도
      try {
        // JSON 추출 (텍스트 내에서 JSON 찾기)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('응답에서 JSON을 찾을 수 없습니다.');
        }
        
        const jsonString = jsonMatch[0];
        const result = JSON.parse(jsonString);
        
        // 필수 필드 확인
        if (!result.titles || !Array.isArray(result.titles)) {
          throw new Error('응답에 제목 목록이 누락되었습니다.');
        }
        
        return result.titles;
      } catch (parseError) {
        logger.error('Claude 응답 파싱 오류:', parseError);
        
        // 기본값 반환
        return [
          `${originalTitle} - 완벽 가이드`,
          `${originalTitle}에 대한 5가지 핵심 포인트`,
          `${originalTitle} 초보자도 쉽게 이해하는 방법`,
          `${originalTitle} 전문가의 노하우`,
          `${originalTitle}의 모든 것`
        ];
      }
    } catch (error) {
      logger.error('SEO 제목 생성 오류:', error);
      // 기본값 반환
      return [
        `${originalTitle} - 완벽 가이드`,
        `${originalTitle}에 대한 5가지 핵심 포인트`,
        `${originalTitle} 초보자도 쉽게 이해하는 방법`,
        `${originalTitle} 전문가의 노하우`,
        `${originalTitle}의 모든 것`
      ];
    }
  }
}