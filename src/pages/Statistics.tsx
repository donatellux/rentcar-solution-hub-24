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
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { t } = useLanguage();
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
        title: t('common.error'),
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
    <div className="section-spacing">
      {/* Header with optimized spacing */}
      <div className="page-header text-center">
        <h1 className="page-title">
          {t('statistics.dashboard')}
        </h1>
        <p className="page-subtitle">{t('statistics.dashboardSubtitle')}</p>
      </div>

      {/* Filters with compact spacing */}
      <Card className="mb-4 sm:mb-6 lg:mb-8">
        <CardHeader className="padding-compact">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            {t('common.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="padding-compact">
          <div className="form-grid">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="period" className="text-xs sm:text-sm">{t('statistics.period')}</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_year">{t('statistics.thisYear')}</SelectItem>
                  <SelectItem value="this_month">{t('statistics.thisMonth')}</SelectItem>
                  <SelectItem value="last_month">{t('statistics.lastMonth')}</SelectItem>
                  <SelectItem value="all">{t('statistics.allPeriods')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="vehicle" className="text-xs sm:text-sm">{t('reservations.vehicle')}</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder={t('statistics.allVehicles')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('statistics.allVehicles')}</SelectItem>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.marque} {vehicle.modele}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="start-date" className="text-xs sm:text-sm">{t('statistics.startDate')}</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="end-date" className="text-xs sm:text-sm">{t('statistics.endDate')}</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 sm:h-10 text-xs sm:text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics with responsive grid */}
      <div className="stats-grid mb-4 sm:mb-6 lg:mb-8">
        {/* Revenue Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-green-500/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
          <CardContent className="card-spacing relative">
            <div className="flex items-start justify-between">
              <div className="space-compact w-full">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="p-1.5 sm:p-2 bg-green-500/20 rounded-lg">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400">
                    {t('statistics.totalRevenue')}
                  </p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-green-700 dark:text-green-300 break-words">
                    {data.totalRevenue.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">MAD</p>
                </div>
                {data.revenueGrowth !== 0 && (
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium w-fit ${
                    data.revenueGrowth > 0 
                      ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' 
                      : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                  }`}>
                    {data.revenueGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(data.revenueGrowth).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-blue-500/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
          <CardContent className="card-spacing relative">
            <div className="flex items-start justify-between">
              <div className="space-compact w-full">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400">
                    {t('statistics.netProfit')}
                  </p>
                </div>
                <div>
                  <p className={`text-lg sm:text-2xl lg:text-3xl font-bold break-words ${data.profit >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-600 dark:text-red-400'}`}>
                    {data.profit.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">MAD</p>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-200 dark:bg-blue-800 rounded-full text-xs font-medium text-blue-800 dark:text-blue-200 w-fit">
                  {t('statistics.margin')}: {data.totalRevenue > 0 ? ((data.profit / data.totalRevenue) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservations Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950 dark:to-violet-900">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-purple-500/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
          <CardContent className="card-spacing relative">
            <div className="flex items-start justify-between">
              <div className="space-compact w-full">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-400">
                    {t('statistics.totalReservations')}
                  </p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-purple-700 dark:text-purple-300">
                    {data.totalReservations}
                  </p>
                  <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium">
                    {t('common.total')}
                  </p>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-purple-200 dark:bg-purple-800 rounded-full text-xs font-medium text-purple-800 dark:text-purple-200 w-fit">
                  <Activity className="w-3 h-3" />
                  {data.activeReservations} {t('statistics.activeLabel')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicles Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950 dark:to-amber-900">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-orange-500/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
          <CardContent className="card-spacing relative">
            <div className="flex items-start justify-between">
              <div className="space-compact w-full">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="p-1.5 sm:p-2 bg-orange-500/20 rounded-lg">
                    <Car className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-orange-700 dark:text-orange-400">
                    {t('statistics.fleetSize')}
                  </p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-orange-700 dark:text-orange-300">
                    {data.totalVehicles}
                  </p>
                  <p className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 font-medium">
                    {t('statistics.vehiclesLabel')}
                  </p>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-orange-200 dark:bg-orange-800 rounded-full text-xs font-medium text-orange-800 dark:text-orange-200 w-fit">
                  <Users className="w-3 h-3" />
                  {data.totalClients} {t('statistics.clientsLabel')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section with responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-responsive">
        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader className="padding-compact">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              {t('statistics.revenueEvolution')}
            </CardTitle>
          </CardHeader>
          <CardContent className="padding-compact">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value) => [`${value} MAD`, t('statistics.totalRevenue')]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 1, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vehicle Performance */}
        <Card>
          <CardHeader className="padding-compact">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Car className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              {t('statistics.vehiclePerformance')}
            </CardTitle>
          </CardHeader>
          <CardContent className="padding-compact">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.vehicleRevenue.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={10}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value) => [`${value} MAD`, t('statistics.totalRevenue')]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader className="padding-compact">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              {t('statistics.expenseBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="padding-compact">
            {data.expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
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
                    fontSize={10}
                  >
                    {data.expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} MAD`]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                {t('statistics.noExpenseData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reservation Status */}
        <Card>
          <CardHeader className="padding-compact">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              {t('statistics.reservationStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent className="padding-compact">
            {data.reservationsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.reservationsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="status" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                {t('statistics.noReservationData')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
