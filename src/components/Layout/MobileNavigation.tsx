
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  Users,
  Calendar,
  Settings
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const MobileNavigation: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.vehicles'), href: '/vehicles', icon: Car },
    { name: t('nav.clients'), href: '/clients', icon: Users },
    { name: t('nav.reservations'), href: '/reservations', icon: Calendar },
    { name: t('nav.settings'), href: '/parametres', icon: Settings }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border lg:hidden z-50">
      <nav className="flex">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 min-h-[64px] transition-colors ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
