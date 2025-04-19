// 📁 frontend/src/components/Layout.tsx
// Create at 2504191815

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Coji } from '../pages/Coji';

/**
 * 레이아웃 컴포넌트
 * 사이드바 기본 숨김 상태, 햄버거 버튼으로 토글
 */
const Layout: React.FC = () => {
  // 사이드바 표시 상태 (기본값: 숨김)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // 유저 정보 (실제 구현에서는 Context나 Redux 등으로 관리)
  const isLoggedIn = true;
  const userTier = 'gold';
  const userName = '홍길동';
  
  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* 사이드바 - 기본적으로 숨겨짐 */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* 오버레이 - 사이드바 표시 시 배경 어둡게 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-30 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-col h-full">
        {/* 상단바 */}
        <Topbar 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen}
          isLoggedIn={isLoggedIn}
          userTier={userTier}
          userName={userName}
        />
        
        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* 코지 챗봇 */}
      <Coji />
    </div>
  );
};

export default Layout;