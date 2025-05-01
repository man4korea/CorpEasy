// 📁 public/js/contentAnalyzer.js
// Create at 2505011735 Ver1.10

// 변수를 window 객체에 직접 저장하지 않고 지역 변수로 사용
// 기존 스크립트가 있는지 확인하고 없을 때만 정의
if (typeof window._contentAnalyzerData === 'undefined') {
    console.log('contentAnalyzer.js - 첫 번째 로드 및 초기화');
    
    // 비공개 데이터 저장소
    window._contentAnalyzerData = {
        // 로컬과 배포 환경 구분 (localhost, 127.0.0.1, 0.0.0.0 모두 포함)
        isLocalhost: ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname),
        initialized: false,
        isAnalyzing: false
    };
    
    // 프록시 URL 설정
    window._contentAnalyzerData.proxyUrlBase = window._contentAnalyzerData.isLocalhost ? 
        'http://localhost:3002' : 
        'https://us-central1-corpeasy-c69bb.cloudfunctions.net';
        
    console.log('프록시 URL 설정:', window._contentAnalyzerData.proxyUrlBase);
}

// 로딩 인디케이터 생성 함수
function createLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.innerHTML = '<div class="spinner"></div><p>자막을 가져오는 중...</p>';
    loadingDiv.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 20px 0;
        padding: 20px;
    `;
    return loadingDiv;
}

// 에러 메시지 표시 함수
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    } else {
        console.error('에러 메시지 표시 실패: errorMessage 요소를 찾을 수 없음');
        console.error(message);
    }
}

// YouTube URL 유효성 검사 함수
function isValidYoutubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return pattern.test(url);
}

// YouTube 비디오 ID 추출 함수
function extractVideoId(url) {
    try {
        let videoId = null;
        const urlObj = new URL(url);
        
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.substring(1);
        } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
            if (urlObj.pathname === '/watch') {
                videoId = urlObj.searchParams.get('v');
            } else if (urlObj.pathname.startsWith('/embed/')) {
                videoId = urlObj.pathname.split('/')[2];
            } else if (urlObj.pathname.startsWith('/v/')) {
                videoId = urlObj.pathname.split('/')[2];
            }
        }
        
        return videoId;
    } catch (error) {
        console.error('URL 파싱 오류:', error);
        return null;
    }
}

// 자막 가져오기 함수
async function getTranscript(videoId) {
    try {
        console.log('자막 가져오기 시작:', videoId);
        console.log('프록시 URL 베이스:', window._contentAnalyzerData.proxyUrlBase);
        
        const videoWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const proxyUrl = `${window._contentAnalyzerData.proxyUrlBase}/api/youtube-proxy?videoUrl=${encodeURIComponent(videoWatchUrl)}`;
        
        console.log('요청 URL:', proxyUrl);
        
        const response = await fetch(proxyUrl);
        console.log('응답 상태:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`YouTube 페이지를 가져오는데 실패했습니다. 상태 코드: ${response.status}`);
        }
        
        const pageText = await response.text();
        console.log('[유튜브 응답 길이]', pageText.length, '바이트');
        console.log('[captionTracks 포함 여부]', pageText.includes('"captionTracks"'));
        
        const titleMatch = pageText.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : '제목 없음';
        
        // JSON 포맷 확인
        const captionTracks = pageText.match(/"captionTracks":\[(.*?)\]/);
        if (!captionTracks) {
            console.error('자막 트랙 찾기 실패: captionTracks 없음');
            throw new Error('자막 트랙을 찾을 수 없습니다.');
        }
        
        try {
            const tracks = JSON.parse(`[${captionTracks[1]}]`);
            console.log('트랙 개수:', tracks.length);
            
            let selectedTrack = tracks.find(track => track.languageCode === 'ko' && (track.kind === 'asr' || track.kind === 'standard'));
            let languageInfo = '한국어';
            
            if (!selectedTrack) {
                selectedTrack = tracks.find(track => track.languageCode === 'en' && (track.kind === 'asr' || track.kind === 'standard'));
                if (!selectedTrack) {
                    if (tracks.length > 0) {
                        selectedTrack = tracks[0];
                        languageInfo = selectedTrack.name?.simpleText || '자동 선택';
                    } else {
                        throw new Error('사용 가능한 자막이 없습니다.');
                    }
                } else {
                    languageInfo = '영어';
                }
            }
            
            console.log('선택된 트랙:', selectedTrack.languageCode, selectedTrack.name?.simpleText);
            const transcriptUrl = selectedTrack.baseUrl + '&fmt=json3';
            console.log('자막 URL:', transcriptUrl);
            
            const transcriptResponse = await fetch(transcriptUrl);
            if (!transcriptResponse.ok) {
                throw new Error(`자막을 가져오는데 실패했습니다. 상태 코드: ${transcriptResponse.status}`);
            }
            
            const transcriptData = await transcriptResponse.json();
            const segments = transcriptData.events
                .filter(event => event.segs && event.segs.length > 0)
                .map(event => event.segs.map(seg => seg.utf8).join(''))
                .filter(text => text.trim());
            
            console.log('자막 세그먼트 개수:', segments.length);
            return {
                title: title,
                captions: segments.join('\n'),
                language: languageInfo
            };
        } catch (jsonError) {
            console.error('JSON 파싱 오류:', jsonError);
            throw new Error('자막 데이터 파싱에 실패했습니다. 형식이 올바르지 않습니다.');
        }
    } catch (error) {
        console.error('자막 가져오기 실패:', error);
        throw error;
    }
}

// 분석 시작 함수 - 전역 window 객체에 바인딩
window.startAnalysis = async function() {
    console.log('startAnalysis 함수 호출됨');
    
    // 기존에 실행 중인 경우 중복 실행 방지
    if (window._contentAnalyzerData.isAnalyzing) {
        console.log('이미 분석 중입니다.');
        return;
    }
    
    window._contentAnalyzerData.isAnalyzing = true;
    
    try {
        // DOM 요소 참조 가져오기
        const inputValue = document.getElementById('inputValue');
        const errorMessage = document.getElementById('errorMessage');
        const resultsContainer = document.getElementById('resultsContainer');
        const videoTitle = document.getElementById('videoTitle');
        const videoUrl = document.getElementById('videoUrl');
        const captionsOutput = document.getElementById('captionsOutput');
        
        // 요소 누락 확인
        if (!inputValue || !errorMessage || !resultsContainer || !videoTitle || !videoUrl || !captionsOutput) {
            console.error('필수 DOM 요소를 찾을 수 없습니다.');
            window._contentAnalyzerData.isAnalyzing = false;
            return;
        }
        
        const url = inputValue.value.trim();
        if (!url) {
            showError('URL을 입력해주세요.');
            window._contentAnalyzerData.isAnalyzing = false;
            return;
        }
        if (!isValidYoutubeUrl(url)) {
            showError('유효한 YouTube URL이 아닙니다.');
            window._contentAnalyzerData.isAnalyzing = false;
            return;
        }
        
        const videoId = extractVideoId(url);
        if (!videoId) {
            showError('YouTube 비디오 ID를 추출할 수 없습니다.');
            window._contentAnalyzerData.isAnalyzing = false;
            return;
        }
        
        errorMessage.style.display = 'none';
        resultsContainer.style.display = 'none';
        
        // 로딩 인디케이터 추가
        const mainContainer = document.querySelector('.main-container');
        if (!mainContainer) {
            console.error('메인 컨테이너를 찾을 수 없습니다.');
            window._contentAnalyzerData.isAnalyzing = false;
            return;
        }
        
        // 이전 로딩 인디케이터 제거
        const oldIndicator = document.getElementById('loadingIndicator');
        if (oldIndicator) {
            oldIndicator.remove();
        }
        
        const loadingIndicator = createLoadingIndicator();
        mainContainer.appendChild(loadingIndicator);
        
        try {
            console.log('비디오 ID:', videoId);
            const { title, captions, language } = await getTranscript(videoId);
            videoTitle.textContent = title + (language ? ` (${language} 자막)` : '');
            videoUrl.textContent = url;
            videoUrl.href = url;
            captionsOutput.textContent = captions;
            
            // 로딩 인디케이터 제거
            if (mainContainer.contains(loadingIndicator)) {
                mainContainer.removeChild(loadingIndicator);
            }
            
            resultsContainer.style.display = 'block';
        } catch (error) {
            // 로딩 인디케이터 제거
            if (mainContainer.contains(loadingIndicator)) {
                mainContainer.removeChild(loadingIndicator);
            }
            
            showError(error.message || '자막을 가져오는데 실패했습니다.');
        }
    } finally {
        window._contentAnalyzerData.isAnalyzing = false;
    }
};

// 엔터 키 이벤트 리스너 설정 함수
function setupEnterKeyListener() {
    console.log('엔터 키 이벤트 리스너 설정 시도');
    
    const inputElement = document.getElementById('inputValue');
    if (!inputElement) {
        console.error('입력 필드를 찾을 수 없음 (setupEnterKeyListener)');
        return false;
    }
    
    // keydown 이벤트 리스너
    const keydownHandler = function(e) {
        if (e.key === 'Enter') {
            console.log('엔터 키 감지됨 (keydown)');
            e.preventDefault();
            window.startAnalysis();
            return false;
        }
    };
    
    // 기존 이벤트 리스너 제거 후 다시 추가 (중복 방지)
    inputElement.removeEventListener('keydown', keydownHandler);
    inputElement.addEventListener('keydown', keydownHandler);
    
    // 버튼 클릭 이벤트 리스너
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        const clickHandler = function() {
            console.log('분석 버튼 클릭됨');
            window.startAnalysis();
        };
        
        analyzeBtn.removeEventListener('click', clickHandler);
        analyzeBtn.addEventListener('click', clickHandler);
    }
    
    console.log('엔터 키 및 버튼 이벤트 리스너 설정 완료');
    return true;
}

// 즉시 실행 함수
(function initializeModule() {
    // 페이지 로드 완료 시 이벤트 리스너 설정
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('문서가 이미 로드됨, 즉시 이벤트 리스너 설정');
        setTimeout(setupEnterKeyListener, 100);
    } else {
        console.log('문서 로드 대기 중, DOMContentLoaded 이벤트 구독');
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOMContentLoaded 이벤트 발생');
            setTimeout(setupEnterKeyListener, 100);
        });
    }
    
    // SPA 환경에서 컴포넌트 로드 이벤트 감지
    window.addEventListener('component-loaded', function(e) {
        console.log('component-loaded 이벤트 감지됨');
        setTimeout(setupEnterKeyListener, 100);
    });
})();