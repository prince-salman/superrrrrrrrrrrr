const BLOCKED_TERMS = [
  // Narkotika & Obat Terlarang
  'narkoba', 'drugs', 'ganja', 'marijuana', 'cocaine', 'heroin', 'sabu', 'ekstasi', 'inex', 'tramadol', 'koplo', 'kratom', 'obat keras', 'resep dokter',
  
  // Judi & Slot Online
  'judi', 'gambling', 'slot online', 'slot gacor', 'slot zeus', 'togel', 'judol', 'zeus maxwin', 'gacor maxwin', 'taruhan online', 'poker judi', 'domino qiu', 'pragmatic play',
  
  // Minuman Keras & Alkohol
  'miras', 'alkohol', 'alcohol', 'liquor', 'beer', 'bir bintang', 'vodka', 'wine', 'ciu', 'arak', 'soju', 'whisky', 'whiskey', 'spirits',
  
  // Rokok & Vape
  'rokok', 'vape', 'cigarette', 'e-cigarette', 'liquid vape', 'cerutu', 'tobacco',
  
  // Senjata & Bahan Peledak
  'senjata api', 'weapon', 'gun', 'pistol', 'senapan', 'peluru', 'amunisi', 'bom', 'explosive', 'petasan', 'mercon', 'clurit', 'celurit', 'pisau lipat',
  
  // Racun & Organ Manusia
  'racun', 'poison', 'cyanide', 'sianida', 'organ manusia', 'jual ginjal', 'kidney sale',
  
  // Konten Dewasa & Ilegal
  'porno', 'porn', 'adult content', 'bokep', 'dildo', 'counterfeit', 'fake id', 'ijazah palsu', 'stnk palsu',
  
  // Cheat & Hack Ilegal
  'cheat game', 'hack akun', 'crack software', 'exploit tool',

  // Kata Kasar & Penghinaan (Profanity & Vandalism)
  'goblok', 'goblog', 'tolol', 'bego', 'blegug',
  'anjing', 'anjg', 'anjir', 'ajg', 'anying',
  'babi', 'bangsat', 'bngst', 'bgst',
  'kontol', 'kntl', 'konthol', 'konthl',
  'memek', 'mmk', 'pepek', 'ppk',
  'pantek', 'pntek',
  'jancok', 'jancuk', 'jnck', 'cok', 'jancik',
  'asu', 'asw',
  'bajingan', 'kampang', 'somplak',
  'idiot', 'sialan', 'keparat',
  'silit', 'kimak', 'perek', 'sundal', 'celeng', 'monyet',
  'tai', 'taik', 'tahi',
  'ngentot', 'ngewe', 'entot', 'ewean',
  'tetek', 'toket',
  'biadab',
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'bastard', 'cunt', 'nigger', 'nigga',
  'bunuh', 'membunuh', 'dibunuh', 'pembunuh',

  // XSS & Script Injection Vectors (raw form — these will match after decoding)
  '<script', '</script', 'javascript:', 'vbscript:', 'onerror=', 'onload=',
  'onmouseover=', 'onfocus=', 'onblur=', 'onclick=', 'onsubmit=',
  'onmouseenter=', 'onmouseleave=', 'onkeydown=', 'onkeyup=', 'onkeypress=',
  'oninput=', 'onchange=', 'ondblclick=', 'oncontextmenu=', 'onresize=',
  'onscroll=', 'ontouchstart=', 'ontouchend=', 'ontouchmove=',
  'eval(', '<iframe', '<svg', '<object', '<embed', '<applet', '<form',
  '<meta', '<link', '<base', '<marquee',
  'document.cookie', 'document.domain', 'document.write', 'document.location',
  'window.location', 'window.open', 'window.name',
  'innerhtml', 'outerhtml', 'insertadjacenthtml',
  'string.fromcharcode', 'atob(', 'btoa(',
  'fetch(', 'xmlhttprequest', 'importscripts',
  'srcdoc=', 'data:text/html', 'data:application',
  'expression(', 'url(', '-moz-binding',
];

// ──── DEEP DECODE for blocklist checking ──────────────────────
// Same decoding logic as in validation.ts to ensure we check
// the fully decoded content against the blocklist.
function decodeForBlockCheck(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let result = text;
  let prevResult = '';
  let iterations = 0;

  while (result !== prevResult && iterations < 5) {
    prevResult = result;
    iterations++;

    // URL decode
    try {
      result = decodeURIComponent(result);
    } catch {
      result = result.replace(/%([0-9A-Fa-f]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
    }

    // HTML hex entities
    result = result.replace(/&#x([0-9A-Fa-f]+);?/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

    // HTML decimal entities
    result = result.replace(/&#(\d+);?/g, (_, dec) =>
      String.fromCharCode(parseInt(dec, 10))
    );

    // Common HTML named entities
    const namedEntities: Record<string, string> = {
      '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"',
      '&apos;': "'", '&nbsp;': ' ', '&sol;': '/', '&bsol;': '\\',
      '&colon;': ':', '&semi;': ';', '&equals;': '=',
    };
    for (const [entity, char] of Object.entries(namedEntities)) {
      result = result.split(entity).join(char);
      result = result.split(entity.replace(';', '')).join(char);
    }

    // JS Unicode escapes
    result = result.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

    // JS hex escapes
    result = result.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  }

  return result;
}

function normalizeText(text: string): string {
  if (!text) return '';
  // First decode all encoding layers
  let decoded = decodeForBlockCheck(text);
  return decoded
    .toLowerCase()
    // Strip whitespace, punctuation, zero-width chars, and common obfuscation chars
    .replace(/[\s.\-_,;:!?*#@()\[\]{}|~`'"\/\\+=%^&<>]+/g, '')
    // Leet speak substitutions
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/€/g, 'e')
    // Zero-width characters used for obfuscation
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, '')
    // Fullwidth characters (Ａ-Ｚ) to normal
    .replace(/[\uFF01-\uFF5E]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    );
}

export function isTextBlocked(text: string): boolean {
  if (!text) return false;

  // Decode all layers first, then check
  const decoded = decodeForBlockCheck(text);
  const lower = decoded.toLowerCase();
  const normalized = normalizeText(text);

  return BLOCKED_TERMS.some(term => {
    const termLower = term.toLowerCase();

    // Check against decoded lowercase
    if (lower.includes(termLower)) return true;

    // Check against normalized (leet speak, obfuscation stripped)
    const termNormalized = normalizeText(term);
    if (termNormalized.length >= 3 && normalized.includes(termNormalized)) return true;

    return false;
  });
}

export function isProductBlocked(name: string, description: string, seller?: string): boolean {
  return isTextBlocked(name) || isTextBlocked(description) || isTextBlocked(seller || '');
}

export function getBlockReason(name: string, description: string, seller?: string): string | null {
  const fields = [
    { label: 'nama produk', value: name },
    { label: 'deskripsi', value: description },
    { label: 'nama penjual', value: seller || '' },
  ];
  for (const field of fields) {
    if (isTextBlocked(field.value)) {
      return `❌ Produk Ditolak & Diblokir Otomatis! Field "${field.label}" mengandung kata terlarang / tidak sopan. Produk ilegal, kata kasar, atau skrip berbahaya tidak diizinkan di PresUMart.`;
    }
  }
  return null;
}
