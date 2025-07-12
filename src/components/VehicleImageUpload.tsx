
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VehicleImageUploadProps {
  currentImagePath?: string | null;
  onImageUploaded: (imagePath: string) => void;
  vehicleId?: string;
}

export const VehicleImageUpload: React.FC<VehicleImageUploadProps> = ({
  currentImagePath,
  onImageUploaded,
  vehicleId
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImagePath ? `${supabase.storage.from('vehiclephotos').getPublicUrl(currentImagePath).data.publicUrl}` : null
  );
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: "L'image ne doit pas dépasser 5MB",
          variant: "destructive",
        });
        return;
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('vehiclephotos')
        .upload(fileName, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vehiclephotos')
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrl);
      onImageUploaded(fileName);

      toast({
        title: "Succès",
        description: "Image téléchargée avec succès",
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement de l'image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      if (currentImagePath) {
        await supabase.storage
          .from('vehiclephotos')
          .remove([currentImagePath]);
      }
      
      setPreviewUrl(null);
      onImageUploaded('');
      
      toast({
        title: "Succès",
        description: "Image supprimée avec succès",
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de l'image",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Label>Image du véhicule</Label>
      
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Véhicule"
            className="w-full h-48 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemoveImage}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="space-y-2">
            <Label htmlFor="vehicle-image" className="cursor-pointer">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Upload className="w-4 h-4" />
                <span>Cliquez pour télécharger une image</span>
              </div>
            </Label>
            <p className="text-xs text-gray-500">PNG, JPG jusqu'à 5MB</p>
          </div>
        </div>
      )}

      <Input
        id="vehicle-image"
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        disabled={uploading}
        className="hidden"
      />
      
      {uploading && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Téléchargement en cours...
        </div>
      )}
    </div>
  );
};
