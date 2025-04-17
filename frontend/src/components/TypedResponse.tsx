// 📁 src/components/TypedResponse.tsx
import React, { useState, useEffect, useRef } from 'react';

interface TypedResponseProps {
  text: string;
  speed?: number;
  delay?: number;
}

/**
 * 타이핑 효과를 주는 텍스트 컴포넌트
 * 점진적으로 텍스트가 타이핑되는 효과 제공
 * 
 * @param text 표시할 텍스트
 * @param speed 문자당 표시 속도 (ms)
 * @param delay 시작 전 지연 시간 (ms)
 */
const TypedResponse: React.FC<TypedResponseProps> = ({ 
  text, 
  speed = 10, 
  delay = 0 
}) => {
  const [displayedText, setDisplayedText] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const previousTextRef = useRef<string>('');
  const isPaused = useRef<boolean>(false);
  
  // 텍스트가 변경되면 다시 시작
  useEffect(() => {
    // 텍스트가 이전 텍스트의 접두사인 경우에만 계속 진행 (새 텍스트)
    if (!text.startsWith(previousTextRef.current)) {
      setDisplayedText('');
      setCurrentIndex(0);
    } else if (text.length > previousTextRef.current.length) {
      // 이전 텍스트에서 계속 진행 (스트리밍 추가 텍스트)
      setCurrentIndex(previousTextRef.current.length);
    }
    
    previousTextRef.current = text;
  }, [text]);
  
  // 타이핑 효과
  useEffect(() => {
    // 텍스트가 없거나 이미 모두 표시된 경우
    if (!text || currentIndex >= text.length) {
      return;
    }
    
    // 시작 지연
    let timeoutId: NodeJS.Timeout;
    if (currentIndex === 0 && delay > 0) {
      timeoutId = setTimeout(() => {
        if (!isPaused.current) {
          setDisplayedText(text.substring(0, 1));
          setCurrentIndex(1);
        }
      }, delay);
      
      return () => clearTimeout(timeoutId);
    }
    
    // 타이핑 간격 계산 (글자당 속도)
    const typingInterval = speed;
    
    // 문장 종료 시 더 긴 멈춤 효과
    const isEndOfSentence = text[currentIndex - 1] && ['.', '!', '?'].includes(text[currentIndex - 1]);
    const isPunctuation = text[currentIndex - 1] && [',', ';', ':'].includes(text[currentIndex - 1]);
    
    const adjustedInterval = isEndOfSentence 
      ? typingInterval * 5  // 문장 끝에서 더 긴 멈춤
      : isPunctuation 
        ? typingInterval * 2  // 쉼표 등에서의 짧은 멈춤
        : typingInterval;
    
    // 타이핑 효과 인터벌 설정
    const intervalId = setTimeout(() => {
      if (!isPaused.current) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        setCurrentIndex(prevIndex => prevIndex + 1);
      }
    }, adjustedInterval);
    
    return () => clearTimeout(intervalId);
  }, [text, currentIndex, speed, delay]);
  
  // 일시정지/계속 토글 함수
  const togglePause = () => {
    isPaused.current = !isPaused.current;
  };
  
  // 즉시 완료 함수
  const completeTyping = () => {
    setDisplayedText(text);
    setCurrentIndex(text.length);
  };
  
  // 더블 클릭으로 타이핑 완료
  const handleDoubleClick = () => {
    completeTyping();
  };
  
  // 클릭으로 일시정지/계속
  const handleClick = () => {
    togglePause();
  };
  
  return (
    <p 
      className="whitespace-pre-wrap cursor-pointer" 
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title="클릭: 일시정지/계속, 더블클릭: 즉시 완료"
    >
      {displayedText}
      <span className="inline-block w-1 h-4 ml-1 bg-gray-500 animate-blink"></span>
    </p>
  );
};

// 깜빡이는 커서 애니메이션을 위한 스타일 (tailwind.css에 추가)
// @keyframes blink {
//   0%, 100% { opacity: 1; }
//   50% { opacity: 0; }
// }
// .animate-blink {
//   animation: blink 1s step-end infinite;
// }

export default TypedResponse;