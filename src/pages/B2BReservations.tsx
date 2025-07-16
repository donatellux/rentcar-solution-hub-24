import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar, Car, Building2, Edit, Trash2, Search, FileText, Download, DollarSign } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';

interface B2BReservation {
  id: string;
  vehicule_id: string;
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
  societies?: {
    society_name: string;
    contact_person: string;
    contact_phone: string;
  };
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

interface VehiclePrice {
  vehicleId: string;
  price: number;
}

export const B2BReservations: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [reservations, setReservations] = useState<B2BReservation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingReservation, setEditingReservation] = useState<any>(null);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [agency, setAgency] = useState<any>(null);
  
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
    number_of_cars: 0 as number,
    additional_charges: 0,
    selected_vehicles: [] as string[],
    vehicle_prices: [] as VehiclePrice[],
    with_driver: false,
    status: 'confirmed' as string,
  });

  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [dateRange, setDateRange] = useState<{debut: Date | null, fin: Date | null}>({
    debut: null,
    fin: null
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Fetch B2B reservations from b2b_reservations table
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch from b2b_reservations table
      const { data: b2bReservations, error: b2bError } = await supabase
        .from('b2b_reservations' as any)
        .select(`
          *,
          societies!inner (society_name, contact_person, contact_phone)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (b2bError) throw b2bError;

      // Type-safe assignment
      if (Array.isArray(b2bReservations)) {
        setReservations(b2bReservations as any);
      } else {
        setReservations([]);
      }
      
      // Fetch vehicles
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
    if (!dateRange.debut || !dateRange.fin) {
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

      // Format dates for proper comparison
      const newStartDate = dateRange.debut.toISOString().split('T')[0];
      const newEndDate = dateRange.fin.toISOString().split('T')[0];

      console.log('B2B: Checking availability for period:', newStartDate, 'to', newEndDate);

      // Get regular reservations
      const { data: allRegularReservations } = await supabase
        .from('reservations')
        .select('vehicule_id, date_debut, date_fin')
        .eq('agency_id', user?.id)
        .in('statut', ['confirmee', 'en_cours']);

      // Filter regular reservations that actually conflict
      const regularConflicts = (allRegularReservations || []).filter(res => {
        const existingStart = res.date_debut;
        const existingEnd = res.date_fin;
        // Standard overlap check
        const hasConflict = existingStart < newEndDate && existingEnd > newStartDate;
        
        // Allow same day transitions: if existing ends exactly when new starts
        if (existingEnd === newStartDate) {
          return false; // No conflict for same-day transitions
        }
        
        return hasConflict;
      });

      // Get B2B reservations
      const { data: allB2BReservations } = await supabase
        .from('b2b_reservations' as any)
        .select('vehicles, start_date, end_date')
        .eq('agency_id', user?.id)
        .in('status', ['confirmed', 'en_cours']);

      // Filter B2B reservations that actually conflict
      const b2bConflicts: string[] = [];
      if (allB2BReservations) {
        for (const b2bRes of allB2BReservations) {
          const existingStart = (b2bRes as any).start_date;
          const existingEnd = (b2bRes as any).end_date;
          
          // Check if this B2B reservation conflicts with our new period
          const hasB2BConflict = existingStart < newEndDate && existingEnd > newStartDate;
          
          // Allow same day transitions for B2B as well
          if (hasB2BConflict && existingEnd !== newStartDate) {
            // Extract vehicle IDs from this conflicting B2B reservation
            if (Array.isArray((b2bRes as any).vehicles)) {
              for (const vehicle of (b2bRes as any).vehicles) {
                b2bConflicts.push(vehicle.vehicle_id);
              }
            }
          }
        }
      }

      // Combine all unavailable vehicle IDs
      const regularUnavailable = regularConflicts.map(r => r.vehicule_id);
      const allUnavailableIds = [...regularUnavailable, ...b2bConflicts];
      
      console.log('B2B: All unavailable vehicle IDs:', allUnavailableIds);

      // Filter available vehicles
      const available = allVehicles.filter(v => !allUnavailableIds.includes(v.id));
      console.log('B2B: Available vehicles:', available.map(v => `${v.marque} ${v.modele}`));
      
      setAvailableVehicles(available);
    } catch (error) {
      console.error('Error fetching available vehicles:', error);
      setAvailableVehicles([]);
    }
  };

  const calculateTotal = () => {
    const days = calculateDays();
    return formData.vehicle_prices.reduce((total, vp) => total + (vp.price * days), 0) + (formData.additional_charges || 0);
  };

  const calculateDays = () => {
    if (!dateRange.debut || !dateRange.fin) return 0;
    const diffTime = Math.abs(dateRange.fin.getTime() - dateRange.debut.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

  const handleVehicleSelection = (vehicleId: string, checked: boolean) => {
    if (checked) {
      if (formData.selected_vehicles.length < formData.number_of_cars) {
        setFormData(prev => ({
          ...prev,
          selected_vehicles: [...prev.selected_vehicles, vehicleId],
          vehicle_prices: [...prev.vehicle_prices, { vehicleId, price: 0 }]
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        selected_vehicles: prev.selected_vehicles.filter(id => id !== vehicleId),
        vehicle_prices: prev.vehicle_prices.filter(vp => vp.vehicleId !== vehicleId)
      }));
    }
  };

  const handlePriceChange = (vehicleId: string, price: number) => {
    setFormData(prev => ({
      ...prev,
      vehicle_prices: prev.vehicle_prices.map(vp => 
        vp.vehicleId === vehicleId ? { ...vp, price } : vp
      )
    }));
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.selected_vehicles.length !== formData.number_of_cars) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner exactement le nombre de véhicules choisi",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const days = calculateDays();
      const totalRevenue = calculateTotal();
      
      // Create society entry
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

      // Try to create society entry, fallback if table doesn't exist
      let societyId = null;
      try {
        const { data: societyResult, error: societyError } = await supabase
          .from('societies' as any)
          .insert([societyData])
          .select()
          .single();

        if (!societyError && societyResult) {
          societyId = (societyResult as any).id;
        }
      } catch (error) {
        console.log('Societies table not available, using fallback approach');
      }

      // Create B2B reservation entry
      const vehiclesData = formData.vehicle_prices.map(vehiclePrice => {
        const vehicle = availableVehicles.find(v => v.id === vehiclePrice.vehicleId);
        return {
          vehicle_id: vehiclePrice.vehicleId,
          vehicle_name: `${vehicle?.marque} ${vehicle?.modele}`,
          price_per_day: vehiclePrice.price,
          total_amount: vehiclePrice.price * days,
        };
      });

      const totalVehicleAmount = formData.vehicle_prices.reduce((total, vp) => total + (vp.price * days), 0);
      
      const b2bReservationData = {
        society_id: societyId,
        agency_id: user?.id,
        start_date: formData.date_debut,
        end_date: formData.date_fin,
        vehicles: vehiclesData,
        with_driver: formData.with_driver,
        additional_charges: formData.additional_charges || 0,
        total_amount: totalVehicleAmount + (formData.additional_charges || 0),
        status: formData.status || 'confirmed',
        notes: '',
      };

      const { error: b2bReservationError } = await supabase
        .from('b2b_reservations' as any)
        .insert([b2bReservationData]);

      if (b2bReservationError) {
        console.error('Error creating B2B reservation:', b2bReservationError);
        throw b2bReservationError;
      }

      // Add total revenue to global revenues
      const { error: globalRevenueError } = await supabase.from('global_revenues' as any).insert([{
        agency_id: user?.id,
        source: 'B2B Reservations',
        amount: totalRevenue,
        description: `Réservation B2B - ${formData.society_name}`,
        date: new Date().toISOString().split('T')[0],
        vehicle_ids: formData.vehicle_prices.map(vp => vp.vehicleId)
      }]);

      if (globalRevenueError) {
        console.error('Error adding global revenue:', globalRevenueError);
      }

      // Add each vehicle's revenue to vehicle revenues for statistics
      const vehicleRevenuePromises = formData.vehicle_prices.map(async (vehiclePrice) => {
        const totalPriceForVehicle = vehiclePrice.price * days;
        const vehicle = availableVehicles.find(v => v.id === vehiclePrice.vehicleId);
        
        const { error: vehicleRevenueError } = await supabase.from('vehicle_revenues' as any).insert([{
          agency_id: user?.id,
          vehicle_id: vehiclePrice.vehicleId,
          source: 'B2B Reservation',
          amount: totalPriceForVehicle,
          description: `B2B - ${formData.society_name} - ${vehicle?.marque} ${vehicle?.modele}`,
          date: formData.date_debut,
          start_date: formData.date_debut,
          end_date: formData.date_fin
        }]);

        if (vehicleRevenueError) {
          console.error('Error adding vehicle revenue:', vehicleRevenueError);
        }
      });

      await Promise.all(vehicleRevenuePromises);

      await fetchData();
      resetForm();
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

  const resetForm = () => {
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
      number_of_cars: 1,
      additional_charges: 0,
      selected_vehicles: [],
      vehicle_prices: [],
      with_driver: false,
      status: 'confirmed',
    });
    setDateRange({ debut: null, fin: null });
    setAvailableVehicles([]);
    setEditingReservation(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réservation B2B ?')) return;

    try {
      const { error } = await supabase
        .from('b2b_reservations' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Réservation B2B supprimée avec succès",
      });

      await fetchData();
    } catch (error) {
      console.error('Error deleting B2B reservation:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (reservation: any) => {
    setEditingReservation(reservation);
    
    // Populate form with existing data
    setFormData({
      society_name: reservation.societies?.society_name || '',
      rib: '',
      iban: '',
      ice: '',
      rc: '',
      address: '',
      contact_person: reservation.societies?.contact_person || '',
      contact_phone: reservation.societies?.contact_phone || '',
      contact_email: '',
      date_debut: reservation.start_date,
      date_fin: reservation.end_date,
      number_of_cars: reservation.vehicles?.length || 1,
      additional_charges: reservation.additional_charges || 0,
      selected_vehicles: reservation.vehicles?.map((v: any) => v.vehicle_id) || [],
      vehicle_prices: reservation.vehicles?.map((v: any) => ({
        vehicleId: v.vehicle_id,
        price: v.price_per_day || 0
      })) || [],
      with_driver: reservation.with_driver || false,
      status: reservation.status || 'confirmed',
    });

    // Set date range
    setDateRange({
      debut: reservation.start_date ? new Date(reservation.start_date) : null,
      fin: reservation.end_date ? new Date(reservation.end_date) : null
    });

    setDialogOpen(true);
  };

  const generateInvoicePDF = async (reservation: any) => {
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

      const vehicleInfo = getVehicleInfo(reservation);
      const companyName = getCompanyName(reservation);
      
      // Calculate duration
      const startDate = new Date(reservation.start_date);
      const endDate = new Date(reservation.end_date);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
            .vehicles-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 30px 0; 
              border-radius: 10px; 
              overflow: hidden; 
              box-shadow: 0 0 15px rgba(0,0,0,0.1);
            }
            .vehicles-table th { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 15px; 
              text-align: left; 
              font-weight: 600;
            }
            .vehicles-table td { 
              padding: 12px 15px; 
              border-bottom: 1px solid #eee;
            }
            .vehicles-table tr:nth-child(even) { 
              background: #f8f9fa;
            }
            .vehicles-table tr:hover { 
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
                  FACTURE B2B
                </div>
              </div>
            </div>

             <div class="content">
                <div class="invoice-details">
                  <div class="detail-section">
                    <h3>Informations de l'Agence</h3>
                    <div class="detail-item">
                      <span class="detail-label">Nom:</span>
                      <span class="detail-value">${agency?.agency_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Adresse:</span>
                      <span class="detail-value">${agency?.address || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Téléphone:</span>
                      <span class="detail-value">${agency?.phone || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Email:</span>
                      <span class="detail-value">${agency?.email || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">RC:</span>
                      <span class="detail-value">${agency?.rc || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">ICE:</span>
                      <span class="detail-value">${agency?.ice || 'N/A'}</span>
                    </div>
                  </div>

                  <div class="detail-section">
                    <h3>Informations de l'Entreprise</h3>
                    <div class="detail-item">
                      <span class="detail-label">Entreprise:</span>
                      <span class="detail-value">${companyName}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Contact:</span>
                      <span class="detail-value">${reservation.societies?.contact_person || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Téléphone:</span>
                      <span class="detail-value">${reservation.societies?.contact_phone || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Statut:</span>
                      <span class="detail-value"><span class="badge">${reservation.status || 'Confirmée'}</span></span>
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
                    <span class="detail-label">Avec chauffeur:</span>
                    <span class="detail-value">${reservation.with_driver ? 'Oui' : 'Non'}</span>
                  </div>
                </div>
              </div>

              <table class="vehicles-table">
                <thead>
                  <tr>
                    <th>Véhicule</th>
                    <th>Prix/Jour</th>
                    <th>Durée</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${vehicleInfo.map(vehicle => `
                    <tr>
                      <td><strong>${vehicle.name}</strong></td>
                      <td>${vehicle.price.toFixed(2)} MAD</td>
                      <td>${days} jour(s)</td>
                      <td><strong>${vehicle.total.toFixed(2)} MAD</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="total-section">
                <div class="total-row">
                  <span>Sous-total véhicules:</span>
                  <span>${vehicleInfo.reduce((sum, vehicle) => sum + vehicle.total, 0).toFixed(2)} MAD</span>
                </div>
                ${reservation.additional_charges > 0 ? `
                  <div class="total-row">
                    <span>Charges additionnelles:</span>
                    <span>${reservation.additional_charges.toFixed(2)} MAD</span>
                  </div>
                ` : ''}
                <div class="total-row grand-total">
                  <span>TOTAL GÉNÉRAL:</span>
                  <span>${(vehicleInfo.reduce((sum, vehicle) => sum + vehicle.total, 0) + (reservation.additional_charges || 0)).toFixed(2)} MAD</span>
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

  // Effect to fetch available vehicles when dates change
  useEffect(() => {
    fetchAvailableVehicles();
  }, [dateRange.debut, dateRange.fin]);

  // Helper function to extract company name from reservation
  const getCompanyName = (reservation: any) => {
    return reservation.societies?.society_name || 'Entreprise';
  };

  // Helper function to get vehicle info from B2B reservation
  const getVehicleInfo = (reservation: any) => {
    if (reservation.vehicles && Array.isArray(reservation.vehicles) && reservation.vehicles.length > 0) {
      return reservation.vehicles.map((v: any) => ({
        name: `${v.vehicle_name}`,
        price: v.price_per_day,
        total: v.total_amount
      }));
    }
    return [{ name: 'N/A', price: 0, total: 0 }];
  };

  // Filter reservations based on search term
  const filteredReservations = reservations.filter(reservation => {
    const companyName = getCompanyName(reservation);
    const vehicleInfo = getVehicleInfo(reservation);
    const searchText = `${companyName} ${vehicleInfo.map(v => v.name).join(' ')}`.toLowerCase();
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
            <Building2 className="h-8 w-8 text-blue-600" />
            Réservations B2B
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestion des réservations pour entreprises</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouvelle Réservation B2B</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Créer une réservation B2B</DialogTitle>
              <DialogDescription>
                Remplissez les détails de la réservation pour entreprise
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[70vh] pr-2">
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
                    <div className="md:col-span-2">
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

                {/* Date Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Période de location</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Date de début *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal mt-1",
                              !dateRange.debut && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {dateRange.debut ? format(dateRange.debut, "PPP", { locale: fr }) : "Choisir une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={dateRange.debut || undefined}
                            onSelect={handleDateSelect('debut')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Date de fin *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal mt-1",
                              !dateRange.fin && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {dateRange.fin ? format(dateRange.fin, "PPP", { locale: fr }) : "Choisir une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={dateRange.fin || undefined}
                            onSelect={handleDateSelect('fin')}
                            disabled={(date) => dateRange.debut && date < dateRange.debut}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  {dateRange.debut && dateRange.fin && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        <strong>{availableVehicles.length}</strong> véhicule(s) disponible(s) pour cette période ({calculateDays()} jour(s))
                      </p>
                    </div>
                  )}
                </div>

                {/* Vehicle Selection */}
                {availableVehicles.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Sélection des véhicules</h3>
                     <div>
                       <Label htmlFor="number_of_cars">Nombre de véhicules *</Label>
                        <Input
                          id="number_of_cars"
                          type="number"
                          min="1"
                          value={formData.number_of_cars || ''}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              setFormData(prev => ({ 
                                ...prev, 
                                number_of_cars: value,
                                selected_vehicles: [],
                                vehicle_prices: []
                              }));
                            }}
                          placeholder="Entrez le nombre de véhicules"
                          required
                        />
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Véhicules disponibles (sélectionnez {formData.number_of_cars})</Label>
                      {availableVehicles.map((vehicle) => (
                        <div key={vehicle.id} className="flex items-center space-x-3 p-3 border rounded">
                          <Checkbox
                            checked={formData.selected_vehicles.includes(vehicle.id)}
                            disabled={!formData.selected_vehicles.includes(vehicle.id) && formData.selected_vehicles.length >= formData.number_of_cars}
                            onCheckedChange={(checked) => handleVehicleSelection(vehicle.id, checked as boolean)}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{vehicle.marque} {vehicle.modele}</p>
                            <p className="text-sm text-gray-500">{vehicle.immatriculation}</p>
                          </div>
                          {formData.selected_vehicles.includes(vehicle.id) && (
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm">{vehicle.marque} prix par jour:</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-24"
                                value={formData.vehicle_prices.find(vp => vp.vehicleId === vehicle.id)?.price || ''}
                                onChange={(e) => handlePriceChange(vehicle.id, parseFloat(e.target.value) || 0)}
                                placeholder="Prix"
                              />
                              <span className="text-sm text-gray-500">MAD</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Statut de la réservation</h3>
                  <div>
                    <Label htmlFor="status">Statut *</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">Confirmé</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="annule">Annulé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pricing and Options */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Tarification et options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="additional_charges">Charges additionnelles (Exemple: prix chauffeur, carburant - non comptées dans les revenus)</Label>
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
                      <Checkbox
                        id="with_driver"
                        checked={formData.with_driver}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, with_driver: checked as boolean }))}
                      />
                      <Label htmlFor="with_driver">Avec chauffeur</Label>
                    </div>
                  </div>
                  
                  {formData.vehicle_prices.length > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                        Total revenus: {(calculateTotal() * calculateDays()).toFixed(2)} MAD
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ({calculateDays()} jour(s) × {calculateTotal()} MAD/jour)
                      </p>
                      {formData.additional_charges > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Charges additionnelles: {formData.additional_charges} MAD (non comptées dans les revenus)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={formData.selected_vehicles.length !== formData.number_of_cars || calculateTotal() === 0}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto"
                  >
                    Créer la réservation
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
            placeholder="Rechercher une réservation B2B..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Historique des réservations B2B ({totalItems})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReservations.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                Aucune réservation B2B trouvée
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm ? 'Aucune réservation ne correspond à votre recherche.' : 'Commencez par ajouter votre première réservation B2B.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle réservation B2B
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Véhicules</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Montant Total</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReservations.map((reservation) => {
                      const vehicleInfo = getVehicleInfo(reservation);
                      return (
                        <TableRow key={reservation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="font-medium">
                                  {getCompanyName(reservation)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {reservation.societies?.contact_person || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {vehicleInfo.map((vehicle, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <Car className="w-4 h-4 text-gray-400" />
                                  <div>
                                    <div className="font-medium text-sm">
                                      {vehicle.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {vehicle.price} MAD/jour
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {reservation.start_date && reservation.end_date ? (
                                <>
                                  <div>{new Date(reservation.start_date).toLocaleDateString('fr-FR')}</div>
                                  <div className="text-gray-500">au {new Date(reservation.end_date).toLocaleDateString('fr-FR')}</div>
                                </>
                              ) : (
                                'Dates non définies'
                              )}
                            </div>
                          </TableCell>
                           <TableCell>
                             <div className="font-medium">
                               {reservation.total_amount ? `${reservation.total_amount.toFixed(2)} MAD` : 'N/A'}
                             </div>
                             <div className="text-xs text-gray-500">
                               {reservation.start_date && reservation.end_date && (
                                 `${Math.ceil((new Date(reservation.end_date).getTime() - new Date(reservation.start_date).getTime()) / (1000 * 60 * 60 * 24))} jour(s)`
                               )}
                             </div>
                           </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(reservation.status || 'confirmed')}>
                              {reservation.status || 'Confirmée'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm space-y-1">
                              {reservation.with_driver && <Badge variant="secondary">Avec chauffeur</Badge>}
                              {reservation.additional_charges && reservation.additional_charges > 0 && (
                                <div className="text-xs text-gray-500">
                                  Charges: {reservation.additional_charges} MAD
                                </div>
                              )}
                            </div>
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