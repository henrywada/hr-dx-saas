export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      service: {
        Row: {
          id: string
          name: string
          title: string | null
          description: string | null
          route_path: string | null
          sort_order: number
          service_category_id: string
          target_audience: string
          release_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          title?: string | null
          description?: string | null
          route_path?: string | null
          sort_order?: number
          service_category_id: string
          target_audience?: string
          release_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          title?: string | null
          description?: string | null
          route_path?: string | null
          sort_order?: number
          service_category_id?: string
          target_audience?: string
          release_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_service_category_id_fkey"
            columns: ["service_category_id"]
            referencedRelation: "service_category"
            referencedColumns: ["id"]
          }
        ]
      }
      tenant_service: {
        Row: {
          tenant_id: string
          service_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          tenant_id: string
          service_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          tenant_id?: string
          service_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_service_service_id_fkey"
            columns: ["service_id"]
            referencedRelation: "service"
            referencedColumns: ["id"]
          }
        ]
      }
      service_category: {
        Row: {
          id: string
          name: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          name: string
          app_role_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          name: string
          app_role_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          name?: string
          app_role_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_app_role_id_fkey"
            columns: ["app_role_id"]
            referencedRelation: "app_role"
            referencedColumns: ["id"]
          }
        ]
      }
      app_role: {
        Row: {
          id: string
          app_role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          app_role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          app_role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


