import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Calendar, Car, User, MapPin, Upload, Eye, FileText, Download, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';

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
  cin_scan_url: string | null;
  permis_scan_url: string | null;
  created_at: string | null;
  clients?: {
    nom: string;
    prenom: string;
    cin: string;
    telephone: string;
    adresse: string;
  };
  vehicles?: {
    marque: string;
    modele: string;
    immatriculation: string;
    annee: number;
    couleur: string;
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

interface Agency {
  agency_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_path: string | null;
  rc: string | null;
  ice: string | null;
}

export const Reservations: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{debut: Date | null, fin: Date | null}>({
    debut: null,
    fin: null
  });
  const [showDateFirst, setShowDateFirst] = useState(true);

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
    cin_file: null as File | null,
    permis_file: null as File | null,
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (dateRange.debut && dateRange.fin) {
      checkAvailableVehicles();
    }
  }, [dateRange, vehicles]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          clients (nom, prenom, cin, telephone, adresse),
          vehicles (marque, modele, immatriculation, annee, couleur)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (reservationsError) throw reservationsError;

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, nom, prenom')
        .eq('agency_id', user.id);

      if (clientsError) throw clientsError;

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation, etat')
        .eq('agency_id', user.id);

      if (vehiclesError) throw vehiclesError;

      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .select('agency_name, address, phone, email, logo_path, rc, ice')
        .eq('id', user.id)
        .single();

      if (agencyError && agencyError.code !== 'PGRST116') throw agencyError;

      setReservations(reservationsData || []);
      setClients(clientsData || []);
      setVehicles(vehiclesData || []);
      setAgency(agencyData || null);
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

  const checkAvailableVehicles = async () => {
    if (!dateRange.debut || !dateRange.fin || !user) {
      setAvailableVehicles(vehicles);
      return;
    }

    try {
      const newStartDate = dateRange.debut.toLocaleDateString('en-CA');
      const newEndDate = dateRange.fin.toLocaleDateString('en-CA');

      const { data: conflictingReservations, error: reservationError } = await supabase
        .from('reservations')
        .select('vehicule_id, date_debut, date_fin')
        .eq('agency_id', user.id)
        .in('statut', ['confirmee', 'en_cours']);

      if (reservationError) throw reservationError;

      const normalConflicts = (conflictingReservations || []).filter(res => {
        const existingStart = res.date_debut;
        const existingEnd = res.date_fin;
        const hasConflict = existingStart < newEndDate && existingEnd > newStartDate;
        
        if (existingEnd === newStartDate) {
          return false;
        }
        
        return hasConflict;
      });

      const { data: b2bReservations, error: b2bError } = await supabase
        .from('b2b_reservations' as any)
        .select('vehicles, start_date, end_date')
        .eq('agency_id', user.id)
        .in('status', ['confirmed', 'active']);

      const b2bConflicts: string[] = [];
      if (b2bReservations) {
        for (const b2bRes of b2bReservations) {
          const existingStart = (b2bRes as any).start_date;
          const existingEnd = (b2bRes as any).end_date;
          
          const hasB2BConflict = existingStart < newEndDate && existingEnd > newStartDate;
          
          if (hasB2BConflict && existingEnd !== newStartDate) {
            if (Array.isArray((b2bRes as any).vehicles)) {
              for (const vehicle of (b2bRes as any).vehicles) {
                b2bConflicts.push(vehicle.vehicle_id);
              }
            }
          }
        }
      }

      const normalUnavailable = normalConflicts.map(r => r.vehicule_id);
      const allUnavailableIds = [...normalUnavailable, ...b2bConflicts];
      
      const available = vehicles.filter(v => 
        v.etat === 'disponible' && !allUnavailableIds.includes(v.id)
      );

      setAvailableVehicles(available);
    } catch (error) {
      console.error('Error checking vehicle availability:', error);
      setAvailableVehicles(vehicles);
    }
  };
  
  const handleFileUpload = async (file: File, type: 'cin' | 'permis'): Promise<string | null> => {
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Le fichier est trop volumineux (max 10MB)');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user?.id}/${type}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('clientlicences')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) {
        throw new Error(`Erreur d'upload: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('clientlicences')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.client_id || !formData.vehicule_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un client et un véhicule",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      
      let cinUrl = editingReservation?.cin_scan_url || null;
      let permisUrl = editingReservation?.permis_scan_url || null;

      if (formData.cin_file) {
        try {
          cinUrl = await handleFileUpload(formData.cin_file, 'cin');
        } catch (error) {
          toast({
            title: "Erreur",
            description: `Échec de l'upload CIN: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            variant: "destructive",
          });
          return;
        }
      }

      if (formData.permis_file) {
        try {
          permisUrl = await handleFileUpload(formData.permis_file, 'permis');
        } catch (error) {
          toast({
            title: "Erreur",
            description: `Échec de l'upload Permis: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            variant: "destructive",
          });
          return;
        }
      }

      const reservationData = {
        client_id: formData.client_id,
        vehicule_id: formData.vehicule_id,
        date_debut: formData.date_debut || null,
        date_fin: formData.date_fin || null,
        prix_par_jour: formData.prix_par_jour ? parseFloat(formData.prix_par_jour) : null,
        km_depart: formData.km_depart ? parseInt(formData.km_depart) : null,
        km_retour: formData.km_retour ? parseInt(formData.km_retour) : null,
        statut: formData.statut,
        lieu_delivrance: formData.lieu_delivrance,
        lieu_recuperation: formData.lieu_recuperation,
        cin_scan_url: cinUrl,
        permis_scan_url: permisUrl,
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

      if (error) {
        throw new Error(`Erreur de base de données: ${error.message}`);
      }

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
        description: error instanceof Error ? error.message : "Impossible de sauvegarder la réservation",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
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
      cin_file: null,
      permis_file: null,
    });
    setDateRange({ debut: null, fin: null });
  };

  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setFormData({
      client_id: reservation.client_id || '',
      vehicule_id: reservation.vehicule_id || '',
      date_debut: reservation.date_debut || '',
      date_fin: reservation.date_fin || '',
      prix_par_jour: reservation.prix_par_jour?.toString() || '',
      km_depart: reservation.km_depart?.toString() || '',
      km_retour: reservation.km_retour?.toString() || '',
      statut: reservation.statut || 'en_attente',
      lieu_delivrance: reservation.lieu_delivrance || '',
      lieu_recuperation: reservation.lieu_recuperation || '',
      cin_file: null,
      permis_file: null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) return;

    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);

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

  const handlePreviewImage = (url: string) => {
    setPreviewImage(url);
    setIsPreviewOpen(true);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'confirmee':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'en_cours':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'terminee':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
      case 'annulee':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    const searchLower = searchTerm.toLowerCase();
    return (
      reservation.clients?.nom?.toLowerCase().includes(searchLower) ||
      reservation.clients?.prenom?.toLowerCase().includes(searchLower) ||
      reservation.clients?.telephone?.includes(searchTerm) ||
      reservation.vehicles?.marque?.toLowerCase().includes(searchLower) ||
      reservation.vehicles?.modele?.toLowerCase().includes(searchLower) ||
      reservation.vehicles?.immatriculation?.toLowerCase().includes(searchLower)
    );
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedReservations,
    goToPage,
    nextPage,
    prevPage,
    hasNext,
    hasPrev
  } = usePagination({ data: filteredReservations, itemsPerPage: 10 });

  const totalItems = filteredReservations.length;

  const generateContractPDF = async (reservation: Reservation) => {
    if (!agency) {
      toast({
        title: "Erreur",
        description: "Informations de l'agence manquantes",
        variant: "destructive",
      });
      return;
    }

    try {
      setGeneratingPDF(reservation.id);
      toast({
        title: "Succès",
        description: "Contrat généré avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération du contrat",
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(null);
    }
  };

  return (
    <div className="desktop-page-content">
      <div className="compact-section">
        <div className="compact-section-header">
          <div>
            <h1 className="compact-section-title">Réservations</h1>
            <p className="text-sm text-muted-foreground">Gérez vos réservations de véhicules</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => { resetForm(); setEditingReservation(null); }}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle réservation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingReservation ? 'Modifier la réservation' : 'Nouvelle réservation'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_id">Client *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    >
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
                    <Select
                      value={formData.vehicule_id}
                      onValueChange={(value) => setFormData({ ...formData, vehicule_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner un véhicule" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.marque} {vehicle.modele} - {vehicle.immatriculation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date_debut">Date de début</Label>
                    <Input
                      id="date_debut"
                      type="date"
                      value={formData.date_debut}
                      onChange={(e) => {
                        setFormData({ ...formData, date_debut: e.target.value });
                        setDateRange({ ...dateRange, debut: e.target.value ? new Date(e.target.value) : null });
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_fin">Date de fin</Label>
                    <Input
                      id="date_fin"
                      type="date"
                      value={formData.date_fin}
                      onChange={(e) => {
                        setFormData({ ...formData, date_fin: e.target.value });
                        setDateRange({ ...dateRange, fin: e.target.value ? new Date(e.target.value) : null });
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="prix_par_jour">Prix par jour (MAD)</Label>
                    <Input
                      id="prix_par_jour"
                      type="number"
                      value={formData.prix_par_jour}
                      onChange={(e) => setFormData({ ...formData, prix_par_jour: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="km_depart">KM de départ</Label>
                    <Input
                      id="km_depart"
                      type="number"
                      value={formData.km_depart}
                      onChange={(e) => setFormData({ ...formData, km_depart: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="statut">Statut</Label>
                    <Select
                      value={formData.statut}
                      onValueChange={(value) => setFormData({ ...formData, statut: value })}
                    >
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
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={uploading || !formData.client_id || !formData.vehicule_id} 
                    className="w-full sm:w-auto"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Téléchargement...
                      </>
                    ) : (
                      editingReservation ? 'Modifier' : 'Ajouter'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="search-bar">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher une réservation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-0 bg-background"
          />
        </div>
      </div>

      {loading ? (
        <div className="desktop-table-wrapper">
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="compact-section">
          <div className="compact-section-header">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="compact-section-title">Liste des réservations ({totalItems})</span>
            </div>
          </div>

          {filteredReservations.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Aucune réservation trouvée
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Aucune réservation ne correspond à votre recherche.' : 'Commencez par ajouter votre première réservation.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => { resetForm(); setEditingReservation(null); setIsDialogOpen(true); }} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle réservation
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="desktop-table-wrapper">
                <Table className="desktop-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[20%]">Client</TableHead>
                      <TableHead className="w-[18%]">Véhicule</TableHead>
                      <TableHead className="w-[15%]">Période</TableHead>
                      <TableHead className="w-[10%]">Prix/jour</TableHead>
                      <TableHead className="w-[10%]">Statut</TableHead>
                      <TableHead className="w-[12%]">Documents</TableHead>
                      <TableHead className="w-[15%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {reservation.clients?.prenom} {reservation.clients?.nom}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {reservation.clients?.telephone}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Car className="w-4 h-4 text-muted-foreground" />
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {reservation.vehicles?.marque} {reservation.vehicles?.modele}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {reservation.vehicles?.immatriculation}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {reservation.date_debut && reservation.date_fin ? (
                              <>
                                <div className="font-medium">{new Date(reservation.date_debut).toLocaleDateString('fr-FR')}</div>
                                <div className="text-muted-foreground">au {new Date(reservation.date_fin).toLocaleDateString('fr-FR')}</div>
                              </>
                            ) : (
                              'Dates non définies'
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">
                            {reservation.prix_par_jour ? `${reservation.prix_par_jour} MAD` : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(reservation.statut)}>
                            {reservation.statut || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {reservation.cin_scan_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePreviewImage(reservation.cin_scan_url!)}
                                className="text-xs h-7 px-2"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                CIN
                              </Button>
                            )}
                            {reservation.permis_scan_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePreviewImage(reservation.permis_scan_url!)}
                                className="text-xs h-7 px-2"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Permis
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateContractPDF(reservation)}
                              disabled={generatingPDF === reservation.id}
                              className="h-7 px-2"
                            >
                              {generatingPDF === reservation.id ? (
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FileText className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(reservation)}
                              className="h-7 px-2"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(reservation.id)}
                              className="h-7 px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {totalPages > 1 && (
                <div className="mt-4">
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
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Aperçu du document</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img 
                src={previewImage} 
                alt="Document preview" 
                className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
