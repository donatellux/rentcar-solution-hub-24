import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, FileText, Upload, Download, Eye, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

interface Document {
  id: string;
  vehicule_id: string | null;
  type_document: string | null;
  numero_document: string | null;
  date_emission: string | null;
  date_expiration: string | null;
  file_url: string | null;
  created_at: string | null;
  vehicles?: {
    marque: string;
    modele: string;
  };
}

export const Documents: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    vehicule_id: '',
    type_document: '',
    numero_document: '',
    date_emission: '',
    date_expiration: '',
    file: null as File | null,
  });

  // Filter documents first
  const filteredDocuments = documents.filter(document =>
    `${document.type_document} ${document.numero_document} ${document.vehicles?.marque} ${document.vehicles?.modele}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Add pagination
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
    reset
  } = usePagination({ data: filteredDocuments, itemsPerPage: 10 });

  // Reset pagination when search term changes
  useEffect(() => {
    reset();
  }, [searchTerm, reset]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch documents with related vehicle data
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select(`
          *,
          vehicles (marque, modele)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (documentsError) throw documentsError;

      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation')
        .eq('agency_id', user.id);

      if (vehiclesError) throw vehiclesError;

      setDocuments(documentsData || []);
      setVehicles(vehiclesData || []);
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

  const handleFileUpload = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Le fichier est trop volumineux (max 10MB)');
      }

      // Check file type (PDF only)
      if (file.type !== 'application/pdf') {
        throw new Error('Le fichier doit être un PDF');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `${user?.id}/documents/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('vehicledocuments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Erreur d'upload: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vehicledocuments')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!formData.vehicule_id || !formData.type_document || !formData.numero_document || !formData.date_emission || !formData.date_expiration || !formData.file) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Upload file
      let fileUrl: string | null = null;
      try {
        fileUrl = await handleFileUpload(formData.file);
      } catch (error) {
        toast({
          title: "Erreur",
          description: `Échec de l'upload du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          variant: "destructive",
        });
        return;
      }

      const documentData = {
        vehicule_id: formData.vehicule_id,
        type_document: formData.type_document,
        numero_document: formData.numero_document,
        date_emission: formData.date_emission,
        date_expiration: formData.date_expiration,
        file_url: fileUrl,
        agency_id: user.id,
      };

      let error;
      if (editingDocument) {
        const { error: updateError } = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', editingDocument.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('documents')
          .insert(documentData);
        error = insertError;
      }

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Erreur de base de données: ${error.message}`);
      }

      toast({
        title: "Succès",
        description: editingDocument ? "Document modifié avec succès" : "Document ajouté avec succès",
      });

      setIsDialogOpen(false);
      setEditingDocument(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de sauvegarder le document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Document supprimé avec succès",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    setFormData({
      vehicule_id: document.vehicule_id || '',
      type_document: document.type_document || '',
      numero_document: document.numero_document || '',
      date_emission: document.date_emission || '',
      date_expiration: document.date_expiration || '',
      file: null,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      vehicule_id: '',
      type_document: '',
      numero_document: '',
      date_emission: '',
      date_expiration: '',
      file: null,
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Documents
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez les documents de vos véhicules</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingDocument(null); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouveau document</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingDocument ? 'Modifier le document' : 'Nouveau document'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="vehicule_id">Véhicule</Label>
                  <Select value={formData.vehicule_id} onValueChange={(value) => setFormData({ ...formData, vehicule_id: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner un véhicule" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.marque} {vehicle.modele} - {vehicle.immatriculation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type_document">Type de document</Label>
                  <Input
                    id="type_document"
                    value={formData.type_document}
                    onChange={(e) => setFormData({ ...formData, type_document: e.target.value })}
                    className="mt-1"
                    placeholder="Type de document"
                  />
                </div>
                <div>
                  <Label htmlFor="numero_document">Numéro de document</Label>
                  <Input
                    id="numero_document"
                    value={formData.numero_document}
                    onChange={(e) => setFormData({ ...formData, numero_document: e.target.value })}
                    className="mt-1"
                    placeholder="Numéro de document"
                  />
                </div>
                <div>
                  <Label htmlFor="date_emission">Date d'émission</Label>
                  <Input
                    id="date_emission"
                    type="date"
                    value={formData.date_emission}
                    onChange={(e) => setFormData({ ...formData, date_emission: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="date_expiration">Date d'expiration</Label>
                  <Input
                    id="date_expiration"
                    type="date"
                    value={formData.date_expiration}
                    onChange={(e) => setFormData({ ...formData, date_expiration: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="file">Fichier (PDF)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={uploading} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Téléchargement...
                    </>
                  ) : (
                    editingDocument ? 'Modifier' : 'Ajouter'
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
            placeholder="Rechercher un document..."
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
        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Liste des documents ({totalItems})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paginatedData.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    Aucun document trouvé
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchTerm ? 'Aucun document ne correspond à votre recherche.' : 'Commencez par ajouter votre premier document.'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => { resetForm(); setEditingDocument(null); setIsDialogOpen(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nouveau document
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedData.map((document) => (
                    <Card key={document.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <span>{document.type_document}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="text-gray-600 dark:text-gray-400">
                          <p>
                            <strong>Véhicule:</strong> {document.vehicles?.marque} {document.vehicles?.modele}
                          </p>
                          <p>
                            <strong>Numéro:</strong> {document.numero_document}
                          </p>
                          <p>
                            <strong>Émission:</strong> {document.date_emission}
                          </p>
                          <p>
                            <strong>Expiration:</strong> {document.date_expiration}
                          </p>
                        </div>
                        <div className="flex justify-end mt-4 space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(document)}
                            className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(document.id)}
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
            </CardContent>
          </Card>

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
        </div>
      )}
    </div>
  );
};
