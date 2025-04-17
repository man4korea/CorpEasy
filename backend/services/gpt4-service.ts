import fetch from 'node-fetch';

const GPT4_ENDPOINT = 'https://testgpt4-abcde-uc.a.run.app'; // ✅ 실제 배포 주소로 바꾸세요

export async function callAPI(prompt: string, options: any = {}) {
  const res = await fetch(GPT4_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt })
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`GPT-4 호출 실패: ${error}`);
  }

  const data = await res.json();
  return data.message || data.result || data.content;
}
