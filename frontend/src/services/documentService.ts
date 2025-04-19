// 📁 frontend/src/services/documentService.ts
// Create at 2504191245

import { CojiKnowledgeBase } from '../data/cojiKnowledgeBase';
import axios from 'axios';

/**
 * 문서 서비스
 * - docs/ 폴더의 MD 문서를 로드하고 파싱하는 기능
 * - 문서 내용 검색 및 관련 정보 추출 기능
 */
class DocumentService {
  private docsBaseUrl: string = '/docs/';
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * 모든 문서 초기화 - 앱 시작 시 호출
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this.loadAllDocs();
    return this.initPromise;
  }
  
  /**
   * 모든 문서 로드
   */
  private async loadAllDocs(): Promise<void> {
    try {
      const docPaths = Object.values(CojiKnowledgeBase.docsMeta).map(meta => meta.path);
      const uniquePaths = [...new Set(docPaths)];
      
      await Promise.all(
        uniquePaths.map(async path => {
          try {
            const content = await this.loadDocument(path);
            CojiKnowledgeBase.docsCache[path] = content;
          } catch (error) {
            console.error(`문서 로드 오류 (${path}):`, error);
          }
        })
      );
      
      this.initialized = true;
      console.log('모든 문서가 로드되었습니다.');
    } catch (error) {
      console.error('문서 초기화 오류:', error);
      throw error;
    }
  }
  
  /**
   * 단일 문서 로드
   * @param path 문서 경로
   */
  async loadDocument(path: string): Promise<string> {
    try {
      // 이미 캐시에 있으면 반환
      if (CojiKnowledgeBase.docsCache[path]) {
        return CojiKnowledgeBase.docsCache[path];
      }
      
      // 문서 로드
      const response = await axios.get(`${this.docsBaseUrl}${path}`);
      const content = response.data;
      
      // 캐시에 저장
      CojiKnowledgeBase.docsCache[path] = content;
      
      return content;
    } catch (error) {
      console.error(`문서 로드 오류 (${path}):`, error);
      throw error;
    }
  }
  
  /**
   * 질의에 관련된 문서 내용 검색
   * @param query 사용자 질의
   */
  async searchRelevantContent(query: string): Promise<string> {
    try {
      await this.initialize();
      
      // 관련 문서 경로 찾기
      const relevantDocPaths = CojiKnowledgeBase.findRelevantDocs(query);
      
      if (relevantDocPaths.length === 0) {
        return '';
      }
      
      // 각 문서에서 관련 내용 추출
      let combinedContent = '';
      
      for (const path of relevantDocPaths) {
        const docContent = CojiKnowledgeBase.docsCache[path];
        
        if (!docContent) continue;
        
        // 문서의 주요 내용 추출 (헤더 제외)
        const contentSections = this.extractRelevantSections(docContent, query);
        
        if (contentSections) {
          combinedContent += `[${path}에서 발췌]\n${contentSections}\n\n`;
        }
      }
      
      return combinedContent.trim();
    } catch (error) {
      console.error('문서 검색 오류:', error);
      return '';
    }
  }
  
  /**
   * 문서에서 관련 섹션 추출
   * @param content 문서 내용
   * @param query 사용자 질의
   */
  private extractRelevantSections(content: string, query: string): string {
    // 쿼리에서 키워드 추출
    const keywords = query.toLowerCase().split(/\s+/)
      .filter(word => word.length > 2) // 짧은 단어 제외
      .map(word => word.replace(/[^\w가-힣]/g, '')); // 특수문자 제거
    
    // 문서를 섹션으로 분할 (# 기준)
    const sections = content.split(/(?=#{1,6}\s)/);
    
    // 관련 섹션 찾기
    const relevantSections: string[] = [];
    
    for (const section of sections) {
      // 섹션이 키워드를 포함하는지 확인
      const isRelevant = keywords.some(keyword => 
        section.toLowerCase().includes(keyword)
      );
      
      if (isRelevant) {
        // 너무 긴 섹션은 요약
        if (section.length > 1000) {
          const firstParagraph = section.split('\n\n')[0];
          relevantSections.push(firstParagraph);
          
          // 추가 정보가 있음을 알림
          if (section.length > firstParagraph.length) {
            relevantSections.push('...(이하 생략)...');
          }
        } else {
          relevantSections.push(section);
        }
      }
    }
    
    // 섹션이 없으면 문서 내용 앞부분 반환
    if (relevantSections.length === 0) {
      const firstSection = content.split('\n\n').slice(0, 2).join('\n\n');
      return firstSection.length > 500 
        ? firstSection.substring(0, 500) + '...' 
        : firstSection;
    }
    
    return relevantSections.join('\n\n');
  }
}

export const documentService = new DocumentService();