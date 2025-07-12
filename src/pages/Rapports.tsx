
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, FileText, Download, BarChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Rapport {
  id: string;
  titre: string | null;
  type: string | null;
  periode: string | null;
  date: string | null;
  contenu: string | null;
  fichier_pdf: string | null;
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

  const [formData, setFormData] = useState({
    titre: '',
    type: '',
    periode: '',
    date: '',
    contenu: '',
    fichier_pdf: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const rapportData = {
        titre: formData.titre,
        type: formData.type,
        periode: formData.periode,
        date: formData.date || null,
        contenu: formData.contenu,
        fichier_pdf: formData.fichier_pdf,
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
        description: editingRapport ? "Rapport modifié avec succès" : "Rapport ajouté avec succès",
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
      date: rapport.date ? rapport.date.split('T')[0] : '',
      contenu: rapport.contenu || '',
      fichier_pdf: rapport.fichier_pdf || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      titre: '',
      type: '',
      periode: '',
      date: '',
      contenu: '',
      fichier_pdf: '',
    });
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'mensuel':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'trimestriel':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'annuel':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'personnalise':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredRapports = rapports.filter(rapport =>
    `${rapport.titre} ${rapport.type} ${rapport.periode} ${rapport.contenu}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      <SelectItem value="mensuel">Mensuel</SelectItem>
                      <SelectItem value="trimestriel">Trimestriel</SelectItem>
                      <SelectItem value="annuel">Annuel</SelectItem>
                      <SelectItem value="personnalise">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="periode">Période</Label>
                  <Input
                    id="periode"
                    value={formData.periode}
                    onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
                    placeholder="Ex: Janvier 2024, Q1 2024"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date de génération</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="fichier_pdf">Lien vers le fichier PDF</Label>
                  <Input
                    id="fichier_pdf"
                    value={formData.fichier_pdf}
                    onChange={(e) => setFormData({ ...formData, fichier_pdf: e.target.value })}
                    placeholder="URL du fichier PDF"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="contenu">Contenu du rapport</Label>
                <Textarea
                  id="contenu"
                  value={formData.contenu}
                  onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                  className="mt-1"
                  rows={5}
                  placeholder="Résumé et détails du rapport..."
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingRapport ? 'Modifier' : 'Ajouter'}
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

      <Card>
        <CardHeader>
          <CardTitle>Liste des rapports ({filteredRapports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRapports.length === 0 ? (
            <div className="text-center py-8">
              <BarChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                Aucun rapport trouvé
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm ? 'Aucun rapport ne correspond à votre recherche.' : 'Commencez par créer votre premier rapport.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => { resetForm(); setEditingRapport(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau rapport
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Date de génération</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRapports.map((rapport) => (
                  <TableRow key={rapport.id}>
                    <TableCell>
                      <div className="font-medium">{rapport.titre}</div>
                      {rapport.contenu && (
                        <div className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                          {rapport.contenu}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(rapport.type)}>
                        {rapport.type || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>{rapport.periode || 'Non définie'}</TableCell>
                    <TableCell>
                      {rapport.date ? new Date(rapport.date).toLocaleDateString('fr-FR') : 'Non définie'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {rapport.fichier_pdf && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(rapport.fichier_pdf!, '_blank')}
                            className="hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
