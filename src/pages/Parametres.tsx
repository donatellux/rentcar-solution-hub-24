
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Settings, Building, User, Palette, Upload, X } from 'lucide-react';

interface AgencySettings {
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [agencySettings, setAgencySettings] = useState<AgencySettings>({
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
      fetchAgencySettings();
    }
  }, [user]);

  const fetchAgencySettings = async () => {
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
        setAgencySettings({
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
          const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(data.logo_path);
          setLogoPreview(publicUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching agency settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner une image valide",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: "L'image ne doit pas dépasser 2MB",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${user.id}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      setLogoPreview(publicUrl);
      setAgencySettings(prev => ({ ...prev, logo_path: fileName }));

      toast({
        title: "Succès",
        description: "Logo téléchargé avec succès",
      });

    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement du logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      if (agencySettings.logo_path) {
        await supabase.storage
          .from('logos')
          .remove([agencySettings.logo_path]);
      }
      
      setLogoPreview(null);
      setAgencySettings(prev => ({ ...prev, logo_path: '' }));
      
      toast({
        title: "Succès",
        description: "Logo supprimé avec succès",
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du logo",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('agencies')
        .upsert({
          id: user.id,
          ...agencySettings,
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Paramètres sauvegardés avec succès",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof AgencySettings, value: string) => {
    setAgencySettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Configurez les paramètres de votre agence</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          <Settings className="w-4 h-4 mr-2" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="company">Entreprise</TabsTrigger>
          <TabsTrigger value="preferences">Préférences</TabsTrigger>
          <TabsTrigger value="branding">Image de marque</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Informations générales</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agency_name">Nom de l'agence *</Label>
                  <Input
                    id="agency_name"
                    value={agencySettings.agency_name}
                    onChange={(e) => handleInputChange('agency_name', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={agencySettings.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={agencySettings.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    value={agencySettings.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={agencySettings.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Informations légales</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rc">Registre de commerce</Label>
                  <Input
                    id="rc"
                    value={agencySettings.rc}
                    onChange={(e) => handleInputChange('rc', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ice">ICE</Label>
                  <Input
                    id="ice"
                    value={agencySettings.ice}
                    onChange={(e) => handleInputChange('ice', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="patente">Patente</Label>
                  <Input
                    id="patente"
                    value={agencySettings.patente}
                    onChange={(e) => handleInputChange('patente', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tax_id">Identifiant fiscal</Label>
                  <Input
                    id="tax_id"
                    value={agencySettings.tax_id}
                    onChange={(e) => handleInputChange('tax_id', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Préférences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="langue">Langue</Label>
                  <Select value={agencySettings.langue} onValueChange={(value) => handleInputChange('langue', value)}>
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
                  <Select value={agencySettings.devise} onValueChange={(value) => handleInputChange('devise', value)}>
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
                  <Select value={agencySettings.theme} onValueChange={(value) => handleInputChange('theme', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Clair</SelectItem>
                      <SelectItem value="dark">Sombre</SelectItem>
                      <SelectItem value="system">Système</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Image de marque</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Logo de l'agence</Label>
                {logoPreview ? (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-32 h-32 object-contain border rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2"
                      onClick={handleRemoveLogo}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Aucun logo téléchargé</p>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formats acceptés: PNG, JPG, JPEG. Taille max: 2MB
                </p>
                {uploading && (
                  <p className="text-sm text-blue-600 mt-1">Téléchargement en cours...</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="slogan">Slogan</Label>
                <Input
                  id="slogan"
                  value={agencySettings.slogan}
                  onChange={(e) => handleInputChange('slogan', e.target.value)}
                  className="mt-1"
                  placeholder="Votre slogan publicitaire"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
