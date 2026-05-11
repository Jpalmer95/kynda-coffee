import { supabase } from '@/lib/supabase/client'

export type UserCreditInfo = {
  free: number
  paid: number
  yearMonth: string
}

/**
 * Gets the current user's monthly credit state.
 * Creates a fresh 10-free-credits row if needed.
 */
export async function getUserCredits(): Promise<UserCreditInfo | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.rpc('get_or_create_monthly_credits', {
    p_user_id: user.id,
  })

  if (error || !data) {
    console.error('Failed to fetch credits', error)
    return { free: 0, paid: 0, yearMonth: '' }
  }

  return {
    free: data.free_credits_remaining,
    paid: data.paid_credits_remaining,
    yearMonth: data.year_month,
  }
}

/**
 * Deducts one design credit.
 * Preference order: free → paid.
 * Returns the number of credits remaining.
 */
export async function deductOneCredit(): Promise<{ success: boolean; remaining: number }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, remaining: 0 }

  const ym = new Date().toISOString().slice(0, 7)

  // Try free first
  const { data, error } = await supabase
    .from('user_monthly_credits')
    .update({ free_credits_remaining: supabase.rpc('decrement', { amount: 1 }) })
    .eq('user_id', user.id)
    .eq('year_month', ym)
    .gt('free_credits_remaining', 0)
    .select('free_credits_remaining')
    .single()

  if (!error && data) {
    return { success: true, remaining: data.free_credits_remaining }
  }

  // Fallback: paid credits
  const { data: paidData, error: paidError } = await supabase
    .from('user_monthly_credits')
    .update({ paid_credits_remaining: supabase.rpc('decrement', { amount: 1 }) })
    .eq('user_id', user.id)
    .eq('year_month', ym)
    .gt('paid_credits_remaining', 0)
    .select('paid_credits_remaining')
    .single()

  if (!paidError && paidData) {
    return { success: true, remaining: paidData.paid_credits_remaining }
  }

  return { success: false, remaining: 0 }
}
