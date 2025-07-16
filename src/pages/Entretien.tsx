import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCheck, Grip, Plus, Search, Edit, Trash2, Download, Car } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

interface EntretienType {
  id: string;
  vehicle_id: string | null;
  type: string | null;
  cout: number | null;
  date: string | null;
  description: string | null;
  statut: string | null;
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

export const Entretien: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entretiens, setEntretiens] = useState<EntretienType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntretien, setEditingEntretien] = useState<EntretienType | null>(null);
  const [pdfDateRange, setPdfDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [formData, setFormData] = useState({
    vehicle_id: '',
    type: '',
    cout: '',
    date: '',
    description: '',
    statut: 'planifie',
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
        .select('id, marque, modele, immatriculation')
        .eq('agency_id', user.id);

      if (vehiclesError) throw vehiclesError;

      setEntretiens(entretiensData || []);
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
      const entretienData = {
        vehicle_id: formData.vehicle_id || null,
        type: formData.type,
        cout: formData.cout ? parseFloat(formData.cout) : null,
        date: formData.date || null,
        description: formData.description,
        statut: formData.statut,
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

  const handleEdit = (entretien: EntretienType) => {
    setEditingEntretien(entretien);
    setFormData({
      vehicle_id: entretien.vehicle_id || '',
      type: entretien.type || '',
      cout: entretien.cout?.toString() || '',
      date: entretien.date ? entretien.date.split('T')[0] : '',
      description: entretien.description || '',
      statut: entretien.statut || 'planifie',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      type: '',
      cout: '',
      date: '',
      description: '',
      statut: 'planifie',
    });
  };

  const generatePDF = async () => {
    if (!pdfDateRange.startDate || !pdfDateRange.endDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une période valide",
      });
      return;
    }

    try {
      console.log('Generating maintenance PDF for date range:', pdfDateRange);
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      
      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(37, 99, 235);
      pdf.text('RAPPORT D\'ENTRETIEN', pageWidth / 2, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      const startDateFormatted = new Date(pdfDateRange.startDate).toLocaleDateString('fr-FR');
      const endDateFormatted = new Date(pdfDateRange.endDate).toLocaleDateString('fr-FR');
      pdf.text(`Période du ${startDateFormatted} au ${endDateFormatted}`, pageWidth / 2, 40, { align: 'center' });
      pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 47, { align: 'center' });

      // Filter maintenance by date range
      const startDate = new Date(pdfDateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(pdfDateRange.endDate);
      endDate.setHours(23, 59, 59, 999);

      console.log('Filtering maintenance between:', startDate, 'and', endDate);
      console.log('Maintenance before filter:', entretiens.length);

      const filteredEntretiens = entretiens.filter(entretien => {
        if (!entretien.date) return false;
        const entretienDate = new Date(entretien.date);
        return entretienDate >= startDate && entretienDate <= endDate;
      });

      console.log('Filtered maintenance:', filteredEntretiens.length);

      let currentY = 65;

      if (filteredEntretiens.length > 0) {
        pdf.setFontSize(16);
        pdf.setTextColor(37, 99, 235);
        pdf.text('OPÉRATIONS D\'ENTRETIEN', 20, currentY);

        const entretienData = [
          ['Date', 'Véhicule', 'Type', 'Description', 'Coût (MAD)', 'Statut'],
          ...filteredEntretiens.map(entretien => [
            entretien.date ? new Date(entretien.date).toLocaleDateString('fr-FR') : 'N/A',
            entretien.vehicles ? `${entretien.vehicles.marque} ${entretien.vehicles.modele}` : 'N/A',
            entretien.type || 'N/A',
            entretien.description || 'Aucune description',
            `${(entretien.cout || 0).toLocaleString('fr-FR')}`,
            entretien.statut || 'N/A'
          ])
        ];

        (pdf as any).autoTable({
          head: [entretienData[0]],
          body: entretienData.slice(1),
          startY: currentY + 10,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 40 },
            2: { cellWidth: 25 },
            3: { cellWidth: 50 },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 25 }
          }
        });

        currentY = (pdf as any).lastAutoTable.finalY + 20;
      } else {
        pdf.setFontSize(12);
        pdf.setTextColor(128, 128, 128);
        pdf.text('Aucun entretien trouvé pour cette période', pageWidth / 2, currentY, { align: 'center' });
        currentY += 30;
      }

      // Summary section
      const totalCost = filteredEntretiens.reduce((sum, entretien) => sum + (entretien.cout || 0), 0);
      const completedCount = filteredEntretiens.filter(e => e.statut === 'termine').length;
      const pendingCount = filteredEntretiens.filter(e => e.statut === 'en_cours' || e.statut === 'planifie').length;
      
      pdf.setFontSize(16);
      pdf.setTextColor(37, 99, 235);
      pdf.text('RÉSUMÉ', 20, currentY);
      
      const summaryData = [
        ['Indicateur', 'Valeur'],
        ['Total Opérations', filteredEntretiens.length.toString()],
        ['Opérations Terminées', completedCount.toString()],
        ['Opérations En Cours/Planifiées', pendingCount.toString()],
        ['Coût Total', `${totalCost.toLocaleString('fr-FR')} MAD`]
      ];

      (pdf as any).autoTable({
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: currentY + 10,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10 },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 80, halign: 'right' }
        }
      });

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('Rapport généré automatiquement par le système de gestion', pageWidth / 2, pdf.internal.pageSize.height - 10, { align: 'center' });

      const fileName = `rapport-entretien-${pdfDateRange.startDate}-${pdfDateRange.endDate}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Succès",
        description: "Rapport PDF généré avec succès",
      });
    } catch (error) {
      console.error('Error generating maintenance PDF:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération du PDF",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'termine':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'en_cours':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'planifie':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredEntretiens = entretiens.filter(entretien =>
    `${entretien.type} ${entretien.description} ${entretien.vehicles?.marque} ${entretien.vehicles?.modele}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    hasNext,
    hasPrev,
  } = usePagination({
    data: filteredEntretiens,
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Entretiens</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez les entretiens de vos véhicules</p>
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
                    <Label htmlFor="vehicle_id">Véhicule *</Label>
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
                  <div>
                    <Label htmlFor="type">Type d'entretien *</Label>
                    <Input
                      id="type"
                      type="text"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                      className="mt-1"
                      placeholder="Ex: Vidange, Révision..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="cout">Coût (MAD) *</Label>
                    <Input
                      id="cout"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cout}
                      onChange={(e) => setFormData({ ...formData, cout: e.target.value })}
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
                <div>
                  <Label htmlFor="statut">Statut</Label>
                  <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planifie">Planifié</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="termine">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingEntretien ? 'Modifier' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="grid grid-cols-2 gap-2 min-w-[300px]">
              <div>
                <Label htmlFor="pdfStartDate" className="text-xs">Date début</Label>
                <Input
                  id="pdfStartDate"
                  type="date"
                  value={pdfDateRange.startDate}
                  onChange={(e) => setPdfDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label htmlFor="pdfEndDate" className="text-xs">Date fin</Label>
                <Input
                  id="pdfEndDate"
                  type="date"
                  value={pdfDateRange.endDate}
                  onChange={(e) => setPdfDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="text-xs h-8"
                />
              </div>
            </div>
            <Button 
              onClick={generatePDF}
              variant="outline" 
              className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 whitespace-nowrap"
            >
              <Download className="w-4 h-4 mr-2" />
              Rapport PDF
            </Button>
          </div>
        </div>
      </div>

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des entretiens</CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedData.length === 0 ? (
            <div className="text-center py-8">
              <Grip className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                Aucun entretien trouvé
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm ? 'Aucun entretien ne correspond à votre recherche.' : 'Commencez par ajouter votre premier entretien.'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Coût</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((entretien) => (
                    <TableRow key={entretien.id}>
                      <TableCell>
                        {entretien.vehicles ? 
                          `${entretien.vehicles.marque} ${entretien.vehicles.modele} - ${entretien.vehicles.immatriculation}` : 
                          'Véhicule inconnu'
                        }
                      </TableCell>
                      <TableCell>{entretien.type || 'N/A'}</TableCell>
                      <TableCell className="font-medium">
                        {entretien.cout ? `${entretien.cout} MAD` : 'Non défini'}
                      </TableCell>
                      <TableCell>
                        {entretien.date ? new Date(entretien.date).toLocaleDateString('fr-FR') : 'Non définie'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {entretien.description || 'Aucune description'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(entretien.statut)}>
                          {entretien.statut === 'termine' && <CheckCheck className="w-3.5 h-3.5 mr-1" />}
                          {entretien.statut || 'N/A'}
                        </Badge>
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
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={10}
                onPageChange={goToPage}
                onNext={nextPage}
                onPrev={prevPage}
                hasNext={hasNext}
                hasPrev={hasPrev}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
