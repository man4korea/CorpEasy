// 📁 frontend/src/pages/Dashboard.tsx
// Create at 2504191750

import React, { useState } from 'react';
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  BellAlertIcon, 
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

/**
 * 대시보드 페이지
 * 주요 정보와 통계를 한눈에 보여주는 대시보드
 */
const Dashboard: React.FC = () => {
  // 데이터 상태 (실제 구현에서는 API로 가져올 값)
  const [statsData] = useState({
    contentAnalyzed: 158,
    blogPostsGenerated: 42,
    trendAlerts: 13,
    activeChatbots: 3
  });

  // 최근 분석 콘텐츠 (실제 구현에서는 API로 가져올 값)
  const [recentContent] = useState([
    { title: '중소기업 디지털 전환 전략', date: '2025-04-18', type: 'blog' },
    { title: 'AI 도입 성공 사례 분석', date: '2025-04-15', type: 'analysis' },
    { title: '2025년 마케팅 트렌드', date: '2025-04-12', type: 'blog' }
  ]);

  // 업계 트렌드 알림 (실제 구현에서는 API로 가져올 값)
  const [trendAlerts] = useState([
    { title: '인공지능 기술의 중소기업 적용', date: '2025-04-19', sentiment: 'positive' },
    { title: '디지털 마케팅 최신 동향', date: '2025-04-17', sentiment: 'neutral' },
    { title: '중소기업 지원 정책 변화', date: '2025-04-14', sentiment: 'positive' }
  ]);

  // AI 비서 활용 데이터 (실제 구현에서는 API로 가져올 값)
  const [chatbotStats] = useState({
    responsesGenerated: 1254,
    avgResponseTime: 0.8,
    customerSatisfaction: 4.7,
    improvementPercent: 32
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">대시보드</h1>
        <p className="text-gray-600">안녕하세요, 홍길동님! 오늘의 비즈니스 인사이트를 확인하세요.</p>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">분석된 콘텐츠</p>
              <p className="text-2xl font-bold text-gray-800">{statsData.contentAnalyzed}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <ChartBarIcon className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">생성된 블로그 포스트</p>
              <p className="text-2xl font-bold text-gray-800">{statsData.blogPostsGenerated}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DocumentTextIcon className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">트렌드 알림</p>
              <p className="text-2xl font-bold text-gray-800">{statsData.trendAlerts}</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-full">
              <BellAlertIcon className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">활성 AI 비서</p>
              <p className="text-2xl font-bold text-gray-800">{statsData.activeChatbots}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 데이터 카드 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 최근 분석 콘텐츠 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">최근 분석 콘텐츠</h2>
          <div className="space-y-4">
            {recentContent.map((content, index) => (
              <div key={index} className="flex items-start">
                <div className={`p-2 rounded-full mr-3 ${content.type === 'blog' ? 'bg-blue-100' : 'bg-green-100'}`}>
                  {content.type === 'blog' ? (
                    <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                  ) : (
                    <ChartBarIcon className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="text-gray-800 font-medium">{content.title}</p>
                  <p className="text-gray-500 text-sm">{content.date}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 text-sm text-blue-500 hover:text-blue-700">모든 콘텐츠 보기</button>
        </div>

        {/* 트렌드 알림 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">트렌드 알림</h2>
          <div className="space-y-4">
            {trendAlerts.map((alert, index) => (
              <div key={index} className="flex items-start">
                <div className={`p-2 rounded-full mr-3 ${
                  alert.sentiment === 'positive' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {alert.sentiment === 'positive' ? (
                    <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div>
                  <p className="text-gray-800 font-medium">{alert.title}</p>
                  <p className="text-gray-500 text-sm">{alert.date}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 text-sm text-blue-500 hover:text-blue-700">모든 알림 보기</button>
        </div>

        {/* AI 비서 활용 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">AI 비서 활용</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-gray-500 text-sm">생성된 응답</p>
              <p className="text-xl font-bold text-gray-800">{chatbotStats.responsesGenerated}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-gray-500 text-sm">평균 응답 시간</p>
              <p className="text-xl font-bold text-gray-800">{chatbotStats.avgResponseTime}초</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-gray-500 text-sm">고객 만족도</p>
              <p className="text-xl font-bold text-gray-800">{chatbotStats.customerSatisfaction}/5</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-gray-500 text-sm">응대율 향상</p>
              <p className="text-xl font-bold text-green-600">+{chatbotStats.improvementPercent}%</p>
            </div>
          </div>
          <button className="mt-4 text-sm text-blue-500 hover:text-blue-700">AI 비서 관리하기</button>
        </div>
      </div>

      {/* 비즈니스 데이터 분석 차트 영역 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">비즈니스 데이터 분석</h2>
        <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
          <p className="text-gray-400">여기에 비즈니스 데이터 차트가 표시됩니다.</p>
          <p className="text-gray-400 ml-2">(API 연결 필요)</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;