import React from 'react';
import { cn } from '@/lib/utils';

interface MobileTableProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileTable: React.FC<MobileTableProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "w-full overflow-x-auto -mx-4 sm:mx-0",
      "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20",
      "table-mobile-wrapper",
      className
    )}>
      <div className="min-w-full px-4 sm:px-0">
        {children}
      </div>
    </div>
  );
};

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileCard: React.FC<MobileCardProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "bg-card border rounded-lg p-3 sm:p-4 shadow-sm",
      "space-y-2 sm:space-y-3",
      className
    )}>
      {children}
    </div>
  );
};

interface MobileStackProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileStack: React.FC<MobileStackProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "space-y-3 sm:space-y-4",
      className
    )}>
      {children}
    </div>
  );
};