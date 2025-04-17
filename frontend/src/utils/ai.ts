import axios from 'axios';

// 환경변수에서 API 기본 URL 가져오기
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

export async function requestAI(
  model: string,
  prompt: string,
  options: any = {},
  useAxios: boolean = true // Axios를 사용할지 여부
) {
  const url = `${API_BASE_URL}/api/${model}`;

  try {
    if (useAxios) {
      // Axios 사용
      const response = await axios.post(url, { prompt, options });
      return response.data;
    } else {
      // Fetch 사용
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, options }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI 응답 실패');
      }

      return data.result || data.message || data.content;
    }
  } catch (err: any) {
    console.error('AI 요청 중 오류 발생:', err.message);
    throw err;
  }
}
