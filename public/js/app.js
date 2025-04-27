// 📁 public/js/app.js
// Create at 2504280035 Ver1.8 (loadComponent 안전화 수정 버전)

import { initializeCozyChat } from './cozy.js';

document.addEventListener('click', (e) => {
  if (e.target.closest('#cozyButton')) {
    const chat = document.getElementById('cozyChat');
    if (chat) chat.classList.toggle('show');
  }
});

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

  Object.entries(elements).forEach(([key, el]) => {
    if (!el && !['notificationToggle','notificationDropdown','userMenuToggle','userDropdown'].includes(key)) {
      console.debug(`Element not found: ${key}`);
    }
  });

  return elements;
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (sidebar && sidebarOverlay) {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  }
}

function executeScripts(container) {
  const scripts = container.querySelectorAll('script');
  scripts.forEach(oldScript => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.innerHTML = oldScript.innerHTML;
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
  console.log(`${scripts.length}개의 스크립트 실행됨`);
}

async function loadComponent(componentName) {
  const containerMapping = {
    'Dashboard': 'dashboardComponent',
    'ContentAnalyzer': 'contentAnalyzerComponent',
    'test': 'contentAnalyzerComponent'
  };

  const containerId = containerMapping[componentName] || 'dashboardComponent';
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`컨테이너를 찾을 수 없음: ${containerId}`);
    return false;
  }

  try {
    console.log(`${componentName} 컴포넌트 로드 시작 (컨테이너: ${containerId})`);

    document.querySelectorAll('.main-content').forEach(el => {
      el.style.display = 'none';
    });

    container.innerHTML = '<div class="flex items-center justify-center" style="height: 200px;"><div class="spinner"></div></div>';
    container.style.display = 'block';

    const response = await fetch(`/components/${componentName}.html`);
    if (!response.ok) {
      throw new Error(`컴포넌트 로드 실패: ${componentName} (${response.status})`);
    }

    const htmlText = await response.text();
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(htmlText, 'text/html');
    const bodyContent = parsedDoc.body.innerHTML;
    container.innerHTML = bodyContent;

    executeScripts(container);

    console.log(`컴포넌트 ${componentName} 로드 완료, component-loaded 이벤트 발생`);
    window.dispatchEvent(new Event('component-loaded'));

    document.querySelectorAll('.sidebar-nav li').forEach(item => {
      item.classList.remove('active');
    });

    const activeLink = document.querySelector(`[data-component="${componentName}"]`);
    if (activeLink) {
      activeLink.closest('li').classList.add('active');
    }

    closeSidebar();

    return true;
  } catch (error) {
    console.error('컴포넌트 로드 오류:', error);
    container.innerHTML = `<div class="alert alert-danger">컴포넌트를 로드하는 중 오류가 발생했습니다: ${error.message}</div>`;
    return false;
  }
}

function initializeSidebar() {
  const { sidebar, sidebarToggle, sidebarOverlay, closeSidebarBtn } = initializeElements();

  if (!sidebar || !sidebarOverlay) {
    console.debug('Sidebar elements missing, skipping initialization');
    return;
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
    });
  }

  closeSidebarBtn?.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

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

  document.querySelectorAll('.menu-item[data-component]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const componentName = item.getAttribute('data-component');
      if (componentName) {
        closeSidebar();
        loadComponent(componentName);
      }
    });
  });

  const contentAnalyzerLink = document.querySelector('.sidebar-nav li:nth-child(2) .menu-item');
  if (contentAnalyzerLink && !contentAnalyzerLink.hasAttribute('data-component')) {
    contentAnalyzerLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeSidebar();
      loadComponent('ContentAnalyzer');
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#sidebar') && !e.target.closest('#sidebarToggle')) {
      closeSidebar();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!e.target.closest('#sidebar') && !e.target.closest('#sidebarToggle')) {
      closeSidebar();
    }
  });
}

function initializeAfterLoad() {
  try {
    initializeSidebar();

    const tryInitCozy = () => {
      if (!initializeCozyChat()) {
        console.debug('Cozy 초기화 실패, 500ms 후 재시도');
        setTimeout(tryInitCozy, 500);
      }
    };
    tryInitCozy();

    if (document.querySelector('.main-content') && 
        document.querySelectorAll('.main-content[style*="display: block"]').length === 0) {
      loadComponent('Dashboard');
    }
  } catch (error) {
    console.error('초기화 중 오류 발생:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeAfterLoad, 100);
});

const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    if (m.addedNodes.length) {
      setTimeout(initializeAfterLoad, 100);
      break;
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

window.initializeAfterLoad = initializeAfterLoad;
window.loadComponent = loadComponent;
