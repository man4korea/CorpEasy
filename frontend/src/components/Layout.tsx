// 📁 frontend/src/components/Layout.tsx
// Create at 2504191650

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Coji } from '../pages/Coji'; // 기존의 Coji 컴포넌트 임포트

/**
 * 레이아웃 컴포넌트
 * 사이드바, 탑바 및 메인 콘텐츠 영역을 포함하는 전체 레이아웃
 */
const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // 로그인 상태 및 사용자 정보 (실제 구현에서는 Context나 Redux 등으로 관리)
  const isLoggedIn = true; // 임시로 로그인 상태로 설정
  const userTier = 'gold'; // 임시로 골드 회원으로 설정
  const userName = '홍길동'; // 임시 사용자 이름
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 사이드바 */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 탑바 */}
        <Topbar 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen}
          isLoggedIn={isLoggedIn}
          userTier={userTier}
          userName={userName}
        />
        
        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-6 bg-white md:ml-0">
          <div className="container mx-auto">
            <Outlet />
          </div>
        </main>
        
        {/* 코지 챗봇 (기존 컴포넌트 사용) */}
        <Coji />
      </div>
      
      {/* 모바일에서 사이드바가 열렸을 때 오버레이 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;