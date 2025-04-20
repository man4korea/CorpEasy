// 📁 backend/services/coji-service.ts
// Create at 2504191530 Ver1.5

// 기본 Node.js 파일 시스템 및 경로 유틸리티 모듈 import
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// 프로젝트 내부 유틸리티 및 캐시, 로깅 시스템 import
import { logger } from '../utils/logger';
import { getFromCache, setToCache } from '../utils/cache';
import { cache } from '../utils/cache-factory';
import { generateGPT35Reply } from './gpt35-service'; // GPT-3.5 호출 함수

// fs 함수들을 프로미스 기반으로 변환
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// ES 모듈 환경에서 __dirname 대체 구현
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 문서 내용을 메모리에 캐싱할 객체
const docsCache: Record<string, string> = {};
const DOCS_DIR = path.join(__dirname, '../../docs');

// 각 문서에 대한 메타데이터 정의 (파일명 + 키워드)
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
 * HTML 태그 및 엔티티 제거 함수
 * @param html 원본 문자열
 * @returns 정제된 문자열
 */
export function stripHtmlTags(html: string): string {
  if (typeof html !== 'string') return '';
  const withoutTags = html.replace(/<[^>]*>/g, '');
  return withoutTags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * 문서 디렉토리 내의 파일들을 메모리 캐시에 적재하는 함수
 */
async function initDocsCache(): Promise<void> {
  try {
    try {
      await stat(DOCS_DIR);
    } catch (error) {
      logger.warn(`문서 디렉토리가 존재하지 않습니다: ${DOCS_DIR}`);
      return;
    }
    const files = await readdir(DOCS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md') || file.endsWith('.txt'));
    Object.keys(docsCache).forEach(key => delete docsCache[key]);
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

// 최초 실행 시 문서 캐시 적재 + 10분 간격 갱신
initDocsCache();
setInterval(initDocsCache, 10 * 60 * 1000);

/**
 * 사용자 질의에 관련된 문서를 찾아 반환하는 함수
 * @param query 사용자 입력 문자열
 * @returns 관련 문서 목록
 */
function findRelevantDocs(query: string): string[] {
  const relevantDocs: string[] = [];
  const queryWords = query.toLowerCase().split(/\s+/);

  // 메타데이터 기반 문서 키워드 매칭
  Object.values(docsMeta).forEach(meta => {
    const keywordMatches = meta.keywords.some(keyword =>
      queryWords.some(word => word.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(word))
    );
    if (keywordMatches) {
      relevantDocs.push(meta.path);
    }
  });

  // 문서 본문 내용 기반 검색
  Object.keys(docsCache).forEach(docPath => {
    if (!relevantDocs.includes(docPath)) {
      const content = docsCache[docPath].toLowerCase();
      const contentMatches = queryWords.some(word => word.length > 2 && content.includes(word));
      if (contentMatches) {
        relevantDocs.push(docPath);
      }
    }
  });

  return relevantDocs.slice(0, 3); // 최대 3개까지 반환
}

/**
 * 문서에서 쿼리와 관련된 섹션만 추출하는 함수
 * @param content 문서 본문
 * @param query 사용자 질의
 * @returns 발췌된 섹션
 */
function extractRelevantSections(content: string, query: string): string {
  const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2).map(word => word.replace(/[^\w가-힣]/g, ''));
  const sections = content.split(/(?=#{1,6}\s)/);
  const relevantSections: string[] = [];

  for (const section of sections) {
    const isRelevant = keywords.some(keyword => section.toLowerCase().includes(keyword));
    if (isRelevant) {
      if (section.length > 800) {
        const firstParagraph = section.split('\n\n')[0];
        relevantSections.push(firstParagraph);
        if (section.length > firstParagraph.length) {
          relevantSections.push('...(이하 생략)...');
        }
      } else {
        relevantSections.push(section);
      }
    }
  }

  if (relevantSections.length === 0) {
    const firstSection = content.split('\n\n').slice(0, 2).join('\n\n');
    return firstSection.length > 500 ? firstSection.substring(0, 500) + '...' : firstSection;
  }

  return relevantSections.join('\n\n');
}

/**
 * GPT-3.5를 사용하여 코지 응답 생성
 * @param message 사용자 입력 메시지
 * @returns 응답 문자열
 */
export async function generateCojiResponse(message: string): Promise<string> {
  try {
    // 문서 검색 및 발췌
    const relevantDocPaths = findRelevantDocs(message);
    let docsContent = '';

    if (relevantDocPaths.length > 0) {
      for (const path of relevantDocPaths) {
        if (docsCache[path]) {
          const relevantSection = extractRelevantSections(docsCache[path], message);
          docsContent += `[${path}에서 발췌]\n${relevantSection}\n\n`;
        }
      }
    }

    // 기본 문서 보완
    if (docsContent.length < 100 && docsCache['coji_guide.md']) {
      const basicInfo = docsCache['coji_guide.md'].split('\n\n').slice(0, 3).join('\n\n');
      docsContent += `[기본 정보]\n${basicInfo}\n\n`;
    }

    // 프롬프트 구성
    const prompt = `당신은 코지(Coji)라는 CorpEasy의 AI 어시스턴트입니다. 다음 지침을 반드시 따르세요:\n\n1. 친절하고 상냥한 톤으로 응답하세요.\n2. 한국어로 대화하세요.\n3. 사용자의 질문에 직접적으로 답변하세요.\n4. 필요한 경우 이모지를 사용하여 표현력을 높이세요.\n5. 문서의 정보를 기반으로 답변하되, 그대로 복사하지 말고 자연스럽게 바꿔서 답변하세요.\n6. 짧고 명확한 문장으로 응답하세요.\n7. 모르는 내용은 솔직하게 모른다고 말하세요.\n8. XML이나 HTML 태그는 절대 사용하지 마세요.\n9. HTML 태그는 포함하지 마세요.\n10. 응답은 순수 텍스트로만 작성하세요.\n\n사용자 질문: ${message}\n\n관련 문서 내용:\n${docsContent.length > 0 ? docsContent : "관련 문서를 찾을 수 없습니다."}`;

    // 캐시 확인
    const cacheKey = `gpt35:${message.substring(0, 100)}`;
    const cachedResponse = await getFromCache(cacheKey);
    if (cachedResponse) {
      logger.info('GPT-3.5 캐시된 응답 사용');
      return cachedResponse;
    }

    // GPT-3.5 호출 및 캐싱
    const response = await generateGPT35Reply(prompt);
    if (response) {
      await setToCache(cacheKey, response, 60 * 60);
    }

    return stripHtmlTags(response);
  } catch (error) {
    logger.error('코지 응답 생성 오류:', error);
    return "서비스 연결에 문제가 있어요. 잠시 후 다시 물어봐 주세요! ⚠️";
  }
}
