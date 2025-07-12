
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, FileBarChart, Download, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Rapport {
  id: string;
  titre: string | null;
  type: string | null;
  periode: string | null;
  contenu: string | null;
  fichier_pdf: string | null;
  date: string | null;
  created_at: string | null;
}

export const Rapports: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRapport, setEditingRapport] = useState<Rapport | null>(null);
  const [generating, setGenerating] = useState(false);

  const [formData, setFormData] = useState({
    titre: '',
    type: '',
    periode: '',
    contenu: '',
    date: '',
  });

  useEffect(() => {
    if (user) {
      fetchRapports();
    }
  }, [user]);

  const fetchRapports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('rapports')
        .select('*')
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRapports(data || []);
    } catch (error) {
      console.error('Error fetching rapports:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les rapports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRapportContent = async (type: string, periode: string) => {
    try {
      const currentDate = new Date();
      let startDate, endDate;

      // Calculate date range based on period
      switch (periode) {
        case 'mensuel':
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          break;
        case 'trimestriel':
          const quarter = Math.floor(currentDate.getMonth() / 3);
          startDate = new Date(currentDate.getFullYear(), quarter * 3, 1);
          endDate = new Date(currentDate.getFullYear(), (quarter + 1) * 3, 0);
          break;
        case 'annuel':
          startDate = new Date(currentDate.getFullYear(), 0, 1);
          endDate = new Date(currentDate.getFullYear(), 11, 31);
          break;
        default:
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          endDate = currentDate;
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      let content = `Rapport ${type} - Période: ${periode}\n`;
      content += `Du ${startDate.toLocaleDateString()} au ${endDate.toLocaleDateString()}\n\n`;

      if (type === 'financier') {
        // Fetch financial data
        const [vehicleExpenses, globalExpenses, reservations] = await Promise.all([
          supabase.from('vehicle_expenses').select('amount').eq('agency_id', user.id).gte('date', startDateStr).lte('date', endDateStr),
          supabase.from('global_expenses').select('amount').eq('agency_id', user.id).gte('date', startDateStr).lte('date', endDateStr),
          supabase.from('reservations').select('prix_par_jour, date_debut, date_fin').eq('agency_id', user.id).gte('date_debut', startDateStr).lte('date_fin', endDateStr)
        ]);

        const vehicleExpensesTotal = vehicleExpenses.data?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
        const globalExpensesTotal = globalExpenses.data?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
        const totalExpenses = vehicleExpensesTotal + globalExpensesTotal;

        // Calculate revenue from reservations
        let totalRevenue = 0;
        reservations.data?.forEach(res => {
          if (res.prix_par_jour && res.date_debut && res.date_fin) {
            const days = Math.ceil((new Date(res.date_fin).getTime() - new Date(res.date_debut).getTime()) / (1000 * 60 * 60 * 24));
            totalRevenue += res.prix_par_jour * days;
          }
        });

        content += `RÉSUMÉ FINANCIER\n`;
        content += `================\n`;
        content += `Revenus total: ${totalRevenue.toFixed(2)} MAD\n`;
        content += `Dépenses véhicules: ${vehicleExpensesTotal.toFixed(2)} MAD\n`;
        content += `Dépenses générales: ${globalExpensesTotal.toFixed(2)} MAD\n`;
        content += `Total dépenses: ${totalExpenses.toFixed(2)} MAD\n`;
        content += `Bénéfice net: ${(totalRevenue - totalExpenses).toFixed(2)} MAD\n\n`;
      }

      if (type === 'activite') {
        // Fetch activity data
        const [reservations, vehicles, clients] = await Promise.all([
          supabase.from('reservations').select('*').eq('agency_id', user.id).gte('date_debut', startDateStr).lte('date_fin', endDateStr),
          supabase.from('vehicles').select('*').eq('agency_id', user.id),
          supabase.from('clients').select('*').eq('agency_id', user.id).gte('created_at', startDateStr).lte('created_at', endDateStr)
        ]);

        content += `RÉSUMÉ D'ACTIVITÉ\n`;
        content += `==================\n`;
        content += `Nouvelles réservations: ${reservations.data?.length || 0}\n`;
        content += `Nouveaux clients: ${clients.data?.length || 0}\n`;
        content += `Total véhicules: ${vehicles.data?.length || 0}\n`;
        content += `Taux d'occupation: ${vehicles.data?.length ? ((reservations.data?.length || 0) / vehicles.data.length * 100).toFixed(1) : 0}%\n\n`;
      }

      return content;
    } catch (error) {
      console.error('Error generating report content:', error);
      return `Rapport ${type} - Période: ${periode}\n\nErreur lors de la génération du contenu automatique.`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setGenerating(true);

      let content = formData.contenu;
      
      // Auto-generate content if empty
      if (!content && formData.type && formData.periode) {
        content = await generateRapportContent(formData.type, formData.periode);
      }

      const rapportData = {
        titre: formData.titre,
        type: formData.type,
        periode: formData.periode,
        contenu: content,
        date: formData.date || null,
        agency_id: user.id,
      };

      let error;
      if (editingRapport) {
        const { error: updateError } = await supabase
          .from('rapports')
          .update(rapportData)
          .eq('id', editingRapport.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('rapports')
          .insert(rapportData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Succès",
        description: editingRapport ? "Rapport modifié avec succès" : "Rapport généré avec succès",
      });

      setIsDialogOpen(false);
      setEditingRapport(null);
      resetForm();
      fetchRapports();
    } catch (error) {
      console.error('Error saving rapport:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le rapport",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (rapportId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) return;

    try {
      const { error } = await supabase
        .from('rapports')
        .delete()
        .eq('id', rapportId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rapport supprimé avec succès",
      });

      fetchRapports();
    } catch (error) {
      console.error('Error deleting rapport:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rapport",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (rapport: Rapport) => {
    setEditingRapport(rapport);
    setFormData({
      titre: rapport.titre || '',
      type: rapport.type || '',
      periode: rapport.periode || '',
      contenu: rapport.contenu || '',
      date: rapport.date ? rapport.date.split('T')[0] : '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      titre: '',
      type: '',
      periode: '',
      contenu: '',
      date: '',
    });
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'financier':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'activite':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const downloadRapport = (rapport: Rapport) => {
    const content = `${rapport.titre}\n${'='.repeat(rapport.titre?.length || 0)}\n\n${rapport.contenu}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rapport.titre?.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredRapports = rapports.filter(rapport =>
    `${rapport.titre} ${rapport.type} ${rapport.periode} ${rapport.contenu}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rapports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Générez et gérez vos rapports d'activité</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingRapport(null); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau rapport
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingRapport ? 'Modifier le rapport' : 'Nouveau rapport'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="titre">Titre *</Label>
                  <Input
                    id="titre"
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type de rapport *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financier">Financier</SelectItem>
                      <SelectItem value="activite">Activité</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="periode">Période *</Label>
                  <Select value={formData.periode} onValueChange={(value) => setFormData({ ...formData, periode: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner la période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensuel">Mensuel</SelectItem>
                      <SelectItem value="trimestriel">Trimestriel</SelectItem>
                      <SelectItem value="annuel">Annuel</SelectItem>
                      <SelectItem value="personnalise">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="contenu">Contenu</Label>
                <Textarea
                  id="contenu"
                  value={formData.contenu}
                  onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                  className="mt-1"
                  rows={8}
                  placeholder="Laissez vide pour générer automatiquement le contenu basé sur vos données..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si vous laissez le contenu vide, nous générerons automatiquement un rapport basé sur vos données.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={generating} className="bg-blue-600 hover:bg-blue-700">
                  {generating ? 'Génération...' : editingRapport ? 'Modifier' : 'Générer'}
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
            placeholder="Rechercher un rapport..."
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
          {filteredRapports.map((rapport) => (
            <Card key={rapport.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-800 dark:to-teal-900 rounded-full flex items-center justify-center">
                      <FileBarChart className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {rapport.titre}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {rapport.periode}
                      </p>
                    </div>
                  </div>
                  <Badge className={getTypeColor(rapport.type)}>
                    {rapport.type || 'N/A'}
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      {rapport.date ? new Date(rapport.date).toLocaleDateString() : 'Date non définie'}
                    </span>
                  </div>
                  {rapport.contenu && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {rapport.contenu.substring(0, 150)}...
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadRapport(rapport)}
                    className="flex-1 hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Télécharger
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(rapport)}
                    className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(rapport.id)}
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

      {!loading && filteredRapports.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <FileBarChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Aucun rapport trouvé
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? 'Aucun rapport ne correspond à votre recherche.' : 'Commencez par générer votre premier rapport.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => { resetForm(); setEditingRapport(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau rapport
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
