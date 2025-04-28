// 📁 public/js/contentAnalyzer.js
// Create at 2504262310 Ver1.4

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
            // 비디오 ID 추출
            let videoId;
            if (url.includes('youtube.com/watch')) {
                videoId = new URL(url).searchParams.get('v');
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0];
            }
            if (!videoId) throw new Error('유효한 YouTube URL이 아닙니다.');

            // 유튜브 페이지에서 자막 정보 가져오기
            // YouTube fetch proxy URL 설정
            const isLocal = window.location.hostname === 'localhost';
            const proxyBaseUrl = isLocal 
            ? 'http://localhost:3002/api/youtube-proxy'
            : '/api/youtube-proxy'; // 배포 서버에서는 상대 경로 사용

            // 분석 버튼 클릭 이벤트 핸들러 안에
            const proxyUrl = `${proxyBaseUrl}?videoUrl=https://www.youtube.com/watch?v=${videoId}`;
            const pageResponse = await fetch(proxyUrl);
            
            if (!pageResponse.ok) throw new Error('YouTube 페이지를 불러올 수 없습니다.');
            const pageText = await pageResponse.text();

            // 동영상 제목 추출
            const titleMatch = pageText.match(/"title":"(.*?)"/);
            const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : '제목 없음';

            // 자막 트랙 찾기
            const captionTracks = pageText.match(/"captionTracks":\[(.*?)\]/);
            if (!captionTracks) throw new Error('자막 트랙을 찾을 수 없습니다.');
            const tracks = JSON.parse(`[${captionTracks[1]}]`);
            // 한국어 자막 찾기
            const koreanTrack = tracks.find(track => track.languageCode === 'ko' && (track.kind === 'asr' || track.kind === 'standard'));
            if (!koreanTrack) throw new Error('한국어 자막을 찾을 수 없습니다.');
            // 자막 URL 생성
            const transcriptUrl = koreanTrack.baseUrl + '&fmt=json3';
            // 자막 가져오기
            const transcriptResponse = await fetch(transcriptUrl);
            if (!transcriptResponse.ok) throw new Error('자막을 가져오는데 실패했습니다.');
            const transcriptData = await transcriptResponse.json();
            // 자막 텍스트 추출
            const segments = transcriptData.events
                .filter(event => event.segs && event.segs.length > 0)
                .map(event => event.segs.map(seg => seg.utf8).join(''))
                .filter(text => text.trim());
            // 결과 표시
            videoTitle.textContent = title;
            videoUrl.href = url;
            videoUrl.style.display = url ? 'inline-block' : 'none';
            captionsOutput.textContent = segments.length ? segments.join('\n') : '자막이 없습니다.';
            resultsContainer.style.display = 'block';
        } catch (error) {
            console.error('처리 중 오류 발생:', error);
            errorMessage.textContent = error.message || '처리 중 오류가 발생했습니다.';
            errorMessage.style.display = 'block';
            resultsContainer.style.display = 'none';
            captionsOutput.textContent = ''; // ✅ 실패 시 자막도 지워버려!
        } finally {
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