// 📁 frontend/src/App.tsx
// Create at 2504191500

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// 페이지 컴포넌트들 - 실제 페이지 컴포넌트로 교체 필요
import Claude from './pages/Claude';
import GPT35 from './pages/GPT35';
import GPT4 from './pages/GPT4';
import GeminiPage from './pages/GeminiPage';
import GrokPage from './pages/GrokPage';
import Coji from './pages/Coji';
import AnalyzeInputPage from './pages/AnalyzeInputPage';
// 아직 구현되지 않은 페이지를 위한 임시 컴포넌트
const Dashboard = () => <div className="p-4"><h1 className="text-2xl font-bold mb-4">대시보드</h1><p>대시보드 내용이 여기에 표시됩니다.</p></div>;
const YoutubeAnalyze = () => <div className="p-4"><h1 className="text-2xl font-bold mb-4">유튜브 분석</h1><p>유튜브 분석 내용이 여기에 표시됩니다.</p></div>;
const ApiKeysSettings = () => <div className="p-4"><h1 className="text-2xl font-bold mb-4">API 키 설정</h1><p>API 키 설정 내용이 여기에 표시됩니다.</p></div>;
const UserSettings = () => <div className="p-4"><h1 className="text-2xl font-bold mb-4">사용자 설정</h1><p>사용자 설정 내용이 여기에 표시됩니다.</p></div>;
const Profile = () => <div className="p-4"><h1 className="text-2xl font-bold mb-4">사용자 프로필</h1><p>사용자 프로필 내용이 여기에 표시됩니다.</p></div>;

/**
 * App 컴포넌트
 * 라우팅 설정 및 메인 레이아웃 구성
 */
const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* 대시보드 */}
          <Route index element={<Dashboard />} />
          
          {/* AI 도구 */}
          <Route path="ai">
            <Route index element={<Navigate to="/ai/claude" replace />} />
            <Route path="claude" element={<Claude />} />
            <Route path="gpt35" element={<GPT35 />} />
            <Route path="gpt4" element={<GPT4 />} />
            <Route path="gemini" element={<GeminiPage />} />
            <Route path="grok" element={<GrokPage />} />
            <Route path="coji" element={<Coji />} />
          </Route>
          
          {/* 분석 도구 */}
          <Route path="analyze">
            <Route index element={<Navigate to="/analyze/input" replace />} />
            <Route path="input" element={<AnalyzeInputPage />} />
            <Route path="youtube" element={<YoutubeAnalyze />} />
          </Route>
          
          {/* 설정 */}
          <Route path="settings">
            <Route index element={<Navigate to="/settings/api-keys" replace />} />
            <Route path="api-keys" element={<ApiKeysSettings />} />
            <Route path="user" element={<UserSettings />} />
          </Route>
          
          {/* 프로필 */}
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;