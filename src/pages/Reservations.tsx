import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar, Car, User, Edit, Trash2, Search, FileText, Download, DollarSign } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';

interface Reservation {
  id: string;
  vehicule_id: string;
  client_id: string;
  date_debut: string;
  date_fin: string;
  prix_par_jour: number;
  statut: string;
  lieu_delivrance?: string;
  is_b2b?: boolean;
  society_id?: string;
  with_driver?: boolean;
  additional_charges?: number;
  created_at: string;
  vehicles?: { 
    marque: string; 
    modele: string; 
    immatriculation: string; 
  };
  clients?: {
    nom: string;
    prenom: string;
    telephone: string;
  };
}

interface Client {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  cin?: string;
  permis_conduire?: string;
  adresse?: string;
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
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [agency, setAgency] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    client_id: '',
    vehicule_id: '',
    date_debut: '',
    date_fin: '',
    prix_par_jour: 0,
    statut: 'confirmee' as string,
    lieu_delivrance: '',
    with_driver: false,
    additional_charges: 0,
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          vehicles (marque, modele, immatriculation),
          clients (nom, prenom, telephone)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (reservationsError) throw reservationsError;
      setReservations(reservationsData || []);

      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_id', user?.id);

      setClients(clientsData || []);

      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation, etat')
        .eq('agency_id', user?.id);

      setVehicles(vehiclesData || []);
      
      // Fetch agency data for PDF generation
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .select('agency_name, address, phone, email, logo_path, rc, ice')
        .eq('id', user.id)
        .single();

