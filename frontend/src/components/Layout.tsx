import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen">
      <main className="flex-1 overflow-auto">
        <div className="p-4 text-center">
          <h1 className="text-2xl font-bold">Hello CorpEasy! 🔥 배포 테스트 완료!</h1>
        </div>
        {children}
      </main>
    </div>
  );
};

export default Layout; 