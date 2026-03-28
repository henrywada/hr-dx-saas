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
          sort_order?: number
          target_audience?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
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
      monthly_overtime_closures: {
        Row: {
          closed_at: string | null
          created_at: string | null
          id: string
          tenant_id: string
          updated_at: string | null
          year_month: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          tenant_id: string
          updated_at?: string | null
          year_month: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
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
        ]
      }
      myou_products: {
        Row: {
          created_at: string
          current_company_id: string | null
          expiration_date: string | null
          last_delivery_at: string | null
          serial_number: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          current_company_id?: string | null
          expiration_date?: string | null
          last_delivery_at?: string | null
          serial_number: string
          status?: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          current_company_id?: string | null
          expiration_date?: string | null
          last_delivery_at?: string | null
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
          stress_result_id: string
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
          stress_result_id: string
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
          stress_result_id?: string
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
      tenants: {
        Row: {
          business_description: string | null
          company_name: string | null
          contact_date: string | null
          contract_end_at: string | null
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
          contract_end_at?: string | null
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
          contract_end_at?: string | null
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
    }
    Functions: {
      create_auth_user: {
        Args: { p_email: string; p_password: string }
        Returns: string
      }
      current_employee_app_role: { Args: never; Returns: string }
      current_employee_id: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      delete_auth_user: { Args: { p_user_id: string }; Returns: undefined }
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
      get_auth_user_email: { Args: { p_user_id: string }; Returns: string }
      get_tenant_employee_auth_email: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: string
      }
      sync_service_assignment_users: {
        Args: { p_service_assignment_id: string }
        Returns: {
          inserted_count: number
        }[]
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
      verify_recovery_token: {
        Args: { p_email: string; p_expiry_hours?: number; p_token: string }
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

