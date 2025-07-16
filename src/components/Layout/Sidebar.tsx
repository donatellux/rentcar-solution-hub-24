
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
  BarChart3,
  Building2
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
    { name: 'Réservations B2B', href: '/b2b-reservations', icon: Building2 },
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
        className={`sidebar-container fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto flex flex-col w-[200px] min-w-[200px] max-w-[200px] ${
          !isOpen ? 'lg:flex hidden' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <Car className="w-3 h-3 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {agency?.agency_name || 'RentCar'}
              </h2>
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
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={`flex items-center space-x-2 px-2 py-2 rounded-md transition-colors text-sm ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => window.innerWidth < 1024 && onToggle()}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium truncate">{item.name}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer - Sticky at bottom */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 text-sm py-2"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('common.logout')}
          </Button>
        </div>
      </div>
    </>
  );
};
