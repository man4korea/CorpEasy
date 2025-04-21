async function sendMessage() {
  try {
    console.log('1. 메시지 전송 시작:', userInput);
    
    const response = await fetch('http://localhost:3002/api/askGPT', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: userInput }),
    });
    
    console.log('2. 서버 응답 받음:', response.status);
    const data = await response.json();
    console.log('3. 응답 데이터:', data);
    
    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status} - ${data.error || '알 수 없는 오류'}`);
    }
    
    // 응답 처리
    messages.value.push({
      role: 'assistant',
      content: data.response.content
    });
    
  } catch (error) {
    console.error('API 호출 오류:', error);
    messages.value.push({
      role: 'assistant',
      content: '죄송합니다. 오류가 발생했습니다: ' + error.message
    });
  }
} 