// 📁 frontend/src/utils/youtubeApiTest.js
// Create at 2504231130 Ver1.0
// YouTube API 연결 테스트용 스크립트

/**
 * 브라우저 콘솔에서 실행할 수 있는 YouTube API 테스트 스크립트
 * 다음과 같이 브라우저 콘솔에 붙여넣어 실행할 수 있습니다.
 */

// YouTube 트랜스크립트 API 호출 테스트
const testYouTubeApi = async () => {
  // 테스트용 YouTube URL
  const youtubeUrl = 'https://www.youtube.com/watch?v=T5va0A7wvHk';
  
  console.log('YouTube API 테스트 시작...');

  try {
    // 1. Firebase Functions URL을 사용한 테스트
    console.log('테스트 1: Firebase Functions URL 사용');
    const firebaseFunctionsUrl = 'https://us-central1-corpeasy-dev.cloudfunctions.net/api/youtube-transcript';
    
    console.log(`API 호출: ${firebaseFunctionsUrl}`);
    const response1 = await fetch(firebaseFunctionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: youtubeUrl })
    });
    
    const data1 = await response1.json();
    console.log('응답 결과 1:', data1);
    
    // 2. 상대 경로를 사용한 테스트
    console.log('테스트 2: 상대 경로 사용');
    const relativeUrl = '/api/youtube-transcript';
    
    console.log(`API 호출: ${relativeUrl}`);
    const response2 = await fetch(relativeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: youtubeUrl })
    });
    
    const data2 = await response2.json();
    console.log('응답 결과 2:', data2);
    
    // 3. GET 방식 트랜스크립트 테스트
    console.log('테스트 3: GET 방식 트랜스크립트 호출');
    const transcriptUrl = `https://us-central1-corpeasy-dev.cloudfunctions.net/api/youtube-transcript/transcript?url=${encodeURIComponent(youtubeUrl)}`;
    
    console.log(`API 호출: ${transcriptUrl}`);
    const response3 = await fetch(transcriptUrl);
    
    const data3 = await response3.json();
    console.log('응답 결과 3:', data3);
    
    return {
      test1: data1,
      test2: data2,
      test3: data3
    };
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
    return { error: error.message };
  }
};

// 테스트 실행 (콘솔에서 복사 후 실행)
testYouTubeApi().then(results => {
  console.log('모든 테스트 완료:', results);
});