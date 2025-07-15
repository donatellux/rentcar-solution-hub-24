
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Car, Fuel, Calendar, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { VehicleImageUpload } from '@/components/VehicleImageUpload';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';

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
      return 'bg-success/20 text-success border-success/30';
    case 'reserve':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'maintenance':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'hors_service':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const Vehicles: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
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
    photo_path: '',
  });

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  const fetchVehicles = async () => {
    if (!user) return;

    try {
      // First, update vehicle mileages based on reservations
      await updateVehicleMileagesFromReservations();
      
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

  const updateVehicleMileagesFromReservations = async () => {
    if (!user) return;

    try {
      // Fetch vehicles and reservations
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, kilometrage')
        .eq('agency_id', user.id);

      const { data: reservations } = await supabase
        .from('reservations')
        .select('vehicule_id, km_retour')
        .eq('agency_id', user.id)
        .not('km_retour', 'is', null);

      if (!vehicles || !reservations) return;

      // Update each vehicle's mileage if needed
      for (const vehicle of vehicles) {
        const vehicleReservations = reservations.filter(r => r.vehicule_id === vehicle.id && r.km_retour);
        
        if (vehicleReservations.length > 0) {
          const maxKmRetour = Math.max(...vehicleReservations.map(r => r.km_retour || 0));
          
          if (maxKmRetour > (vehicle.kilometrage || 0)) {
            await supabase
              .from('vehicles')
              .update({ kilometrage: maxKmRetour })
              .eq('id', vehicle.id);
          }
        }
      }
    } catch (error) {
      console.error('Error updating vehicle mileages:', error);
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
        photo_path: formData.photo_path || null,
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
      photo_path: vehicle.photo_path || '',
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
      photo_path: '',
    });
  };

  const handleImageUploaded = (imagePath: string) => {
    setFormData(prev => ({ ...prev, photo_path: imagePath }));
  };

  const getVehicleImageUrl = (photoPath: string | null) => {
    if (!photoPath) return null;
    return supabase.storage.from('vehiclephotos').getPublicUrl(photoPath).data.publicUrl;
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    `${vehicle.marque} ${vehicle.modele} ${vehicle.immatriculation}`
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
  } = usePagination({ data: filteredVehicles, itemsPerPage: 8 });

  return (
    <div className="page-spacing animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{t('vehicles.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('vehicles.subtitle')}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingVehicle(null); }} className="gradient-primary shadow-elegant transition-all-smooth hover:shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              {t('vehicles.addVehicle')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 dialog-mobile">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingVehicle ? t('vehicles.editVehicle') : t('vehicles.addVehicle')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="marque">Marque *</Label>
                      <Input
                        id="marque"
                        value={formData.marque}
                        onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="modele">Modèle *</Label>
                      <Input
                        id="modele"
                        value={formData.modele}
                        onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="annee">Année</Label>
                      <Input
                        id="annee"
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        value={formData.annee}
                        onChange={(e) => setFormData({ ...formData, annee: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="immatriculation">Immatriculation *</Label>
                      <Input
                        id="immatriculation"
                        value={formData.immatriculation}
                        onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="couleur">Couleur</Label>
                      <Input
                        id="couleur"
                        value={formData.couleur}
                        onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="carburant">Carburant</Label>
                      <Select value={formData.carburant} onValueChange={(value) => setFormData({ ...formData, carburant: value })}>
                        <SelectTrigger className="mt-1">
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
                        <SelectTrigger className="mt-1">
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
                        min="0"
                        value={formData.kilometrage}
                        onChange={(e) => setFormData({ ...formData, kilometrage: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="etat">État</Label>
                      <Select value={formData.etat} onValueChange={(value) => setFormData({ ...formData, etat: value })}>
                        <SelectTrigger className="mt-1">
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
                </div>
                
                <div>
                  <VehicleImageUpload
                    currentImagePath={formData.photo_path}
                    onImageUploaded={handleImageUploaded}
                    vehicleId={editingVehicle?.id}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingVehicle ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('vehicles.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 transition-all-smooth focus:shadow-glow"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-48 bg-muted rounded-lg"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVehicles.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">
              {searchTerm ? 'Aucun véhicule trouvé' : 'Aucun véhicule'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'Aucun véhicule ne correspond à votre recherche.' 
                : 'Commencez par ajouter votre premier véhicule.'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => { resetForm(); setEditingVehicle(null); setIsDialogOpen(true); }} className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                {t('vehicles.addVehicle')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {paginatedData.map((vehicle) => {
              const imageUrl = getVehicleImageUrl(vehicle.photo_path);
              
              return (
                <Card key={vehicle.id} className="group overflow-hidden hover:shadow-elegant transition-all-smooth hover:scale-[1.02] border-border/50 bg-card">
                  <div className="p-6">
                    {/* Vehicle Image Section - Top */}
                    <div className="relative mb-4">
                      {imageUrl ? (
                        <div className="w-full h-48 relative bg-muted overflow-hidden rounded-lg">
                          <img
                            src={imageUrl}
                            alt={`${vehicle.marque} ${vehicle.modele}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 rounded-lg">
                          <Car className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge className={`${getStatusColor(vehicle.etat)} font-medium px-2.5 py-1 text-xs`}>
                          {vehicle.etat}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Card Content - Bottom */}
                    <div className="space-y-4">
                      {/* Vehicle Title & Basic Info */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-xl leading-tight text-foreground group-hover:text-primary transition-colors">
                          {vehicle.marque} {vehicle.modele}
                        </h3>
                        
                        {/* Key Details Row */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {vehicle.annee}
                          </span>
                          <span className="font-medium text-foreground text-base">
                            {vehicle.immatriculation}
                          </span>
                        </div>
                      </div>

                      {/* Vehicle Specifications */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {vehicle.couleur && (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full border border-border flex-shrink-0"
                                style={{ backgroundColor: vehicle.couleur.toLowerCase() }}
                              />
                              <span className="text-muted-foreground truncate">{vehicle.couleur}</span>
                            </div>
                          )}
                          
                          {vehicle.carburant && (
                            <div className="flex items-center gap-2">
                              <Fuel className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground truncate">{vehicle.carburant}</span>
                            </div>
                          )}
                          
                          {vehicle.boite_vitesse && (
                            <div className="flex items-center gap-2">
                              <Settings className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground truncate">{vehicle.boite_vitesse}</span>
                            </div>
                          )}
                          
                          {vehicle.kilometrage && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-primary flex-shrink-0">KM</span>
                              <span className="text-muted-foreground">
                                {vehicle.kilometrage.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-4 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(vehicle)}
                          className="flex-1 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all-smooth"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(vehicle.id)}
                          className="px-3 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all-smooth"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={8}
            onPageChange={goToPage}
            onNext={nextPage}
            onPrev={prevPage}
            hasNext={hasNext}
            hasPrev={hasPrev}
          />
        </>
      )}
    </div>
  );
};
