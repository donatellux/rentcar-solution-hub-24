import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Car, 
  Users, 
  DollarSign,
  Filter,
  Target,
  Activity,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface StatisticsData {
  totalRevenue: number;
  totalExpenses: number;
  totalReservations: number;
  totalVehicles: number;
  totalClients: number;
  profit: number;
  averageRevenuePerReservation: number;
  activeReservations: number;
  monthlyRevenue: any[];
  vehicleRevenue: any[];
  expensesByCategory: any[];
  reservationsByStatus: any[];
  revenueGrowth: number;
}

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

export const Statistics: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<StatisticsData>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalReservations: 0,
    totalVehicles: 0,
    totalClients: 0,
    profit: 0,
    averageRevenuePerReservation: 0,
    activeReservations: 0,
    monthlyRevenue: [],
    vehicleRevenue: [],
    expensesByCategory: [],
    reservationsByStatus: [],
    revenueGrowth: 0
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_year');

  useEffect(() => {
    if (user) {
      // Set default dates to current year
      const currentYear = new Date().getFullYear();
      setStartDate(`${currentYear}-01-01`);
      setEndDate(`${currentYear}-12-31`);
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (user && (startDate || endDate || selectedVehicle !== 'all' || selectedPeriod !== 'all')) {
      fetchData();
    }
  }, [startDate, endDate, selectedVehicle, selectedPeriod]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Build date filter
      let dateFilter = '';
      if (startDate && endDate) {
        dateFilter = `date_debut.gte.${startDate},date_debut.lte.${endDate}`;
      } else if (selectedPeriod !== 'all') {
        const now = new Date();
        let startPeriod = new Date();
        
        switch (selectedPeriod) {
          case 'this_month':
            startPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'last_month':
            startPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            break;
          case 'this_year':
            startPeriod = new Date(now.getFullYear(), 0, 1);
            break;
        }
        
        dateFilter = `date_debut.gte.${startPeriod.toISOString().split('T')[0]}`;
      }

      // Vehicle filter
      const vehicleFilter = selectedVehicle !== 'all' ? `vehicule_id.eq.${selectedVehicle}` : '';

      // Fetch reservations with filters
      let reservationsQuery = supabase
        .from('reservations')
        .select('*, vehicles(marque, modele, immatriculation), clients(nom, prenom)')
        .eq('agency_id', user.id);

      if (dateFilter && vehicleFilter) {
        reservationsQuery = reservationsQuery.or(`and(${dateFilter}),and(${vehicleFilter})`);
      } else if (dateFilter) {
        reservationsQuery = reservationsQuery.or(dateFilter);
      } else if (vehicleFilter) {
        reservationsQuery = reservationsQuery.eq('vehicule_id', selectedVehicle);
      }

      const { data: reservations, error: reservationsError } = await reservationsQuery;
      if (reservationsError) throw reservationsError;

      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation')
        .eq('agency_id', user.id);
      if (vehiclesError) throw vehiclesError;

      // Fetch vehicle expenses
      const { data: vehicleExpenses, error: vehicleExpensesError } = await supabase
        .from('vehicle_expenses')
        .select('*')
        .eq('agency_id', user.id);
      if (vehicleExpensesError) throw vehicleExpensesError;

      // Fetch global expenses
      const { data: globalExpenses, error: globalExpensesError } = await supabase
        .from('global_expenses')
        .select('*')
        .eq('agency_id', user.id);
      if (globalExpensesError) throw globalExpensesError;

      // Fetch clients count
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .eq('agency_id', user.id);
      if (clientsError) throw clientsError;

      setVehicles(vehiclesData || []);

      // Calculate statistics
      const totalRevenue = reservations?.reduce((sum, res) => {
        if (res.prix_par_jour && res.date_debut && res.date_fin) {
          const days = Math.ceil((new Date(res.date_fin).getTime() - new Date(res.date_debut).getTime()) / (1000 * 60 * 60 * 24));
          return sum + (res.prix_par_jour * days);
        }
        return sum;
      }, 0) || 0;

      const totalVehicleExpenses = vehicleExpenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      const totalGlobalExpenses = globalExpenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      const totalExpenses = totalVehicleExpenses + totalGlobalExpenses;

      // Calculate additional statistics
      const activeReservations = reservations?.filter(res => res.statut === 'en_cours' || res.statut === 'confirmee').length || 0;
      const averageRevenuePerReservation = reservations?.length ? totalRevenue / reservations.length : 0;
      
      // Calculate occupancy rate (simplified - based on active vs total reservations)
      const occupancyRate = reservations?.length ? (activeReservations / reservations.length) * 100 : 0;

      // Calculate revenue growth (compare this month vs last month)
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const thisMonthRevenue = reservations?.filter(res => {
        if (!res.date_debut) return false;
        const resDate = new Date(res.date_debut);
        return resDate.getMonth() === thisMonth && resDate.getFullYear() === thisYear;
      }).reduce((sum, res) => {
        if (res.prix_par_jour && res.date_debut && res.date_fin) {
          const days = Math.ceil((new Date(res.date_fin).getTime() - new Date(res.date_debut).getTime()) / (1000 * 60 * 60 * 24));
          return sum + (res.prix_par_jour * days);
        }
        return sum;
      }, 0) || 0;

      const lastMonthRevenue = reservations?.filter(res => {
        if (!res.date_debut) return false;
        const resDate = new Date(res.date_debut);
        return resDate.getMonth() === (thisMonth - 1) && resDate.getFullYear() === thisYear;
      }).reduce((sum, res) => {
        if (res.prix_par_jour && res.date_debut && res.date_fin) {
          const days = Math.ceil((new Date(res.date_fin).getTime() - new Date(res.date_debut).getTime()) / (1000 * 60 * 60 * 24));
          return sum + (res.prix_par_jour * days);
        }
        return sum;
      }, 0) || 0;

      const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      // Monthly revenue data
      const monthlyRevenue = [];
      for (let i = 0; i < 12; i++) {
        const month = new Date(2024, i, 1);
        const monthRevenue = reservations?.filter(res => {
          if (!res.date_debut) return false;
          const resMonth = new Date(res.date_debut).getMonth();
          return resMonth === i;
        }).reduce((sum, res) => {
          if (res.prix_par_jour && res.date_debut && res.date_fin) {
            const days = Math.ceil((new Date(res.date_fin).getTime() - new Date(res.date_debut).getTime()) / (1000 * 60 * 60 * 24));
            return sum + (res.prix_par_jour * days);
          }
          return sum;
        }, 0) || 0;

        monthlyRevenue.push({
          month: month.toLocaleDateString('fr-FR', { month: 'short' }),
          revenue: monthRevenue
        });
      }

      // Vehicle revenue data
      const vehicleRevenue = vehiclesData?.map(vehicle => {
        const revenue = reservations?.filter(res => res.vehicule_id === vehicle.id)
          .reduce((sum, res) => {
            if (res.prix_par_jour && res.date_debut && res.date_fin) {
              const days = Math.ceil((new Date(res.date_fin).getTime() - new Date(res.date_debut).getTime()) / (1000 * 60 * 60 * 24));
              return sum + (res.prix_par_jour * days);
            }
            return sum;
          }, 0) || 0;

        return {
          name: `${vehicle.marque} ${vehicle.modele}`,
          revenue
        };
      }).filter(v => v.revenue > 0) || [];

      // Expenses by category
      const expenseCategories = {};
      vehicleExpenses?.forEach(exp => {
        if (exp.category) {
          expenseCategories[exp.category] = (expenseCategories[exp.category] || 0) + (exp.amount || 0);
        }
      });
      globalExpenses?.forEach(exp => {
        if (exp.category) {
          expenseCategories[exp.category] = (expenseCategories[exp.category] || 0) + (exp.amount || 0);
        }
      });

      const expensesByCategory = Object.entries(expenseCategories).map(([category, amount]) => ({
        category,
        amount
      }));

      // Reservations by status
      const statusCounts = {};
      reservations?.forEach(res => {
        const status = res.statut || 'Non défini';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const reservationsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));

      setData({
        totalRevenue,
        totalExpenses,
        totalReservations: reservations?.length || 0,
        totalVehicles: vehiclesData?.length || 0,
        totalClients: clients?.length || 0,
        profit: totalRevenue - totalExpenses,
        averageRevenuePerReservation,
        activeReservations,
        monthlyRevenue,
        vehicleRevenue,
        expensesByCategory,
        reservationsByStatus,
        revenueGrowth
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Tableau de Bord
        </h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre agence de location</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="period">Période</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_year">Cette année</SelectItem>
                  <SelectItem value="this_month">Ce mois</SelectItem>
                  <SelectItem value="last_month">Mois dernier</SelectItem>
                  <SelectItem value="all">Toutes les périodes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="vehicle">Véhicule</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les véhicules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les véhicules</SelectItem>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.marque} {vehicle.modele}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="start-date">Date de début</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Date de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Revenus Totaux</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.totalRevenue.toLocaleString('fr-FR')} MAD
                </p>
                {data.revenueGrowth !== 0 && (
                  <p className={`text-xs flex items-center gap-1 ${data.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.revenueGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(data.revenueGrowth).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Bénéfice Net</p>
                <p className={`text-2xl font-bold ${data.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {data.profit.toLocaleString('fr-FR')} MAD
                </p>
                <p className="text-xs text-muted-foreground">
                  Marge: {data.totalRevenue > 0 ? ((data.profit / data.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Réservations</p>
                <p className="text-2xl font-bold text-purple-600">{data.totalReservations}</p>
                <p className="text-xs text-muted-foreground">
                  {data.activeReservations} actives
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Parc Automobile</p>
                <p className="text-2xl font-bold text-orange-600">{data.totalVehicles}</p>
                <p className="text-xs text-muted-foreground">
                  {data.totalClients} clients
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Car className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Évolution des Revenus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} MAD`, 'Revenus']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vehicle Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-green-600" />
              Performance des Véhicules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.vehicleRevenue.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} MAD`, 'Revenus']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600" />
              Répartition des Dépenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {data.expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} MAD`]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Aucune dépense enregistrée
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reservation Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Statut des Réservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.reservationsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.reservationsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Aucune réservation trouvée
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
