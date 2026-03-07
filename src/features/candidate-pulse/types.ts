export type PulseTemplate = {
  id: string
  tenant_id: string
  name: string
  question_1_text: string
  question_2_text: string
  question_3_text: string | null
  concerns_list: string[]
  created_at: string
}

export type CandidatePulse = {
  id: string
  tenant_id: string
  template_id?: string
  candidate_name: string
  selection_step: string | null
  sentiment_score: number | null
  concerns: string[]
  comment: string | null
  is_answered: boolean
  created_at: string
  pulse_templates?: PulseTemplate // joined relation
}
