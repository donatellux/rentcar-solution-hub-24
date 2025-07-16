
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
        className={`sidebar-container fixed left-0 top-0 h-screen bg-sidebar-background border-r border-sidebar-border transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto flex flex-col w-[220px] min-w-[220px] max-w-[220px] ${
          !isOpen ? 'lg:flex hidden' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Car className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-sidebar-foreground">
                {agency?.agency_name || 'mediovas'}
              </h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation - Scrollable content */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                    }`}
                    onClick={() => window.innerWidth < 1024 && onToggle()}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer - Sticky at bottom */}
        <div className="p-3 border-t border-sidebar-border flex-shrink-0">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('common.logout')}
          </Button>
        </div>
      </div>
    </>
  );
};
