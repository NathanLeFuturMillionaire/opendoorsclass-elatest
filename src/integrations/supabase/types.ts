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
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          language: string | null
          reason: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          language?: string | null
          reason: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          language?: string | null
          reason?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_adjustments: {
        Row: {
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          label?: string
          updated_at?: string
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
      notification_deliveries: {
        Row: {
          created_at: string
          error: string | null
          event_key: string | null
          id: string
          notification_id: string | null
          sent_at: string | null
          status: string
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_key?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_key?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          created_at: string
          event_key: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
        }
        Insert: {
          created_at?: string
          event_key: string
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
        }
        Update: {
          created_at?: string
          event_key?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          attendance_enabled: boolean
          created_at: string
          locale: string
          payment_enabled: boolean
          push_enabled: boolean
          student_enabled: boolean
          system_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_enabled?: boolean
          created_at?: string
          locale?: string
          payment_enabled?: boolean
          push_enabled?: boolean
          student_enabled?: boolean
          system_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_enabled?: boolean
          created_at?: string
          locale?: string
          payment_enabled?: boolean
          push_enabled?: boolean
          student_enabled?: boolean
          system_enabled?: boolean
          updated_at?: string
          user_id?: string
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
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
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
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type?: string
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
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
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
      payments_archive: {
        Row: {
          amount: number
          archived_at: string
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
          archived_at?: string
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
          archived_at?: string
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
      pricing_promotion: {
        Row: {
          created_at: string
          credits_included: number
          currency: string
          ends_at: string
          id: string
          is_enabled: boolean
          normal_price: number
          normal_product_id: string
          promo_price: number
          promo_product_id: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_included?: number
          currency?: string
          ends_at: string
          id?: string
          is_enabled?: boolean
          normal_price: number
          normal_product_id: string
          promo_price: number
          promo_product_id: string
          starts_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_included?: number
          currency?: string
          ends_at?: string
          id?: string
          is_enabled?: boolean
          normal_price?: number
          normal_product_id?: string
          promo_price?: number
          promo_product_id?: string
          starts_at?: string
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
      push_subscriptions: {
        Row: {
          auth: string
          browser: string | null
          created_at: string
          device_name: string | null
          endpoint: string
          id: string
          is_active: boolean
          last_used_at: string | null
          p256dh: string
          platform: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          browser?: string | null
          created_at?: string
          device_name?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh: string
          platform?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          browser?: string | null
          created_at?: string
          device_name?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh?: string
          platform?: string | null
          updated_at?: string
          user_id?: string
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
          explanation: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          is_active: boolean
          language: string
          level: Database["public"]["Enums"]["cecrl_level"]
          max_plays: number
          options: Json
          order_hint: number
          points: number
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
          explanation?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_active?: boolean
          language?: string
          level: Database["public"]["Enums"]["cecrl_level"]
          max_plays?: number
          options: Json
          order_hint?: number
          points?: number
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
          explanation?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_active?: boolean
          language?: string
          level?: Database["public"]["Enums"]["cecrl_level"]
          max_plays?: number
          options?: Json
          order_hint?: number
          points?: number
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
      rw_answers: {
        Row: {
          answer: string
          coach_comment: string | null
          created_at: string
          expected: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          learner_id: string
          lesson_id: string
          max_points: number
          points: number | null
          question_index: number
          question_type: string
          status: string
          updated_at: string
        }
        Insert: {
          answer: string
          coach_comment?: string | null
          created_at?: string
          expected?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          learner_id: string
          lesson_id: string
          max_points?: number
          points?: number | null
          question_index: number
          question_type?: string
          status: string
          updated_at?: string
        }
        Update: {
          answer?: string
          coach_comment?: string | null
          created_at?: string
          expected?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          learner_id?: string
          lesson_id?: string
          max_points?: number
          points?: number | null
          question_index?: number
          question_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_answers_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "rw_learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rw_answers_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "rw_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_chat_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      rw_chat_conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kind: string
          last_message_at: string
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          kind: string
          last_message_at?: string
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          last_message_at?: string
          title?: string | null
        }
        Relationships: []
      }
      rw_chat_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string
          last_seen_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string
          last_seen_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string
          last_seen_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_chat_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "rw_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_chat_messages: {
        Row: {
          attachment_kind: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          pinned: boolean
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          attachment_kind?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body?: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          pinned?: boolean
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          attachment_kind?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          pinned?: boolean
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "rw_chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rw_chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "rw_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_chat_moderation_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          detail: string | null
          id: string
          message_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          detail?: string | null
          id?: string
          message_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          message_id?: string | null
        }
        Relationships: []
      }
      rw_chat_reactions: {
        Row: {
          conversation_id: string
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "rw_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_chat_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_chat_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "rw_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_coaches: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          photo_path: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          photo_path?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          photo_path?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rw_learners: {
        Row: {
          coach_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          level: Database["public"]["Enums"]["rw_level"]
          photo_path: string | null
          start_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["rw_level"]
          photo_path?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["rw_level"]
          photo_path?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rw_learners_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "rw_coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_lessons: {
        Row: {
          body: string
          content_type: string | null
          created_at: string
          discussion: Json
          grammar: Json
          id: string
          knowledge_point: string | null
          level: Database["public"]["Enums"]["rw_level"]
          mention: string
          published_at: string | null
          published_by: string | null
          questions: Json
          rights_status: string | null
          session_id: string
          source_author: string | null
          source_date: string | null
          source_institution: string | null
          source_title: string | null
          source_url: string | null
          status: string
          summary_fr: string | null
          title: string
          translation_fr: string | null
          updated_at: string
          vocabulary: Json
          word_count: number
        }
        Insert: {
          body?: string
          content_type?: string | null
          created_at?: string
          discussion?: Json
          grammar?: Json
          id?: string
          knowledge_point?: string | null
          level: Database["public"]["Enums"]["rw_level"]
          mention?: string
          published_at?: string | null
          published_by?: string | null
          questions?: Json
          rights_status?: string | null
          session_id: string
          source_author?: string | null
          source_date?: string | null
          source_institution?: string | null
          source_title?: string | null
          source_url?: string | null
          status?: string
          summary_fr?: string | null
          title: string
          translation_fr?: string | null
          updated_at?: string
          vocabulary?: Json
          word_count?: number
        }
        Update: {
          body?: string
          content_type?: string | null
          created_at?: string
          discussion?: Json
          grammar?: Json
          id?: string
          knowledge_point?: string | null
          level?: Database["public"]["Enums"]["rw_level"]
          mention?: string
          published_at?: string | null
          published_by?: string | null
          questions?: Json
          rights_status?: string | null
          session_id?: string
          source_author?: string | null
          source_date?: string | null
          source_institution?: string | null
          source_title?: string | null
          source_url?: string | null
          status?: string
          summary_fr?: string | null
          title?: string
          translation_fr?: string | null
          updated_at?: string
          vocabulary?: Json
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "rw_lessons_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rw_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_removal_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          moved_learners: number
          pending_reviews: number
          reason: string
          reassigned_to: string | null
          target_id: string
          target_kind: string
          target_name: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          moved_learners?: number
          pending_reviews?: number
          reason: string
          reassigned_to?: string | null
          target_id: string
          target_kind: string
          target_name: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          moved_learners?: number
          pending_reviews?: number
          reason?: string
          reassigned_to?: string | null
          target_id?: string
          target_kind?: string
          target_name?: string
        }
        Relationships: []
      }
      rw_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_visible: boolean
          learner_id: string
          rating: number
          would_recommend: boolean
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_visible?: boolean
          learner_id: string
          rating: number
          would_recommend: boolean
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          learner_id?: string
          rating?: number
          would_recommend?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rw_reviews_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: true
            referencedRelation: "rw_learners"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_saved_words: {
        Row: {
          created_at: string
          id: string
          lesson_id: string | null
          part_of_speech: string | null
          phonetic: string | null
          sentence: string | null
          translation_fr: string
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          part_of_speech?: string | null
          phonetic?: string | null
          sentence?: string | null
          translation_fr: string
          user_id?: string
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          part_of_speech?: string | null
          phonetic?: string | null
          sentence?: string | null
          translation_fr?: string
          user_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_saved_words_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "rw_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_schedule_exceptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          kind: string
          message: string | null
          starts_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          kind: string
          message?: string | null
          starts_at: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          kind?: string
          message?: string | null
          starts_at?: string
        }
        Relationships: []
      }
      rw_schedule_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          details: Json
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          details?: Json
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          details?: Json
          id?: string
        }
        Relationships: []
      }
      rw_schedule_settings: {
        Row: {
          close_time: string
          closed_message: string | null
          days: number[]
          id: boolean
          open_time: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          close_time?: string
          closed_message?: string | null
          days?: number[]
          id?: boolean
          open_time?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          close_time?: string
          closed_message?: string | null
          days?: number[]
          id?: boolean
          open_time?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      rw_sessions: {
        Row: {
          created_at: string
          day_index: number
          id: string
          title: string
          week_id: string
        }
        Insert: {
          created_at?: string
          day_index: number
          id?: string
          title: string
          week_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          id?: string
          title?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_sessions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "rw_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_submission_history: {
        Row: {
          actor: string | null
          created_at: string
          feedback: string | null
          id: string
          learner_id: string
          lesson_id: string
          new_status: string
          old_status: string | null
          score: number | null
          submission_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          learner_id: string
          lesson_id: string
          new_status: string
          old_status?: string | null
          score?: number | null
          submission_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          learner_id?: string
          lesson_id?: string
          new_status?: string
          old_status?: string | null
          score?: number | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_submission_history_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "rw_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_submissions: {
        Row: {
          coach_feedback: string | null
          created_at: string
          fluency_score: number | null
          id: string
          kind: string
          learner_id: string
          learner_note: string | null
          lesson_id: string
          mime_type: string | null
          pronunciation_score: number | null
          reading_score: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          rework_passages: string | null
          score: number | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["rw_submission_status"]
          storage_path: string
          updated_at: string
        }
        Insert: {
          coach_feedback?: string | null
          created_at?: string
          fluency_score?: number | null
          id?: string
          kind: string
          learner_id: string
          learner_note?: string | null
          lesson_id: string
          mime_type?: string | null
          pronunciation_score?: number | null
          reading_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rework_passages?: string | null
          score?: number | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["rw_submission_status"]
          storage_path: string
          updated_at?: string
        }
        Update: {
          coach_feedback?: string | null
          created_at?: string
          fluency_score?: number | null
          id?: string
          kind?: string
          learner_id?: string
          learner_note?: string | null
          lesson_id?: string
          mime_type?: string | null
          pronunciation_score?: number | null
          reading_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rework_passages?: string | null
          score?: number | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["rw_submission_status"]
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_submissions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "rw_learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rw_submissions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "rw_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_trace_characters: {
        Row: {
          attempts: number
          character: string
          character_index: number
          coverage: number
          duration_ms: number
          exercise_id: string
          id: string
          invalid_attempts: number
          learner_id: string
          precision: number
          score: number
          sentence_index: number
          stroke_coverage: number
          trace: Json
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          attempts?: number
          character: string
          character_index: number
          coverage: number
          duration_ms?: number
          exercise_id: string
          id?: string
          invalid_attempts?: number
          learner_id: string
          precision: number
          score: number
          sentence_index: number
          stroke_coverage: number
          trace?: Json
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          attempts?: number
          character?: string
          character_index?: number
          coverage?: number
          duration_ms?: number
          exercise_id?: string
          id?: string
          invalid_attempts?: number
          learner_id?: string
          precision?: number
          score?: number
          sentence_index?: number
          stroke_coverage?: number
          trace?: Json
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rw_trace_characters_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "rw_trace_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rw_trace_characters_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "rw_learners"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_trace_exercises: {
        Row: {
          completed_at: string | null
          current_character: number
          current_sentence: number
          grammar_index: number
          grammar_point: string
          id: string
          invalid_attempts: number
          learner_id: string
          lesson_id: string
          score: number | null
          sentences: Json
          started_at: string
          status: string
          total_attempts: number
          total_duration_ms: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          current_character?: number
          current_sentence?: number
          grammar_index: number
          grammar_point: string
          id?: string
          invalid_attempts?: number
          learner_id: string
          lesson_id: string
          score?: number | null
          sentences: Json
          started_at?: string
          status?: string
          total_attempts?: number
          total_duration_ms?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          current_character?: number
          current_sentence?: number
          grammar_index?: number
          grammar_point?: string
          id?: string
          invalid_attempts?: number
          learner_id?: string
          lesson_id?: string
          score?: number | null
          sentences?: Json
          started_at?: string
          status?: string
          total_attempts?: number
          total_duration_ms?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_trace_exercises_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "rw_learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rw_trace_exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "rw_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_unlock_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          learner_id: string
          lesson_id: string
          reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          learner_id: string
          lesson_id: string
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          learner_id?: string
          lesson_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_unlock_overrides_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "rw_learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rw_unlock_overrides_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "rw_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_weekly_challenge_weeks: {
        Row: {
          finalized_at: string
          week_start: string
        }
        Insert: {
          finalized_at?: string
          week_start: string
        }
        Update: {
          finalized_at?: string
          week_start?: string
        }
        Relationships: []
      }
      rw_weekly_challenge_winners: {
        Row: {
          completed_at: string | null
          created_at: string
          first_name: string
          learner_id: string
          photo_path: string | null
          progress: number
          rank: number
          validated_count: number
          week_start: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          first_name: string
          learner_id: string
          photo_path?: string | null
          progress: number
          rank: number
          validated_count: number
          week_start: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          first_name?: string
          learner_id?: string
          photo_path?: string | null
          progress?: number
          rank?: number
          validated_count?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_weekly_challenge_winners_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "rw_learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rw_weekly_challenge_winners_week_start_fkey"
            columns: ["week_start"]
            isOneToOne: false
            referencedRelation: "rw_weekly_challenge_weeks"
            referencedColumns: ["week_start"]
          },
        ]
      }
      rw_weeks: {
        Row: {
          created_at: string
          id: string
          title: string
          week_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          week_number: number
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          week_number?: number
        }
        Relationships: []
      }
      speaking_ai_access: {
        Row: {
          blocked_at: string
          denial_message: string
          model: string
          status_code: number
        }
        Insert: {
          blocked_at?: string
          denial_message: string
          model: string
          status_code: number
        }
        Update: {
          blocked_at?: string
          denial_message?: string
          model?: string
          status_code?: number
        }
        Relationships: []
      }
      speaking_recordings: {
        Row: {
          created_at: string
          error_message: string | null
          feedback: string | null
          id: string
          question_id: string
          score: number | null
          session_id: string
          status: string
          storage_path: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          feedback?: string | null
          id?: string
          question_id: string
          score?: number | null
          session_id: string
          status?: string
          storage_path: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          feedback?: string | null
          id?: string
          question_id?: string
          score?: number | null
          session_id?: string
          status?: string
          storage_path?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaking_recordings_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaking_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          credits_consumed: number
          current_question: number
          current_section: string | null
          duration_seconds: number | null
          id: string
          language: string
          level_result: Database["public"]["Enums"]["cecrl_level"] | null
          per_category_scores: Json
          progress: Json
          question_ids: string[]
          score: number | null
          skill_scores: Json | null
          started_at: string
          status: Database["public"]["Enums"]["assessment_status"]
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          credits_consumed?: number
          current_question?: number
          current_section?: string | null
          duration_seconds?: number | null
          id?: string
          language?: string
          level_result?: Database["public"]["Enums"]["cecrl_level"] | null
          per_category_scores?: Json
          progress?: Json
          question_ids?: string[]
          score?: number | null
          skill_scores?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          credits_consumed?: number
          current_question?: number
          current_section?: string | null
          duration_seconds?: number | null
          id?: string
          language?: string
          level_result?: Database["public"]["Enums"]["cecrl_level"] | null
          per_category_scores?: Json
          progress?: Json
          question_ids?: string[]
          score?: number | null
          skill_scores?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_status"]
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
      abandon_assessment_session: {
        Args: { _actor: string; _session_id: string }
        Returns: Json
      }
      admin_dashboard_stats: { Args: { _actor?: string }; Returns: Json }
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
        Args: { _actor?: string; _limit?: number }
        Returns: Json
      }
      get_gamification_leaderboard: {
        Args: { _actor: string; _limit: number; _scope: string }
        Returns: {
          cefr_level: string
          country: string
          current_level: number
          display_name: string
          rank: number
          total_xp: number
        }[]
      }
      get_gamification_summary: { Args: { _actor: string }; Returns: Json }
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
      rw_chat_block: { Args: { _other: string }; Returns: undefined }
      rw_chat_block_status: {
        Args: { _conv: string }
        Returns: {
          blocked: boolean
          blocked_by_me: boolean
        }[]
      }
      rw_chat_can_contact: { Args: { _other: string }; Returns: boolean }
      rw_chat_close_report: { Args: { _id: string }; Returns: undefined }
      rw_chat_contacts: {
        Args: never
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
      rw_chat_create_group: {
        Args: { _announcement?: boolean; _members: string[]; _title: string }
        Returns: string
      }
      rw_chat_delete: { Args: { _id: string }; Returns: undefined }
      rw_chat_edit: { Args: { _body: string; _id: string }; Returns: undefined }
      rw_chat_is_blocked: { Args: { _a: string; _b: string }; Returns: boolean }
      rw_chat_is_member: {
        Args: { _conv: string; _uid: string }
        Returns: boolean
      }
      rw_chat_mark_read: { Args: { _conv: string }; Returns: undefined }
      rw_chat_mark_seen: { Args: never; Returns: undefined }
      rw_chat_members_of: {
        Args: { _conv: string }
        Returns: {
          full_name: string
          last_read_at: string
          last_seen_at: string
          role: string
          user_id: string
        }[]
      }
      rw_chat_my_conversations: {
        Args: never
        Returns: {
          can_post: boolean
          id: string
          kind: string
          last_body: string
          last_message_at: string
          title: string
          unread: number
        }[]
      }
      rw_chat_name: { Args: { _uid: string }; Returns: string }
      rw_chat_open_direct: { Args: { _other: string }; Returns: string }
      rw_chat_pin: {
        Args: { _id: string; _pinned: boolean }
        Returns: undefined
      }
      rw_chat_react: {
        Args: { _emoji: string; _id: string }
        Returns: undefined
      }
      rw_chat_report: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      rw_chat_send: {
        Args: {
          _body: string
          _conv: string
          _kind?: string
          _name?: string
          _path?: string
          _reply?: string
          _size?: number
        }
        Returns: string
      }
      rw_chat_unblock: { Args: { _other: string }; Returns: undefined }
      rw_coach_id: { Args: { _uid: string }; Returns: string }
      rw_coaches_learner: {
        Args: { _learner: string; _uid: string }
        Returns: boolean
      }
      rw_coaches_learner_folder: {
        Args: { _folder: string; _uid: string }
        Returns: boolean
      }
      rw_finalize_weekly_challenge: {
        Args: { _week_start: string }
        Returns: undefined
      }
      rw_grade_answer: {
        Args: { _answer: string; _comment: string; _points: number }
        Returns: Json
      }
      rw_is_protected_user: { Args: { _uid: string }; Returns: boolean }
      rw_is_staff: { Args: { _uid: string }; Returns: boolean }
      rw_learner_lesson_states: {
        Args: { _learner: string }
        Returns: {
          day_index: number
          lesson_id: string
          pos: number
          state: string
          title: string
          week_number: number
        }[]
      }
      rw_learner_row: {
        Args: { _uid: string }
        Returns: {
          coach_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          level: Database["public"]["Enums"]["rw_level"]
          photo_path: string | null
          start_date: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "rw_learners"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rw_lesson_questions: { Args: { _lesson: string }; Returns: Json }
      rw_lesson_unlocked: {
        Args: { _learner: string; _lesson: string }
        Returns: boolean
      }
      rw_manual_unlock: {
        Args: { _learner: string; _lesson: string; _reason: string }
        Returns: undefined
      }
      rw_my_lesson_states: {
        Args: never
        Returns: {
          day_index: number
          lesson_id: string
          pos: number
          state: string
          title: string
          week_number: number
        }[]
      }
      rw_placement_suggestion: {
        Args: { _email: string }
        Returns: {
          level: string
          tested_at: string
        }[]
      }
      rw_public_reviews: {
        Args: never
        Returns: {
          comment: string
          created_at: string
          display_name: string
          id: string
          level: string
          rating: number
          would_recommend: boolean
        }[]
      }
      rw_review_status: { Args: never; Returns: Json }
      rw_save_answer: {
        Args: { _answer: string; _index: number; _lesson: string }
        Returns: Json
      }
      rw_schedule_add_exception: {
        Args: {
          _ends: string
          _kind: string
          _message: string
          _starts: string
        }
        Returns: string
      }
      rw_schedule_cancel_exception: {
        Args: { _id: string }
        Returns: undefined
      }
      rw_schedule_update: {
        Args: {
          _close: string
          _days: number[]
          _message: string
          _open: string
        }
        Returns: undefined
      }
      rw_send_weekly_report: {
        Args: { _learner: string; _week_start: string }
        Returns: Json
      }
      rw_set_active: {
        Args: {
          _active: boolean
          _id: string
          _kind: string
          _reason: string
          _reassign_to?: string
        }
        Returns: Json
      }
      rw_states_for_learner: {
        Args: { _learner: string }
        Returns: {
          day_index: number
          lesson_id: string
          pos: number
          state: string
          title: string
          week_number: number
        }[]
      }
      rw_submit_review: {
        Args: { _comment: string; _rating: number; _recommend: boolean }
        Returns: undefined
      }
      rw_trace_next_character: {
        Args: { _from: number; _sentence: string }
        Returns: number
      }
      rw_trace_record_attempt: {
        Args: {
          _character_index: number
          _coverage: number
          _duration_ms: number
          _exercise: string
          _out_of_bounds: boolean
          _precision: number
          _sentence_index: number
          _stroke_coverage: number
          _trace: Json
        }
        Returns: Json
      }
      rw_weekly_challenge: { Args: { _weeks_ago?: number }; Returns: Json }
      rw_weekly_challenge_ranked: {
        Args: { _week_start: string }
        Returns: {
          completed_at: string
          first_name: string
          learner_id: string
          photo_path: string
          progress: number
          rank: number
          validated_count: number
        }[]
      }
      rw_workshop_allows: {
        Args: { _grace?: boolean; _uid: string }
        Returns: boolean
      }
      rw_workshop_open_at: { Args: { _ts: string }; Returns: boolean }
      rw_workshop_status: { Args: never; Returns: Json }
      save_english_speaking_answer: {
        Args: {
          _answer: string
          _question: string
          _session: string
          _user: string
        }
        Returns: boolean
      }
      set_leaderboard_opt_in: {
        Args: { _actor: string; _country: string; _opt_in: boolean }
        Returns: Json
      }
      start_assessment_session: {
        Args: { _actor: string; _language: string }
        Returns: Json
      }
      start_test_session: { Args: { _actor: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user" | "owner" | "moderator"
      assessment_status:
        | "not_started"
        | "in_progress"
        | "paused"
        | "completed"
        | "abandoned"
        | "expired"
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
      rw_level: "A1" | "A2" | "B1" | "B2" | "C1"
      rw_submission_status: "submitted" | "redo" | "validated"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      assessment_status: [
        "not_started",
        "in_progress",
        "paused",
        "completed",
        "abandoned",
        "expired",
      ],
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
      rw_level: ["A1", "A2", "B1", "B2", "C1"],
      rw_submission_status: ["submitted", "redo", "validated"],
      subscription_plan: ["standard", "premium"],
    },
  },
} as const
