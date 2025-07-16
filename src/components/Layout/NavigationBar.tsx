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
  BarChart3,
  Building2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const NavigationBar: React.FC = () => {
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

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="max-w-full px-4">
        <div className="flex justify-center">
          <div className="flex space-x-1 py-2 overflow-x-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};