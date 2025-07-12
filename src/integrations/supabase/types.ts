export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          address: string | null
          agency_name: string | null
          created_at: string | null
          devise: string | null
          email: string | null
          ice: string | null
          id: string
          langue: string | null
          logo_path: string | null
          patente: string | null
          phone: string | null
          rc: string | null
          slogan: string | null
          tax_id: string | null
          theme: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          agency_name?: string | null
          created_at?: string | null
          devise?: string | null
          email?: string | null
          ice?: string | null
          id: string
          langue?: string | null
          logo_path?: string | null
          patente?: string | null
          phone?: string | null
          rc?: string | null
          slogan?: string | null
          tax_id?: string | null
          theme?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          agency_name?: string | null
          created_at?: string | null
          devise?: string | null
          email?: string | null
          ice?: string | null
          id?: string
          langue?: string | null
          logo_path?: string | null
          patente?: string | null
          phone?: string | null
          rc?: string | null
          slogan?: string | null
          tax_id?: string | null
          theme?: string | null
          website?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          adresse: string | null
          agency_id: string | null
          cin: string | null
          created_at: string | null
          date_delivrance: string | null
          email: string | null
          id: string
          nationalite: string | null
          nom: string | null
          permis: string | null
          prenom: string | null
          sexe: string | null
          telephone: string | null
          type: string | null
        }
        Insert: {
          adresse?: string | null
          agency_id?: string | null
          cin?: string | null
          created_at?: string | null
          date_delivrance?: string | null
          email?: string | null
          id?: string
          nationalite?: string | null
          nom?: string | null
          permis?: string | null
          prenom?: string | null
          sexe?: string | null
          telephone?: string | null
          type?: string | null
        }
        Update: {
          adresse?: string | null
          agency_id?: string | null
          cin?: string | null
          created_at?: string | null
          date_delivrance?: string | null
          email?: string | null
          id?: string
          nationalite?: string | null
          nom?: string | null
          permis?: string | null
          prenom?: string | null
          sexe?: string | null
          telephone?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          agency_id: string | null
          car_id: string | null
          created_at: string | null
          description: string | null
          file_path: string | null
          id: string
          title: string | null
          type: string | null
          uploaded_at: string | null
        }
        Insert: {
          agency_id?: string | null
          car_id?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          title?: string | null
          type?: string | null
          uploaded_at?: string | null
        }
        Update: {
          agency_id?: string | null
          car_id?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          title?: string | null
          type?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      entretiens: {
        Row: {
          agency_id: string | null
          cout: number | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          km_last_vidange: number | null
          type: string | null
          vehicule_id: string | null
          vidange_periodicite_km: number | null
        }
        Insert: {
          agency_id?: string | null
          cout?: number | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          km_last_vidange?: number | null
          type?: string | null
          vehicule_id?: string | null
          vidange_periodicite_km?: number | null
        }
        Update: {
          agency_id?: string | null
          cout?: number | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          km_last_vidange?: number | null
          type?: string | null
          vehicule_id?: string | null
          vidange_periodicite_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entretiens_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entretiens_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      global_expenses: {
        Row: {
          agency_id: string | null
          amount: number | null
          category: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string
        }
        Insert: {
          agency_id?: string | null
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          agency_id?: string | null
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_expenses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      rapports: {
        Row: {
          agency_id: string | null
          contenu: string | null
          created_at: string | null
          date: string | null
          fichier_pdf: string | null
          id: string
          periode: string | null
          titre: string | null
          type: string | null
        }
        Insert: {
          agency_id?: string | null
          contenu?: string | null
          created_at?: string | null
          date?: string | null
          fichier_pdf?: string | null
          id?: string
          periode?: string | null
          titre?: string | null
          type?: string | null
        }
        Update: {
          agency_id?: string | null
          contenu?: string | null
          created_at?: string | null
          date?: string | null
          fichier_pdf?: string | null
          id?: string
          periode?: string | null
          titre?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          agency_id: string | null
          cin_scan_url: string | null
          client_id: string | null
          created_at: string | null
          date_debut: string | null
          date_fin: string | null
          id: string
          km_depart: number | null
          km_retour: number | null
          lieu_delivrance: string | null
          lieu_recuperation: string | null
          permis_scan_url: string | null
          prix_par_jour: number | null
          statut: string | null
          vehicule_id: string | null
        }
        Insert: {
          agency_id?: string | null
          cin_scan_url?: string | null
          client_id?: string | null
          created_at?: string | null
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          km_depart?: number | null
          km_retour?: number | null
          lieu_delivrance?: string | null
          lieu_recuperation?: string | null
          permis_scan_url?: string | null
          prix_par_jour?: number | null
          statut?: string | null
          vehicule_id?: string | null
        }
        Update: {
          agency_id?: string | null
          cin_scan_url?: string | null
          client_id?: string | null
          created_at?: string | null
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          km_depart?: number | null
          km_retour?: number | null
          lieu_delivrance?: string | null
          lieu_recuperation?: string | null
          permis_scan_url?: string | null
          prix_par_jour?: number | null
          statut?: string | null
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_expenses: {
        Row: {
          agency_id: string | null
          amount: number | null
          category: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          vehicle_id: string | null
        }
        Insert: {
          agency_id?: string | null
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          vehicle_id?: string | null
        }
        Update: {
          agency_id?: string | null
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_expenses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          agency_id: string | null
          annee: number | null
          boite_vitesse: string | null
          carburant: string | null
          couleur: string | null
          created_at: string | null
          etat: string | null
          id: string
          immatriculation: string | null
          kilometrage: number | null
          km_last_vidange: number | null
          marque: string | null
          modele: string | null
          photo_path: string | null
          vidange_periodicite_km: number | null
        }
        Insert: {
          agency_id?: string | null
          annee?: number | null
          boite_vitesse?: string | null
          carburant?: string | null
          couleur?: string | null
          created_at?: string | null
          etat?: string | null
          id?: string
          immatriculation?: string | null
          kilometrage?: number | null
          km_last_vidange?: number | null
          marque?: string | null
          modele?: string | null
          photo_path?: string | null
          vidange_periodicite_km?: number | null
        }
        Update: {
          agency_id?: string | null
          annee?: number | null
          boite_vitesse?: string | null
          carburant?: string | null
          couleur?: string | null
          created_at?: string | null
          etat?: string | null
          id?: string
          immatriculation?: string | null
          kilometrage?: number | null
          km_last_vidange?: number | null
          marque?: string | null
          modele?: string | null
          photo_path?: string | null
          vidange_periodicite_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
