// ============================================================
// U-NiceNutraCare — Complete Backend Worker
// D1 Database · Auth · Products · Orders · Paystack · Analytics
// ============================================================

const PAYSTACK_API = 'https://api.paystack.co';

// ===== CORS (Locked to your domain) =====
const ALLOWED_ORIGINS = [
  'https://unicenutracare.pages.dev',
  'https://unicenutra-care.pages.dev',
  'https://unicenutracare.com',
  'http://localhost:5173',
  'http://localhost:8787',
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }
  if (origin && /https:\/\/.*\.pages\.dev$/.test(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }
  return {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function errorResponse(msg, status = 400, corsHeaders = {}) {
  return jsonResponse({ error: msg }, status, corsHeaders);
}

function withCors(response, corsHeaders) {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// ===== AUTH HELPERS (Web Crypto API) =====
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.randomUUID();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === hash;
}

// Simple JWT (HS256)
async function createJWT(payload, secret, expiresInSec = 86400 * 7) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: now, exp: now + expiresInSec };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(tokenPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${signingInput}.${sigB64}`;
}

async function verifyJWT(token, secret) {
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    const signingInput = `${headerB64}.${payloadB64}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);

    const sigStr = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigPadded = sigStr + '='.repeat((4 - sigStr.length % 4) % 4);
    const sigBytes = Uint8Array.from(atob(sigPadded), c => c.charCodeAt(0));

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(signingInput));
    if (!valid) return null;

    const payloadStr = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadPadded = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
    const payload = JSON.parse(atob(payloadPadded));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function getUserFromRequest(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyJWT(auth.slice(7), env.JWT_SECRET);
}

// ===== PAYSTACK HELPERS =====

async function paystackInit(email, amount, reference, metadata, secretKey) {
  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100),
      currency: 'KES',
      reference,
      metadata,
      callback_url: undefined,
    }),
  });
  return await res.json();
}

async function paystackVerify(reference, secretKey) {
  const res = await fetch(`${PAYSTACK_API}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  return await res.json();
}

// Find or create M-Pesa transfer recipient
async function getOrCreateRecipient(env) {
  // Check if we already created one
  const cached = await env.DB.prepare("SELECT value FROM analytics_events WHERE event_type = 'mpesa_recipient' LIMIT 1").first();
  if (cached) {
    try { return JSON.parse(cached.event_data).recipient_code; } catch {}
  }

  const res = await fetch(`${PAYSTACK_API}/transferrecipient`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'mobile_money',
      name: 'U-NiceNutraCare M-Pesa',
      account_number: '254740041683',
      bank_code: 'MPESA',
      currency: 'KES',
    }),
  });
  const data = await res.json();

  if (data.status && data.data?.recipient_code) {
    // Cache it
    await env.DB.prepare(
      "INSERT INTO analytics_events (event_type, event_data) VALUES ('mpesa_recipient', ?)"
    ).bind(JSON.stringify({ recipient_code: data.data.recipient_code })).run();
    return data.data.recipient_code;
  }
  return null;
}

// Transfer money to M-Pesa number
async function transferToMpesa(env, amountKes) {
  const recipientCode = await getOrCreateRecipient(env);
  if (!recipientCode) return { success: false, error: 'Could not create M-Pesa recipient' };

  const amountKobo = Math.round(amountKes * 100);
  const res = await fetch(`${PAYSTACK_API}/transfer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'balance',
      amount: amountKobo,
      recipient: recipientCode,
      reason: 'U-NiceNutraCare order payout',
      currency: 'KES',
    }),
  });
  return await res.json();
}

function generateRef() {
  return 'UNC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ===== ROUTE HANDLERS =====

// --- Products ---
async function handleGetProducts(request, env) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('q');
  const sort = url.searchParams.get('sort') || 'popular';
  const priceRange = url.searchParams.get('price');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = 'SELECT * FROM products WHERE is_active = 1';
  const params = [];

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (name_en LIKE ? OR name_sw LIKE ? OR desc_en LIKE ? OR category LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }
  if (priceRange) {
    if (priceRange === 'under200') { query += ' AND price < 200'; }
    else if (priceRange === '200_400') { query += ' AND price >= 200 AND price <= 400'; }
    else if (priceRange === 'over400') { query += ' AND price > 400'; }
  }

  switch (sort) {
    case 'price_low': query += ' ORDER BY price ASC'; break;
    case 'price_high': query += ' ORDER BY price DESC'; break;
    case 'rating': query += ' ORDER BY rating DESC, review_count DESC'; break;
    case 'newest': query += ' ORDER BY created_at DESC'; break;
    default: query += ' ORDER BY sort_order ASC, review_count DESC';
  }

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countResult = await env.DB.prepare(countQuery).bind(...params).first();
  const total = countResult?.total || 0;

  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();

  const products = results.map(p => ({
    ...p,
    badges: JSON.parse(p.badges || '[]'),
    benefits_en: JSON.parse(p.benefits_en || '[]'),
    benefits_sw: JSON.parse(p.benefits_sw || '[]'),
    benefits_fr: JSON.parse(p.benefits_fr || '[]'),
  }));

  return jsonResponse({ products, total, limit, offset });
}

