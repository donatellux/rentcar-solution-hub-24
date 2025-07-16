import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download, FileText, TrendingUp, TrendingDown, DollarSign, Car, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface StatsPeriod {
  totalRevenue: number;
  totalExpenses: number;
  totalMaintenanceCosts: number;
  netProfit: number;
  reservationsCount: number;
  averageRevenuePerVehicle: number;
  totalVehicles: number;
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
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (user) {
      fetchStatistics();
    }
  }, [user, dateRange]);

  const fetchStatistics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      // Get reservations data
      const { data: reservations } = await supabase
        .from('reservations')
        .select('prix_par_jour, date_debut, date_fin, statut')
        .eq('agency_id', user.id)
        .gte('date_debut', startDate.toISOString())
        .lte('date_fin', endDate.toISOString());

      // Get expenses data
      const { data: globalExpenses } = await supabase
        .from('global_expenses')
        .select('amount, date')
        .eq('agency_id', user.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      const { data: vehicleExpenses } = await supabase
        .from('vehicle_expenses')
        .select('amount, date')
        .eq('agency_id', user.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      // Get maintenance costs
      const { data: maintenanceExpenses } = await supabase
        .from('entretiens')
        .select('cout, date')
        .eq('agency_id', user.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      // Get vehicles count
      const { data: vehicles } = await supabase
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
      const totalVehicles = vehicles?.length || 0;
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

  const generateComprehensiveReport = async () => {
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
    pdf.setFontSize(16);
    pdf.setTextColor(37, 99, 235);
    pdf.text('RÉSUMÉ EXÉCUTIF', 20, 65);

    const summaryData = [
      ['Indicateur', 'Valeur'],
      ['Revenus Totaux', `${stats.totalRevenue.toLocaleString()} MAD`],
      ['Dépenses Totales', `${stats.totalExpenses.toLocaleString()} MAD`],
      ['Coûts d\'Entretien', `${stats.totalMaintenanceCosts.toLocaleString()} MAD`],
      ['Bénéfice Net', `${stats.netProfit.toLocaleString()} MAD`],
      ['Nombre de Réservations', stats.reservationsCount.toString()],
      ['Revenus par Véhicule', `${stats.averageRevenuePerVehicle.toLocaleString()} MAD`],
      ['Total Véhicules', stats.totalVehicles.toString()],
    ];

    (pdf as any).autoTable({
      head: [summaryData[0]],
      body: summaryData.slice(1),
      startY: 75,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 80, halign: 'right' }
      }
    });

    // Performance Analysis
    let currentY = (pdf as any).lastAutoTable.finalY + 20;
    
    pdf.setFontSize(16);
    pdf.setTextColor(37, 99, 235);
    pdf.text('ANALYSE DE PERFORMANCE', 20, currentY);

    const profitMargin = stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : '0';
    const expenseRatio = stats.totalRevenue > 0 ? (((stats.totalExpenses + stats.totalMaintenanceCosts) / stats.totalRevenue) * 100).toFixed(1) : '0';

    const analysisData = [
      ['Métrique', 'Valeur', 'Analyse'],
      ['Marge Bénéficiaire', `${profitMargin}%`, profitMargin > '15' ? 'Excellente' : profitMargin > '10' ? 'Bonne' : 'À améliorer'],
      ['Ratio Dépenses/Revenus', `${expenseRatio}%`, expenseRatio < '70' ? 'Optimal' : expenseRatio < '85' ? 'Acceptable' : 'Élevé'],
      ['Utilisation Flotte', `${(stats.reservationsCount / (stats.totalVehicles * 30)).toFixed(1)} rés./véh./mois`, 'Variable selon période'],
    ];

    (pdf as any).autoTable({
      head: [analysisData[0]],
      body: analysisData.slice(1),
      startY: currentY + 10,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Recommendations
    currentY = (pdf as any).lastAutoTable.finalY + 20;
    
    pdf.setFontSize(16);
    pdf.setTextColor(37, 99, 235);
    pdf.text('RECOMMANDATIONS', 20, currentY);

    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    
    const recommendations = [
      '• Optimiser les coûts d\'entretien par la maintenance préventive',
      '• Analyser la rentabilité par véhicule pour identifier les plus performants',
      '• Réviser les tarifs si la marge bénéficiaire est faible',
      '• Diversifier les services pour augmenter les revenus par client'
    ];

    let textY = currentY + 15;
    recommendations.forEach(rec => {
      pdf.text(rec, 20, textY);
      textY += 7;
    });

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text('Rapport généré automatiquement par le système de gestion', pageWidth / 2, pdf.internal.pageSize.height - 10, { align: 'center' });

    pdf.save(`rapport-statistiques-${dateRange.startDate}-${dateRange.endDate}.pdf`);

    toast({
      title: "Succès",
      description: "Rapport PDF généré avec succès",
    });
  };

  const statCards = [
    {
      title: 'Revenus Totaux',
      value: `${stats.totalRevenue.toLocaleString()} MAD`,
      icon: DollarSign,
      gradient: 'gradient-success',
      change: stats.totalRevenue > 0 ? '+' : ''
    },
    {
      title: 'Dépenses Totales',
      value: `${stats.totalExpenses.toLocaleString()} MAD`,
      icon: TrendingDown,
      gradient: 'gradient-warning',
    },
    {
      title: 'Coûts Entretien',
      value: `${stats.totalMaintenanceCosts.toLocaleString()} MAD`,
      icon: Wrench,
      gradient: 'gradient-info',
    },
    {
      title: 'Bénéfice Net',
      value: `${stats.netProfit.toLocaleString()} MAD`,
      icon: stats.netProfit >= 0 ? TrendingUp : TrendingDown,
      gradient: stats.netProfit >= 0 ? 'gradient-success' : 'bg-destructive',
    },
    {
      title: 'Réservations',
      value: stats.reservationsCount,
      icon: Calendar,
      gradient: 'gradient-info',
    },
    {
      title: 'Revenus/Véhicule',
      value: `${stats.averageRevenuePerVehicle.toLocaleString()} MAD`,
      icon: Car,
      gradient: 'gradient-primary',
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Statistiques
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Analyse des performances de votre agence</p>
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