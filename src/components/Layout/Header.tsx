
import React from 'react';
import { Menu, Search, Bell, Sun, Moon, Languages, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { agency, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isDark, setIsDark] = React.useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="bg-card border-b border-border px-4 py-3 shadow-sm transition-all-smooth">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="lg:hidden hover:bg-accent transition-colors"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="relative max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('common.search')}
              className="pl-10 pr-4 py-2 w-full transition-all-smooth focus:shadow-glow"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-accent transition-colors">
                <Languages className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline text-sm">
                  {language === 'ar' ? 'العربية' : 'Français'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem 
                onClick={() => setLanguage('fr')}
                className={language === 'fr' ? 'bg-accent' : ''}
              >
                🇫🇷 Français
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLanguage('ar')}
                className={language === 'ar' ? 'bg-accent' : ''}
              >
                🇲🇦 العربية
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleTheme}
            className="hover:bg-accent transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="hover:bg-accent transition-colors hidden sm:flex"
          >
            <Bell className="w-4 h-4" />
          </Button>

          <div className="flex items-center space-x-3">
            {agency?.logo_path ? (
              <div className="w-8 h-8 rounded-full overflow-hidden bg-background border-2 border-border">
                <img
                  src={(() => {
                    // Check if it's already a full URL or just a filename
                    if (agency.logo_path.startsWith('http')) {
                      return agency.logo_path;
                    } else {
                      const { data: { publicUrl } } = supabase.storage
                        .from('logos')
                        .getPublicUrl(agency.logo_path);
                      return publicUrl;
                    }
                  })()}
                  alt="Agency logo"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {agency?.agency_name?.charAt(0) || 'A'}
                </span>
              </div>
            )}
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-foreground">
                {agency?.agency_name || 'Agence'}
              </p>
              <p className="text-xs text-muted-foreground">
                {agency?.email}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