async function handleGetProduct(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').bind(id).first();
  if (!product) return errorResponse('Product not found', 404);

  const { results: reviews } = await env.DB.prepare(
    'SELECT * FROM reviews WHERE product_id = ? AND is_approved = 1 ORDER BY created_at DESC LIMIT 20'
  ).bind(id).all();

  return jsonResponse({
    ...product,
    badges: JSON.parse(product.badges || '[]'),
    benefits_en: JSON.parse(product.benefits_en || '[]'),
    benefits_sw: JSON.parse(product.benefits_sw || '[]'),
    benefits_fr: JSON.parse(product.benefits_fr || '[]'),
    reviews,
  });
}

// --- Image Upload ---
async function handleUploadImage(request, env) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return errorResponse('Expected multipart/form-data');
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) return errorResponse('No file provided');

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return errorResponse('Only JPEG, PNG, WebP, and GIF images are allowed');
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return errorResponse('Image must be under 5 MB');
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const id = crypto.randomUUID();
  const filename = file.name || 'upload.jpg';

  await env.DB.prepare(
    'INSERT INTO product_images (id, image_data, content_type, filename) VALUES (?, ?, ?, ?)'
  ).bind(id, base64, file.type, filename).run();

  const url = `${new URL(request.url).origin}/api/images/${id}`;
  return jsonResponse({ success: true, url, id });
}

