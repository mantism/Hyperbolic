export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "10.2.0 (e07807d)";
  };
  public: {
    Tables: {
      ComboLogs: {
        Row: {
          created_at: string | null;
          id: string;
          is_public: boolean | null;
          landed: boolean | null;
          location_name: string | null;
          logged_at: string;
          notes: string | null;
          rating: number | null;
          surface_type: string | null;
          thumbnail_url: string | null;
          user_combo_id: string;
          video_urls: string[] | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_public?: boolean | null;
          landed?: boolean | null;
          location_name?: string | null;
          logged_at?: string;
          notes?: string | null;
          rating?: number | null;
          surface_type?: string | null;
          thumbnail_url?: string | null;
          user_combo_id: string;
          video_urls?: string[] | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_public?: boolean | null;
          landed?: boolean | null;
          location_name?: string | null;
          logged_at?: string;
          notes?: string | null;
          rating?: number | null;
          surface_type?: string | null;
          thumbnail_url?: string | null;
          user_combo_id?: string;
          video_urls?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "ComboLogs_user_combo_id_fkey";
            columns: ["user_combo_id"];
            isOneToOne: false;
            referencedRelation: "UserCombos";
            referencedColumns: ["id"];
          },
        ];
      };
      LandingStances: {
        Row: {
          aliases: string[] | null;
          created_at: string | null;
          description: string | null;
          id: string;
          last_updated: string | null;
          name: string;
        };
        Insert: {
          aliases?: string[] | null;
          created_at?: string | null;
          description?: string | null;
          id: string;
          last_updated?: string | null;
          name: string;
        };
        Update: {
          aliases?: string[] | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          last_updated?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      LandingStanceTransitions: {
        Row: {
          created_at: string | null;
          id: string;
          landing_stance_id: string;
          transition_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          landing_stance_id: string;
          transition_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          landing_stance_id?: string;
          transition_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "LandingStanceTransitions_landing_stance_id_fkey";
            columns: ["landing_stance_id"];
            isOneToOne: false;
            referencedRelation: "LandingStances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "LandingStanceTransitions_transition_id_fkey";
            columns: ["transition_id"];
            isOneToOne: false;
            referencedRelation: "Transitions";
            referencedColumns: ["id"];
          },
        ];
      };
      Transitions: {
        Row: {
          aliases: string[] | null;
          created_at: string | null;
          description: string | null;
          id: string;
          last_updated: string | null;
          name: string;
        };
        Insert: {
          aliases?: string[] | null;
          created_at?: string | null;
          description?: string | null;
          id: string;
          last_updated?: string | null;
          name: string;
        };
        Update: {
          aliases?: string[] | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          last_updated?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      TrickLogs: {
        Row: {
          created_at: string | null;
          id: string;
          is_public: boolean | null;
          landed: boolean | null;
          location_name: string | null;
          logged_at: string;
          notes: string | null;
          rating: number | null;
          reps: number | null;
          surface_type: string | null;
          thumbnail_url: string | null;
          user_trick_id: string;
          video_urls: string[] | null;
          weather_conditions: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_public?: boolean | null;
          landed?: boolean | null;
          location_name?: string | null;
          logged_at?: string;
          notes?: string | null;
          rating?: number | null;
          reps?: number | null;
          surface_type?: string | null;
          thumbnail_url?: string | null;
          user_trick_id: string;
          video_urls?: string[] | null;
          weather_conditions?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_public?: boolean | null;
          landed?: boolean | null;
          location_name?: string | null;
          logged_at?: string;
          notes?: string | null;
          rating?: number | null;
          reps?: number | null;
          surface_type?: string | null;
          thumbnail_url?: string | null;
          user_trick_id?: string;
          video_urls?: string[] | null;
          weather_conditions?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tricklogs_user_trick_id_fkey";
            columns: ["user_trick_id"];
            isOneToOne: false;
            referencedRelation: "UserToTricks";
            referencedColumns: ["id"];
          },
        ];
      };
      TrickMedia: {
        Row: {
          created_at: string | null;
          duration_seconds: number | null;
          file_size_bytes: number | null;
          id: string;
          media_type: Database["public"]["Enums"]["media_type"];
          metadata: Json | null;
          mime_type: string | null;
          thumbnail_url: string | null;
          tricklog_id: string | null;
          updated_at: string | null;
          upload_status: Database["public"]["Enums"]["upload_status"];
          url: string;
          user_trick_id: string;
        };
        Insert: {
          created_at?: string | null;
          duration_seconds?: number | null;
          file_size_bytes?: number | null;
          id?: string;
          media_type?: Database["public"]["Enums"]["media_type"];
          metadata?: Json | null;
          mime_type?: string | null;
          thumbnail_url?: string | null;
          tricklog_id?: string | null;
          updated_at?: string | null;
          upload_status?: Database["public"]["Enums"]["upload_status"];
          url: string;
          user_trick_id: string;
        };
        Update: {
          created_at?: string | null;
          duration_seconds?: number | null;
          file_size_bytes?: number | null;
          id?: string;
          media_type?: Database["public"]["Enums"]["media_type"];
          metadata?: Json | null;
          mime_type?: string | null;
          thumbnail_url?: string | null;
          tricklog_id?: string | null;
          updated_at?: string | null;
          upload_status?: Database["public"]["Enums"]["upload_status"];
          url?: string;
          user_trick_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "TrickMediaTable_tricklog_id_fkey";
            columns: ["tricklog_id"];
            isOneToOne: false;
            referencedRelation: "TrickLogs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "TrickMediaTable_user_trick_id_fkey";
            columns: ["user_trick_id"];
            isOneToOne: false;
            referencedRelation: "UserToTricks";
            referencedColumns: ["id"];
          },
        ];
      };
      Tricks: {
        Row: {
          aliases: string[] | null;
          categories: string[] | null;
          created_at: string | null;
          description: string | null;
          featured_video_id: string | null;
          id: string;
          lastUpdated: string | null;
          name: string;
          prereqs: string[] | null;
          progressions: string[] | null;
          rating: number | null;
        };
        Insert: {
          aliases?: string[] | null;
          categories?: string[] | null;
          created_at?: string | null;
          description?: string | null;
          featured_video_id?: string | null;
          id: string;
          lastUpdated?: string | null;
          name: string;
          prereqs?: string[] | null;
          progressions?: string[] | null;
          rating?: number | null;
        };
        Update: {
          aliases?: string[] | null;
          categories?: string[] | null;
          created_at?: string | null;
          description?: string | null;
          featured_video_id?: string | null;
          id?: string;
          lastUpdated?: string | null;
          name?: string;
          prereqs?: string[] | null;
          progressions?: string[] | null;
          rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "TricksTable_featured_video_id_fkey";
            columns: ["featured_video_id"];
            isOneToOne: false;
            referencedRelation: "TrickMedia";
            referencedColumns: ["id"];
          },
        ];
      };
      UserCombos: {
        Row: {
          attempts: number | null;
          combo_graph: Json;
          created_at: string | null;
          id: string;
          landed: boolean | null;
          landedSurfaces: string[] | null;
          name: string;
          stomps: number | null;
          user_id: string;
        };
        Insert: {
          attempts?: number | null;
          combo_graph: Json;
          created_at?: string | null;
          id?: string;
          landed?: boolean | null;
          landedSurfaces?: string[] | null;
          name: string;
          stomps?: number | null;
          user_id: string;
        };
        Update: {
          attempts?: number | null;
          combo_graph?: Json;
          created_at?: string | null;
          id?: string;
          landed?: boolean | null;
          landedSurfaces?: string[] | null;
          name?: string;
          stomps?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "UserCombos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "Users";
            referencedColumns: ["id"];
          },
        ];
      };
      Users: {
        Row: {
          birthday: string | null;
          comboListMap: Json | null;
          created_at: string | null;
          email: string;
          firstName: string | null;
          goalTricksList: Json | null;
          id: string;
          lastName: string;
          profilePic: string | null;
          trickingYears: number | null;
          trickListMap: Json | null;
          trickSessions: Json | null;
          username: string;
        };
        Insert: {
          birthday?: string | null;
          comboListMap?: Json | null;
          created_at?: string | null;
          email: string;
          firstName?: string | null;
          goalTricksList?: Json | null;
          id: string;
          lastName: string;
          profilePic?: string | null;
          trickingYears?: number | null;
          trickListMap?: Json | null;
          trickSessions?: Json | null;
          username: string;
        };
        Update: {
          birthday?: string | null;
          comboListMap?: Json | null;
          created_at?: string | null;
          email?: string;
          firstName?: string | null;
          goalTricksList?: Json | null;
          id?: string;
          lastName?: string;
          profilePic?: string | null;
          trickingYears?: number | null;
          trickListMap?: Json | null;
          trickSessions?: Json | null;
          username?: string;
        };
        Relationships: [];
      };
      UserToTricks: {
        Row: {
          attempts: number | null;
          created_at: string | null;
          id: string;
          isGoal: boolean | null;
          landed: boolean | null;
          landedSurfaces: string[] | null;
          rating: number | null;
          stomps: number | null;
          trickID: string;
          userID: string | null;
        };
        Insert: {
          attempts?: number | null;
          created_at?: string | null;
          id?: string;
          isGoal?: boolean | null;
          landed?: boolean | null;
          landedSurfaces?: string[] | null;
          rating?: number | null;
          stomps?: number | null;
          trickID: string;
          userID?: string | null;
        };
        Update: {
          attempts?: number | null;
          created_at?: string | null;
          id?: string;
          isGoal?: boolean | null;
          landed?: boolean | null;
          landedSurfaces?: string[] | null;
          rating?: number | null;
          stomps?: number | null;
          trickID?: string;
          userID?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "UserToTricks_userID_fkey";
            columns: ["userID"];
            isOneToOne: false;
            referencedRelation: "Users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "UserToTricksTable_trickID_fkey";
            columns: ["trickID"];
            isOneToOne: false;
            referencedRelation: "Tricks";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      media_type: "video" | "image";
      upload_status: "pending" | "processing" | "completed" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      media_type: ["video", "image"],
      upload_status: ["pending", "processing", "completed", "failed"],
    },
  },
} as const;
