// 📁 frontend/src/components/Topbar.tsx
// Create at 2504191615

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bars3Icon,
  BellIcon, 
  UserCircleIcon, 
  ChevronDownIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  UserIcon
} from '@heroicons/react/24/outline';

type TopbarProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isLoggedIn?: boolean;
  userTier?: 'silver' | 'gold';
  userName?: string;
};

/**
 * 상단 메뉴바 컴포넌트
 * CorpEasy UI/UX 가이드라인을 준수하는 상단 네비게이션 바
 */
const Topbar: React.FC<TopbarProps> = ({ 
  isOpen, 
  setIsOpen, 
  isLoggedIn = false, 
  userTier = 'silver',
  userName = ''
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // 로그인 상태에 따라 사용자 프로필 아이콘의 색상 결정
  const getUserTierColor = () => {
    switch (userTier) {
      case 'gold':
        return '#F59E0B'; // amber-500
      case 'silver':
      default:
        return '#9CA3AF'; // gray-400
    }
  };

  return (
    <header className="bg-white text-gray-700 border-b border-gray-200 shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 왼쪽 영역: 햄버거 메뉴 + 로고 */}
          <div className="flex items-center space-x-4">
            {/* 햄버거 메뉴 (모바일/데스크탑 모두 표시) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
              aria-label="메뉴"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            {/* 로고 */}
            <Link to="/" className="text-blue-500 text-xl font-bold" style={{ fontFamily: 'Pacifico, cursive', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)', letterSpacing: '0.5px' }}>
              CorpEasy
            </Link>
          </div>
          
          {/* 오른쪽 영역: 알림 및 사용자 프로필 */}
          <div className="flex items-center space-x-4">
            {/* 로그인한 경우 표시 */}
            {isLoggedIn ? (
              <>
                {/* 알림 아이콘 */}
                <div className="relative">
                  <button
                    className="p-1.5 rounded-full hover:bg-gray-100 focus:outline-none"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                  >
                    <BellIcon className="h-6 w-6 text-gray-500" />
                    {/* 알림이 있는 경우 표시되는 뱃지 */}
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                  </button>
                  
                  {/* 알림 드롭다운 */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 text-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium">알림</p>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <div className="px-4 py-3 hover:bg-gray-50">
                          <p className="text-sm font-medium">새로운 AI 모델 추가</p>
                          <p className="text-xs text-gray-500">Claude 3.5 Sonnet이 추가되었습니다.</p>
                        </div>
                        <div className="px-4 py-3 hover:bg-gray-50">
                          <p className="text-sm font-medium">업데이트 알림</p>
                          <p className="text-xs text-gray-500">시스템이 업데이트 되었습니다.</p>
                        </div>
                      </div>
                      <div className="px-4 py-2 border-t border-gray-100">
                        <a href="#" className="text-xs text-blue-500 hover:text-blue-600">모든 알림 보기</a>
                      </div>
                    </div>
                  )}
                </div>

                {/* 사용자 프로필 */}
                <div className="relative">
                  <button
                    className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <UserCircleIcon className="h-7 w-7" style={{ color: getUserTierColor() }} />
                    <span className="hidden md:block text-sm">{userName || '사용자'}</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                  
                  {/* 사용자 메뉴 드롭다운 */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 text-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium">{userName || '사용자'}</p>
                        <p className="text-xs text-gray-500">{userTier === 'gold' ? '골드 회원' : '실버 회원'}</p>
                      </div>
                      <Link 
                        to="/dashboard" 
                        className="flex items-center px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <HomeIcon className="h-5 w-5 mr-2 text-gray-500" />
                        대시보드
                      </Link>
                      <Link 
                        to="/settings/profile" 
                        className="flex items-center px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <UserIcon className="h-5 w-5 mr-2 text-gray-500" />
                        회원정보
                      </Link>
                      <Link 
                        to="/settings" 
                        className="flex items-center px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <CogIcon className="h-5 w-5 mr-2 text-gray-500" />
                        설정
                      </Link>
                      <div className="border-t border-gray-100"></div>
                      <button 
                        className="flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100 text-red-500"
                        onClick={() => {
                          // 로그아웃 로직
                          setUserMenuOpen(false);
                        }}
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                        로그아웃
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // 로그인하지 않은 경우 표시
              <div className="flex items-center space-x-2">
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-sm font-medium text-blue-500 border border-blue-500 rounded-md hover:bg-blue-50 transition-colors duration-200"
                >
                  로그인
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors duration-200"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;