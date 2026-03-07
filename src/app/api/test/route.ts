import { NextResponse } from 'next/server';
import { getSaasActivity, getAccessCountByTenant } from '@/features/saas-dashboard/queries';

export async function GET() {
  const activity = await getSaasActivity();
  const counts = await getAccessCountByTenant();
  return NextResponse.json({ activity, counts: Array.from(counts.entries()) });
}
