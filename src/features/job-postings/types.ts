export interface JobPosting {
  id: string
  tenant_id: string
  status: 'draft' | 'published' | 'closed'
  title: string | null
  raw_memo: string | null
  description: string | null
  employment_type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'TEMPORARY' | 'INTERN' | null
  salary_min: number | null
  salary_max: number | null
  salary_unit: 'YEAR' | 'MONTH' | 'HOUR' | null
  postal_code: string | null
  address_region: string | null
  address_locality: string | null
  street_address: string | null
  published_at: string | null
  valid_through: string | null
  created_at: string
  updated_at: string
}

export type InsertJobPosting = Omit<JobPosting, 'id' | 'created_at' | 'updated_at'> & {
  tenant_id: string
}

export type UpdateJobPosting = Partial<Omit<JobPosting, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
