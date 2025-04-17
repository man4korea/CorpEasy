// 📁 backend/utils/prompt-optimizer.ts
export class PromptOptimizer {
  // 시스템 프롬프트 최적화
  static getOptimizedSystemPrompt(options: { 
    concise?: boolean,
    language?: string,
    format?: string
  } = {}): string {
    const { concise = true, language = '한국어', format = '' } = options;
    
    let systemPrompt = [
      '당신은 전문적이고 도움이 되는 AI 어시스턴트입니다.',
    ];
    
    if (concise) {
      systemPrompt.push('응답은 항상 간결하고 직접적으로 제공하세요.');
      systemPrompt.push('불필요한 인사말이나 부가 설명은 생략하세요.');
    }
    
    if (language !== 'english') {
      systemPrompt.push(`${language}로 응답하세요.`);
    }
    
    if (format) {
      systemPrompt.push(`응답은 ${format} 형식으로 구성하세요.`);
    }
    
    return systemPrompt.join('\n');
  }
  
  // 작업별 템플릿 
  static readonly TEMPLATES = {
    SUMMARIZE: (text: string, maxLength: number = 500) => 
      `다음 텍스트를 ${maxLength}자 이내로 간결하게 요약해주세요. 불필요한 설명이나 부연 설명은 생략하고, 핵심 내용만 요약해주세요.\n\n${text}`,
    
    ANALYZE: (text: string) => 
      `다음 텍스트의 주요 개념, 핵심 주장, 그리고 중요 포인트를 분석해주세요.\n\n${text}`,
    
    EXTRACT_KEYWORDS: (text: string, count: number = 5) =>
      `다음 텍스트에서 가장 중요한 키워드 ${count}개만 추출해서 쉼표로 구분된 목록으로 제공해주세요.\n\n${text}`,
    
    ANSWER_QUESTION: (question: string, context: string) =>
      `다음 질문에 주어진 컨텍스트만을 기반으로 간결하게 답변해주세요.\n\n질문: ${question}\n\n컨텍스트: ${context}`,
      
    CLASSIFY: (text: string, categories: string[]) =>
      `다음 텍스트를 이 카테고리들 중 하나로 분류해주세요: ${categories.join(', ')}.\n분류 결과만 출력해주세요.\n\n${text}`
  }
  
  // XML 형식 응답 요청
  static getStructuredPrompt(task: string, content: string, format: Record<string, string>): string {
    const formatStr = Object.entries(format)
      .map(([key, desc]) => `<${key}>${desc}</${key}>`)
      .join('\n  ');
    
    return `다음 ${task}를 수행하고 결과를 XML 형식으로 정확히 제공해주세요:

컨텐츠:
${content}

다음 XML 형식으로 응답해주세요:
<result>
  ${formatStr}
</result>

다른 설명이나 부가 정보 없이 XML 형식만 정확히 반환해주세요.`;
  }
}