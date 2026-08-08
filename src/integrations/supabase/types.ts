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
      badges: {
        Row: {
          category: string
          code: string
          created_at: string
          description_en: string
          description_fr: string
          icon: string
          name_en: string
          name_fr: string
          requirement_json: Json
          sort_order: number
          xp_reward: number
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description_en: string
          description_fr: string
          icon?: string
          name_en: string
          name_fr: string
          requirement_json?: Json
          sort_order?: number
          xp_reward?: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description_en?: string
          description_fr?: string
          icon?: string
          name_en?: string
          name_fr?: string
          requirement_json?: Json
          sort_order?: number
          xp_reward?: number
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
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string
          created_at: string
          icon: string
          id: string
          is_read: boolean
          message: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category?: string
          created_at?: string
          icon?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string
          created_at?: string
          icon?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          updated_at?: string
          user_id?: string
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
          offer_code: string | null
          payment_method: string | null
          phone: string | null
          phone_country: string | null
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
          offer_code?: string | null
          payment_method?: string | null
          phone?: string | null
          phone_country?: string | null
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
          offer_code?: string | null
          payment_method?: string | null
          phone?: string | null
          phone_country?: string | null
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
          about: string | null
          ai_recommendations: string | null
          ai_recommendations_at: string | null
          avatar_url: string | null
          candidate_number: string | null
          country: string | null
          created_at: string
          credits_remaining: number
          date_of_birth: string | null
          first_name: string | null
          id: string
          languages_known: string[] | null
          languages_wanted: string[] | null
          last_name: string | null
          nationality: string | null
          objective_text: string | null
          objectives: string[]
          onboarding_completed: boolean
          phone: string | null
          phone_country: string | null
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          plan_activated_at: string | null
          profession: string | null
          sex: string | null
          sex_other: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          ai_recommendations?: string | null
          ai_recommendations_at?: string | null
          avatar_url?: string | null
          candidate_number?: string | null
          country?: string | null
          created_at?: string
          credits_remaining?: number
          date_of_birth?: string | null
          first_name?: string | null
          id: string
          languages_known?: string[] | null
          languages_wanted?: string[] | null
          last_name?: string | null
          nationality?: string | null
          objective_text?: string | null
          objectives?: string[]
          onboarding_completed?: boolean
          phone?: string | null
          phone_country?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          plan_activated_at?: string | null
          profession?: string | null
          sex?: string | null
          sex_other?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          ai_recommendations?: string | null
          ai_recommendations_at?: string | null
          avatar_url?: string | null
          candidate_number?: string | null
          country?: string | null
          created_at?: string
          credits_remaining?: number
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          languages_known?: string[] | null
          languages_wanted?: string[] | null
          last_name?: string | null
          nationality?: string | null
          objective_text?: string | null
          objectives?: string[]
          onboarding_completed?: boolean
          phone?: string | null
          phone_country?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          plan_activated_at?: string | null
          profession?: string | null
          sex?: string | null
          sex_other?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          accent: string | null
          audio_url: string | null
          category: Database["public"]["Enums"]["question_category"]
          correct_answer: string
          created_at: string
          id: string
          image_alt: string | null
          image_url: string | null
          is_active: boolean
          level: Database["public"]["Enums"]["cecrl_level"]
          max_plays: number
          options: Json
          order_hint: number
          question_text: string
          question_type: string
          speech_rate: string | null
          updated_at: string
          voice_gender: string | null
        }
        Insert: {
          accent?: string | null
          audio_url?: string | null
          category: Database["public"]["Enums"]["question_category"]
          correct_answer: string
          created_at?: string
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_active?: boolean
          level: Database["public"]["Enums"]["cecrl_level"]
          max_plays?: number
          options: Json
          order_hint?: number
          question_text: string
          question_type?: string
          speech_rate?: string | null
          updated_at?: string
          voice_gender?: string | null
        }
        Update: {
          accent?: string | null
          audio_url?: string | null
          category?: Database["public"]["Enums"]["question_category"]
          correct_answer?: string
          created_at?: string
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_active?: boolean
          level?: Database["public"]["Enums"]["cecrl_level"]
          max_plays?: number
          options?: Json
          order_hint?: number
          question_text?: string
          question_type?: string
          speech_rate?: string | null
          updated_at?: string
          voice_gender?: string | null
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
      streak_days: {
        Row: {
          day: string
          user_id: string
        }
        Insert: {
          day: string
          user_id: string
        }
        Update: {
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      test_access_plan: {
        Row: {
          chariow_product_id: string | null
          code: string | null
          credits_included: number
          currency: string
          id: string
          is_active: boolean
          label: string | null
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          chariow_product_id?: string | null
          code?: string | null
          credits_included: number
          currency?: string
          id?: string
          is_active?: boolean
          label?: string | null
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          chariow_product_id?: string | null
          code?: string | null
          credits_included?: number
          currency?: string
          id?: string
          is_active?: boolean
          label?: string | null
          price?: number
          sort_order?: number
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
          question_ids: string[]
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
          question_ids?: string[]
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
          question_ids?: string[]
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
      user_badges: {
        Row: {
          badge_code: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_code: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      user_gamification: {
        Row: {
          created_at: string
          current_level: number
          current_streak: number
          display_country: string | null
          last_activity_date: string | null
          leaderboard_opt_in: boolean
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_streak?: number
          display_country?: string | null
          last_activity_date?: string | null
          leaderboard_opt_in?: boolean
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          current_streak?: number
          display_country?: string | null
          last_activity_date?: string | null
          leaderboard_opt_in?: boolean
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
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
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          event_key: string
          event_type: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          event_key: string
          event_type: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          event_key?: string
          event_type?: string
          id?: string
          reason?: string
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
      award_xp: {
        Args: {
          _amount: number
          _event_key: string
          _event_type: string
          _reason: string
          _user_id: string
        }
        Returns: Json
      }
      check_and_award_badges: { Args: { _user_id: string }; Returns: Json }
      compute_open_doors_level: { Args: { _xp: number }; Returns: number }
      get_gamification_admin_overview: {
        Args: { _limit?: number }
        Returns: Json
      }
      get_gamification_leaderboard: {
        Args: { _limit?: number; _scope: string }
        Returns: {
          cefr_level: string
          country: string
          current_level: number
          display_name: string
          rank: number
          total_xp: number
        }[]
      }
      get_gamification_summary: { Args: never; Returns: Json }
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
      process_profile_update: { Args: { _user_id: string }; Returns: Json }
      process_test_completion: { Args: { _session_id: string }; Returns: Json }
      push_notification: {
        Args: {
          _action_label?: string
          _action_url?: string
          _category?: string
          _icon?: string
          _message: string
          _title: string
          _user_id: string
        }
        Returns: string
      }
      record_streak: { Args: { _user_id: string }; Returns: Json }
      set_leaderboard_opt_in: {
        Args: { _country?: string; _opt_in: boolean }
        Returns: Json
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
        | "writing"
        | "orthography"
      subscription_plan: "standard" | "premium"
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
        "writing",
        "orthography",
      ],
      subscription_plan: ["standard", "premium"],
    },
  },
} as const