      if (agencyError && agencyError.code !== 'PGRST116') {
        console.warn('Agency data not found');
      } else {
        setAgency(agencyData);
      }
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
    if (!selectedDate || !selectedVehicle) {
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

      // Format the selected date for comparison
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('Checking availability for date:', selectedDateStr);

      // Get existing reservations that could conflict
      const { data: existingReservations } = await supabase
        .from('reservations')
        .select('vehicule_id, date_debut, date_fin')
        .eq('agency_id', user?.id)
        .in('statut', ['confirmee', 'en_cours']);

      console.log('All existing reservations:', existingReservations);

      // Filter reservations that actually conflict with the selected date
      const conflictingReservations = (existingReservations || []).filter(reservation => {
        const startDate = reservation.date_debut;
        const endDate = reservation.date_fin;
        
        // A vehicle is NOT available if the selected date falls within an existing reservation
        // This means: startDate <= selectedDate <= endDate
        // But we want to allow booking on the end date, so: startDate <= selectedDate < endDate
        const isConflicting = selectedDateStr >= startDate && selectedDateStr < endDate;
        
        console.log(`Vehicle ${reservation.vehicule_id}: ${startDate} to ${endDate}, selected: ${selectedDateStr}, conflicting: ${isConflicting}`);
        
        return isConflicting;
      });

      console.log('Conflicting reservations:', conflictingReservations);

      // Get B2B reservations that could conflict
      const { data: b2bReservations } = await supabase
        .from('b2b_reservations' as any)
        .select('vehicles, start_date, end_date')
        .eq('agency_id', user?.id)
        .in('status', ['confirmed', 'en_cours']);

      // Check B2B conflicts
      const b2bConflictingVehicles: string[] = [];
      if (b2bReservations) {
        for (const b2bRes of b2bReservations) {
          const startDate = (b2bRes as any).start_date;
          const endDate = (b2bRes as any).end_date;
          
          // Same logic: allow booking on end date
          const isConflicting = selectedDateStr >= startDate && selectedDateStr < endDate;
          
          if (isConflicting && Array.isArray((b2bRes as any).vehicles)) {
            for (const vehicle of (b2bRes as any).vehicles) {
              b2bConflictingVehicles.push(vehicle.vehicle_id);
            }
          }
        }
      }

      console.log('B2B conflicting vehicles:', b2bConflictingVehicles);

      // Combine all unavailable vehicle IDs
      const regularUnavailable = conflictingReservations.map(r => r.vehicule_id);
      const allUnavailableIds = [...regularUnavailable, ...b2bConflictingVehicles];
      
      console.log('All unavailable vehicle IDs:', allUnavailableIds);

      // Filter available vehicles
      const available = allVehicles.filter(v => !allUnavailableIds.includes(v.id));
      console.log('Available vehicles:', available.map(v => `${v.marque} ${v.modele} - ${v.immatriculation}`));
      
      setAvailableVehicles(available);
    } catch (error) {
      console.error('Error fetching available vehicles:', error);
      setAvailableVehicles([]);
    }
  };

  useEffect(() => {
    fetchAvailableVehicles();
  }, [selectedDate, selectedVehicle]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const reservationData = {
        ...formData,
        agency_id: user?.id,
        prix_par_jour: Number(formData.prix_par_jour),
        additional_charges: Number(formData.additional_charges) || 0,
      };

      let result;
      if (editingReservation) {
        const { data, error } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', editingReservation.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('reservations')
          .insert([reservationData])
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      // Calculate total revenue for this reservation
      const startDate = new Date(formData.date_debut);
      const endDate = new Date(formData.date_fin);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const totalRevenue = (formData.prix_par_jour * days) + (formData.additional_charges || 0);

      // Add to global revenues
      const { error: globalRevenueError } = await supabase.from('global_revenues' as any).insert([{
        agency_id: user?.id,
        source: 'Reservations',
        amount: totalRevenue,
        description: `Réservation ${result.id}`,
        date: new Date().toISOString().split('T')[0],
        vehicle_ids: [formData.vehicule_id]
      }]);

      if (globalRevenueError) {
        console.error('Error adding global revenue:', globalRevenueError);
      }

      // Add to vehicle revenues for statistics
      const vehicleRevenue = formData.prix_par_jour * days;
      const { error: vehicleRevenueError } = await supabase.from('vehicle_revenues' as any).insert([{
        agency_id: user?.id,
        vehicle_id: formData.vehicule_id,
        source: 'Reservation',
        amount: vehicleRevenue,
        description: `Réservation ${result.id}`,
        date: formData.date_debut,
        start_date: formData.date_debut,
        end_date: formData.date_fin
      }]);

      if (vehicleRevenueError) {
        console.error('Error adding vehicle revenue:', vehicleRevenueError);
      }

      await fetchData();
      resetForm();
      setDialogOpen(false);
      
      toast({
        title: "Succès",
        description: editingReservation ? "Réservation modifiée avec succès" : "Réservation créée avec succès",
      });
    } catch (error) {
      console.error('Error saving reservation:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'enregistrement de la réservation",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      vehicule_id: '',
      date_debut: '',
      date_fin: '',
      prix_par_jour: 0,
      statut: 'confirmee',
      lieu_delivrance: '',
      with_driver: false,
      additional_charges: 0,
    });
    setEditingReservation(null);
    setSelectedDate(null);
    setSelectedVehicle('');
  };

  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setFormData({
      client_id: reservation.client_id,
      vehicule_id: reservation.vehicule_id,
      date_debut: reservation.date_debut,
      date_fin: reservation.date_fin,
      prix_par_jour: reservation.prix_par_jour,
      statut: reservation.statut,
      lieu_delivrance: reservation.lieu_delivrance || '',
      with_driver: reservation.with_driver || false,
      additional_charges: reservation.additional_charges || 0,
    });
    setDialogOpen(true);
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

      await fetchData();
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const generateInvoicePDF = async (reservation: Reservation) => {
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

      // Calculate duration and total
      const startDate = new Date(reservation.date_debut);
      const endDate = new Date(reservation.date_fin);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const subtotal = reservation.prix_par_jour * days;
      const total = subtotal + (reservation.additional_charges || 0);

      // Create modern HTML invoice
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              background: #f8f9fa;
            }
            .container { 
              max-width: 800px; 
              margin: 0 auto; 
              background: white; 
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white; 
              padding: 30px; 
              position: relative;
            }
            .logo { 
              max-width: 120px; 
              height: auto; 
              margin-bottom: 15px;
              border-radius: 8px;
            }
            .agency-info { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-end;
            }
            .agency-details h1 { 
              font-size: 28px; 
              font-weight: 700; 
              margin-bottom: 10px;
            }
            .agency-details p { 
              margin: 3px 0; 
              opacity: 0.9;
            }
            .invoice-title { 
              background: #fff; 
              color: #667eea; 
              padding: 8px 20px; 
              border-radius: 25px; 
              font-weight: 600; 
              display: inline-block;
            }
            .content { padding: 40px; }
            .invoice-details { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 30px; 
              margin-bottom: 40px;
            }
            .detail-section h3 { 
              color: #667eea; 
              font-size: 18px; 
              margin-bottom: 15px; 
              border-bottom: 2px solid #667eea; 
              padding-bottom: 5px;
            }
            .detail-item { 
              display: flex; 
              justify-content: space-between; 
              margin: 8px 0; 
              padding: 5px 0;
            }
            .detail-label { 
              font-weight: 600; 
              color: #555;
            }
            .detail-value { 
              color: #333;
            }
            .services-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 30px 0; 
              border-radius: 10px; 
              overflow: hidden; 
              box-shadow: 0 0 15px rgba(0,0,0,0.1);
            }
            .services-table th { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 15px; 
              text-align: left; 
              font-weight: 600;
            }
            .services-table td { 
              padding: 12px 15px; 
              border-bottom: 1px solid #eee;
            }
            .services-table tr:nth-child(even) { 
              background: #f8f9fa;
            }
            .services-table tr:hover { 
              background: #e3f2fd;
            }
            .total-section { 
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
              color: white; 
              padding: 25px; 
              border-radius: 10px; 
              margin: 30px 0;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 5px 0; 
              font-size: 18px;
            }
            .grand-total { 
              font-size: 24px; 
              font-weight: 700; 
              border-top: 2px solid rgba(255,255,255,0.3); 
              padding-top: 15px; 
              margin-top: 15px;
            }
            .footer { 
              background: #f8f9fa; 
              padding: 30px; 
              text-align: center; 
              border-top: 3px solid #667eea;
            }
            .footer p { 
              margin: 5px 0; 
              color: #666;
            }
            .badge { 
              background: #28a745; 
              color: white; 
              padding: 4px 12px; 
              border-radius: 15px; 
              font-size: 12px; 
              font-weight: 600;
            }
            @media print {
              body { background: white; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="agency-info">
                <div class="agency-details">
                  ${agency.logo_path ? `<img src="${agency.logo_path}" alt="Logo" class="logo">` : ''}
                  <h1>${agency.agency_name || 'Agence de Location'}</h1>
                  <p><strong>📍</strong> ${agency.address || 'Adresse non spécifiée'}</p>
                  <p><strong>📞</strong> ${agency.phone || 'N/A'} | <strong>✉️</strong> ${agency.email || 'N/A'}</p>
                  <p><strong>RC:</strong> ${agency.rc || 'N/A'} | <strong>ICE:</strong> ${agency.ice || 'N/A'}</p>
                </div>
                <div class="invoice-title">
                  FACTURE
                </div>
              </div>
            </div>

            <div class="content">
              <div class="invoice-details">
                <div class="detail-section">
                  <h3>Informations Client</h3>
                  <div class="detail-item">
                    <span class="detail-label">Nom:</span>
                    <span class="detail-value">${reservation.clients?.nom || 'N/A'} ${reservation.clients?.prenom || ''}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Téléphone:</span>
                    <span class="detail-value">${reservation.clients?.telephone || 'N/A'}</span>
                  </div>
                </div>

                <div class="detail-section">
                  <h3>Détails de la Réservation</h3>
                  <div class="detail-item">
                    <span class="detail-label">Numéro:</span>
                    <span class="detail-value">#${reservation.id.substring(0, 8).toUpperCase()}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Date de début:</span>
                    <span class="detail-value">${startDate.toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Date de fin:</span>
                    <span class="detail-value">${endDate.toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Durée:</span>
                    <span class="detail-value">${days} jour(s)</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Statut:</span>
                    <span class="detail-value"><span class="badge">${reservation.statut}</span></span>
                  </div>
                  ${reservation.lieu_delivrance ? `
                    <div class="detail-item">
                      <span class="detail-label">Lieu de délivrance:</span>
                      <span class="detail-value">${reservation.lieu_delivrance}</span>
                    </div>
                  ` : ''}
                  <div class="detail-item">
                    <span class="detail-label">Avec chauffeur:</span>
                    <span class="detail-value">${reservation.with_driver ? 'Oui' : 'Non'}</span>
                  </div>
                </div>
              </div>

              <table class="services-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Prix/Jour</th>
                    <th>Durée</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>${reservation.vehicles?.marque || 'N/A'} ${reservation.vehicles?.modele || ''}</strong><br>
                        <small>${reservation.vehicles?.immatriculation || 'N/A'}</small></td>
                    <td>${reservation.prix_par_jour.toFixed(2)} MAD</td>
                    <td>${days} jour(s)</td>
                    <td><strong>${subtotal.toFixed(2)} MAD</strong></td>
                  </tr>
                  ${reservation.additional_charges && reservation.additional_charges > 0 ? `
                    <tr>
                      <td><strong>Charges additionnelles</strong></td>
                      <td>-</td>
                      <td>-</td>
                      <td><strong>${reservation.additional_charges.toFixed(2)} MAD</strong></td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>

              <div class="total-section">
                <div class="total-row">
                  <span>Sous-total:</span>
                  <span>${subtotal.toFixed(2)} MAD</span>
                </div>
                ${reservation.additional_charges && reservation.additional_charges > 0 ? `
                  <div class="total-row">
                    <span>Charges additionnelles:</span>
                    <span>${reservation.additional_charges.toFixed(2)} MAD</span>
                  </div>
                ` : ''}
                <div class="total-row grand-total">
                  <span>TOTAL:</span>
                  <span>${total.toFixed(2)} MAD</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p><strong>Merci pour votre confiance !</strong></p>
              <p>Cette facture a été générée automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
              <p>Pour toute question, contactez-nous au ${agency.phone || 'N/A'} ou ${agency.email || 'N/A'}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Open PDF in new window
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(invoiceHTML);
        newWindow.document.close();
        newWindow.focus();
        
        // Auto print
        setTimeout(() => {
          newWindow.print();
        }, 1000);
      }

      toast({
        title: "Succès",
        description: "Facture générée avec succès",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération de la facture",
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(null);
    }
  };

  // Filter reservations based on search term
  const filteredReservations = reservations.filter(reservation => {
    const clientName = `${reservation.clients?.nom || ''} ${reservation.clients?.prenom || ''}`;
    const vehicleName = `${reservation.vehicles?.marque || ''} ${reservation.vehicles?.modele || ''}`;
    const searchText = `${clientName} ${vehicleName} ${reservation.vehicles?.immatriculation || ''}`.toLowerCase();
    return searchText.includes(searchTerm.toLowerCase());
  });

  // Pagination
  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedData: paginatedReservations,
    goToPage,
    nextPage,
    prevPage,
    hasNext,
    hasPrev,
  } = usePagination({ data: filteredReservations, itemsPerPage: 10 });

  const getStatusColor = (status: string) => {
    switch (status) {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            Réservations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestion des réservations de véhicules</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouvelle Réservation</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{editingReservation ? 'Modifier' : 'Créer'} une réservation</DialogTitle>
              <DialogDescription>
                Remplissez les détails de la réservation
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[70vh] pr-2">
              <form onSubmit={handleCreateReservation} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_id">Client *</Label>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.nom} {client.prenom} - {client.telephone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="vehicule_id">Véhicule *</Label>
                    <Select 
                      value={formData.vehicule_id} 
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, vehicule_id: value }));
                        setSelectedVehicle(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un véhicule" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVehicles.length > 0 ? (
                          availableVehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.marque} {vehicle.modele} - {vehicle.immatriculation}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            {selectedDate ? 'Aucun véhicule disponible pour cette date' : 'Sélectionnez d\'abord une date'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Date de début *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Choisir une date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate || undefined}
                          onSelect={(date) => {
                            setSelectedDate(date || null);
                            if (date) {
                              setFormData(prev => ({ ...prev, date_debut: date.toISOString().split('T')[0] }));
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                    <Label htmlFor="prix_par_jour">Prix par jour (MAD) *</Label>
                    <Input
                      id="prix_par_jour"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.prix_par_jour}
                      onChange={(e) => setFormData(prev => ({ ...prev, prix_par_jour: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="statut">Statut *</Label>
                    <Select value={formData.statut} onValueChange={(value) => setFormData(prev => ({ ...prev, statut: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmee">Confirmée</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="terminee">Terminée</SelectItem>
                        <SelectItem value="annulee">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="lieu_delivrance">Lieu de délivrance</Label>
                    <Input
                      id="lieu_delivrance"
                      value={formData.lieu_delivrance}
                      onChange={(e) => setFormData(prev => ({ ...prev, lieu_delivrance: e.target.value }))}
                      placeholder="Lieu de délivrance du véhicule"
                    />
                  </div>

                  <div>
                    <Label htmlFor="additional_charges">Charges additionnelles (MAD)</Label>
                    <Input
                      id="additional_charges"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.additional_charges}
                      onChange={(e) => setFormData(prev => ({ ...prev, additional_charges: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="with_driver"
                      checked={formData.with_driver}
                      onChange={(e) => setFormData(prev => ({ ...prev, with_driver: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="with_driver">Avec chauffeur</Label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto">
                    {editingReservation ? 'Modifier' : 'Créer'} la réservation
                  </Button>
                </div>
              </form>
            </div>
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Historique des réservations ({totalItems})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReservations.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                Aucune réservation trouvée
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm ? 'Aucune réservation ne correspond à votre recherche.' : 'Commencez par ajouter votre première réservation.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle réservation
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Véhicule</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Prix/Jour</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReservations.map((reservation) => {
                      const startDate = new Date(reservation.date_debut);
                      const endDate = new Date(reservation.date_fin);
                      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const total = (reservation.prix_par_jour * days) + (reservation.additional_charges || 0);

                      return (
                        <TableRow key={reservation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="font-medium">
                                  {reservation.clients?.nom} {reservation.clients?.prenom}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {reservation.clients?.telephone}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Car className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="font-medium">
                                  {reservation.vehicles?.marque} {reservation.vehicles?.modele}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {reservation.vehicles?.immatriculation}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{startDate.toLocaleDateString('fr-FR')}</div>
                              <div className="text-gray-500">au {endDate.toLocaleDateString('fr-FR')}</div>
                              <div className="text-xs text-gray-400">{days} jour(s)</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{reservation.prix_par_jour.toFixed(2)} MAD</div>
                            {reservation.additional_charges && reservation.additional_charges > 0 && (
                              <div className="text-xs text-gray-500">
                                +{reservation.additional_charges.toFixed(2)} MAD charges
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{total.toFixed(2)} MAD</div>
                            {reservation.with_driver && (
                              <Badge variant="secondary" className="text-xs">Avec chauffeur</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(reservation.statut)}>
                              {reservation.statut}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(reservation)}
                                className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateInvoicePDF(reservation)}
                                disabled={generatingPDF === reservation.id}
                                className="hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                              >
                                {generatingPDF === reservation.id ? (
                                  <div className="animate-spin w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full" />
                                ) : (
                                  <FileText className="w-4 h-4" />
                                )}
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
