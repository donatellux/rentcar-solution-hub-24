import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Calendar, Car, User, Eye, FileText, CalendarDays, Phone, CreditCard } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const isMobile = useIsMobile();
  const { t } = useLanguage();

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
  const [dateRange, setDateRange] = useState<{ debut: Date | null; fin: Date | null }>({
    debut: null,
    fin: null,
  });

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
        title: t('error'),
        description: t('unableToLoadData'),
        variant: 'destructive',
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
      const { data: conflictingReservations, error } = await supabase
        .from('reservations')
        .select('vehicule_id')
        .eq('agency_id', user.id)
        .in('statut', ['confirmee', 'en_cours'])
        .or(
          `and(date_debut.lte.${dateRange.debut.toISOString()},date_fin.gte.${dateRange.debut.toISOString()}),` +
            `and(date_debut.lte.${dateRange.fin.toISOString()},date_fin.gte.${dateRange.fin.toISOString()}),` +
            `and(date_debut.gte.${dateRange.debut.toISOString()},date_fin.lte.${dateRange.fin.toISOString()})`
        );

      if (error) throw error;

      const unavailableVehicleIds = conflictingReservations?.map((r) => r.vehicule_id) || [];
      const available = vehicles.filter((v) => v.etat === 'disponible' && !unavailableVehicleIds.includes(v.id));

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
          contentType: file.type,
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Erreur d'upload: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage.from('clientlicences').getPublicUrl(fileName);

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
        title: t('error'),
        description: t('selectClientAndVehicle'),
        variant: 'destructive',
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
            title: t('error'),
            description: `Échec de l'upload CIN: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            variant: 'destructive',
          });
          return;
        }
      }

      if (formData.permis_file) {
        try {
          permisUrl = await handleFileUpload(formData.permis_file, 'permis');
        } catch (error) {
          toast({
            title: t('error'),
            description: `Échec de l'upload Permis: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            variant: 'destructive',
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
        if (editingReservation.statut !== 'terminee' && formData.statut === 'terminee') {
          await updateRevenue(reservationData);
        }

        const { error: updateError } = await supabase.from('reservations').update(reservationData).eq('id', editingReservation.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('reservations').insert(reservationData);
        error = insertError;
      }

      if (error) {
        throw new Error(`Erreur de base de données: ${error.message}`);
      }

      toast({
        title: t('success'),
        description: editingReservation ? t('reservationUpdated') : t('reservationAdded'),
      });

      setIsDialogOpen(false);
      setEditingReservation(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('unableToSaveReservation'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const updateRevenue = async (reservationData: any) => {
    if (!reservationData.prix_par_jour || !reservationData.date_debut || !reservationData.date_fin) return;

    const startDate = new Date(reservationData.date_debut);
    const endDate = new Date(reservationData.date_fin);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const revenue = days * reservationData.prix_par_jour;

    try {
      const { error } = await supabase.from('depenses').insert({
        description: `Revenus - Réservation ${reservationData.client_id}`,
        montant: revenue,
        type: 'revenus',
        date: new Date().toISOString().split('T')[0],
        agency_id: user?.id,
      });

      if (error) {
        console.error('Error adding revenue:', error);
      }
    } catch (error) {
      console.error('Error updating revenue:', error);
    }
  };

  const generateContractPDF = async (reservation: Reservation) => {
    if (!agency) {
      toast({
        title: t('error'),
        description: t('missingAgencyInfo'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setGeneratingPDF(reservation.id);

      const contractHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
            .section { margin: 20px 0; }
            .signature-section { margin-top: 80px; border-top: 1px solid #ccc; padding-top: 20px; }
            .signature-box { border: 1px solid #333; height: 80px; width: 200px; display: inline-block; margin: 10px; }
            .empty-field { border-bottom: 1px solid #333; display: inline-block; min-width: 200px; margin-left: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            ${agency.logo_path ? `<img src="${agency.logo_path}" alt="Logo" class="logo">` : ''}
            <h1>${agency.agency_name || 'Agence de Location'}</h1>
            <p>${agency.address || ''}</p>
            <p>Tél: ${agency.phone || ''} | Email: ${agency.email || ''}</p>
            <p>RC: ${agency.rc || ''} | ICE: ${agency.ice || ''}</p>
          </div>

          <h2 style="text-align: center;">CONTRAT DE LOCATION DE VÉHICULE</h2>
          
          <div class="section">
            <h3>Informations Client</h3>
            <p><strong>Nom:</strong> ${reservation.clients?.prenom} ${reservation.clients?.nom}</p>
            <p><strong>CIN:</strong> ${reservation.clients?.cin || ''}</p>
            <p><strong>Téléphone:</strong> ${reservation.clients?.telephone || ''}</p>
            <p><strong>Adresse:</strong> ${reservation.clients?.adresse || ''}</p>
          </div>

          <div class="section">
            <h3>Deuxième Conducteur (Optionnel)</h3>
            <p><strong>Nom:</strong> <span class="empty-field"></span></p>
            <p><strong>CIN:</strong> <span class="empty-field"></span></p>
            <p><strong>Téléphone:</strong> <span class="empty-field"></span></p>
          </div>

          <div class="section">
            <h3>Informations Véhicule</h3>
            <table>
              <tr><th>Marque</th><td>${reservation.vehicles?.marque || ''}</td></tr>
              <tr><th>Modèle</th><td>${reservation.vehicles?.modele || ''}</td></tr>
              <tr><th>Immatriculation</th><td>${reservation.vehicles?.immatriculation || ''}</td></tr>
              <tr><th>Année</th><td>${reservation.vehicles?.annee || ''}</td></tr>
              <tr><th>Couleur</th><td>${reservation.vehicles?.couleur || ''}</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>Détails de la Location</h3>
            <table>
              <tr><th>Date de début</th><td>${reservation.date_debut ? new Date(reservation.date_debut).toLocaleDateString() : ''}</td></tr>
              <tr><th>Date de fin</th><td>${reservation.date_fin ? new Date(reservation.date_fin).toLocaleDateString() : ''}</td></tr>
              <tr><th>Prix par jour</th><td>${reservation.prix_par_jour || 0} MAD</td></tr>
              <tr><th>Lieu de délivrance</th><td>${reservation.lieu_delivrance || ''}</td></tr>
              <tr><th>Lieu de récupération</th><td>${reservation.lieu_recuperation || ''}</td></tr>
              <tr><th>Kilométrage départ</th><td>${reservation.km_depart || ''} km</td></tr>
              <tr><th>Kilométrage retour</th><td>${reservation.km_retour || ''} km</td></tr>
            </table>
          </div>

          <div class="signature-section">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <p><strong>Signature du Client:</strong></p>
                <div class="signature-box"></div>
                <p>Date: _______________</p>
              </div>
              <div>
                <p><strong>Signature de l'Agence:</strong></p>
                <div class="signature-box"></div>
                <p>Date: _______________</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([contractHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Contrat_${reservation.clients?.nom}_${reservation.id.substring(0, 8)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: t('success'),
        description: t('contractGenerated'),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('unableToGenerateContract'),
        variant: 'destructive',
      });
    } finally {
      setGeneratingPDF(null);
    }
  };

  const handleDelete = async (reservationId: string) => {
    if (!confirm(t('confirmDeleteReservation'))) return;

    try {
      const { error } = await supabase.from('reservations').delete().eq('id', reservationId);

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('reservationDeleted'),
      });

      fetchData();
    } catch (error) {
      toast({
        title: t('error'),
        description: t('unableToDeleteReservation'),
        variant: 'destructive',
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
      cin_file: null,
      permis_file: null,
    });

    if (reservation.date_debut && reservation.date_fin) {
      setDateRange({
        debut: new Date(reservation.date_debut),
        fin: new Date(reservation.date_fin),
      });
    }

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
      cin_file: null,
      permis_file: null,
    });
    setDateRange({ debut: null, fin: null });
  };

  const handlePreviewImage = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setIsPreviewOpen(true);
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

  const handleDateSelect = (type: 'debut' | 'fin') => (date: Date | undefined) => {
    if (!date) return;

    const newDateRange = { ...dateRange, [type]: date };
    setDateRange(newDateRange);

    if (type === 'debut') {
      setFormData({ ...formData, date_debut: date.toISOString().split('T')[0] });
    } else {
      setFormData({ ...formData, date_fin: date.toISOString().split('T')[0] });
    }
  };

  const filteredReservations = reservations.filter((reservation) =>
    `${reservation.clients?.nom} ${reservation.clients?.prenom} ${reservation.vehicles?.marque} ${reservation.vehicles?.modele}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const ReservationCard = ({ reservation }: { reservation: Reservation }) => (
    <Card className="mobile-card">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-primary" />
            <div>
              <CardTitle className="text-base">
                {reservation.clients?.prenom} {reservation.clients?.nom}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center mt-1">
                <Phone className="w-3 h-3 mr-1" />
                {reservation.clients?.telephone}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(reservation.statut)}>{reservation.statut || 'N/A'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-2">
          <Car className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {reservation.vehicles?.marque} {reservation.vehicles?.modele} - {reservation.vehicles?.immatriculation}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {reservation.date_debut && reservation.date_fin ? (
              `${new Date(reservation.date_debut).toLocaleDateString('fr-FR')} - ${new Date(reservation.date_fin).toLocaleDateString('fr-FR')}`
            ) : (
              'Dates non définies'
            )}
          </span>
        </div>

        {reservation.prix_par_jour && (
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{reservation.prix_par_jour} MAD/jour</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-border">
          <div className="flex space-x-1">
            {reservation.cin_scan_url && (
              <Button size="sm" variant="outline" onClick={() => handlePreviewImage(reservation.cin_scan_url!)} className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                CIN
              </Button>
            )}
            {reservation.permis_scan_url && (
              <Button size="sm" variant="outline" onClick={() => handlePreviewImage(reservation.permis_scan_url!)} className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Permis
              </Button>
            )}
          </div>

          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateContractPDF(reservation)}
              disabled={generatingPDF === reservation.id}
              className="text-xs"
            >
              {generatingPDF === reservation.id ? (
                <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="w-3 h-3" />
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleEdit(reservation)} className="text-xs">
              <Edit className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleDelete(reservation.id)} className="text-xs text-destructive">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="page-title">{t('reservations')}</h1>
            <p className="page-subtitle">{t('manageVehicleReservations')}</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingReservation(null); }} className="gradient-primary shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('newReservation')}</span>
                <span className="sm:hidden">{t('new')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="dialog-content">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">{editingReservation ? t('editReservation') : t('newReservation')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="section-spacing">
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-primary">
                      <CalendarDays className="w-5 h-5" />
                      <span>{t('rentalPeriod')}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="form-grid">
                      <div>
                        <Label>{t('startDate')} *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn('w-full justify-start text-left font-normal mt-1', !dateRange.debut && 'text-muted-foreground')}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {dateRange.debut ? format(dateRange.debut, 'PPP', { locale: fr }) : t('chooseDate')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={dateRange.debut || undefined}
                              onSelect={handleDateSelect('debut')}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>{t('endDate')} *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn('w-full justify-start text-left font-normal mt-1', !dateRange.fin && 'text-muted-foreground')}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {dateRange.fin ? format(dateRange.fin, 'PPP', { locale: fr }) : t('chooseDate')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={dateRange.fin || undefined}
                              onSelect={handleDateSelect('fin')}
                              disabled={(date) => dateRange.debut && date < dateRange.debut}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    {dateRange.debut && dateRange.fin && (
                      <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm text-primary">
                          <strong>{availableVehicles.length}</strong> {t('vehiclesAvailable')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="form-grid">
                  <div>
                    <Label htmlFor="client_id">{t('client')} *</Label>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('selectClient')} />
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
                    <Label htmlFor="vehicule_id">{t('vehicle')} *</Label>
                    <Select
                      value={formData.vehicule_id}
                      onValueChange={(value) => setFormData({ ...formData, vehicule_id: value })}
                      disabled={!dateRange.debut || !dateRange.fin}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue
                          placeholder={
                            !dateRange.debut || !dateRange.fin ? t('chooseDatesFirst') : t('selectAvailableVehicle')
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            <div className="flex items-center space-x-2">
                              <Car className="w-4 h-4 text-green-600" />
                              <span>
                                {vehicle.marque} {vehicle.modele} - {vehicle.immatriculation}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {dateRange.debut && dateRange.fin && availableVehicles.length === 0 && (
                      <p className="text-sm text-destructive mt-1">{t('noVehiclesAvailable')}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="prix_par_jour">{t('pricePerDay')} (MAD)</Label>
                    <Input
                      id="prix_par_jour"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.prix_par_jour}
                      onChange={(e) => setFormData({ ...formData, prix_par_jour: e.target.value })}
                      className="mt-1"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="statut">{t('status')}</Label>
                    <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_attente">{t('pending')}</SelectItem>
                        <SelectItem value="confirmee">{t('confirmed')}</SelectItem>
                        <SelectItem value="en_cours">{t('inProgress')}</SelectItem>
                        <SelectItem value="terminee">{t('completed')}</SelectItem>
                        <SelectItem value="annulee">{t('cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="km_depart">{t('kmStart')}</Label>
                    <Input
                      id="km_depart"
                      type="number"
                      min="0"
                      value={formData.km_depart}
                      onChange={(e) => setFormData({ ...formData, km_depart: e.target.value })}
                      className="mt-1"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="km_retour">{t('kmEnd')}</Label>
                    <Input
                      id="km_retour"
                      type="number"
                      min="0"
                      value={formData.km_retour}
                      onChange={(e) => setFormData({ ...formData, km_retour: e.target.value })}
                      className="mt-1"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lieu_delivrance">{t('deliveryLocation')}</Label>
                    <Input
                      id="lieu_delivrance"
                      value={formData.lieu_delivrance}
                      onChange={(e) => setFormData({ ...formData, lieu_delivrance: e.target.value })}
                      className="mt-1"
                      placeholder={t('deliveryAddress')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lieu_recuperation">{t('pickupLocation')}</Label>
                    <Input
                      id="lieu_recuperation"
                      value={formData.lieu_recuperation}
                      onChange={(e) => setFormData({ ...formData, lieu_recuperation: e.target.value })}
                      className="mt-1"
                      placeholder={t('pickupAddress')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cin_file">{t('cinPhoto')}</Label>
                    <Input
                      id="cin_file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, cin_file: e.target.files?.[0] || null })}
                      className="mt-1"
                    />
                    {editingReservation?.cin_scan_url && (
                      <div className="mt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handlePreviewImage(editingReservation.cin_scan_url!)}>
                          <Eye className="w-4 h-4 mr-1" />
                          {t('viewCurrentCin')}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="permis_file">{t('licensePhoto')}</Label>
                    <Input
                      id="permis_file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, permis_file: e.target.files?.[0] || null })}
                      className="mt-1"
                    />
                    {editingReservation?.permis_scan_url && (
                      <div className="mt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handlePreviewImage(editingReservation.permis_scan_url!)}>
                          <Eye className="w-4 h-4 mr-1" />
                          {t('viewCurrentLicense')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="mobile-full">
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={uploading || !formData.client_id || !formData.vehicule_id} className="gradient-primary mobile-full">
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        {t('uploading')}...
                      </>
                    ) : editingReservation ? (
                      t('edit')
                    ) : (
                      t('add')
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('searchReservation')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="card-spacing">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span>
                {t('reservationsList')} ({filteredReservations.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReservations.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">{t('noReservationsFound')}</h3>
                <p className="text-muted-foreground mb-4">{searchTerm ? t('noReservationsMatch') : t('addFirstReservation')}</p>
                {!searchTerm && (
                  <Button onClick={() => { resetForm(); setEditingReservation(null); setIsDialogOpen(true); }} className="gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('newReservation')}
                  </Button>
                )}
              </div>
            ) : isMobile ? (
              <div className="space-y-4">
                {filteredReservations.map((reservation) => (
                  <ReservationCard key={reservation.id} reservation={reservation} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('client')}</TableHead>
                      <TableHead>{t('vehicle')}</TableHead>
                      <TableHead>{t('period')}</TableHead>
                      <TableHead>{t('pricePerDay')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('documents')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReservations.map((reservation) => (
                      <TableRow key={reservation.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {reservation.clients?.prenom} {reservation.clients?.nom}
                              </div>
                              <div className="text-sm text-muted-foreground">{reservation.clients?.telephone}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Car className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {reservation.vehicles?.marque} {reservation.vehicles?.modele}
                              </div>
                              <div className="text-sm text-muted-foreground">{reservation.vehicles?.immatriculation}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {reservation.date_debut && reservation.date_fin ? (
                              <>
                                <div>{new Date(reservation.date_debut).toLocaleDateString('fr-FR')}</div>
                                <div className="text-muted-foreground">au {new Date(reservation.date_fin).toLocaleDateString('fr-FR')}</div>
                              </>
                            ) : (
                              'Dates non définies'
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{reservation.prix_par_jour ? `${reservation.prix_par_jour} MAD` : 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(reservation.statut)}>{reservation.statut || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {reservation.cin_scan_url && (
                              <Button size="sm" variant="outline" onClick={() => handlePreviewImage(reservation.cin_scan_url!)} className="text-xs hover:bg-primary/10">
                                <Eye className="w-3 h-3 mr-1" />
                                CIN
                              </Button>
                            )}
                            {reservation.permis_scan_url && (
                              <Button size="sm" variant="outline" onClick={() => handlePreviewImage(reservation.permis_scan_url!)} className="text-xs hover:bg-primary/10">
                                <Eye className="w-3 h-3 mr-1" />
                                Permis
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateContractPDF(reservation)}
                              disabled={generatingPDF === reservation.id}
                              className="hover:bg-success/10 hover:text-success"
                            >
                              {generatingPDF === reservation.id ? (
                                <div className="w-4 h-4 border-2 border-success border-t-transparent rounded-full animate-spin mr-1" />
                              ) : (
                                <FileText className="w-4 h-4 mr-1" />
                              )}
                              <span className="hidden sm:inline">{t('contract')}</span>
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(reservation)} className="hover:bg-primary/10 hover:text-primary">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(reservation.id)} className="hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('documentPreview')}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img src={previewImage} alt="Document preview" className="max-w-full max-h-96 object-contain rounded-lg shadow-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
