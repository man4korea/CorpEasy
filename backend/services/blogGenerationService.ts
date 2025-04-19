// 📁 backend/services/blogGenerationService.ts
// Create at 2504191115

import { logger } from '../utils/logger';
import { Anthropic } from '@anthropic-ai/sdk';
import firestoreModel, { BlogArticle, ContentAnalysis } from '../models/firestoreModel';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);

/**
 * 블로그 생성 서비스
 * - SEO 최적화 블로그 콘텐츠 생성
 * - 블로그 저장 및 조회
 * - 블로그 상태 관리
 */
export class BlogGenerationService {
  private anthropic: Anthropic;
  private promptsCache: Record<string, string> = {};

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
   * 프롬프트 파일 로드
   * @param filename 프롬프트 파일명
   * @returns 프롬프트 내용
   */
  private async loadPromptFile(filename: string): Promise<string> {
    try {
      // 캐시에 있으면 캐시에서 반환
      if (this.promptsCache[filename]) {
        return this.promptsCache[filename];
      }
      
      // 파일 경로 구성
      const filePath = path.join(process.cwd(), 'docs', filename);
      
      // 파일 읽기
      const fileContent = await readFileAsync(filePath, 'utf8');
      
      // 캐시에 저장
      this.promptsCache[filename] = fileContent;
      
      return fileContent;
    } catch (error) {
      logger.error(`프롬프트 파일 로드 오류 (${filename}):`, error);
      throw new Error(`프롬프트 파일을 로드할 수 없습니다: ${(error as Error).message}`);
    }
  }

  /**
   * 블로그 콘텐츠 생성
   * @param analysisId 콘텐츠 분석 ID
   * @param title 블로그 제목
   * @returns 블로그 아티클 ID
   */
  async generateBlogContent(analysisId: string, title: string): Promise<string> {
    try {
      // 1. 콘텐츠 분석 결과 조회
      const analysis = await firestoreModel.getContentAnalysisById(analysisId);
      
      if (!analysis) {
        throw new Error('분석 결과를 찾을 수 없습니다.');
      }
      
      // 2. 프롬프트 파일 로드
      const [
        stepPrompt,
        outputFormat,
        styleGuide,
        htmlStyleRef,
        naturalWritingInst
      ] = await Promise.all([
        this.loadPromptFile('Blog_5_Step_Prompt.txt'),
        this.loadPromptFile('blog_output_format.txt'),
        this.loadPromptFile('blog_style_guide.txt'),
        this.loadPromptFile('html_style_reference.txt'),
        this.loadPromptFile('natural_human_blog_writing_instruction.txt')
      ]);
      
      // 3. 블로그 콘텐츠 생성 프롬프트 구성
      const prompt = `
${stepPrompt}

${styleGuide}

${htmlStyleRef}

${naturalWritingInst}

${outputFormat}

<blog_topic>${title}</blog_topic>

<content_summary>
${analysis.h1_h4_summary}
</content_summary>

<keywords>
${analysis.keywords.join(', ')}
</keywords>

<tags>
${analysis.tags.join(', ')}
</tags>

한국어로 블로그 콘텐츠를 생성해주세요. 출력은 반드시 HTML 형식이어야 합니다.
`;

      // 4. Claude API 호출
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.7,
        system: '당신은 전문 블로그 작가입니다. 사용자가 제공한 주제와 키워드를 바탕으로 자연스럽고 SEO에 최적화된 블로그 콘텐츠를 HTML 형식으로 작성합니다.',
        messages: [
          { role: 'user', content: prompt }
        ],
      });
      
      // 5. 응답 파싱
      const content = response.content[0].text;
      
      // HTML 콘텐츠 추출
      const htmlMatch = content.match(/<html>([\s\S]*)<\/html>/);
      let htmlContent = '';
      
      if (htmlMatch && htmlMatch[1]) {
        htmlContent = htmlMatch[1].trim();
      } else {
        // HTML 태그가 없는 경우 전체 내용을 <article> 태그로 감싸기
        htmlContent = `<article>${content}</article>`;
      }
      
      // 6. 블로그 아티클 저장
      const blogData: Omit<BlogArticle, 'createdAt'> = {
        ref_analysis_id: analysisId,
        title,
        html_content: htmlContent,
        status: 'draft',
        isVisible: true,
      };
      
      const blogId = await firestoreModel.saveBlogArticle(blogData);
      
