import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, User, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Client {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  cin: string | null;
  permis: string | null;
  date_delivrance: string | null;
  nationalite: string | null;
  sexe: string | null;
  type: string | null;
  agency_id: string | null;
  created_at: string | null;
}

export const Clients: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    cin: '',
    permis: '',
    date_delivrance: '',
    nationalite: 'Marocaine',
    sexe: '',
    type: 'particulier',
  });

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les clients",
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
      const clientData = {
        ...formData,
        date_delivrance: formData.date_delivrance || null,
        agency_id: user.id,
      };

      let error;
      if (editingClient) {
        const { error: updateError } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('clients')
          .insert(clientData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Succès",
        description: editingClient ? "Client modifié avec succès" : "Client ajouté avec succès",
      });

      setIsDialogOpen(false);
      setEditingClient(null);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le client",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Client supprimé avec succès",
      });

      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le client",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      nom: client.nom || '',
      prenom: client.prenom || '',
      email: client.email || '',
      telephone: client.telephone || '',
      adresse: client.adresse || '',
      cin: client.cin || '',
      permis: client.permis || '',
      date_delivrance: client.date_delivrance ? client.date_delivrance.split('T')[0] : '',
      nationalite: client.nationalite || 'Marocaine',
      sexe: client.sexe || '',
      type: client.type || 'particulier',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      cin: '',
      permis: '',
      date_delivrance: '',
      nationalite: 'Marocaine',
      sexe: '',
      type: 'particulier',
    });
  };

  const getClientTypeColor = (type: string | null) => {
    switch (type) {
      case 'particulier':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'entreprise':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredClients = clients.filter(client =>
    `${client.nom} ${client.prenom} ${client.email} ${client.telephone}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedData: paginatedClients,
    goToPage,
    nextPage,
    prevPage,
    hasNext,
    hasPrev,
  } = usePagination({
    data: filteredClients,
    itemsPerPage: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez votre base de clients</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingClient(null); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 dialog-mobile">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingClient ? 'Modifier le client' : 'Ajouter un client'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="telephone">Téléphone *</Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cin">CIN *</Label>
                  <Input
                    id="cin"
                    value={formData.cin}
                    onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="permis">N° Permis</Label>
                  <Input
                    id="permis"
                    value={formData.permis}
                    onChange={(e) => setFormData({ ...formData, permis: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="date_delivrance">Date délivrance permis</Label>
                  <Input
                    id="date_delivrance"
                    type="date"
                    value={formData.date_delivrance}
                    onChange={(e) => setFormData({ ...formData, date_delivrance: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="nationalite">Nationalité</Label>
                  <Select value={formData.nationalite} onValueChange={(value) => setFormData({ ...formData, nationalite: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Marocaine">Marocaine</SelectItem>
                      <SelectItem value="Française">Française</SelectItem>
                      <SelectItem value="Espagnole">Espagnole</SelectItem>
                      <SelectItem value="Italienne">Italienne</SelectItem>
                      <SelectItem value="Allemande">Allemande</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sexe">Sexe</Label>
                  <Select value={formData.sexe} onValueChange={(value) => setFormData({ ...formData, sexe: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homme">Homme</SelectItem>
                      <SelectItem value="femme">Femme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Type de client</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="particulier">Particulier</SelectItem>
                      <SelectItem value="entreprise">Entreprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingClient ? 'Modifier' : 'Ajouter'}
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
            placeholder="Rechercher un client..."
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
        <div className="flex-1 flex flex-col bg-card rounded-lg border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">
              Liste des clients ({filteredClients.length})
            </h3>
          </div>
          <div className="flex-1 lg:desktop-table-container">
            {paginatedClients.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  Aucun client trouvé
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm ? 'Aucun client ne correspond à votre recherche.' : 'Commencez par ajouter votre premier client.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => { resetForm(); setEditingClient(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un client
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block lg:desktop-table-wrapper">
                  <Table className="lg:desktop-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-64">Nom & Prénom</TableHead>
                        <TableHead className="w-56">Contact</TableHead>
                        <TableHead className="w-40">CIN</TableHead>
                        <TableHead className="w-32">Type</TableHead>
                        <TableHead className="w-40">Nationalité</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {client.prenom} {client.nom}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {client.telephone && (
                                <div className="flex items-center space-x-1 text-sm">
                                  <Phone className="w-3 h-3 text-muted-foreground" />
                                  <span>{client.telephone}</span>
                                </div>
                              )}
                              {client.email && (
                                <div className="flex items-center space-x-1 text-sm">
                                  <Mail className="w-3 h-3 text-muted-foreground" />
                                  <span>{client.email}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{client.cin}</TableCell>
                          <TableCell>
                            <Badge className={getClientTypeColor(client.type)}>
                              {client.type || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>{client.nationalite}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(client)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(client.id)}
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
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

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3 p-4">
                  {paginatedClients.map((client) => (
                    <Card key={client.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-foreground">
                              {client.prenom} {client.nom}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {client.telephone}
                            </p>
                          </div>
                          <Badge className={getClientTypeColor(client.type)}>
                            {client.type || 'N/A'}
                          </Badge>
                        </div>
                        
                        <div className="border-t border-border pt-3">
                          <p className="text-sm">
                            <span className="font-medium">CIN:</span> {client.cin}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {client.nationalite}
                          </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(client)}
                            className="flex-1"
                          >
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(client.id)}
                            className="px-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-border">
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
        </div>
      )}
    </div>
  );
};
