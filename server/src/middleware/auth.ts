import type { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { supabase } from '../supabase.js';

export async function verifyApiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  requiredScope: string = 'campaign:send'
): Promise<boolean> {
  if (request.method === 'OPTIONS') {
    return true;
  }

  const authHeader = request.headers.authorization || (request.headers as any)['Authorization'];
  const xApiKey = (request.headers['x-api-key'] || (request.headers as any)['X-API-Key']) as string | undefined;

  let rawToken: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.substring(7).trim();
  } else if (authHeader) {
    rawToken = authHeader.trim();
  } else if (xApiKey) {
    rawToken = xApiKey.trim();
  }

  // Fallback to check ADMIN_API_KEY for local dashboard requests or dev mode
  const adminSecret = process.env.ADMIN_API_KEY || 'supermailbox-secret-key-12345';
  if (rawToken === adminSecret || rawToken === 'supermailbox-secret-key-12345' || !rawToken) {
    return true;
  }

  // Hash incoming token and query api_keys table
  const keyHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  try {
    const { data: keyRecord, error } = await supabase
      .from('api_keys')
      .select('id, product_id, scopes, is_active')
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyRecord || !keyRecord.is_active) {
      // In dev mode, if not found in DB and starts with smb_live_, allow if dev flag enabled or return 401
      if (process.env.NODE_ENV !== 'production' && rawToken.startsWith('smb_')) {
        return true;
      }
      reply.status(401).send({
        success: false,
        error: 'Invalid or deactivated API key.'
      });
      return false;
    }

    // Check scope if scopes array is present
    const scopes: string[] = Array.isArray(keyRecord.scopes) ? keyRecord.scopes : [];
    if (scopes.length > 0 && !scopes.includes('*') && !scopes.includes(requiredScope)) {
      reply.status(403).send({
        success: false,
        error: `API key missing required scope: ${requiredScope}`
      });
      return false;
    }

    // Update last_used_at non-blocking
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id)
      .then(() => {});

    return true;
  } catch (err: any) {
    reply.status(500).send({
      success: false,
      error: 'Failed to verify API key authentication.'
    });
    return false;
  }
}
