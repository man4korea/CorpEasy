// 📁 src/components/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-gray-700' : '';
  };

  return (
    <div className="w-64 bg-gray-800 text-white p-6">
      <h1 className="text-2xl font-bold mb-8">AI Services</h1>
      <nav className="space-y-2">
        {/* ✅ 최상단에 추가된 메뉴 */}
        <Link
          to="/analyze"
          className={`flex items-center space-x-2 p-2 rounded hover:bg-gray-700 ${isActive('/analyze')}`}
        >
          <span className="text-pink-400">🧩</span>
          <span>AI 콘텐츠 심층분석기</span>
        </Link>

        <Link
          to="/gpt35"
          className={`flex items-center space-x-2 p-2 rounded hover:bg-gray-700 ${isActive('/gpt35')}`}
        >
          <span className="text-blue-400">💻</span>
          <span>OpenAI GPT-3.5</span>
        </Link>
        <Link
          to="/gpt4"
          className={`flex items-center space-x-2 p-2 rounded hover:bg-gray-700 ${isActive('/gpt4')}`}
        >
          <span className="text-purple-400">🧠</span>
          <span>OpenAI GPT-4</span>
        </Link>
        <Link
          to="/claude"
          className={`flex items-center space-x-2 p-2 rounded hover:bg-gray-700 ${isActive('/claude')}`}
        >
          <span className="text-yellow-400">✨</span>
          <span>Claude (Anthropic)</span>
        </Link>
        <Link
          to="/gemini"
          className={`flex items-center space-x-2 p-2 rounded hover:bg-gray-700 ${isActive('/gemini')}`}
        >
          <span className="text-green-400">🌐</span>
          <span>Google Gemini</span>
        </Link>
        <Link
          to="/grok"
          className={`flex items-center space-x-2 p-2 rounded hover:bg-gray-700 ${isActive('/grok')}`}
        >
          <span className="text-sky-400">🌠</span>
          <span>Grok 3 (xAI)</span>
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar;
