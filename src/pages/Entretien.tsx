
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Wrench, Calendar, Car, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

interface Entretien {
  id: string;
  vehicule_id: string;
  type: string;
  date: string;
  cout: number;
  description: string;
  agency_id: string;
  created_at: string;
  vehicles?: {
    marque: string;
    modele: string;
    immatriculation: string;
  };
}

export const Entretien: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entretiens, setEntretiens] = useState<Entretien[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntretien, setEditingEntretien] = useState<Entretien | null>(null);

  const [formData, setFormData] = useState({
    vehicule_id: '',
    type: '',
    date: '',
    cout: '',
    description: '',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch entretiens with related vehicle data
      const { data: entretiensData, error: entretiensError } = await supabase
        .from('entretiens')
        .select(`
          *,
          vehicles (marque, modele, immatriculation)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (entretiensError) throw entretiensError;

      // Fetch vehicles
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
      setLoading(true);

      const entretienData = {
        vehicule_id: formData.vehicule_id,
        type: formData.type,
        date: formData.date,
        cout: formData.cout ? parseFloat(formData.cout) : null,
        description: formData.description,
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
    } finally {
      setLoading(false);
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

  const handleEdit = (entretien: Entretien) => {
    setEditingEntretien(entretien);
    setFormData({
      vehicule_id: entretien.vehicule_id || '',
      type: entretien.type || '',
      date: entretien.date || '',
      cout: entretien.cout?.toString() || '',
      description: entretien.description || '',
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
    });
  };

  // Filter entretiens first
  const filteredEntretiens = entretiens.filter(entretien =>
    `${entretien.type} ${entretien.description} ${entretien.vehicles?.marque} ${entretien.vehicles?.modele}`
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
  } = usePagination({ data: filteredEntretiens, itemsPerPage: 10 });

  // Reset pagination when search term changes
  useEffect(() => {
    reset();
  }, [searchTerm, reset]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Entretiens
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez les entretiens de vos véhicules</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingEntretien(null); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouvel entretien</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingEntretien ? 'Modifier l\'entretien' : 'Nouvel entretien'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="vehicule_id">Véhicule</Label>
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
                <Label htmlFor="type">Type d'entretien</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="date">Date d'entretien</Label>
                <Input
                  type="date"
                  id="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cout">Coût</Label>
                <Input
                  type="number"
                  id="cout"
                  value={formData.cout}
                  onChange={(e) => setFormData({ ...formData, cout: e.target.value })}
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
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingEntretien ? 'Modifier' : 'Ajouter'}
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
            placeholder="Rechercher un entretien..."
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
                <Wrench className="w-5 h-5 text-blue-600" />
                <span>Liste des entretiens ({totalItems})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paginatedData.length === 0 ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedData.map((entretien) => (
                    <Card key={entretien.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                          <Wrench className="w-5 h-5 text-blue-500" />
                          <span>{entretien.type || 'Type non défini'}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-2">
                            <Car className="w-4 h-4 text-gray-400" />
                            <span>{entretien.vehicles?.marque} {entretien.vehicles?.modele}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{entretien.date ? new Date(entretien.date).toLocaleDateString() : 'Date non définie'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">Coût:</span> {entretien.cout} MAD
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(entretien)}
                            className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(entretien.id)}
                            className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Supprimer
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
