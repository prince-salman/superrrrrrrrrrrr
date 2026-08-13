import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { validateProducts } from '../../../lib/validation';
import { isProductBlocked, isTextBlocked } from '../../../lib/blocked';

let serverDb: {
  users: any[];
  products: any[];
  messages: any[];
  reviews: any[];
} = {
  users: [],
  products: [],
  messages: [],
  reviews: [],
};

const OWNERSHIP_FIELDS = ['seller', 'sellerEmail', 'sellerMajor', 'sellerBatch'] as const;

function stripPasswords(users: any[]): any[] {
  return (users || []).map(({ password, ...rest }) => rest);
}

function mergeMessages(existingList: any[], incomingList: any[]) {
  const map = new Map();
  (existingList || []).forEach(m => map.set(m.id, { ...m }));

  (incomingList || []).forEach(incoming => {
    const existing = map.get(incoming.id);
    if (!existing) {
      map.set(incoming.id, { ...incoming });
    } else {
      const replyMap = new Map();
      (existing.replies || []).forEach((r: any) => replyMap.set(r.id, r));
      (incoming.replies || []).forEach((r: any) => replyMap.set(r.id, r));

      const mergedReplies = Array.from(replyMap.values()).sort((a: any, b: any) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        if (Math.abs(timeA - timeB) > 60000) {
          return timeA - timeB;
        }
        return 0;
      });
      const updatedStatus = incoming.status !== 'pending' ? incoming.status : existing.status;

      map.set(incoming.id, {
        ...existing,
        ...incoming,
        status: updatedStatus,
        deleted: incoming.deleted || existing.deleted,
        deletedByBuyer: incoming.deletedByBuyer || existing.deletedByBuyer,
        deletedBySeller: incoming.deletedBySeller || existing.deletedBySeller,
        reviewed: incoming.reviewed || existing.reviewed,
        replies: mergedReplies,
      });
    }
  });

  return Array.from(map.values()).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function mergeUsers(existingList: any[], incomingList: any[]) {
  const map = new Map();
  (existingList || []).forEach(u => map.set(u.email, u));
  (incomingList || []).forEach(u => map.set(u.email, u));
  return Array.from(map.values());
}

function mergeProductsWithOwnership(existingList: any[], incomingList: any[], senderEmail: string) {
  const map = new Map();
  (existingList || []).forEach(p => map.set(p.id, { ...p }));

  (incomingList || []).forEach(incoming => {
    const existing = map.get(incoming.id);

    if (!existing) {
      // New product: sellerEmail MUST match senderEmail (enforced by caller)
      if (senderEmail !== '__server__' && incoming.sellerEmail && incoming.sellerEmail !== senderEmail) {
        return;
      }
      map.set(incoming.id, { ...incoming });
    } else {
      // Existing product: only the original owner can update
      if (senderEmail !== '__server__' && existing.sellerEmail && existing.sellerEmail !== senderEmail) {
        return;
      }

      const preserved: Record<string, any> = {};
      for (const field of OWNERSHIP_FIELDS) {
        preserved[field] = existing[field];
      }

      const isSold = existing.status === 'sold' || incoming.status === 'sold' || existing.stock <= 0 || incoming.stock <= 0;
      const minStock = isSold ? 0 : Math.min(existing.stock ?? 1, incoming.stock ?? 1);

      map.set(incoming.id, {
        ...existing,
        ...incoming,
        ...preserved,
        stock: minStock,
        status: isSold ? 'sold' : (incoming.status || existing.status),
      });
    }
  });
  return Array.from(map.values());
}

