import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Users, Calendar, DollarSign, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  totalClients: number;
  activeReservations: number;
  monthlyRevenue: number;
  maintenanceAlerts: number;
  vehiclesNeedingMaintenance: Array<{
    id: string;
    marque: string;
    modele: string;
    immatriculation: string;
    kilometrage: number;
    km_last_vidange: number;
    vidange_periodicite_km: number;
  }>;
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
    vehiclesNeedingMaintenance: [],
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
      // Fetch vehicles stats with detailed maintenance info
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation, etat, kilometrage, km_last_vidange, vidange_periodicite_km')
        .eq('agency_id', user.id);

      // Fetch clients count
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('agency_id', user.id);

      // Fetch active reservations (en_cours and confirmee)
      const { data: reservations } = await supabase
        .from('reservations')
        .select('prix_par_jour, date_debut, date_fin, statut, vehicule_id, km_retour')
        .eq('agency_id', user.id)
        .in('statut', ['en_cours', 'confirmee']);

      const totalVehicles = vehicles?.length || 0;
      const availableVehicles = vehicles?.filter(v => v.etat === 'disponible').length || 0;
      const totalClients = clients?.length || 0;
      
      // Count active reservations (en_cours)
      const activeReservations = reservations?.filter(r => r.statut === 'en_cours').length || 0;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyRevenue = reservations?.reduce((sum, reservation) => {
        if (reservation.prix_par_jour && reservation.date_debut && reservation.date_fin) {
          const startDate = new Date(reservation.date_debut);
          const endDate = new Date(reservation.date_fin);
          
          if (startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear) {
            const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            return sum + (reservation.prix_par_jour * Math.max(days, 1));
          }
        }
        return sum;
      }, 0) || 0;

      // Get detailed info about vehicles needing maintenance and update kilometrage
      const vehiclesNeedingMaintenance = [];
      
      for (const vehicle of vehicles || []) {
        if (vehicle.kilometrage && vehicle.km_last_vidange && vehicle.vidange_periodicite_km) {
          // Get the highest km_retour for this vehicle from reservations
          const vehicleReservations = reservations?.filter(r => r.vehicule_id === vehicle.id && r.km_retour) || [];
          const maxKmRetour = vehicleReservations.length > 0 
            ? Math.max(...vehicleReservations.map(r => r.km_retour || 0))
            : 0;
          
          // Use the higher value between vehicle's mileage and max km_retour
          const currentKm = Math.max(vehicle.kilometrage, maxKmRetour);
          
          // Update the vehicle's kilometrage in database if it's lower than maxKmRetour
          if (maxKmRetour > 0 && vehicle.kilometrage < maxKmRetour) {
            try {
              await supabase
                .from('vehicles')
                .update({ kilometrage: maxKmRetour })
                .eq('id', vehicle.id);
            } catch (error) {
              console.error('Error updating vehicle kilometrage:', error);
            }
          }
          
          const kmSinceLastMaintenance = currentKm - vehicle.km_last_vidange;
          if (kmSinceLastMaintenance >= vehicle.vidange_periodicite_km * 0.9) {
            vehiclesNeedingMaintenance.push({
              ...vehicle,
              kilometrage: currentKm // Update the local data with the new kilometrage
            });
          }
        }
      }

      const maintenanceAlerts = vehiclesNeedingMaintenance.length;

      setStats({
        totalVehicles,
        availableVehicles,
        totalClients,
        activeReservations,
        monthlyRevenue,
        maintenanceAlerts,
        vehiclesNeedingMaintenance,
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <TrendingUp className="w-4 h-4" />
          <span>Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 hover:scale-105 border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor} shadow-lg`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {stats.maintenanceAlerts > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-red-600 dark:text-red-400">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Alertes d'Entretien</span>
              </div>
              <Link to="/entretien">
                <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-100">
                  Voir détails
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              {stats.maintenanceAlerts} véhicule(s) nécessite(nt) un entretien prochainement.
            </p>
            <div className="space-y-2">
              {stats.vehiclesNeedingMaintenance.slice(0, 3).map((vehicle) => {
                const kmSinceLastMaintenance = vehicle.kilometrage - vehicle.km_last_vidange;
                const progressPercentage = (kmSinceLastMaintenance / vehicle.vidange_periodicite_km) * 100;
                
                return (
                  <div key={vehicle.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">
                        {vehicle.marque} {vehicle.modele} - {vehicle.immatriculation}
                      </span>
                      <span className="text-xs text-red-600 font-medium">
                        {Math.round(progressPercentage)}% effectué
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {kmSinceLastMaintenance.toLocaleString()} km depuis dernière vidange 
                      (sur {vehicle.vidange_periodicite_km.toLocaleString()} km)
                    </div>
                  </div>
                );
              })}
              {stats.vehiclesNeedingMaintenance.length > 3 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  +{stats.vehiclesNeedingMaintenance.length - 3} autre(s) véhicule(s)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
