Need to install the following packages:
supabase@2.76.11
Ok to proceed? (y) 
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
      system_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          employee_id: string | null
          entity_type: string | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          entity_type?: string | null
          id?: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          entity_type?: string | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_tenant_id_fkey"
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
      tenants: {
        Row: {
          contact_date: string | null
          created_at: string | null
          employee_count: number | null
          id: string
          name: string | null
          paid_amount: number | null
          paid_date: string | null
        }
        Insert: {
          contact_date?: string | null
          created_at?: string | null
          employee_count?: number | null
          id?: string
          name?: string | null
          paid_amount?: number | null
          paid_date?: string | null
        }
        Update: {
          contact_date?: string | null
          created_at?: string | null
          employee_count?: number | null
          id?: string
          name?: string | null
          paid_amount?: number | null
          paid_date?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
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

