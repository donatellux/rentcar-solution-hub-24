
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Calendar, FileText, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';

interface B2BReservation {
  id: string;
  agency_id: string | null;
  client_name: string | null;
  client_company: string | null;
  client_phone: string | null;
  client_email: string | null;
  date_debut: string | null;
  date_fin: string | null;
  nombre_vehicules: number | null;
  prix_total: number | null;
  statut: string | null;
  notes: string | null;
  created_at: string | null;
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

export const B2BReservations: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<B2BReservation[]>([]);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<B2BReservation | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    client_name: '',
    client_company: '',
    client_phone: '',
    client_email: '',
    date_debut: '',
    date_fin: '',
    nombre_vehicules: '',
    prix_total: '',
    statut: 'en_attente',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch B2B reservations using raw query to avoid TypeScript issues
      const { data: reservationsData, error: reservationsError } = await supabase
        .rpc('get_b2b_reservations', { agency_uuid: user.id });

      // If RPC doesn't exist, fall back to direct query with type casting
      let b2bData = reservationsData;
      if (reservationsError) {
        const { data: fallbackData, error: fallbackError } = await (supabase as any)
          .from('b2b_reservations')
          .select('*')
          .eq('agency_id', user.id)
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          console.error('Error fetching B2B reservations:', fallbackError);
          b2bData = [];
        } else {
          b2bData = fallbackData;
        }
      }

      // Fetch agency data
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .select('agency_name, address, phone, email, logo_path, rc, ice')
        .eq('id', user.id)
        .single();

      if (agencyError && agencyError.code !== 'PGRST116') throw agencyError;

      setReservations(b2bData || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!formData.client_name || !formData.client_phone || !formData.nombre_vehicules) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner le nom, téléphone du client et le nombre de véhicules",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      const reservationData = {
        agency_id: user.id,
        client_name: formData.client_name,
        client_company: formData.client_company,
        client_phone: formData.client_phone,
        client_email: formData.client_email,
        date_debut: formData.date_debut || null,
        date_fin: formData.date_fin || null,
        nombre_vehicules: formData.nombre_vehicules ? parseInt(formData.nombre_vehicules) : null,
        prix_total: formData.prix_total ? parseFloat(formData.prix_total) : null,
        statut: formData.statut,
        notes: formData.notes,
      };

      let error;
      if (editingReservation) {
        const { error: updateError } = await (supabase as any)
          .from('b2b_reservations')
          .update(reservationData)
          .eq('id', editingReservation.id);
        error = updateError;
      } else {
        const { error: insertError } = await (supabase as any)
          .from('b2b_reservations')
          .insert(reservationData);
        error = insertError;
      }

      if (error) {
        console.error('Database error:', error);
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

  const handleDelete = async (reservationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) return;

    try {
      const { error } = await (supabase as any)
        .from('b2b_reservations')
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

  const handleEdit = (reservation: B2BReservation) => {
    setEditingReservation(reservation);
    setFormData({
      client_name: reservation.client_name || '',
      client_company: reservation.client_company || '',
      client_phone: reservation.client_phone || '',
      client_email: reservation.client_email || '',
      date_debut: reservation.date_debut ? reservation.date_debut.split('T')[0] : '',
      date_fin: reservation.date_fin ? reservation.date_fin.split('T')[0] : '',
      nombre_vehicules: reservation.nombre_vehicules?.toString() || '',
      prix_total: reservation.prix_total?.toString() || '',
      statut: reservation.statut || 'en_attente',
      notes: reservation.notes || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_company: '',
      client_phone: '',
      client_email: '',
      date_debut: '',
      date_fin: '',
      nombre_vehicules: '',
      prix_total: '',
      statut: 'en_attente',
      notes: '',
    });
    setEditingReservation(null);
  };

  const generateInvoicePDF = async (reservation: B2BReservation) => {
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

      const invoiceData = {
        reservation,
        agency,
        generatedAt: new Date().toISOString()
      };

      // Create a modern, stylish HTML invoice
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Devis B2B - ${reservation.client_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
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
              overflow: hidden;
            }
            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -50%;
              width: 200%;
              height: 200%;
              background: rgba(255,255,255,0.1);
              transform: rotate(45deg);
            }
            .logo { 
              max-width: 120px; 
              height: auto; 
              margin-bottom: 15px;
              position: relative;
              z-index: 2;
            }
            .company-info {
              position: relative;
              z-index: 2;
            }
            .company-name { 
              font-size: 28px; 
              font-weight: bold; 
              margin-bottom: 10px;
            }
            .invoice-title {
              text-align: center;
              padding: 30px;
              background: #f8f9fa;
              border-bottom: 3px solid #667eea;
            }
            .invoice-title h1 {
              font-size: 32px;
              color: #667eea;
              margin-bottom: 10px;
            }
            .invoice-number {
              font-size: 18px;
              color: #666;
            }
            .content {
              padding: 30px;
            }
            .info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-box {
              flex: 1;
              margin-right: 20px;
            }
            .info-box:last-child {
              margin-right: 0;
            }
            .info-box h3 {
              color: #667eea;
              margin-bottom: 15px;
              font-size: 18px;
              border-bottom: 2px solid #667eea;
              padding-bottom: 5px;
            }
            .info-box p {
              margin-bottom: 8px;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
              background: white;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              border-radius: 8px;
              overflow: hidden;
            }
            .details-table th {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px;
              text-align: left;
              font-weight: bold;
            }
            .details-table td {
              padding: 15px;
              border-bottom: 1px solid #eee;
            }
            .details-table tr:hover {
              background: #f8f9fa;
            }
            .total-section {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 25px;
              text-align: center;
              margin: 30px 0;
              border-radius: 8px;
            }
            .total-amount {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              border-top: 1px solid #eee;
              color: #666;
            }
            .status-badge {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 12px;
            }
            .status-en_attente { background: #fff3cd; color: #856404; }
            .status-confirmee { background: #d4edda; color: #155724; }
            .status-en_cours { background: #cce7ff; color: #004085; }
            .status-annulee { background: #f8d7da; color: #721c24; }
            @media print {
              body { background: white; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${agency.logo_path ? `<img src="${agency.logo_path}" alt="Logo" class="logo">` : ''}
              <div class="company-info">
                <div class="company-name">${agency.agency_name || 'Agence de Location'}</div>
                <p>${agency.address || ''}</p>
                <p>Tél: ${agency.phone || ''} | Email: ${agency.email || ''}</p>
                <p>RC: ${agency.rc || ''} | ICE: ${agency.ice || ''}</p>
              </div>
            </div>

            <div class="invoice-title">
              <h1>DEVIS B2B</h1>
              <div class="invoice-number">N° ${reservation.id.substring(0, 8).toUpperCase()}</div>
              <div>Date: ${new Date(invoiceData.generatedAt).toLocaleDateString('fr-FR')}</div>
            </div>

            <div class="content">
              <div class="info-section">
                <div class="info-box">
                  <h3>Informations Client</h3>
                  <p><strong>Nom:</strong> ${reservation.client_name}</p>
                  <p><strong>Entreprise:</strong> ${reservation.client_company || 'N/A'}</p>
                  <p><strong>Téléphone:</strong> ${reservation.client_phone}</p>
                  <p><strong>Email:</strong> ${reservation.client_email || 'N/A'}</p>
                </div>
                <div class="info-box">
                  <h3>Détails de la Réservation</h3>
                  <p><strong>Statut:</strong> <span class="status-badge status-${reservation.statut}">${reservation.statut}</span></p>
                  <p><strong>Date début:</strong> ${reservation.date_debut ? new Date(reservation.date_debut).toLocaleDateString('fr-FR') : 'N/A'}</p>
                  <p><strong>Date fin:</strong> ${reservation.date_fin ? new Date(reservation.date_fin).toLocaleDateString('fr-FR') : 'N/A'}</p>
                  <p><strong>Durée:</strong> ${reservation.date_debut && reservation.date_fin ? Math.ceil((new Date(reservation.date_fin).getTime() - new Date(reservation.date_debut).getTime()) / (1000 * 3600 * 24)) + ' jours' : 'N/A'}</p>
                </div>
              </div>

              <table class="details-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Quantité</th>
                    <th>Prix Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Location de véhicules B2B</td>
                    <td>${reservation.nombre_vehicules || 0} véhicule(s)</td>
                    <td>${reservation.prix_total || 0} MAD</td>
                  </tr>
                </tbody>
              </table>

              ${reservation.notes ? `
                <div class="info-box">
                  <h3>Notes</h3>
                  <p>${reservation.notes}</p>
                </div>
              ` : ''}

              <div class="total-section">
                <div class="total-amount">${reservation.prix_total || 0} MAD</div>
                <div>Montant Total TTC</div>
              </div>
            </div>

            <div class="footer">
              <p>Ce devis est valable 30 jours à compter de la date d'émission.</p>
              <p>Merci de votre confiance !</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create and download the invoice
      const blob = new Blob([invoiceHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Devis_B2B_${reservation.client_name?.replace(/\s/g, '_')}_${reservation.id.substring(0, 8)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Succès",
        description: "Devis généré et téléchargé avec succès",
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le devis",
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(null);
    }
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

  // Filter reservations first
  const filteredReservations = reservations.filter(reservation =>
    `${reservation.client_name} ${reservation.client_company}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add pagination hook
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

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Réservations B2B
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez vos réservations B2B</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouvelle réservation B2B</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingReservation ? 'Modifier la réservation B2B' : 'Nouvelle réservation B2B'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_name">Nom du client *</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="mt-1"
                    placeholder="Nom complet"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="client_company">Entreprise</Label>
                  <Input
                    id="client_company"
                    value={formData.client_company}
                    onChange={(e) => setFormData({ ...formData, client_company: e.target.value })}
                    className="mt-1"
                    placeholder="Nom de l'entreprise"
                  />
                </div>
                <div>
                  <Label htmlFor="client_phone">Téléphone *</Label>
                  <Input
                    id="client_phone"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    className="mt-1"
                    placeholder="Numéro de téléphone"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="client_email">Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    className="mt-1"
                    placeholder="Email"
                  />
                </div>
                <div>
                  <Label htmlFor="date_debut">Date de début *</Label>
                  <Input
                    id="date_debut"
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date_fin">Date de fin *</Label>
                  <Input
                    id="date_fin"
                    type="date"
                    value={formData.date_fin}
                    onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nombre_vehicules">Nombre de véhicules *</Label>
                  <Input
                    id="nombre_vehicules"
                    type="number"
                    min="1"
                    value={formData.nombre_vehicules}
                    onChange={(e) => setFormData({ ...formData, nombre_vehicules: e.target.value })}
                    className="mt-1"
                    placeholder="Entrez le nombre"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prix_total">Prix total (MAD)</Label>
                  <Input
                    id="prix_total"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.prix_total}
                    onChange={(e) => setFormData({ ...formData, prix_total: e.target.value })}
                    className="mt-1"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="statut">Statut *</Label>
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
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Notes additionnelles..."
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploading || !formData.client_name || !formData.client_phone || !formData.nombre_vehicules} 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Sauvegarde...
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
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Liste des réservations B2B ({totalItems})</span>
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
                  <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
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
                        <TableHead>Client</TableHead>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Véhicules</TableHead>
                        <TableHead>Prix Total</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReservations.map((reservation) => (
                        <TableRow key={reservation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <TableCell>
                            <div className="font-medium">{reservation.client_name}</div>
                            <div className="text-sm text-gray-500">{reservation.client_phone}</div>
                          </TableCell>
                          <TableCell>{reservation.client_company || 'N/A'}</TableCell>
                          <TableCell>
                            {reservation.date_debut && reservation.date_fin ? (
                              <>
                                <div>{new Date(reservation.date_debut).toLocaleDateString('fr-FR')}</div>
                                <div className="text-gray-500">au {new Date(reservation.date_fin).toLocaleDateString('fr-FR')}</div>
                              </>
                            ) : (
                              'Dates non définies'
                            )}
                          </TableCell>
                          <TableCell>{reservation.nombre_vehicules || 0}</TableCell>
                          <TableCell>{reservation.prix_total ? `${reservation.prix_total} MAD` : 'N/A'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(reservation.statut)}>
                              {reservation.statut || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateInvoicePDF(reservation)}
                                disabled={generatingPDF === reservation.id}
                                className="hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                              >
                                {generatingPDF === reservation.id ? (
                                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-1" />
                                ) : (
                                  <FileText className="w-4 h-4 mr-1" />
                                )}
                                <span className="hidden sm:inline">Devis</span>
                              </Button>
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
                                onClick={() => handleDelete(reservation.id)}
                                className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
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
      )}
    </div>
  );
};
