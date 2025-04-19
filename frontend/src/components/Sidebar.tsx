// 📁 frontend/src/components/Sidebar.tsx
// Create at 2504201425 Ver1.2

import React from 'react';
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
  XMarkIcon,
  CommandLineIcon,
  BriefcaseIcon,
  UserGroupIcon,
  BeakerIcon // API 테스트 아이콘 추가
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

/**
 * 사이드바 컴포넌트 - 기본 숨겨진 상태
 * 햄버거 버튼 클릭 시 표시됨
 */
const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>([]);
  const location = useLocation();
  
  // 메뉴 항목 토글 함수
  const toggleMenu = (menuName: string) => {
    if (expandedMenus.includes(menuName)) {
      setExpandedMenus(expandedMenus.filter(name => name !== menuName));
    } else {
      setExpandedMenus([...expandedMenus, menuName]);
    }
  };
  
  // 현재 경로 확인 유틸리티 함수
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // 메뉴 데이터 정의
  const menuItems = [
    {
      name: '대시보드',
      to: '/',
      icon: <PlusIcon className="h-5 w-5" />,
    },
    {
      name: '콘텐츠 상세분석기',
      to: '/content-analyzer',
      icon: <MagnifyingGlassIcon className="h-5 w-5" />,
    },
    {
      name: '지식정보창고',
      to: '/knowledge-base',
      icon: <ClipboardDocumentIcon className="h-5 w-5" />,
      submenu: [
        {
          name: 'CorpEasy 블로그',
          to: '/blog',
        },
        {
          name: '유튜브 콘텐츠',
          to: '/youtube-content',
        },
        {
          name: '지식정보창고',
          to: '/knowledge-base',
        }
      ]
    },
    {
      name: '업계 트렌드 알리미',
      to: '/trend-alerts',
      icon: <ClockIcon className="h-5 w-5" />,
      badge: "NEW"
    },
    {
      name: '크리에이티브 스튜디오',
      to: '/creative',
      icon: <DocumentTextIcon className="h-5 w-5" />,
      submenu: [
        {
          name: '카탈로그 제작기',
          to: '/creative/catalog-maker',
        },
        {
          name: '마케팅 콘텐츠 제작기',
          to: '/creative/marketing-content',
        },
        {
          name: '문서 생성기',
          to: '/creative/document-generator',
        }
      ]
    },
    {
      name: '비즈 애널리틱스',
      to: '/analytics',
      icon: <ChartBarSquareIcon className="h-5 w-5" />,
      submenu: [
        {
          name: '데이터 분석기',
          to: '/analytics/data-analyzer',
        },
        {
          name: '리포트 생성기',
          to: '/analytics/report-generator',
        },
        {
          name: '의사결정 지원',
          to: '/analytics/decision-support',
          badge: "Premium"
        }
      ]
    },
    {
      name: 'AI 비서 생성기',
      to: '/chatbot-builder',
      icon: <ChatBubbleLeftRightIcon className="h-5 w-5" />,
    },
    {
      name: '프롬프트 생성기',
      to: '/prompt-generator',
      icon: <CommandLineIcon className="h-5 w-5" />,
      badge: "NEW"
    },
    {
      name: '경영 고민 상담소',
      to: '/biz-counsel',
      icon: <BriefcaseIcon className="h-5 w-5" />,
    },
    {
      name: '동종업종 커뮤니티',
      to: '/community',
      icon: <UserGroupIcon className="h-5 w-5" />,
    },
    {
      name: 'AI 활용 도우미',
      to: '/ai-helper',
      icon: <QuestionMarkCircleIcon className="h-5 w-5" />,
      submenu: [
        {
          name: 'AI 활용 도우미',
          to: '/ai-helper/usage-guide',
        },
        {
          name: 'AI Agent 활용 도우미',
          to: '/ai-helper/agent-guide',
        }
      ]
    },
    {
      name: '설정',
      to: '/settings',
      icon: <Cog6ToothIcon className="h-5 w-5" />,
      submenu: [
        {
          name: '개인정보 설정',
          to: '/settings/profile',
        },
        {
          name: '알림 설정',
          to: '/settings/notifications',
        },
        {
          name: 'API 테스트',
          to: '/settings/api-test',
          submenu: [
            {
              name: 'GPT-3.5',
              to: '/settings/api-test/gpt35',
            },
            {
              name: 'GPT-4',
              to: '/settings/api-test/gpt4',
            },
            {
              name: 'Claude',
              to: '/settings/api-test/claude',
            },
            {
              name: 'Claude Haiku',
              to: '/settings/api-test/haiku',
            },
            {
              name: 'Gemini',
              to: '/settings/api-test/gemini',
            }
          ]
        }
      ]
    },
    // API 테스트 전용 메뉴 - 개발용 (별도로 분리)
    {
      name: 'API 테스트 (개발자)',
      to: '/api-test',
      icon: <BeakerIcon className="h-5 w-5" />,
      submenu: [
        {
          name: 'GPT-3.5',
          to: '/api-test/gpt35',
        },
        {
          name: 'GPT-4',
          to: '/api-test/gpt4',
        },
        {
          name: 'Claude',
          to: '/api-test/claude',
        },
        {
          name: 'Claude Haiku',
          to: '/api-test/haiku',
        },
        {
          name: 'Gemini',
          to: '/api-test/gemini',
        }
      ]
    }
  ];

  // 중첩 서브메뉴 렌더링 함수
  const renderSubmenu = (submenu: any[], level: number = 1) => {
    return (
      <div className={`ml-${level * 6} mt-1 mb-2 space-y-1`}>
        {submenu.map((subItem, subIndex) => (
          <div key={subIndex}>
            {subItem.submenu ? (
              // 서브메뉴가 있는 경우
              <>
                <div 
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer ${
                    isActive(subItem.to) 
                      ? 'bg-blue-50 text-blue-500' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleMenu(subItem.name)}
                >
                  <span>{subItem.name}</span>
                  <ChevronRightIcon 
                    className={`w-4 h-4 transition-transform ${
                      expandedMenus.includes(subItem.name) ? 'rotate-90' : ''
                    }`} 
                  />
                </div>
                {expandedMenus.includes(subItem.name) && renderSubmenu(subItem.submenu, level + 1)}
              </>
            ) : (
              // 서브메뉴가 없는 경우
              <Link
                to={subItem.to}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                  isActive(subItem.to) 
                    ? 'bg-blue-50 text-blue-500' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <span>{subItem.name}</span>
                {subItem.badge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {subItem.badge}
                  </span>
                )}
              </Link>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      className={`fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* 닫기 버튼 */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
          aria-label="Close sidebar"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
      
      {/* 로고 */}
      <div className="py-3 px-6 mt-0">
        <Link to="/" className="text-blue-500 text-2xl font-bold" style={{ fontFamily: 'Pacifico, cursive', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)', letterSpacing: '0.5px' }}>
          CorpEasy
        </Link>
      </div>
      
      {/* 메뉴 목록 */}
      <nav className="mt-5 px-4 overflow-y-auto max-h-[calc(100vh-80px)]">
        {menuItems.map((item, index) => (
          <div key={index} className="mb-2">
            {/* 메인 메뉴 항목 */}
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer ${
                isActive(item.to) 
                  ? 'bg-blue-50 text-blue-500' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => item.submenu ? toggleMenu(item.name) : setIsOpen(false)}
            >
              <Link
                to={item.to}
                className="flex items-center flex-grow"
                onClick={(e) => item.submenu && e.preventDefault()}
              >
                <span className="mr-3 text-gray-500">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
              
              {item.badge && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {item.badge}
                </span>
              )}
              
              {item.submenu && (
                <ChevronRightIcon 
                  className={`w-5 h-5 transition-transform ${
                    expandedMenus.includes(item.name) ? 'rotate-90' : ''
                  }`} 
                />
              )}
            </div>
            
            {/* 서브메뉴 - 중첩 메뉴 지원 */}
            {item.submenu && expandedMenus.includes(item.name) && renderSubmenu(item.submenu)}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;