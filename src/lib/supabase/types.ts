export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          method: string | null
          path: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          method?: string | null
          path: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          method?: string | null
          path?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_new: boolean
          published_at: string
          recipient_employee_id: string | null
          sort_order: number
          target_audience: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_new?: boolean
          published_at?: string
          recipient_employee_id?: string | null
          sort_order?: number
          target_audience?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_new?: boolean
          published_at?: string
          recipient_employee_id?: string | null
          sort_order?: number
          target_audience?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_recipient_employee_id_fkey"
            columns: ["recipient_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_role: {
        Row: {
          app_role: string | null
          id: string
          name: string | null
        }
        Insert: {
          app_role?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          app_role?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      app_role_service: {
        Row: {
          app_role_id: string | null
          id: string
          service_id: string | null
        }
        Insert: {
          app_role_id?: string | null
          id?: string
          service_id?: string | null
        }
        Update: {
          app_role_id?: string | null
          id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_role_service_app_role_id_fkey"
            columns: ["app_role_id"]
            isOneToOne: false
            referencedRelation: "app_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_role_service_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_distribution_logs: {
        Row: {
          article_count: number
          articles: Json
          error_message: string | null
          executed_at: string
          id: string
          rule_id: string
          status: string
          tenant_id: string
          triggered_by: string
        }
        Insert: {
          article_count?: number
          articles?: Json
          error_message?: string | null
          executed_at?: string
          id?: string
          rule_id: string
          status: string
          tenant_id: string
          triggered_by?: string
        }
        Update: {
          article_count?: number
          articles?: Json
          error_message?: string | null
          executed_at?: string
          id?: string
          rule_id?: string
          status?: string
          tenant_id?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_distribution_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "auto_distribution_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_distribution_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_distribution_rules: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_articles: number
          name: string
          recipient_emails: string[]
          schedule_day_of_month: number | null
          schedule_day_of_week: number | null
          schedule_type: string
          search_theme: string
          target_urls: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_articles?: number
          name: string
          recipient_emails: string[]
          schedule_day_of_month?: number | null
          schedule_day_of_week?: number | null
          schedule_type: string
          search_theme: string
          target_urls?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_articles?: number
          name?: string
          recipient_emails?: string[]
          schedule_day_of_month?: number | null
          schedule_day_of_week?: number | null
          schedule_type?: string
          search_theme?: string
          target_urls?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_distribution_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_distribution_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          award_type: string
          comment: string | null
          created_at: string
          created_by: string
          id: string
          period_label: string
          recipient_employee_id: string
          tenant_id: string
        }
        Insert: {
          award_type: string
          comment?: string | null
          created_at?: string
          created_by: string
          id?: string
          period_label: string
          recipient_employee_id: string
          tenant_id: string
        }
        Update: {
          award_type?: string
          comment?: string | null
          created_at?: string
          created_by?: string
          id?: string
          period_label?: string
          recipient_employee_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_recipient_employee_id_fkey"
            columns: ["recipient_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_pulses: {
        Row: {
          candidate_name: string
          comment: string | null
          concerns: string[] | null
          created_at: string
          id: string
          is_answered: boolean | null
          selection_step: string | null
          sentiment_score: number | null
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          candidate_name: string
          comment?: string | null
          concerns?: string[] | null
          created_at?: string
          id?: string
          is_answered?: boolean | null
          selection_step?: string | null
          sentiment_score?: number | null
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          candidate_name?: string
          comment?: string | null
          concerns?: string[] | null
          created_at?: string
          id?: string
          is_answered?: boolean | null
          selection_step?: string | null
          sentiment_score?: number | null
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_pulses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pulse_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_pulses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          id: string
          job_posting_id: string | null
          last_action_at: string
          name: string
          notes: string | null
          phone: string | null
          stage: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          id?: string
          job_posting_id?: string | null
          last_action_at?: string
          name: string
          notes?: string | null
          phone?: string | null
          stage?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          id?: string
          job_posting_id?: string | null
          last_action_at?: string
          name?: string
          notes?: string | null
          phone?: string | null
          stage?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      career_discussion_appointments: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          scheduled_at: string
          scheduled_by_employee_id: string
          status: string
          tenant_id: string
          theme: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          scheduled_at: string
          scheduled_by_employee_id: string
          status?: string
          tenant_id: string
          theme?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          scheduled_at?: string
          scheduled_by_employee_id?: string
          status?: string
          tenant_id?: string
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_discussion_appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_discussion_appointments_scheduled_by_employee_id_fkey"
            columns: ["scheduled_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_discussion_appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      career_discussion_theme_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_discussion_theme_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      career_discussions: {
        Row: {
          career_aspiration: string | null
          conducted_at: string
          conducted_by_employee_id: string
          created_at: string
          employee_id: string
          evaluation_period_id: string | null
          id: string
          next_date: string | null
          notes: string | null
          one_on_one_session_id: string | null
          tenant_id: string
          theme: string
        }
        Insert: {
          career_aspiration?: string | null
          conducted_at?: string
          conducted_by_employee_id: string
          created_at?: string
          employee_id: string
          evaluation_period_id?: string | null
          id?: string
          next_date?: string | null
          notes?: string | null
          one_on_one_session_id?: string | null
          tenant_id: string
          theme: string
        }
        Update: {
          career_aspiration?: string | null
          conducted_at?: string
          conducted_by_employee_id?: string
          created_at?: string
          employee_id?: string
          evaluation_period_id?: string | null
          id?: string
          next_date?: string | null
          notes?: string | null
          one_on_one_session_id?: string | null
          tenant_id?: string
          theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_discussions_conducted_by_employee_id_fkey"
            columns: ["conducted_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_discussions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_discussions_evaluation_period_id_fkey"
            columns: ["evaluation_period_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_discussions_one_on_one_session_id_fkey"
            columns: ["one_on_one_session_id"]
            isOneToOne: false
            referencedRelation: "one_on_one_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_discussions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          checkin_date: string
          comment: string | null
          confidence: number
          created_at: string
          current_value: number | null
          employee_id: string
          id: string
          key_result_id: string
          tenant_id: string
        }
        Insert: {
          checkin_date?: string
          comment?: string | null
          confidence: number
          created_at?: string
          current_value?: number | null
          employee_id: string
          id?: string
          key_result_id: string
          tenant_id: string
        }
        Update: {
          checkin_date?: string
          comment?: string | null
          confidence?: number
          created_at?: string
          current_value?: number | null
          employee_id?: string
          id?: string
          key_result_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      closure_audit_logs: {
        Row: {
          action: string
          actor_id: string
          closure_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          target: Json | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id: string
          closure_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          target?: Json | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          closure_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          target?: Json | null
          tenant_id?: string
        }
        Relationships: []
      }
      closure_warnings: {
        Row: {
          closure_id: string | null
          created_at: string | null
          details: Json | null
          employee_id: string | null
          id: string
          resolved_at: string | null
          resolved_by: string | null
          tenant_id: string
          warning_type: string | null
        }
        Insert: {
          closure_id?: string | null
          created_at?: string | null
          details?: Json | null
          employee_id?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id: string
          warning_type?: string | null
        }
        Update: {
          closure_id?: string | null
          created_at?: string | null
          details?: Json | null
          employee_id?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id?: string
          warning_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closure_warnings_closure_id_fkey"
            columns: ["closure_id"]
            isOneToOne: false
            referencedRelation: "monthly_overtime_closures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closure_warnings_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      condition_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          employee_id: string
          id: string
          memo: string | null
          score: number
          tenant_id: string
        }
        Insert: {
          checkin_date: string
          created_at?: string
          employee_id: string
          id?: string
          memo?: string | null
          score: number
          tenant_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          employee_id?: string
          id?: string
          memo?: string | null
          score?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "condition_checkins_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condition_checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_replies: {
        Row: {
          author_employee_id: string
          body: string
          consultation_id: string
          created_at: string
          id: string
          is_staff_reply: boolean
        }
        Insert: {
          author_employee_id: string
          body: string
          consultation_id: string
          created_at?: string
          id?: string
          is_staff_reply: boolean
        }
        Update: {
          author_employee_id?: string
          body?: string
          consultation_id?: string
          created_at?: string
          id?: string
          is_staff_reply?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "consultation_replies_author_employee_id_fkey"
            columns: ["author_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_replies_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          anonymous_token: string | null
          assigned_to: string | null
          body: string
          category: Database["public"]["Enums"]["consultation_category"]
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          employee_id: string
          id: string
          is_anonymous: boolean
          status: Database["public"]["Enums"]["consultation_status"]
          target_employee_id: string | null
          target_type: string
          tenant_id: string
        }
        Insert: {
          anonymous_token?: string | null
          assigned_to?: string | null
          body: string
          category: Database["public"]["Enums"]["consultation_category"]
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_anonymous?: boolean
          status?: Database["public"]["Enums"]["consultation_status"]
          target_employee_id?: string | null
          target_type?: string
          tenant_id: string
        }
        Update: {
          anonymous_token?: string | null
          assigned_to?: string | null
          body?: string
          category?: Database["public"]["Enums"]["consultation_category"]
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_anonymous?: boolean
          status?: Database["public"]["Enums"]["consultation_status"]
          target_employee_id?: string | null
          target_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_target_employee_id_fkey"
            columns: ["target_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      division_establishment_anchors: {
        Row: {
          created_at: string
          division_establishment_id: string
          division_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          division_establishment_id: string
          division_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          division_establishment_id?: string
          division_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "division_establishment_anchors_division_establishment_id_fkey"
            columns: ["division_establishment_id"]
            isOneToOne: false
            referencedRelation: "division_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_establishment_anchors_division_establishment_id_fkey"
            columns: ["division_establishment_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis_establishment"
            referencedColumns: ["division_establishment_id"]
          },
          {
            foreignKeyName: "division_establishment_anchors_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_establishment_anchors_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis"
            referencedColumns: ["division_id"]
          },
          {
            foreignKeyName: "division_establishment_anchors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      division_establishments: {
        Row: {
          code: string | null
          created_at: string
          id: string
          labor_office_reporting_name: string | null
          name: string
          tenant_id: string
          updated_at: string
          workplace_address: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          labor_office_reporting_name?: string | null
          name: string
          tenant_id: string
          updated_at?: string
          workplace_address?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          labor_office_reporting_name?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string
          workplace_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "division_establishments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          code: string | null
          id: string
          layer: number | null
          name: string | null
          parent_id: string | null
          tenant_id: string | null
        }
        Insert: {
          code?: string | null
          id?: string
          layer?: number | null
          name?: string | null
          parent_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          code?: string | null
          id?: string
          layer?: number | null
          name?: string | null
          parent_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "divisions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divisions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis"
            referencedColumns: ["division_id"]
          },
          {
            foreignKeyName: "divisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_availability_slots: {
        Row: {
          created_at: string
          day_of_week: number | null
          doctor_id: string
          end_time: string
          id: string
          is_active: boolean
          specific_date: string | null
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          doctor_id: string
          end_time: string
          id?: string
          is_active?: boolean
          specific_date?: string | null
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          doctor_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          specific_date?: string | null
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_availability_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_availability_slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      el_assignments: {
        Row: {
          assigned_at: string
          assigned_by_employee_id: string | null
          completed_at: string | null
          course_id: string
          due_date: string | null
          employee_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_employee_id?: string | null
          completed_at?: string | null
          course_id: string
          due_date?: string | null
          employee_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by_employee_id?: string | null
          completed_at?: string | null
          course_id?: string
          due_date?: string | null
          employee_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_assignments_assigned_by_employee_id_fkey"
            columns: ["assigned_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "el_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      el_checklist_completions: {
        Row: {
          assignment_id: string
          checked_at: string
          checklist_item_id: string
          employee_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          assignment_id: string
          checked_at?: string
          checklist_item_id: string
          employee_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          assignment_id?: string
          checked_at?: string
          checklist_item_id?: string
          employee_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_checklist_completions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "el_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_checklist_completions_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "el_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_checklist_completions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_checklist_completions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      el_checklist_items: {
        Row: {
          created_at: string
          id: string
          item_order: number
          item_text: string
          slide_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_order?: number
          item_text: string
          slide_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_order?: number
          item_text?: string
          slide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_checklist_items_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "el_slides"
            referencedColumns: ["id"]
          },
        ]
      }
      el_course_requirement_mappings: {
        Row: {
          course_id: string
          created_at: string
          id: string
          requirement_id: string
          tenant_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          requirement_id: string
          tenant_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          requirement_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_course_requirement_mappings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "el_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_course_requirement_mappings_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "skill_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_course_requirement_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      el_course_skill_level_mappings: {
        Row: {
          course_id: string
          created_at: string
          id: string
          skill_level_id: string
          tenant_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          skill_level_id: string
          tenant_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          skill_level_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_course_skill_level_mappings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "el_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_course_skill_level_mappings_skill_level_id_fkey"
            columns: ["skill_level_id"]
            isOneToOne: false
            referencedRelation: "skill_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_course_skill_level_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      el_courses: {
        Row: {
          bloom_level: string | null
          category: string
          content_format: string
          course_type: string
          created_at: string
          created_by_employee_id: string | null
          description: string | null
          estimated_minutes: number | null
          id: string
          learning_objectives: string[] | null
          original_course_id: string | null
          published_end_date: string | null
          published_start_date: string | null
          status: string
          tenant_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bloom_level?: string | null
          category?: string
          content_format?: string
          course_type?: string
          created_at?: string
          created_by_employee_id?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          learning_objectives?: string[] | null
          original_course_id?: string | null
          published_end_date?: string | null
          published_start_date?: string | null
          status?: string
          tenant_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bloom_level?: string | null
          category?: string
          content_format?: string
          course_type?: string
          created_at?: string
          created_by_employee_id?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          learning_objectives?: string[] | null
          original_course_id?: string | null
          published_end_date?: string | null
          published_start_date?: string | null
          status?: string
          tenant_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_courses_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_courses_original_course_id_fkey"
            columns: ["original_course_id"]
            isOneToOne: false
            referencedRelation: "el_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      el_learning_preferences: {
        Row: {
          audio_enabled: boolean
          captions_enabled: boolean
          created_at: string
          employee_id: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          audio_enabled?: boolean
          captions_enabled?: boolean
          created_at?: string
          employee_id: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          audio_enabled?: boolean
          captions_enabled?: boolean
          created_at?: string
          employee_id?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_learning_preferences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_learning_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      el_progress: {
        Row: {
          assignment_id: string
          completed_at: string | null
          employee_id: string
          id: string
          quiz_score: number | null
          scenario_branch_id: string | null
          selected_choice_text: string | null
          slide_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          employee_id: string
          id?: string
          quiz_score?: number | null
          scenario_branch_id?: string | null
          selected_choice_text?: string | null
          slide_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          employee_id?: string
          id?: string
          quiz_score?: number | null
          scenario_branch_id?: string | null
          selected_choice_text?: string | null
          slide_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_progress_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "el_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_progress_scenario_branch_id_fkey"
            columns: ["scenario_branch_id"]
            isOneToOne: false
            referencedRelation: "el_scenario_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_progress_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "el_slides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      el_quiz_options: {
        Row: {
          id: string
          is_correct: boolean
          option_order: number
          option_text: string
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          option_order?: number
          option_text: string
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          option_order?: number
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "el_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      el_quiz_questions: {
        Row: {
          explanation: string | null
          id: string
          question_order: number
          question_text: string
          slide_id: string
        }
        Insert: {
          explanation?: string | null
          id?: string
          question_order?: number
          question_text: string
          slide_id: string
        }
        Update: {
          explanation?: string | null
          id?: string
          question_order?: number
          question_text?: string
          slide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_quiz_questions_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "el_slides"
            referencedColumns: ["id"]
          },
        ]
      }
      el_scenario_branches: {
        Row: {
          branch_order: number
          choice_text: string
          created_at: string
          feedback_text: string | null
          id: string
          is_recommended: boolean
          slide_id: string
        }
        Insert: {
          branch_order?: number
          choice_text: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_recommended?: boolean
          slide_id: string
        }
        Update: {
          branch_order?: number
          choice_text?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_recommended?: boolean
          slide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_scenario_branches_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "el_slides"
            referencedColumns: ["id"]
          },
        ]
      }
      el_scorm_packages: {
        Row: {
          course_id: string
          launch_path: string
          original_filename: string | null
          package_type: string
          storage_prefix: string | null
          tenant_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          course_id: string
          launch_path: string
          original_filename?: string | null
          package_type: string
          storage_prefix?: string | null
          tenant_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          course_id?: string
          launch_path?: string
          original_filename?: string | null
          package_type?: string
          storage_prefix?: string | null
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "el_scorm_packages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "el_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_scorm_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_scorm_packages_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      el_scorm_runtime: {
        Row: {
          assignment_id: string
          cmi_data: Json
          lesson_status: string | null
          score_raw: string | null
          suspend_data: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          cmi_data?: Json
          lesson_status?: string | null
          score_raw?: string | null
          suspend_data?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          cmi_data?: Json
          lesson_status?: string | null
          score_raw?: string | null
          suspend_data?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_scorm_runtime_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "el_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_scorm_runtime_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      el_slides: {
        Row: {
          audio_url: string | null
          content: string | null
          course_id: string
          created_at: string
          estimated_seconds: number | null
          id: string
          image_url: string | null
          slide_order: number
          slide_type: string
          title: string | null
          transcript: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          course_id: string
          created_at?: string
          estimated_seconds?: number | null
          id?: string
          image_url?: string | null
          slide_order?: number
          slide_type?: string
          title?: string | null
          transcript?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          course_id?: string
          created_at?: string
          estimated_seconds?: number | null
          id?: string
          image_url?: string | null
          slide_order?: number
          slide_type?: string
          title?: string | null
          transcript?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "el_slides_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "el_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      el_xapi_statements: {
        Row: {
          activity_id: string | null
          assignment_id: string | null
          employee_id: string
          id: string
          recorded_at: string
          result_score: number | null
          statement: Json
          tenant_id: string
          verb_id: string
        }
        Insert: {
          activity_id?: string | null
          assignment_id?: string | null
          employee_id: string
          id?: string
          recorded_at?: string
          result_score?: number | null
          statement: Json
          tenant_id: string
          verb_id: string
        }
        Update: {
          activity_id?: string | null
          assignment_id?: string | null
          employee_id?: string
          id?: string
          recorded_at?: string
          result_score?: number | null
          statement?: Json
          tenant_id?: string
          verb_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "el_xapi_statements_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "el_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_xapi_statements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_xapi_statements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_approvers: {
        Row: {
          approver_id: string
          approver_role: string
          created_at: string
          employee_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          approver_id: string
          approver_role?: string
          created_at?: string
          employee_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          approver_id?: string
          approver_role?: string
          created_at?: string
          employee_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_approvers_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_approvers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_approvers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_career_goals: {
        Row: {
          confirmed_at: string | null
          created_at: string
          employee_id: string
          id: string
          message: string | null
          proposed_by: string | null
          status: string
          target_date: string | null
          target_skill_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          message?: string | null
          proposed_by?: string | null
          status?: string
          target_date?: string | null
          target_skill_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          message?: string | null
          proposed_by?: string | null
          status?: string
          target_date?: string | null
          target_skill_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_career_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_career_goals_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_career_goals_target_skill_id_fkey"
            columns: ["target_skill_id"]
            isOneToOne: false
            referencedRelation: "tenant_skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_career_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_qualifications: {
        Row: {
          acquired_date: string | null
          cert_number: string | null
          created_at: string
          employee_id: string
          expiry_date: string | null
          id: string
          qualification_id: string
          tenant_id: string
        }
        Insert: {
          acquired_date?: string | null
          cert_number?: string | null
          created_at?: string
          employee_id: string
          expiry_date?: string | null
          id?: string
          qualification_id: string
          tenant_id: string
        }
        Update: {
          acquired_date?: string | null
          cert_number?: string | null
          created_at?: string
          employee_id?: string
          expiry_date?: string | null
          id?: string
          qualification_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_qualifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_qualifications_qualification_id_fkey"
            columns: ["qualification_id"]
            isOneToOne: false
            referencedRelation: "qualifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_qualifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_recommended_courses: {
        Row: {
          course_id: string
          created_at: string
          employee_id: string
          id: string
          reason: string | null
          recommender_id: string
          requirement_id: string | null
          tenant_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          employee_id: string
          id?: string
          reason?: string | null
          recommender_id: string
          requirement_id?: string | null
          tenant_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          reason?: string | null
          recommender_id?: string
          requirement_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_recommended_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "el_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_recommended_courses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_recommended_courses_recommender_id_fkey"
            columns: ["recommender_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_recommended_courses_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "skill_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_recommended_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skill_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          employee_id: string
          id: string
          reason: string | null
          skill_id: string
          started_at: string
          tenant_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          reason?: string | null
          skill_id: string
          started_at: string
          tenant_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          reason?: string | null
          skill_id?: string
          started_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skill_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_assignments_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "tenant_skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skill_level_achievements: {
        Row: {
          achieved_at: string
          course_id: string
          employee_id: string
          id: string
          skill_level_id: string
          tenant_id: string
        }
        Insert: {
          achieved_at?: string
          course_id: string
          employee_id: string
          id?: string
          skill_level_id: string
          tenant_id: string
        }
        Update: {
          achieved_at?: string
          course_id?: string
          employee_id?: string
          id?: string
          skill_level_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skill_level_achievements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "el_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_level_achievements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_level_achievements_skill_level_id_fkey"
            columns: ["skill_level_id"]
            isOneToOne: false
            referencedRelation: "skill_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_level_achievements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skill_requirement_history: {
        Row: {
          completed_requirements: number
          completion_rate: number
          created_at: string
          employee_id: string
          id: string
          recorded_at: string
          skill_id: string
          tenant_id: string
          total_requirements: number
        }
        Insert: {
          completed_requirements?: number
          completion_rate?: number
          created_at?: string
          employee_id: string
          id?: string
          recorded_at?: string
          skill_id: string
          tenant_id: string
          total_requirements?: number
        }
        Update: {
          completed_requirements?: number
          completion_rate?: number
          created_at?: string
          employee_id?: string
          id?: string
          recorded_at?: string
          skill_id?: string
          tenant_id?: string
          total_requirements?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_skill_requirement_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_requirement_history_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "tenant_skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_requirement_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skill_requirement_selections: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          requirement_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          requirement_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          requirement_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skill_requirement_selections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_requirement_selections_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "skill_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_requirement_selections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skill_self_evaluations: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          note: string | null
          requirement_id: string
          self_level_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          note?: string | null
          requirement_id: string
          self_level_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          note?: string | null
          requirement_id?: string
          self_level_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skill_self_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_self_evaluations_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "skill_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_self_evaluations_self_level_id_fkey"
            columns: ["self_level_id"]
            isOneToOne: false
            referencedRelation: "skill_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_self_evaluations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_training_plans: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string | null
          employee_id: string
          id: string
          template_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          template_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_training_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_training_plans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_training_plans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "training_plan_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_training_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active_status: string | null
          app_role_id: string | null
          contacted_date: string | null
          division_id: string | null
          employee_no: string | null
          id: string
          is_contacted_person: boolean | null
          is_manager: boolean | null
          job_title: string | null
          name: string | null
          sex: string | null
          start_date: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          active_status?: string | null
          app_role_id?: string | null
          contacted_date?: string | null
          division_id?: string | null
          employee_no?: string | null
          id?: string
          is_contacted_person?: boolean | null
          is_manager?: boolean | null
          job_title?: string | null
          name?: string | null
          sex?: string | null
          start_date?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          active_status?: string | null
          app_role_id?: string | null
          contacted_date?: string | null
          division_id?: string | null
          employee_no?: string | null
          id?: string
          is_contacted_person?: boolean | null
          is_manager?: boolean | null
          job_title?: string | null
          name?: string | null
          sex?: string | null
          start_date?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_app_role_id_fkey"
            columns: ["app_role_id"]
            isOneToOne: false
            referencedRelation: "app_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis"
            referencedColumns: ["division_id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_department_alerts: {
        Row: {
          channel: string
          composite_score: number
          division_id: string
          error_message: string | null
          id: string
          notified_at: string
          previous_status: string
          recipient_employee_id: string | null
          recipient_type: string
          status: string
          tenant_id: string
        }
        Insert: {
          channel?: string
          composite_score: number
          division_id: string
          error_message?: string | null
          id?: string
          notified_at?: string
          previous_status: string
          recipient_employee_id?: string | null
          recipient_type: string
          status: string
          tenant_id: string
        }
        Update: {
          channel?: string
          composite_score?: number
          division_id?: string
          error_message?: string | null
          id?: string
          notified_at?: string
          previous_status?: string
          recipient_employee_id?: string | null
          recipient_type?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_department_alerts_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_department_alerts_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis"
            referencedColumns: ["division_id"]
          },
          {
            foreignKeyName: "engagement_department_alerts_recipient_employee_id_fkey"
            columns: ["recipient_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_department_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_department_scores: {
        Row: {
          calculated_at: string
          composite_score: number
          division_id: string
          id: string
          score_breakdown: Json
          status: string
          tenant_id: string
        }
        Insert: {
          calculated_at?: string
          composite_score: number
          division_id: string
          id?: string
          score_breakdown?: Json
          status: string
          tenant_id: string
        }
        Update: {
          calculated_at?: string
          composite_score?: number
          division_id?: string
          id?: string
          score_breakdown?: Json
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_department_scores_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_department_scores_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis"
            referencedColumns: ["division_id"]
          },
          {
            foreignKeyName: "engagement_department_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_flow_logs: {
        Row: {
          changed_at: string
          changed_by: string
          comment: string | null
          from_status: string | null
          id: string
          sheet_id: string
          tenant_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          comment?: string | null
          from_status?: string | null
          id?: string
          sheet_id: string
          tenant_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          comment?: string | null
          from_status?: string | null
          id?: string
          sheet_id?: string
          tenant_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_flow_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_flow_logs_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "evaluation_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_flow_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_goals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          deadline: string | null
          goal_detail: string | null
          goal_title: string
          id: string
          item_id: string | null
          kpi_achieve_criteria: string | null
          kpi_target: string | null
          kpi_type: string
          kpi_unit: string | null
          sheet_id: string
          sort_order: number
          tenant_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deadline?: string | null
          goal_detail?: string | null
          goal_title: string
          id?: string
          item_id?: string | null
          kpi_achieve_criteria?: string | null
          kpi_target?: string | null
          kpi_type?: string
          kpi_unit?: string | null
          sheet_id: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deadline?: string | null
          goal_detail?: string | null
          goal_title?: string
          id?: string
          item_id?: string | null
          kpi_achieve_criteria?: string | null
          kpi_target?: string | null
          kpi_type?: string
          kpi_unit?: string | null
          sheet_id?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_goals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_goals_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "evaluation_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_goals_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "evaluation_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_periods: {
        Row: {
          created_at: string
          end_date: string
          fiscal_year: number
          goal_deadline: string | null
          id: string
          name: string
          period_type: string
          primary_eval_end: string | null
          secondary_eval_end: string | null
          self_eval_end: string | null
          self_eval_start: string | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          fiscal_year: number
          goal_deadline?: string | null
          id?: string
          name: string
          period_type: string
          primary_eval_end?: string | null
          secondary_eval_end?: string | null
          self_eval_end?: string | null
          self_eval_start?: string | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          fiscal_year?: number
          goal_deadline?: string | null
          id?: string
          name?: string
          period_type?: string
          primary_eval_end?: string | null
          secondary_eval_end?: string | null
          self_eval_end?: string | null
          self_eval_start?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_reminders: {
        Row: {
          email_error: string | null
          email_sent: boolean
          id: string
          message: string | null
          period_id: string
          reminder_type: string
          sent_at: string
          sent_by: string
          sheet_id: string
          target_status: string | null
          tenant_id: string
        }
        Insert: {
          email_error?: string | null
          email_sent?: boolean
          id?: string
          message?: string | null
          period_id: string
          reminder_type: string
          sent_at?: string
          sent_by: string
          sheet_id: string
          target_status?: string | null
          tenant_id: string
        }
        Update: {
          email_error?: string | null
          email_sent?: boolean
          id?: string
          message?: string | null
          period_id?: string
          reminder_type?: string
          sent_at?: string
          sent_by?: string
          sheet_id?: string
          target_status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_reminders_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_reminders_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_reminders_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "evaluation_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_scores: {
        Row: {
          achievement_rate: number | null
          comment: string | null
          evaluated_at: string
          evaluator_id: string
          evaluator_type: string
          goal_id: string | null
          id: string
          item_id: string | null
          score: number | null
          sheet_id: string
          tenant_id: string
        }
        Insert: {
          achievement_rate?: number | null
          comment?: string | null
          evaluated_at?: string
          evaluator_id: string
          evaluator_type: string
          goal_id?: string | null
          id?: string
          item_id?: string | null
          score?: number | null
          sheet_id: string
          tenant_id: string
        }
        Update: {
          achievement_rate?: number | null
          comment?: string | null
          evaluated_at?: string
          evaluator_id?: string
          evaluator_type?: string
          goal_id?: string | null
          id?: string
          item_id?: string | null
          score?: number | null
          sheet_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "evaluation_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "evaluation_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "evaluation_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_sheets: {
        Row: {
          confirmer_id: string | null
          created_at: string
          employee_id: string
          final_grade: string | null
          final_score: number | null
          flow_status: string
          id: string
          is_locked: boolean
          period_id: string
          primary_evaluator_id: string | null
          secondary_evaluator_id: string | null
          template_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          confirmer_id?: string | null
          created_at?: string
          employee_id: string
          final_grade?: string | null
          final_score?: number | null
          flow_status?: string
          id?: string
          is_locked?: boolean
          period_id: string
          primary_evaluator_id?: string | null
          secondary_evaluator_id?: string | null
          template_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          confirmer_id?: string | null
          created_at?: string
          employee_id?: string
          final_grade?: string | null
          final_score?: number | null
          flow_status?: string
          id?: string
          is_locked?: boolean
          period_id?: string
          primary_evaluator_id?: string | null
          secondary_evaluator_id?: string | null
          template_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_sheets_confirmer_id_fkey"
            columns: ["confirmer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_sheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_sheets_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_sheets_primary_evaluator_id_fkey"
            columns: ["primary_evaluator_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_sheets_secondary_evaluator_id_fkey"
            columns: ["secondary_evaluator_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_sheets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_sheets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_template_items: {
        Row: {
          axis: string
          created_at: string
          description: string | null
          evaluation_focus: string | null
          id: string
          is_custom: boolean
          mbo_category: string | null
          measurement_method: string | null
          name: string
          sort_order: number
          target_grade_note: string | null
          target_grades: string[] | null
          template_id: string
          tenant_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          axis: string
          created_at?: string
          description?: string | null
          evaluation_focus?: string | null
          id?: string
          is_custom?: boolean
          mbo_category?: string | null
          measurement_method?: string | null
          name: string
          sort_order?: number
          target_grade_note?: string | null
          target_grades?: string[] | null
          template_id: string
          tenant_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          axis?: string
          created_at?: string
          description?: string | null
          evaluation_focus?: string | null
          id?: string
          is_custom?: boolean
          mbo_category?: string | null
          measurement_method?: string | null
          name?: string
          sort_order?: number
          target_grade_note?: string | null
          target_grades?: string[] | null
          template_id?: string
          tenant_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_template_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_templates: {
        Row: {
          copied_from_global_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          global_template_id: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          template_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          copied_from_global_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          global_template_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          template_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          copied_from_global_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          global_template_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          template_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_templates_global_template_id_fkey"
            columns: ["global_template_id"]
            isOneToOne: false
            referencedRelation: "global_evaluation_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exit_interviews: {
        Row: {
          age_group: string
          created_at: string
          department_name: string | null
          employee_id: string | null
          employee_name: string
          exit_date: string
          id: string
          main_reason: string
          notes: string | null
          recorded_by: string | null
          sub_reasons: string[]
          tenant_id: string
          tenure_months: number
          updated_at: string
        }
        Insert: {
          age_group?: string
          created_at?: string
          department_name?: string | null
          employee_id?: string | null
          employee_name: string
          exit_date: string
          id?: string
          main_reason: string
          notes?: string | null
          recorded_by?: string | null
          sub_reasons?: string[]
          tenant_id: string
          tenure_months?: number
          updated_at?: string
        }
        Update: {
          age_group?: string
          created_at?: string
          department_name?: string | null
          employee_id?: string | null
          employee_name?: string
          exit_date?: string
          id?: string
          main_reason?: string
          notes?: string | null
          recorded_by?: string | null
          sub_reasons?: string[]
          tenant_id?: string
          tenure_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exit_interviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_interviews_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_interviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      global_evaluation_template_items: {
        Row: {
          axis: string
          created_at: string
          description: string | null
          evaluation_focus: string | null
          id: string
          mbo_category: string | null
          measurement_method: string | null
          name: string
          sort_order: number
          target_grade_note: string | null
          template_id: string
          weight: number
        }
        Insert: {
          axis: string
          created_at?: string
          description?: string | null
          evaluation_focus?: string | null
          id?: string
          mbo_category?: string | null
          measurement_method?: string | null
          name: string
          sort_order?: number
          target_grade_note?: string | null
          template_id: string
          weight?: number
        }
        Update: {
          axis?: string
          created_at?: string
          description?: string | null
          evaluation_focus?: string | null
          id?: string
          mbo_category?: string | null
          measurement_method?: string | null
          name?: string
          sort_order?: number
          target_grade_note?: string | null
          template_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "global_evaluation_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "global_evaluation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      global_evaluation_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_skill_level_sets: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      global_skill_levels: {
        Row: {
          color_hex: string
          created_at: string
          criteria: string | null
          id: string
          name: string
          skill_level_set_id: string
          sort_order: number
        }
        Insert: {
          color_hex?: string
          created_at?: string
          criteria?: string | null
          id?: string
          name: string
          skill_level_set_id: string
          sort_order?: number
        }
        Update: {
          color_hex?: string
          created_at?: string
          criteria?: string | null
          id?: string
          name?: string
          skill_level_set_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "global_skill_levels_skill_level_set_id_fkey"
            columns: ["skill_level_set_id"]
            isOneToOne: false
            referencedRelation: "global_skill_level_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_evaluation_criteria: {
        Row: {
          created_at: string
          grade_code: string
          id: string
          item_id: string
          score_1_desc: string | null
          score_2_desc: string | null
          score_3_desc: string | null
          score_4_desc: string | null
          score_5_desc: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          grade_code: string
          id?: string
          item_id: string
          score_1_desc?: string | null
          score_2_desc?: string | null
          score_3_desc?: string | null
          score_4_desc?: string | null
          score_5_desc?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          grade_code?: string
          id?: string
          item_id?: string
          score_1_desc?: string | null
          score_2_desc?: string | null
          score_3_desc?: string | null
          score_4_desc?: string | null
          score_5_desc?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_evaluation_criteria_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "evaluation_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_evaluation_criteria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      health_assessments_link: {
        Row: {
          assessment_id: string
          assessment_type: string
          employee_id: string
          id: string
          score: number | null
          taken_at: string | null
          tenant_id: string
        }
        Insert: {
          assessment_id: string
          assessment_type: string
          employee_id: string
          id?: string
          score?: number | null
          taken_at?: string | null
          tenant_id: string
        }
        Update: {
          assessment_id?: string
          assessment_type?: string
          employee_id?: string
          id?: string
          score?: number | null
          taken_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_assessments_link_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_assessments_link_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_law_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_law_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "hr_law_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_law_crawl_queue: {
        Row: {
          discovered_at: string
          error_message: string | null
          id: string
          priority: number
          processed_at: string | null
          source_id: string | null
          status: string
          title: string | null
          topic: string
          url: string
        }
        Insert: {
          discovered_at?: string
          error_message?: string | null
          id?: string
          priority?: number
          processed_at?: string | null
          source_id?: string | null
          status?: string
          title?: string | null
          topic: string
          url: string
        }
        Update: {
          discovered_at?: string
          error_message?: string | null
          id?: string
          priority?: number
          processed_at?: string | null
          source_id?: string | null
          status?: string
          title?: string | null
          topic?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_law_crawl_queue_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "hr_law_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_law_documents: {
        Row: {
          content_checked_at: string | null
          content_hash: string
          created_at: string
          detail: string | null
          expires_at: string | null
          fetched_at: string
          http_etag: string | null
          http_last_modified: string | null
          id: string
          published_at: string | null
          source_id: string | null
          source_url: string
          status: string
          summary: string
          theme: string | null
          title: string
        }
        Insert: {
          content_checked_at?: string | null
          content_hash: string
          created_at?: string
          detail?: string | null
          expires_at?: string | null
          fetched_at?: string
          http_etag?: string | null
          http_last_modified?: string | null
          id?: string
          published_at?: string | null
          source_id?: string | null
          source_url: string
          status?: string
          summary: string
          theme?: string | null
          title: string
        }
        Update: {
          content_checked_at?: string | null
          content_hash?: string
          created_at?: string
          detail?: string | null
          expires_at?: string | null
          fetched_at?: string
          http_etag?: string | null
          http_last_modified?: string | null
          id?: string
          published_at?: string | null
          source_id?: string | null
          source_url?: string
          status?: string
          summary?: string
          theme?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_law_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "hr_law_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_law_refresh_logs: {
        Row: {
          created_at: string
          detail_chars: number
          documents_created: number
          documents_skipped: number
          documents_updated: number
          error_message: string | null
          errors: Json
          finished_at: string | null
          freshness_checked: number
          id: string
          proposals_created: number
          queued: number
          source_id: string | null
          source_topic: string | null
          sources_processed: number
          started_at: string
          success: boolean
          trigger_type: string
        }
        Insert: {
          created_at?: string
          detail_chars?: number
          documents_created?: number
          documents_skipped?: number
          documents_updated?: number
          error_message?: string | null
          errors?: Json
          finished_at?: string | null
          freshness_checked?: number
          id?: string
          proposals_created?: number
          queued?: number
          source_id?: string | null
          source_topic?: string | null
          sources_processed?: number
          started_at?: string
          success?: boolean
          trigger_type?: string
        }
        Update: {
          created_at?: string
          detail_chars?: number
          documents_created?: number
          documents_skipped?: number
          documents_updated?: number
          error_message?: string | null
          errors?: Json
          finished_at?: string | null
          freshness_checked?: number
          id?: string
          proposals_created?: number
          queued?: number
          source_id?: string | null
          source_topic?: string | null
          sources_processed?: number
          started_at?: string
          success?: boolean
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_law_refresh_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "hr_law_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_law_sources: {
        Row: {
          created_at: string
          disabled_at: string | null
          enabled: boolean
          id: string
          last_run_at: string | null
          origin: string
          search_query: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          origin?: string
          search_query: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          origin?: string
          search_query?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_law_topic_proposals: {
        Row: {
          created_at: string
          created_source_id: string | null
          evidence: Json
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          score: number
          search_query: string
          source: string
          status: string
          topic: string
          topic_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_source_id?: string | null
          evidence?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          search_query: string
          source: string
          status?: string
          topic: string
          topic_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_source_id?: string | null
          evidence?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          search_query?: string
          source?: string
          status?: string
          topic?: string
          topic_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_law_topic_proposals_created_source_id_fkey"
            columns: ["created_source_id"]
            isOneToOne: false
            referencedRelation: "hr_law_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_event_attendees: {
        Row: {
          employee_id: string
          event_id: string
          rsvp_status: string
          updated_at: string
        }
        Insert: {
          employee_id: string
          event_id: string
          rsvp_status?: string
          updated_at?: string
        }
        Update: {
          employee_id?: string
          event_id?: string
          rsvp_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_event_attendees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "internal_events"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_events: {
        Row: {
          audience_type: string
          created_at: string
          created_by: string
          description: string | null
          division_id: string | null
          event_date: string
          id: string
          location: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          audience_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          division_id?: string | null
          event_date: string
          id?: string
          location?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          audience_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          division_id?: string | null
          event_date?: string
          id?: string
          location?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_events_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_events_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis"
            referencedColumns: ["division_id"]
          },
          {
            foreignKeyName: "internal_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          employee_id: string
          extra: Json | null
          id: string
          intervention_type: string
          reason: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          employee_id: string
          extra?: Json | null
          id?: string
          intervention_type: string
          reason?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          employee_id?: string
          extra?: Json | null
          id?: string
          intervention_type?: string
          reason?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posting_ai_variants: {
        Row: {
          applied_at: string | null
          created_at: string
          description: string
          differentiation_points: string | null
          id: string
          is_applied: boolean
          job_posting_id: string | null
          media_type: string
          prompt_snapshot: Json | null
          tenant_id: string
          title: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          description: string
          differentiation_points?: string | null
          id?: string
          is_applied?: boolean
          job_posting_id?: string | null
          media_type: string
          prompt_snapshot?: Json | null
          tenant_id: string
          title: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          description?: string
          differentiation_points?: string | null
          id?: string
          is_applied?: boolean
          job_posting_id?: string | null
          media_type?: string
          prompt_snapshot?: Json | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posting_ai_variants_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_posting_ai_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          address_locality: string | null
          address_region: string | null
          created_at: string
          description: string | null
          employment_type: string | null
          id: string
          postal_code: string | null
          published_at: string | null
          raw_memo: string | null
          salary_max: number | null
          salary_min: number | null
          salary_unit: string | null
          status: string
          street_address: string | null
          tenant_id: string
          title: string | null
          updated_at: string
          valid_through: string | null
        }
        Insert: {
          address_locality?: string | null
          address_region?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          id?: string
          postal_code?: string | null
          published_at?: string | null
          raw_memo?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_unit?: string | null
          status?: string
          street_address?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          valid_through?: string | null
        }
        Update: {
          address_locality?: string | null
          address_region?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          id?: string
          postal_code?: string | null
          published_at?: string | null
          raw_memo?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_unit?: string | null
          status?: string
          street_address?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          valid_through?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      key_results: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: number
          description: string | null
          due_date: string | null
          id: string
          kr_type: string
          objective_id: string
          progress: number
          sort_order: number
          start_value: number
          status: string
          target_value: number | null
          tenant_id: string
          title: string
          unit: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          due_date?: string | null
          id?: string
          kr_type?: string
          objective_id: string
          progress?: number
          sort_order?: number
          start_value?: number
          status?: string
          target_value?: number | null
          tenant_id: string
          title: string
          unit?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          due_date?: string | null
          id?: string
          kr_type?: string
          objective_id?: string
          progress?: number
          sort_order?: number
          start_value?: number
          status?: string
          target_value?: number | null
          tenant_id?: string
          title?: string
          unit?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "key_results_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_employee_id: string
          tenant_id: string
          value_tag: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_employee_id: string
          tenant_id: string
          value_tag?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_employee_id?: string
          tenant_id?: string
          value_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kudos_sender_employee_id_fkey"
            columns: ["sender_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos_reactions: {
        Row: {
          employee_id: string
          kudos_id: string
        }
        Insert: {
          employee_id: string
          kudos_id: string
        }
        Update: {
          employee_id?: string
          kudos_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_reactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_reactions_kudos_id_fkey"
            columns: ["kudos_id"]
            isOneToOne: false
            referencedRelation: "kudos"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos_recipients: {
        Row: {
          employee_id: string
          kudos_id: string
        }
        Insert: {
          employee_id: string
          kudos_id: string
        }
        Update: {
          employee_id?: string
          kudos_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_recipients_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_recipients_kudos_id_fkey"
            columns: ["kudos_id"]
            isOneToOne: false
            referencedRelation: "kudos"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos_value_tags: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_value_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_instances: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          lifecycle_type: string
          notes: string | null
          scheduled_date: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          lifecycle_type: string
          notes?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          lifecycle_type?: string
          notes?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_instances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_instances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_task_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          lifecycle_type: string
          sort_order: number
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lifecycle_type: string
          sort_order?: number
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lifecycle_type?: string
          sort_order?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_task_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          instance_id: string
          sort_order: number
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instance_id: string
          sort_order?: number
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instance_id?: string
          sort_order?: number
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_tasks_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "lifecycle_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_employee_overtime: {
        Row: {
          approved_overtime_hours: number | null
          closure_id: string | null
          corrections_summary: Json | null
          created_at: string | null
          employee_id: string
          id: string
          tenant_id: string
          total_overtime_hours: number | null
          total_work_hours: number | null
          updated_at: string | null
          year_month: string
        }
        Insert: {
          approved_overtime_hours?: number | null
          closure_id?: string | null
          corrections_summary?: Json | null
          created_at?: string | null
          employee_id: string
          id?: string
          tenant_id: string
          total_overtime_hours?: number | null
          total_work_hours?: number | null
          updated_at?: string | null
          year_month: string
        }
        Update: {
          approved_overtime_hours?: number | null
          closure_id?: string | null
          corrections_summary?: Json | null
          created_at?: string | null
          employee_id?: string
          id?: string
          tenant_id?: string
          total_overtime_hours?: number | null
          total_work_hours?: number | null
          updated_at?: string | null
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_employee_overtime_closure_id_fkey"
            columns: ["closure_id"]
            isOneToOne: false
            referencedRelation: "monthly_overtime_closures"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_overtime_closures: {
        Row: {
          aggregate_version: number | null
          aggregated_at: string | null
          approved_by: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          id: string
          lock_reason: string | null
          locked_by: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          year_month: string
        }
        Insert: {
          aggregate_version?: number | null
          aggregated_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          lock_reason?: string | null
          locked_by?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          year_month: string
        }
        Update: {
          aggregate_version?: number | null
          aggregated_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          lock_reason?: string | null
          locked_by?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_overtime_closures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      myou_alert_logs: {
        Row: {
          company_id: string
          error_message: string | null
          id: string
          sent_at: string
          status: string
          target_serials: string[]
          tenant_id: string
        }
        Insert: {
          company_id: string
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          target_serials: string[]
          tenant_id?: string
        }
        Update: {
          company_id?: string
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          target_serials?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "myou_alert_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "myou_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      myou_companies: {
        Row: {
          created_at: string
          email_address: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email_address?: string | null
          id?: string
          name: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          email_address?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: []
      }
      myou_delivery_logs: {
        Row: {
          company_id: string
          delivered_by: string | null
          delivery_date: string
          id: string
          registered_at: string
          serial_number: string
          tenant_id: string
        }
        Insert: {
          company_id: string
          delivered_by?: string | null
          delivery_date?: string
          id?: string
          registered_at?: string
          serial_number: string
          tenant_id?: string
        }
        Update: {
          company_id?: string
          delivered_by?: string | null
          delivery_date?: string
          id?: string
          registered_at?: string
          serial_number?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "myou_delivery_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "myou_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "myou_delivery_logs_product_fkey"
            columns: ["tenant_id", "serial_number"]
            isOneToOne: false
            referencedRelation: "myou_products"
            referencedColumns: ["tenant_id", "serial_number"]
          },
        ]
      }
      myou_products: {
        Row: {
          created_at: string
          current_company_id: string | null
          expiration_date: string | null
          issued_at: string | null
          last_delivery_at: string | null
          received_at: string | null
          serial_number: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          current_company_id?: string | null
          expiration_date?: string | null
          issued_at?: string | null
          last_delivery_at?: string | null
          received_at?: string | null
          serial_number: string
          status?: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          current_company_id?: string | null
          expiration_date?: string | null
          issued_at?: string | null
          last_delivery_at?: string | null
          received_at?: string | null
          serial_number?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "myou_products_current_company_id_fkey"
            columns: ["current_company_id"]
            isOneToOne: false
            referencedRelation: "myou_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          evaluation_sheet_id: string | null
          fiscal_year: number
          half_year: string | null
          id: string
          owner_division_id: string | null
          owner_employee_id: string | null
          owner_type: string
          parent_id: string | null
          period_label: string
          progress: number
          sort_order: number
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          evaluation_sheet_id?: string | null
          fiscal_year: number
          half_year?: string | null
          id?: string
          owner_division_id?: string | null
          owner_employee_id?: string | null
          owner_type: string
          parent_id?: string | null
          period_label: string
          progress?: number
          sort_order?: number
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          evaluation_sheet_id?: string | null
          fiscal_year?: number
          half_year?: string | null
          id?: string
          owner_division_id?: string | null
          owner_employee_id?: string | null
          owner_type?: string
          parent_id?: string | null
          period_label?: string
          progress?: number
          sort_order?: number
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objectives_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_evaluation_sheet_id_fkey"
            columns: ["evaluation_sheet_id"]
            isOneToOne: false
            referencedRelation: "evaluation_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_owner_division_id_fkey"
            columns: ["owner_division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_owner_division_id_fkey"
            columns: ["owner_division_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis"
            referencedColumns: ["division_id"]
          },
          {
            foreignKeyName: "objectives_owner_employee_id_fkey"
            columns: ["owner_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_sessions: {
        Row: {
          ai_summary: string | null
          conducted_at: string
          created_at: string
          employee_id: string
          id: string
          manager_id: string
          next_date: string | null
          notes: string | null
          tenant_id: string
          theme: string
        }
        Insert: {
          ai_summary?: string | null
          conducted_at?: string
          created_at?: string
          employee_id: string
          id?: string
          manager_id: string
          next_date?: string | null
          notes?: string | null
          tenant_id: string
          theme: string
        }
        Update: {
          ai_summary?: string | null
          conducted_at?: string
          created_at?: string
          employee_id?: string
          id?: string
          manager_id?: string
          next_date?: string | null
          notes?: string | null
          tenant_id?: string
          theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_sessions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_theme_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_theme_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_upcoming: {
        Row: {
          agenda: string | null
          created_at: string
          employee_id: string
          id: string
          manager_id: string
          reminded_at: string | null
          scheduled_at: string
          status: string
          tenant_id: string
          theme: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          employee_id: string
          id?: string
          manager_id: string
          reminded_at?: string | null
          scheduled_at: string
          status?: string
          tenant_id: string
          theme: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          manager_id?: string
          reminded_at?: string | null
          scheduled_at?: string
          status?: string
          tenant_id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_upcoming_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_upcoming_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_upcoming_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_alerts: {
        Row: {
          alert_type: string
          alert_value: Json | null
          employee_id: string
          id: string
          resolved_at: string | null
          tenant_id: string
          triggered_at: string | null
        }
        Insert: {
          alert_type: string
          alert_value?: Json | null
          employee_id: string
          id?: string
          resolved_at?: string | null
          tenant_id: string
          triggered_at?: string | null
        }
        Update: {
          alert_type?: string
          alert_value?: Json | null
          employee_id?: string
          id?: string
          resolved_at?: string | null
          tenant_id?: string
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "overtime_alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_analysis_results: {
        Row: {
          analysis_details: Json | null
          created_at: string | null
          id: string
          is_exceeded: boolean
          legal_limit_hours: number
          tenant_id: string
          total_overtime_hours: number
          updated_at: string | null
          year_month: string
        }
        Insert: {
          analysis_details?: Json | null
          created_at?: string | null
          id?: string
          is_exceeded: boolean
          legal_limit_hours: number
          tenant_id: string
          total_overtime_hours: number
          updated_at?: string | null
          year_month: string
        }
        Update: {
          analysis_details?: Json | null
          created_at?: string | null
          id?: string
          is_exceeded?: boolean
          legal_limit_hours?: number
          tenant_id?: string
          total_overtime_hours?: number
          updated_at?: string | null
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_analysis_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_applications: {
        Row: {
          approved_at: string | null
          created_at: string | null
          employee_id: string
          id: string
          overtime_end: string
          overtime_start: string
          reason: string | null
          requested_hours: number
          status: string
          supervisor_comment: string | null
          supervisor_id: string | null
          tenant_id: string
          updated_at: string | null
          work_date: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          overtime_end: string
          overtime_start: string
          reason?: string | null
          requested_hours: number
          status?: string
          supervisor_comment?: string | null
          supervisor_id?: string | null
          tenant_id: string
          updated_at?: string | null
          work_date: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          overtime_end?: string
          overtime_start?: string
          reason?: string | null
          requested_hours?: number
          status?: string
          supervisor_comment?: string | null
          supervisor_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_applications_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_corrections: {
        Row: {
          application_id: string
          corrected_at: string | null
          corrected_by: string
          corrected_hours: number
          correction_reason: string | null
          id: string
        }
        Insert: {
          application_id: string
          corrected_at?: string | null
          corrected_by: string
          corrected_hours: number
          correction_reason?: string | null
          id?: string
        }
        Update: {
          application_id?: string
          corrected_at?: string | null
          corrected_by?: string
          corrected_hours?: number
          correction_reason?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_corrections_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "overtime_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_corrections_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_monthly_stats: {
        Row: {
          computed_at: string | null
          employee_id: string
          holiday_minutes: number
          id: string
          overtime_minutes: number
          period_month: string
          tenant_id: string
          total_minutes: number
        }
        Insert: {
          computed_at?: string | null
          employee_id: string
          holiday_minutes: number
          id?: string
          overtime_minutes: number
          period_month: string
          tenant_id: string
          total_minutes: number
        }
        Update: {
          computed_at?: string | null
          employee_id?: string
          holiday_minutes?: number
          id?: string
          overtime_minutes?: number
          period_month?: string
          tenant_id?: string
          total_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "overtime_monthly_stats_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_monthly_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_settings: {
        Row: {
          annual_limit_hours: number
          average_limit_hours: number
          id: string
          monthly_limit_hours: number
          monthly_warning_hours: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          annual_limit_hours?: number
          average_limit_hours?: number
          id?: string
          monthly_limit_hours?: number
          monthly_warning_hours?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          annual_limit_hours?: number
          average_limit_hours?: number
          id?: string
          monthly_limit_hours?: number
          monthly_warning_hours?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      program_targets: {
        Row: {
          created_at: string
          employee_id: string
          exclusion_reason: string | null
          id: string
          is_eligible: boolean
          program_instance_id: string
          program_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          exclusion_reason?: string | null
          id?: string
          is_eligible?: boolean
          program_instance_id: string
          program_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          exclusion_reason?: string | null
          id?: string
          is_eligible?: boolean
          program_instance_id?: string
          program_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_targets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_simulations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_simulations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_simulations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_survey_periods: {
        Row: {
          created_at: string
          deadline_date: string
          description: string | null
          id: string
          link_path: string | null
          sort_order: number
          survey_period: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline_date: string
          description?: string | null
          id?: string
          link_path?: string | null
          sort_order?: number
          survey_period: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline_date?: string
          description?: string | null
          id?: string
          link_path?: string | null
          sort_order?: number
          survey_period?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_survey_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_survey_questions: {
        Row: {
          answer_type: string
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          question_text: string
          sort_order: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          answer_type?: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question_text: string
          sort_order?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          answer_type?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question_text?: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_survey_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_survey_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          question_id: string | null
          score: number | null
          survey_period: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id?: string | null
          score?: number | null
          survey_period: string
          tenant_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id?: string | null
          score?: number | null
          survey_period?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pulse_survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_survey_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_templates: {
        Row: {
          concerns_list: string[]
          created_at: string
          id: string
          name: string
          question_1_text: string
          question_2_text: string
          question_3_text: string | null
          tenant_id: string
        }
        Insert: {
          concerns_list?: string[]
          created_at?: string
          id?: string
          name: string
          question_1_text?: string
          question_2_text?: string
          question_3_text?: string | null
          tenant_id: string
        }
        Update: {
          concerns_list?: string[]
          created_at?: string
          id?: string
          name?: string
          question_1_text?: string
          question_2_text?: string
          question_3_text?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          payload: Json | null
          related_id: string | null
          related_table: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          related_id?: string | null
          related_table: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          related_id?: string | null
          related_table?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_session_scans: {
        Row: {
          audit: Json | null
          confirm_method: string | null
          device_info: Json | null
          employee_user_id: string
          id: string
          location: Json | null
          photo_hash: string | null
          photo_url: string | null
          proximity: Json | null
          result: string | null
          scanned_at: string
          session_id: string
          supervisor_confirmed: boolean | null
          tenant_id: string
        }
        Insert: {
          audit?: Json | null
          confirm_method?: string | null
          device_info?: Json | null
          employee_user_id: string
          id?: string
          location?: Json | null
          photo_hash?: string | null
          photo_url?: string | null
          proximity?: Json | null
          result?: string | null
          scanned_at?: string
          session_id: string
          supervisor_confirmed?: boolean | null
          tenant_id: string
        }
        Update: {
          audit?: Json | null
          confirm_method?: string | null
          device_info?: Json | null
          employee_user_id?: string
          id?: string
          location?: Json | null
          photo_hash?: string | null
          photo_url?: string | null
          proximity?: Json | null
          result?: string | null
          scanned_at?: string
          session_id?: string
          supervisor_confirmed?: boolean | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_session_scans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "qr_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_session_scans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_sessions: {
        Row: {
          code: string | null
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          max_uses: number
          metadata: Json | null
          nonce: string
          purpose: string
          supervisor_user_id: string
          tenant_id: string
          uses: number
        }
        Insert: {
          code?: string | null
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          max_uses?: number
          metadata?: Json | null
          nonce: string
          purpose: string
          supervisor_user_id: string
          tenant_id: string
          uses?: number
        }
        Update: {
          code?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number
          metadata?: Json | null
          nonce?: string
          purpose?: string
          supervisor_user_id?: string
          tenant_id?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "qr_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      qualifications: {
        Row: {
          created_at: string
          id: string
          issuing_body: string | null
          name: string
          renewal_years: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issuing_body?: string | null
          name: string
          renewal_years?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issuing_body?: string | null
          name?: string
          renewal_years?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_answers: {
        Row: {
          id: string
          item_id: string | null
          option_id: string | null
          question_id: string
          response_id: string
          score: number | null
          text_answer: string | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          option_id?: string | null
          question_id: string
          response_id: string
          score?: number | null
          text_answer?: string | null
        }
        Update: {
          id?: string
          item_id?: string | null
          option_id?: string | null
          question_id?: string
          response_id?: string
          score?: number | null
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_answers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_question_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_question_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_assignments: {
        Row: {
          assigned_at: string
          deadline_date: string | null
          employee_id: string
          id: string
          period_id: string | null
          questionnaire_id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          deadline_date?: string | null
          employee_id: string
          id?: string
          period_id?: string | null
          questionnaire_id: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          deadline_date?: string | null
          employee_id?: string
          id?: string
          period_id?: string | null
          questionnaire_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_assignments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_assignments_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_periods: {
        Row: {
          created_at: string
          created_by_employee_id: string | null
          end_date: string | null
          hr_message: string | null
          id: string
          label: string | null
          period_type: string
          questionnaire_id: string
          start_date: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by_employee_id?: string | null
          end_date?: string | null
          hr_message?: string | null
          id?: string
          label?: string | null
          period_type?: string
          questionnaire_id: string
          start_date?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by_employee_id?: string | null
          end_date?: string | null
          hr_message?: string | null
          id?: string
          label?: string | null
          period_type?: string
          questionnaire_id?: string
          start_date?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_periods_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_question_items: {
        Row: {
          id: string
          item_text: string
          question_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          item_text: string
          question_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          item_text?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_question_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_question_options: {
        Row: {
          id: string
          option_text: string
          question_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          option_text: string
          question_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          option_text?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_questions: {
        Row: {
          id: string
          is_required: boolean
          question_text: string
          question_type: string
          questionnaire_id: string
          scale_labels: Json | null
          section_id: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          is_required?: boolean
          question_text: string
          question_type: string
          questionnaire_id: string
          scale_labels?: Json | null
          section_id?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          is_required?: boolean
          question_text?: string
          question_type?: string
          questionnaire_id?: string
          scale_labels?: Json | null
          section_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_questions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_responses: {
        Row: {
          assignment_id: string
          employee_id: string
          id: string
          period_id: string | null
          questionnaire_id: string
          submitted_at: string | null
          tenant_id: string
        }
        Insert: {
          assignment_id: string
          employee_id: string
          id?: string
          period_id?: string | null
          questionnaire_id: string
          submitted_at?: string | null
          tenant_id: string
        }
        Update: {
          assignment_id?: string
          employee_id?: string
          id?: string
          period_id?: string | null
          questionnaire_id?: string
          submitted_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "questionnaire_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_responses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_responses_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_responses_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_sections: {
        Row: {
          id: string
          questionnaire_id: string
          sort_order: number
          title: string
        }
        Insert: {
          id?: string
          questionnaire_id: string
          sort_order?: number
          title: string
        }
        Update: {
          id?: string
          questionnaire_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_sections_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          created_at: string
          created_by_employee_id: string | null
          creator_type: string
          description: string | null
          id: string
          purpose: string
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_employee_id?: string | null
          creator_type: string
          description?: string | null
          id?: string
          purpose?: string
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_employee_id?: string | null
          creator_type?: string
          description?: string | null
          id?: string
          purpose?: string
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaires_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaires_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_jobs: {
        Row: {
          ai_catchphrase: string | null
          ai_interview_guide: string | null
          ai_scout_text: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          employment_type: string | null
          id: string
          location: string | null
          media_advice: string | null
          requirements: string | null
          salary_max: number | null
          salary_min: number | null
          status: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_catchphrase?: string | null
          ai_interview_guide?: string | null
          ai_scout_text?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          media_advice?: string | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_catchphrase?: string | null
          ai_interview_guide?: string | null
          ai_scout_text?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          media_advice?: string | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_nominations: {
        Row: {
          created_at: string
          hired_at: string | null
          hr_notes: string | null
          id: string
          nomination_reason: string | null
          nominee_email: string | null
          nominee_name: string
          nominee_phone: string | null
          referral_posting_id: string
          referrer_employee_id: string
          relationship: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hired_at?: string | null
          hr_notes?: string | null
          id?: string
          nomination_reason?: string | null
          nominee_email?: string | null
          nominee_name: string
          nominee_phone?: string | null
          referral_posting_id: string
          referrer_employee_id: string
          relationship?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hired_at?: string | null
          hr_notes?: string | null
          id?: string
          nomination_reason?: string | null
          nominee_email?: string | null
          nominee_name?: string
          nominee_phone?: string | null
          referral_posting_id?: string
          referrer_employee_id?: string
          relationship?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_nominations_referral_posting_id_fkey"
            columns: ["referral_posting_id"]
            isOneToOne: false
            referencedRelation: "referral_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_nominations_referrer_employee_id_fkey"
            columns: ["referrer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_nominations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_postings: {
        Row: {
          created_at: string
          created_by: string | null
          deadline: string | null
          department: string | null
          description: string | null
          employment_type: string | null
          id: string
          is_active: boolean
          job_posting_id: string | null
          reward_amount: number
          reward_condition: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          department?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          is_active?: boolean
          job_posting_id?: string | null
          reward_amount?: number
          reward_condition?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          department?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          is_active?: boolean
          job_posting_id?: string | null
          reward_amount?: number
          reward_condition?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_postings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_postings_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_postings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string
          id: string
          nomination_id: string
          notes: string | null
          paid_at: string | null
          referrer_employee_id: string
          scheduled_date: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string
          id?: string
          nomination_id: string
          notes?: string | null
          paid_at?: string | null
          referrer_employee_id: string
          scheduled_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          id?: string
          nomination_id?: string
          notes?: string | null
          paid_at?: string | null
          referrer_employee_id?: string
          scheduled_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: true
            referencedRelation: "referral_nominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referrer_employee_id_fkey"
            columns: ["referrer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_360_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          deadline: string
          description: string | null
          id: string
          is_anonymous: boolean
          name: string
          period_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline: string
          description?: string | null
          id?: string
          is_anonymous?: boolean
          name: string
          period_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline?: string
          description?: string | null
          id?: string
          is_anonymous?: boolean
          name?: string
          period_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_360_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_360_campaigns_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_360_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_360_questions: {
        Row: {
          campaign_id: string
          category: string
          created_at: string
          id: string
          question_text: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          campaign_id: string
          category: string
          created_at?: string
          id?: string
          question_text: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          campaign_id?: string
          category?: string
          created_at?: string
          id?: string
          question_text?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_360_questions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "review_360_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_360_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_360_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          question_id: string
          reviewer_id: string
          score: number | null
          tenant_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id: string
          reviewer_id: string
          score?: number | null
          tenant_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id?: string
          reviewer_id?: string
          score?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_360_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "review_360_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_360_responses_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "review_360_reviewers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_360_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_360_reviewers: {
        Row: {
          created_at: string
          id: string
          is_anonymous: boolean
          reviewer_employee_id: string
          reviewer_type: string
          subject_id: string
          submitted_at: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_anonymous?: boolean
          reviewer_employee_id: string
          reviewer_type: string
          subject_id: string
          submitted_at?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_anonymous?: boolean
          reviewer_employee_id?: string
          reviewer_type?: string
          subject_id?: string
          submitted_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_360_reviewers_reviewer_employee_id_fkey"
            columns: ["reviewer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_360_reviewers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "review_360_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_360_reviewers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_360_subjects: {
        Row: {
          campaign_id: string
          created_at: string
          employee_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          employee_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_360_subjects_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "review_360_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_360_subjects_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_360_subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service: {
        Row: {
          app_role_group_id: string | null
          app_role_group_uuid: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string | null
          release_status: string | null
          route_path: string | null
          service_category_id: string | null
          sort_order: number | null
          target_audience: string | null
          title: string | null
        }
        Insert: {
          app_role_group_id?: string | null
          app_role_group_uuid?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          release_status?: string | null
          route_path?: string | null
          service_category_id?: string | null
          sort_order?: number | null
          target_audience?: string | null
          title?: string | null
        }
        Update: {
          app_role_group_id?: string | null
          app_role_group_uuid?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          release_status?: string | null
          route_path?: string | null
          service_category_id?: string | null
          sort_order?: number | null
          target_audience?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "service_category"
            referencedColumns: ["id"]
          },
        ]
      }
      service_assignments: {
        Row: {
          created_at: string
          id: string
          service_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          service_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_assignments_users: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          is_available: boolean
          service_assignment_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          is_available?: boolean
          service_assignment_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          is_available?: boolean
          service_assignment_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_assignments_users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_assignments_users_service_assignment_id_fkey"
            columns: ["service_assignment_id"]
            isOneToOne: false
            referencedRelation: "service_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_assignments_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_category: {
        Row: {
          description: string | null
          id: string
          name: string | null
          release_status: string | null
          sort_order: number | null
        }
        Insert: {
          description?: string | null
          id?: string
          name?: string | null
          release_status?: string | null
          sort_order?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          name?: string | null
          release_status?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      service_class: {
        Row: {
          id: string
          name: string | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          name?: string | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          name?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      service_class_index: {
        Row: {
          id: string
          service_category_id: string | null
          service_class_id: string | null
        }
        Insert: {
          id?: string
          service_category_id?: string | null
          service_class_id?: string | null
        }
        Update: {
          id?: string
          service_category_id?: string | null
          service_class_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_class_index_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "service_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_class_index_service_class_id_fkey"
            columns: ["service_class_id"]
            isOneToOne: false
            referencedRelation: "service_class"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_assigned_members: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          position_id: string
          simulation_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          position_id: string
          simulation_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          position_id?: string
          simulation_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_assigned_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_assigned_members_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "simulation_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_assigned_members_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "project_simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_assigned_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_position_requirements: {
        Row: {
          created_at: string
          id: string
          is_essential: boolean
          position_id: string
          requirement_id: string
          tenant_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_essential?: boolean
          position_id: string
          requirement_id: string
          tenant_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_essential?: boolean
          position_id?: string
          requirement_id?: string
          tenant_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "simulation_position_requirements_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "simulation_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_position_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "skill_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_position_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_positions: {
        Row: {
          created_at: string
          id: string
          name: string
          simulation_id: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          simulation_id: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          simulation_id?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_positions_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "project_simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_consultations: {
        Row: {
          category_tags: string[]
          created_at: string
          employee_id: string
          id: string
          manager_id: string
          manager_reply: string | null
          message: string | null
          replied_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          category_tags?: string[]
          created_at?: string
          employee_id: string
          id?: string
          manager_id: string
          manager_reply?: string | null
          message?: string | null
          replied_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          category_tags?: string[]
          created_at?: string
          employee_id?: string
          id?: string
          manager_id?: string
          manager_reply?: string | null
          message?: string | null
          replied_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_consultations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_consultations_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_consultations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_feedback_comments: {
        Row: {
          category: string
          comment: string
          created_at: string
          id: string
          receiver_employee_id: string
          related_id: string | null
          sender_employee_id: string
          tenant_id: string
        }
        Insert: {
          category: string
          comment: string
          created_at?: string
          id?: string
          receiver_employee_id: string
          related_id?: string | null
          sender_employee_id: string
          tenant_id: string
        }
        Update: {
          category?: string
          comment?: string
          created_at?: string
          id?: string
          receiver_employee_id?: string
          related_id?: string | null
          sender_employee_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_feedback_comments_receiver_employee_id_fkey"
            columns: ["receiver_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_feedback_comments_sender_employee_id_fkey"
            columns: ["sender_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_feedback_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_growth_milestones: {
        Row: {
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          description: string | null
          employee_id: string
          id: string
          proposed_by: string
          sort_order: number
          status: string
          target_date: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          description?: string | null
          employee_id: string
          id?: string
          proposed_by: string
          sort_order?: number
          status?: string
          target_date?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string
          id?: string
          proposed_by?: string
          sort_order?: number
          status?: string
          target_date?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_growth_milestones_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_growth_milestones_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_growth_milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_levels: {
        Row: {
          color_hex: string
          created_at: string
          criteria: string | null
          id: string
          name: string
          skill_level_set_id: string | null
          sort_order: number
          tenant_id: string
        }
        Insert: {
          color_hex?: string
          created_at?: string
          criteria?: string | null
          id?: string
          name: string
          skill_level_set_id?: string | null
          sort_order?: number
          tenant_id: string
        }
        Update: {
          color_hex?: string
          created_at?: string
          criteria?: string | null
          id?: string
          name?: string
          skill_level_set_id?: string | null
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_levels_skill_level_set_id_fkey"
            columns: ["skill_level_set_id"]
            isOneToOne: false
            referencedRelation: "tenant_skill_level_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_map_drafts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          snapshot: Json
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          snapshot?: Json
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          snapshot?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_map_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_map_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_requirement_applications: {
        Row: {
          created_at: string
          employee_id: string
          evidence: string | null
          hr_approved_at: string | null
          hr_approved_by: string | null
          hr_comment: string | null
          id: string
          manager_approved_at: string | null
          manager_approved_by: string | null
          manager_comment: string | null
          requirement_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          evidence?: string | null
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          hr_comment?: string | null
          id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_comment?: string | null
          requirement_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          evidence?: string | null
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          hr_comment?: string | null
          id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_comment?: string | null
          requirement_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_requirement_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_requirement_applications_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_requirement_applications_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_requirement_applications_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "skill_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_requirement_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_requirements: {
        Row: {
          category: string | null
          created_at: string
          criteria: string | null
          id: string
          level_id: string | null
          name: string
          skill_id: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          criteria?: string | null
          id?: string
          level_id?: string | null
          name: string
          skill_id: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          criteria?: string | null
          id?: string
          level_id?: string | null
          name?: string
          skill_id?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_requirements_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "skill_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_requirements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "tenant_skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_role_applications: {
        Row: {
          created_at: string
          employee_id: string
          hr_approved_at: string | null
          hr_approved_by: string | null
          hr_comment: string | null
          id: string
          manager_approved_at: string | null
          manager_approved_by: string | null
          manager_comment: string | null
          note: string | null
          skill_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          hr_comment?: string | null
          id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_comment?: string | null
          note?: string | null
          skill_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          hr_comment?: string | null
          id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_comment?: string | null
          note?: string | null
          skill_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_role_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_role_applications_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_role_applications_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_role_applications_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "tenant_skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_role_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_check_group_analysis: {
        Row: {
          avg_score_a: number | null
          avg_score_b: number | null
          avg_score_c: number | null
          avg_score_d: number | null
          calculated_at: string
          division_id: string | null
          group_name: string
          health_risk_a: number | null
          health_risk_b: number | null
          high_stress_count: number | null
          high_stress_rate: number | null
          id: string
          is_suppressed: boolean
          period_id: string
          respondent_count: number
          scale_averages: Json | null
          tenant_id: string
          total_health_risk: number | null
        }
        Insert: {
          avg_score_a?: number | null
          avg_score_b?: number | null
          avg_score_c?: number | null
          avg_score_d?: number | null
          calculated_at?: string
          division_id?: string | null
          group_name: string
          health_risk_a?: number | null
          health_risk_b?: number | null
          high_stress_count?: number | null
          high_stress_rate?: number | null
          id?: string
          is_suppressed?: boolean
          period_id: string
          respondent_count?: number
          scale_averages?: Json | null
          tenant_id: string
          total_health_risk?: number | null
        }
        Update: {
          avg_score_a?: number | null
          avg_score_b?: number | null
          avg_score_c?: number | null
          avg_score_d?: number | null
          calculated_at?: string
          division_id?: string | null
          group_name?: string
          health_risk_a?: number | null
          health_risk_b?: number | null
          high_stress_count?: number | null
          high_stress_rate?: number | null
          id?: string
          is_suppressed?: boolean
          period_id?: string
          respondent_count?: number
          scale_averages?: Json | null
          tenant_id?: string
          total_health_risk?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stress_check_group_analysis_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_group_analysis_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis"
            referencedColumns: ["division_id"]
          },
          {
            foreignKeyName: "stress_check_group_analysis_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "stress_check_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_group_analysis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_check_high_stress_criteria: {
        Row: {
          condition_1_b_threshold: number
          condition_2_ac_threshold: number
          condition_2_b_threshold: number
          created_at: string | null
          description: string | null
          evaluation_method: string
          id: string
          question_count: number
          updated_at: string | null
        }
        Insert: {
          condition_1_b_threshold: number
          condition_2_ac_threshold: number
          condition_2_b_threshold: number
          created_at?: string | null
          description?: string | null
          evaluation_method: string
          id?: string
          question_count: number
          updated_at?: string | null
        }
        Update: {
          condition_1_b_threshold?: number
          condition_2_ac_threshold?: number
          condition_2_b_threshold?: number
          created_at?: string | null
          description?: string | null
          evaluation_method?: string
          id?: string
          question_count?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      stress_check_interviews: {
        Row: {
          created_at: string
          doctor_employee_id: string | null
          doctor_opinion: string | null
          employee_id: string
          follow_up_date: string | null
          follow_up_notes: string | null
          id: string
          interview_date: string | null
          interview_status: string
          measure_details: string | null
          period_id: string
          result_id: string
          tenant_id: string
          updated_at: string
          work_measures: string | null
        }
        Insert: {
          created_at?: string
          doctor_employee_id?: string | null
          doctor_opinion?: string | null
          employee_id: string
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          interview_date?: string | null
          interview_status?: string
          measure_details?: string | null
          period_id: string
          result_id: string
          tenant_id: string
          updated_at?: string
          work_measures?: string | null
        }
        Update: {
          created_at?: string
          doctor_employee_id?: string | null
          doctor_opinion?: string | null
          employee_id?: string
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          interview_date?: string | null
          interview_status?: string
          measure_details?: string | null
          period_id?: string
          result_id?: string
          tenant_id?: string
          updated_at?: string
          work_measures?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stress_check_interviews_doctor_employee_id_fkey"
            columns: ["doctor_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_interviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_interviews_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "stress_check_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_interviews_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "stress_check_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_interviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_check_period_divisions: {
        Row: {
          created_at: string
          division_id: string
          id: string
          period_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          division_id: string
          id?: string
          period_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          division_id?: string
          id?: string
          period_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stress_check_period_divisions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_period_divisions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis"
            referencedColumns: ["division_id"]
          },
          {
            foreignKeyName: "stress_check_period_divisions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "stress_check_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_period_divisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_check_periods: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          division_establishment_id: string | null
          end_date: string
          fiscal_year: number
          high_stress_method: string
          id: string
          labor_office_name: string | null
          notification_text: string | null
          questionnaire_type: string
          start_date: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
          workplace_address: string | null
          workplace_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          division_establishment_id?: string | null
          end_date: string
          fiscal_year: number
          high_stress_method?: string
          id?: string
          labor_office_name?: string | null
          notification_text?: string | null
          questionnaire_type?: string
          start_date: string
          status?: string
          tenant_id: string
          title?: string
          updated_at?: string
          workplace_address?: string | null
          workplace_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          division_establishment_id?: string | null
          end_date?: string
          fiscal_year?: number
          high_stress_method?: string
          id?: string
          labor_office_name?: string | null
          notification_text?: string | null
          questionnaire_type?: string
          start_date?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          workplace_address?: string | null
          workplace_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stress_check_periods_division_establishment_id_fkey"
            columns: ["division_establishment_id"]
            isOneToOne: false
            referencedRelation: "division_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_periods_division_establishment_id_fkey"
            columns: ["division_establishment_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis_establishment"
            referencedColumns: ["division_establishment_id"]
          },
          {
            foreignKeyName: "stress_check_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_check_questions: {
        Row: {
          category: string
          id: string
          is_reverse: boolean
          question_no: number
          question_text: string
          questionnaire_type: string
          scale_labels: Json
          scale_name: string
          score_weights: Json
          sort_order: number
        }
        Insert: {
          category: string
          id?: string
          is_reverse?: boolean
          question_no: number
          question_text: string
          questionnaire_type?: string
          scale_labels?: Json
          scale_name: string
          score_weights?: Json
          sort_order: number
        }
        Update: {
          category?: string
          id?: string
          is_reverse?: boolean
          question_no?: number
          question_text?: string
          questionnaire_type?: string
          scale_labels?: Json
          scale_name?: string
          score_weights?: Json
          sort_order?: number
        }
        Relationships: []
      }
      stress_check_response_options: {
        Row: {
          created_at: string | null
          id: string
          label: string
          scale_type: string
          score: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          scale_type: string
          score: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          scale_type?: string
          score?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      stress_check_responses: {
        Row: {
          answer: number
          answered_at: string
          employee_id: string
          id: string
          period_id: string
          question_id: string
          tenant_id: string
        }
        Insert: {
          answer: number
          answered_at?: string
          employee_id: string
          id?: string
          period_id: string
          question_id: string
          tenant_id: string
        }
        Update: {
          answer?: number
          answered_at?: string
          employee_id?: string
          id?: string
          period_id?: string
          question_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stress_check_responses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_responses_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "stress_check_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "stress_check_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_check_results: {
        Row: {
          calculated_at: string
          employee_id: string
          high_stress_reason: string | null
          id: string
          interview_requested: boolean
          interview_requested_at: string | null
          is_high_stress: boolean
          needs_interview: boolean
          period_id: string
          scale_scores: Json | null
          score_a: number | null
          score_b: number | null
          score_c: number | null
          score_d: number | null
          tenant_id: string
        }
        Insert: {
          calculated_at?: string
          employee_id: string
          high_stress_reason?: string | null
          id?: string
          interview_requested?: boolean
          interview_requested_at?: string | null
          is_high_stress?: boolean
          needs_interview?: boolean
          period_id: string
          scale_scores?: Json | null
          score_a?: number | null
          score_b?: number | null
          score_c?: number | null
          score_d?: number | null
          tenant_id: string
        }
        Update: {
          calculated_at?: string
          employee_id?: string
          high_stress_reason?: string | null
          id?: string
          interview_requested?: boolean
          interview_requested_at?: string | null
          is_high_stress?: boolean
          needs_interview?: boolean
          period_id?: string
          scale_scores?: Json | null
          score_a?: number | null
          score_b?: number | null
          score_c?: number | null
          score_d?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stress_check_results_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_results_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "stress_check_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_check_scale_conversions: {
        Row: {
          formula: string
          gender: string
          id: string
          level_1_max: number
          level_1_min: number
          level_2_max: number
          level_2_min: number
          level_3_max: number
          level_3_min: number
          level_4_max: number
          level_4_min: number
          level_5_max: number
          level_5_min: number
          scale_name: string
        }
        Insert: {
          formula: string
          gender: string
          id?: string
          level_1_max: number
          level_1_min: number
          level_2_max: number
          level_2_min: number
          level_3_max: number
          level_3_min: number
          level_4_max: number
          level_4_min: number
          level_5_max: number
          level_5_min: number
          scale_name: string
        }
        Update: {
          formula?: string
          gender?: string
          id?: string
          level_1_max?: number
          level_1_min?: number
          level_2_max?: number
          level_2_min?: number
          level_3_max?: number
          level_3_min?: number
          level_4_max?: number
          level_4_min?: number
          level_5_max?: number
          level_5_min?: number
          scale_name?: string
        }
        Relationships: []
      }
      stress_check_submissions: {
        Row: {
          consent_at: string | null
          consent_to_employer: boolean
          created_at: string
          employee_id: string
          id: string
          period_id: string
          started_at: string | null
          status: string
          submitted_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          consent_at?: string | null
          consent_to_employer?: boolean
          created_at?: string
          employee_id: string
          id?: string
          period_id: string
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          consent_at?: string | null
          consent_to_employer?: boolean
          created_at?: string
          employee_id?: string
          id?: string
          period_id?: string
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stress_check_submissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_submissions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "stress_check_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_check_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_interview_records: {
        Row: {
          created_at: string
          created_by: string
          doctor_id: string
          doctor_opinion: string | null
          follow_up_date: string | null
          follow_up_status: string | null
          id: string
          interview_date: string
          interview_duration: number | null
          interview_notes: string | null
          interviewee_id: string
          measure_details: string | null
          measure_type: string | null
          status: string
          stress_result_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          doctor_id: string
          doctor_opinion?: string | null
          follow_up_date?: string | null
          follow_up_status?: string | null
          id?: string
          interview_date?: string
          interview_duration?: number | null
          interview_notes?: string | null
          interviewee_id: string
          measure_details?: string | null
          measure_type?: string | null
          status?: string
          stress_result_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          doctor_id?: string
          doctor_opinion?: string | null
          follow_up_date?: string | null
          follow_up_status?: string | null
          id?: string
          interview_date?: string
          interview_duration?: number | null
          interview_notes?: string | null
          interviewee_id?: string
          measure_details?: string | null
          measure_type?: string | null
          status?: string
          stress_result_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stress_interview_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_interview_records_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_interview_records_interviewee_id_fkey"
            columns: ["interviewee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_interview_records_stress_result_id_fkey"
            columns: ["stress_result_id"]
            isOneToOne: false
            referencedRelation: "stress_check_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stress_interview_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      succession_candidates: {
        Row: {
          created_at: string
          development_actions: string | null
          employee_id: string
          id: string
          notes: string | null
          performance_score: number
          position_id: string
          potential_score: number
          readiness: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          development_actions?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          performance_score?: number
          position_id: string
          potential_score?: number
          readiness?: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          development_actions?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          performance_score?: number
          position_id?: string
          potential_score?: number
          readiness?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "succession_candidates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_candidates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "succession_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_candidates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      succession_positions: {
        Row: {
          created_at: string
          current_holder_id: string | null
          division_id: string | null
          id: string
          is_active: boolean
          notes: string | null
          risk_level: string
          sort_order: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_holder_id?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          risk_level?: string
          sort_order?: number
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_holder_id?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          risk_level?: string
          sort_order?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "succession_positions_current_holder_id_fkey"
            columns: ["current_holder_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_positions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_positions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis"
            referencedColumns: ["division_id"]
          },
          {
            foreignKeyName: "succession_positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_qr_permissions: {
        Row: {
          can_display: boolean
          created_at: string
          employee_user_id: string
          id: string
          scope: string | null
          supervisor_user_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          can_display?: boolean
          created_at?: string
          employee_user_id: string
          id?: string
          scope?: string | null
          supervisor_user_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          can_display?: boolean
          created_at?: string
          employee_user_id?: string
          id?: string
          scope?: string | null
          supervisor_user_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_qr_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          question_id: string
          score: number
          tenant_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id: string
          score: number
          tenant_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id?: string
          score?: number
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      telework_activity_stats: {
        Row: {
          active_seconds: number | null
          date: string
          id: string
          idle_seconds: number | null
          last_updated: string | null
          pc_active_seconds: number | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          active_seconds?: number | null
          date: string
          id?: string
          idle_seconds?: number | null
          last_updated?: string | null
          pc_active_seconds?: number | null
          tenant_id: string
          user_id: string
        }
        Update: {
          active_seconds?: number | null
          date?: string
          id?: string
          idle_seconds?: number | null
          last_updated?: string | null
          pc_active_seconds?: number | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      telework_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string | null
          id: string
          payload: Json | null
          related_id: string | null
          related_table: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          related_id?: string | null
          related_table?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          related_id?: string | null
          related_table?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      telework_pc_devices: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          device_identifier: string | null
          device_name: string | null
          device_secret: string | null
          id: string
          last_seen: string | null
          metadata: Json | null
          registered_at: string | null
          registration_token_hash: string | null
          rejected_at: string | null
          rejection_reason: string | null
          secret_delivered_at: string | null
          secret_issued_at: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          device_identifier?: string | null
          device_name?: string | null
          device_secret?: string | null
          id?: string
          last_seen?: string | null
          metadata?: Json | null
          registered_at?: string | null
          registration_token_hash?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          secret_delivered_at?: string | null
          secret_issued_at?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          device_identifier?: string | null
          device_name?: string | null
          device_secret?: string | null
          id?: string
          last_seen?: string | null
          metadata?: Json | null
          registered_at?: string | null
          registration_token_hash?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          secret_delivered_at?: string | null
          secret_issued_at?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      telework_pc_logs: {
        Row: {
          created_at: string | null
          device_id: string | null
          event_time: string
          event_type: string
          id: string
          info: Json | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          event_time: string
          event_type: string
          id?: string
          info?: Json | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          event_time?: string
          event_type?: string
          id?: string
          info?: Json | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      telework_sessions: {
        Row: {
          created_at: string | null
          device_id: string | null
          end_at: string | null
          end_ip: unknown
          end_lat: number | null
          end_lon: number | null
          end_user_agent: string | null
          id: string
          start_at: string
          start_ip: unknown
          start_lat: number | null
          start_lon: number | null
          start_user_agent: string | null
          status: string | null
          summary_text: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
          worked_seconds: number | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          end_at?: string | null
          end_ip?: unknown
          end_lat?: number | null
          end_lon?: number | null
          end_user_agent?: string | null
          id?: string
          start_at: string
          start_ip?: unknown
          start_lat?: number | null
          start_lon?: number | null
          start_user_agent?: string | null
          status?: string | null
          summary_text?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
          worked_seconds?: number | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          end_at?: string | null
          end_ip?: unknown
          end_lat?: number | null
          end_lon?: number | null
          end_user_agent?: string | null
          id?: string
          start_at?: string
          start_ip?: unknown
          start_lat?: number | null
          start_lon?: number | null
          start_user_agent?: string | null
          status?: string | null
          summary_text?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
          worked_seconds?: number | null
        }
        Relationships: []
      }
      tenant_contracts: {
        Row: {
          applicant_email: string
          applicant_name: string
          application_date: string
          bank_transfer_amount_received: number
          bank_transfer_due_date: string | null
          company_name: string
          contract_end_at: string | null
          contract_start_at: string | null
          created_at: string
          id: string
          industry: string | null
          max_employees: number
          paid_amount: number
          payment_method: string
          payment_status: string
          plan_type: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          tenant_id: string
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          application_date?: string
          bank_transfer_amount_received?: number
          bank_transfer_due_date?: string | null
          company_name: string
          contract_end_at?: string | null
          contract_start_at?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          max_employees: number
          paid_amount?: number
          payment_method?: string
          payment_status?: string
          plan_type: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id: string
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          application_date?: string
          bank_transfer_amount_received?: number
          bank_transfer_due_date?: string | null
          company_name?: string
          contract_end_at?: string | null
          contract_start_at?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          max_employees?: number
          paid_amount?: number
          payment_method?: string
          payment_status?: string
          plan_type?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_hr_assistant_messages: {
        Row: {
          cited_chunk_ids: string[] | null
          content: string
          created_at: string
          id: string
          metadata: Json | null
          mode: string
          role: string
          session_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          cited_chunk_ids?: string[] | null
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          mode?: string
          role: string
          session_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          cited_chunk_ids?: string[] | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          mode?: string
          role?: string
          session_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_hr_assistant_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tenant_hr_assistant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_hr_assistant_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_hr_assistant_sessions: {
        Row: {
          created_at: string
          id: string
          mode: string
          tenant_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          tenant_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_hr_assistant_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_hr_assistant_templates: {
        Row: {
          created_at: string
          id: string
          mode: string
          question_text: string
          source: string
          status: string
          tenant_id: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          question_text: string
          source?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          question_text?: string
          source?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_hr_assistant_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_inquiry_chat_messages: {
        Row: {
          cited_chunk_ids: string[] | null
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          cited_chunk_ids?: string[] | null
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          cited_chunk_ids?: string[] | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_inquiry_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tenant_inquiry_chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_inquiry_chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_inquiry_chat_sessions: {
        Row: {
          created_at: string
          id: string
          tenant_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tenant_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_inquiry_chat_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_portal_settings: {
        Row: {
          hr_inquiry_email: string | null
          pulse_survey_cadence: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          hr_inquiry_email?: string | null
          pulse_survey_cadence?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          hr_inquiry_email?: string | null
          pulse_survey_cadence?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_portal_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_rag_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          detail: Json
          document_id: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          document_id?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          document_id?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_rag_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_rag_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_rag_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "tenant_rag_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_rag_chunks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_rag_documents: {
        Row: {
          byte_size: number | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          ingest_completed_at: string | null
          ingest_started_at: string | null
          mime_type: string | null
          original_filename: string | null
          source_kind: string
          source_url: string | null
          status: string
          storage_path: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          byte_size?: number | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          ingest_completed_at?: string | null
          ingest_started_at?: string | null
          mime_type?: string | null
          original_filename?: string | null
          source_kind: string
          source_url?: string | null
          status?: string
          storage_path?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          byte_size?: number | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          ingest_completed_at?: string | null
          ingest_started_at?: string | null
          mime_type?: string | null
          original_filename?: string | null
          source_kind?: string
          source_url?: string | null
          status?: string
          storage_path?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_rag_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_service: {
        Row: {
          id: string
          service_id: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          service_id?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          id?: string
          service_id?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_service_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_service_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_skill_level_sets: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_skill_level_sets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_skills: {
        Row: {
          color_hex: string
          created_at: string
          id: string
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          color_hex?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          color_hex?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_stress_settings: {
        Row: {
          min_group_analysis_respondents: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          min_group_analysis_respondents?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          min_group_analysis_respondents?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_stress_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ui_dashboard_element: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          tenant_id: string
          ui_dashboard_element_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          tenant_id: string
          ui_dashboard_element_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          tenant_id?: string
          ui_dashboard_element_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ui_dashboard_element_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_ui_dashboard_element_ui_dashboard_element_id_fkey"
            columns: ["ui_dashboard_element_id"]
            isOneToOne: false
            referencedRelation: "ui_dashboard_element"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          business_description: string | null
          company_name: string | null
          contact_date: string | null
          contract_end_at: string | null
          created_at: string | null
          culture_and_benefits: string | null
          employee_count: number | null
          founding_year: number | null
          id: string
          industry: string | null
          is_template: boolean
          max_employees: number
          mission_vision: string | null
          name: string | null
          onboarding_completed_at: string | null
          paid_amount: number | null
          paid_date: string | null
          plan_type: string
          pulse_survey_cadence: string
          recruitment_strengths: string | null
          status: string
          stripe_customer_id: string | null
        }
        Insert: {
          business_description?: string | null
          company_name?: string | null
          contact_date?: string | null
          contract_end_at?: string | null
          created_at?: string | null
          culture_and_benefits?: string | null
          employee_count?: number | null
          founding_year?: number | null
          id?: string
          industry?: string | null
          is_template?: boolean
          max_employees?: number
          mission_vision?: string | null
          name?: string | null
          onboarding_completed_at?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          plan_type?: string
          pulse_survey_cadence?: string
          recruitment_strengths?: string | null
          status?: string
          stripe_customer_id?: string | null
        }
        Update: {
          business_description?: string | null
          company_name?: string | null
          contact_date?: string | null
          contract_end_at?: string | null
          created_at?: string | null
          culture_and_benefits?: string | null
          employee_count?: number | null
          founding_year?: number | null
          id?: string
          industry?: string | null
          is_template?: boolean
          max_employees?: number
          mission_vision?: string | null
          name?: string | null
          onboarding_completed_at?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          plan_type?: string
          pulse_survey_cadence?: string
          recruitment_strengths?: string | null
          status?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      timecard_corrections: {
        Row: {
          corrected_by: string
          corrected_clock_in: string | null
          corrected_clock_out: string | null
          correction_source: string | null
          created_at: string | null
          employee_id: string
          id: string
          original_clock_in: string | null
          original_clock_out: string | null
          reason: string | null
          tenant_id: string
          work_date: string
        }
        Insert: {
          corrected_by: string
          corrected_clock_in?: string | null
          corrected_clock_out?: string | null
          correction_source?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          original_clock_in?: string | null
          original_clock_out?: string | null
          reason?: string | null
          tenant_id: string
          work_date: string
        }
        Update: {
          corrected_by?: string
          corrected_clock_in?: string | null
          corrected_clock_out?: string | null
          correction_source?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          original_clock_in?: string | null
          original_clock_out?: string | null
          reason?: string | null
          tenant_id?: string
          work_date?: string
        }
        Relationships: []
      }
      training_plan_template_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          template_id: string
          tenant_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          template_id: string
          tenant_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_template_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "el_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_template_courses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "training_plan_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_template_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          skill_id: string | null
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          skill_id?: string | null
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          skill_id?: string | null
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_templates_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "tenant_skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plan_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      turnover_risk_action_logs: {
        Row: {
          action_type: string
          actioned_at: string
          employee_id: string
          id: string
          logged_by: string
          notes: string | null
          tenant_id: string
        }
        Insert: {
          action_type: string
          actioned_at?: string
          employee_id: string
          id?: string
          logged_by: string
          notes?: string | null
          tenant_id: string
        }
        Update: {
          action_type?: string
          actioned_at?: string
          employee_id?: string
          id?: string
          logged_by?: string
          notes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnover_risk_action_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_risk_action_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_risk_action_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      turnover_risk_alerts: {
        Row: {
          channel: string
          employee_id: string
          error_message: string | null
          id: string
          notified_at: string
          previous_risk_level: string
          recipient_employee_id: string | null
          recipient_type: string
          risk_score: number
          status: string
          tenant_id: string
        }
        Insert: {
          channel?: string
          employee_id: string
          error_message?: string | null
          id?: string
          notified_at?: string
          previous_risk_level: string
          recipient_employee_id?: string | null
          recipient_type: string
          risk_score: number
          status: string
          tenant_id: string
        }
        Update: {
          channel?: string
          employee_id?: string
          error_message?: string | null
          id?: string
          notified_at?: string
          previous_risk_level?: string
          recipient_employee_id?: string | null
          recipient_type?: string
          risk_score?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnover_risk_alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_risk_alerts_recipient_employee_id_fkey"
            columns: ["recipient_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_risk_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      turnover_risk_scores: {
        Row: {
          calculated_at: string
          employee_id: string
          id: string
          risk_level: string
          risk_score: number
          score_factors: Json
          tenant_id: string
        }
        Insert: {
          calculated_at?: string
          employee_id: string
          id?: string
          risk_level: string
          risk_score: number
          score_factors?: Json
          tenant_id: string
        }
        Update: {
          calculated_at?: string
          employee_id?: string
          id?: string
          risk_level?: string
          risk_score?: number
          score_factors?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnover_risk_scores_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_risk_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ui_dashboard_element: {
        Row: {
          created_at: string
          description: string | null
          element_key: string
          element_type: string
          id: string
          is_active: boolean
          label: string
          screen: string
          service_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          element_key: string
          element_type: string
          id?: string
          is_active?: boolean
          label: string
          screen: string
          service_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          element_key?: string
          element_type?: string
          id?: string
          is_active?: boolean
          label?: string
          screen?: string
          service_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ui_dashboard_element_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
        ]
      }
      work_time_records: {
        Row: {
          created_at: string | null
          duration_minutes: number
          employee_id: string
          end_time: string | null
          id: string
          is_holiday: boolean | null
          punch_supervisor_user_id: string | null
          qr_session_id: string | null
          record_date: string
          source: string | null
          start_time: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes: number
          employee_id: string
          end_time?: string | null
          id?: string
          is_holiday?: boolean | null
          punch_supervisor_user_id?: string | null
          qr_session_id?: string | null
          record_date: string
          source?: string | null
          start_time?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number
          employee_id?: string
          end_time?: string | null
          id?: string
          is_holiday?: boolean | null
          punch_supervisor_user_id?: string | null
          qr_session_id?: string | null
          record_date?: string
          source?: string | null
          start_time?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_time_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_time_records_qr_session_id_fkey"
            columns: ["qr_session_id"]
            isOneToOne: false
            referencedRelation: "qr_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_time_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workplace_improvement_plans: {
        Row: {
          actual_effect_score: number | null
          ai_generated_title: string
          ai_reason: string
          created_at: string | null
          division_id: string | null
          expected_effect: string | null
          follow_up_date: string | null
          id: string
          manual_ref: string | null
          priority: string
          proposed_actions: Json
          registered_by: string | null
          source_analysis_id: string | null
          source_division_establishment_id: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          actual_effect_score?: number | null
          ai_generated_title: string
          ai_reason: string
          created_at?: string | null
          division_id?: string | null
          expected_effect?: string | null
          follow_up_date?: string | null
          id?: string
          manual_ref?: string | null
          priority: string
          proposed_actions?: Json
          registered_by?: string | null
          source_analysis_id?: string | null
          source_division_establishment_id?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          actual_effect_score?: number | null
          ai_generated_title?: string
          ai_reason?: string
          created_at?: string | null
          division_id?: string | null
          expected_effect?: string | null
          follow_up_date?: string | null
          id?: string
          manual_ref?: string | null
          priority?: string
          proposed_actions?: Json
          registered_by?: string | null
          source_analysis_id?: string | null
          source_division_establishment_id?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workplace_improvement_plans_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workplace_improvement_plans_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis"
            referencedColumns: ["division_id"]
          },
          {
            foreignKeyName: "workplace_improvement_plans_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workplace_improvement_plans_source_division_establishment__fkey"
            columns: ["source_division_establishment_id"]
            isOneToOne: false
            referencedRelation: "division_establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workplace_improvement_plans_source_division_establishment__fkey"
            columns: ["source_division_establishment_id"]
            isOneToOne: false
            referencedRelation: "stress_group_analysis_establishment"
            referencedColumns: ["division_establishment_id"]
          },
          {
            foreignKeyName: "workplace_improvement_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      stress_group_analysis: {
        Row: {
          colleague_support: number | null
          control: number | null
          division_id: string | null
          health_risk: number | null
          high_stress_rate: number | null
          is_latest: boolean | null
          member_count: number | null
          name: string | null
          period_name: string | null
          previous_health_risk: number | null
          supervisor_support: number | null
          tenant_id: string | null
          workload: number | null
        }
        Relationships: [
          {
            foreignKeyName: "divisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_group_analysis_establishment: {
        Row: {
          colleague_support: number | null
          control: number | null
          division_establishment_id: string | null
          health_risk: number | null
          high_stress_rate: number | null
          is_latest: boolean | null
          is_suppressed: boolean | null
          member_count: number | null
          min_respondents_threshold: number | null
          name: string | null
          period_name: string | null
          previous_health_risk: number | null
          supervisor_support: number | null
          tenant_id: string | null
          workload: number | null
        }
        Relationships: [
          {
            foreignKeyName: "division_establishments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aggregate_monthly_closure: {
        Args: { p_closure_id: string; p_tenant_id: string }
        Returns: undefined
      }
      apply_job_posting_variant: {
        Args: { p_tenant_id: string; p_variant_id: string }
        Returns: undefined
      }
      check_employee_condition_drop_alert: {
        Args: { p_employee_id: string }
        Returns: {
          alert_type: string
          consecutive_low_days: number
          prior_avg: number
          recent_avg: number
        }[]
      }
      create_auth_user: {
        Args: { p_email: string; p_password: string }
        Returns: string
      }
      current_employee_app_role: { Args: never; Returns: string }
      current_employee_id: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      delete_auth_user: { Args: { p_user_id: string }; Returns: undefined }
      delete_division_safe: {
        Args: { p_division_id: string; p_tenant_id: string }
        Returns: undefined
      }
      detect_overtime_threshold_warnings: {
        Args: { p_closure_id: string; p_tenant_id: string }
        Returns: undefined
      }
      detect_timecard_anomalies: {
        Args: { p_tenant_id: string; p_year_month: string }
        Returns: {
          anomaly_type: string
          details: Json
          employee_id: string
          record_date: string
          work_time_record_id: string
        }[]
      }
      employee_can_view_division_event: {
        Args: { p_employee_division_id: string; p_event_division_id: string }
        Returns: boolean
      }
      expire_hr_law_documents: { Args: never; Returns: number }
      fn_supervisor_qr_permission_apply: {
        Args: {
          p_actor_user_id: string
          p_audit_action: string
          p_can_display: boolean
          p_employee_user_id: string
          p_scope: string
          p_supervisor_user_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      fn_supervisor_qr_permission_bulk_import_apply: {
        Args: {
          p_actor_user_id: string
          p_can_display: boolean
          p_employee_user_id: string
          p_scope: string
          p_supervisor_user_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      fn_supervisor_qr_permission_grant_self: {
        Args: { p_employee_user_id: string }
        Returns: Json
      }
      fn_supervisor_qr_permission_revoke_self: {
        Args: { p_permission_id: string }
        Returns: Json
      }
      generate_recovery_token: {
        Args: { p_expiry_hours?: number; p_user_id: string }
        Returns: string
      }
      get_36_risk_employees: {
        Args: { p_tenant_id: string; p_year_month: string }
        Returns: {
          department_name: string
          employee_id: string
          employee_name: string
          monthly_limit: number
          risk_level: string
          total_overtime_hours: number
          usage_rate: number
        }[]
      }
      get_auth_user_email: { Args: { p_user_id: string }; Returns: string }
      get_condition_drop_alerts: {
        Args: { p_days?: number }
        Returns: {
          alert_type: string
          consecutive_low_days: number
          division_name: string
          employee_id: string
          employee_name: string
          latest_checkin_date: string
          latest_score: number
          prior_avg: number
          recent_avg: number
        }[]
      }
      get_department_overtime_summary: {
        Args: { p_tenant_id: string; p_year_month: string }
        Returns: {
          avg_overtime: number
          department_id: string
          department_name: string
          employee_count: number
          max_overtime: number
          violation_count: number
          warning_count: number
        }[]
      }
      get_division_condition_summary: {
        Args: { p_days?: number }
        Returns: {
          avg_score: number
          division_id: string
          division_name: string
          respondent_count: number
        }[]
      }
      get_division_condition_trend: {
        Args: { p_days?: number; p_division_id: string }
        Returns: {
          avg_score: number
          checkin_date: string
          respondent_count: number
        }[]
      }
      get_employee_condition_averages: {
        Args: { p_days?: number }
        Returns: {
          avg_score: number
          employee_id: string
          recent_trend_down: boolean
          record_count: number
        }[]
      }
      get_overtime_gap_analysis: {
        Args: { p_tenant_id: string; p_year_month: string }
        Returns: {
          actual_hours: number
          approved_hours: number
          employee_id: string
          employee_name: string
          gap_hours: number
          gap_type: string
        }[]
      }
      get_overtime_trend: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_tenant_id: string
        }
        Returns: {
          avg_overtime: number
          max_overtime: number
          total_employees: number
          violation_count: number
          year_month: string
        }[]
      }
      get_tenant_condition_daily_trend: {
        Args: { p_days?: number }
        Returns: {
          avg_score: number
          checkin_date: string
          respondent_count: number
        }[]
      }
      get_tenant_condition_summary: {
        Args: { p_days?: number }
        Returns: {
          avg_score: number
          respondent_count: number
        }[]
      }
      get_tenant_employee_auth_email: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: string
      }
      increment_hr_template_usage: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      list_work_time_record_monthly_counts: {
        Args: { p_tenant_id: string }
        Returns: {
          row_count: number
          year_month: string
        }[]
      }
      match_hr_law_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          document_id: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_tenant_rag_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          chunk_index: number
          content: string
          document_id: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      myou_register_delivery: {
        Args: {
          p_company_id: string
          p_delivered_by: string
          p_delivery_date: string
          p_expiration_date: string
          p_last_delivery_at: string
          p_registered_at: string
          p_serial_number: string
        }
        Returns: undefined
      }
      rag_session_tenant_id: { Args: never; Returns: string }
      resolve_active_period_for_employee_v2: {
        Args: { p_employee_id: string }
        Returns: string
      }
      resolve_division_establishment_for_division: {
        Args: { p_division_id: string; p_tenant_id: string }
        Returns: string
      }
      resolve_division_establishment_for_employee: {
        Args: { p_employee_id: string }
        Returns: string
      }
      stress_group_analysis_for_layer: {
        Args: { p_layer: number; p_tenant_id: string }
        Returns: {
          colleague_support: number
          control: number
          health_risk: number
          high_stress_rate: number
          is_latest: boolean
          is_suppressed: boolean
          member_count: number
          min_respondents_threshold: number
          name: string
          period_end_date: string
          period_name: string
          previous_health_risk: number
          rollup_division_id: string
          supervisor_support: number
          tenant_id: string
          workload: number
        }[]
      }
      sync_service_assignment_users: {
        Args: { p_service_assignment_id: string }
        Returns: {
          inserted_count: number
        }[]
      }
      try_consume_ai_usage: {
        Args: {
          p_feature_name: string
          p_max_count?: number
          p_tenant_id: string
        }
        Returns: boolean
      }
      update_user_password: {
        Args: { p_new_password: string; p_user_id: string }
        Returns: undefined
      }
      upsert_overtime_settings: {
        Args: {
          p_annual_limit_hours: number
          p_average_limit_hours: number
          p_monthly_limit_hours: number
          p_monthly_warning_hours: number
        }
        Returns: string
      }
      upsert_tenant_portal_settings: {
        Args: { p_hr_inquiry_email: string }
        Returns: string
      }
      verify_recovery_token: {
        Args: { p_email: string; p_expiry_hours?: number; p_token: string }
        Returns: string
      }
    }
    Enums: {
      consultation_category:
        | "harassment"
        | "mental_health"
        | "workload"
        | "interpersonal"
        | "other"
      consultation_status: "open" | "in_progress" | "resolved"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      consultation_category: [
        "harassment",
        "mental_health",
        "workload",
        "interpersonal",
        "other",
      ],
      consultation_status: ["open", "in_progress", "resolved"],
    },
  },
} as const

