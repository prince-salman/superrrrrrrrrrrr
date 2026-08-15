import CATEGORIES from '../data/categories';
import MAJORS from './majors';
import { isTextBlocked } from './blocked';

export const PRICE_MIN = 100;
export const PRICE_MAX = 999_999_999;
export const STOCK_MIN = 0;
export const STOCK_MAX = 9999;
export const NAME_MAX_LENGTH = 200;
export const DESC_MAX_LENGTH = 2000;

export const VALID_CONDITIONS = [
  'Baru',
  'Barang Baru',
  'Bekas - Like New',
  'Bekas - Good',
  'Bekas - Fair',
  'Bekas - Mulus',
  'Bekas - Butuh Perbaikan',
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: Record<string, unknown>;
}

// ──── DEEP DECODE: Recursively decode all encoding layers ──────
// Handles: HTML entities (named + numeric + hex), URL encoding (%XX),
// Unicode escapes (\uXXXX), and double/triple encoding.
function decodeAllLayers(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let result = text;
  let prevResult = '';
  let iterations = 0;
  const MAX_ITERATIONS = 5; // Prevent infinite loops on pathological input

  // Keep decoding until stable (no more changes) or max iterations
  while (result !== prevResult && iterations < MAX_ITERATIONS) {
    prevResult = result;
    iterations++;

    // 1. URL decode (%XX, %uXXXX)
    try {
      result = decodeURIComponent(result);
    } catch {
      // If decodeURIComponent fails (malformed), try manual %XX replacement
      result = result.replace(/%([0-9A-Fa-f]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
    }

    // 2. HTML hex entities (&#xHH; or &#xHHHH;)
    result = result.replace(/&#x([0-9A-Fa-f]+);?/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

    // 3. HTML decimal entities (&#DD; or &#DDDD;)
    result = result.replace(/&#(\d+);?/g, (_, dec) =>
      String.fromCharCode(parseInt(dec, 10))
    );

    // 4. HTML named entities
    const namedEntities: Record<string, string> = {
      '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"',
      '&apos;': "'", '&nbsp;': ' ', '&tab;': '\t', '&newline;': '\n',
      '&lpar;': '(', '&rpar;': ')', '&sol;': '/', '&bsol;': '\\',
      '&colon;': ':', '&semi;': ';', '&equals;': '=', '&excl;': '!',
      '&num;': '#', '&dollar;': '$', '&percnt;': '%', '&ast;': '*',
      '&plus;': '+', '&comma;': ',', '&period;': '.', '&quest;': '?',
      '&lsqb;': '[', '&rsqb;': ']', '&lcub;': '{', '&rcub;': '}',
      '&vert;': '|', '&Hat;': '^', '&grave;': '`', '&tilde;': '~',
    };
    for (const [entity, char] of Object.entries(namedEntities)) {
      result = result.split(entity).join(char);
      // Also handle without semicolon
      result = result.split(entity.replace(';', '')).join(char);
    }

    // 5. JavaScript Unicode escapes (\uXXXX)
    result = result.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

    // 6. JavaScript hex escapes (\xHH)
    result = result.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

    // 7. JavaScript octal escapes (\NNN)
    result = result.replace(/\\([0-7]{1,3})/g, (_, oct) =>
      String.fromCharCode(parseInt(oct, 8))
    );
  }

  return result;
}

// ──── SANITIZE TEXT: Multi-layer strip + decode ────────────────
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  // Step 1: Decode all encoding layers to get raw content
  let result = decodeAllLayers(text);

  // Step 2: Strip HTML/XML tags (including malformed ones)
  // Multiple patterns to catch various evasion techniques
  result = result
    // Standard tags: <tag>, </tag>, <tag attr="val">
    .replace(/<\/?[a-zA-Z][^>]*>/gi, '')
    // Self-closing: <br/>, <img />
    .replace(/<[a-zA-Z][^>]*\/>/gi, '')
    // Comments: <!-- ... -->
    .replace(/<!--[\s\S]*?-->/g, '')
    // CDATA sections
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '')
    // Processing instructions: <?...?>
    .replace(/<\?[\s\S]*?\?>/g, '')
    // DOCTYPE
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    // Any remaining angle bracket patterns that look like tags
    .replace(/<\/?[^>]*>/g, '');

  // Step 3: Remove dangerous URI schemes
  result = result
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/data\s*:\s*application/gi, '');

  // Step 4: Remove event handler patterns
  result = result.replace(/on\w+\s*=/gi, '');

  // Step 5: Remove control characters and null bytes
  result = result.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  // Step 6: Remove null byte injections
  result = result.replace(/\0/g, '');

  // Step 7: Final trim
  return result.trim();
}