function mergeReviews(existingList: any[], incomingList: any[]) {
  const map = new Map();
  (existingList || []).forEach(r => map.set(r.id, r));
  (incomingList || []).forEach(r => map.set(r.id, r));
  return Array.from(map.values()).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

const dbRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkDbRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = dbRateLimitMap.get(ip);
  if (!limit || now > limit.resetTime) {
    dbRateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (limit.count >= 30) {
    return false;
  }
  limit.count += 1;
  return true;
}

// ──── SERVER-SIDE USER LOOKUP ─────────────────────────────────
// Looks up a registered user by email from Supabase or in-memory DB.
// Returns the canonical user record or null if the user doesn't exist.
async function lookupAuthenticatedUser(email: string): Promise<{ name: string; email: string; major: string; batch: string } | null> {
  if (!email || !email.includes('@')) return null;

  // 1. Check Supabase users table
  if (supabase) {
    try {
      const { data: supaUsers } = await supabase
        .from('users')
        .select('name, email, major, batch')
        .eq('email', email)
        .limit(1);
      if (supaUsers && supaUsers.length > 0) {
        return supaUsers[0];
      }
    } catch (e) {
      // Fall through to in-memory check
    }
  }

  // 2. Check in-memory serverDb
  const found = serverDb.users.find(u => u.email === email);
  if (found) {
    return { name: found.name, email: found.email, major: found.major, batch: found.batch };
  }

  return null;
}

export async function GET(req: Request) {
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkDbRateLimit(clientIp)) {
    return NextResponse.json({ error: 'Too many GET requests' }, { status: 429 });
  }

  try {
    if (supabase) {
      const { data: supaUsers } = await supabase.from('users').select('*');
      const { data: supaProds } = await supabase.from('products').select('*');
      const { data: supaMsgs } = await supabase.from('messages').select('*');
      const { data: supaRevs } = await supabase.from('reviews').select('*');

      if (supaUsers && supaUsers.length > 0) {
        serverDb.users = mergeUsers(serverDb.users, supaUsers);
      }
      if (supaProds && supaProds.length > 0) {
        const cleanProds = supaProds.filter((p: any) => p && p.id && !p.id.startsWith('seed-') && !p.id.startsWith('prod-presu-'));
        serverDb.products = mergeProductsWithOwnership(serverDb.products, cleanProds, '__server__');
      }
      if (supaMsgs && supaMsgs.length > 0) {
        serverDb.messages = mergeMessages(serverDb.messages, supaMsgs);
      }
      if (supaRevs && supaRevs.length > 0) {
        serverDb.reviews = mergeReviews(serverDb.reviews, supaRevs);
      }
    }
  } catch (e) {
  }

  serverDb.products = (serverDb.products || []).filter((p: any) => p && p.id && !p.id.startsWith('seed-') && !p.id.startsWith('prod-presu-'));

  const { valid: validProducts } = validateProducts(serverDb.products);
  const invalidIds = serverDb.products
    .filter((p: any) => !validProducts.some((v: any) => v.id === p.id))
    .map((p: any) => p.id);

  serverDb.products = validProducts as any[];

  if (invalidIds.length > 0 && supabase) {
    try {
      await supabase.from('products').delete().in('id', invalidIds);
    } catch (e) {
    }
  }

  return NextResponse.json({
    ...serverDb,
    users: stripPasswords(serverDb.users),
  });
}

