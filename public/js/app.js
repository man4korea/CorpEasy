// 📁 public/js/app.js
// Create at 2504270455 Ver1.7

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
 * 사이드바 닫기 함수
 */
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (sidebar && sidebarOverlay) {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  }
}

/**
 * 동적으로 로드된 스크립트 실행 함수
 * @param {HTMLElement} container - 스크립트를 포함하는 컨테이너 요소
 */
function executeScripts(container) {
  // 기존 스크립트 태그를 찾아서 새로운 스크립트로 대체
  const scripts = container.querySelectorAll('script');
  scripts.forEach(oldScript => {
    // 새 스크립트 요소 생성
    const newScript = document.createElement('script');
    
    // 속성 복사
    Array.from(oldScript.attributes).forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });
    
    // 내용 복사
    newScript.innerHTML = oldScript.innerHTML;
    
    // 이전 스크립트 제거 후 새 스크립트 삽입
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
  
  console.log(`${scripts.length}개의 스크립트 실행됨`);
}

/**
 * 컴포넌트 로딩 함수
 * @param {string} componentName - 로드할 컴포넌트의 이름
 * @returns {Promise<boolean>} - 컴포넌트 로드 성공 여부
 */
async function loadComponent(componentName) {
  // 컴포넌트별 컨테이너 ID 매핑
  const containerMapping = {
    'Dashboard': 'dashboardComponent',
    'ContentAnalyzer': 'contentAnalyzerComponent',
    'test': 'contentAnalyzerComponent' // 테스트용 컴포넌트도 contentAnalyzerComponent에 로드
  };
  
  // 컴포넌트별 컨테이너 ID 결정
  const containerId = containerMapping[componentName] || 'dashboardComponent';
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.error(`컨테이너를 찾을 수 없음: ${containerId}`);
    return false;
  }

  try {
    console.log(`${componentName} 컴포넌트 로드 시작 (컨테이너: ${containerId})`);
    
    // 모든 .main-content 요소 숨기기
    document.querySelectorAll('.main-content').forEach(el => {
      el.style.display = 'none';
    });
    
    // 스피너 표시
    container.innerHTML = '<div class="flex items-center justify-center" style="height: 200px;"><div class="spinner"></div></div>';
    container.style.display = 'block';
    
    // 컴포넌트 로드
    const response = await fetch(`/components/${componentName}.html`);
    if (!response.ok) {
      throw new Error(`컴포넌트 로드 실패: ${componentName} (${response.status})`);
    }
    
    const html = await response.text();
    container.innerHTML = html;
    
    // 동적으로 로드된 스크립트 실행
    executeScripts(container);
    
    // 컴포넌트 로드 후 이벤트 발생
    console.log(`컴포넌트 ${componentName} 로드 완료, component-loaded 이벤트 발생`);
    window.dispatchEvent(new Event('component-loaded'));
    
    // 사이드바 메뉴 활성화 상태 업데이트
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
      item.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-component="${componentName}"]`);
    if (activeLink) {
      activeLink.closest('li').classList.add('active');
    }
    
    // 모바일에서 사이드바 닫기
    closeSidebar();
    
    return true;
  } catch (error) {
    console.error('컴포넌트 로드 오류:', error);
    container.innerHTML = `<div class="alert alert-danger">컴포넌트를 로드하는 중 오류가 발생했습니다: ${error.message}</div>`;
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

  closeSidebarBtn?.addEventListener('click', closeSidebar);

  sidebarOverlay.addEventListener('click', closeSidebar);

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
        // 먼저 사이드바 닫기
        closeSidebar();
        // 그 다음 컴포넌트 로드
        loadComponent(componentName);
      }
    });
  });
  
  // 콘텐츠 상세분석기 링크 특별 처리 (data-component 속성이 없는 경우를 위해)
  const contentAnalyzerLink = document.querySelector('.sidebar-nav li:nth-child(2) .menu-item');
  if (contentAnalyzerLink && !contentAnalyzerLink.hasAttribute('data-component')) {
    contentAnalyzerLink.addEventListener('click', (e) => {
      e.preventDefault();
      // 먼저 사이드바 닫기
      closeSidebar();
      // 그 다음 컴포넌트 로드
      loadComponent('ContentAnalyzer');
    });
  }

  // 문서 클릭 이벤트 - 사이드바 외부 클릭 시 사이드바 닫기
  document.addEventListener('click', (e) => {
    // 사이드바와 토글 버튼이 아닌 곳을 클릭했을 때
    if (!e.target.closest('#sidebar') && !e.target.closest('#sidebarToggle')) {
      closeSidebar();
    }
  });

  // 마우스 이동 이벤트 - 사이드바 외부로 마우스 이동 시 사이드바 닫기
  document.addEventListener('mousemove', (e) => {
    // 사이드바와 토글 버튼이 아닌 곳으로 마우스 이동했을 때
    if (!e.target.closest('#sidebar') && !e.target.closest('#sidebarToggle')) {
      closeSidebar();
    }
  });
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
        document.querySelectorAll('.main-content[style*="display: block"]').length === 0) {
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