// 📁 frontend/src/App.tsx
// Context API를 적용한 App 컴포넌트

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Layout from './components/Layout';
import Claude from './pages/Claude';
import GeminiPage from './pages/GeminiPage';
import GPT35 from './pages/GPT35';
import GPT4 from './pages/GPT4';
import GrokPage from './pages/GrokPage';
import AnalyzeInputPage from './pages/AnalyzeInputPage';
import { Coji } from './pages/Coji';
//import FirestoreTest from './components/FirestoreTest';

import { ClaudeProvider } from './contexts/ClaudeContext';

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex h-screen">
        <Sidebar />
        <Layout>
          <Routes>
            <Route path="/" element={<AnalyzeInputPage />} />
            <Route path="/claude" element={
              <ClaudeProvider>
                <Claude />
              </ClaudeProvider>
            } />
            <Route path="/gemini" element={<GeminiPage />} />
            <Route path="/gpt35" element={<GPT35 />} />
            <Route path="/gpt4" element={<GPT4 />} />
            <Route path="/grok" element={<GrokPage />} />
            <Route path="/analyze" element={<AnalyzeInputPage />} />
          </Routes>
        </Layout>
        <Coji />
      </div>
    </Router>
  );
};

export default App;