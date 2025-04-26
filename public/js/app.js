// 📁 public/js/app.js
// Create at 2504251115 Ver1.4

// Cozy 채팅 모듈 import (모듈은 반드시 최상단에)
import { initializeCozyChat } from './cozy.js';

// ********************************************
// 1) Cozy 버튼 클릭은 무조건 잡아내기 위한 위임 이벤트
// ********************************************
// 이 리스너는 문서 로드와 관계없이 첫 클릭부터 #cozyButton을 감지합니다.
document.addEventListener('click', (e) => {
  if (e.target.closest('#cozyButton')) {
    const chat = document.getElementById('cozyChat');
    if (chat) chat.classList.toggle('show');
  }
});

// Firebase 서비스
const auth = window.firebaseAuth;
const db = window.firebaseDB;

// DOM 요소들을 가져오는 함수
function initializeElements() {
  const elements = {
    sidebarToggle: document.getElementById('sidebarToggle'),
    notificationToggle: document.getElementById('notificationToggle'),
    userMenuToggle: document.getElementById('userMenuToggle'),
    notificationDropdown: document.getElementById('notificationDropdown'),
    userDropdown: document.getElementById('userDropdown'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    closeSidebarBtn: document.getElementById('closeSidebar'),
    menuItems: document.querySelectorAll('.menu-item'),
    hasSubmenuItems: document.querySelectorAll('.has-submenu')
  };

  // 요소가 없으면 디버그 레벨로 로깅
  Object.entries(elements).forEach(([key, el]) => {
    if (!el && !['notificationToggle','notificationDropdown','userMenuToggle','userDropdown'].includes(key)) {
      console.debug(`Element not found: ${key}`);
    }
  });

  return elements;
}

/**
 * 컴포넌트 로딩 함수
 * @param {string} componentName - 로드할 컴포넌트의 이름
 * @returns {Promise<boolean>} - 컴포넌트 로드 성공 여부
 */
async function loadComponent(componentName) {
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) {
    console.error('Main content area not found');
    return false;
  }

  try {
    // 스피너 표시
    mainContent.innerHTML = '<div class="flex items-center justify-center" style="height: 200px;"><div class="spinner"></div></div>';
    
    // 컴포넌트 로드
    const response = await fetch(`/components/${componentName}.html`);
    if (!response.ok) {
      throw new Error(`Failed to load component: ${componentName}`);
    }
    
    const html = await response.text();
    mainContent.innerHTML = html;
    
    // 사이드바 메뉴 활성화 상태 업데이트
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
      item.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-component="${componentName}"]`);
    if (activeLink) {
      activeLink.closest('li').classList.add('active');
    }
    
    // 모바일에서 사이드바 닫기
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (window.innerWidth < 768 && sidebar && sidebarOverlay) {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    }
    
    return true;
  } catch (error) {
    console.error('Error loading component:', error);
    mainContent.innerHTML = `<div class="alert alert-danger">컴포넌트를 로드하는 중 오류가 발생했습니다: ${error.message}</div>`;
    return false;
  }
}

// 사이드바 초기화
function initializeSidebar() {
  const { sidebar, sidebarToggle, sidebarOverlay, closeSidebarBtn } = initializeElements();

  if (!sidebar || !sidebarOverlay) {
    console.debug('Sidebar elements missing, skipping initialization');
    return;
  }

  // 사이드바 토글 이벤트
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
    });
  }

  closeSidebarBtn?.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  });

  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  });

  // 서브메뉴 토글
  document.querySelectorAll('.has-submenu').forEach(sub => {
    const menuItem = sub.querySelector('.menu-item');
    menuItem?.addEventListener('click', e => {
      e.preventDefault();
      sub.classList.toggle('open');
      const submenu = sub.querySelector('.submenu');
      if (submenu) {
        submenu.classList.toggle('show');
      }
    });
  });
  
  // 컴포넌트 로드 이벤트 추가
  document.querySelectorAll('.menu-item[data-component]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const componentName = item.getAttribute('data-component');
      if (componentName) {
        loadComponent(componentName);
      }
    });
  });
  
  // 콘텐츠 상세분석기 링크 특별 처리 (data-component 속성이 없는 경우를 위해)
  const contentAnalyzerLink = document.querySelector('.sidebar-nav li:nth-child(2) .menu-item');
  if (contentAnalyzerLink && !contentAnalyzerLink.hasAttribute('data-component')) {
    contentAnalyzerLink.addEventListener('click', (e) => {
      e.preventDefault();
      loadComponent('ContentAnalyzer');
    });
  }
}

// 컴포넌트가 로드된 후 이벤트 핸들러 초기화
function initializeAfterLoad() {
  try {
    initializeSidebar();

    // Cozy 채팅 안정적 초기화 (500ms 간격 재시도)
    const tryInitCozy = () => {
      if (!initializeCozyChat()) {
        console.debug('Cozy 초기화 실패, 500ms 후 재시도');
        setTimeout(tryInitCozy, 500);
      }
    };
    tryInitCozy();

    // 기본 컴포넌트 로드 (현재 없는 경우)
    if (document.querySelector('.main-content') && 
        document.querySelector('.main-content').children.length === 0) {
      loadComponent('Dashboard');
    }

  } catch (error) {
    console.error('초기화 중 오류 발생:', error);
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeAfterLoad, 100);
});

// 컴포넌트가 동적으로 로드될 때마다 이벤트 핸들러 재초기화
const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    if (m.addedNodes.length) {
      setTimeout(initializeAfterLoad, 100);
      break;
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// 전역 노출
window.initializeAfterLoad = initializeAfterLoad;
window.loadComponent = loadComponent; // 컴포넌트 로드 함수 전역 노출