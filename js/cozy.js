// Cozy 채팅 클래스
export class CozyChat {
    constructor() {
        this.cozyChat = document.getElementById('cozyChat');
        this.cozyButton = document.getElementById('cozyButton');
        this.closeChat = document.getElementById('closeChat');
        this.messageInput = document.getElementById('messageInput');
        this.sendMessage = document.getElementById('sendMessage');
        this.chatMessages = document.getElementById('chatMessages');
    }

    // 초기화
    initialize() {
        if (!this.cozyChat || !this.cozyButton) {
            console.warn('Cozy 채팅 요소를 찾을 수 없습니다.');
            return false;
        }

        this.setupEventListeners();
        return true;
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 채팅 토글
        this.cozyButton.addEventListener('click', () => this.toggleChat());

        // 채팅 닫기
        if (this.closeChat) {
            this.closeChat.addEventListener('click', () => this.hideChat());
        }

        // 메시지 전송 버튼
        if (this.sendMessage) {
            this.sendMessage.addEventListener('click', () => this.sendUserMessage());
        }

        // 텍스트 영역 자동 크기 조절
        if (this.messageInput) {
            this.messageInput.addEventListener('input', () => this.adjustTextareaHeight());
            
            // Enter 키 처리
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendUserMessage();
                }
            });
        }

        // 채팅창 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            if (this.cozyChat && 
                !this.cozyChat.contains(e.target) && 
                !this.cozyButton.contains(e.target)) {
                this.hideChat();
            }
        });
    }

    // 채팅창 토글
    toggleChat() {
        this.cozyChat.classList.toggle('show');
        if (this.cozyChat.classList.contains('show') && this.messageInput) {
            this.messageInput.focus();
        }
    }

    // 채팅창 숨기기
    hideChat() {
        this.cozyChat.classList.remove('show');
    }

    // 메시지 추가
    addMessage({ text, type, emotion }) {
        if (!this.chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type === 'user' ? 'user' : 'cozy'}`;

        const content = document.createElement('div');
        content.className = 'message-content';

        if (type === 'bot') {
            const emotionSpan = document.createElement('span');
            emotionSpan.className = 'emotion';
            emotionSpan.textContent = emotion || '😊';
            content.appendChild(emotionSpan);
        }

        const textP = document.createElement('p');
        textP.textContent = text;
        content.appendChild(textP);
        messageDiv.appendChild(content);

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // 메시지 전송
    async sendUserMessage() {
        if (!this.messageInput || !this.messageInput.value.trim()) return;

        const text = this.messageInput.value.trim();
        
        // 사용자 메시지 추가
        this.addMessage({ text, type: 'user' });
        this.messageInput.value = '';

        // 입력창 크기 초기화
        if (this.messageInput.style) {
            this.messageInput.style.height = 'auto';
        }

        // 봇 응답 (예시)
        setTimeout(() => {
            this.addMessage({
                text: "네, 알겠습니다! 도와드리겠습니다.",
                type: "bot",
                emotion: "😊"
            });
        }, 1000);
    }

    // 텍스트 영역 자동 크기 조절
    adjustTextareaHeight() {
        if (!this.messageInput) return;
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
    }
}

// Cozy 채팅 초기화 함수
export function initializeCozyChat() {
    const cozy = new CozyChat();
    return cozy.initialize();
} 