// 📁 public/js/ContentAnalyzer.js
// Create at 2504291835 Ver1.4

// 로컬과 배포 환경 구분 (localhost, 127.0.0.1, 0.0.0.0 모두 포함)
const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
let proxyUrlBase = isLocalhost ? 'http://localhost:3002' : '';

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
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';

    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 3000);
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

        const proxyUrl = `${proxyUrlBase}/api/youtube-proxy?videoUrl=https://www.youtube.com/watch?v=${videoId}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error('YouTube 페이지를 가져오는데 실패했습니다.');
        }

        const pageText = await response.text();
        const titleMatch = pageText.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : '제목 없음';

        const captionTracks = pageText.match(/"captionTracks":\[(.*?)\]/);
        if (!captionTracks) throw new Error('자막 트랙을 찾을 수 없습니다.');

        const tracks = JSON.parse(`[${captionTracks[1]}]`);

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

        const transcriptUrl = selectedTrack.baseUrl + '&fmt=json3';
        const transcriptResponse = await fetch(transcriptUrl);
        if (!transcriptResponse.ok) throw new Error('자막을 가져오는데 실패했습니다.');

        const transcriptData = await transcriptResponse.json();
        const segments = transcriptData.events
            .filter(event => event.segs && event.segs.length > 0)
            .map(event => event.segs.map(seg => seg.utf8).join(''))
            .filter(text => text.trim());

        return {
            title: title,
            captions: segments.join('\n'),
            language: languageInfo
        };
    } catch (error) {
        console.error('자막 가져오기 실패:', error);
        throw error;
    }
}

// 분석 시작 함수
async function startAnalysis() {
    const inputValue = document.getElementById('inputValue');
    const errorMessage = document.getElementById('errorMessage');
    const resultsContainer = document.getElementById('resultsContainer');
    const videoTitle = document.getElementById('videoTitle');
    const videoUrl = document.getElementById('videoUrl');
    const captionsOutput = document.getElementById('captionsOutput');

    const url = inputValue.value.trim();
    if (!url) {
        showError('URL을 입력해주세요.');
        return;
    }
    if (!isValidYoutubeUrl(url)) {
        showError('유효한 YouTube URL이 아닙니다.');
        return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        showError('YouTube 비디오 ID를 추출할 수 없습니다.');
        return;
    }

    errorMessage.style.display = 'none';
    resultsContainer.style.display = 'none';
    const loadingIndicator = createLoadingIndicator();
    document.querySelector('.main-container').appendChild(loadingIndicator);

    try {
        const { title, captions, language } = await getTranscript(videoId);
        videoTitle.textContent = title + (language ? ` (${language} 자막)` : '');
        videoUrl.textContent = url;
        videoUrl.href = url;
        captionsOutput.textContent = captions;

        document.querySelector('.main-container').removeChild(loadingIndicator);
        resultsContainer.style.display = 'block';
    } catch (error) {
        document.querySelector('.main-container').removeChild(loadingIndicator);
        showError(error.message || '자막을 가져오는데 실패했습니다.');
    }
}
