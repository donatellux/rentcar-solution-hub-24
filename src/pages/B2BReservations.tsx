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
import { Plus, Calendar, Car, Building2, Edit, Trash2, Search } from 'lucide-react';
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
    number_of_cars: 1 as number,
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

      // Get regular reservations that overlap with the selected date range
      const { data: overlappingReservations } = await supabase
        .from('reservations')
        .select('vehicule_id')
        .eq('agency_id', user?.id)
        .in('statut', ['confirmee', 'en_cours'])
        .or(
          `and(date_debut.lte.${dateRange.debut.toISOString()},date_fin.gte.${dateRange.debut.toISOString()}),` +
          `and(date_debut.lte.${dateRange.fin.toISOString()},date_fin.gte.${dateRange.fin.toISOString()}),` +
          `and(date_debut.gte.${dateRange.debut.toISOString()},date_fin.lte.${dateRange.fin.toISOString()})`
        );

      // Get B2B reservations that overlap with the selected date range
      const { data: overlappingB2BReservations } = await supabase
        .from('b2b_reservations' as any)
        .select('vehicles')
        .eq('agency_id', user?.id)
        .in('status', ['confirmed', 'en_cours'])
        .or(
          `and(start_date.lte.${dateRange.debut.toISOString().split('T')[0]},end_date.gte.${dateRange.debut.toISOString().split('T')[0]}),` +
          `and(start_date.lte.${dateRange.fin.toISOString().split('T')[0]},end_date.gte.${dateRange.fin.toISOString().split('T')[0]}),` +
          `and(start_date.gte.${dateRange.debut.toISOString().split('T')[0]},end_date.lte.${dateRange.fin.toISOString().split('T')[0]})`
        );

      // Extract vehicle IDs from regular reservations
      const reservedVehicleIds = overlappingReservations?.map(r => r.vehicule_id) || [];
      
      // Extract vehicle IDs from B2B reservations
      const b2bReservedVehicleIds: string[] = [];
      if (overlappingB2BReservations) {
        for (const b2bRes of overlappingB2BReservations) {
          if (Array.isArray((b2bRes as any).vehicles)) {
            for (const vehicle of (b2bRes as any).vehicles) {
              b2bReservedVehicleIds.push(vehicle.vehicle_id);
            }
          }
        }
      }

      // Combine all reserved vehicle IDs
      const allReservedVehicleIds = [...reservedVehicleIds, ...b2bReservedVehicleIds];
      const available = allVehicles.filter(v => !allReservedVehicleIds.includes(v.id));
      
      setAvailableVehicles(available);
    } catch (error) {
      console.error('Error fetching available vehicles:', error);
      setAvailableVehicles([]);
    }
  };

  const calculateTotal = () => {
    return formData.vehicle_prices.reduce((total, vp) => total + vp.price, 0);
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
      const totalRevenue = calculateTotal();
      const days = calculateDays();
      
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

      const b2bReservationData = {
        society_id: societyId,
        agency_id: user?.id,
        start_date: formData.date_debut,
        end_date: formData.date_fin,
        vehicles: vehiclesData,
        with_driver: formData.with_driver,
        additional_charges: formData.additional_charges || 0,
        total_amount: totalRevenue,
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
                             const value = parseInt(e.target.value) || 1;
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
                              {reservation.total_amount ? `${reservation.total_amount} MAD` : 'N/A'}
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