
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
    <div className="page-container">
      <div className="flex h-screen w-full overflow-hidden">
        {/* Sidebar - Fixed and sticky with mobile-optimized behavior */}
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        
        {/* Main content - Scrollable area with optimized spacing */}
        <div className="flex-1 lg:ml-[200px] flex flex-col h-screen w-full min-w-0">
          <Header onMenuToggle={toggleSidebar} />
          
          <main className="page-content flex-1 overflow-y-auto overflow-x-hidden lg:desktop-page-content">
            <div className="content-wrapper lg:desktop-table-container">
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
