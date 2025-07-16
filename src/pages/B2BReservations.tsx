import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Building2, Plus, Calendar, Car, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

// For now, we'll use a simplified approach without societies until the migration is applied
interface B2BReservation {
  id: string;
  client_id: string;
  vehicule_id: string;
  date_debut: string;
  date_fin: string;
  prix_jour?: number;
  prix_total?: number;
  statut: string;
  lieu_delivrance?: string;
  is_b2b?: boolean;
  with_driver?: boolean;
  number_of_cars?: number;
  additional_charges?: number;
  clients?: { nom: string; prenom: string };
  vehicles?: { marque: string; modele: string; immatriculation: string };
}

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  etat: string;
}

interface Client {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
}

export const B2BReservations: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [reservations, setReservations] = useState<B2BReservation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    vehicule_id: '',
    date_debut: '',
    date_fin: '',
    prix_jour: 0,
    with_driver: false,
    number_of_cars: 1,
    additional_charges: 0,
    company_name: '', // For now, store company name as a simple field
    company_details: '' // Store additional company details
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Check if B2B columns exist in reservations table
      const { data: reservationsData } = await supabase
        .from('reservations')
        .select(`
          *,
          clients(nom, prenom),
          vehicles(marque, modele, immatriculation)
        `)
        .eq('agency_id', user?.id)
        .order('created_at', { ascending: false });
      
      // Fetch vehicles
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation, etat')
        .eq('agency_id', user?.id)
        .eq('etat', 'disponible');
      
      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, nom, prenom, email, telephone')
        .eq('agency_id', user?.id);

      setReservations(reservationsData || []);
      setVehicles(vehiclesData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!formData.date_debut || !formData.date_fin || !formData.prix_jour) return 0;
    
    const startDate = new Date(formData.date_debut);
    const endDate = new Date(formData.date_fin);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const baseTotal = diffDays * formData.prix_jour * formData.number_of_cars;
    return baseTotal + (formData.additional_charges || 0);
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const totalPrice = calculateTotal();
      
      // Create reservation with basic B2B fields (will be enhanced after migration)
      const reservationData = {
        client_id: formData.client_id,
        vehicule_id: formData.vehicule_id,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        prix_jour: formData.prix_jour,
        prix_total: totalPrice,
        agency_id: user?.id,
        statut: 'confirmee',
        // Store B2B details in existing text fields for now
        lieu_delivrance: `B2B: ${formData.company_name}`, // Temporary storage
        // Additional fields will be added after migration
      };

      const { data, error } = await supabase
        .from('reservations')
        .insert([reservationData]);

      if (error) throw error;

      // Add revenue to global expenses
      await supabase.from('global_expenses').insert([{
        agency_id: user?.id,
        type: 'revenue',
        category: 'B2B Reservations',
        amount: totalPrice,
        description: `Réservation B2B - ${formData.company_name} - ${formData.number_of_cars} véhicule(s)`,
        date: new Date().toISOString().split('T')[0]
      }]);

      await fetchData();
      setFormData({
        client_id: '',
        vehicule_id: '',
        date_debut: '',
        date_fin: '',
        prix_jour: 0,
        with_driver: false,
        number_of_cars: 1,
        additional_charges: 0,
        company_name: '',
        company_details: ''
      });
      setDialogOpen(false);
      
      toast({
        title: "Succès",
        description: "Réservation B2B créée avec succès",
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la réservation",
        variant: "destructive",
      });
    }
  };

  const isB2BReservation = (reservation: B2BReservation) => {
    return reservation.lieu_delivrance?.startsWith('B2B:') || reservation.is_b2b;
  };

  const getCompanyName = (reservation: B2BReservation) => {
    if (reservation.lieu_delivrance?.startsWith('B2B:')) {
      return reservation.lieu_delivrance.replace('B2B:', '').trim();
    }
    return 'Entreprise';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  const b2bReservations = reservations.filter(isB2BReservation);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Réservations B2B
          </h1>
          <p className="text-muted-foreground">Gestion des réservations pour entreprises</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Réservation B2B
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Créer une réservation B2B</DialogTitle>
              <DialogDescription>
                Remplissez les détails de la réservation pour entreprise
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateReservation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Nom de l&apos;entreprise *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="client_id">Contact principal *</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nom} {client.prenom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vehicule_id">Véhicule principal *</Label>
                  <Select value={formData.vehicule_id} onValueChange={(value) => setFormData(prev => ({ ...prev, vehicule_id: value }))}>
                    <SelectTrigger>
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
                  <Label htmlFor="number_of_cars">Nombre de véhicules</Label>
                  <Input
                    id="number_of_cars"
                    type="number"
                    min="1"
                    value={formData.number_of_cars}
                    onChange={(e) => setFormData(prev => ({ ...prev, number_of_cars: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="date_debut">Date de début *</Label>
                  <Input
                    id="date_debut"
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date_fin">Date de fin *</Label>
                  <Input
                    id="date_fin"
                    type="date"
                    value={formData.date_fin}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_fin: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prix_jour">Prix par jour (MAD) *</Label>
                  <Input
                    id="prix_jour"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.prix_jour}
                    onChange={(e) => setFormData(prev => ({ ...prev, prix_jour: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="additional_charges">Frais supplémentaires (MAD)</Label>
                  <Input
                    id="additional_charges"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.additional_charges}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_charges: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="company_details">Détails de l&apos;entreprise</Label>
                <Textarea
                  id="company_details"
                  placeholder="ICE, RC, adresse, etc."
                  value={formData.company_details}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_details: e.target.value }))}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="with_driver"
                  checked={formData.with_driver}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, with_driver: checked }))}
                />
                <Label htmlFor="with_driver">Avec chauffeur</Label>
              </div>

              {formData.date_debut && formData.date_fin && formData.prix_jour > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Résumé de la réservation:</h4>
                  <div className="space-y-1 text-sm">
                    <p>Entreprise: {formData.company_name}</p>
                    <p>Période: {format(new Date(formData.date_debut), 'dd/MM/yyyy')} - {format(new Date(formData.date_fin), 'dd/MM/yyyy')}</p>
                    <p>Nombre de véhicules: {formData.number_of_cars}</p>
                    <p>Prix par jour: {formData.prix_jour} MAD</p>
                    {formData.additional_charges > 0 && <p>Frais supplémentaires: {formData.additional_charges} MAD</p>}
                    {formData.with_driver && <p>Avec chauffeur: Oui</p>}
                    <p className="font-semibold">Total: {calculateTotal()} MAD</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={!formData.company_name || !formData.client_id || !formData.vehicule_id}>
                  Créer la réservation
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Database Migration Notice */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-orange-800">
            <Building2 className="h-5 w-5" />
            <div>
              <p className="font-medium">Fonctionnalité B2B en cours de développement</p>
              <p className="text-sm text-orange-700">
                La migration de base de données sera appliquée prochainement pour ajouter toutes les fonctionnalités B2B avancées (sociétés, RIB, IBAN, etc.)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservations List */}
      <div className="grid gap-4">
        {b2bReservations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune réservation B2B</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par créer votre première réservation B2B
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Réservation B2B
              </Button>
            </CardContent>
          </Card>
        ) : (
          b2bReservations.map((reservation) => (
            <Card key={reservation.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {getCompanyName(reservation)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Contact: {reservation.clients?.nom} {reservation.clients?.prenom}
                    </p>
                  </div>
                  <Badge variant={reservation.statut === 'confirmee' ? 'default' : 'secondary'}>
                    {reservation.statut}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Période</p>
                      <p className="text-muted-foreground">
                        {format(new Date(reservation.date_debut), 'dd/MM/yyyy')} - 
                        {format(new Date(reservation.date_fin), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Véhicules</p>
                      <p className="text-muted-foreground">{reservation.number_of_cars || 1} véhicule(s)</p>
                      {reservation.vehicles && (
                        <p className="text-xs text-muted-foreground">
                          {reservation.vehicles.marque} {reservation.vehicles.modele}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Chauffeur</p>
                      <p className="text-muted-foreground">
                        {reservation.with_driver ? 'Inclus' : 'Non inclus'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Total</p>
                      <p className="text-muted-foreground">{reservation.prix_total} MAD</p>
                      {reservation.additional_charges && reservation.additional_charges > 0 && (
                        <p className="text-xs text-muted-foreground">
                          +{reservation.additional_charges} MAD frais
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};