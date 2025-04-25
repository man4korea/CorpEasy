// 📁 js/app.js
// Create at 2504251015 Ver1.2

// Cozy 채팅 모듈 import (모듈은 반드시 최상단에)
import { initializeCozyChat } from './cozy.js';

// ********************************************
// 1) Cozy 버튼 클릭은 무조건 잡아내기 위한 위임 이벤트
// ********************************************
// 이 리스너는 문서 로드와 관계없이 첫 클릭부터 #cozyButton을 감지합니다.
document.addEventListener('click', (e) => {
  if (e.target.closest('#cozyButton')) {
    const chat = document.getElementById('cozyChat');
    if (chat) {
      chat.classList.toggle('show');
    }
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

  // 요소가 없으면 에러 로그
  Object.entries(elements).forEach(([key, element]) => {
    if (!element && key !== 'notificationToggle' && key !== 'notificationDropdown' && key !== 'userMenuToggle' && key !== 'userDropdown') {
      console.warn(`Element not found: ${key}`);
    }
  });

  return elements;
}

// 사이드바 초기화
function initializeSidebar() {
  const elements = initializeElements();
  const { sidebar, sidebarToggle, sidebarOverlay, closeSidebarBtn } = elements;

  if (!sidebar || !sidebarToggle || !sidebarOverlay) {
    console.warn('Sidebar elements not found');
    return;
  }

  // 사이드바 토글 이벤트
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
  });

  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    });
  }

  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  });

  // 서브메뉴 토글
  document.querySelectorAll('.has-submenu').forEach(submenu => {
    const menuItem = submenu.querySelector('.menu-item');
    if (menuItem) {
      menuItem.addEventListener('click', (e) => {
        e.preventDefault();
        submenu.classList.toggle('active');
      });
    }
  });
}

// 컴포넌트가 로드된 후 이벤트 핸들러 초기화
function initializeAfterLoad() {
  try {
    // 사이드바 초기화
    initializeSidebar();

    // Cozy 채팅 안정적 초기화 (500ms 간격 재시도)
    const tryInitCozy = () => {
      if (!initializeCozyChat()) {
        console.warn('Cozy 초기화 실패. 500ms 후 재시도');
        setTimeout(tryInitCozy, 500);
      }
    };
    tryInitCozy();

  } catch (error) {
    console.error('초기화 중 오류 발생:', error);
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeAfterLoad, 100);
});

// 컴포넌트가 동적으로 로드될 때마다 이벤트 핸들러 재초기화
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      setTimeout(initializeAfterLoad, 100);
      break;
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 전역 노출
window.initializeAfterLoad = initializeAfterLoad;
