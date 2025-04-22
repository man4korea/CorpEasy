// 📁 frontend/src/App.tsx
// Create at 2504201520 Ver1.3

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AnalyzeInputPage from './pages/AnalyzeInputPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import CorpEasyBlogPage from './pages/CorpEasyBlogPage';
import ContentAnalysisPage from './pages/ContentAnalysisPage';
import BlogDetailPage from './pages/BlogDetailPage';
import Dashboard from './pages/Dashboard';
import { Coji } from './pages/Coji';
import ContentAnalyzerPage from './pages/ContentAnalyzerPage';


// API 테스트 페이지 import
import GPT35 from './pages/GPT35';
import GPT4 from './pages/GPT4';
import GeminiPage from './pages/GeminiPage'; // 업데이트된 Gemini 페이지
import Claude from './pages/Claude';
import HaikuPage from './pages/HaikuPage'; // Haiku 페이지

// 신규 추가된 페이지 
const PromptGenerator = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">프롬프트 생성기</h1><p>효과적인 AI 프롬프트를 자동으로 생성하는 도구입니다.</p></div>;
const BizCounsel = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">경영 고민 상담소</h1><p>비즈니스 문제에 대한 AI 기반 전문 상담 서비스입니다.</p></div>;
const Community = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">동종업종 커뮤니티</h1><p>업종별 네트워킹 및 정보 공유 플랫폼입니다.</p></div>;
const YoutubeContent = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">유튜브 콘텐츠</h1><p>카테고리별 분석된 유튜브 콘텐츠 모음입니다.</p></div>;

// 아직 구현되지 않은 페이지를 위한 임시 컴포넌트
const TrendAlerts = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">업계 트렌드 알리미</h1><p>맞춤형 트렌드 모니터링 및 알림 서비스입니다.</p></div>;
const CreativeStudio = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">크리에이티브 스튜디오</h1><p>콘텐츠 제작 도구 모음입니다.</p></div>;
const DataAnalyzer = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">데이터 분석기</h1><p>업로드된 데이터 자동 분석 도구입니다.</p></div>;
const ReportGenerator = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">리포트 생성기</h1><p>맞춤형 비즈니스 리포트 생성 도구입니다.</p></div>;
const DecisionSupport = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">의사결정 지원</h1><p>AI 기반 비즈니스 의사결정 지원 서비스입니다.</p></div>;
const ChatbotBuilder = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">AI 비서 생성기</h1><p>맞춤형 AI 챗봇 생성 도구입니다.</p></div>;
const AiHelper = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">AI 활용 도우미</h1><p>AI 도구 활용 가이드입니다.</p></div>;
const Settings = () => <div className="container mx-auto p-6"><h1 className="text-2xl font-bold mb-4">설정</h1><p>시스템 설정 페이지입니다.</p></div>;

// API 테스트 메인 페이지
const ApiTestDashboard = () => (
  <div className="container mx-auto p-6">
    <h1 className="text-2xl font-bold mb-4">API 테스트 대시보드</h1>
    <p className="mb-6">다양한 AI API의 기능 및 성능을 테스트할 수 있는 페이지입니다.</p>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2 text-blue-600">OpenAI GPT-3.5</h2>
        <p className="text-gray-600 mb-4">빠르고 비용 효율적인 모델로 일반적인 질문과 답변에 적합합니다.</p>
        <a href="/api-test/gpt35" className="text-blue-500 hover:text-blue-700 font-medium">테스트 하기 →</a>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2 text-purple-600">OpenAI GPT-4</h2>
        <p className="text-gray-600 mb-4">고급 추론과 복잡한 작업에 뛰어난 성능을 제공합니다.</p>
        <a href="/api-test/gpt4" className="text-purple-500 hover:text-purple-700 font-medium">테스트 하기 →</a>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2 text-indigo-600">Anthropic Claude</h2>
        <p className="text-gray-600 mb-4">긴 맥락 처리와 자연스러운 대화에 최적화되어 있습니다.</p>
        <a href="/api-test/claude" className="text-indigo-500 hover:text-indigo-700 font-medium">테스트 하기 →</a>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2 text-green-600">Google Gemini</h2>
        <p className="text-gray-600 mb-4">여러 Gemini 모델을 선택하여 테스트할 수 있습니다.</p>
        <a href="/api-test/gemini" className="text-green-500 hover:text-green-700 font-medium">테스트 하기 →</a>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2 text-cyan-600">Claude Haiku</h2>
        <p className="text-gray-600 mb-4">빠른 속도와 저렴한 비용의 경량화 Claude 모델입니다.</p>
        <a href="/api-test/haiku" className="text-cyan-500 hover:text-cyan-700 font-medium">테스트 하기 →</a>
      </div>
    </div>
  </div>
);

