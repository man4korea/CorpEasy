// Firebase 모듈 import
import { auth, db, analytics } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from './firebase.js';

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
        hasSubmenuItems: document.querySelectorAll('.has-submenu'),
        cogyButton: document.getElementById('cogyButton'),
        cogyChat: document.getElementById('cogyChat'),
        closeChat: document.getElementById('closeChat'),
        messageInput: document.getElementById('messageInput'),
        sendMessage: document.getElementById('sendMessage'),
        chatMessages: document.getElementById('chatMessages')
    };

    // 요소가 없으면 에러 로그
    Object.entries(elements).forEach(([key, element]) => {
        if (!element) {
            console.error(`Element not found: ${key}`);
        }
    });

    // 사이드바 토글 이벤트
    if (elements.sidebarToggle && elements.sidebar && elements.sidebarOverlay) {
        elements.sidebarToggle.addEventListener('click', () => {
            elements.sidebar.classList.add('active');
            elements.sidebarOverlay.classList.add('active');
        });
    }

    if (elements.closeSidebarBtn && elements.sidebar && elements.sidebarOverlay) {
        elements.closeSidebarBtn.addEventListener('click', () => {
            elements.sidebar.classList.remove('active');
            elements.sidebarOverlay.classList.remove('active');
        });
    }

    if (elements.sidebarOverlay) {
        elements.sidebarOverlay.addEventListener('click', () => {
            elements.sidebar.classList.remove('active');
            elements.sidebarOverlay.classList.remove('active');
        });
    }

    // 서브메뉴 토글
    elements.hasSubmenuItems.forEach(submenu => {
        const menuItem = submenu.querySelector('.menu-item');
        if (menuItem) {
            menuItem.addEventListener('click', (e) => {
                e.preventDefault();
                submenu.classList.toggle('active');
            });
        }
    });

    // 로그아웃 버튼 이벤트
    const logoutButton = document.querySelector('.dropdown-item.text-danger');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut();
                console.log('로그아웃 성공');
            } catch (error) {
                console.error('로그아웃 실패:', error);
            }
        });
    }

    return elements;
}

// Cogy Chat
function initializeCogyChat() {
    const cogyButton = document.getElementById('cogyButton');
    const cogyChat = document.getElementById('cogyChat');
    const closeChat = document.getElementById('closeChat');
    const messageInput = document.getElementById('messageInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');

    // 초기 메시지
    const initialMessage = {
        text: "안녕하세요! 저는 CorpEasy의 AI 어시스턴트 Cogy입니다. 무엇을 도와드릴까요?",
        type: "bot"
    };

    // 채팅 토글
    if (cogyButton && cogyChat) {
        cogyButton.addEventListener('click', () => {
            cogyChat.classList.toggle('show');
            if (cogyChat.classList.contains('show')) {
                messageInput.focus();
                if (chatMessages && chatMessages.children.length === 0) {
                    addMessage(initialMessage);
                }
            }
        });
    }

    // 채팅 닫기
    if (closeChat && cogyChat) {
        closeChat.addEventListener('click', () => {
            cogyChat.classList.remove('show');
        });
    }

    // 메시지 추가
    function addMessage({ text, type }) {
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type === 'user' ? 'user' : ''}`;

        if (type === 'bot') {
            const avatar = document.createElement('i');
            avatar.className = 'fas fa-robot';
            messageDiv.appendChild(avatar);
        }

        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = text;
        messageDiv.appendChild(content);

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 메시지 전송
    async function sendUserMessage() {
        if (!messageInput || !messageInput.value.trim()) return;

        const text = messageInput.value.trim();
        
        // 사용자 메시지 추가
        addMessage({ text, type: 'user' });
        messageInput.value = '';

        // 입력창 크기 초기화
        messageInput.style.height = 'auto';

        // 봇 응답 (예시)
        setTimeout(() => {
            addMessage({
                text: "죄송합니다. 아직 학습 중입니다. 빠른 시일 내에 답변 드리도록 하겠습니다.",
                type: "bot"
            });
        }, 1000);
    }

    // 텍스트 영역 자동 크기 조절
    function adjustTextareaHeight() {
        if (!messageInput) return;
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
    }

    // 이벤트 리스너
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendUserMessage();
            }
        });

        messageInput.addEventListener('input', adjustTextareaHeight);
    }

    if (sendMessage) {
        sendMessage.addEventListener('click', sendUserMessage);
    }

    // 채팅창 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if (cogyChat && !cogyChat.contains(e.target) && !cogyButton.contains(e.target)) {
            cogyChat.classList.remove('show');
        }
    });
}

// 컴포넌트가 로드된 후 이벤트 핸들러 초기화
function initializeAfterLoad() {
    // 약간의 지연을 주어 DOM이 완전히 로드된 후 초기화
    setTimeout(() => {
        initializeElements();
        initializeCogyChat(); // Cogy 채팅 초기화 추가
    }, 100);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializeAfterLoad);

// 컴포넌트가 동적으로 로드될 때마다 이벤트 핸들러 재초기화
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            initializeElements();
        }
    });
});

// 옵저버 설정
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// YouTube URL 유효성 검사
function isValidYoutubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return pattern.test(url);
}

// 분석 버튼 클릭 이벤트
const analyzeBtn = document.getElementById('analyzeBtn');
analyzeBtn.addEventListener('click', async () => {
    const url = document.getElementById('youtubeUrl').value.trim();
    
    if (!url) {
        alert('YouTube URL을 입력해주세요.');
        return;
    }

    if (!isValidYoutubeUrl(url)) {
        alert('유효한 YouTube URL을 입력해주세요.');
        return;
    }

    try {
        // TODO: API 호출 구현
        console.log('분석 시작:', url);
    } catch (error) {
        console.error('분석 중 오류 발생:', error);
        alert('분석 중 오류가 발생했습니다.');
    }
});

// Enter 키 이벤트
const youtubeUrlInput = document.getElementById('youtubeUrl');
youtubeUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        analyzeBtn.click();
    }
});

// 대시보드 데이터
const dashboardData = {
    stats: {
        contentAnalyzed: 158,
        blogPostsGenerated: 42,
        trendAlerts: 13,
        activeChatbots: 3
    },
    recentContent: [
        { title: '중소기업 디지털 전환 전략', date: '2025-04-18', type: 'blog' },
        { title: 'AI 도입 성공 사례 분석', date: '2025-04-15', type: 'analysis' },
        { title: '2025년 마케팅 트렌드', date: '2025-04-12', type: 'blog' }
    ],
    trendAlerts: [
        { title: '인공지능 기술의 중소기업 적용', date: '2025-04-19', sentiment: 'positive' },
        { title: '디지털 마케팅 최신 동향', date: '2025-04-17', sentiment: 'neutral' },
        { title: '중소기업 지원 정책 변화', date: '2025-04-14', sentiment: 'positive' }
    ],
    chatbotStats: {
        responsesGenerated: 1254,
        avgResponseTime: 0.8,
        customerSatisfaction: 4.7,
        improvementPercent: 32
    }
};

// 사이드바 네비게이션 이벤트
document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.sidebar-nav li.active').classList.remove('active');
        e.target.closest('li').classList.add('active');
    });
});

// 모든 "더보기" 버튼 이벤트
document.querySelectorAll('.view-all').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.closest('.data-card').querySelector('h2').textContent;
        console.log(`${section} 더보기 클릭됨`);
    });
}); 