
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        
        {/* Main content */}
        <div className="flex-1 lg:ml-[280px]">
          <Header onMenuToggle={toggleSidebar} />
          
          <main className="p-4 pb-20 lg:pb-4">
            {children}
          </main>
        </div>
      </div>
      
      {/* Mobile navigation */}
      <MobileNavigation />
    </div>
  );
};
