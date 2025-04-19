// 📁 frontend/src/components/Sidebar.tsx
// Create at 2504191642

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  DocumentTextIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

/**
 * 미니멀리스트 사이드바 컴포넌트
 * CorpEasy UI/UX 가이드라인 준수
 */
const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const [expandedMenu, setExpandedMenu] = useState<string | null>('비즈 애널리틱스');
  const location = useLocation();
  
  // 메뉴 토글 함수
  const toggleMenu = (menuName: string) => {
    if (expandedMenu === menuName) {
      setExpandedMenu(null);
    } else {
      setExpandedMenu(menuName);
    }
  };
  
  // 현재 활성화된 메뉴 확인
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div 
      className={`fixed inset-y-0 left-0 transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 z-30 w-64 bg-white transition-transform duration-200 ease-in-out overflow-y-auto`}
    >
      {/* 로고 영역 */}
      <div className="p-6 border-b border-gray-100">
        <Link to="/" className="text-blue-500 text-3xl font-bold" style={{ fontFamily: 'Pacifico, cursive', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)', letterSpacing: '0.5px' }}>
          CorpEasy
        </Link>
      </div>

      {/* 메뉴 영역 */}
      <nav className="p-4">
        <ul className="space-y-4">
          {/* 대시보드 */}
          <li>
            <Link 
              to="/" 
              className={`flex items-center p-3 rounded-md ${
                isActive('/') ? 'bg-blue-50 text-blue-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <PlusIcon className="w-6 h-6 mr-3" />
              <span className="text-base font-medium">대시보드</span>
            </Link>
          </li>
          
          {/* 콘텐츠 상세분석기 */}
          <li>
            <Link 
              to="/content-analyzer" 
              className={`flex items-center p-3 rounded-md ${
                isActive('/content-analyzer') ? 'bg-blue-50 text-blue-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MagnifyingGlassIcon className="w-6 h-6 mr-3" />
              <span className="text-base font-medium">콘텐츠 상세분석기</span>
            </Link>
          </li>
          
          {/* 지식정보 블로그 */}
          <li>
            <Link 
              to="/knowledge-blog" 
              className={`flex items-center p-3 rounded-md ${
                isActive('/knowledge-blog') ? 'bg-blue-50 text-blue-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ClipboardDocumentIcon className="w-6 h-6 mr-3" />
              <span className="text-base font-medium">지식정보 블로그</span>
            </Link>
          </li>
          
          {/* 업계 트렌드 알리미 */}
          <li>
            <Link 
              to="/trend-alerts" 
              className={`flex items-center justify-between p-3 rounded-md ${
                isActive('/trend-alerts') ? 'bg-blue-50 text-blue-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <ClockIcon className="w-6 h-6 mr-3" />
                <span className="text-base font-medium">업계 트렌드 알리미</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                NEW
              </span>
            </Link>
          </li>
          
          {/* 크리에이티브 스튜디오 */}
          <li>
            <button 
              onClick={() => toggleMenu('크리에이티브 스튜디오')}
              className={`flex items-center justify-between w-full p-3 rounded-md text-left ${
                expandedMenu === '크리에이티브 스튜디오' ? 'bg-blue-50 text-blue-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <DocumentTextIcon className="w-6 h-6 mr-3" />
                <span className="text-base font-medium">크리에이티브 스튜디오</span>
              </div>
              <ChevronRightIcon className={`w-5 h-5 transition-transform ${expandedMenu === '크리에이티브 스튜디오' ? 'rotate-90' : ''}`} />
            </button>
          </li>
          
          {/* 비즈 애널리틱스 */}
          <li>
            <button 
              onClick={() => toggleMenu('비즈 애널리틱스')}
              className={`flex items-center justify-between w-full p-3 rounded-md text-left ${
                expandedMenu === '비즈 애널리틱스' ? 'bg-blue-50 text-blue-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <ChartBarSquareIcon className="w-6 h-6 mr-3" />
                <span className="text-base font-medium">비즈 애널리틱스</span>
              </div>
              <ChevronUpIcon className={`w-5 h-5 transition-transform ${expandedMenu !== '비즈 애널리틱스' ? 'rotate-180' : ''}`} />
            </button>
            
            {/* 비즈 애널리틱스 하위메뉴 */}
            {expandedMenu === '비즈 애널리틱스' && (
              <ul className="mt-2 ml-4 space-y-2">
                <li>
                  <Link 
                    to="/analytics/data-analyzer" 
                    className={`flex items-center p-3 rounded-md ${
                      isActive('/analytics/data-analyzer') ? 'bg-blue-50 text-blue-500' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">데이터 분석기</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/analytics/report-generator" 
                    className={`flex items-center p-3 rounded-md ${
                      isActive('/analytics/report-generator') ? 'bg-blue-50 text-blue-500' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">리포트 생성기</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/analytics/decision-support" 
                    className={`flex items-center justify-between p-3 rounded-md ${
                      isActive('/analytics/decision-support') ? 'bg-blue-50 text-blue-500' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">의사결정 지원</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Premium
                    </span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
          
          {/* AI 비서 생성기 */}
          <li>
            <Link 
              to="/chatbot-builder" 
              className={`flex items-center p-3 rounded-md ${
                isActive('/chatbot-builder') ? 'bg-blue-50 text-blue-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ChatBubbleLeftRightIcon className="w-6 h-6 mr-3" />
              <span className="text-base font-medium">AI 비서 생성기</span>
            </Link>
          </li>
          
          {/* AI 활용 도우미 */}
          <li>
            <button 
              onClick={() => toggleMenu('AI 활용 도우미')}
              className={`flex items-center justify-between w-full p-3 rounded-md text-left ${
                expandedMenu === 'AI 활용 도우미' ? 'bg-blue-50 text-blue-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <QuestionMarkCircleIcon className="w-6 h-6 mr-3" />
                <span className="text-base font-medium">AI 활용 도우미</span>
              </div>
              <ChevronRightIcon className={`w-5 h-5 transition-transform ${expandedMenu === 'AI 활용 도우미' ? 'rotate-90' : ''}`} />
            </button>
          </li>
          
          {/* 설정 */}
          <li>
            <button 
              onClick={() => toggleMenu('설정')}
              className={`flex items-center justify-between w-full p-3 rounded-md text-left ${
                expandedMenu === '설정' ? 'bg-blue-50 text-blue-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <Cog6ToothIcon className="w-6 h-6 mr-3" />
                <span className="text-base font-medium">설정</span>
              </div>
              <ChevronRightIcon className={`w-5 h-5 transition-transform ${expandedMenu === '설정' ? 'rotate-90' : ''}`} />
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;