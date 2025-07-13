
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  Users,
  Calendar,
  CalendarCheck,
  Wrench,
  Receipt,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { signOut, agency } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.vehicles'), href: '/vehicles', icon: Car },
    { name: t('nav.clients'), href: '/clients', icon: Users },
    { name: t('nav.reservations'), href: '/reservations', icon: Calendar },
    { name: t('nav.calendar'), href: '/calendrier', icon: CalendarCheck },
    { name: t('nav.maintenance'), href: '/entretien', icon: Wrench },
    { name: t('nav.expenses'), href: '/depenses', icon: Receipt },
    { name: t('nav.documents'), href: '/documents', icon: FileText },
    { name: t('nav.statistics'), href: '/statistiques', icon: BarChart3 },
    { name: t('nav.settings'), href: '/parametres', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto flex flex-col`}
        style={{ width: '280px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                {agency?.agency_name || 'Rentcar Solution'}
              </h2>
              {agency?.slogan && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {agency.slogan}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="lg:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation - Scrollable content */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => window.innerWidth < 1024 && onToggle()}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer - Sticky at bottom */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut className="w-5 h-5 mr-3" />
            {t('common.logout')}
          </Button>
        </div>
      </div>
    </>
  );
};
