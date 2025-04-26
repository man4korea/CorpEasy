// 📁 public/js/apiService.js
// Create at 2504251740 Ver1.00

/**
 * API 호출을 관리하는 서비스
 * - 개발 환경: 로컬 Python 서버 API 엔드포인트 호출
 * - 배포 환경: Firebase Functions 호출
 */
class APIService {
    constructor() {
        // 현재 환경이 개발 환경인지 배포 환경인지 감지
        // 로컬호스트나 파일 프로토콜이면 개발 환경으로 간주
        this.isDevelopment = 
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:';
        
        console.log(`환경 감지: ${this.isDevelopment ? '개발' : '배포'} 환경`);
    }

    /**
     * 유튜브 비디오 정보 검색
     * @param {string} videoId - 유튜브 비디오 ID
     * @returns {Promise<Object>} - 비디오 정보
     */
    async getYouTubeVideoInfo(videoId) {
        try {
            // 개발 환경: 로컬 서버 API 사용
            // 배포 환경: Firebase Functions 사용
            const endpoint = this.isDevelopment 
                ? `/api/youtube/video?id=${videoId}`
                : `/api/youtube/video?id=${videoId}`;  // 배포 환경에서는 같은 경로지만 Firebase Functions에서 처리
            
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('유튜브 비디오 정보 요청 실패:', error);
            throw error;
        }
    }
    
    /**
     * OpenAI API를 사용해 텍스트 분석
     * @param {string} content - 분석할 텍스트
     * @param {string} prompt - 분석 지시사항
     * @returns {Promise<Object>} - 분석 결과
     */
    async analyzeContentWithGPT(content, prompt) {
        try {
            const endpoint = this.isDevelopment
                ? '/api/analyze/gpt'
                : '/api/analyze/gpt';  // 배포 환경에서는 Firebase Functions에서 처리
                
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content, prompt })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('GPT 분석 요청 실패:', error);
            throw error;
        }
    }
    
    /**
     * Claude API를 사용해 텍스트 분석
     * @param {string} content - 분석할 텍스트
     * @param {string} prompt - 분석 지시사항
     * @returns {Promise<Object>} - 분석 결과
     */
    async analyzeContentWithClaude(content, prompt) {
        try {
            const endpoint = this.isDevelopment
                ? '/api/analyze/claude'
                : '/api/analyze/claude';  // 배포 환경에서는 Firebase Functions에서 처리
                
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content, prompt })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Claude 분석 요청 실패:', error);
            throw error;
        }
    }
    
    /**
     * Gemini API를 사용해 텍스트 분석
     * @param {string} content - 분석할 텍스트
     * @param {string} prompt - 분석 지시사항
     * @param {boolean} useProVersion - Pro 버전 사용 여부 (기본값: false)
     * @returns {Promise<Object>} - 분석 결과
     */
    async analyzeContentWithGemini(content, prompt, useProVersion = false) {
        try {
            const endpoint = this.isDevelopment
                ? '/api/analyze/gemini'
                : '/api/analyze/gemini';  // 배포 환경에서는 Firebase Functions에서 처리
                
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    content, 
                    prompt,
                    model: useProVersion ? 'gemini-1.5-pro' : 'gemini-1.5-flash'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Gemini 분석 요청 실패:', error);
            throw error;
        }
    }
    
    /**
     * 웹 페이지 콘텐츠 가져오기 (서버 프록시 사용)
     * @param {string} url - 가져올 웹 페이지 URL
     * @returns {Promise<string>} - 웹 페이지 콘텐츠 (HTML)
     */
    async fetchWebPageContent(url) {
        try {
            const endpoint = this.isDevelopment
                ? `/api/proxy?url=${encodeURIComponent(url)}`
                : `/api/proxy?url=${encodeURIComponent(url)}`;  // 배포 환경에서는 Firebase Functions에서 처리
                
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            return await response.text();
        } catch (error) {
            console.error('웹 페이지 콘텐츠 요청 실패:', error);
            throw error;
        }
    }
}

// 싱글턴 인스턴스 생성 및 내보내기
const apiService = new APIService();
export default apiService;