// 📁 src/pages/AnalyzeInputPage.tsx
import { useState } from 'react';
import axios from 'axios';

export default function AnalyzeInputPage() {
  const [input, setInput] = useState('');
  const [summary, setSummary] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;

    const isYouTubeUrl = input.includes('youtube.com/watch') || input.includes('youtu.be');

    if (isYouTubeUrl) {
      try {
        // 자막 추출 API 호출
        const res = await fetch(`http://localhost:3002/api/youtube-transcript?url=${encodeURIComponent(input)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '자막 추출 실패');

        // 자막을 Gemini API로 보내 요약 요청
        // 상대 경로로 API 호출 변경 (/api/gemini)
        const summaryRes = await axios.post('/api/gemini', {
          prompt: data.script, // 자막 내용 전달
          options: {
            model: 'gemini-1.5-pro',
            temperature: 0.7,
            maxTokens: 1000,
          },
        });

        // Gemini의 요약 결과 받기
        setSummary(`\n${data.title}\n\n${summaryRes.data?.content || 'No summary available'}`);
      } catch (err: any) {
        setSummary(`❗ 오류 발생: ${err.message}`);
      }
    } else {
      const formatted = `${input}`;
      setSummary(formatted);
    }

    setShowFollowUp(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="p-8 w-full">
      <div className="flex flex-col items-start">
        <h1 className="text-2xl font-bold mb-4">📘 AI 콘텐츠 심층분석기</h1>

        {/* 한 줄에 문장 + 입력창 + 버튼 */}
        <div className="flex items-center gap-4 w-full mb-10">
          <p className="text-gray-600 whitespace-nowrap">심층 분석할 대상을 입력하세요.</p>
          <input
            type="text"
            className="flex-grow p-2 border border-gray-300 rounded h-10"
            placeholder="URL 또는 텍스트 입력"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap"
            onClick={handleAnalyze}
          >
            요약해줘
          </button>
        </div>
      </div>

      {/* 결과 출력 */}
      <div className="min-h-[200px]">
        {summary && (
          <pre className="bg-gray-100 p-4 rounded mb-8 whitespace-pre-wrap text-sm">{summary}</pre>
        )}

        {showFollowUp && (
          <div className="flex flex-col items-center justify-center mt-10">
            <p className="text-lg font-medium mb-3">이 내용을 더 심층적으로 알아보고 싶으세요?</p>
            <div className="flex gap-4">
              <button className="bg-green-600 text-white px-6 py-2 rounded">네</button>
              <button className="bg-gray-400 text-white px-6 py-2 rounded">아니오</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}