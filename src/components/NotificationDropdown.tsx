import React, { useState, useEffect } from 'react';
import { Bell, Car, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: 'vehicle_return' | 'maintenance_due' | 'payment_due' | 'reservation_reminder';
  title: string;
  message: string;
  date: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
}

export const NotificationDropdown: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      // Fetch upcoming vehicle returns (next 7 days)
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, date_fin, vehicule_id')
        .eq('agency_id', user.id)
        .eq('statut', 'en_cours')
        .gte('date_fin', new Date().toISOString())
        .lte('date_fin', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

      // Fetch vehicles needing maintenance
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, marque, modele, kilometrage, km_last_vidange')
        .eq('agency_id', user.id)
        .eq('etat', 'disponible');

      const mockNotifications: Notification[] = [];

      // Add vehicle return notifications
      reservations?.forEach((reservation, index) => {
        const returnDate = new Date(reservation.date_fin);
        const daysUntilReturn = Math.ceil((returnDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        const vehicle = vehicles?.find(v => v.id === reservation.vehicule_id);
        
        mockNotifications.push({
          id: `return_${reservation.id}`,
          type: 'vehicle_return',
          title: 'Retour de véhicule prévu',
          message: `${vehicle?.marque || 'Véhicule'} ${vehicle?.modele || ''} doit être retourné dans ${daysUntilReturn} jour${daysUntilReturn > 1 ? 's' : ''}`,
          date: returnDate,
          isRead: false,
          priority: daysUntilReturn <= 1 ? 'high' : daysUntilReturn <= 3 ? 'medium' : 'low'
        });
      });

      // Add maintenance notifications
      vehicles?.forEach((vehicle, index) => {
        const kmSinceRevision = vehicle.kilometrage - (vehicle.km_last_vidange || 0);
        if (kmSinceRevision >= 8000) {
          mockNotifications.push({
            id: `maintenance_${vehicle.id}`,
            type: 'maintenance_due',
            title: 'Maintenance requise',
            message: `${vehicle.marque} ${vehicle.modele} nécessite une révision (${kmSinceRevision.toLocaleString()} km)`,
            date: new Date(),
            isRead: false,
            priority: kmSinceRevision >= 10000 ? 'high' : 'medium'
          });
        }
      });

      // Add some sample business notifications
      const businessNotifications: Notification[] = [
        {
          id: 'revenue_monthly',
          type: 'payment_due',
          title: 'Rapport mensuel disponible',
          message: 'Votre rapport de revenus mensuel est prêt à être consulté',
          date: new Date(),
          isRead: false,
          priority: 'low'
        },
        {
          id: 'new_reservation',
          type: 'reservation_reminder',
          title: 'Nouvelle réservation',
          message: 'Vous avez reçu une nouvelle demande de réservation',
          date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          isRead: false,
          priority: 'medium'
        }
      ];

      const allNotifications = [...mockNotifications, ...businessNotifications]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10); // Limit to 10 notifications

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'vehicle_return':
        return <Car className="w-4 h-4" />;
      case 'maintenance_due':
        return <AlertTriangle className="w-4 h-4" />;
      case 'payment_due':
        return <DollarSign className="w-4 h-4" />;
      case 'reservation_reminder':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours === 1) return 'Il y a 1 heure';
    if (diffInHours < 24) return `Il y a ${diffInHours} heures`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Hier';
    if (diffInDays < 7) return `Il y a ${diffInDays} jours`;
    
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="relative hover:bg-accent transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled className="text-center py-4">
            <div className="flex flex-col items-center text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <span>Aucune notification</span>
            </div>
          </DropdownMenuItem>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex items-start space-x-3 p-3 cursor-pointer ${
                !notification.isRead ? 'bg-accent/50' : ''
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className={`p-2 rounded-full ${
                notification.priority === 'high' ? 'bg-destructive/20 text-destructive' :
                notification.priority === 'medium' ? 'bg-warning/20 text-warning' :
                'bg-muted text-muted-foreground'
              }`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{notification.title}</h4>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTimeAgo(notification.date)}
                </p>
              </div>
            </DropdownMenuItem>
          ))
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center text-primary hover:text-primary/80">
              Voir toutes les notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};