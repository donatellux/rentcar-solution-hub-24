
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
      <div className="flex h-screen">
        {/* Sidebar - Fixed and sticky */}
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        
        {/* Main content - Scrollable area with optimized spacing */}
        <div className="flex-1 lg:ml-[280px] flex flex-col h-screen">
          <Header onMenuToggle={toggleSidebar} />
          
          <main className="page-content">
            <div className="content-wrapper">
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
