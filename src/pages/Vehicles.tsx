
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Vehicle {
  id: string;
  marque: string | null;
  modele: string | null;
  annee: number | null;
  immatriculation: string | null;
  couleur: string | null;
  carburant: string | null;
  boite_vitesse: string | null;
  kilometrage: number | null;
  etat: string | null;
  photo_path: string | null;
  km_last_vidange: number | null;
  vidange_periodicite_km: number | null;
}

const getStatusColor = (etat: string | null) => {
  switch (etat) {
    case 'disponible':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'reserve':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'maintenance':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export const Vehicles: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    marque: '',
    modele: '',
    annee: '',
    immatriculation: '',
    couleur: '',
    carburant: '',
    boite_vitesse: '',
    kilometrage: '',
    etat: 'disponible',
    km_last_vidange: '',
    vidange_periodicite_km: '10000',
  });

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  const fetchVehicles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les véhicules",
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
      const vehicleData = {
        ...formData,
        annee: formData.annee ? parseInt(formData.annee) : null,
        kilometrage: formData.kilometrage ? parseInt(formData.kilometrage) : null,
        km_last_vidange: formData.km_last_vidange ? parseInt(formData.km_last_vidange) : null,
        vidange_periodicite_km: formData.vidange_periodicite_km ? parseInt(formData.vidange_periodicite_km) : null,
        agency_id: user.id,
      };

      let error;
      if (editingVehicle) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('vehicles')
          .insert(vehicleData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Succès",
        description: editingVehicle ? "Véhicule modifié avec succès" : "Véhicule ajouté avec succès",
      });

      setIsDialogOpen(false);
      setEditingVehicle(null);
      resetForm();
      fetchVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le véhicule",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Véhicule supprimé avec succès",
      });

      fetchVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le véhicule",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      marque: vehicle.marque || '',
      modele: vehicle.modele || '',
      annee: vehicle.annee?.toString() || '',
      immatriculation: vehicle.immatriculation || '',
      couleur: vehicle.couleur || '',
      carburant: vehicle.carburant || '',
      boite_vitesse: vehicle.boite_vitesse || '',
      kilometrage: vehicle.kilometrage?.toString() || '',
      etat: vehicle.etat || 'disponible',
      km_last_vidange: vehicle.km_last_vidange?.toString() || '',
      vidange_periodicite_km: vehicle.vidange_periodicite_km?.toString() || '10000',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      marque: '',
      modele: '',
      annee: '',
      immatriculation: '',
      couleur: '',
      carburant: '',
      boite_vitesse: '',
      kilometrage: '',
      etat: 'disponible',
      km_last_vidange: '',
      vidange_periodicite_km: '10000',
    });
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    `${vehicle.marque} ${vehicle.modele} ${vehicle.immatriculation}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Véhicules</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingVehicle(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un véhicule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingVehicle ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="marque">Marque</Label>
                  <Input
                    id="marque"
                    value={formData.marque}
                    onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="modele">Modèle</Label>
                  <Input
                    id="modele"
                    value={formData.modele}
                    onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="annee">Année</Label>
                  <Input
                    id="annee"
                    type="number"
                    value={formData.annee}
                    onChange={(e) => setFormData({ ...formData, annee: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="immatriculation">Immatriculation</Label>
                  <Input
                    id="immatriculation"
                    value={formData.immatriculation}
                    onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="couleur">Couleur</Label>
                  <Input
                    id="couleur"
                    value={formData.couleur}
                    onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="carburant">Carburant</Label>
                  <Select value={formData.carburant} onValueChange={(value) => setFormData({ ...formData, carburant: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="essence">Essence</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="hybride">Hybride</SelectItem>
                      <SelectItem value="electrique">Électrique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="boite_vitesse">Boîte de vitesse</Label>
                  <Select value={formData.boite_vitesse} onValueChange={(value) => setFormData({ ...formData, boite_vitesse: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manuelle">Manuelle</SelectItem>
                      <SelectItem value="automatique">Automatique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="kilometrage">Kilométrage</Label>
                  <Input
                    id="kilometrage"
                    type="number"
                    value={formData.kilometrage}
                    onChange={(e) => setFormData({ ...formData, kilometrage: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="etat">État</Label>
                  <Select value={formData.etat} onValueChange={(value) => setFormData({ ...formData, etat: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="reserve">Réservé</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="hors_service">Hors service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="km_last_vidange">KM dernière vidange</Label>
                  <Input
                    id="km_last_vidange"
                    type="number"
                    value={formData.km_last_vidange}
                    onChange={(e) => setFormData({ ...formData, km_last_vidange: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="vidange_periodicite_km">Périodicité vidange (KM)</Label>
                  <Input
                    id="vidange_periodicite_km"
                    type="number"
                    value={formData.vidange_periodicite_km}
                    onChange={(e) => setFormData({ ...formData, vidange_periodicite_km: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingVehicle ? 'Modifier' : 'Ajouter'}
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
            placeholder="Rechercher un véhicule..."
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
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Car className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {vehicle.marque} {vehicle.modele}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {vehicle.immatriculation}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(vehicle.etat)}>
                    {vehicle.etat || 'N/A'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Année:</span>
                    <span className="text-gray-900 dark:text-white">{vehicle.annee || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Carburant:</span>
                    <span className="text-gray-900 dark:text-white">{vehicle.carburant || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Kilométrage:</span>
                    <span className="text-gray-900 dark:text-white">
                      {vehicle.kilometrage ? `${vehicle.kilometrage.toLocaleString()} km` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(vehicle)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(vehicle.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredVehicles.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Aucun véhicule trouvé
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Aucun véhicule ne correspond à votre recherche.' : 'Commencez par ajouter votre premier véhicule.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
