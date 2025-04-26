// 📁 public/js/contentAnalyzer.js
// Create at 2504251030 Ver1.2

/**
 * 콘텐츠 상세분석기 - YouTube 자막 추출 기능
 * 
 * 이 모듈은 YouTube URL을 입력받아 백엔드 API를 통해 
 * 자막과 메타데이터를 추출하는 기능을 담당합니다.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 참조
    const inputValue = document.getElementById('inputValue');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const spinner = document.getElementById('spinner');
    const resultsContainer = document.getElementById('resultsContainer');
    const videoTitle = document.getElementById('videoTitle');
    const videoUrl = document.getElementById('videoUrl');
    const captionsOutput = document.getElementById('captionsOutput');
    const errorMessage = document.getElementById('errorMessage');

    // 분석 시작 버튼 클릭 이벤트 리스너
    analyzeBtn.addEventListener('click', handleAnalyzeClick);
    
    // 엔터 키 처리
    inputValue.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAnalyzeClick();
        }
    });

    // 입력 필드 변경 시 에러 메시지 숨기기
    inputValue.addEventListener('input', () => {
        errorMessage.style.display = 'none';
    });

    /**
     * 분석 처리 함수
     */
    async function handleAnalyzeClick() {
        // 입력값 검증
        const url = inputValue.value.trim();
        if (!url) {
            errorMessage.style.display = 'block';
            inputValue.focus();
            return;
        }

        // YouTube URL 검증
        if (!url.includes('youtube.com/watch') && !url.includes('youtu.be/')) {
            errorMessage.textContent = '유효한 YouTube URL을 입력해주세요.';
            errorMessage.style.display = 'block';
            return;
        }

        // UI 업데이트: 로딩 상태 표시
        setLoading(true);
        errorMessage.style.display = 'none';
        resultsContainer.style.display = 'none';
        
        try {
            // 백엔드 API 호출
            const response = await fetch('/api/extract-captions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            });

            // 응답 처리
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '분석 중 오류가 발생했습니다.');
            }

            const data = await response.json();
            
            // 결과 표시
            displayResults(data);
        } catch (error) {
            console.error('Error:', error);
            errorMessage.textContent = error.message || '처리 중 오류가 발생했습니다.';
            errorMessage.style.display = 'block';
            resultsContainer.style.display = 'none';
        } finally {
            // 로딩 상태 해제
            setLoading(false);
        }
    }

    /**
     * 로딩 상태 설정
     * @param {boolean} isLoading - 로딩 중 여부
     */
    function setLoading(isLoading) {
        spinner.style.display = isLoading ? 'inline-block' : 'none';
        analyzeBtn.disabled = isLoading;
        inputValue.disabled = isLoading;
        analyzeBtn.style.cursor = isLoading ? 'wait' : 'pointer';
        if (isLoading) {
            analyzeBtn.textContent = '분석 중...';
        } else {
            analyzeBtn.innerHTML = '분석 시작<div id="spinner" class="spinner ml-2" style="display: none;"></div>';
        }
    }

    /**
     * 결과 데이터 표시
     * @param {Object} data - 백엔드에서 받은 결과 데이터
     */
    function displayResults(data) {
        // 제목 설정
        videoTitle.textContent = data.title || '제목 없음';
        
        // URL 링크 설정
        videoUrl.href = data.url || '#';
        videoUrl.style.display = data.url ? 'inline-block' : 'none';
        
        // 자막 내용 설정
        captionsOutput.textContent = data.captions || '자막이 없습니다.';
        
        // 결과 컨테이너 표시 (부드러운 전환 효과)
        resultsContainer.style.opacity = '0';
        resultsContainer.style.display = 'block';
        setTimeout(() => {
            resultsContainer.style.opacity = '1';
            resultsContainer.style.transition = 'opacity 0.3s ease-in-out';
        }, 50);
    }
});