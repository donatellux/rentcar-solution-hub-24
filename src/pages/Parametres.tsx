
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, Save, Building, Globe, Mail, Phone, FileText, Palette, Settings } from 'lucide-react';

interface AgencyData {
  agency_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  rc: string;
  ice: string;
  patente: string;
  tax_id: string;
  slogan: string;
  langue: string;
  devise: string;
  theme: string;
  logo_path: string;
}

export const Parametres: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState<AgencyData>({
    agency_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    rc: '',
    ice: '',
    patente: '',
    tax_id: '',
    slogan: '',
    langue: 'fr',
    devise: 'MAD',
    theme: 'light',
    logo_path: '',
  });

  useEffect(() => {
    if (user) {
      fetchAgencyData();
    }
  }, [user]);

  const fetchAgencyData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFormData({
          agency_name: data.agency_name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          rc: data.rc || '',
          ice: data.ice || '',
          patente: data.patente || '',
          tax_id: data.tax_id || '',
          slogan: data.slogan || '',
          langue: data.langue || 'fr',
          devise: data.devise || 'MAD',
          theme: data.theme || 'light',
          logo_path: data.logo_path || '',
        });
        
        if (data.logo_path) {
          setPreviewUrl(data.logo_path);
        }
      }
    } catch (error) {
      console.error('Error fetching agency data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File): Promise<string | null> => {
    try {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Le fichier est trop volumineux (max 5MB)');
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${user?.id}-${Date.now()}.${fileExt}`;

      console.log('Uploading logo:', fileName);

      // Delete old logo if exists
      if (formData.logo_path) {
        const oldFileName = formData.logo_path.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('logos')
            .remove([oldFileName]);
        }
      }

      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    
    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      
      let logoPath = formData.logo_path;

      // Upload logo if a new file was selected
      if (logoFile) {
        setUploadingLogo(true);
        console.log('Uploading new logo...');
        logoPath = await handleLogoUpload(logoFile);
        console.log('Logo uploaded:', logoPath);
        setUploadingLogo(false);
      }

      const dataToSave = {
        ...formData,
        logo_path: logoPath,
      };

      console.log('Saving agency data:', dataToSave);

      const { error } = await supabase
        .from('agencies')
        .upsert({
          id: user.id,
          ...dataToSave,
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Update local state
      setFormData(prev => ({ ...prev, logo_path: logoPath || '' }));
      setLogoFile(null);

      toast.success('Paramètres sauvegardés avec succès');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
      setUploadingLogo(false);
    }
  };

  const handleInputChange = (field: keyof AgencyData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Paramètres
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configurez les informations de votre agence
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Section */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-600">
              <Upload className="w-5 h-5" />
              <span>Logo de l'agence</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              {previewUrl && (
                <div className="w-24 h-24 border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-lg">
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="logo">Choisir un nouveau logo</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Formats acceptés: JPG, PNG, GIF (Max 5MB)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Informations de l'entreprise</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agency_name">Nom de l'agence *</Label>
                <Input
                  id="agency_name"
                  value={formData.agency_name}
                  onChange={(e) => handleInputChange('agency_name', e.target.value)}
                  className="mt-1"
                  placeholder="Nom de votre agence"
                  required
                />
              </div>
              <div>
                <Label htmlFor="slogan">Slogan</Label>
                <Input
                  id="slogan"
                  value={formData.slogan}
                  onChange={(e) => handleInputChange('slogan', e.target.value)}
                  className="mt-1"
                  placeholder="Votre slogan"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="mt-1"
                  placeholder="Adresse complète de l'agence"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>Informations de contact</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="mt-1"
                  placeholder="+212 6 XX XX XX XX"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="mt-1"
                  placeholder="contact@agence.com"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="website">Site web</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="mt-1"
                  placeholder="https://www.monagence.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Informations légales</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rc">Registre de Commerce</Label>
                <Input
                  id="rc"
                  value={formData.rc}
                  onChange={(e) => handleInputChange('rc', e.target.value)}
                  className="mt-1"
                  placeholder="RC XXXXXXX"
                />
              </div>
              <div>
                <Label htmlFor="ice">ICE</Label>
                <Input
                  id="ice"
                  value={formData.ice}
                  onChange={(e) => handleInputChange('ice', e.target.value)}
                  className="mt-1"
                  placeholder="ICE XXXXXXXXXXXXXXX"
                />
              </div>
              <div>
                <Label htmlFor="patente">Patente</Label>
                <Input
                  id="patente"
                  value={formData.patente}
                  onChange={(e) => handleInputChange('patente', e.target.value)}
                  className="mt-1"
                  placeholder="Numéro de patente"
                />
              </div>
              <div>
                <Label htmlFor="tax_id">Identifiant fiscal</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                  className="mt-1"
                  placeholder="IF XXXXXXXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Préférences</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="langue">Langue</Label>
                <Select value={formData.langue} onValueChange={(value) => handleInputChange('langue', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="devise">Devise</Label>
                <Select value={formData.devise} onValueChange={(value) => handleInputChange('devise', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAD">MAD (Dirham)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    <SelectItem value="USD">USD (Dollar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="theme">Thème</Label>
                <Select value={formData.theme} onValueChange={(value) => handleInputChange('theme', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Clair</SelectItem>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="auto">Automatique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving || uploadingLogo}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            {saving || uploadingLogo ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {uploadingLogo ? 'Téléchargement du logo...' : 'Sauvegarde...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
