
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, FileText, Download, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  title: string | null;
  type: string | null;
  description: string | null;
  file_path: string | null;
  car_id: string | null;
  uploaded_at: string | null;
  created_at: string | null;
  vehicles?: {
    marque: string;
    modele: string;
    immatriculation: string;
  };
}

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
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
    title: '',
    type: '',
    description: '',
    car_id: '',
    file: null as File | null,
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch documents with vehicle data
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select(`
          *,
          vehicles (marque, modele, immatriculation)
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('vehiclephotos')
        .upload(fileName, file);

      if (error) throw error;

      return fileName;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setUploading(true);
      let filePath = editingDocument?.file_path || null;

      // Upload file if provided
      if (formData.file) {
        filePath = await handleFileUpload(formData.file);
      }

      const documentData = {
        title: formData.title,
        type: formData.type,
        description: formData.description,
        car_id: formData.car_id || null,
        file_path: filePath,
        uploaded_at: new Date().toISOString(),
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

      if (error) throw error;

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
        description: "Impossible de sauvegarder le document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string, filePath: string | null) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      // Delete file from storage if exists
      if (filePath) {
        await supabase.storage
          .from('vehiclephotos')
          .remove([filePath]);
      }

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

  const handleDownload = async (filePath: string, title: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('vehiclephotos')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    setFormData({
      title: document.title || '',
      type: document.type || '',
      description: document.description || '',
      car_id: document.car_id || '',
      file: null,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: '',
      description: '',
      car_id: '',
      file: null,
    });
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'carte_grise':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'assurance':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'visite_technique':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'permis':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'cin':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredDocuments = documents.filter(document =>
    `${document.title} ${document.type} ${document.description} ${document.vehicles?.marque} ${document.vehicles?.modele}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez vos documents administratifs</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingDocument(null); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingDocument ? 'Modifier le document' : 'Nouveau document'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carte_grise">Carte grise</SelectItem>
                      <SelectItem value="assurance">Assurance</SelectItem>
                      <SelectItem value="visite_technique">Visite technique</SelectItem>
                      <SelectItem value="permis">Permis de conduire</SelectItem>
                      <SelectItem value="cin">CIN</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="car_id">Véhicule (optionnel)</Label>
                  <Select value={formData.car_id} onValueChange={(value) => setFormData({ ...formData, car_id: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner un véhicule (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun véhicule</SelectItem>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.marque} {vehicle.modele} - {vehicle.immatriculation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="file">Fichier</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    className="mt-1"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formats acceptés: PDF, DOC, DOCX, JPG, PNG
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
                  {uploading ? 'Téléchargement...' : editingDocument ? 'Modifier' : 'Ajouter'}
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
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-800 dark:to-indigo-900 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {document.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {document.vehicles ? `${document.vehicles.marque} ${document.vehicles.modele}` : 'Document général'}
                      </p>
                    </div>
                  </div>
                  <Badge className={getTypeColor(document.type)}>
                    {document.type || 'N/A'}
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {document.uploaded_at ? `Ajouté le ${new Date(document.uploaded_at).toLocaleDateString()}` : 'Date non définie'}
                  </div>
                  {document.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {document.description}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  {document.file_path && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(document.file_path!, document.title!)}
                      className="flex-1 hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Télécharger
                    </Button>
                  )}
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
                    onClick={() => handleDelete(document.id, document.file_path)}
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

      {!loading && filteredDocuments.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Aucun document trouvé
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? 'Aucun document ne correspond à votre recherche.' : 'Commencez par ajouter votre premier document.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => { resetForm(); setEditingDocument(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau document
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
