
import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNavigation } from './MobileNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar - Fixed and sticky */}
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        
        {/* Main content - Scrollable area */}
        <div className="flex-1 lg:ml-[280px] flex flex-col h-screen">
          <Header onMenuToggle={toggleSidebar} />
          
          <main className="flex-1 overflow-y-auto p-6 pb-24 lg:pb-8 lg:px-8 xl:px-12">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
      
      {/* Mobile navigation */}
      <MobileNavigation />
    </div>
  );
};
