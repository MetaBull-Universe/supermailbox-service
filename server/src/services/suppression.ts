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
): Promise<any | null> {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const existingQuery = supabase
      .from('suppression_list')
      .select('id, email, reason, created_at')
      .eq('email', normalizedEmail);

    const { data: existingRows, error: existingError } = productId
      ? await existingQuery.eq('product_id', productId)
      : await existingQuery.is('product_id', null);

    if (existingError) throw existingError;

    if (existingRows?.[0]?.id) {
      const { data, error } = await supabase
        .from('suppression_list')
        .update({ reason })
        .eq('id', existingRows[0].id)
        .select('id, email, reason, created_at')
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('suppression_list')
      .insert({
        email: normalizedEmail,
        product_id: productId || null,
        reason
      })
      .select('id, email, reason, created_at')
      .single();

    if (error) throw error;
    return data;
  } catch (err: any) {
    console.error('[Suppression Service] Failed to insert suppression entry:', err.message);
    return null;
  }
}

export async function removeSuppression(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('suppression_list')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: any) {
    console.error('[Suppression Service] Failed to delete suppression entry:', err.message);
    return false;
  }
}
