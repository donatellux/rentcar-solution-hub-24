import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Calendar, User, Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';

interface Reservation {
  id: string;
  client_id: string | null;
  vehicule_id: string | null;
  date_debut: string | null;
  date_fin: string | null;
  prix_par_jour: number | null;
  statut: string | null;
  km_depart: number | null;
  km_retour: number | null;
  agency_id: string | null;
  cin_scan_url: string | null;
  created_at: string | null;
  lieu_delivrance: string | null;
  lieu_recuperation: string | null;
  permis_scan_url: string | null;
  clients?: {
    nom: string;
    prenom: string;
    telephone: string;
  } | null;
  vehicles?: {
    marque: string;
    modele: string;
    immatriculation: string;
  } | null;
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
}

const getStatusColor = (statut: string | null) => {
  switch (statut) {
    case 'confirmee':
      return 'bg-success/20 text-success border-success/30';
    case 'en_cours':
      return 'bg-info/20 text-info border-info/30';
    case 'terminee':
      return 'bg-muted text-muted-foreground border-border';
    case 'annulee':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const Reservations: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
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
    statut: 'confirmee',
    km_depart: '',
    km_retour: '',
  });

  useEffect(() => {
    if (user) {
      fetchReservations();
      fetchClients();
      fetchVehicles();
    }
  }, [user]);

  const fetchReservations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          client_id,
          vehicule_id,
          date_debut,
          date_fin,
          prix_par_jour,
          statut,
          km_depart,
          km_retour,
          agency_id,
          cin_scan_url,
          created_at,
          lieu_delivrance,
          lieu_recuperation,
          permis_scan_url,
          clients(nom, prenom, telephone),
          vehicles(marque, modele, immatriculation)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nom, prenom')
        .eq('agency_id', user.id);

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchVehicles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation')
        .eq('agency_id', user.id);

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const updateRevenue = async (reservationData: any) => {
    if (!user || !reservationData.date_debut || !reservationData.date_fin || !reservationData.prix_par_jour) return;

    const startDate = new Date(reservationData.date_debut);
    const endDate = new Date(reservationData.date_fin);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const revenue = days * reservationData.prix_par_jour;

    try {
      const { error } = await supabase.from('global_expenses').insert({
        description: `Revenus - Réservation ${reservationData.client_id}`,
        amount: revenue,
        category: 'revenus',
        date: new Date().toISOString().split('T')[0],
        agency_id: user?.id,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating revenue:', error);
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
        agency_id: user.id,
      };

      let error;
      if (editingReservation) {
        const { error: updateError } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', editingReservation.id);
        error = updateError;

        // If status changed to 'terminee', add revenue
        if (reservationData.statut === 'terminee' && editingReservation.statut !== 'terminee') {
          await updateRevenue(reservationData);
        }
      } else {
        const { error: insertError } = await supabase
          .from('reservations')
          .insert(reservationData);
        error = insertError;

        // If new reservation is 'terminee', add revenue
        if (reservationData.statut === 'terminee') {
          await updateRevenue(reservationData);
        }
      }

      if (error) throw error;

      toast({
        title: "Succès",
        description: editingReservation ? "Réservation modifiée avec succès" : "Réservation ajoutée avec succès",
      });

      setIsDialogOpen(false);
      setEditingReservation(null);
      resetForm();
      fetchReservations();
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

      fetchReservations();
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
      date_debut: reservation.date_debut || '',
      date_fin: reservation.date_fin || '',
      prix_par_jour: reservation.prix_par_jour?.toString() || '',
      statut: reservation.statut || 'confirmee',
      km_depart: reservation.km_depart?.toString() || '',
      km_retour: reservation.km_retour?.toString() || '',
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
      statut: 'confirmee',
      km_depart: '',
      km_retour: '',
    });
  };

  const filteredReservations = reservations.filter(reservation =>
    `${reservation.clients?.nom} ${reservation.clients?.prenom} ${reservation.vehicles?.marque} ${reservation.vehicles?.modele}`
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
  } = usePagination({ data: filteredReservations, itemsPerPage: 10 });

  return (
    <div className="page-spacing animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{t('reservations.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('reservations.subtitle')}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingReservation(null); }} className="gradient-primary shadow-elegant transition-all-smooth hover:shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              {t('reservations.addReservation')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingReservation ? t('reservations.editReservation') : t('reservations.addReservation')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_id">{t('reservations.client')} *</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('reservations.selectClient')} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nom} {client.prenom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vehicule_id">{t('reservations.vehicle')} *</Label>
                  <Select value={formData.vehicule_id} onValueChange={(value) => setFormData({ ...formData, vehicule_id: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('reservations.selectVehicle')} />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.marque} {vehicle.modele} - {vehicle.immatriculation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date_debut">{t('reservations.startDate')} *</Label>
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
                  <Label htmlFor="date_fin">{t('reservations.endDate')} *</Label>
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
                  <Label htmlFor="prix_par_jour">{t('reservations.pricePerDay')}</Label>
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
                  <Label htmlFor="statut">{t('reservations.status')}</Label>
                  <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmee">{t('reservations.confirmed')}</SelectItem>
                      <SelectItem value="en_cours">{t('reservations.inProgress')}</SelectItem>
                      <SelectItem value="terminee">{t('reservations.completed')}</SelectItem>
                      <SelectItem value="annulee">{t('reservations.cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="km_depart">{t('reservations.startKm')}</Label>
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
                  <Label htmlFor="km_retour">{t('reservations.returnKm')}</Label>
                  <Input
                    id="km_retour"
                    type="number"
                    min="0"
                    value={formData.km_retour}
                    onChange={(e) => setFormData({ ...formData, km_retour: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingReservation ? t('common.update') : t('common.add')}
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
            placeholder={t('reservations.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 transition-all-smooth focus:shadow-glow"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredReservations.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">
              {searchTerm ? t('reservations.noReservationsFound') : t('reservations.noReservations')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? t('reservations.noReservationsFoundDescription')
                : t('reservations.noReservationsDescription')
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => { resetForm(); setEditingReservation(null); setIsDialogOpen(true); }} className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                {t('reservations.addReservation')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reservations.client')}</TableHead>
                      <TableHead>{t('reservations.vehicle')}</TableHead>
                      <TableHead>{t('reservations.period')}</TableHead>
                      <TableHead>{t('reservations.pricePerDay')}</TableHead>
                      <TableHead>{t('reservations.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {reservation.clients?.nom} {reservation.clients?.prenom}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {reservation.clients?.telephone}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-success/10 rounded-lg">
                              <Car className="w-4 h-4 text-success" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {reservation.vehicles?.marque} {reservation.vehicles?.modele}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {reservation.vehicles?.immatriculation}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm">
                                {reservation.date_debut ? new Date(reservation.date_debut).toLocaleDateString('fr-FR') : '-'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t('common.to')} {reservation.date_fin ? new Date(reservation.date_fin).toLocaleDateString('fr-FR') : '-'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {reservation.prix_par_jour ? `${reservation.prix_par_jour} MAD` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(reservation.statut)}>
                            {reservation.statut === 'confirmee' && t('reservations.confirmed')}
                            {reservation.statut === 'en_cours' && t('reservations.inProgress')}
                            {reservation.statut === 'terminee' && t('reservations.completed')}
                            {reservation.statut === 'annulee' && t('reservations.cancelled')}
                            {!reservation.statut && '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(reservation)}
                              className="hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(reservation.id)}
                              className="hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
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
    </div>
  );
};
