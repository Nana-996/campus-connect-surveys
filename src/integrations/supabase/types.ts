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
    PostgrestVersion: "14.17"
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
      donations: {
        Row: {
          amount_ghs_pesewas: number
          created_at: string
          donor_email: string
          donor_name: string
          frequency: string
          id: string
          message: string | null
          paid_at: string | null
          paystack_reference: string
          raw: Json | null
          receipt_number: string | null
          receipt_sent_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_ghs_pesewas: number
          created_at?: string
          donor_email: string
          donor_name?: string
          frequency?: string
          id?: string
          message?: string | null
          paid_at?: string | null
          paystack_reference: string
          raw?: Json | null
          receipt_number?: string | null
          receipt_sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_ghs_pesewas?: number
          created_at?: string
          donor_email?: string
          donor_name?: string
          frequency?: string
          id?: string
          message?: string | null
          paid_at?: string | null
          paystack_reference?: string
          raw?: Json | null
          receipt_number?: string | null
          receipt_sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      faculty_student_watchlist: {
        Row: {
          added_at: string
          faculty_user_id: string
          student_user_id: string
        }
        Insert: {
          added_at?: string
          faculty_user_id: string
          student_user_id: string
        }
        Update: {
          added_at?: string
          faculty_user_id?: string
          student_user_id?: string
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
      lecturers: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          full_name: string
          id: string
          title: string | null
          university_domain: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          title?: string | null
          university_domain: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          title?: string | null
          university_domain?: string
          updated_at?: string
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
          refunded_at: string | null
          refunded_credits: number
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
          refunded_at?: string | null
          refunded_credits?: number
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
          refunded_at?: string | null
          refunded_credits?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      paystack_purchases: {
        Row: {
          amount_ghs_kobo: number
          amount_usd: number
          bundle_id: string
          created_at: string
          credited_at: string | null
          credits: number
          id: string
          raw: Json | null
          reference: string
          status: string
          user_id: string
        }
        Insert: {
          amount_ghs_kobo: number
          amount_usd: number
          bundle_id: string
          created_at?: string
          credited_at?: string | null
          credits: number
          id?: string
          raw?: Json | null
          reference: string
          status?: string
          user_id: string
        }
        Update: {
          amount_ghs_kobo?: number
          amount_usd?: number
          bundle_id?: string
          created_at?: string
          credited_at?: string | null
          credits?: number
          id?: string
          raw?: Json | null
          reference?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      poll_responses: {
        Row: {
          answer: string
          created_at: string
          id: string
          poll_id: string
          respondent_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          poll_id: string
          respondent_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          poll_id?: string
          respondent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          creator_id: string
          expires_at: string
          id: string
          is_active: boolean
          options: string[]
          question: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          expires_at?: string
          id?: string
          is_active?: boolean
          options?: string[]
          question: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          options?: string[]
          question?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_range: string | null
          country: string | null
          created_at: string
          demographics_updated_at: string | null
          department: string
          earned_credits: number
          email_hash: string | null
          flag_reason: string | null
          full_name: string
          graduation_date: string | null
          id: string
          index_number: string | null
          interests: string[]
          interests_raw: string[]
          is_flagged: boolean
          paid_credits: number
          referral_code: string | null
          university_domain: string
          university_name: string
          university_pick_limit: number
          user_type: string
          year: string
        }
        Insert: {
          age_range?: string | null
          country?: string | null
          created_at?: string
          demographics_updated_at?: string | null
          department?: string
          earned_credits?: number
          email_hash?: string | null
          flag_reason?: string | null
          full_name?: string
          graduation_date?: string | null
          id: string
          index_number?: string | null
          interests?: string[]
          interests_raw?: string[]
          is_flagged?: boolean
          paid_credits?: number
          referral_code?: string | null
          university_domain?: string
          university_name?: string
          university_pick_limit?: number
          user_type?: string
          year?: string
        }
        Update: {
          age_range?: string | null
          country?: string | null
          created_at?: string
          demographics_updated_at?: string | null
          department?: string
          earned_credits?: number
          email_hash?: string | null
          flag_reason?: string | null
          full_name?: string
          graduation_date?: string | null
          id?: string
          index_number?: string | null
          interests?: string[]
          interests_raw?: string[]
          is_flagged?: boolean
          paid_credits?: number
          referral_code?: string | null
          university_domain?: string
          university_name?: string
          university_pick_limit?: number
          user_type?: string
          year?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          credits_awarded: number
          id: string
          referred_user_id: string
          referred_user_type: string
          referrer_id: string
          wallet: string
        }
        Insert: {
          created_at?: string
          credits_awarded?: number
          id?: string
          referred_user_id: string
          referred_user_type: string
          referrer_id: string
          wallet: string
        }
        Update: {
          created_at?: string
          credits_awarded?: number
          id?: string
          referred_user_id?: string
          referred_user_type?: string
          referrer_id?: string
          wallet?: string
        }
        Relationships: []
      }
      research_boosts: {
        Row: {
          activated_at: string | null
          boost_tier: string
          created_at: string
          expires_at: string | null
          id: string
          paystack_reference: string
          price_ghs_pesewas: number
          raw: Json | null
          status: string
          survey_id: string | null
          target_responses: number
          targeting: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          boost_tier: string
          created_at?: string
          expires_at?: string | null
          id?: string
          paystack_reference: string
          price_ghs_pesewas: number
          raw?: Json | null
          status?: string
          survey_id?: string | null
          target_responses: number
          targeting?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          boost_tier?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          paystack_reference?: string
          price_ghs_pesewas?: number
          raw?: Json | null
          status?: string
          survey_id?: string | null
          target_responses?: number
          targeting?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_boosts_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
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
      school_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          id: string
          revoked: boolean
          role: string
          school_domain: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          revoked?: boolean
          role: string
          school_domain: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          revoked?: boolean
          role?: string
          school_domain?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_invites_school_domain_fkey"
            columns: ["school_domain"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["domain"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          platform: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          platform: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          platform?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      survey_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by: string
          survey_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_invites_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
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
      survey_tracking_access: {
        Row: {
          created_at: string
          faculty_user_id: string
          granted_by: string | null
          id: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          faculty_user_id: string
          granted_by?: string | null
          id?: string
          survey_id: string
        }
        Update: {
          created_at?: string
          faculty_user_id?: string
          granted_by?: string | null
          id?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_tracking_access_survey_id_fkey"
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
          course_code: string | null
          created_at: string
          creator_id: string
          description: string
          expires_at: string
          id: string
          is_active: boolean
          is_evaluation: boolean
          lecturer_id: string | null
          min_response_seconds: number
          paid_cost: number
          questions: Json
          required_criteria: string[]
          respondent_bonus: number
          response_count: number
          response_goal: number
          target_age_range: string | null
          target_country: string | null
          target_department: string | null
          target_interests: string[]
          target_universities: string[]
          target_year: string | null
          tier: string
          title: string
          university_domain: string
          visibility: string
        }
        Insert: {
          allow_general_respondents?: boolean
          boosted_until?: string | null
          course_code?: string | null
          created_at?: string
          creator_id: string
          description?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          is_evaluation?: boolean
          lecturer_id?: string | null
          min_response_seconds?: number
          paid_cost?: number
          questions?: Json
          required_criteria?: string[]
          respondent_bonus?: number
          response_count?: number
          response_goal?: number
          target_age_range?: string | null
          target_country?: string | null
          target_department?: string | null
          target_interests?: string[]
          target_universities?: string[]
          target_year?: string | null
          tier?: string
          title: string
          university_domain: string
          visibility?: string
        }
        Update: {
          allow_general_respondents?: boolean
          boosted_until?: string | null
          course_code?: string | null
          created_at?: string
          creator_id?: string
          description?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          is_evaluation?: boolean
          lecturer_id?: string | null
          min_response_seconds?: number
          paid_cost?: number
          questions?: Json
          required_criteria?: string[]
          respondent_bonus?: number
          response_count?: number
          response_goal?: number
          target_age_range?: string | null
          target_country?: string | null
          target_department?: string | null
          target_interests?: string[]
          target_universities?: string[]
          target_year?: string | null
          tier?: string
          title?: string
          university_domain?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "lecturers"
            referencedColumns: ["id"]
          },
        ]
      }
      university_slot_purchases: {
        Row: {
          created_at: string
          granted_at: string | null
          id: string
          paystack_reference: string
          price_ghs_pesewas: number
          raw: Json | null
          slots: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string | null
          id?: string
          paystack_reference: string
          price_ghs_pesewas: number
          raw?: Json | null
          slots?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string | null
          id?: string
          paystack_reference?: string
          price_ghs_pesewas?: number
          raw?: Json | null
          slots?: number
          status?: string
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
      accept_school_invite: { Args: { _token: string }; Returns: Json }
      activate_research_boost: {
        Args: { _raw?: Json; _reference: string }
        Returns: Json
      }
      admin_add_disposable_domain: {
        Args: { _domain: string }
        Returns: boolean
      }
      admin_create_school_invite: {
        Args: {
          _domain: string
          _email?: string
          _expires_days?: number
          _role: string
        }
        Returns: {
          expires_at: string
          id: string
          token: string
        }[]
      }
      admin_dashboard_metrics: { Args: never; Returns: Json }
      admin_delete_survey: { Args: { _survey_id: string }; Returns: boolean }
      admin_exists: { Args: never; Returns: boolean }
      admin_grant_admin_by_email: { Args: { _email: string }; Returns: string }
      admin_grant_credits: {
        Args: { _amount: number; _reason?: string; _target_user_id: string }
        Returns: Json
      }
      admin_grant_survey_tracking_access_by_email: {
        Args: { _email: string; _survey_id: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      admin_list_disposable_domains: {
        Args: never
        Returns: {
          created_at: string
          domain: string
        }[]
      }
      admin_list_open_flags: {
        Args: never
        Returns: {
          created_at: string
          details: Json
          id: string
          resolved: boolean
          type: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "review_flags"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_research_boosts: {
        Args: never
        Returns: {
          activated_at: string
          boost_tier: string
          buyer_name: string
          created_at: string
          delivered: number
          expires_at: string
          id: string
          price_ghs_pesewas: number
          status: string
          survey_id: string
          survey_title: string
          target_responses: number
          targeting: Json
          user_id: string
        }[]
      }
      admin_list_school_invites: {
        Args: { _domain: string }
        Returns: {
          accepted_at: string
          created_at: string
          email: string
          expires_at: string
          id: string
          revoked: boolean
          role: string
          token: string
        }[]
      }
      admin_list_schools: {
        Args: never
        Returns: {
          created_at: string
          domain: string
          id: string
          is_active: boolean
          name: string
          open_invites: number
        }[]
      }
      admin_list_survey_tracking_access: {
        Args: { _survey_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          university_domain: string
          user_id: string
        }[]
      }
      admin_list_surveys: {
        Args: never
        Returns: {
          allow_general_respondents: boolean
          created_at: string
          creator_id: string
          creator_name: string
          expires_at: string
          id: string
          is_active: boolean
          response_count: number
          response_goal: number
          target_department: string
          target_year: string
          tier: string
          title: string
          tracking_grants: number
          university_domain: string
        }[]
      }
      admin_list_users: {
        Args: { _search?: string }
        Returns: {
          created_at: string
          earned_credits: number
          flag_reason: string
          full_name: string
          id: string
          is_flagged: boolean
          paid_credits: number
          roles: Database["public"]["Enums"]["app_role"][]
          university_domain: string
          university_name: string
          user_type: string
        }[]
      }
      admin_remove_disposable_domain: {
        Args: { _domain: string }
        Returns: boolean
      }
      admin_resolve_flag: { Args: { _id: string }; Returns: boolean }
      admin_revoke_school_invite: { Args: { _id: string }; Returns: boolean }
      admin_revoke_survey_tracking_access: {
        Args: { _faculty_user_id: string; _survey_id: string }
        Returns: boolean
      }
      admin_set_school_active: {
        Args: { _active: boolean; _domain: string }
        Returns: boolean
      }
      admin_set_survey_active: {
        Args: { _active: boolean; _survey_id: string }
        Returns: boolean
      }
      admin_set_user_flag: {
        Args: { _flagged: boolean; _reason?: string; _target_user_id: string }
        Returns: boolean
      }
      admin_set_user_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      admin_set_user_university: {
        Args: { _target_user_id: string; _university_name: string }
        Returns: boolean
      }
      admin_upsert_school: {
        Args: { _domain: string; _name: string }
        Returns: string
      }
      begin_survey_response: { Args: { _survey_id: string }; Returns: string }
      bootstrap_first_admin: { Args: never; Returns: boolean }
      can_track_survey: {
        Args: { _survey_id: string; _user_id?: string }
        Returns: boolean
      }
      claim_referral: { Args: { _code: string }; Returns: Json }
      credit_paystack_purchase: {
        Args: { _raw: Json; _reference: string }
        Returns: undefined
      }
      current_age_range: { Args: never; Returns: string }
      current_country: { Args: never; Returns: string }
      current_department: { Args: never; Returns: string }
      current_interests: { Args: never; Returns: string[] }
      current_university_domain: { Args: never; Returns: string }
      current_user_matches_admin_email: { Args: never; Returns: boolean }
      current_year: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      estimate_survey_reach: {
        Args: {
          _age_range?: string
          _allow_general: boolean
          _country?: string
          _department?: string
          _interests?: string[]
          _required?: string[]
          _universities?: string[]
          _year?: string
        }
        Returns: Json
      }
      expire_earned_credits: { Args: never; Returns: undefined }
      faculty_add_to_watchlist: {
        Args: { _student_user_id: string }
        Returns: boolean
      }
      faculty_get_student_detail: {
        Args: { _student_user_id: string }
        Returns: {
          created_at: string
          creator_name: string
          duration_ms: number
          expires_at: string
          is_active: boolean
          quality_score: number
          responded: boolean
          responded_at: string
          survey_id: string
          target_department: string
          target_year: string
          title: string
        }[]
      }
      faculty_list_watchlist: {
        Args: never
        Returns: {
          added_at: string
          department: string
          full_name: string
          index_number: string
          last_activity: string
          student_id: string
          surveys_available: number
          surveys_pending: number
          surveys_responded: number
          year: string
        }[]
      }
      faculty_remove_from_watchlist: {
        Args: { _student_user_id: string }
        Returns: boolean
      }
      faculty_search_student_by_index: {
        Args: { _index_number: string }
        Returns: {
          already_on_watchlist: boolean
          department: string
          full_name: string
          index_number: string
          student_id: string
          year: string
        }[]
      }
      faculty_set_my_university: {
        Args: { _university_name: string }
        Returns: boolean
      }
      get_my_manager_scope: { Args: never; Returns: Json }
      get_poll_results: {
        Args: { _poll_id: string }
        Returns: {
          answer: string
          count: number
        }[]
      }
      get_school_invite: { Args: { _token: string }; Returns: Json }
      get_shared_dashboard: { Args: { _token: string }; Returns: Json }
      get_survey_questions_for_tracker: {
        Args: { _survey_id: string }
        Returns: {
          id: string
          questions: Json
          title: string
        }[]
      }
      get_survey_responses_for_manager: {
        Args: { _survey_id: string }
        Returns: {
          answers: Json
          created_at: string
          department: string
          duration_ms: number
          full_name: string
          index_number: string
          is_identified: boolean
          quality_score: number
          respondent_label: string
          response_id: string
          user_type: string
          year: string
        }[]
      }
      get_survey_share_card: { Args: { _survey_id: string }; Returns: Json }
      get_survey_tracking_scope: { Args: { _survey_id: string }; Returns: Json }
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
      grant_purchased_credits: {
        Args: {
          _amount_minor: number
          _credits: number
          _currency: string
          _pack_label: string
          _payload: Json
          _reference: string
          _user_id: string
        }
        Returns: boolean
      }
      grant_university_slots: {
        Args: { _raw?: Json; _reference: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_academic_domain: { Args: { _domain: string }; Returns: boolean }
      is_alumni: { Args: { _user_id: string }; Returns: boolean }
      is_student_eligible: { Args: { _user_id?: string }; Returns: boolean }
      is_survey_invited: { Args: { _survey_id: string }; Returns: boolean }
      list_lecturer_evaluations: {
        Args: { _lecturer_id: string }
        Returns: {
          course_code: string
          created_at: string
          expires_at: string
          is_active: boolean
          response_count: number
          response_goal: number
          survey_id: string
          title: string
        }[]
      }
      list_universities: {
        Args: never
        Returns: {
          domain: string
          members: number
          name: string
        }[]
      }
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
      mark_donation_paid: {
        Args: { _raw: Json; _reference: string }
        Returns: {
          amount_ghs_pesewas: number
          created_at: string
          donor_email: string
          donor_name: string
          frequency: string
          id: string
          message: string | null
          paid_at: string | null
          paystack_reference: string
          raw: Json | null
          receipt_number: string | null
          receipt_sent_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "donations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_referral_code: { Args: never; Returns: string }
      new_referral_code: { Args: never; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refund_purchased_credits: {
        Args: {
          _amount_minor: number
          _payload: Json
          _reference: string
          _refund_reference: string
        }
        Returns: boolean
      }
      require_admin_user: { Args: never; Returns: string }
      target_text_matches: {
        Args: { _actual: string; _target: string }
        Returns: boolean
      }
      update_my_student_info: {
        Args: { _department: string; _index_number: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager" | "faculty"
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
      app_role: ["admin", "user", "manager", "faculty"],
    },
  },
} as const