export async function POST(req: Request) {
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkDbRateLimit(clientIp)) {
    return NextResponse.json({ error: 'Too many POST requests. Rate limit exceeded.' }, { status: 429 });
  }

  try {
    const data = await req.json();

    // ──── STEP 1: Validate senderEmail ────────────────────────
    const senderEmail = typeof data.senderEmail === 'string' ? data.senderEmail.trim().toLowerCase() : '';
    if (!senderEmail || !senderEmail.includes('@')) {
      return NextResponse.json({ error: 'Missing or invalid senderEmail.' }, { status: 403 });
    }

    // ──── STEP 2: Server-side user lookup (SECURITY FIX) ──────
    // Look up the authenticated user from the server-side DB so that
    // seller identity fields are derived from the canonical user record,
    // NOT from the client-controlled JSON payload.
    const authenticatedUser = await lookupAuthenticatedUser(senderEmail);
    if (!authenticatedUser) {
      console.warn(`[SECURITY] Rejected POST from unregistered senderEmail: ${senderEmail} (IP: ${clientIp})`);
      return NextResponse.json({ error: 'User not found. Please register first.' }, { status: 403 });
    }

    if (data.products && data.products.length > 100) {
      return NextResponse.json({ error: 'Payload too large: maximum 100 products per request' }, { status: 413 });
    }

    if (data.messages && data.messages.length > 200) {
      return NextResponse.json({ error: 'Payload too large: maximum 200 messages per request' }, { status: 413 });
    }

    let validatedProducts: any[] = [];
    let rejectedCount = 0;
    if (data.products && Array.isArray(data.products)) {
      // ──── STEP 3: Force-override seller fields from server-side user record ────
      // This prevents impersonation: even if the client sends fake seller/sellerEmail/
      // sellerMajor/sellerBatch, they are overwritten with the canonical values.
      const serverEnforcedProducts = data.products.map((p: any) => ({
        ...p,
        seller: authenticatedUser.name,
        sellerEmail: authenticatedUser.email,
        sellerMajor: authenticatedUser.major || 'Informatics',
        sellerBatch: authenticatedUser.batch || '2024',
      }));

      const ownProducts = serverEnforcedProducts.filter((p: any) => {
        if (!p.sellerEmail || p.sellerEmail !== senderEmail) {
          rejectedCount++;
          return false;
        }
        return true;
      });

      const { valid, rejected } = validateProducts(ownProducts);
      rejectedCount += rejected.length;

      validatedProducts = valid.filter((p: any) => {
        if (isProductBlocked(p.name || '', p.description || '', p.seller || '')) {
          rejectedCount++;
          return false;
        }
        if (isTextBlocked(p.seller || '')) {
          rejectedCount++;
          return false;
        }
        return true;
      });

      if (rejected.length > 0) {
        console.warn(`[SECURITY] Rejected ${rejected.length} invalid products from ${senderEmail} (IP: ${clientIp})`,
          rejected.map(r => r.errors));
      }
    }

    // ──── STEP 4: Sanitize messages — enforce senderEmail on replies ────
    let sanitizedMessages: any[] = [];
    if (data.messages && Array.isArray(data.messages)) {
      sanitizedMessages = data.messages.map((msg: any) => {
        // For messages, ensure any replies from this sender use the canonical identity
        if (msg.replies && Array.isArray(msg.replies)) {
          msg.replies = msg.replies.map((r: any) => {
            if (r.senderEmail === senderEmail) {
              return {
                ...r,
                senderEmail: authenticatedUser.email,
                senderName: authenticatedUser.name,
              };
            }
            return r;
          });
        }
        return msg;
      });
    }

    if (validatedProducts.length > 0) {
      serverDb.products = mergeProductsWithOwnership(serverDb.products, validatedProducts, senderEmail);
    }
    if (sanitizedMessages.length > 0) serverDb.messages = mergeMessages(serverDb.messages, sanitizedMessages);
    if (data.reviews) serverDb.reviews = mergeReviews(serverDb.reviews, data.reviews);

    try {
      if (supabase) {
        if (validatedProducts.length > 0) await supabase.from('products').upsert(validatedProducts, { onConflict: 'id' });
        if (sanitizedMessages.length > 0) await supabase.from('messages').upsert(sanitizedMessages, { onConflict: 'id' });
        if (data.reviews?.length) await supabase.from('reviews').upsert(data.reviews, { onConflict: 'id' });
      }
    } catch (e) {
    }

    return NextResponse.json({
      ok: true,
      accepted: validatedProducts.length,
      rejected: rejectedCount,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update server DB' }, { status: 400 });
  }
}

// ──── DELETE: Require senderEmail authentication ─────────────
// Previously this endpoint had NO authentication and could wipe all products.
export async function DELETE(req: Request) {
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkDbRateLimit(clientIp)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  try {
    const data = await req.json();
    const senderEmail = typeof data.senderEmail === 'string' ? data.senderEmail.trim().toLowerCase() : '';

    if (!senderEmail || !senderEmail.includes('@')) {
      return NextResponse.json({ error: 'Missing or invalid senderEmail. Authentication required.' }, { status: 403 });
    }

    // Verify user exists
    const authenticatedUser = await lookupAuthenticatedUser(senderEmail);
    if (!authenticatedUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 403 });
    }

    // Only delete the authenticated user's own products, not ALL products
    const productIdsToDelete = serverDb.products
      .filter((p: any) => p.sellerEmail === senderEmail)
      .map((p: any) => p.id);

    serverDb.products = serverDb.products.filter((p: any) => p.sellerEmail !== senderEmail);

    if (productIdsToDelete.length > 0 && supabase) {
      try {
        await supabase.from('products').delete().in('id', productIdsToDelete);
      } catch (e) {}
    }

    return NextResponse.json({
      ok: true,
      message: `Deleted ${productIdsToDelete.length} products owned by ${senderEmail}.`,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}
