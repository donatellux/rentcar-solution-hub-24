import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Wrench, AlertTriangle, Calendar, Car, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Entretien {
  id: string;
  vehicule_id: string | null;
  type: string | null;
  date: string | null;
  cout: number | null;
  description: string | null;
  km_last_vidange: number | null;
  vidange_periodicite_km: number | null;
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
  kilometrage: number;
  km_last_vidange: number;
  vidange_periodicite_km: number;
}

interface VehicleNeedingMaintenance extends Vehicle {
  kmSinceLastMaintenance: number;
  progressPercentage: number;
}

export const Entretien: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entretiens, setEntretiens] = useState<Entretien[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesNeedingMaintenance, setVehiclesNeedingMaintenance] = useState<VehicleNeedingMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntretien, setEditingEntretien] = useState<Entretien | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'history'>('alerts');
  const [pdfDateRange, setPdfDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [formData, setFormData] = useState({
    vehicule_id: '',
    type: '',
    date: '',
    cout: '',
    description: '',
    km_last_vidange: '',
    vidange_periodicite_km: '',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: entretiensData, error: entretiensError } = await supabase
        .from('entretiens')
        .select(`
          *,
          vehicles (marque, modele, immatriculation)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (entretiensError) throw entretiensError;

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation, kilometrage, km_last_vidange, vidange_periodicite_km')
        .eq('agency_id', user.id);

      if (vehiclesError) throw vehiclesError;

      // Calculate vehicles needing maintenance
      const needingMaintenance = vehiclesData?.filter(vehicle => {
        if (vehicle.kilometrage && vehicle.km_last_vidange && vehicle.vidange_periodicite_km) {
          const kmSinceLastMaintenance = vehicle.kilometrage - vehicle.km_last_vidange;
          return kmSinceLastMaintenance >= vehicle.vidange_periodicite_km * 0.9;
        }
        return false;
      }).map(vehicle => {
        const kmSinceLastMaintenance = vehicle.kilometrage - vehicle.km_last_vidange;
        const progressPercentage = (kmSinceLastMaintenance / vehicle.vidange_periodicite_km) * 100;
        return {
          ...vehicle,
          kmSinceLastMaintenance,
          progressPercentage,
        };
      }) || [];

      setEntretiens(entretiensData || []);
      setVehicles(vehiclesData || []);
      setVehiclesNeedingMaintenance(needingMaintenance);
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
      const entretienData = {
        vehicule_id: formData.vehicule_id || null,
        type: formData.type,
        date: formData.date || null,
        cout: formData.cout ? parseFloat(formData.cout) : null,
        description: formData.description,
        km_last_vidange: formData.km_last_vidange ? parseInt(formData.km_last_vidange) : null,
        vidange_periodicite_km: formData.vidange_periodicite_km ? parseInt(formData.vidange_periodicite_km) : null,
        agency_id: user.id,
      };

      let error;
      if (editingEntretien) {
        const { error: updateError } = await supabase
          .from('entretiens')
          .update(entretienData)
          .eq('id', editingEntretien.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('entretiens')
          .insert(entretienData);
        error = insertError;
      }

      if (error) throw error;

      // Update vehicle maintenance info if this is a vidange
      if (formData.type === 'vidange' && formData.vehicule_id && formData.km_last_vidange) {
        const { error: vehicleUpdateError } = await supabase
          .from('vehicles')
          .update({
            km_last_vidange: parseInt(formData.km_last_vidange),
            vidange_periodicite_km: formData.vidange_periodicite_km ? parseInt(formData.vidange_periodicite_km) : null,
          })
          .eq('id', formData.vehicule_id);

        if (vehicleUpdateError) {
          console.error('Error updating vehicle:', vehicleUpdateError);
        }
      }

      toast({
        title: "Succès",
        description: editingEntretien ? "Entretien modifié avec succès" : "Entretien ajouté avec succès",
      });

      setIsDialogOpen(false);
      setEditingEntretien(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving entretien:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'entretien",
        variant: "destructive",
      });
    }
  };

  const handleQuickMaintenance = (vehicle: VehicleNeedingMaintenance) => {
    setFormData({
      vehicule_id: vehicle.id,
      type: 'vidange',
      date: new Date().toISOString().split('T')[0],
      cout: '',
      description: `Vidange effectuée à ${vehicle.kilometrage.toLocaleString()} km`,
      km_last_vidange: vehicle.kilometrage.toString(),
      vidange_periodicite_km: vehicle.vidange_periodicite_km.toString(),
    });
    setEditingEntretien(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (entretienId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet entretien ?')) return;

    try {
      const { error } = await supabase
        .from('entretiens')
        .delete()
        .eq('id', entretienId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Entretien supprimé avec succès",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting entretien:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entretien",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (entretien: Entretien) => {
    setEditingEntretien(entretien);
    setFormData({
      vehicule_id: entretien.vehicule_id || '',
      type: entretien.type || '',
      date: entretien.date ? entretien.date.split('T')[0] : '',
      cout: entretien.cout?.toString() || '',
      description: entretien.description || '',
      km_last_vidange: entretien.km_last_vidange?.toString() || '',
      vidange_periodicite_km: entretien.vidange_periodicite_km?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      vehicule_id: '',
      type: '',
      date: '',
      cout: '',
      description: '',
      km_last_vidange: '',
      vidange_periodicite_km: '',
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
      pdf.text('RAPPORT DES ENTRETIENS', pageWidth / 2, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Période du ${new Date(pdfDateRange.startDate).toLocaleDateString('fr-FR')} au ${new Date(pdfDateRange.endDate).toLocaleDateString('fr-FR')}`, pageWidth / 2, 40, { align: 'center' });
      pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 47, { align: 'center' });

      // Filter entretiens by date range (inclusive)
      const startDate = new Date(pdfDateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(pdfDateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      const filteredEntretiens = entretiens.filter(entretien => {
        if (!entretien.date) return false;
        const entretienDate = new Date(entretien.date);
        return entretienDate >= startDate && entretienDate <= endDate;
      });

      if (filteredEntretiens.length > 0) {
        // Group by type for analysis
        const typeGroups = filteredEntretiens.reduce((groups, entretien) => {
          const type = entretien.type || 'Autre';
          if (!groups[type]) groups[type] = [];
          groups[type].push(entretien);
          return groups;
        }, {} as Record<string, typeof filteredEntretiens>);

        // Main table
        const tableData = [
          ['Date', 'Véhicule', 'Type', 'Description', 'Coût (MAD)'],
          ...filteredEntretiens.map(entretien => [
            entretien.date ? new Date(entretien.date).toLocaleDateString('fr-FR') : 'N/A',
            entretien.vehicles ? `${entretien.vehicles.marque} ${entretien.vehicles.modele} (${entretien.vehicles.immatriculation})` : 'N/A',
            entretien.type || 'N/A',
            entretien.description || 'Aucune description',
            `${(entretien.cout || 0).toLocaleString('fr-FR')}`
          ])
        ];

        autoTable(pdf, {
          head: [tableData[0]],
          body: tableData.slice(1),
          startY: 60,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 40 },
            2: { cellWidth: 20 },
            3: { cellWidth: 50 },
            4: { cellWidth: 25, halign: 'right' }
          }
        });

        // Summary by type
        const totalCost = filteredEntretiens.reduce((sum, entretien) => sum + (entretien.cout || 0), 0);
        let finalY = (pdf as any).lastAutoTable.finalY + 20;
        
        pdf.setFontSize(14);
        pdf.setTextColor(37, 99, 235);
        pdf.text('RÉSUMÉ PAR TYPE', 20, finalY);
        
        const summaryData = [
          ['Type d\'entretien', 'Nombre', 'Coût Total (MAD)'],
          ...Object.entries(typeGroups).map(([type, entries]) => [
            type,
            entries.length.toString(),
            entries.reduce((sum, e) => sum + (e.cout || 0), 0).toLocaleString('fr-FR')
          ]),
          ['TOTAL GÉNÉRAL', filteredEntretiens.length.toString(), totalCost.toLocaleString('fr-FR')]
        ];

        autoTable(pdf, {
          head: [summaryData[0]],
          body: summaryData.slice(1),
          startY: finalY + 10,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10 },
          styles: { fontSize: 9 },
          columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' }
          }
        });
      } else {
        pdf.setFontSize(12);
        pdf.setTextColor(128, 128, 128);
        pdf.text('Aucun entretien trouvé pour cette période', pageWidth / 2, 60, { align: 'center' });
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('Rapport généré automatiquement par le système de gestion', pageWidth / 2, pdf.internal.pageSize.height - 10, { align: 'center' });

      // Save and open the PDF
      const fileName = `rapport-entretiens-${pdfDateRange.startDate}-${pdfDateRange.endDate}.pdf`;
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

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'vidange':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'revision':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'reparation':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'controle_technique':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredEntretiens = entretiens.filter(entretien =>
    `${entretien.type} ${entretien.description} ${entretien.vehicles?.marque} ${entretien.vehicles?.modele}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Entretiens
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez l'entretien de vos véhicules</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingEntretien(null); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Nouvel entretien
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 dialog-mobile">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingEntretien ? 'Modifier l\'entretien' : 'Nouvel entretien'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicule_id">Véhicule *</Label>
                  <Select value={formData.vehicule_id} onValueChange={(value) => setFormData({ ...formData, vehicule_id: value })}>
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
                <div>
                  <Label htmlFor="type">Type d'entretien *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vidange">Vidange</SelectItem>
                      <SelectItem value="revision">Révision</SelectItem>
                      <SelectItem value="reparation">Réparation</SelectItem>
                      <SelectItem value="controle_technique">Contrôle technique</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
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
                <div>
                  <Label htmlFor="cout">Coût (MAD)</Label>
                  <Input
                    id="cout"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cout}
                    onChange={(e) => setFormData({ ...formData, cout: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="km_last_vidange">Km dernière vidange</Label>
                  <Input
                    id="km_last_vidange"
                    type="number"
                    min="0"
                    value={formData.km_last_vidange}
                    onChange={(e) => setFormData({ ...formData, km_last_vidange: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="vidange_periodicite_km">Périodicité vidange (Km)</Label>
                  <Input
                    id="vidange_periodicite_km"
                    type="number"
                    min="0"
                    value={formData.vidange_periodicite_km}
                    onChange={(e) => setFormData({ ...formData, vidange_periodicite_km: e.target.value })}
                    className="mt-1"
                  />
                </div>
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
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  {editingEntretien ? 'Modifier' : 'Ajouter'}
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

      {/* PDF Date Range and Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un entretien..."
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
            placeholder="Date début"
          />
          <Input
            type="date"
            value={pdfDateRange.endDate}
            onChange={(e) => setPdfDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-auto"
            placeholder="Date fin"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            activeTab === 'alerts'
              ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 mr-2 inline" />
          Alertes ({vehiclesNeedingMaintenance.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 mr-2 inline" />
          Historique ({filteredEntretiens.length})
        </button>
      </div>

      {activeTab === 'alerts' && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="w-5 h-5" />
              <span>Véhicules nécessitant un entretien</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehiclesNeedingMaintenance.length === 0 ? (
              <div className="text-center py-8">
                <Car className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  Aucun véhicule ne nécessite d'entretien
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Tous vos véhicules sont à jour au niveau de l'entretien.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {vehiclesNeedingMaintenance.map((vehicle) => (
                  <div key={vehicle.id} className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {vehicle.marque} {vehicle.modele}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          {vehicle.immatriculation}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleQuickMaintenance(vehicle)}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
                      >
                        <Wrench className="w-4 h-4 mr-2" />
                        Effectuer vidange
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progression depuis dernière vidange</span>
                        <span className="font-medium text-orange-600">
                          {Math.round(vehicle.progressPercentage)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(vehicle.progressPercentage, 100)}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {vehicle.kmSinceLastMaintenance.toLocaleString()} km / {vehicle.vidange_periodicite_km.toLocaleString()} km
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher un entretien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historique des entretiens ({filteredEntretiens.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredEntretiens.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    Aucun entretien trouvé
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchTerm ? 'Aucun entretien ne correspond à votre recherche.' : 'Commencez par ajouter votre premier entretien.'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => { resetForm(); setEditingEntretien(null); setIsDialogOpen(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nouvel entretien
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Véhicule</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Coût</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntretiens.map((entretien) => (
                      <TableRow key={entretien.id}>
                        <TableCell>
                          {entretien.vehicles ? 
                            `${entretien.vehicles.marque} ${entretien.vehicles.modele} - ${entretien.vehicles.immatriculation}` : 
                            'Véhicule inconnu'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(entretien.type)}>
                            {entretien.type || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entretien.date ? new Date(entretien.date).toLocaleDateString('fr-FR') : 'Non définie'}
                        </TableCell>
                        <TableCell>
                          {entretien.cout ? `${entretien.cout} MAD` : 'Non défini'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {entretien.description || 'Aucune description'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(entretien)}
                              className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(entretien.id)}
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
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
