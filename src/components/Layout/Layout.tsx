
import React, { useState } from 'react';
import { Header } from './Header';
import { NavigationBar } from './NavigationBar';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop: Header + Navigation Bar */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <Header />
        <NavigationBar />
        <main className="flex-1 overflow-y-auto">
          <div className="h-full p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile/Tablet: Header + Sidebar + Bottom Navigation */}
      <div className="lg:hidden flex h-full">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-col flex-1 min-w-0 overflow-x-hidden">
          <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto pb-16 overflow-x-hidden">
            <div className="p-3 max-w-full">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation />
    </div>
  );
};