      // 7. 콘텐츠 분석 결과 업데이트 (블로그 생성 플래그)
      await firestoreModel.updateContentAnalysis(analysisId, {
        blogGenerated: true,
      });
      
      logger.info(`블로그 콘텐츠 생성 완료: ${blogId}`);
      
      return blogId;
    } catch (error) {
      logger.error(`블로그 콘텐츠 생성 오류 (analysisId: ${analysisId}, title: ${title}):`, error);
      throw error;
    }
  }

  /**
   * 블로그 아티클 게시
   * @param blogId 블로그 아티클 ID
   * @returns 성공 여부
   */
  async publishBlogArticle(blogId: string): Promise<boolean> {
    try {
      await firestoreModel.blogArticlesCollection.doc(blogId).update({
        status: 'published',
      });
      
      logger.info(`블로그 아티클 게시 완료: ${blogId}`);
      return true;
    } catch (error) {
      logger.error(`블로그 아티클 게시 오류 (blogId: ${blogId}):`, error);
      return false;
    }
  }

  /**
   * 블로그 아티클 숨기기
   * @param blogId 블로그 아티클 ID
   * @returns 성공 여부
   */
  async hideBlogArticle(blogId: string): Promise<boolean> {
    try {
      await firestoreModel.blogArticlesCollection.doc(blogId).update({
        isVisible: false,
      });
      
      logger.info(`블로그 아티클 숨기기 완료: ${blogId}`);
      return true;
    } catch (error) {
      logger.error(`블로그 아티클 숨기기 오류 (blogId: ${blogId}):`, error);
      return false;
    }
  }

  /**
   * 블로그 아티클 상세 조회
   * @param blogId 블로그 아티클 ID
   * @returns 블로그 아티클 데이터
   */
  async getBlogArticleDetail(blogId: string): Promise<{
    blog: BlogArticle;
    analysis: ContentAnalysis | null;
  } | null> {
    try {
      const blogDoc = await firestoreModel.blogArticlesCollection.doc(blogId).get();
      
      if (!blogDoc.exists) {
        return null;
      }
      
      const blog = blogDoc.data() as BlogArticle;
      
      // 연관된 분석 결과 조회
      let analysis: ContentAnalysis | null = null;
      if (blog.ref_analysis_id) {
        analysis = await firestoreModel.getContentAnalysisById(blog.ref_analysis_id);
      }
      
      return { blog, analysis };
    } catch (error) {
      logger.error(`블로그 아티클 상세 조회 오류 (blogId: ${blogId}):`, error);
      throw error;
    }
  }
  
  /**
   * 트렌드 인사이트 생성
   * @param keywords 관련 키워드 목록
   * @param title 인사이트 제목
   * @param summary 인사이트 요약
   * @returns 트렌드 인사이트 ID
   */
  async createTrendInsight(
    keywords: string[],
    title: string,
    summary: string
  ): Promise<string> {
    try {
      const insightData = {
        related_keywords: keywords,
        insight_title: title,
        summary,
        linkedBlogIds: [],
      };
      
      const insightId = await firestoreModel.saveTrendInsight(insightData);
      logger.info(`트렌드 인사이트 생성 완료: ${insightId}`);
      
      return insightId;
    } catch (error) {
      logger.error('트렌드 인사이트 생성 오류:', error);
      throw error;
    }
  }
  
  /**
   * 트렌드 인사이트에 블로그 연결
   * @param insightId 트렌드 인사이트 ID
   * @param blogId 블로그 아티클 ID
   * @returns 성공 여부
   */
  async linkBlogToInsight(insightId: string, blogId: string): Promise<boolean> {
    try {
      const insightDoc = await firestoreModel.trendInsightsCollection.doc(insightId).get();
      
      if (!insightDoc.exists) {
        return false;
      }
      
      const insight = insightDoc.data() as any;
      const linkedBlogIds = insight.linkedBlogIds || [];
      
      // 중복 방지
      if (!linkedBlogIds.includes(blogId)) {
        linkedBlogIds.push(blogId);
      }
      
      await firestoreModel.trendInsightsCollection.doc(insightId).update({
        linkedBlogIds,
      });
      
      logger.info(`트렌드 인사이트에 블로그 연결 완료: ${insightId} -> ${blogId}`);
      return true;
    } catch (error) {
      logger.error(`트렌드 인사이트에 블로그 연결 오류 (insightId: ${insightId}, blogId: ${blogId}):`, error);
      return false;
    }
  }
}