
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Building2, Globe, Palette, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Agency {
  agency_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  slogan: string | null;
  rc: string | null;
  ice: string | null;
  patente: string | null;
  tax_id: string | null;
  langue: string | null;
  devise: string | null;
  theme: string | null;
  logo_path: string | null;
}

export const Parametres: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [agencyData, setAgencyData] = useState<Agency>({
    agency_name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    slogan: '',
    rc: '',
    ice: '',
    patente: '',
    tax_id: '',
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
        setAgencyData({
          agency_name: data.agency_name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          website: data.website || '',
          slogan: data.slogan || '',
          rc: data.rc || '',
          ice: data.ice || '',
          patente: data.patente || '',
          tax_id: data.tax_id || '',
          langue: data.langue || 'fr',
          devise: data.devise || 'MAD',
          theme: data.theme || 'light',
          logo_path: data.logo_path || '',
        });
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

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('agencies')
        .upsert({
          id: user.id,
          ...agencyData,
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Configurez les paramètres de votre agence</p>
        </div>
        <Button 
          onClick={handleSaveSettings} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>Informations générales</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Informations légales</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <span>Préférences</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales de l'agence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agency_name">Nom de l'agence</Label>
                  <Input
                    id="agency_name"
                    value={agencyData.agency_name}
                    onChange={(e) => setAgencyData({ ...agencyData, agency_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={agencyData.email}
                    onChange={(e) => setAgencyData({ ...agencyData, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={agencyData.phone}
                    onChange={(e) => setAgencyData({ ...agencyData, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    value={agencyData.website}
                    onChange={(e) => setAgencyData({ ...agencyData, website: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={agencyData.address}
                  onChange={(e) => setAgencyData({ ...agencyData, address: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="slogan">Slogan</Label>
                <Input
                  id="slogan"
                  value={agencyData.slogan}
                  onChange={(e) => setAgencyData({ ...agencyData, slogan: e.target.value })}
                  className="mt-1"
                  placeholder="Votre slogan ou devise"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle>Informations légales et fiscales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rc">Registre de Commerce (RC)</Label>
                  <Input
                    id="rc"
                    value={agencyData.rc}
                    onChange={(e) => setAgencyData({ ...agencyData, rc: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ice">Identifiant Commun de l'Entreprise (ICE)</Label>
                  <Input
                    id="ice"
                    value={agencyData.ice}
                    onChange={(e) => setAgencyData({ ...agencyData, ice: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="patente">Numéro de Patente</Label>
                  <Input
                    id="patente"
                    value={agencyData.patente}
                    onChange={(e) => setAgencyData({ ...agencyData, patente: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tax_id">Identifiant Fiscal</Label>
                  <Input
                    id="tax_id"
                    value={agencyData.tax_id}
                    onChange={(e) => setAgencyData({ ...agencyData, tax_id: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Préférences de l'application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="langue">Langue de l'interface</Label>
                  <Select value={agencyData.langue} onValueChange={(value) => setAgencyData({ ...agencyData, langue: value })}>
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
                  <Select value={agencyData.devise} onValueChange={(value) => setAgencyData({ ...agencyData, devise: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAD">Dirham Marocain (MAD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="USD">Dollar US (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="theme">Thème de l'interface</Label>
                  <Select value={agencyData.theme} onValueChange={(value) => setAgencyData({ ...agencyData, theme: value })}>
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
              <div>
                <Label htmlFor="logo_path">Chemin du logo</Label>
                <Input
                  id="logo_path"
                  value={agencyData.logo_path}
                  onChange={(e) => setAgencyData({ ...agencyData, logo_path: e.target.value })}
                  className="mt-1"
                  placeholder="URL ou chemin vers votre logo"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
