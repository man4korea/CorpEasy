// 📁 public/js/contentAnalyzer.js
// Create at 2504262310 Ver1.3

/**
 * 콘텐츠 상세분석기 - YouTube 자막 추출 기능
 * 
 * 이 모듈은 YouTube URL을 입력받아 자막을 추출하는 기능을 담당합니다.
 */

// 유틸리티 함수들을 먼저 정의
function decodeHtmlEntities(text) {
    const entities = {
        '&quot;': '"',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&#39;': "'",
        '&apos;': "'",
    };
    return text.replace(/&quot;|&amp;|&lt;|&gt;|&#39;|&apos;/g, match => entities[match]);
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 이벤트 리스너 초기화 함수
function initializeEventListeners() {
    console.log('ContentAnalyzer: 이벤트 리스너 초기화');

    // DOM 요소 참조
    const inputValue = document.getElementById('inputValue');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const spinner = document.getElementById('spinner');
    const resultsContainer = document.getElementById('resultsContainer');
    const videoTitle = document.getElementById('videoTitle');
    const videoUrl = document.getElementById('videoUrl');
    const captionsOutput = document.getElementById('captionsOutput');
    const errorMessage = document.getElementById('errorMessage');

    // DOM 요소 존재 확인
    if (!inputValue || !analyzeBtn || !spinner || !resultsContainer || 
        !videoTitle || !videoUrl || !captionsOutput || !errorMessage) {
        console.error('ContentAnalyzer: 필요한 DOM 요소를 찾을 수 없습니다');
        return;
    }

    // 분석 버튼 클릭 이벤트 핸들러
    async function handleAnalyzeClick() {
        const url = inputValue.value.trim();
        if (!url) {
            errorMessage.textContent = 'URL을 입력해주세요.';
            errorMessage.style.display = 'block';
            inputValue.focus();
            return;
        }

        if (!url.includes('youtube.com/watch') && !url.includes('youtu.be/')) {
            errorMessage.textContent = '유효한 YouTube URL을 입력해주세요.';
            errorMessage.style.display = 'block';
            return;
        }

        setLoading(true);
        errorMessage.style.display = 'none';
        resultsContainer.style.display = 'none';
        
        try {
            // 테스트용 더미 데이터 반환 (실제 API 연동 전)
            const dummyData = {
                title: `유튜브 비디오: ${getVideoTitle(url)}`,
                url: url,
                captions: getDummyCaptions()
            };
            
            // 0.5초 지연 후 결과 표시 (로딩 효과 시뮬레이션)
            setTimeout(() => {
                displayResults(dummyData);
                setLoading(false);
            }, 500);
        } catch (error) {
            console.error('처리 중 오류 발생:', error);
            errorMessage.textContent = error.message || '처리 중 오류가 발생했습니다.';
            errorMessage.style.display = 'block';
            resultsContainer.style.display = 'none';
            setLoading(false);
        }
    }

    // 이벤트 리스너 설정
    analyzeBtn.addEventListener('click', handleAnalyzeClick);
    
    inputValue.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAnalyzeClick();
        }
    });

    inputValue.addEventListener('paste', () => {
        // URL 붙여넣기 후 약간의 지연을 두고 자동 분석
        setTimeout(handleAnalyzeClick, 100);
    });

    inputValue.addEventListener('input', () => {
        errorMessage.style.display = 'none';
    });

    // 로딩 상태 설정 함수
    function setLoading(isLoading) {
        spinner.style.display = isLoading ? 'inline-block' : 'none';
        analyzeBtn.disabled = isLoading;
        inputValue.disabled = isLoading;
        analyzeBtn.textContent = isLoading ? '분석 중...' : '분석 시작';
    }

    // 결과 표시 함수
    function displayResults(data) {
        videoTitle.textContent = data.title || '제목 없음';
        videoUrl.href = data.url || '#';
        videoUrl.style.display = data.url ? 'inline-block' : 'none';
        captionsOutput.textContent = data.captions || '자막이 없습니다.';
        
        resultsContainer.style.display = 'block';
    }

    // 테스트용 함수: URL에서 비디오 제목 추출 (실제 구현에서는 API 사용)
    function getVideoTitle(url) {
        try {
            // YouTube URL에서 비디오 ID 추출
            let videoId;
            if (url.includes('youtube.com/watch')) {
                videoId = new URL(url).searchParams.get('v');
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0];
            }
            return videoId ? `Video ID: ${videoId}` : '알 수 없는 비디오';
        } catch (e) {
            return '비디오 제목 추출 실패';
        }
    }

    // 테스트용 더미 자막 생성
    function getDummyCaptions() {
        return `[00:00:03] 안녕하세요, 유튜브 영상입니다.
[00:00:07] 이것은 테스트 자막입니다.
[00:00:12] 실제 구현에서는 YouTube API를 통해 자막을 가져올 예정입니다.
[00:00:18] 현재는 기본 기능 동작 확인을 위한 더미 데이터입니다.
[00:00:25] 이 기능이 정상 동작하면 다음 단계로 실제 API 연동을 진행하겠습니다.
[00:00:32] 감사합니다.`;
    }
}

// 컴포넌트 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeEventListeners, 100);
});

// 컴포넌트가 동적으로 로드될 때 초기화
window.addEventListener('component-loaded', function() {
    setTimeout(initializeEventListeners, 100);
});

// 전역 스코프에 초기화 함수 노출
window.initializeContentAnalyzer = initializeEventListeners;

// 페이지 로드 시 직접 호출 시도
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeEventListeners, 100);
}