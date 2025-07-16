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

interface Society {
  id?: string;
  society_name: string;
  rib: string;
  iban: string;
  ice: string;
  rc: string;
  address: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
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
    // Society information
    society_name: '',
    rib: '',
    iban: '',
    ice: '',
    rc: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    
    // Reservation details
    date_debut: '',
    date_fin: '',
    prix_jour: '',
    with_driver: false,
    number_of_cars: 1,
    additional_charges: '',
    selected_vehicles: [] as string[],
  });

  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);

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

  const fetchAvailableVehicles = async () => {
    if (!formData.date_debut || !formData.date_fin) {
      setAvailableVehicles([]);
      return;
    }

    try {
      // Get all vehicles for the agency
      const { data: allVehicles } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation, etat')
        .eq('agency_id', user?.id)
        .eq('etat', 'disponible');

      if (!allVehicles) {
        setAvailableVehicles([]);
        return;
      }

      // Get reservations that overlap with the selected date range
      const { data: overlappingReservations } = await supabase
        .from('reservations')
        .select('vehicule_id')
        .eq('agency_id', user?.id)
        .gte('date_fin', formData.date_debut)
        .lte('date_debut', formData.date_fin);

      // Filter out vehicles that are already reserved
      const reservedVehicleIds = overlappingReservations?.map(r => r.vehicule_id) || [];
      const available = allVehicles.filter(v => !reservedVehicleIds.includes(v.id));
      
      setAvailableVehicles(available);
    } catch (error) {
      console.error('Error fetching available vehicles:', error);
      setAvailableVehicles([]);
    }
  };

  const calculateTotal = () => {
    const prixJour = parseFloat(formData.prix_jour) || 0;
    if (!formData.date_debut || !formData.date_fin || !prixJour) return 0;
    
    const startDate = new Date(formData.date_debut);
    const endDate = new Date(formData.date_fin);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Only count base rental price, not additional charges (they're costs, not revenue)
    return diffDays * prixJour * formData.number_of_cars;
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const totalPrice = calculateTotal();
      const additionalCharges = parseFloat(formData.additional_charges) || 0;
      
      // Try to create society entry, but handle gracefully if table doesn't exist yet
      let societyId = null;
      try {
        const societyData = {
          agency_id: user?.id,
          society_name: formData.society_name,
          rib: formData.rib,
          iban: formData.iban,
          ice: formData.ice,
          rc: formData.rc,
          address: formData.address,
          contact_person: formData.contact_person,
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
        };

        const result = await supabase
          .from('societies' as any)
          .insert([societyData])
          .select()
          .single();

        if (!result.error && result.data) {
          societyId = (result.data as any)?.id;
        }
      } catch (societyError) {
        console.log('Societies table not available yet, using fallback approach');
      }

      // Create reservations for each selected vehicle
      const reservationPromises = formData.selected_vehicles.map(async (vehicleId) => {
        const reservationData: any = {
          vehicule_id: vehicleId,
          date_debut: formData.date_debut,
          date_fin: formData.date_fin,
          prix_jour: parseFloat(formData.prix_jour),
          prix_total: totalPrice / formData.number_of_cars, // Split total between vehicles
          agency_id: user?.id,
          statut: 'confirmee',
          // Store B2B info in lieu_delivrance temporarily if new columns don't exist
          lieu_delivrance: `B2B: ${formData.society_name} | Contact: ${formData.contact_person} | Tel: ${formData.contact_phone}`,
        };

        // Add B2B specific fields if they exist
        if (societyId) {
          reservationData.is_b2b = true;
          reservationData.society_id = societyId;
          reservationData.with_driver = formData.with_driver;
          reservationData.number_of_cars = formData.number_of_cars;
          reservationData.additional_charges = additionalCharges;
        }

        return supabase.from('reservations').insert([reservationData]);
      });

      await Promise.all(reservationPromises);

      // Add only base rental revenue to global expenses (not additional charges)
      await supabase.from('global_expenses').insert([{
        agency_id: user?.id,
        type: 'revenue',
        category: 'B2B Reservations',
        amount: totalPrice, // Only base rental price
        description: `Réservation B2B - ${formData.society_name} - ${formData.number_of_cars} véhicule(s)`,
        date: new Date().toISOString().split('T')[0]
      }]);

      await fetchData();
      // Reset form
      setFormData({
        society_name: '',
        rib: '',
        iban: '',
        ice: '',
        rc: '',
        address: '',
        contact_person: '',
        contact_phone: '',
        contact_email: '',
        date_debut: '',
        date_fin: '',
        prix_jour: '',
        with_driver: false,
        number_of_cars: 1,
        additional_charges: '',
        selected_vehicles: [],
      });
      setAvailableVehicles([]);
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

  // Effect to fetch available vehicles when dates change
  useEffect(() => {
    fetchAvailableVehicles();
  }, [formData.date_debut, formData.date_fin]);

  // Effect to reset selected vehicles when number of cars changes
  useEffect(() => {
    if (formData.selected_vehicles.length > formData.number_of_cars) {
      setFormData(prev => ({
        ...prev,
        selected_vehicles: prev.selected_vehicles.slice(0, formData.number_of_cars)
      }));
    }
  }, [formData.number_of_cars]);

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
            <form onSubmit={handleCreateReservation} className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Informations de l'entreprise</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="society_name">Nom de l'entreprise *</Label>
                    <Input
                      id="society_name"
                      value={formData.society_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, society_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_person">Contact principal *</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                      placeholder="Nom du responsable"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_email">Email de contact *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">Téléphone de contact *</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Adresse *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="ice">ICE *</Label>
                    <Input
                      id="ice"
                      value={formData.ice}
                      onChange={(e) => setFormData(prev => ({ ...prev, ice: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="rc">RC *</Label>
                    <Input
                      id="rc"
                      value={formData.rc}
                      onChange={(e) => setFormData(prev => ({ ...prev, rc: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="rib">RIB *</Label>
                    <Input
                      id="rib"
                      value={formData.rib}
                      onChange={(e) => setFormData(prev => ({ ...prev, rib: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="iban">IBAN *</Label>
                    <Input
                      id="iban"
                      value={formData.iban}
                      onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Reservation Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Détails de la réservation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  
                  {formData.date_debut && formData.date_fin && (
                    <>
                      <div>
                        <Label htmlFor="number_of_cars">Nombre de véhicules *</Label>
                        <Input
                          id="number_of_cars"
                          type="number"
                          min="1"
                          max={availableVehicles.length}
                          value={formData.number_of_cars}
                          onChange={(e) => {
                            const count = parseInt(e.target.value) || 1;
                            setFormData(prev => ({ 
                              ...prev, 
                              number_of_cars: count,
                              selected_vehicles: prev.selected_vehicles.slice(0, count)
                            }));
                          }}
                          required
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          {availableVehicles.length} véhicule(s) disponible(s) pour cette période
                        </p>
                      </div>

                      {formData.number_of_cars > 0 && availableVehicles.length > 0 && (
                        <div className="md:col-span-2">
                          <Label>Sélectionner les véhicules ({formData.selected_vehicles.length}/{formData.number_of_cars}) *</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                            {availableVehicles.map((vehicle) => (
                              <div key={vehicle.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`vehicle-${vehicle.id}`}
                                  checked={formData.selected_vehicles.includes(vehicle.id)}
                                  onChange={(e) => {
                                    if (e.target.checked && formData.selected_vehicles.length < formData.number_of_cars) {
                                      setFormData(prev => ({
                                        ...prev,
                                        selected_vehicles: [...prev.selected_vehicles, vehicle.id]
                                      }));
                                    } else if (!e.target.checked) {
                                      setFormData(prev => ({
                                        ...prev,
                                        selected_vehicles: prev.selected_vehicles.filter(id => id !== vehicle.id)
                                      }));
                                    }
                                  }}
                                  disabled={!formData.selected_vehicles.includes(vehicle.id) && formData.selected_vehicles.length >= formData.number_of_cars}
                                  className="rounded"
                                />
                                <Label 
                                  htmlFor={`vehicle-${vehicle.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {vehicle.marque} {vehicle.modele} - {vehicle.immatriculation}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <Label htmlFor="prix_jour">Prix par jour par véhicule (MAD) *</Label>
                    <Input
                      id="prix_jour"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.prix_jour}
                      onChange={(e) => setFormData(prev => ({ ...prev, prix_jour: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="additional_charges">
                      Frais supplémentaires (MAD)
                      <span className="text-sm text-muted-foreground block">
                        (Chauffeur, carburant, etc. - Non comptés dans les revenus)
                      </span>
                    </Label>
                    <Input
                      id="additional_charges"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.additional_charges}
                      onChange={(e) => setFormData(prev => ({ ...prev, additional_charges: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="with_driver"
                  checked={formData.with_driver}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, with_driver: checked }))}
                />
                <Label htmlFor="with_driver">Avec chauffeur</Label>
              </div>

              {formData.date_debut && formData.date_fin && formData.prix_jour && formData.selected_vehicles.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Résumé de la réservation:</h4>
                  <div className="space-y-1 text-sm">
                    <p>Entreprise: {formData.society_name}</p>
                    <p>Contact: {formData.contact_person}</p>
                    <p>Période: {format(new Date(formData.date_debut), 'dd/MM/yyyy')} - {format(new Date(formData.date_fin), 'dd/MM/yyyy')}</p>
                    <p>Véhicules sélectionnés: {formData.selected_vehicles.length}/{formData.number_of_cars}</p>
                    <p>Prix par jour par véhicule: {formData.prix_jour} MAD</p>
                    {parseFloat(formData.additional_charges) > 0 && (
                      <p>Frais supplémentaires: {formData.additional_charges} MAD (non comptés dans les revenus)</p>
                    )}
                    {formData.with_driver && <p>Avec chauffeur: Oui</p>}
                    <p className="font-semibold text-primary">Total location: {calculateTotal()} MAD</p>
                    {parseFloat(formData.additional_charges) > 0 && (
                      <p className="font-semibold">Total avec frais: {calculateTotal() + (parseFloat(formData.additional_charges) || 0)} MAD</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    !formData.society_name || 
                    !formData.contact_person || 
                    !formData.contact_email || 
                    !formData.contact_phone ||
                    !formData.address ||
                    !formData.ice ||
                    !formData.rc ||
                    !formData.rib ||
                    !formData.iban ||
                    !formData.date_debut || 
                    !formData.date_fin || 
                    !formData.prix_jour ||
                    formData.selected_vehicles.length !== formData.number_of_cars
                  }
                >
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