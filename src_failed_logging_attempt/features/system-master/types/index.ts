// src/features/system-master/types/index.ts

export type ServiceCategory = {
  id: string
  sort_order: number | null
  name: string | null
  description: string | null
  release_status: string | null
}

export type Service = {
  id: string
  service_category_id: string | null
  name: string | null
  category: string | null
  title: string | null
  description: string | null
  sort_order: number | null
  route_path: string | null
  app_role_group_id: string | null
  app_role_group_uuid: string | null
  target_audience: string | null
  release_status: string | null
}

export type AppRole = {
  id: string
  app_role: string | null
  name: string | null
}

export type AppRoleService = {
  id: string
  app_role_id: string | null
  service_id: string | null
}

export type TabType = 'service_category' | 'service' | 'app_role' | 'app_role_service'