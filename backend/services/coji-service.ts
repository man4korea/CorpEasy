// 📁 backend/services/coji-service.ts
// Create at 2504191530

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';
import { getFromCache, setToCache } from '../utils/cache';
import { cache } from '../utils/cache-factory';
import { callGemini } from './gemini'; // Gemini 호출 함수 import

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 문서 캐시 - 메모리에 로드된 문서 내용
const docsCache: Record<string, string> = {};

// 문서 디렉토리 경로
const DOCS_DIR = path.join(__dirname, '../../docs');

// 문서 메타데이터
const docsMeta = {
  cojiGuide: {
    path: "coji_guide.md",
    keywords: ["코지", "챗봇", "사용법", "안내", "도움말", "기능"]
  },
  contentAnalyzer: {
    path: "content_analyzer_guide.md",
    keywords: ["콘텐츠", "분석", "유튜브", "영상", "요약", "번역", "상세분석", "블로그", "자막"]
  },
  blogFormat: {
    path: "blog_output_format.txt",
    keywords: ["블로그", "출력", "형식", "포맷", "HTML", "구조"]
  },
  blogStyleGuide: {
    path: "blog_style_guide.txt",
    keywords: ["블로그", "스타일", "가이드", "문체", "어조", "SEO"]
  }
};

/**
 * HTML 태그를 제거하는 유틸리티 함수
 * @param html HTML 태그가 포함된 문자열
 * @returns 정제된 문자열
 */
export function stripHtmlTags(html: string): string {
  if (typeof html !== 'string') return '';
  
  // HTML 태그 제거
  const withoutTags = html.replace(/<[^>]*>/g, '');
  
  // HTML 엔티티 디코딩
  return withoutTags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * 문서 로드 및 캐시 초기화
 */
async function initDocsCache(): Promise<void> {
  try {
    // 문서 디렉토리 존재 확인
    try {
      await stat(DOCS_DIR);
    } catch (error) {
      logger.warn(`문서 디렉토리가 존재하지 않습니다: ${DOCS_DIR}`);
      return;
    }
    
    // 디렉토리 내 파일 목록 가져오기
    const files = await readdir(DOCS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md') || file.endsWith('.txt'));
    
    // 캐시 비우기
    Object.keys(docsCache).forEach(key => delete docsCache[key]);
    
    // 문서 로드
    for (const file of mdFiles) {
      try {
        const filePath = path.join(DOCS_DIR, file);
        const content = await readFile(filePath, 'utf8');
        docsCache[file] = content;
        logger.info(`문서 로드됨: ${file}`);
      } catch (error) {
        logger.error(`문서 로드 오류 (${file}):`, error);
      }
    }
    
    logger.info(`문서 캐시 초기화 완료. ${Object.keys(docsCache).length}개 문서 로드됨.`);
  } catch (error) {
    logger.error('문서 캐시 초기화 실패:', error);
  }
}

// 초기 문서 로드
initDocsCache();

// 주기적으로 문서 캐시 갱신 (10분마다)
setInterval(initDocsCache, 10 * 60 * 1000);

/**
 * 관련 문서 찾기
 * @param query 사용자 질의
 */
function findRelevantDocs(query: string): string[] {
  const relevantDocs: string[] = [];
  const queryWords = query.toLowerCase().split(/\s+/);
  
  // 모든 문서 메타데이터 순회
  Object.values(docsMeta).forEach(meta => {
    // 키워드 매칭
    const keywordMatches = meta.keywords.some(keyword => 
      queryWords.some(word => word.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(word))
    );
    
    if (keywordMatches) {
      relevantDocs.push(meta.path);
    }
  });
  
  // 모든 문서 확인 (메타데이터에 없는 문서도 확인)
  Object.keys(docsCache).forEach(docPath => {
    if (!relevantDocs.includes(docPath)) {
      const content = docsCache[docPath].toLowerCase();
      // 쿼리 단어가 문서 내용에 포함되는지 확인
      const contentMatches = queryWords.some(word => 
        word.length > 2 && content.includes(word)
      );
      
      if (contentMatches) {
        relevantDocs.push(docPath);
      }
    }
  });
  
  return relevantDocs.slice(0, 3); // 최대 3개 문서 반환
}

/**
 * 문서에서 관련 섹션 추출
 * @param content 문서 내용
 * @param query 사용자 질의
 */
function extractRelevantSections(content: string, query: string): string {
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
      if (section.length > 800) {
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

/**
 * 코지 응답 생성
 * @param message 사용자 메시지
 * @returns 코지 응답
 */
export async function generateCojiResponse(message: string): Promise<string> {
  try {
    // 관련 문서 찾기
    const relevantDocPaths = findRelevantDocs(message);
    let docsContent = '';
    
    // 문서 내용 추출
    if (relevantDocPaths.length > 0) {
      for (const path of relevantDocPaths) {
        if (docsCache[path]) {
          const relevantSection = extractRelevantSections(docsCache[path], message);
          docsContent += `[${path}에서 발췌]\n${relevantSection}\n\n`;
        }
      }
    }
    
    // 만약 docsContent가 없거나 매우 짧다면 coji_guide.md를 기본으로 사용
    if (docsContent.length < 100 && docsCache['coji_guide.md']) {
      const basicInfo = docsCache['coji_guide.md'].split('\n\n').slice(0, 3).join('\n\n');
      docsContent += `[기본 정보]\n${basicInfo}\n\n`;
    }
    
    // Gemini API로 응답 생성
    const prompt = `당신은 코지(Coji)라는 CorpEasy의 AI 어시스턴트입니다. 다음 지침을 반드시 따르세요:

1. 친절하고 상냥한 톤으로 응답하세요.
2. 한국어로 대화하세요.
3. 사용자의 질문에 직접적으로 답변하세요.
4. 필요한 경우 이모지를 사용하여 표현력을 높이세요.
5. 문서의 정보를 기반으로 답변하되, 그대로 복사하지 말고 자연스럽게 바꿔서 답변하세요.
6. 짧고 명확한 문장으로 응답하세요.
7. 모르는 내용은 솔직하게 모른다고 말하세요.
8. XML이나 HTML 태그는 절대 사용하지 마세요.
9. HTML 태그는 포함하지 마세요.
10. 응답은 순수 텍스트로만 작성하세요.

사용자 질문: ${message}

관련 문서 내용:
${docsContent.length > 0 ? docsContent : "관련 문서를 찾을 수 없습니다."}`;

    try {
      // 캐시 확인 - 동일한 질문에 대한 캐시된 응답이 있는지 확인
      const cacheKey = `gemini:${message.substring(0, 100)}`;
      const cachedResponse = await getFromCache(cacheKey);
      
      if (cachedResponse) {
        logger.info('Gemini 캐시된 응답 사용');
        return cachedResponse;
      }
      
      // Gemini API 호출
      const response = await callGemini(prompt, 'gemini-1.5-flash-8b', 0.7);
      
      // 응답 캐싱 (1시간)
      if (response) {
        await setToCache(cacheKey, response, 60 * 60);
      }
      
      return stripHtmlTags(response);
    } catch (error) {
      logger.error('Gemini 응답 오류:', error);
      return "죄송해요, 현재 답변을 생성하는 데 문제가 발생했어요. 잠시 후 다시 시도해주세요! 🙏";
    }

  } catch (error) {
    logger.error('코지 응답 생성 오류:', error);
    return "서비스 연결에 문제가 있어요. 잠시 후 다시 물어봐 주세요! ⚠️";
  }
}