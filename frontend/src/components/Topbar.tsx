// 📁 frontend/src/components/Topbar.tsx
// Create at 2504191810

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bars3Icon,
  BellIcon, 
  UserCircleIcon, 
  ChevronDownIcon,
  CogIcon,
  ArrowRightOnRectangleIcon
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
 * 햄버거 메뉴 버튼이 사이드바를 토글
 */
const Topbar: React.FC<TopbarProps> = ({ 
  isOpen, 
  setIsOpen, 
  isLoggedIn = true, 
  userTier = 'gold',
  userName = '홍길동'
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
    <header className="bg-white border-b border-gray-200 shadow-sm z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 왼쪽 영역: 햄버거 메뉴와 로고 */}
          <div className="flex items-center">
            {/* 햄버거 메뉴 버튼 */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
              aria-label="Open sidebar"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            {/* 로고 */}
            <Link 
              to="/" 
              className="ml-2 text-blue-500 text-xl font-bold"
              style={{ fontFamily: 'Pacifico, cursive', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)', letterSpacing: '0.5px' }}
            >
              CorpEasy
            </Link>
          </div>
          
          {/* 오른쪽 영역: 알림 및 사용자 메뉴 */}
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                {/* 알림 아이콘 */}
                <div className="relative">
                  <button
                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                  >
                    <div className="relative">
                      <BellIcon className="h-6 w-6" />
                      {/* 알림 표시 */}
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                    </div>
                  </button>
                  
                  {/* 알림 드롭다운 */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium">알림</p>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
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
                        <button className="text-xs text-blue-500 hover:text-blue-600">모든 알림 보기</button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 사용자 프로필 */}
                <div className="relative">
                  <button
                    className="flex items-center space-x-2 hover:text-gray-600"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <UserCircleIcon className="h-8 w-8" style={{ color: getUserTierColor() }} />
                    <span className="text-sm text-gray-700">{userName}</span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </button>
                  
                  {/* 사용자 메뉴 드롭다운 */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                      <div className="py-1">
                        <Link 
                          to="/profile" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          프로필
                        </Link>
                        <Link 
                          to="/settings" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          설정
                        </Link>
                        <div className="border-t border-gray-100"></div>
                        <button 
                          className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          로그아웃
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex space-x-2">
                <Link to="/login" className="btn-primary py-2 px-4 rounded-md text-sm">
                  로그인
                </Link>
                <Link to="/signup" className="bg-blue-500 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-600">
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

export default Topbar;// 📁 frontend/src/components/Topbar.tsx
// Create at 2504191810

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bars3Icon,
  BellIcon, 
  UserCircleIcon, 
  ChevronDownIcon,
  CogIcon,
  ArrowRightOnRectangleIcon
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
 * 햄버거 메뉴 버튼이 사이드바를 토글
 */
const Topbar: React.FC<TopbarProps> = ({ 
  isOpen, 
  setIsOpen, 
  isLoggedIn = true, 
  userTier = 'gold',
  userName = '홍길동'
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
    <header className="bg-white border-b border-gray-200 shadow-sm z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 왼쪽 영역: 햄버거 메뉴와 로고 */}
          <div className="flex items-center">
            {/* 햄버거 메뉴 버튼 */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
              aria-label="Open sidebar"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            {/* 로고 */}
            <Link 
              to="/" 
              className="ml-2 text-blue-500 text-xl font-bold"
              style={{ fontFamily: 'Pacifico, cursive', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)', letterSpacing: '0.5px' }}
            >
              CorpEasy
            </Link>
          </div>
          
          {/* 오른쪽 영역: 알림 및 사용자 메뉴 */}
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                {/* 알림 아이콘 */}
                <div className="relative">
                  <button
                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                  >
                    <div className="relative">
                      <BellIcon className="h-6 w-6" />
                      {/* 알림 표시 */}
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                    </div>
                  </button>
                  
                  {/* 알림 드롭다운 */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium">알림</p>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
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
                        <button className="text-xs text-blue-500 hover:text-blue-600">모든 알림 보기</button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 사용자 프로필 */}
                <div className="relative">
                  <button
                    className="flex items-center space-x-2 hover:text-gray-600"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <UserCircleIcon className="h-8 w-8" style={{ color: getUserTierColor() }} />
                    <span className="text-sm text-gray-700">{userName}</span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </button>
                  
                  {/* 사용자 메뉴 드롭다운 */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                      <div className="py-1">
                        <Link 
                          to="/profile" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          프로필
                        </Link>
                        <Link 
                          to="/settings" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          설정
                        </Link>
                        <div className="border-t border-gray-100"></div>
                        <button 
                          className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          로그아웃
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex space-x-2">
                <Link to="/login" className="btn-primary py-2 px-4 rounded-md text-sm">
                  로그인
                </Link>
                <Link to="/signup" className="bg-blue-500 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-600">
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