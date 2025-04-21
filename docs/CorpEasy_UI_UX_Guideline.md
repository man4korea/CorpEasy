# 00.CorpEasy UI/UX 브랜딩 가이드라인

- 개요

---

# CorpEasy UI/UX 가이드라인

## 🎨 브랜드 아이덴티티

### 💫 디자인 철학

- 모던하고 심플한 디자인
- 불필요한 텍스트나 장식 제거
- padding, margin, shadow 최소화

### 🎯 로고

- 폰트: Pacifico (Google Fonts)
- 색상: Blue (#007bff)
- 스타일:
    - 그림자 효과: `text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1)`
    - 자간: `letter-spacing: 0.5px`

### 🔤 타이포그래피

- 기본 폰트: Noto Sans CJK KR
- 코드 폰트: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace
- 폰트 크기 시스템:
    - xs: 0.75rem (12px)
    - sm: 0.875rem (14px)
    - base: 1rem (16px)
    - lg: 1.125rem (18px)
    - xl: 1.25rem (20px)
    - 2xl: 1.5rem (24px)
    - 3xl: 1.875rem (30px)
    - 4xl: 2.25rem (36px)

### 💙 색상 시스템

기본 색상:

- Primary: Blue (#007bff)
- Secondary: Gray (#6b7280)
- Danger: Red (#ef4444)
- Success: Green (#22c55e)
- Warning: Amber (#f59e0b)
- Info: Blue (#3b82f6)

배경색:

- Primary: White (#ffffff)
- Secondary: Gray-50 (#f9fafb)

텍스트 색상:

- Primary: Black (#000000)
- Secondary: Gray-500 (#6b7280)
- Light: White (#ffffff)

## 🎯 컴포넌트 스타일

### 🔘 버튼

기본 버튼:

```css
.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s;
}

/* Primary Button */
.btn-primary {
  background: #007bff;
  color: white;
  border: 1px solid #007bff;
}

.btn-primary:hover {
  background: white;
  color: #007bff;
  border-color: #007bff;
}

/* Danger Button */
.btn-danger {
  background: #ef4444;
  color: white;
  border: 1px solid #ef4444;
}

.btn-danger:hover {
  background: white;
  color: #ef4444;
  border-color: #ef4444;
}

```

### 🔗 링크

```css
/* Default Link */
.link {
  color: #007bff;
  transition: color 0.2s;
}

.link:hover {
  color: #6b7280;
}

/* Danger Link */
.link-danger {
  color: #ef4444;
}

.link-danger:hover {
  color: #6b7280;
}

```

### 📂 메뉴

메뉴 구성:

- 위치: 좌측 사이드바
- 동작: 우측으로 슬라이드
- 스타일:
    
    ```css
    .menu-button {
      background: #007bff;
      color: white;
    }
    
    .menu-button:hover {
      background: white;
      color: #007bff;
      border: 1px solid #007bff;
    }
    
    .menu-item {
      color: black;
    }
    
    .menu-item:hover {
      color: #6b7280;
    }
    
    ```
    
- 계층 구조:
    - 2차, 3차 메뉴는 우측으로 펼쳐짐
    - 동일한 색상 규칙 적용
    - 메뉴 선택 시 사이드 메뉴 자동 닫힘

### 📦 카드

```css
.card {
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background: white;
  padding: 1rem;
}

```

## 📱 반응형 디자인

- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

## ♿ 접근성 가이드라인

1. 충분한 색상 대비
2. 키보드 네비게이션 지원
3. ARIA 레이블 사용
4. 적절한 폰트 크기
5. 오류 메시지의 명확한 표시

## ✨ 애니메이션

- 트랜지션 시간: 0.2초
- 부드러운 호버 효과
- 로딩 상태의 명확한 표시

## 🎯 아이콘

- 일관된 크기 사용
- 의미 전달이 명확한 아이콘 선택
- 필요한 경우 레이블 추가

## 💻 Tailwind 클래스 사용 예시

```jsx
// Primary Button
<button className="bg-blue-500 text-white rounded hover:bg-white hover:text-blue-500 hover:border-blue-500">
  버튼
</button>

// Danger Button
<button className="bg-red-500 text-white hover:bg-white hover:text-red-500 hover:border-red-500">
  삭제
</button>

// Link
<a className="text-blue-500 hover:text-gray-500">
  링크
</a>

// Menu Button
<button className="bg-blue-500 text-white hover:bg-white hover:text-blue-500 hover:border-blue-500">
  메뉴
</button>

```

---

<aside>
<img src="https://www.notion.so/icons/push-pin_gray.svg" alt="https://www.notion.so/icons/push-pin_gray.svg" width="40px" />  학습정리

- 
- 
- 
</aside>