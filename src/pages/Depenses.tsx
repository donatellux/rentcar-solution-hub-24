import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Receipt, Car, Building, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface GlobalExpense {
  id: string;
  category: string | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  created_at: string | null;
}

interface VehicleExpense {
  id: string;
  vehicle_id: string | null;
  category: string | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  created_at: string | null;
  vehicles?: {
    marque: string;
    modele: string;
    immatriculation: string;
  };
}

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

export const Depenses: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [globalExpenses, setGlobalExpenses] = useState<GlobalExpense[]>([]);
  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expenseType, setExpenseType] = useState<'global' | 'vehicle'>('global');
  const [editingExpense, setEditingExpense] = useState<GlobalExpense | VehicleExpense | null>(null);
  const [pdfDateRange, setPdfDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: '',
    description: '',
    vehicle_id: '',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: globalData, error: globalError } = await supabase
        .from('global_expenses')
        .select('*')
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (globalError) throw globalError;

      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicle_expenses')
        .select(`
          *,
          vehicles (marque, modele, immatriculation)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (vehicleError) throw vehicleError;

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation')
        .eq('agency_id', user.id);

      if (vehiclesError) throw vehiclesError;

      setGlobalExpenses(globalData || []);
      setVehicleExpenses(vehicleData || []);
      setVehicles(vehiclesData || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const expenseData = {
        category: formData.category,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        date: formData.date || null,
        description: formData.description,
        agency_id: user.id,
      };

      if (expenseType === 'global') {
        let error;
        if (editingExpense && 'vehicle_id' in editingExpense === false) {
          const { error: updateError } = await supabase
            .from('global_expenses')
            .update(expenseData)
            .eq('id', editingExpense.id);
          error = updateError;
        } else {
          const { error: insertError } = await supabase
            .from('global_expenses')
            .insert(expenseData);
          error = insertError;
        }
        if (error) throw error;
      } else {
        const vehicleExpenseData = {
          ...expenseData,
          vehicle_id: formData.vehicle_id || null,
        };

        let error;
        if (editingExpense && 'vehicle_id' in editingExpense) {
          const { error: updateError } = await supabase
            .from('vehicle_expenses')
            .update(vehicleExpenseData)
            .eq('id', editingExpense.id);
          error = updateError;
        } else {
          const { error: insertError } = await supabase
            .from('vehicle_expenses')
            .insert(vehicleExpenseData);
          error = insertError;
        }
        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: editingExpense ? "Dépense modifiée avec succès" : "Dépense ajoutée avec succès",
      });

      setIsDialogOpen(false);
      setEditingExpense(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la dépense",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (expenseId: string, type: 'global' | 'vehicle') => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) return;

    try {
      const table = type === 'global' ? 'global_expenses' : 'vehicle_expenses';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Dépense supprimée avec succès",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la dépense",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (expense: GlobalExpense | VehicleExpense, type: 'global' | 'vehicle') => {
    setEditingExpense(expense);
    setExpenseType(type);
    setFormData({
      category: expense.category || '',
      amount: expense.amount?.toString() || '',
      date: expense.date ? expense.date.split('T')[0] : '',
      description: expense.description || '',
      vehicle_id: 'vehicle_id' in expense ? expense.vehicle_id || '' : '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      category: '',
      amount: '',
      date: '',
      description: '',
      vehicle_id: '',
    });
  };

  const generatePDF = async () => {
    if (!pdfDateRange.startDate || !pdfDateRange.endDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une période valide",
        variant: "destructive",
      });
      return;
    }

    if (new Date(pdfDateRange.startDate) > new Date(pdfDateRange.endDate)) {
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
      pdf.setTextColor(37, 99, 235);
      pdf.text('RAPPORT DES DÉPENSES', pageWidth / 2, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Période du ${new Date(pdfDateRange.startDate).toLocaleDateString('fr-FR')} au ${new Date(pdfDateRange.endDate).toLocaleDateString('fr-FR')}`, pageWidth / 2, 40, { align: 'center' });
      pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 47, { align: 'center' });

      // Filter expenses by date range (inclusive)
      const startDate = new Date(pdfDateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(pdfDateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      const filteredGlobal = globalExpenses.filter(expense => {
        if (!expense.date) return false;
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });

      const filteredVehicle = vehicleExpenses.filter(expense => {
        if (!expense.date) return false;
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });

      let currentY = 60;

      // Global expenses table
      if (filteredGlobal.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(37, 99, 235);
        pdf.text('DÉPENSES GLOBALES', 20, currentY);

        const globalData = [
          ['Date', 'Catégorie', 'Description', 'Montant (MAD)'],
          ...filteredGlobal.map(expense => [
            expense.date ? new Date(expense.date).toLocaleDateString('fr-FR') : 'N/A',
            expense.category || 'N/A',
            expense.description || 'Aucune description',
            `${(expense.amount || 0).toLocaleString('fr-FR')}`
          ])
        ];

        autoTable(pdf, {
          head: [globalData[0]],
          body: globalData.slice(1),
          startY: currentY + 10,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 30 },
            2: { cellWidth: 70 },
            3: { cellWidth: 30, halign: 'right' }
          }
        });

        currentY = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Vehicle expenses table
      if (filteredVehicle.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(37, 99, 235);
        pdf.text('DÉPENSES VÉHICULES', 20, currentY);

        const vehicleData = [
          ['Date', 'Véhicule', 'Catégorie', 'Description', 'Montant (MAD)'],
          ...filteredVehicle.map(expense => [
            expense.date ? new Date(expense.date).toLocaleDateString('fr-FR') : 'N/A',
            expense.vehicles ? `${expense.vehicles.marque} ${expense.vehicles.modele}` : 'N/A',
            expense.category || 'N/A',
            expense.description || 'Aucune description',
            `${(expense.amount || 0).toLocaleString('fr-FR')}`
          ])
        ];

        autoTable(pdf, {
          head: [vehicleData[0]],
          body: vehicleData.slice(1),
          startY: currentY + 10,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 35 },
            2: { cellWidth: 25 },
            3: { cellWidth: 50 },
            4: { cellWidth: 25, halign: 'right' }
          }
        });

        currentY = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Add no data message if no expenses found
      if (filteredGlobal.length === 0 && filteredVehicle.length === 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(128, 128, 128);
        pdf.text('Aucune dépense trouvée pour cette période', pageWidth / 2, currentY, { align: 'center' });
        currentY += 20;
      }
      
      // Total summary
      const totalAmount = [...filteredGlobal, ...filteredVehicle].reduce((sum, expense) => sum + (expense.amount || 0), 0);
      
      pdf.setFontSize(14);
      pdf.setTextColor(37, 99, 235);
      pdf.text('RÉSUMÉ', 20, currentY);
      
      const summaryData = [
        ['Type', 'Nombre', 'Montant Total (MAD)'],
        ['Dépenses Globales', filteredGlobal.length.toString(), filteredGlobal.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString('fr-FR')],
        ['Dépenses Véhicules', filteredVehicle.length.toString(), filteredVehicle.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString('fr-FR')],
        ['TOTAL GÉNÉRAL', (filteredGlobal.length + filteredVehicle.length).toString(), totalAmount.toLocaleString('fr-FR')]
      ];

      autoTable(pdf, {
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: currentY + 10,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10 },
        styles: { fontSize: 9 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' }
        }
      });

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('Rapport généré automatiquement par le système de gestion', pageWidth / 2, pdf.internal.pageSize.height - 10, { align: 'center' });

      // Save and open the PDF
      const fileName = `rapport-depenses-${pdfDateRange.startDate}-${pdfDateRange.endDate}.pdf`;
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

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'carburant':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'entretien':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'assurance':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'reparation':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'administration':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredGlobalExpenses = globalExpenses.filter(expense =>
    `${expense.category} ${expense.description}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredVehicleExpenses = vehicleExpenses.filter(expense =>
    `${expense.category} ${expense.description} ${expense.vehicles?.marque} ${expense.vehicles?.modele}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const {
    currentPage: globalCurrentPage,
    totalPages: globalTotalPages,
    totalItems: globalTotalItems,
    paginatedData: paginatedGlobalExpenses,
    goToPage: globalGoToPage,
    nextPage: globalNextPage,
    prevPage: globalPrevPage,
    hasNext: globalHasNext,
    hasPrev: globalHasPrev,
  } = usePagination({
    data: filteredGlobalExpenses,
    itemsPerPage: 10,
  });

  const {
    currentPage: vehicleCurrentPage,
    totalPages: vehicleTotalPages,
    totalItems: vehicleTotalItems,
    paginatedData: paginatedVehicleExpenses,
    goToPage: vehicleGoToPage,
    nextPage: vehicleNextPage,
    prevPage: vehiclePrevPage,
    hasNext: vehicleHasNext,
    hasPrev: vehicleHasPrev,
  } = usePagination({
    data: filteredVehicleExpenses,
    itemsPerPage: 10,
  });

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dépenses</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez vos dépenses globales et véhicules</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingExpense(null); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle dépense
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 dialog-mobile">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Type de dépense</Label>
                <Tabs value={expenseType} onValueChange={(value) => setExpenseType(value as 'global' | 'vehicle')} className="mt-1">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="global">Dépense globale</TabsTrigger>
                    <TabsTrigger value="vehicle">Dépense véhicule</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner la catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carburant">Carburant</SelectItem>
                      <SelectItem value="entretien">Entretien</SelectItem>
                      <SelectItem value="assurance">Assurance</SelectItem>
                      <SelectItem value="reparation">Réparation</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Montant (MAD) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                {expenseType === 'vehicle' && (
                  <div>
                    <Label htmlFor="vehicle_id">Véhicule</Label>
                    <Select value={formData.vehicle_id} onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner un véhicule" />
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
                )}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingExpense ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        <Button 
          onClick={generatePDF}
          variant="outline" 
          className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
        >
          <Download className="w-4 h-4 mr-2" />
          Rapport PDF
        </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher une dépense..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex space-x-2">
          <Input
            type="date"
            value={pdfDateRange.startDate}
            onChange={(e) => setPdfDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-auto"
          />
          <Input
            type="date"
            value={pdfDateRange.endDate}
            onChange={(e) => setPdfDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-auto"
          />
        </div>
      </div>

      <Tabs defaultValue="global" className="space-y-4">
        <TabsList>
          <TabsTrigger value="global" className="flex items-center space-x-2">
            <Building className="w-4 h-4" />
            <span>Dépenses Globales ({filteredGlobalExpenses.length})</span>
          </TabsTrigger>
          <TabsTrigger value="vehicle" className="flex items-center space-x-2">
            <Car className="w-4 h-4" />
            <span>Dépenses Véhicules ({filteredVehicleExpenses.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <Card>
            <CardHeader>
              <CardTitle>Dépenses Globales</CardTitle>
            </CardHeader>
            <CardContent>
              {paginatedGlobalExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    Aucune dépense globale trouvée
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchTerm ? 'Aucune dépense ne correspond à votre recherche.' : 'Commencez par ajouter votre première dépense globale.'}
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedGlobalExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <Badge className={getCategoryColor(expense.category)}>
                              {expense.category || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {expense.amount ? `${expense.amount} MAD` : 'Non défini'}
                          </TableCell>
                          <TableCell>
                            {expense.date ? new Date(expense.date).toLocaleDateString('fr-FR') : 'Non définie'}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">
                              {expense.description || 'Aucune description'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(expense, 'global')}
                                className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(expense.id, 'global')}
                                className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    currentPage={globalCurrentPage}
                    totalPages={globalTotalPages}
                    totalItems={globalTotalItems}
                    itemsPerPage={10}
                    onPageChange={globalGoToPage}
                    onNext={globalNextPage}
                    onPrev={globalPrevPage}
                    hasNext={globalHasNext}
                    hasPrev={globalHasPrev}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicle">
          <Card>
            <CardHeader>
              <CardTitle>Dépenses Véhicules</CardTitle>
            </CardHeader>
            <CardContent>
              {paginatedVehicleExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    Aucune dépense véhicule trouvée
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchTerm ? 'Aucune dépense ne correspond à votre recherche.' : 'Commencez par ajouter votre première dépense véhicule.'}
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Véhicule</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedVehicleExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {expense.vehicles ? 
                              `${expense.vehicles.marque} ${expense.vehicles.modele} - ${expense.vehicles.immatriculation}` : 
                              'Véhicule inconnu'
                            }
                          </TableCell>
                          <TableCell>
                            <Badge className={getCategoryColor(expense.category)}>
                              {expense.category || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {expense.amount ? `${expense.amount} MAD` : 'Non défini'}
                          </TableCell>
                          <TableCell>
                            {expense.date ? new Date(expense.date).toLocaleDateString('fr-FR') : 'Non définie'}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">
                              {expense.description || 'Aucune description'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(expense, 'vehicle')}
                                className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(expense.id, 'vehicle')}
                                className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    currentPage={vehicleCurrentPage}
                    totalPages={vehicleTotalPages}
                    totalItems={vehicleTotalItems}
                    itemsPerPage={10}
                    onPageChange={vehicleGoToPage}
                    onNext={vehicleNextPage}
                    onPrev={vehiclePrevPage}
                    hasNext={vehicleHasNext}
                    hasPrev={vehicleHasPrev}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
