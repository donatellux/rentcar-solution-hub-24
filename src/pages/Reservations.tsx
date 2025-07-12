
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Calendar, Car, User, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Reservation {
  id: string;
  client_id: string | null;
  vehicule_id: string | null;
  date_debut: string | null;
  date_fin: string | null;
  prix_par_jour: number | null;
  km_depart: number | null;
  km_retour: number | null;
  statut: string | null;
  lieu_delivrance: string | null;
  lieu_recuperation: string | null;
  created_at: string | null;
  clients?: {
    nom: string;
    prenom: string;
  };
  vehicles?: {
    marque: string;
    modele: string;
    immatriculation: string;
  };
}

interface Client {
  id: string;
  nom: string;
  prenom: string;
}

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  etat: string;
}

export const Reservations: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const [formData, setFormData] = useState({
    client_id: '',
    vehicule_id: '',
    date_debut: '',
    date_fin: '',
    prix_par_jour: '',
    km_depart: '',
    km_retour: '',
    statut: 'en_attente',
    lieu_delivrance: '',
    lieu_recuperation: '',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch reservations with related data
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          clients (nom, prenom),
          vehicles (marque, modele, immatriculation)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (reservationsError) throw reservationsError;

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, nom, prenom')
        .eq('agency_id', user.id);

      if (clientsError) throw clientsError;

      // Fetch available vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation, etat')
        .eq('agency_id', user.id);

      if (vehiclesError) throw vehiclesError;

      setReservations(reservationsData || []);
      setClients(clientsData || []);
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
      const reservationData = {
        ...formData,
        prix_par_jour: formData.prix_par_jour ? parseFloat(formData.prix_par_jour) : null,
        km_depart: formData.km_depart ? parseInt(formData.km_depart) : null,
        km_retour: formData.km_retour ? parseInt(formData.km_retour) : null,
        date_debut: formData.date_debut || null,
        date_fin: formData.date_fin || null,
        agency_id: user.id,
      };

      let error;
      if (editingReservation) {
        const { error: updateError } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', editingReservation.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('reservations')
          .insert(reservationData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Succès",
        description: editingReservation ? "Réservation modifiée avec succès" : "Réservation ajoutée avec succès",
      });

      setIsDialogOpen(false);
      setEditingReservation(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving reservation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la réservation",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (reservationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) return;

    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservationId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Réservation supprimée avec succès",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la réservation",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setFormData({
      client_id: reservation.client_id || '',
      vehicule_id: reservation.vehicule_id || '',
      date_debut: reservation.date_debut ? reservation.date_debut.split('T')[0] : '',
      date_fin: reservation.date_fin ? reservation.date_fin.split('T')[0] : '',
      prix_par_jour: reservation.prix_par_jour?.toString() || '',
      km_depart: reservation.km_depart?.toString() || '',
      km_retour: reservation.km_retour?.toString() || '',
      statut: reservation.statut || 'en_attente',
      lieu_delivrance: reservation.lieu_delivrance || '',
      lieu_recuperation: reservation.lieu_recuperation || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      vehicule_id: '',
      date_debut: '',
      date_fin: '',
      prix_par_jour: '',
      km_depart: '',
      km_retour: '',
      statut: 'en_attente',
      lieu_delivrance: '',
      lieu_recuperation: '',
    });
  };

  const getStatusColor = (statut: string | null) => {
    switch (statut) {
      case 'confirmee':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'en_cours':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'terminee':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'annulee':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const filteredReservations = reservations.filter(reservation =>
    `${reservation.clients?.nom} ${reservation.clients?.prenom} ${reservation.vehicles?.marque} ${reservation.vehicles?.modele}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Réservations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez vos réservations de véhicules</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingReservation(null); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle réservation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingReservation ? 'Modifier la réservation' : 'Nouvelle réservation'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_id">Client *</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.prenom} {client.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label htmlFor="date_debut">Date de début *</Label>
                  <Input
                    id="date_debut"
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="date_fin">Date de fin *</Label>
                  <Input
                    id="date_fin"
                    type="date"
                    value={formData.date_fin}
                    onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="prix_par_jour">Prix par jour (MAD)</Label>
                  <Input
                    id="prix_par_jour"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.prix_par_jour}
                    onChange={(e) => setFormData({ ...formData, prix_par_jour: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="statut">Statut</Label>
                  <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="confirmee">Confirmée</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="terminee">Terminée</SelectItem>
                      <SelectItem value="annulee">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="km_depart">Kilométrage départ</Label>
                  <Input
                    id="km_depart"
                    type="number"
                    min="0"
                    value={formData.km_depart}
                    onChange={(e) => setFormData({ ...formData, km_depart: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="km_retour">Kilométrage retour</Label>
                  <Input
                    id="km_retour"
                    type="number"
                    min="0"
                    value={formData.km_retour}
                    onChange={(e) => setFormData({ ...formData, km_retour: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lieu_delivrance">Lieu de délivrance</Label>
                  <Input
                    id="lieu_delivrance"
                    value={formData.lieu_delivrance}
                    onChange={(e) => setFormData({ ...formData, lieu_delivrance: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lieu_recuperation">Lieu de récupération</Label>
                  <Input
                    id="lieu_recuperation"
                    value={formData.lieu_recuperation}
                    onChange={(e) => setFormData({ ...formData, lieu_recuperation: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingReservation ? 'Modifier' : 'Ajouter'}
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
            placeholder="Rechercher une réservation..."
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
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {reservation.clients?.prenom} {reservation.clients?.nom}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {reservation.vehicles?.marque} {reservation.vehicles?.modele}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(reservation.statut)}>
                    {reservation.statut || 'N/A'}
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      {reservation.date_debut && reservation.date_fin ? 
                        `${new Date(reservation.date_debut).toLocaleDateString()} - ${new Date(reservation.date_fin).toLocaleDateString()}` 
                        : 'Dates non définies'
                      }
                    </span>
                  </div>
                  {reservation.prix_par_jour && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-400">Prix:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {reservation.prix_par_jour} MAD/jour
                      </span>
                    </div>
                  )}
                  {reservation.lieu_delivrance && (
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900 dark:text-white">
                        {reservation.lieu_delivrance}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(reservation)}
                    className="flex-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(reservation.id)}
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

      {!loading && filteredReservations.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Aucune réservation trouvée
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? 'Aucune réservation ne correspond à votre recherche.' : 'Commencez par ajouter votre première réservation.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => { resetForm(); setEditingReservation(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle réservation
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
