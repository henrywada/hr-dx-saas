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
            foreignKeyName: "divisions_tenant_id_fkey"
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
            foreignKeyName: "employees_tenant_id_fkey"
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
      service: {
        Row: {
          app_role_group_id: string | null
          app_role_group_uuid: string | null
          category: string | null
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
      stress_check_periods: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          fiscal_year: number
          high_stress_method: string
          id: string
          notification_text: string | null
          questionnaire_type: string
          start_date: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          fiscal_year: number
          high_stress_method?: string
          id?: string
          notification_text?: string | null
          questionnaire_type?: string
          start_date: string
          status?: string
          tenant_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          fiscal_year?: number
          high_stress_method?: string
          id?: string
          notification_text?: string | null
          questionnaire_type?: string
          start_date?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
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
      stress_interview_records: {
        Row: {
          id: string
          tenant_id: string
          stress_result_id: string
          doctor_id: string
          interviewee_id: string
          interview_date: string
          interview_duration: number | null
          interview_notes: string | null
          doctor_opinion: string | null
          measure_type: string | null
          measure_details: string | null
          follow_up_date: string | null
          follow_up_status: string
          status: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          stress_result_id: string
          doctor_id: string
          interviewee_id: string
          interview_date?: string
          interview_duration?: number | null
          interview_notes?: string | null
          doctor_opinion?: string | null
          measure_type?: string | null
          measure_details?: string | null
          follow_up_date?: string | null
          follow_up_status?: string
          status?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          stress_result_id?: string
          doctor_id?: string
          interviewee_id?: string
          interview_date?: string
          interview_duration?: number | null
          interview_notes?: string | null
          doctor_opinion?: string | null
          measure_type?: string | null
          measure_details?: string | null
          follow_up_date?: string | null
          follow_up_status?: string
          status?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stress_interview_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
            foreignKeyName: "stress_interview_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      tenants: {
        Row: {
          business_description: string | null
          company_name: string | null
          contact_date: string | null
          created_at: string | null
          culture_and_benefits: string | null
          employee_count: number | null
          id: string
          max_employees: number
          mission_vision: string | null
          name: string | null
          onboarding_completed_at: string | null
          paid_amount: number | null
          paid_date: string | null
          plan_type: string
        }
        Insert: {
          business_description?: string | null
          company_name?: string | null
          contact_date?: string | null
          created_at?: string | null
          culture_and_benefits?: string | null
          employee_count?: number | null
          id?: string
          max_employees?: number
          mission_vision?: string | null
          name?: string | null
          onboarding_completed_at?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          plan_type?: string
        }
        Update: {
          business_description?: string | null
          company_name?: string | null
          contact_date?: string | null
          created_at?: string | null
          culture_and_benefits?: string | null
          employee_count?: number | null
          id?: string
          max_employees?: number
          mission_vision?: string | null
          name?: string | null
          onboarding_completed_at?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          plan_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_employee_app_role: { Args: never; Returns: string }
      current_employee_id: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      fn_supervisor_qr_permission_apply: {
        Args: {
          p_actor_user_id: string
          p_audit_action: string
          p_can_display: boolean
          p_employee_user_id: string
          p_scope: string | null
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
          p_scope: string | null
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
      get_auth_user_email: { Args: { p_user_id: string }; Returns: string | null }
      get_tenant_employee_auth_email: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: string | null
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

