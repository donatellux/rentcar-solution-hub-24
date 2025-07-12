
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Users, Calendar, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  totalClients: number;
  activeReservations: number;
  monthlyRevenue: number;
  maintenanceAlerts: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    availableVehicles: 0,
    totalClients: 0,
    activeReservations: 0,
    monthlyRevenue: 0,
    maintenanceAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    if (!user) return;

    try {
      // Fetch vehicles stats
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('etat, kilometrage, km_last_vidange, vidange_periodicite_km')
        .eq('agency_id', user.id);

      // Fetch clients count
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('agency_id', user.id);

      // Fetch active reservations (en_cours and confirmee)
      const { data: reservations } = await supabase
        .from('reservations')
        .select('prix_par_jour, date_debut, date_fin, statut')
        .eq('agency_id', user.id)
        .in('statut', ['en_cours', 'confirmee']);

      // Calculate stats
      const totalVehicles = vehicles?.length || 0;
      const availableVehicles = vehicles?.filter(v => v.etat === 'disponible').length || 0;
      const totalClients = clients?.length || 0;
      
      // Count active reservations (en_cours)
      const activeReservations = reservations?.filter(r => r.statut === 'en_cours').length || 0;

      // Calculate monthly revenue from active and confirmed reservations
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyRevenue = reservations?.reduce((sum, reservation) => {
        if (reservation.prix_par_jour && reservation.date_debut && reservation.date_fin) {
          const startDate = new Date(reservation.date_debut);
          const endDate = new Date(reservation.date_fin);
          
          // Check if reservation is in current month
          if (startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear) {
            const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            return sum + (reservation.prix_par_jour * Math.max(days, 1));
          }
        }
        return sum;
      }, 0) || 0;

      // Calculate maintenance alerts
      const maintenanceAlerts = vehicles?.filter(vehicle => {
        if (vehicle.kilometrage && vehicle.km_last_vidange && vehicle.vidange_periodicite_km) {
          const kmSinceLastMaintenance = vehicle.kilometrage - vehicle.km_last_vidange;
          return kmSinceLastMaintenance >= vehicle.vidange_periodicite_km * 0.9;
        }
        return false;
      }).length || 0;

      setStats({
        totalVehicles,
        availableVehicles,
        totalClients,
        activeReservations,
        monthlyRevenue,
        maintenanceAlerts,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Véhicules',
      value: stats.totalVehicles,
      icon: Car,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: 'Véhicules Disponibles',
      value: stats.availableVehicles,
      icon: Car,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
    {
      title: 'Réservations Actives',
      value: stats.activeReservations,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
    },
    {
      title: 'Revenus du Mois',
      value: `${stats.monthlyRevenue.toLocaleString()} MAD`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'Alertes Entretien',
      value: stats.maintenanceAlerts,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <TrendingUp className="w-4 h-4" />
          <span>Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {stats.maintenanceAlerts > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span>Alertes d'Entretien</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              {stats.maintenanceAlerts} véhicule(s) nécessite(nt) un entretien prochainement.
              Consultez la section Entretiens pour plus de détails.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
