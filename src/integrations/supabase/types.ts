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
      credit_ledger: {
        Row: {
          created_at: string
          delta: number
          expires_at: string | null
          id: string
          reason: string
          survey_id: string | null
          user_id: string
          wallet: string
        }
        Insert: {
          created_at?: string
          delta: number
          expires_at?: string | null
          id?: string
          reason: string
          survey_id?: string | null
          user_id: string
          wallet: string
        }
        Update: {
          created_at?: string
          delta?: number
          expires_at?: string | null
          id?: string
          reason?: string
          survey_id?: string | null
          user_id?: string
          wallet?: string
        }
        Relationships: []
      }
      disposable_domains: {
        Row: {
          created_at: string
          domain: string
        }
        Insert: {
          created_at?: string
          domain: string
        }
        Update: {
          created_at?: string
          domain?: string
        }
        Relationships: []
      }
      earning_caps: {
        Row: {
          day_bucket: string
          day_count: number
          updated_at: string
          user_id: string
          week_bucket: string
          week_count: number
        }
        Insert: {
          day_bucket?: string
          day_count?: number
          updated_at?: string
          user_id: string
          week_bucket?: string
          week_count?: number
        }
        Update: {
          day_bucket?: string
          day_count?: number
          updated_at?: string
          user_id?: string
          week_bucket?: string
          week_count?: number
        }
        Relationships: []
      }
      interest_tags: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_minor: number
          created_at: string
          credited_at: string | null
          credits: number
          currency: string
          failure_reason: string | null
          id: string
          pack_label: string | null
          provider: string
          provider_payload: Json
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          credited_at?: string | null
          credits: number
          currency?: string
          failure_reason?: string | null
          id?: string
          pack_label?: string | null
          provider?: string
          provider_payload?: Json
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          credited_at?: string | null
          credits?: number
          currency?: string
          failure_reason?: string | null
          id?: string
          pack_label?: string | null
          provider?: string
          provider_payload?: Json
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_range: string | null
          country: string | null
          created_at: string
          department: string
          earned_credits: number
          email_hash: string | null
          flag_reason: string | null
          full_name: string
          id: string
          index_number: string | null
          interests: string[]
          interests_raw: string[]
          is_flagged: boolean
          paid_credits: number
          university_domain: string
          university_name: string
          user_type: string
          year: string
        }
        Insert: {
          age_range?: string | null
          country?: string | null
          created_at?: string
          department?: string
          earned_credits?: number
          email_hash?: string | null
          flag_reason?: string | null
          full_name?: string
          id: string
          index_number?: string | null
          interests?: string[]
          interests_raw?: string[]
          is_flagged?: boolean
          paid_credits?: number
          university_domain?: string
          university_name?: string
          user_type?: string
          year?: string
        }
        Update: {
          age_range?: string | null
          country?: string | null
          created_at?: string
          department?: string
          earned_credits?: number
          email_hash?: string | null
          flag_reason?: string | null
          full_name?: string
          id?: string
          index_number?: string | null
          interests?: string[]
          interests_raw?: string[]
          is_flagged?: boolean
          paid_credits?: number
          university_domain?: string
          university_name?: string
          user_type?: string
          year?: string
        }
        Relationships: []
      }
      review_flags: {
        Row: {
          created_at: string
          details: Json
          id: string
          resolved: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          resolved?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          resolved?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      survey_report_views: {
        Row: {
          config: Json
          created_at: string
          creator_id: string
          id: string
          name: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          creator_id: string
          id?: string
          name: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          creator_id?: string
          id?: string
          name?: string
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_report_views_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_response_starts: {
        Row: {
          started_at: string
          survey_id: string
          user_id: string
        }
        Insert: {
          started_at?: string
          survey_id: string
          user_id: string
        }
        Update: {
          started_at?: string
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_response_starts_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json
          created_at: string
          duration_ms: number
          id: string
          quality_score: number
          respondent_id: string
          survey_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          duration_ms?: number
          id?: string
          quality_score?: number
          respondent_id: string
          survey_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          duration_ms?: number
          id?: string
          quality_score?: number
          respondent_id?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_share_tokens: {
        Row: {
          created_at: string
          creator_id: string
          expires_at: string | null
          id: string
          revoked: boolean
          survey_id: string
          token: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          expires_at?: string | null
          id?: string
          revoked?: boolean
          survey_id: string
          token: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          expires_at?: string | null
          id?: string
          revoked?: boolean
          survey_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_share_tokens_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_visualizations: {
        Row: {
          chart_type: string
          created_at: string
          id: string
          question_id: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          chart_type?: string
          created_at?: string
          id?: string
          question_id: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          chart_type?: string
          created_at?: string
          id?: string
          question_id?: string
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_visualizations_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          allow_general_respondents: boolean
          boosted_until: string | null
          created_at: string
          creator_id: string
          description: string
          expires_at: string
          id: string
          is_active: boolean
          paid_cost: number
          questions: Json
          respondent_bonus: number
          response_count: number
          response_goal: number
          target_age_range: string | null
          target_country: string | null
          target_department: string | null
          target_interests: string[]
          target_year: string | null
          tier: string
          title: string
          university_domain: string
        }
        Insert: {
          allow_general_respondents?: boolean
          boosted_until?: string | null
          created_at?: string
          creator_id: string
          description?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          paid_cost?: number
          questions?: Json
          respondent_bonus?: number
          response_count?: number
          response_goal?: number
          target_age_range?: string | null
          target_country?: string | null
          target_department?: string | null
          target_interests?: string[]
          target_year?: string | null
          tier?: string
          title: string
          university_domain: string
        }
        Update: {
          allow_general_respondents?: boolean
          boosted_until?: string | null
          created_at?: string
          creator_id?: string
          description?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          paid_cost?: number
          questions?: Json
          respondent_bonus?: number
          response_count?: number
          response_goal?: number
          target_age_range?: string | null
          target_country?: string | null
          target_department?: string | null
          target_interests?: string[]
          target_year?: string | null
          tier?: string
          title?: string
          university_domain?: string
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
      campus_directory: {
        Row: {
          age_range: string | null
          country: string | null
          created_at: string | null
          department: string | null
          full_name: string | null
          id: string | null
          university_domain: string | null
          university_name: string | null
          user_type: string | null
          year: string | null
        }
        Insert: {
          age_range?: string | null
          country?: string | null
          created_at?: string | null
          department?: string | null
          full_name?: string | null
          id?: string | null
          university_domain?: string | null
          university_name?: string | null
          user_type?: string | null
          year?: string | null
        }
        Update: {
          age_range?: string | null
          country?: string | null
          created_at?: string | null
          department?: string | null
          full_name?: string | null
          id?: string | null
          university_domain?: string | null
          university_name?: string | null
          user_type?: string | null
          year?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      begin_survey_response: { Args: { _survey_id: string }; Returns: string }
      current_age_range: { Args: never; Returns: string }
      current_country: { Args: never; Returns: string }
      current_department: { Args: never; Returns: string }
      current_interests: { Args: never; Returns: string[] }
      current_university_domain: { Args: never; Returns: string }
      current_year: { Args: never; Returns: string }
      expire_earned_credits: { Args: never; Returns: undefined }
      get_shared_dashboard: { Args: { _token: string }; Returns: Json }
      get_survey_share_card: { Args: { _survey_id: string }; Returns: Json }
      get_university_survey_tracking: {
        Args: { _survey_id: string }
        Returns: {
          department: string
          full_name: string
          index_number: string
          responded_at: string
          student_id: string
          year: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_academic_domain: { Args: { _domain: string }; Returns: boolean }
      list_university_surveys: {
        Args: never
        Returns: {
          created_at: string
          creator_name: string
          expires_at: string
          id: string
          is_active: boolean
          response_count: number
          response_goal: number
          title: string
        }[]
      }
      update_my_student_info: {
        Args: { _department: string; _index_number: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager"
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
      app_role: ["admin", "user", "manager"],
    },
  },
} as const