// ──── STRICT SANITIZE: For product names ──────────────────────
// Product names should only contain safe characters.
// Rejects anything that still contains suspicious characters after sanitization.
export function sanitizeProductName(text: string): { clean: string; suspicious: boolean } {
  const cleaned = sanitizeText(text);

  // After full decode + strip, check if anything suspicious remains
  const suspicious =
    /</.test(cleaned) ||
    />/.test(cleaned) ||
    /javascript/i.test(cleaned) ||
    /on\w+\s*=/i.test(cleaned) ||
    /eval\s*\(/i.test(cleaned) ||
    /document\./i.test(cleaned) ||
    /window\./i.test(cleaned) ||
    /alert\s*\(/i.test(cleaned) ||
    /prompt\s*\(/i.test(cleaned) ||
    /confirm\s*\(/i.test(cleaned) ||
    /String\.fromCharCode/i.test(cleaned) ||
    /atob\s*\(/i.test(cleaned) ||
    /btoa\s*\(/i.test(cleaned) ||
    /fetch\s*\(/i.test(cleaned) ||
    /XMLHttpRequest/i.test(cleaned) ||
    /\bsrc\s*=/i.test(cleaned) ||
    /\bhref\s*=/i.test(cleaned) ||
    /\baction\s*=/i.test(cleaned) ||
    /\bformaction\s*=/i.test(cleaned);

  return { clean: cleaned, suspicious };
}

export function isValidMajor(major: string): boolean {
  if (!major || typeof major !== 'string') return false;
  return MAJORS.includes(major.trim());
}

export function isValidBatch(batch: string | number): boolean {
  const b = String(batch || '').trim();
  const num = parseInt(b, 10);
  return Number.isInteger(num) && num >= 2015 && num <= 2030;
}

// ──── Validate User Profile / Account ─────────────────────────
export function validateUserProfile(userData: Record<string, unknown>): { valid: boolean; errors: string[]; sanitized?: Record<string, any> } {
  const errors: string[] = [];

  const name = typeof userData.name === 'string' ? sanitizeText(userData.name.trim()) : '';
  if (!name || name.length < 2) {
    errors.push('Nama minimal 2 karakter.');
  } else if (name.length > 50) {
    errors.push('Nama maksimal 50 karakter.');
  } else if (isTextBlocked(name)) {
    errors.push('Nama mengandung kata tidak sopan / terlarang.');
  }

  const email = typeof userData.email === 'string' ? userData.email.trim().toLowerCase() : '';
  if (!email.endsWith('@student.president.ac.id') && !email.endsWith('@president.ac.id')) {
    errors.push('Email harus menggunakan domain resmi @student.president.ac.id atau @president.ac.id');
  }

  const major = typeof userData.major === 'string' ? userData.major.trim() : '';
  if (!isValidMajor(major)) {
    errors.push(`Major / Program Studi "${major}" tidak valid. Hanya major resmi President University yang diizinkan.`);
  }

  const batch = String(userData.batch || '').trim();
  if (!isValidBatch(batch)) {
    errors.push(`Angkatan / Batch "${batch}" tidak valid.`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      ...userData,
      name,
      email,
      major,
      batch,
    },
  };
}

// ──── Validate a single product ───────────────────────────────
export function validateProduct(product: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!product || typeof product !== 'object') {
    return { valid: false, errors: ['Product data is invalid or missing.'] };
  }

  // --- Name (with strict sanitization) ---
  const rawName = typeof product.name === 'string' ? product.name.trim() : '';
  const { clean: name, suspicious: nameSuspicious } = sanitizeProductName(rawName);
  if (!name || name.length === 0) {
    errors.push('Nama produk wajib diisi.');
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.push(`Nama produk maksimal ${NAME_MAX_LENGTH} karakter.`);
  } else if (nameSuspicious) {
    errors.push('Nama produk mengandung karakter atau pola berbahaya yang tidak diizinkan.');
  }

  // --- Description (with strict sanitization) ---
  const rawDescription = typeof product.description === 'string' ? product.description.trim() : '';
  const { clean: description, suspicious: descSuspicious } = sanitizeProductName(rawDescription);
  if (!description || description.length === 0) {
    errors.push('Deskripsi produk wajib diisi.');
  } else if (description.length > DESC_MAX_LENGTH) {
    errors.push(`Deskripsi produk maksimal ${DESC_MAX_LENGTH} karakter.`);
  } else if (descSuspicious) {
    errors.push('Deskripsi produk mengandung karakter atau pola berbahaya yang tidak diizinkan.');
  }

  // --- Price (CRITICAL: prevent negative/zero prices) ---
  const price = Number(product.price);
  if (!Number.isFinite(price) || isNaN(price)) {
    errors.push('Harga produk tidak valid.');
  } else if (price < PRICE_MIN) {
    errors.push(`Harga minimum adalah Rp ${PRICE_MIN.toLocaleString('id-ID')}.`);
  } else if (price > PRICE_MAX) {
    errors.push(`Harga maksimum adalah Rp ${PRICE_MAX.toLocaleString('id-ID')}.`);
  } else if (!Number.isInteger(price)) {
    errors.push('Harga harus berupa bilangan bulat (tanpa desimal).');
  }

  // --- Category (CRITICAL: whitelist-only, no custom categories) ---
  const category = typeof product.category === 'string' ? product.category.trim() : '';
  if (!category) {
    errors.push('Kategori produk wajib dipilih.');
  } else if (!CATEGORIES.includes(category)) {
    errors.push(`Kategori "${category}" tidak valid. Hanya kategori resmi yang diizinkan.`);
  }

  // --- Stock ---
  const stock = Number(product.stock !== undefined ? product.stock : 1);
  if (!Number.isFinite(stock) || isNaN(stock)) {
    errors.push('Stok produk tidak valid.');
  } else if (stock < STOCK_MIN) {
    errors.push(`Stok minimum adalah ${STOCK_MIN}.`);
  } else if (stock > STOCK_MAX) {
    errors.push(`Stok maksimum adalah ${STOCK_MAX}.`);
  } else if (!Number.isInteger(stock)) {
    errors.push('Stok harus berupa bilangan bulat.');
  }

  // --- Condition ---
  const condition = typeof product.condition === 'string' ? product.condition.trim() : 'Bekas - Like New';
  if (!VALID_CONDITIONS.includes(condition)) {
    errors.push(`Kondisi "${condition}" tidak valid.`);
  }

  // --- Seller info ---
  const sellerEmail = typeof product.sellerEmail === 'string' ? product.sellerEmail.trim() : '';
  if (!sellerEmail || !sellerEmail.includes('@')) {
    errors.push('Email penjual tidak valid.');
  }

  // --- Seller Major (CRITICAL: Whitelist check) ---
  let sellerMajor = typeof product.sellerMajor === 'string' ? product.sellerMajor.trim() : '';
  if (sellerMajor && !isValidMajor(sellerMajor)) {
    errors.push(`Major penjual "${sellerMajor}" tidak valid. Hanya major resmi yang diizinkan.`);
  }

  // --- Seller Batch (CRITICAL: Batch check) ---
  let sellerBatch = String(product.sellerBatch || '').trim();
  if (sellerBatch && !isValidBatch(sellerBatch)) {
    errors.push(`Angkatan penjual "${sellerBatch}" tidak valid.`);
  }

  const sellerName = typeof product.seller === 'string' ? sanitizeText(product.seller.trim()).slice(0, 50) : '';

  // --- Image URLs: validate they are proper URLs, not script injections ---
  let sanitizedImages: string[] = [];
  if (Array.isArray(product.images)) {
    sanitizedImages = (product.images as string[])
      .filter((img: any) => typeof img === 'string')
      .map((img: string) => img.trim())
      .filter((img: string) => {
        // Only allow http/https URLs or data:image URIs, block javascript: etc.
        if (/^https?:\/\//i.test(img)) return true;
        if (/^data:image\//i.test(img)) return true;
        return false;
      })
      .slice(0, 10); // Max 10 images
  }

  let sanitizedImage = '';
  if (typeof product.image === 'string') {
    const img = product.image.trim();
    if (/^https?:\/\//i.test(img) || /^data:image\//i.test(img) || img === '') {
      sanitizedImage = img;
    }
  }

  // If valid, return sanitized data
  if (errors.length === 0) {
    return {
      valid: true,
      errors: [],
      sanitized: {
        ...product,
        name: sanitizeText(name),
        description: sanitizeText(description),
        price: Math.round(price),
        category,
        stock: Math.round(Math.max(STOCK_MIN, Math.min(STOCK_MAX, stock))),
        condition,
        sellerEmail,
        seller: sellerName || product.seller,
        sellerMajor: sellerMajor || product.sellerMajor || 'Informatics',
        sellerBatch: sellerBatch || product.sellerBatch || '2024',
        allowNego: product.allowNego === true || product.allowNego === undefined,
        images: sanitizedImages,
        image: sanitizedImage,
      },
    };
  }

  return { valid: false, errors };
}

// ──── Validate an array of products ───────────────────────────
export function validateProducts(products: unknown[]): {
  valid: Record<string, unknown>[];
  rejected: { index: number; errors: string[] }[];
} {
  const valid: Record<string, unknown>[] = [];
  const rejected: { index: number; errors: string[] }[] = [];

  if (!Array.isArray(products)) {
    return { valid: [], rejected: [{ index: -1, errors: ['Products is not an array.'] }] };
  }

  products.forEach((product, index) => {
    const result = validateProduct(product as Record<string, unknown>);
    if (result.valid && result.sanitized) {
      valid.push(result.sanitized);
    } else {
      rejected.push({ index, errors: result.errors });
    }
  });

  return { valid, rejected };
}