async function handleServeImage(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  const row = await env.DB.prepare(
    'SELECT image_data, content_type FROM product_images WHERE id = ?'
  ).bind(id).first();

  if (!row) return errorResponse('Image not found', 404);

  const binaryStr = atob(row.image_data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return new Response(bytes, {
    headers: {
      'Content-Type': row.content_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

// --- Admin ---
async function handleAdminLogin(request, env) {
  const body = await request.json();
  if (!body.password || body.password !== env.ADMIN_PASSWORD) {
    return errorResponse('Invalid admin password', 401);
  }
  const token = await createJWT({ role: 'admin' }, env.JWT_SECRET, 86400 * 30);
  return jsonResponse({ success: true, token });
}

async function requireAdmin(request, env) {
  const payload = await getUserFromRequest(request, env);
  return payload && payload.role === 'admin' ? payload : null;
}

const ADMIN_PRODUCT_FIELDS = [
  'name_en', 'name_sw', 'name_fr',
  'category', 'price', 'original_price',
  'unit_en', 'unit_sw', 'unit_fr',
  'image_url', 'stock', 'badges',
  'desc_en', 'desc_sw', 'desc_fr',
  'benefits_en', 'benefits_sw', 'benefits_fr',
  'sort_order', 'is_active',
];

async function handleAdminGetProducts(request, env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM products ORDER BY sort_order ASC, id ASC'
  ).all();
  return jsonResponse({
    products: results.map(p => ({
      ...p,
      badges: JSON.parse(p.badges || '[]'),
      benefits_en: JSON.parse(p.benefits_en || '[]'),
      benefits_sw: JSON.parse(p.benefits_sw || '[]'),
      benefits_fr: JSON.parse(p.benefits_fr || '[]'),
    })),
  });
}

async function handleAdminCreateProduct(request, env) {
  const body = await request.json();
  if (!body.name_en || !body.category) return errorResponse('Name and category are required');

  const maxRow = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM products').first();
  const product = {
    name_en: String(body.name_en).slice(0, 200),
    name_sw: String(body.name_sw || '').slice(0, 200),
    name_fr: String(body.name_fr || '').slice(0, 200),
    category: String(body.category || 'supplements'),
    price: Math.max(0, parseInt(body.price) || 0),
    original_price: body.original_price ? parseInt(body.original_price) : null,
    unit_en: String(body.unit_en || ''),
    unit_sw: String(body.unit_sw || ''),
    unit_fr: String(body.unit_fr || ''),
    image_url: String(body.image_url || ''),
    stock: Math.max(0, parseInt(body.stock) || 0),
    badges: JSON.stringify(Array.isArray(body.badges) ? body.badges : []),
    desc_en: String(body.desc_en || ''),
    desc_sw: String(body.desc_sw || ''),
    desc_fr: String(body.desc_fr || ''),
    benefits_en: JSON.stringify(Array.isArray(body.benefits_en) ? body.benefits_en : []),
    benefits_sw: JSON.stringify(Array.isArray(body.benefits_sw) ? body.benefits_sw : []),
    benefits_fr: JSON.stringify(Array.isArray(body.benefits_fr) ? body.benefits_fr : []),
    sort_order: parseInt(body.sort_order) || (maxRow?.m || 0) + 1,
    is_active: body.is_active === 0 || body.is_active === false ? 0 : 1,
  };

  const result = await env.DB.prepare(
    `INSERT INTO products (name_en, name_sw, name_fr, category, price, original_price,
      unit_en, unit_sw, unit_fr, image_url, stock, badges,
      desc_en, desc_sw, desc_fr, benefits_en, benefits_sw, benefits_fr, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    product.name_en, product.name_sw, product.name_fr, product.category,
    product.price, product.original_price, product.unit_en, product.unit_sw, product.unit_fr,
    product.image_url, product.stock, product.badges,
    product.desc_en, product.desc_sw, product.desc_fr,
    product.benefits_en, product.benefits_sw, product.benefits_fr,
    product.sort_order, product.is_active
  ).run();

  return jsonResponse({ success: true, id: result.meta.last_row_id }, 201);
}

async function handleAdminUpdateProduct(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  const body = await request.json();

  const updates = [];
  const params = [];
  for (const field of ADMIN_PRODUCT_FIELDS) {
    if (!(field in body)) continue;
    let value = body[field];
    if (field === 'badges' || field.startsWith('benefits_')) {
      value = JSON.stringify(Array.isArray(value) ? value : []);
    } else if (field === 'original_price') {
      value = value ? parseInt(value) : null;
    } else if (['price', 'stock', 'sort_order'].includes(field)) {
      value = Math.max(0, parseInt(value) || 0);
    } else if (field === 'is_active') {
      value = value === 0 || value === false ? 0 : 1;
    }
    updates.push(`${field} = ?`);
    params.push(value);
  }

  if (updates.length === 0) return errorResponse('No valid fields to update');

  params.push(id);
  await env.DB.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

  return jsonResponse({ success: true });
}

async function handleAdminDeleteProduct(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  await env.DB.prepare('DELETE FROM reviews WHERE product_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM flash_sales WHERE product_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true });
}

// --- Auth ---
async function handleRegister(request, env) {
  const body = await request.json();
  const { name, email, password, phone } = body;

  if (!email || !password) return errorResponse('Email and password are required');
  if (password.length < 6) return errorResponse('Password must be at least 6 characters');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse('Invalid email format');

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return errorResponse('Email already registered');

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, phone) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, email, passwordHash, name || '', phone || '').run();

  const token = await createJWT({ sub: id, email }, env.JWT_SECRET);

  return jsonResponse({
    success: true,
    user: { id, email, name: name || '', phone: phone || '' },
    token,
  }, 201);
}

async function handleLogin(request, env) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) return errorResponse('Email and password are required');

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user) return errorResponse('Invalid email or password', 401);

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return errorResponse('Invalid email or password', 401);

  const token = await createJWT({ sub: user.id, email: user.email }, env.JWT_SECRET);

  return jsonResponse({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address },
    token,
  });
}

async function handleGetProfile(request, env) {
  const authPayload = await getUserFromRequest(request, env);
  if (!authPayload) return errorResponse('Unauthorized', 401);

  const user = await env.DB.prepare('SELECT id, email, name, phone, address, created_at FROM users WHERE id = ?').bind(authPayload.sub).first();
  if (!user) return errorResponse('User not found', 404);

  return jsonResponse({ user });
}

async function handleUpdateProfile(request, env) {
  const authPayload = await getUserFromRequest(request, env);
  if (!authPayload) return errorResponse('Unauthorized', 401);

  const body = await request.json();
  const { name, phone, address } = body;

  await env.DB.prepare(
    'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?'
  ).bind(name || '', phone || '', address || '', authPayload.sub).run();

  return jsonResponse({ success: true, message: 'Profile updated' });
}

// --- Orders ---
async function handleCreateOrder(request, env) {
  const authPayload = await getUserFromRequest(request, env);
  const body = await request.json();
  const { phone, items, subtotal, deliveryFee, discount, total, deliveryLocation, promoCode, notes, email } = body;

  if (!items || !total) return errorResponse('Missing required fields');
  if (!Array.isArray(items) || items.length === 0) return errorResponse('Cart is empty');

  const orderId = generateRef();

  await env.DB.prepare(
    `INSERT INTO orders (id, user_id, phone, subtotal, delivery_fee, discount, total, delivery_location, promo_code, items, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    orderId,
    authPayload?.sub || null,
    phone || '',
    subtotal || 0,
    deliveryFee || 0,
    discount || 0,
    total,
    deliveryLocation || 'nairobi',
    promoCode || null,
    JSON.stringify(items),
    notes || ''
  ).run();

  for (const item of items) {
    if (item.productId) {
      await env.DB.prepare(
        'UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ? AND stock >= ?'
      ).bind(item.qty || 1, item.productId, item.qty || 1).run();
    }
  }

  return jsonResponse({ success: true, orderId, total }, 201);
}

async function handleGetOrder(request, env) {
  const url = new URL(request.url);
  const orderId = url.pathname.split('/').pop();

  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return errorResponse('Order not found', 404);

  return jsonResponse({
    ...order,
    items: JSON.parse(order.items || '[]'),
  });
}

async function handleGetMyOrders(request, env) {
  const authPayload = await getUserFromRequest(request, env);
  if (!authPayload) return errorResponse('Unauthorized', 401);

  const { results } = await env.DB.prepare(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).bind(authPayload.sub).all();

  return jsonResponse({
    orders: results.map(o => ({ ...o, items: JSON.parse(o.items || '[]') })),
  });
}

// --- Reviews ---
async function handleCreateReview(request, env) {
  const body = await request.json();
  const { productId, userName, rating, comment } = body;

  if (!productId || !userName || !rating) return errorResponse('Missing required fields');
  if (rating < 1 || rating > 5) return errorResponse('Rating must be 1-5');

  const authPayload = await getUserFromRequest(request, env);

  await env.DB.prepare(
    'INSERT INTO reviews (product_id, user_id, user_name, rating, comment, is_verified) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(productId, authPayload?.sub || null, userName, rating, comment || '', authPayload ? 1 : 0).run();

  const stats = await env.DB.prepare(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ? AND is_approved = 1'
  ).bind(productId).first();

  if (stats) {
    await env.DB.prepare(
      'UPDATE products SET rating = ?, review_count = ? WHERE id = ?'
    ).bind(Math.round((stats.avg_rating || rating) * 10) / 10, stats.count, productId).run();
  }

  return jsonResponse({ success: true, message: 'Review submitted' }, 201);
}

// --- Newsletter ---
async function handleSubscribe(request, env) {
  const body = await request.json();
  const { email } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse('Valid email required');

  const existing = await env.DB.prepare('SELECT id FROM subscribers WHERE email = ?').bind(email).first();
  if (existing) return jsonResponse({ success: true, message: 'Already subscribed' });

  await env.DB.prepare('INSERT INTO subscribers (email) VALUES (?)').bind(email).run();
  return jsonResponse({ success: true, message: 'Subscribed successfully' }, 201);
}

// --- Flash Sales ---
async function handleGetFlashSales(request, env) {
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare(
    `SELECT fs.*, p.name_en, p.name_sw, p.name_fr, p.category, p.image_url, p.original_price
     FROM flash_sales fs
     JOIN products p ON fs.product_id = p.id
     WHERE fs.is_active = 1 AND fs.start_at <= ? AND fs.end_at >= ?`
  ).bind(now, now).all();

  return jsonResponse({ flashSales: results });
}

// --- Paystack ---
async function handlePaystackInit(request, env) {
  const body = await request.json();
  const { email, amount, orderId, items } = body;

  if (!email || !amount || !orderId) return errorResponse('Missing email, amount, or orderId');

  const ref = `UNC-${orderId}-${Date.now()}`;

  const result = await paystackInit(email, amount, ref, {
    orderId,
    custom_fields: [
      { display_name: 'Order ID', variable_name: 'order_id', value: orderId },
    ],
  }, env.PAYSTACK_SECRET_KEY);

  if (result.status) {
    await env.DB.prepare(
      "UPDATE orders SET paystack_ref = ?, status = 'pending_payment' WHERE id = ?"
    ).bind(ref, orderId).run();

    return jsonResponse({
      success: true,
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
      access_code: result.data.access_code,
      orderId,
    });
  }

  return errorResponse(result.message || 'Failed to initialize payment', 400);
}

async function handlePaystackVerify(request, env) {
  const url = new URL(request.url);
  const reference = url.pathname.split('/').pop();

  if (!reference) return errorResponse('Missing reference');

  const result = await paystackVerify(reference, env.PAYSTACK_SECRET_KEY);

  if (result.status && result.data?.status === 'success') {
    const amountPaid = result.data.amount / 100;

    await env.DB.prepare(
      `UPDATE orders SET status = 'paid', paystack_ref = ?, paid_at = datetime('now') WHERE paystack_ref = ?`
    ).bind(reference, reference).run();

    // Paystack fees are already deducted. Net amount in balance = amountPaid - fees.
    // We don't know exact fees, so transfer 99% of the NET amount Paystack reports.
    // Paystack sets data.amount to the original gross. fees_breakdown gives us the net.
    const fees = result.data.fees || 0;
    const netAmount = amountPaid - (fees / 100);
    const payoutAmount = Math.round(netAmount * 0.99);

    let transferResult = null;
    if (payoutAmount > 0) {
      try {
        transferResult = await transferToMpesa(env, payoutAmount);
      } catch (err) {
        console.error('Transfer failed:', err);
      }
    }

    return jsonResponse({
      success: true,
      status: 'paid',
      reference,
      amount: amountPaid,
      net: Math.round(netAmount),
      payout: payoutAmount,
      transferStatus: transferResult?.status ? 'sent' : 'pending',
      gateway_response: result.data.gateway_response,
    });
  }

  return jsonResponse({
    success: false,
    status: result.data?.status || 'failed',
    reference,
    message: result.data?.gateway_response || 'Payment not successful',
  });
}

async function handlePaystackWebhook(request, env) {
  const body = await request.json();
  const { event, data } = body;

  if (event === 'charge.success' && data?.status === 'success') {
    const reference = data.reference;
    const amountPaid = data.amount / 100;
    const fees = data.fees || 0;
    const netAmount = amountPaid - (fees / 100);
    const payoutAmount = Math.round(netAmount * 0.99);

    await env.DB.prepare(
      `UPDATE orders SET status = 'paid', paystack_ref = ?, paid_at = datetime('now') WHERE paystack_ref = ?`
    ).bind(reference, reference).run();

    // Transfer 99% of net to M-Pesa
    if (payoutAmount > 0) {
      try { await transferToMpesa(env, payoutAmount); } catch (err) {
        console.error('Webhook transfer failed:', err);
      }
    }
  }

  return jsonResponse({ received: true });
}

async function handlePaymentStatus(request, env) {
  const url = new URL(request.url);
  const orderId = url.pathname.split('/').pop();

  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return errorResponse('Order not found', 404);

  return jsonResponse({
    orderId: order.id,
    status: order.status,
    paystackRef: order.paystack_ref,
    total: order.total,
    phone: order.phone,
    items: JSON.parse(order.items || '[]'),
    createdAt: order.created_at,
    paidAt: order.paid_at,
  });
}

// --- Analytics ---
async function handleTrackEvent(request, env) {
  const body = await request.json();
  const { eventType, eventData, userId, sessionId } = body;

  if (!eventType) return errorResponse('eventType required');

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const encoder = new TextEncoder();
  const ipHashData = await crypto.subtle.digest('SHA-256', encoder.encode(ip + env.JWT_SECRET));
  const ipHash = Array.from(new Uint8Array(ipHashData)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

  await env.DB.prepare(
    'INSERT INTO analytics_events (event_type, event_data, user_id, session_id, ip_hash) VALUES (?, ?, ?, ?, ?)'
  ).bind(eventType, JSON.stringify(eventData || {}), userId || null, sessionId || null, ipHash).run();

  return jsonResponse({ success: true });
}

// ===== BOOKS =====
async function handleGetBooks(request, env) {
  const { results } = await env.DB.prepare(
    'SELECT id, title, author, description, price, cover_url, sort_order, is_active, created_at FROM books WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
  ).all();
  return jsonResponse({ books: results });
}

async function handleAdminGetBooks(request, env) {
  const { results } = await env.DB.prepare(
    'SELECT id, title, author, description, price, cover_url, file_name, file_size, sort_order, is_active, created_at FROM books ORDER BY sort_order ASC, id ASC'
  ).all();
  return jsonResponse({ books: results });
}

async function handleAdminCreateBook(request, env) {
  const contentType = request.headers.get('Content-Type') || '';
  let title, author, description, price, cover_url, sort_order, is_active;
  let fileData = '', fileName = '', fileSize = 0;

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    title = form.get('title') || '';
    author = form.get('author') || 'U-NiceNutraCare';
    description = form.get('description') || '';
    price = parseInt(form.get('price')) || 0;
    cover_url = form.get('cover_url') || '';
    sort_order = parseInt(form.get('sort_order')) || 0;
    is_active = form.get('is_active') === '0' ? 0 : 1;
    const file = form.get('file');
    if (file && file.size > 0) {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      fileData = btoa(bin);
      fileName = file.name;
      fileSize = file.size;
    }
  } else {
    const body = await request.json();
    title = body.title || '';
    author = body.author || 'U-NiceNutraCare';
    description = body.description || '';
    price = parseInt(body.price) || 0;
    cover_url = body.cover_url || '';
    fileData = body.file_data || '';
    fileName = body.file_name || '';
    fileSize = body.file_size || 0;
    sort_order = body.sort_order || 0;
    is_active = body.is_active === 0 ? 0 : 1;
  }

  if (!title) return errorResponse('Title is required');

  const result = await env.DB.prepare(
    'INSERT INTO books (title, author, description, price, cover_url, file_data, file_name, file_size, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(title, author, description, price, cover_url, fileData, fileName, fileSize, sort_order, is_active).run();

  return jsonResponse({ success: true, id: result.meta.last_row_id }, 201);
}

async function handleAdminUpdateBook(request, env) {
  const id = new URL(request.url).pathname.split('/').pop();
  const contentType = request.headers.get('Content-Type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const fields = {};
    for (const [key, val] of form.entries()) {
      if (key === 'file') continue;
      fields[key] = val;
    }
    const updates = []; const params = [];
    for (const [key, val] of Object.entries(fields)) {
      updates.push(`${key} = ?`);
      params.push(key === 'price' || key === 'sort_order' || key === 'is_active' ? parseInt(val) || 0 : val);
    }
    const file = form.get('file');
    if (file && file.size > 0) {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      updates.push('file_data = ?', 'file_name = ?', 'file_size = ?');
      params.push(btoa(bin), file.name, file.size);
    }
    if (updates.length === 0) return errorResponse('No fields to update');
    params.push(id);
    await env.DB.prepare(`UPDATE books SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  } else {
    const body = await request.json();
    const updates = []; const params = [];
    const fields = ['title', 'author', 'description', 'price', 'cover_url', 'sort_order', 'is_active', 'file_data', 'file_name', 'file_size'];
    for (const f of fields) {
      if (f in body) {
        updates.push(`${f} = ?`);
        params.push(f === 'price' || f === 'sort_order' || f === 'is_active' ? parseInt(body[f]) || 0 : body[f]);
      }
    }
    if (updates.length === 0) return errorResponse('No fields to update');
    params.push(id);
    await env.DB.prepare(`UPDATE books SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
  }
  return jsonResponse({ success: true });
}

async function handleAdminDeleteBook(request, env) {
  const id = new URL(request.url).pathname.split('/').pop();
  await env.DB.prepare('DELETE FROM digital_purchases WHERE book_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM books WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true });
}

async function handleGetBookDownload(request, env) {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 2];
  const book = await env.DB.prepare('SELECT id, file_data, file_name, title FROM books WHERE id = ?').bind(id).first();
  if (!book || !book.file_data) return errorResponse('Book not found', 404);

  const userPayload = await getUserFromRequest(request, env);
  const email = userPayload?.email;
  const url = new URL(request.url);
  const ref = url.searchParams.get('ref');

  let hasAccess = false;
  if (email) {
    const purchase = await env.DB.prepare(
      "SELECT id FROM digital_purchases WHERE book_id = ? AND email = ? AND status = 'paid' LIMIT 1"
    ).bind(id, email).first();
    if (purchase) hasAccess = true;
  }
  if (!hasAccess && ref) {
    const purchase = await env.DB.prepare(
      "SELECT id FROM digital_purchases WHERE book_id = ? AND payment_ref = ? AND status = 'paid' LIMIT 1"
    ).bind(id, ref).first();
    if (purchase) hasAccess = true;
  }
  if (!hasAccess && book.file_data) {
    const freeBook = await env.DB.prepare('SELECT id FROM books WHERE id = ? AND price = 0').bind(id).first();
    if (freeBook) hasAccess = true;
  }

  if (!hasAccess) return errorResponse('Purchase required to download this book', 403);

  const binStr = atob(book.file_data);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${book.file_name || book.title + '.docx'}"`,
    },
  });
}

async function handleBookPurchaseInit(request, env) {
  const body = await request.json();
  const { book_id, email } = body;
  if (!book_id || !email) return errorResponse('book_id and email required');

  const book = await env.DB.prepare('SELECT id, title, price FROM books WHERE id = ? AND is_active = 1').bind(book_id).first();
  if (!book) return errorResponse('Book not found', 404);

  const ref = 'BOOK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const existing = await env.DB.prepare('SELECT id FROM digital_purchases WHERE book_id = ? AND email = ? AND status = ?').bind(book_id, email, 'paid').first();
  if (existing) return jsonResponse({ success: true, already_purchased: true, purchase_id: existing.id });

  await env.DB.prepare(
    'INSERT INTO digital_purchases (book_id, email, amount, payment_ref, status) VALUES (?, ?, ?, ?, ?)'
  ).bind(book_id, email, book.price, ref, 'pending').run();

  const paystackResult = await paystackInit(email, book.price, ref, { book_id, book_title: book.title }, env.PAYSTACK_SECRET_KEY);
  if (!paystackResult.status) return errorResponse('Payment init failed');

  return jsonResponse({
    success: true,
    access_code: paystackResult.data.access_code,
    reference: ref,
    amount: book.price,
  });
}

async function handleBookPurchaseVerify(request, env) {
  const ref = new URL(request.url).pathname.split('/').pop();
  const verification = await paystackVerify(ref, env.PAYSTACK_SECRET_KEY);
  if (!verification.status || verification.data.status !== 'success') {
    return errorResponse('Payment not verified', 402);
  }

  await env.DB.prepare(
    "UPDATE digital_purchases SET status = 'paid' WHERE payment_ref = ?"
  ).bind(ref).run();

  const purchase = await env.DB.prepare(
    'SELECT book_id FROM digital_purchases WHERE payment_ref = ?'
  ).bind(ref).first();

  return jsonResponse({ success: true, book_id: purchase?.book_id, reference: ref });
}

// ===== SITE SETTINGS =====
async function handleGetSiteSettings(request, env) {
  const { results } = await env.DB.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const row of results) settings[row.key] = row.value;
  return jsonResponse({ settings });
}

async function handleAdminUpdateSiteSettings(request, env) {
  const body = await request.json();
  const stmts = [];
  for (const [key, value] of Object.entries(body)) {
    stmts.push(
      env.DB.prepare(
        "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
      ).bind(key, String(value))
    );
  }
  if (stmts.length > 0) await env.DB.batch(stmts);
  return jsonResponse({ success: true });
}

// ===== MAIN ROUTER =====
export default {
  async fetch(request, env, ctx) {
    const cors = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }, 200, cors);
      }

      // Public config (safe to expose)
      if (path === '/api/config') {
        return jsonResponse({ paystackPublicKey: env.PAYSTACK_PUBLIC_KEY || '' }, 200, cors);
      }

      let response;

      // Products
      if (path === '/api/products' && request.method === 'GET') {
        response = await handleGetProducts(request, env);
      } else if (path.match(/^\/api\/products\/\d+$/) && request.method === 'GET') {
        response = await handleGetProduct(request, env);
      }

      // Uploaded images (public)
      else if (path.match(/^\/api\/images\/[\w-]+$/) && request.method === 'GET') {
        response = await handleServeImage(request, env);
      }

      // Books (public)
      else if (path === '/api/books' && request.method === 'GET') {
        response = await handleGetBooks(request, env);
      } else if (path.match(/^\/api\/books\/\d+\/download$/) && request.method === 'GET') {
        response = await handleGetBookDownload(request, env);
      } else if (path === '/api/books/purchase' && request.method === 'POST') {
        response = await handleBookPurchaseInit(request, env);
      } else if (path.match(/^\/api\/books\/verify\/[\w-]+$/) && request.method === 'GET') {
        response = await handleBookPurchaseVerify(request, env);
      }

      // Site settings (public)
      else if (path === '/api/settings' && request.method === 'GET') {
        response = await handleGetSiteSettings(request, env);
      }

      // Admin
      else if (path === '/api/admin/login' && request.method === 'POST') {
        response = await handleAdminLogin(request, env);
      } else if (path === '/api/admin/upload-image' && request.method === 'POST') {
        const admin = await requireAdmin(request, env);
        if (!admin) { response = errorResponse('Unauthorized', 401); }
        else { response = await handleUploadImage(request, env); }
      } else if (path.startsWith('/api/admin/')) {
        const admin = await requireAdmin(request, env);
        if (!admin) {
          response = errorResponse('Unauthorized', 401);
        } else if (path === '/api/admin/products' && request.method === 'GET') {
          response = await handleAdminGetProducts(request, env);
        } else if (path === '/api/admin/products' && request.method === 'POST') {
          response = await handleAdminCreateProduct(request, env);
        } else if (path.match(/^\/api\/admin\/products\/\d+$/) && request.method === 'PUT') {
          response = await handleAdminUpdateProduct(request, env);
        } else if (path.match(/^\/api\/admin\/products\/\d+$/) && request.method === 'DELETE') {
          response = await handleAdminDeleteProduct(request, env);
        }
        // Books
        else if (path === '/api/admin/books' && request.method === 'GET') {
          response = await handleAdminGetBooks(request, env);
        } else if (path === '/api/admin/books' && request.method === 'POST') {
          response = await handleAdminCreateBook(request, env);
        } else if (path.match(/^\/api\/admin\/books\/\d+$/) && request.method === 'PUT') {
          response = await handleAdminUpdateBook(request, env);
        } else if (path.match(/^\/api\/admin\/books\/\d+$/) && request.method === 'DELETE') {
          response = await handleAdminDeleteBook(request, env);
        }
        // Site settings
        else if (path === '/api/admin/settings' && request.method === 'GET') {
          response = await handleGetSiteSettings(request, env);
        } else if (path === '/api/admin/settings' && request.method === 'PUT') {
          response = await handleAdminUpdateSiteSettings(request, env);
        }
      }

      // Auth
      else if (path === '/api/auth/register' && request.method === 'POST') {
        response = await handleRegister(request, env);
      } else if (path === '/api/auth/login' && request.method === 'POST') {
        response = await handleLogin(request, env);
      } else if (path === '/api/auth/profile' && request.method === 'GET') {
        response = await handleGetProfile(request, env);
      } else if (path === '/api/auth/profile' && request.method === 'PUT') {
        response = await handleUpdateProfile(request, env);
      }

      // Orders
      else if (path === '/api/orders' && request.method === 'POST') {
        response = await handleCreateOrder(request, env);
      } else if (path === '/api/orders/my' && request.method === 'GET') {
        response = await handleGetMyOrders(request, env);
      } else if (path.match(/^\/api\/orders\/[\w-]+$/) && request.method === 'GET') {
        response = await handleGetOrder(request, env);
      }

      // Reviews
      else if (path === '/api/reviews' && request.method === 'POST') {
        response = await handleCreateReview(request, env);
      }

      // Newsletter
      else if (path === '/api/subscribe' && request.method === 'POST') {
        response = await handleSubscribe(request, env);
      }

      // Flash Sales
      else if (path === '/api/flash-sales' && request.method === 'GET') {
        response = await handleGetFlashSales(request, env);
      }

      // Analytics
      else if (path === '/api/track' && request.method === 'POST') {
        response = await handleTrackEvent(request, env);
      }

      // Paystack
      else if (path === '/api/paystack/initialize' && request.method === 'POST') {
        response = await handlePaystackInit(request, env);
      } else if (path === '/api/paystack/webhook' && request.method === 'POST') {
        response = await handlePaystackWebhook(request, env);
      } else if (path.match(/^\/api\/paystack\/verify\/[\w-]+$/) && request.method === 'GET') {
        response = await handlePaystackVerify(request, env);
      } else if (path.match(/^\/api\/payment-status\/[\w-]+$/) && request.method === 'GET') {
        response = await handlePaymentStatus(request, env);
      }

      if (response) return withCors(response, cors);
      return errorResponse('Not found', 404, cors);

    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse('Internal server error', 500, cors);
    }
  },
};
