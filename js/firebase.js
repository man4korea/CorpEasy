// Firebase 초기화 및 설정 ver 1.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword as _signInWithEmailAndPassword, 
         createUserWithEmailAndPassword as _createUserWithEmailAndPassword,
         signOut as _signOut } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-analytics.js";

// Firebase 설정
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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// 전역으로 노출
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDB = db;
window.firebaseAnalytics = analytics;

// Firebase 인증 상태 관찰자
auth.onAuthStateChanged((user) => {
    if (user) {
        // 사용자가 로그인한 경우
        console.log('로그인된 사용자:', user.email);
        // 로그인 상태에 따른 UI 업데이트
        updateUIForUser(user);
    } else {
        // 로그아웃 상태
        console.log('로그아웃 상태');
        // 로그아웃 상태에 따른 UI 업데이트
        updateUIForGuest();
    }
});

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

// Firebase 인증 함수들
export async function signInWithEmailAndPassword(email, password) {
    try {
        const userCredential = await _signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('로그인 실패:', error);
        throw error;
    }
}

export async function createUserWithEmailAndPassword(email, password) {
    try {
        const userCredential = await _createUserWithEmailAndPassword(auth, email, password);
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