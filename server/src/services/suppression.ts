import { supabase } from '../supabase.js';

export async function checkSuppression(
  email: string,
  productId?: string
): Promise<{ suppressed: boolean; reason?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    let query = supabase
      .from('suppression_list')
      .select('id, reason')
      .eq('email', normalizedEmail);

    if (productId) {
      query = query.or(`product_id.eq.${productId},product_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Suppression Service] Query error:', error.message);
      return { suppressed: false };
    }

    if (data && data.length > 0) {
      return {
        suppressed: true,
        reason: data[0].reason || 'suppressed'
      };
    }

    return { suppressed: false };
  } catch (err: any) {
    console.error('[Suppression Service] Unexpected error:', err.message);
    return { suppressed: false };
  }
}

export async function addSuppression(
  email: string,
  reason: 'bounce' | 'complaint' | 'manual' | 'unsubscribe',
  productId?: string
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    await supabase.from('suppression_list').upsert({
      email: normalizedEmail,
      product_id: productId || null,
      reason
    }, { onConflict: 'email,product_id' });
  } catch (err: any) {
    console.error('[Suppression Service] Failed to insert suppression entry:', err.message);
  }
}
