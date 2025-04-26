// 📁 public/js/firebase.js
// Create at 2504251647 Ver1.00

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword as _signIn, createUserWithEmailAndPassword as _createUser, signOut as _signOut } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

// Firebase 구성
const firebaseConfig = {
    apiKey: "AIzaSyCHrjpHntRG_x3o4SeAnQznwlZREzXVX6A",
    authDomain: "corpeasy-c69bb.firebaseapp.com",
    projectId: "corpeasy-c69bb",
    storageBucket: "corpeasy-c69bb.appspot.com",
    messagingSenderId: "678996911607",
    appId: "1:678996911607:web:d2d4e777516dde82a6faf2",
    measurementId: "G-47XDDVVQWN"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Firebase 서비스를 전역 객체로 노출
window.firebaseServices = {
    app,
    auth,
    db
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
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('로그인된 사용자:', user.email);
        updateUIForUser(user);
        // 로그인 시 이벤트 발생
        document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
    } else {
        console.log('로그아웃 상태');
        updateUIForGuest();
        // 로그아웃 시 이벤트 발생
        document.dispatchEvent(new CustomEvent('userLoggedOut'));
    }
});

// Firebase 인증 함수들
export async function signInWithEmailAndPassword(email, password) {
    try {
        const userCredential = await _signIn(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('로그인 실패:', error);
        throw error;
    }
}

export async function createUserWithEmailAndPassword(email, password) {
    try {
        const userCredential = await _createUser(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('회원가입 실패:', error);
        throw error;
    }
}

export async function signOut() {
    try {
        await _signOut(auth);
    } catch (error) {
        console.error('로그아웃 실패:', error);
        throw error;
    }
}

// Firebase 서비스 내보내기
export const services = {
    app,
    auth,
    db
};