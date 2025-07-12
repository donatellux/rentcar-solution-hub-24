
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Wrench, Car, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

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
    km_last_vidange: '',
    vidange_periodicite_km: '10000',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch entretiens with vehicle data
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
      const entretienData = {
        ...formData,
        cout: formData.cout ? parseFloat(formData.cout) : null,
        km_last_vidange: formData.km_last_vidange ? parseInt(formData.km_last_vidange) : null,
        vidange_periodicite_km: formData.vidange_periodicite_km ? parseInt(formData.vidange_periodicite_km) : null,
        date: formData.date || null,
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

  const handleEdit = (entretien: Entretien) => {
    setEditingEntretien(entretien);
    setFormData({
      vehicule_id: entretien.vehicule_id || '',
      type: entretien.type || '',
      date: entretien.date ? entretien.date.split('T')[0] : '',
      cout: entretien.cout?.toString() || '',
      description: entretien.description || '',
      km_last_vidange: entretien.km_last_vidange?.toString() || '',
      vidange_periodicite_km: entretien.vidange_periodicite_km?.toString() || '10000',
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
      vidange_periodicite_km: '10000',
    });
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'vidange':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'revision':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'reparation':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pneus':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredEntretiens = entretiens.filter(entretien =>
    `${entretien.vehicles?.marque} ${entretien.vehicles?.modele} ${entretien.type} ${entretien.description}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Entretien</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez l'entretien de vos véhicules</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingEntretien(null); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouvel entretien
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingEntretien ? "Modifier l'entretien" : "Nouvel entretien"}
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
                      <SelectItem value="pneus">Pneus</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
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
                  <Label htmlFor="km_last_vidange">KM dernière vidange</Label>
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
                  <Label htmlFor="vidange_periodicite_km">Périodicité vidange (KM)</Label>
                  <Input
                    id="vidange_periodicite_km"
                    type="number"
                    min="1000"
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
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntretiens.map((entretien) => (
            <Card key={entretien.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-800 dark:to-orange-900 rounded-full flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {entretien.vehicles?.marque} {entretien.vehicles?.modele}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {entretien.vehicles?.immatriculation}
                      </p>
                    </div>
                  </div>
                  <Badge className={getTypeColor(entretien.type)}>
                    {entretien.type || 'N/A'}
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      {entretien.date ? new Date(entretien.date).toLocaleDateString() : 'Date non définie'}
                    </span>
                  </div>
                  {entretien.cout && (
                    <div className="flex items-center space-x-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900 dark:text-white font-medium">
                        {entretien.cout} MAD
                      </span>
                    </div>
                  )}
                  {entretien.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {entretien.description}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(entretien)}
                    className="flex-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
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
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredEntretiens.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Aucun entretien trouvé
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? 'Aucun entretien ne correspond à votre recherche.' : 'Commencez par ajouter votre premier entretien.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => { resetForm(); setEditingEntretien(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouvel entretien
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
