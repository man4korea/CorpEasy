// Firebase 서비스 관리
const services = {
    app: window.firebaseApp,
    auth: window.firebaseAuth,
    db: window.firebaseDB
};

// UI 업데이트 함수
function updateUIForUser(user) {
    const userMenuButton = document.querySelector('.user-menu-button');
    const userNameSpan = userMenuButton?.querySelector('.user-name');
    if (userNameSpan) {
        userNameSpan.textContent = user.displayName || user.email;
    }
}

function updateUIForGuest() {
    const userMenuButton = document.querySelector('.user-menu-button');
    const userNameSpan = userMenuButton?.querySelector('.user-name');
    if (userNameSpan) {
        userNameSpan.textContent = '게스트';
    }
}

// Firebase 인증 상태 관찰자 설정
if (services.auth) {
    services.auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('로그인된 사용자:', user.email);
            updateUIForUser(user);
        } else {
            console.log('로그아웃 상태');
            updateUIForGuest();
        }
    });
}

// Firebase 인증 함수들
export async function signInWithEmailAndPassword(email, password) {
    try {
        if (!services.auth) throw new Error('Firebase Auth가 초기화되지 않았습니다.');
        const userCredential = await services.auth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
    } catch (error) {
        console.error('로그인 실패:', error);
        throw error;
    }
}

export async function createUserWithEmailAndPassword(email, password) {
    try {
        if (!services.auth) throw new Error('Firebase Auth가 초기화되지 않았습니다.');
        const userCredential = await services.auth.createUserWithEmailAndPassword(email, password);
        return userCredential.user;
    } catch (error) {
        console.error('회원가입 실패:', error);
        throw error;
    }
}

export async function signOut() {
    try {
        if (!services.auth) throw new Error('Firebase Auth가 초기화되지 않았습니다.');
        await services.auth.signOut();
    } catch (error) {
        console.error('로그아웃 실패:', error);
        throw error;
    }
}

// Firebase 서비스 내보내기
export { services }; 