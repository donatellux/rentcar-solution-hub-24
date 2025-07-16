import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, FileText, TrendingUp, TrendingDown, DollarSign, Car, Wrench, BarChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StatsPeriod {
  totalRevenue: number;
  totalExpenses: number;
  totalMaintenanceCosts: number;
  netProfit: number;
  reservationsCount: number;
  averageRevenuePerVehicle: number;
  totalVehicles: number;
}

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

interface VehicleStats {
  totalRevenue: number;
  totalExpenses: number;
  totalMaintenanceCosts: number;
  netProfit: number;
  reservationsCount: number;
  profitabilityRate: 'Élevée' | 'Moyenne' | 'Faible';
}

export const Statistics: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsPeriod>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalMaintenanceCosts: 0,
    netProfit: 0,
    reservationsCount: 0,
    averageRevenuePerVehicle: 0,
    totalVehicles: 0,
  });
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [vehicleStats, setVehicleStats] = useState<VehicleStats | null>(null);
  const [loadingVehicleStats, setLoadingVehicleStats] = useState(false);
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchVehicles = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation')
        .eq('agency_id', user.id);

      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchStatistics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      // Get reservations data with corrected date filtering
      const { data: reservations } = await supabase
        .from('reservations')
        .select('prix_par_jour, date_debut, date_fin, statut')
        .eq('agency_id', user.id)
        .gte('date_debut', startDate.toISOString())
        .lte('date_debut', endDate.toISOString());

      // Get expenses data
      const { data: globalExpenses } = await supabase
        .from('global_expenses')
        .select('amount, date')
        .eq('agency_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      const { data: vehicleExpenses } = await supabase
        .from('vehicle_expenses')
        .select('amount, date')
        .eq('agency_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      // Get maintenance costs
      const { data: maintenanceExpenses } = await supabase
        .from('entretiens')
        .select('cout, date')
        .eq('agency_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      // Get vehicles count
      const { data: vehiclesList } = await supabase
        .from('vehicles')
        .select('id')
        .eq('agency_id', user.id);

      // Calculate statistics
      const totalRevenue = reservations?.reduce((sum, reservation) => {
        if (reservation.prix_par_jour && reservation.date_debut && reservation.date_fin) {
          const start = new Date(reservation.date_debut);
          const end = new Date(reservation.date_fin);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return sum + (reservation.prix_par_jour * Math.max(days, 1));
        }
        return sum;
      }, 0) || 0;

      const totalExpenses = [
        ...(globalExpenses || []).map(e => e.amount || 0),
        ...(vehicleExpenses || []).map(e => e.amount || 0)
      ].reduce((sum, amount) => sum + amount, 0);

      const totalMaintenanceCosts = maintenanceExpenses?.reduce((sum, expense) => 
        sum + (expense.cout || 0), 0) || 0;

      const netProfit = totalRevenue - totalExpenses - totalMaintenanceCosts;
      const totalVehicles = vehiclesList?.length || 0;
      const averageRevenuePerVehicle = totalVehicles > 0 ? totalRevenue / totalVehicles : 0;

      setStats({
        totalRevenue,
        totalExpenses,
        totalMaintenanceCosts,
        netProfit,
        reservationsCount: reservations?.length || 0,
        averageRevenuePerVehicle,
        totalVehicles,
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

  const fetchVehicleStatistics = async (vehicleId: string) => {
    if (!user) return;
    setLoadingVehicleStats(true);

    try {
      // Fetch real reservations data for the specific vehicle
      const reservationsQuery = await supabase
        .from('reservations')
        .select('prix_par_jour, date_debut, date_fin, statut')
        .eq('agency_id', user.id)
        .eq('vehicule_id', vehicleId)
        .gte('date_debut', dateRange.startDate)
        .lte('date_fin', dateRange.endDate);

      // Fetch real vehicle expenses data  
      const vehicleExpensesQuery = await supabase
        .from('vehicle_expenses')
        .select('amount, date')
        .eq('agency_id', user.id)
        .eq('vehicle_id', vehicleId)
        .gte('date', new Date(dateRange.startDate).toISOString().split('T')[0])
        .lte('date', new Date(dateRange.endDate).toISOString().split('T')[0]);

      // Fetch real maintenance data
      const maintenanceQuery = await supabase
        .from('entretiens')
        .select('cout, date')
        .eq('agency_id', user.id)
        .eq('vehicule_id', vehicleId)
        .gte('date', new Date(dateRange.startDate).toISOString().split('T')[0])
        .lte('date', new Date(dateRange.endDate).toISOString().split('T')[0]);

      const reservations = reservationsQuery.data || [];
      const vehicleExpenses = vehicleExpensesQuery.data || [];
      const maintenanceExpenses = maintenanceQuery.data || [];

      // Debug logging to check what data is being returned
      console.log('Vehicle ID:', vehicleId);
      console.log('Reservations data:', reservations);
      console.log('Vehicle expenses data:', vehicleExpenses);
      console.log('Maintenance data:', maintenanceExpenses);
      console.log('Reservations query error:', reservationsQuery.error);
      console.log('Vehicle expenses query error:', vehicleExpensesQuery.error);
      console.log('Maintenance query error:', maintenanceQuery.error);

      // Calculate vehicle statistics using real data
      const totalRevenue = (reservations || []).reduce((sum, reservation) => {
        if (reservation.prix_par_jour && reservation.date_debut && reservation.date_fin) {
          const start = new Date(reservation.date_debut);
          const end = new Date(reservation.date_fin);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
          return sum + (reservation.prix_par_jour * days);
        }
        return sum;
      }, 0);

      const totalExpenses = (vehicleExpenses || []).reduce((sum, expense) => 
        sum + (expense.amount || 0), 0);

      const totalMaintenanceCosts = (maintenanceExpenses || []).reduce((sum, expense) => 
        sum + (expense.cout || 0), 0);

      const netProfit = totalRevenue - totalExpenses - totalMaintenanceCosts;
      const reservationsCount = (reservations || []).length;

      // Calculate profitability rate
      let profitabilityRate: 'Élevée' | 'Moyenne' | 'Faible' = 'Faible';
      if (totalRevenue > 0) {
        const profitMargin = (netProfit / totalRevenue) * 100;
        if (profitMargin >= 20) profitabilityRate = 'Élevée';
        else if (profitMargin >= 10) profitabilityRate = 'Moyenne';
      }

      setVehicleStats({
        totalRevenue,
        totalExpenses,
        totalMaintenanceCosts,
        netProfit,
        reservationsCount,
        profitabilityRate,
      });

      console.log('Vehicle Stats calculated:', {
        totalRevenue,
        totalExpenses,
        totalMaintenanceCosts,
        netProfit,
        reservationsCount,
        profitabilityRate,
      });

    } catch (error) {
      console.error('Error fetching vehicle statistics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques du véhicule",
        variant: "destructive",
      });
    } finally {
      setLoadingVehicleStats(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStatistics();
      fetchVehicles();
    }
  }, [user, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (selectedVehicle) {
      fetchVehicleStatistics(selectedVehicle);
    }
  }, [selectedVehicle, dateRange.startDate, dateRange.endDate]);

  const generateComprehensiveReport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une période valide",
        variant: "destructive",
      });
      return;
    }

    if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
      toast({
        title: "Erreur",
        description: "La date de début doit être antérieure à la date de fin",
        variant: "destructive",
      });
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      
      // Header with logo space
      pdf.setFontSize(20);
      pdf.setTextColor(37, 99, 235); // Blue color
      pdf.text('RAPPORT STATISTIQUES AGENCE', pageWidth / 2, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Période du ${new Date(dateRange.startDate).toLocaleDateString('fr-FR')} au ${new Date(dateRange.endDate).toLocaleDateString('fr-FR')}`, pageWidth / 2, 40, { align: 'center' });
      pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 47, { align: 'center' });

      // Summary section
      pdf.setFontSize(14);
      pdf.setTextColor(37, 99, 235);
      pdf.text('RÉSUMÉ EXÉCUTIF', 20, 65);

      const summaryData = [
        ['Indicateur', 'Valeur'],
        ['Revenus Totaux', `${Math.round(stats.totalRevenue).toString()} MAD`],
        ['Dépenses Totales', `${Math.round(stats.totalExpenses).toString()} MAD`],
        ['Coûts d\'Entretien', `${Math.round(stats.totalMaintenanceCosts).toString()} MAD`],
        ['Bénéfice Net', `${Math.round(stats.netProfit).toString()} MAD`],
        ['Nombre de Réservations', stats.reservationsCount.toString()],
        ['Total Véhicules', stats.totalVehicles.toString()],
      ];

      autoTable(pdf, {
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: 75,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 70 },
          1: { cellWidth: 70, halign: 'right' }
        }
      });

      // Save and open the PDF
      const fileName = `rapport-statistiques-${dateRange.startDate}-${dateRange.endDate}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Succès",
        description: "Rapport PDF généré avec succès",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération du PDF",
        variant: "destructive",
      });
    }
  };

  const statCards = [
    {
      title: 'Revenus Totaux',
      value: `${Math.round(stats.totalRevenue).toString()} MAD`,
      icon: DollarSign,
      gradient: 'gradient-success',
    },
    {
      title: 'Dépenses Totales',
      value: `${Math.round(stats.totalExpenses).toString()} MAD`,
      icon: TrendingDown,
      gradient: 'gradient-warning',
    },
    {
      title: 'Coûts Entretien',
      value: `${Math.round(stats.totalMaintenanceCosts).toString()} MAD`,
      icon: Wrench,
      gradient: 'gradient-info',
    },
    {
      title: 'Bénéfice Net',
      value: `${Math.round(stats.netProfit).toString()} MAD`,
      icon: stats.netProfit >= 0 ? TrendingUp : TrendingDown,
      gradient: stats.netProfit >= 0 ? 'gradient-success' : 'bg-destructive',
    },
    {
      title: 'Réservations',
      value: stats.reservationsCount.toString(),
      icon: Calendar,
      gradient: 'gradient-info',
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Statistiques
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Analyse des performances de votre agence pour la période sélectionnée</p>
        </div>
        
        <Button 
          onClick={generateComprehensiveReport}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          disabled={loading}
        >
          <Download className="w-4 h-4 mr-2" />
          Rapport PDF
        </Button>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Période d'analyse</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart className="w-5 h-5" />
            <span>Analyse de Rentabilité par Véhicule</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="w-full max-w-xs">
              <Label htmlFor="vehicleSelect">Sélectionner un véhicule</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger id="vehicleSelect" className="mt-1">
                  <SelectValue placeholder="Choisir un véhicule..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.marque} {vehicle.modele} - {vehicle.immatriculation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVehicle && vehicleStats && (
              <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-lg">
                    <h4 className="font-medium text-green-700 dark:text-green-300 text-sm">Revenus Totaux</h4>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {Math.round(vehicleStats.totalRevenue).toString()} MAD
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 p-4 rounded-lg">
                    <h4 className="font-medium text-red-700 dark:text-red-300 text-sm">Dépenses Totales</h4>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {Math.round(vehicleStats.totalExpenses + vehicleStats.totalMaintenanceCosts).toString()} MAD
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-700 dark:text-blue-300 text-sm">Bénéfice Net</h4>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {Math.round(vehicleStats.netProfit).toString()} MAD
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    vehicleStats.profitabilityRate === 'Élevée' 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950'
                      : vehicleStats.profitabilityRate === 'Moyenne'
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950'
                      : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950'
                  }`}>
                    <h4 className={`font-medium text-sm ${
                      vehicleStats.profitabilityRate === 'Élevée' 
                        ? 'text-green-700 dark:text-green-300'
                        : vehicleStats.profitabilityRate === 'Moyenne'
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>Rentabilité</h4>
                    <p className={`text-lg font-bold ${
                      vehicleStats.profitabilityRate === 'Élevée' 
                        ? 'text-green-600 dark:text-green-400'
                        : vehicleStats.profitabilityRate === 'Moyenne'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {vehicleStats.profitabilityRate}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Détails des Coûts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Dépenses Directes:</span>
                      <span className="ml-2 font-medium">{Math.round(vehicleStats.totalExpenses).toString()} MAD</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Coûts d'Entretien:</span>
                      <span className="ml-2 font-medium">{Math.round(vehicleStats.totalMaintenanceCosts).toString()} MAD</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Nombre de Réservations:</span>
                      <span className="ml-2 font-medium">{vehicleStats.reservationsCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loadingVehicleStats && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement des statistiques...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-elegant transition-all-smooth hover:scale-105 border-0 overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between">
                  <div className="z-10 relative">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-4 rounded-2xl ${stat.gradient} shadow-elegant z-10 relative`}>
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
                <div className={`absolute top-0 right-0 w-24 h-24 ${stat.gradient} opacity-10 rounded-full transform translate-x-8 -translate-y-8`}></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Analyse de Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg">
              <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2">Marge Bénéficiaire</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : '0'}%
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg">
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Ratio Dépenses</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalRevenue > 0 ? (((stats.totalExpenses + stats.totalMaintenanceCosts) / stats.totalRevenue) * 100).toFixed(1) : '0'}%
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 rounded-lg">
              <h3 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">Utilisation Flotte</h3>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalVehicles > 0 ? (stats.reservationsCount / stats.totalVehicles).toFixed(1) : '0'} rés./véh.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};