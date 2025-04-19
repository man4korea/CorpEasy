// 📁 frontend/src/data/cojiKnowledgeBase.ts
// Create at 2504191240

/**
 * 코지 챗봇 지식 베이스
 * - 기본 응답 템플릿
 * - 문서 참조 메타데이터
 */
export const CojiKnowledgeBase = {
  // 기본 응답 메시지
  responses: {
    greeting: "안녕하세요! 저는 CorpEasy의 AI 비서 코지입니다. 어떻게 도와드릴까요? 유튜브 분석, 블로그 생성, AI 모델 사용 등에 대해 물어보세요!",
    fallback: "죄송해요, 지금은 그 정보를 찾을 수 없어요. 다른 방식으로 질문해 주시겠어요?",
    loading: "잠시만 기다려주세요, 답변을 찾고 있어요...",
    error: "죄송합니다, 응답을 생성하는 중에 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
    docsReference: "제가 CorpEasy 문서에서 찾은 정보예요: "
  },
  
  // 문서 메타데이터
  docsMeta: {
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
    },
    htmlStyleReference: {
      path: "html_style_reference.txt", 
      keywords: ["HTML", "스타일", "참조", "태그", "요소", "구조"]
    },
    naturalWriting: {
      path: "natural_human_blog_writing_instruction.txt",
      keywords: ["자연스러운", "글쓰기", "블로그", "작성", "인간적", "톤"]
    },
    blogPrompt: {
      path: "Blog_5_Step_Prompt.txt",
      keywords: ["블로그", "5단계", "프롬프트", "작성", "가이드", "SEO"]
    }
  },

  // 문서 내용 캐시 (실시간으로 업데이트됨)
  docsCache: {} as Record<string, string>,
  
  // 문서 참조 함수 - 키워드 기반으로 관련 문서 찾기
  findRelevantDocs(query: string): string[] {
    const relevantDocs: string[] = [];
    const queryWords = query.toLowerCase().split(/\s+/);
    
    // 모든 문서 메타데이터 순회
    Object.entries(this.docsMeta).forEach(([key, meta]) => {
      // 키워드 매칭
      const keywordMatches = meta.keywords.some(keyword => 
        queryWords.some(word => word.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(word))
      );
      
      if (keywordMatches) {
        relevantDocs.push(meta.path);
      }
    });
    
    return relevantDocs;
  }
};