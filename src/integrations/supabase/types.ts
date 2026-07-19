export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      candidate_status: {
        Row: {
          reason: string | null
          suspended: boolean
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          reason?: string | null
          suspended?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          reason?: string | null
          suspended?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      level_messages: {
        Row: {
          id: string
          level_range: Database["public"]["Enums"]["level_range"]
          message_text: string
          updated_at: string
        }
        Insert: {
          id?: string
          level_range: Database["public"]["Enums"]["level_range"]
          message_text: string
          updated_at?: string
        }
        Update: {
          id?: string
          level_range?: Database["public"]["Enums"]["level_range"]
          message_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          chariow_sale_id: string | null
          confirmed_at: string | null
          created_at: string
          credits_added: number
          currency: string
          id: string
          moneroo_reference: string
          moneroo_transaction_id: string | null
          payment_method: string | null
          provider: string
          raw_payload: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount: number
          chariow_sale_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          credits_added?: number
          currency?: string
          id?: string
          moneroo_reference: string
          moneroo_transaction_id?: string | null
          payment_method?: string | null
          provider?: string
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          chariow_sale_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          credits_added?: number
          currency?: string
          id?: string
          moneroo_reference?: string
          moneroo_transaction_id?: string | null
          payment_method?: string | null
          provider?: string
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: []
      }
      pricing_offers: {
        Row: {
          created_at: string
          cta_link: string
          currency: string
          features: Json
          id: string
          is_active: boolean
          level_range: Database["public"]["Enums"]["level_range"]
          price: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_link: string
          currency?: string
          features?: Json
          id?: string
          is_active?: boolean
          level_range: Database["public"]["Enums"]["level_range"]
          price: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_link?: string
          currency?: string
          features?: Json
          id?: string
          is_active?: boolean
          level_range?: Database["public"]["Enums"]["level_range"]
          price?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_recommendations: string | null
          ai_recommendations_at: string | null
          avatar_url: string | null
          candidate_number: string | null
          created_at: string
          credits_remaining: number
          date_of_birth: string | null
          first_name: string | null
          id: string
          last_name: string | null
          nationality: string | null
          objectives: string[]
          updated_at: string
        }
        Insert: {
          ai_recommendations?: string | null
          ai_recommendations_at?: string | null
          avatar_url?: string | null
          candidate_number?: string | null
          created_at?: string
          credits_remaining?: number
          date_of_birth?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          nationality?: string | null
          objectives?: string[]
          updated_at?: string
        }
        Update: {
          ai_recommendations?: string | null
          ai_recommendations_at?: string | null
          avatar_url?: string | null
          candidate_number?: string | null
          created_at?: string
          credits_remaining?: number
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          nationality?: string | null
          objectives?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          audio_url: string | null
          category: Database["public"]["Enums"]["question_category"]
          correct_answer: string
          created_at: string
          id: string
          is_active: boolean
          level: Database["public"]["Enums"]["cecrl_level"]
          max_plays: number
          options: Json
          order_hint: number
          question_text: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          category: Database["public"]["Enums"]["question_category"]
          correct_answer: string
          created_at?: string
          id?: string
          is_active?: boolean
          level: Database["public"]["Enums"]["cecrl_level"]
          max_plays?: number
          options: Json
          order_hint?: number
          question_text: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          category?: Database["public"]["Enums"]["question_category"]
          correct_answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["cecrl_level"]
          max_plays?: number
          options?: Json
          order_hint?: number
          question_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          level_achieved: string | null
          photo_url: string | null
          rating: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          level_achieved?: string | null
          photo_url?: string | null
          rating: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          level_achieved?: string | null
          photo_url?: string | null
          rating?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_access_plan: {
        Row: {
          credits_included: number
          currency: string
          id: string
          is_active: boolean
          price: number
          updated_at: string
        }
        Insert: {
          credits_included: number
          currency?: string
          id?: string
          is_active?: boolean
          price: number
          updated_at?: string
        }
        Update: {
          credits_included?: number
          currency?: string
          id?: string
          is_active?: boolean
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      test_sessions: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          level_result: Database["public"]["Enums"]["cecrl_level"] | null
          per_category_scores: Json
          score: number | null
          skill_scores: Json | null
          started_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          level_result?: Database["public"]["Enums"]["cecrl_level"] | null
          per_category_scores?: Json
          score?: number | null
          skill_scores?: Json | null
          started_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          level_result?: Database["public"]["Enums"]["cecrl_level"] | null
          per_category_scores?: Json
          score?: number | null
          skill_scores?: Json | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          comment: string
          created_at: string
          display_name: string
          display_on_homepage: boolean
          id: string
          is_anonymous: boolean
          is_approved: boolean
          rating: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string
          display_name: string
          display_on_homepage?: boolean
          id?: string
          is_anonymous?: boolean
          is_approved?: boolean
          rating: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          display_name?: string
          display_on_homepage?: boolean
          id?: string
          is_anonymous?: boolean
          is_approved?: boolean
          rating?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_dashboard_stats: { Args: never; Returns: Json }
      get_profile_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_duration_seconds: number
          best_level: string
          best_score: number
          completed_tests: number
          last_level: string
          last_score: number
          total_tests: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      start_test_session: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user" | "owner" | "moderator"
      cecrl_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
      level_range: "A1-A2" | "B1-B2" | "C1-C2"
      payment_status: "pending" | "success" | "failed" | "cancelled"
      question_category:
        | "grammar"
        | "vocabulary"
        | "reading"
        | "listening"
        | "speaking"
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
    Enums: {
      app_role: ["admin", "user", "owner", "moderator"],
      cecrl_level: ["A1", "A2", "B1", "B2", "C1", "C2"],
      level_range: ["A1-A2", "B1-B2", "C1-C2"],
      payment_status: ["pending", "success", "failed", "cancelled"],
      question_category: [
        "grammar",
        "vocabulary",
        "reading",
        "listening",
        "speaking",
      ],
    },
  },
} as const