/**
 * App 컴포넌트
 * 라우팅 설정 및 메인 레이아웃 구성
 * 우리가 디자인한 UI/UX 스타일과 레이아웃 사용
 */
const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* 기본 레이아웃 - 우리가 디자인한 사이드바와 톱바 적용 */}
        <Route path="/" element={<Layout />}>
          {/* 대시보드 */}
          <Route index element={<Dashboard />} />
          
          {/* 콘텐츠 상세분석기 */}
          <Route path="analyze" element={<AnalyzeInputPage />} />
          <Route path="content-analyzer" element={<AnalyzeInputPage />} />
          <Route path="content-analyzer" element={<ContentAnalyzerPage />} />
          <Route path="content-analysis/:id" element={<ContentAnalysisPage />} />
          
          {/* 지식정보창고 */}
          <Route path="knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="blog" element={<CorpEasyBlogPage />} />
          <Route path="blog/:id" element={<BlogDetailPage />} />
          <Route path="youtube-content" element={<YoutubeContent />} />
          
          {/* 업계 트렌드 알리미 */}
          <Route path="trend-alerts" element={<TrendAlerts />} />
          
          {/* 크리에이티브 스튜디오 */}
          <Route path="creative/*" element={<CreativeStudio />} />
          
          {/* 비즈 애널리틱스 */}
          <Route path="analytics">
            <Route index element={<Navigate to="/analytics/data-analyzer" replace />} />
            <Route path="data-analyzer" element={<DataAnalyzer />} />
            <Route path="report-generator" element={<ReportGenerator />} />
            <Route path="decision-support" element={<DecisionSupport />} />
          </Route>
          
          {/* AI 비서 생성기 */}
          <Route path="chatbot-builder" element={<ChatbotBuilder />} />
          
          {/* 신규 추가된 메뉴 */}
          <Route path="prompt-generator" element={<PromptGenerator />} />
          <Route path="biz-counsel" element={<BizCounsel />} />
          <Route path="community" element={<Community />} />
          
          {/* AI 활용 도우미 */}
          <Route path="ai-helper/*" element={<AiHelper />} />
          
          {/* 설정 */}
          <Route path="settings/*" element={<Settings />} />
          
          {/* API 테스트 - 설정의 서브메뉴 */}
          <Route path="settings/api-test">
            <Route index element={<ApiTestDashboard />} />
            <Route path="gpt35" element={<GPT35 />} />
            <Route path="gpt4" element={<GPT4 />} />
            <Route path="claude" element={<Claude />} />
            <Route path="gemini" element={<GeminiPage />} />
            <Route path="haiku" element={<HaikuPage />} />
          </Route>
          
          {/* API 테스트 - 개발자용 직접 접근 경로 */}
          <Route path="api-test">
            <Route index element={<ApiTestDashboard />} />
            <Route path="gpt35" element={<GPT35 />} />
            <Route path="gpt4" element={<GPT4 />} />
            <Route path="claude" element={<Claude />} />
            <Route path="gemini" element={<GeminiPage />} />
            <Route path="haiku" element={<HaikuPage />} />
          </Route>
        </Route>
        
        {/* 404 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* 코지 챗봇은 전역으로 표시 - 유지 */}
      <Coji />
    </Router>
  );
};

export default App;