import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Calendar as CalendarIcon,
  Car,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

interface Reservation {
  id: string;
  vehicule_id: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  client_name?: string;
}

const CalendarAvailability: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Get current month data
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, currentDate]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation')
        .eq('agency_id', user.id);
      
      if (vehiclesError) throw vehiclesError;

      // Fetch reservations for current month
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          id, 
          vehicule_id, 
          date_debut, 
          date_fin, 
          statut,
          clients(nom, prenom)
        `)
        .eq('agency_id', user.id)
        .or(`date_debut.lte.${endOfMonth},date_fin.gte.${startOfMonth}`);

      if (reservationsError) throw reservationsError;

      // Process reservations
      const processedReservations = reservationsData?.map(res => ({
        ...res,
        client_name: res.clients ? `${res.clients.nom} ${res.clients.prenom}` : 'Client non défini'
      })) || [];

      setVehicles(vehiclesData || []);
      setReservations(processedReservations);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => 
    vehicle.marque.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.modele.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.immatriculation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getReservationForDay = (vehicleId: string, day: number) => {
    const targetDate = new Date(currentYear, currentMonth, day);
    return reservations.find(res => {
      const startDate = new Date(res.date_debut);
      const endDate = new Date(res.date_fin);
      return res.vehicule_id === vehicleId && 
             targetDate >= startDate && 
             targetDate <= endDate;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmee':
      case 'en_cours':
        return 'bg-blue-500';
      case 'terminee':
        return 'bg-green-500';
      case 'annulee':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmee':
        return 'Confirmée';
      case 'en_cours':
        return 'En cours';
      case 'terminee':
        return 'Terminée';
      case 'annulee':
        return 'Annulée';
      default:
        return 'À venir';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CalendarIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendrier de Disponibilité</h1>
            <p className="text-muted-foreground">Gérez la disponibilité de votre flotte</p>
          </div>
        </div>
      </div>

      {/* Search and Navigation */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher par Marque, Modèle ou Immatriculation"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center capitalize">
            {monthName}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm">Terminé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm">En cours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-sm">À venir</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-sm">Annulé</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Vehicle List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Véhicules ({filteredVehicles.length})</h3>
          <div className="space-y-3">
            {filteredVehicles.map(vehicle => (
              <Card key={vehicle.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <Car className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{vehicle.marque} {vehicle.modele}</p>
                    <p className="text-xs text-muted-foreground">{vehicle.immatriculation}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="grid grid-cols-7 gap-2 text-center">
                {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                  <div key={day} className="p-2 text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredVehicles.map(vehicle => (
                  <div key={vehicle.id} className="space-y-2">
                    <div className="text-sm font-medium text-foreground">
                      {vehicle.marque} {vehicle.modele}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {/* Empty cells for days before month starts */}
                      {Array.from({ length: firstDayOfMonth }, (_, index) => (
                        <div key={`empty-${index}`} className="h-8"></div>
                      ))}
                      
                      {/* Days of the month */}
                      {Array.from({ length: daysInMonth }, (_, index) => {
                        const day = index + 1;
                        const reservation = getReservationForDay(vehicle.id, day);
                        
                        return (
                          <div 
                            key={day} 
                            className="h-8 border rounded text-xs flex items-center justify-center relative group cursor-pointer hover:border-primary"
                          >
                            <span className="text-muted-foreground">{day}</span>
                            {reservation && (
                              <>
                                <div 
                                  className={`absolute inset-0 rounded opacity-80 ${getStatusColor(reservation.statut)}`}
                                ></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-white text-xs font-medium">{day}</span>
                                </div>
                                
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity z-10 min-w-max">
                                  <div className="font-medium">{reservation.client_name}</div>
                                  <div className="text-muted-foreground">{getStatusLabel(reservation.statut)}</div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CalendarAvailability;