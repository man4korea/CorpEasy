// 📁 src/components/SkeletonLoader.tsx
import React from 'react';

interface SkeletonLoaderProps {
  lines?: number;
  animate?: boolean;
}

/**
 * 로딩 중 표시할 스켈레톤 UI 컴포넌트
 * 실제 콘텐츠가 로드되기 전에 표시할 레이아웃을 미리 보여줌
 */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  lines = 4,
  animate = true
}) => {
  // 랜덤한 너비 생성 (75~100%)
  const getRandomWidth = () => {
    const widths = ['w-3/4', 'w-4/5', 'w-5/6', 'w-full'];
    return widths[Math.floor(Math.random() * widths.length)];
  };

  return (
    <div className={`${animate ? 'animate-pulse' : ''} space-y-2`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index} 
          className={`h-4 bg-gray-200 rounded ${getRandomWidth()} ${
            index === lines - 1 ? 'mb-4' : ''
          }`}
        />
      ))}
      
      {/* 문단 추가 */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-11/12" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
      </div>
      
      {/* 문단 추가 */}
      <div className="space-y-2 mt-4">
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
};

export default SkeletonLoader;