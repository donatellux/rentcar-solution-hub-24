
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Receipt, Calendar, Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';

interface Depense {
  id: string;
  vehicle_id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  agency_id: string;
  created_at: string;
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
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepense, setEditingDepense] = useState<Depense | null>(null);

  const [formData, setFormData] = useState({
    vehicle_id: '',
    category: '',
    amount: '',
    date: '',
    description: '',
  });

  // Filter depenses first
  const filteredDepenses = depenses.filter(depense =>
    `${depense.category} ${depense.description} ${depense.vehicles?.marque} ${depense.vehicles?.modele}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Add pagination
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
    reset
  } = usePagination({ data: filteredDepenses, itemsPerPage: 10 });

  // Reset pagination when search term changes
  useEffect(() => {
    reset();
  }, [searchTerm, reset]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch vehicle_expenses with related vehicle data
      const { data: depensesData, error: depensesError } = await supabase
        .from('vehicle_expenses')
        .select(`
          *,
          vehicles (marque, modele, immatriculation)
        `)
        .eq('agency_id', user.id)
        .order('date', { ascending: false });

      if (depensesError) throw depensesError;

      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation')
        .eq('agency_id', user.id);

      if (vehiclesError) throw vehiclesError;

      setDepenses(depensesData || []);
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
      setLoading(true);

      const depenseData = {
        vehicle_id: formData.vehicle_id,
        category: formData.category,
        amount: parseFloat(formData.amount),
        date: formData.date,
        description: formData.description,
        agency_id: user.id,
      };

      let error;
      if (editingDepense) {
        const { error: updateError } = await supabase
          .from('vehicle_expenses')
          .update(depenseData)
          .eq('id', editingDepense.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('vehicle_expenses')
          .insert(depenseData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Succès",
        description: editingDepense ? "Dépense modifiée avec succès" : "Dépense ajoutée avec succès",
      });

      setIsDialogOpen(false);
      setEditingDepense(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving depense:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la dépense",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (depenseId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('vehicle_expenses')
        .delete()
        .eq('id', depenseId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Dépense supprimée avec succès",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting depense:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la dépense",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (depense: Depense) => {
    setEditingDepense(depense);
    setFormData({
      vehicle_id: depense.vehicle_id || '',
      category: depense.category || '',
      amount: depense.amount?.toString() || '',
      date: depense.date || '',
      description: depense.description || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      category: '',
      amount: '',
      date: '',
      description: '',
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dépenses
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez vos dépenses de véhicules</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingDepense(null); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouvelle dépense</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingDepense ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div>
                <Label htmlFor="category">Type de dépense</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1"
                  placeholder="Entrez le type de dépense"
                />
              </div>
              <div>
                <Label htmlFor="amount">Coût</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="date">Date de la dépense</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1"
                  placeholder="Entrez une description"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    editingDepense ? 'Modifier' : 'Ajouter'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
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
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <span>Liste des dépenses ({totalItems})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paginatedData.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    Aucune dépense trouvée
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchTerm ? 'Aucune dépense ne correspond à votre recherche.' : 'Commencez par ajouter votre première dépense.'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => { resetForm(); setEditingDepense(null); setIsDialogOpen(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nouvelle dépense
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedData.map((depense) => (
                    <Card key={depense.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {depense.category}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="text-gray-600 dark:text-gray-300 space-y-2">
                          <p>
                            <Car className="inline-block w-4 h-4 mr-1 align-middle text-gray-400" />
                            <span className="font-medium">Véhicule:</span> {depense.vehicles?.marque} {depense.vehicles?.modele}
                          </p>
                          <p>
                            <Calendar className="inline-block w-4 h-4 mr-1 align-middle text-gray-400" />
                            <span className="font-medium">Date:</span> {new Date(depense.date || '').toLocaleDateString()}
                          </p>
                          <p>
                            <Receipt className="inline-block w-4 h-4 mr-1 align-middle text-gray-400" />
                            <span className="font-medium">Coût:</span> {depense.amount} MAD
                          </p>
                          <p className="truncate">
                            <span className="font-medium">Description:</span> {depense.description}
                          </p>
                        </div>
                        <div className="mt-4 flex justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(depense)}
                            className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(depense.id)}
                            className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {totalPages > 1 && (
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
          )}
        </div>
      )}
    </div>
  );
};
