'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const MNT_SETS_PATH = '/adm/stress-check/mnt_sets';

export async function createStressCheckPeriod(data: {
  tenant_id: string;
  title: string;
  questionnaire_type: '57' | '23';
  status: 'draft' | 'active' | 'closed';
  start_date: string;
  end_date: string;
  fiscal_year: number;
}) {
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('stress_check_periods')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('createStressCheckPeriod error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath(MNT_SETS_PATH);
  return { success: true, data: result };
}

export async function updateStressCheckPeriod(id: string, updates: {
  title?: string;
  questionnaire_type?: '57' | '23';
  status?: 'draft' | 'active' | 'closed';
  start_date?: string;
  end_date?: string;
  fiscal_year?: number;
}) {
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from('stress_check_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateStressCheckPeriod error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath(MNT_SETS_PATH);
  return { success: true, data: result };
}

export async function deleteStressCheckPeriod(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('stress_check_periods')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteStressCheckPeriod error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath(MNT_SETS_PATH);
  return { success: true };
}
