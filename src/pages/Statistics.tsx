
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
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
  Calendar, 
  DollarSign,
  BarChart3,
  Filter
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
  monthlyRevenue: any[];
  vehicleRevenue: any[];
  expensesByCategory: any[];
  reservationsByStatus: any[];
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
    monthlyRevenue: [],
    vehicleRevenue: [],
    expensesByCategory: [],
    reservationsByStatus: []
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

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
        monthlyRevenue,
        vehicleRevenue,
        expensesByCategory,
        reservationsByStatus
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Statistiques</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Analysez les performances de votre agence</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      {vehicle.marque} {vehicle.modele} - {vehicle.immatriculation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="period">Période</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les périodes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les périodes</SelectItem>
                  <SelectItem value="this_month">Ce mois</SelectItem>
                  <SelectItem value="last_month">Mois dernier</SelectItem>
                  <SelectItem value="this_year">Cette année</SelectItem>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenus Totaux</p>
                <p className="text-2xl font-bold text-green-600">{data.totalRevenue.toFixed(2)} MAD</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dépenses Totales</p>
                <p className="text-2xl font-bold text-red-600">{data.totalExpenses.toFixed(2)} MAD</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bénéfice Net</p>
                <p className={`text-2xl font-bold ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.profit.toFixed(2)} MAD
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Réservations</p>
                <p className="text-2xl font-bold text-blue-600">{data.totalReservations}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Véhicules</p>
                <p className="text-2xl font-bold text-purple-600">{data.totalVehicles}</p>
              </div>
              <Car className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clients</p>
                <p className="text-2xl font-bold text-orange-600">{data.totalClients}</p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Revenus Mensuels</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} MAD`, 'Revenus']} />
                <Line type="monotone" dataKey="revenue" stroke="#0088FE" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vehicle Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Revenus par Véhicule</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.vehicleRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} MAD`, 'Revenus']} />
                <Bar dataKey="revenue" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Dépenses par Catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
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
          </CardContent>
        </Card>

        {/* Reservations by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Réservations par Statut</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.reservationsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
