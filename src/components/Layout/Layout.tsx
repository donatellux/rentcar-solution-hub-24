
import React from 'react';
import { Header } from './Header';
import { NavigationBar } from './NavigationBar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col h-screen w-full">
        <Header />
        <NavigationBar />
        
        <main className="flex-1 overflow-y-auto w-full">
          <div className="w-full max-w-none px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
