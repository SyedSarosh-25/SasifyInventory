import { createHash } from 'node:crypto';

const siteOrigin = () =>
  String(
    process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://www.sasifysolutions.com',
  ).replace(/\/$/, '');

const MIN_BINANCE_USDT = 6;
const CRYPTO_NETWORK_FEE_USDT = 0.01;

const BOT_LANGUAGES = Object.freeze(['en', 'ur', 'roman', 'vi']);
const BOT_COPY = {
  en: {
    welcome: '👋 Welcome to Sasify Solutions',
    automated: '🤖 Automated shopping 24/7',
    flow: 'Select a product → Pay → Receive your order',
    warning: '⚠️ Please read the complete product description before purchasing. Product-specific warranty and activation terms apply.',
    needHelp: '💬 Need help? Use Support below.',
    buy: '🛍 Buy products',
    profile: '👤 Profile',
    history: '🧾 Purchase history',
    support: '💬 Support',
    warranty: '🛡 Warranty',
    language: '🌐 Language',
    main: '🏠 Main menu',
    productsTitle: '🛍 Sasify products',
    categoriesIntro: 'Choose a category below. Products are grouped so you do not have to scroll through dozens of pages.',
    readDescription: '⚠️ Read the full description before purchasing.',
    browseAll: '✨ Browse all products',
    categories: '← Categories',
    previous: '← Previous',
    next: 'Next →',
    backProducts: '← Back to products',
    chooseProduct: 'Choose a product below. Full description, stock and price are shown before you confirm the order.',
    orderCreated: '✅ Order created',
    paymentChoices: 'Choose Binance Pay, crypto USDT, wallet, or bank transfer below. The exact amount, destination and payment instructions will appear after you choose a method.',
    wallet: '👛 Pay by wallet',
    bank: '🏦 Bank transfer',
    binance: '🟡 Binance Pay',
    crypto: '🪙 Crypto USDT',
    checkStatus: '🔄 Check order status',
    paid: '✅ I have paid',
    backPayment: '← Back to payment options',
    chooseLanguage: '🌐 Choose language',
    chooseLanguageHint: 'Select your preferred language. You can change it anytime.',
    english: 'English',
    urdu: 'اردو',
    roman: 'Roman Urdu',
    vietnamese: 'Tiếng Việt',
  },
  ur: {
    welcome: '👋 Sasify Solutions میں خوش آمدید',
    automated: '🤖 24/7 خودکار خریداری',
    flow: 'پروڈکٹ منتخب کریں → ادائیگی کریں → آرڈر حاصل کریں',
    warning: '⚠️ خریداری سے پہلے مکمل پروڈکٹ تفصیل پڑھیں۔ وارنٹی اور ایکٹیویشن کی شرائط مختلف ہو سکتی ہیں۔',
    needHelp: '💬 مدد کے لیے نیچے Support استعمال کریں۔',
    buy: '🛍 پروڈکٹس خریدیں',
    profile: '👤 پروفائل',
    history: '🧾 خریداری کی تاریخ',
    support: '💬 سپورٹ',
    warranty: '🛡 وارنٹی',
    language: '🌐 زبان',
    main: '🏠 مین مینو',
    productsTitle: '🛍 Sasify پروڈکٹس',
    categoriesIntro: 'نیچے کیٹیگری منتخب کریں۔ پروڈکٹس گروپ کیے گئے ہیں تاکہ آپ کو بہت سے صفحات نہ دیکھنے پڑیں۔',
    readDescription: '⚠️ خریداری سے پہلے مکمل تفصیل پڑھیں۔',
    browseAll: '✨ تمام پروڈکٹس دیکھیں',
    categories: '← کیٹیگریز',
    previous: '← پچھلا',
    next: 'اگلا →',
    backProducts: '← پروڈکٹس پر واپس جائیں',
    chooseProduct: 'پروڈکٹ منتخب کریں۔ آرڈر سے پہلے مکمل تفصیل، اسٹاک اور قیمت دکھائی جائے گی۔',
    orderCreated: '✅ آرڈر بن گیا',
    paymentChoices: 'نیچے Binance Pay، Crypto USDT، والٹ یا بینک ٹرانسفر منتخب کریں۔ طریقہ منتخب کرنے کے بعد درست رقم اور ادائیگی کی ہدایات دکھائی جائیں گی۔',
    wallet: '👛 والٹ سے ادائیگی',
    bank: '🏦 بینک ٹرانسفر',
    binance: '🟡 Binance Pay',
    crypto: '🪙 Crypto USDT',
    checkStatus: '🔄 آرڈر کا اسٹیٹس دیکھیں',
    paid: '✅ میں نے ادائیگی کر دی ہے',
    backPayment: '← ادائیگی کے طریقوں پر واپس جائیں',
    chooseLanguage: '🌐 زبان منتخب کریں',
    chooseLanguageHint: 'اپنی پسند کی زبان منتخب کریں۔ آپ اسے کسی بھی وقت تبدیل کر سکتے ہیں۔',
    english: 'English',
    urdu: 'اردو',
    roman: 'Roman Urdu',
    vietnamese: 'Tiếng Việt',
  },
  roman: {
    welcome: '👋 Sasify Solutions mein khush aamdeed',
    automated: '🤖 24/7 automated shopping',
    flow: 'Product select karein → Pay karein → Order receive karein',
    warning: '⚠️ Purchase se pehle complete product description zaroor parhein. Warranty aur activation terms product ke mutabiq different ho sakti hain.',
    needHelp: '💬 Madad ke liye neeche Support use karein.',
    buy: '🛍 Products khareedein',
    profile: '👤 Profile',
    history: '🧾 Purchase history',
    support: '💬 Support',
    warranty: '🛡 Warranty',
    language: '🌐 Language',
    main: '🏠 Main menu',
    productsTitle: '🛍 Sasify products',
    categoriesIntro: 'Neeche category select karein. Products group kiye gaye hain taake aap ko bohat se pages scroll na karne parhein.',
    readDescription: '⚠️ Purchase se pehle full description parhein.',
    browseAll: '✨ Sab products dekhein',
    categories: '← Categories',
    previous: '← Previous',
    next: 'Next →',
    backProducts: '← Products par wapas',
    chooseProduct: 'Product select karein. Order confirm karne se pehle full description, stock aur price show honge.',
    orderCreated: '✅ Order create ho gaya',
    paymentChoices: 'Neeche Binance Pay, Crypto USDT, wallet ya bank transfer select karein. Method select karne ke baad exact amount aur instructions show hongi.',
    wallet: '👛 Wallet se pay karein',
    bank: '🏦 Bank transfer',
    binance: '🟡 Binance Pay',
    crypto: '🪙 Crypto USDT',
    checkStatus: '🔄 Order status check karein',
    paid: '✅ Main ne payment kar di hai',
    backPayment: '← Payment options par wapas',
    chooseLanguage: '🌐 Language select karein',
    chooseLanguageHint: 'Apni preferred language select karein. Aap ise kabhi bhi change kar sakte hain.',
    english: 'English',
    urdu: 'اردو',
    roman: 'Roman Urdu',
    vietnamese: 'Tiếng Việt',
  },
  vi: {
    welcome: '👋 Chào mừng bạn đến với Sasify Solutions',
    automated: '🤖 Mua sắm tự động 24/7',
    flow: 'Chọn sản phẩm → Thanh toán → Nhận đơn hàng',
    warning: '⚠️ Vui lòng đọc đầy đủ mô tả sản phẩm trước khi mua. Điều khoản bảo hành và kích hoạt có thể khác nhau tùy sản phẩm.',
    needHelp: '💬 Cần hỗ trợ? Hãy chọn Support bên dưới.',
    buy: '🛍 Mua sản phẩm',
    profile: '👤 Hồ sơ',
    history: '🧾 Lịch sử mua hàng',
    support: '💬 Hỗ trợ',
    warranty: '🛡 Bảo hành',
    language: '🌐 Ngôn ngữ',
    main: '🏠 Menu chính',
    productsTitle: '🛍 Sản phẩm Sasify',
    categoriesIntro: 'Chọn một danh mục bên dưới. Sản phẩm được nhóm để bạn không phải xem quá nhiều trang.',
    readDescription: '⚠️ Đọc kỹ mô tả trước khi mua.',
    browseAll: '✨ Xem tất cả sản phẩm',
    categories: '← Danh mục',
    previous: '← Trước',
    next: 'Tiếp →',
    backProducts: '← Quay lại sản phẩm',
    chooseProduct: 'Chọn sản phẩm bên dưới. Mô tả đầy đủ, tồn kho và giá sẽ hiển thị trước khi xác nhận đơn hàng.',
    orderCreated: '✅ Đã tạo đơn hàng',
    paymentChoices: 'Chọn Binance Pay, Crypto USDT, ví điện tử hoặc chuyển khoản ngân hàng bên dưới. Số tiền và hướng dẫn chính xác sẽ hiển thị sau khi bạn chọn phương thức.',
    wallet: '👛 Thanh toán bằng ví',
    bank: '🏦 Chuyển khoản ngân hàng',
    binance: '🟡 Binance Pay',
    crypto: '🪙 Crypto USDT',
    checkStatus: '🔄 Kiểm tra trạng thái đơn hàng',
    paid: '✅ Tôi đã thanh toán',
    backPayment: '← Quay lại phương thức thanh toán',
    chooseLanguage: '🌐 Chọn ngôn ngữ',
    chooseLanguageHint: 'Chọn ngôn ngữ bạn muốn sử dụng. Bạn có thể thay đổi bất cứ lúc nào.',
    english: 'English',
    urdu: 'اردو',
    roman: 'Roman Urdu',
    vietnamese: 'Tiếng Việt',
  },
};

function normalizeLanguage(value) {
  const language = String(value || '').trim().toLowerCase();
  return BOT_LANGUAGES.includes(language) ? language : 'en';
}

function botCopy(language = 'en') {
  return BOT_COPY[normalizeLanguage(language)];
}

export async function telegramCall(token, method, payload) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok)
    throw new Error(
      String(
        result.description || `Telegram API returned HTTP ${response.status}.`,
      ),
    );
  return result;
}

export function checkoutUrl(productId) {
  const normalized = productId === 'p093' ? 'p093-ultra' : productId;
  return `${siteOrigin()}/checkout?product=${encodeURIComponent(normalized)}`;
}

export function sasifyBotConfigured(env = process.env) {
  return Boolean(
    String(env.SASIFY_BOT_TOKEN || '').trim() &&
    String(env.SASIFY_BOT_WEBHOOK_SECRET || '').trim(),
  );
}

export function productRef(productId) {
  return createHash('sha1')
    .update(String(productId || ''))
    .digest('hex')
    .slice(0, 10);
}

function money(value) {
  const amount = Number(value || 0);
  return amount > 0
    ? `PKR ${amount.toLocaleString('en-PK')}`
    : 'Contact support';
}

function stockLabel(product) {
  const available = Number(product?.available);
  if (!Number.isFinite(available)) return 'Availability confirmed at checkout';
  return available > 0 ? `${available} in stock` : 'Out of stock';
}

function compactName(value, max = 40) {
  const name = String(value || 'Product').trim();
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function productIcon(product) {
  const value = `${product?.name || ''} ${product?.description || ''}`.toLowerCase();
  if (/linkedin/.test(value)) return '🔵';
  if (/manus/.test(value)) return '🟣';
  if (/suno/.test(value)) return '🎵';
  if (/grok|x\.com|twitter/.test(value)) return '𝕏';
  if (/scribd/.test(value)) return '📚';
  if (/chatgpt|openai/.test(value)) return '🤖';
  if (/claude|anthropic/.test(value)) return '🟠';
  if (/gemini|google ai|google one|google drive/.test(value)) return '✨';
  if (/adobe|photoshop|acrobat/.test(value)) return '🔴';
  if (/capcut/.test(value)) return '✂️';
  if (/canva|figma|midjourney|runway|lovable/.test(value)) return '🎨';
  if (/microsoft|office 365|windows|outlook|onedrive|xbox/.test(value)) return '🪟';
  if (/youtube/.test(value)) return '▶️';
  if (/spotify/.test(value)) return '🟢';
  if (/netflix|disney|prime video|streaming/.test(value)) return '🎬';
  if (/github|gitlab/.test(value)) return '🐙';
  if (/notion|grammarly|quillbot/.test(value)) return '📝';
  if (/cursor|replit|coding|programming/.test(value)) return '💻';
  if (/perplexity|search/.test(value)) return '🔎';
  if (/zoom/.test(value)) return '📹';
  if (/telegram/.test(value)) return '✈️';
  if (/vpn|nord|expressvpn|surfshark|proxy|security|antivirus|2fa|otp|authenticator/.test(value)) return '🛡️';
  if (/hostinger|hosting|vps/.test(value)) return '🌐';
  if (/education|course|learning|academic|student|udemy|coursera/.test(value)) return '🎓';
  return '🛍️';
}

const PRODUCT_CATEGORIES = [
  ['api', '🔌 API products'],
  ['chatgpt', '🤖 ChatGPT'],
  ['claude', '🟠 Claude'],
  ['google', '✨ Google / Gemini'],
  ['creative', '🎨 Creative tools'],
  ['microsoft', '🪟 Microsoft'],
  ['entertainment', '🎬 Entertainment'],
  ['productivity', '⚙️ Productivity'],
  ['security', '🛡 Security & VPN'],
  ['education', '🎓 Education'],
  ['other', '🧰 Other tools'],
];

function productCategory(product) {
  const value = `${product?.name || ''} ${product?.description || ''}`.toLowerCase();
  if (/\bapi\b/.test(value)) return 'api';
  if (/chatgpt|openai/.test(value)) return 'chatgpt';
  if (/claude|anthropic/.test(value)) return 'claude';
  if (/gemini|google ai|google one|google drive/.test(value)) return 'google';
  if (/adobe|photoshop|acrobat|figma|canva|capcut|veo|runway|lovable|midjourney/.test(value))
    return 'creative';
  if (/microsoft|office 365|windows|outlook|onedrive/.test(value)) return 'microsoft';
  if (/netflix|spotify|youtube|disney|prime video|streaming|tiktok/.test(value))
    return 'entertainment';
  if (/github|jetbrains|notion|grammarly|quillbot|slack|zoom|coding|programming/.test(value))
    return 'productivity';
  if (/vpn|nord|expressvpn|surfshark|proxy|security|antivirus|2fa|otp|authenticator/.test(value))
    return 'security';
  if (/edu|student|course|learning|education|academic/.test(value)) return 'education';
  return 'other';
}

function categoryLabel(category) {
  return PRODUCT_CATEGORIES.find(([key]) => key === category)?.[1] || '🧰 Other tools';
}

function categoryProducts(products, category = 'all') {
  return category === 'all'
    ? products
    : products.filter((product) => productCategory(product) === category);
}

export function quickReplyKeyboard() {
  return {
    keyboard: [
      [{ text: '🛍 Products' }, { text: '💬 Support' }],
      [{ text: '🛡 Warranty' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: 'Choose a quick menu below',
  };
}

export function mainMenuMessage(language = 'en') {
  const copy = botCopy(language);
  return {
    text: `${copy.welcome}\n\n${copy.automated}\n${copy.flow}\n\n${copy.warning}\n\n${copy.needHelp}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: copy.buy, callback_data: 'menu:products' }],
        [
          { text: copy.profile, callback_data: 'menu:profile' },
          { text: copy.history, callback_data: 'menu:history' },
        ],
        [
          { text: copy.support, callback_data: 'menu:support' },
          { text: copy.warranty, callback_data: 'menu:warranty' },
        ],
        [{ text: copy.language, callback_data: 'menu:language' }],
      ],
    },
  };
}

export function sasifyBotMenu(products = [], language = 'en') {
  const featured = products
    .filter((product) => Number(product.price || 0) > 0)
    .slice(0, 3)
    .map((product) => compactName(product.name, 25))
    .join(' · ');
  const menu = mainMenuMessage(language);
  return {
    ...menu,
    text: `${menu.text}\n\nFeatured: ${featured || 'Use Buy products to browse the catalogue.'}`,
  };
}

function productKeyboard(products, page, category = 'all', pageSize = 12, language = 'en') {
  const copy = botCopy(language);
  const start = page * pageSize;
  const visible = products.slice(start, start + pageSize);
  const rows = [];
  for (let index = 0; index < visible.length; index += 3) {
    rows.push(
      visible.slice(index, index + 3).map((product) => ({
        text: `${Number(product.available) === 0 ? '⛔' : productIcon(product)} ${compactName(product.name, 22)}`,
        callback_data: `product:${productRef(product.id)}`,
      })),
    );
  }
  const navigation = [];
  if (page > 0)
    navigation.push({
      text: copy.previous,
      callback_data: `category:${category}:${page - 1}`,
    });
  if (start + pageSize < products.length)
    navigation.push({
      text: copy.next,
      callback_data: `category:${category}:${page + 1}`,
    });
  if (navigation.length) rows.push(navigation);
  rows.push([{ text: copy.categories, callback_data: 'menu:products' }]);
  rows.push([{ text: copy.main, callback_data: 'menu:home' }]);
  return rows;
}

export function productCategoriesMessage(products = [], language = 'en') {
  const copy = botCopy(language);
  const counts = new Map(
    PRODUCT_CATEGORIES.map(([key]) => [
      key,
      products.filter((product) => productCategory(product) === key).length,
    ]),
  );
  const rows = [];
  for (let index = 0; index < PRODUCT_CATEGORIES.length; index += 2) {
    rows.push(
      PRODUCT_CATEGORIES.slice(index, index + 2).map(([key, label]) => ({
        text: `${label} (${counts.get(key) || 0})`,
        callback_data: `category:${key}:0`,
      })),
    );
  }
  rows.push([{ text: copy.browseAll, callback_data: 'category:all:0' }]);
  rows.push([{ text: copy.main, callback_data: 'menu:home' }]);
  return {
    text: `${copy.productsTitle}\n\n${copy.categoriesIntro}\n\n${copy.readDescription}`,
    reply_markup: { inline_keyboard: rows },
  };
}

export function productsMessage(products = [], page = 0, category = 'all', language = 'en') {
  const copy = botCopy(language);
  const filtered = categoryProducts(products, category);
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(Number(page) || 0, 0), totalPages - 1);
  return {
    text: `🛍 ${category === 'all' ? 'All products' : categoryLabel(category)}\n\n${copy.chooseProduct}\n\n${filtered.length} products · Page ${safePage + 1} of ${totalPages}`,
    reply_markup: {
      inline_keyboard: productKeyboard(filtered, safePage, category, pageSize, language),
    },
  };
}

export function productMessage(product, language = 'en') {
  const copy = botCopy(language);
  const description = String(
    product?.description || 'Product details will be confirmed before payment.',
  ).trim();
  const purchaseAllowed =
    Number(product?.price || 0) > 0 && Number(product?.available ?? 1) !== 0;
  return {
    text: `🛍 ${product?.name || 'Product'}\n\n${description}\n\n💰 Price: ${money(product?.price)}\n📦 ${stockLabel(product)}\n\n${copy.warning}`,
    reply_markup: {
      inline_keyboard: [
        ...(purchaseAllowed
          ? [
              [
                {
                  text: '✅ Buy now',
                  callback_data: `buy:${productRef(product.id)}`,
                },
              ],
            ]
          : []),
        [{ text: copy.backProducts, callback_data: 'menu:products' }],
      ],
    },
  };
}

export function orderPaymentMessage(order, _receiver, language = 'en') {
  const copy = botCopy(language);
  const paymentAmount = Number(order?.paymentAmount);
  const paymentCurrency = String(order?.paymentCurrency || '').toUpperCase();
  const rate = Number(process.env.BINANCE_USDT_PKR_RATE || '');
  const estimatedUsdt =
    paymentCurrency === 'USDT' && Number.isFinite(paymentAmount)
      ? paymentAmount
      : Number.isFinite(rate) && rate > 0
        ? Math.ceil((Number(order?.amount || 0) / rate) * 100) / 100
        : null;
  const cryptoAllowed =
    estimatedUsdt == null || estimatedUsdt >= MIN_BINANCE_USDT;
  const paymentChoices = cryptoAllowed
    ? copy.paymentChoices
    : `Crypto USDT is unavailable for this order because the minimum is USDT ${MIN_BINANCE_USDT.toFixed(2)}. Binance Pay remains available, or choose wallet or bank transfer.`;
  const paymentRows = [
    [
      { text: copy.wallet, callback_data: `pay:${order.id}:wallet` },
      { text: copy.bank, callback_data: `pay:${order.id}:bank` },
    ],
  ];
  paymentRows.push([
    { text: copy.binance, callback_data: `pay:${order.id}:binance` },
    ...(cryptoAllowed
      ? [{ text: copy.crypto, callback_data: `pay:${order.id}:crypto` }]
      : []),
  ]);
  return {
    text: `${copy.orderCreated}\n\nOrder: ${String(order.id).slice(0, 8)}\nProduct: ${order.productName}\nListed price: ${money(order.amount)}\n\n${paymentChoices}`,
    reply_markup: {
      inline_keyboard: [
        ...paymentRows,
        [
          {
            text: copy.checkStatus,
            callback_data: `status:${order.id}`,
          },
        ],
        [{ text: copy.backProducts, callback_data: 'menu:products' }],
        [{ text: copy.main, callback_data: 'menu:home' }],
      ],
    },
  };
}

export function paymentMethodMessage(order, receiver, method, language = 'en') {
  const copy = botCopy(language);
  const label =
    method === 'crypto'
      ? 'Crypto USDT deposit'
      : method === 'binance'
        ? 'Binance Pay'
      : method === 'bank'
        ? 'Bank transfer'
        : 'Wallet payment';
  const destination = order.paymentReceiver || receiver;
  const displayedAmount =
    order.paymentCurrency === 'USDT'
      ? `USDT ${Number(order.paymentAmount || 0).toFixed(2)}`
      : money(order.amount);
  const paymentNote = method === 'crypto'
    ? `Send exactly USDT ${(Number(order.paymentAmount || 0) + CRYPTO_NETWORK_FEE_USDT).toFixed(2)} via BEP20. This includes the USDT ${CRYPTO_NETWORK_FEE_USDT.toFixed(2)} network fee; we expect to receive net USDT ${Number(order.paymentAmount || 0).toFixed(2)} and cover the fee for you.`
    : 'After sending the payment, tap the button below.';
  return {
    text: `👛 ${label}\n\nOrder: ${String(order.id).slice(0, 8)}\nAmount: ${displayedAmount}\nReceiver: ${destination?.title || 'Active receiver'}\nAccount: ${destination?.number || 'Shown by admin'}\n\n${paymentNote}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: copy.paid, callback_data: `paid:${order.id}` }],
        [{ text: copy.checkStatus, callback_data: `status:${order.id}` }],
        [{ text: copy.backPayment, callback_data: `order:${order.id}` }],
        [{ text: copy.main, callback_data: 'menu:home' }],
      ],
    },
  };
}

function productForRef(products, ref) {
  return products.find((product) => productRef(product.id) === ref);
}

function chatDetails(update) {
  const message = update?.message || update?.callback_query?.message;
  const chat = message?.chat;
  if (!chat?.id) return null;
  const from = update?.message?.from || update?.callback_query?.from || {};
  return {
    chatId: String(chat.id),
    userId: String(from.id || ''),
    firstName: String(from.first_name || ''),
    username: String(from.username || ''),
  };
}

async function send(token, chatId, message) {
  return telegramCall(token, 'sendMessage', {
    chat_id: chatId,
    disable_web_page_preview: true,
    reply_markup: quickReplyKeyboard(),
    ...message,
  });
}

async function sendMenu(token, chatId, message) {
  await telegramCall(token, 'sendMessage', {
    chat_id: chatId,
    text: '📌 Quick menu enabled below the chat bar.',
    reply_markup: quickReplyKeyboard(),
  });
  return send(token, chatId, message);
}

async function answer(token, callbackQuery, text = '') {
  if (!callbackQuery?.id) return;
  await telegramCall(token, 'answerCallbackQuery', {
    callback_query_id: callbackQuery.id,
    ...(text ? { text, show_alert: false } : {}),
  });
}

export function languageMessage(language = 'en') {
  const copy = botCopy(language);
  return {
    text: `${copy.chooseLanguage}\n\n${copy.chooseLanguageHint}`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `🇬🇧 ${copy.english}`, callback_data: 'language:en' },
          { text: `🇵🇰 ${copy.urdu}`, callback_data: 'language:ur' },
        ],
        [
          { text: `🔤 ${copy.roman}`, callback_data: 'language:roman' },
          { text: `🇻🇳 ${copy.vietnamese}`, callback_data: 'language:vi' },
        ],
        [{ text: copy.main, callback_data: 'menu:home' }],
      ],
    },
  };
}

function menuText(action, language = 'en') {
  const copy = botCopy(language);
  if (action === 'wallet')
    return {
      text: '👛 Payment methods\n\nThe active receiver account and exact order amount are shown inside Telegram after you choose a product. You can pay by wallet, bank transfer, or Binance, then return here and tap “I have paid”.',
      reply_markup: {
        inline_keyboard: [
          [{ text: copy.buy, callback_data: 'menu:products' }],
          [{ text: copy.main, callback_data: 'menu:home' }],
        ],
      },
    };
  if (action === 'warranty')
    return {
      text: '🛡 Warranty\n\nPlease read the complete product description before purchasing. Warranty, activation and replacement terms can differ by product. Do not change account passwords or 2FA settings when the delivery instructions prohibit it.',
      reply_markup: {
        inline_keyboard: [
          [{ text: copy.buy, callback_data: 'menu:products' }],
          [{ text: copy.main, callback_data: 'menu:home' }],
        ],
      },
    };
  if (action === 'support')
    return {
      text: '💬 Support\n\nSend your order reference and a short description of the issue. The admin team will review it.',
      reply_markup: {
        inline_keyboard: [
          [{ text: copy.buy, callback_data: 'menu:products' }],
          [{ text: copy.main, callback_data: 'menu:home' }],
        ],
      },
    };
  if (action === 'language')
    return languageMessage(language);
  return null;
}

export async function handleSasifyBotUpdate(update, context) {
  const token = String(context?.token || '').trim();
  if (!token) throw new Error('SasifyBot is not configured.');
  const chat = chatDetails(update);
  if (!chat) return { ok: true, ignored: true };
  const callbackQuery = update?.callback_query;
  const data = String(callbackQuery?.data || '').trim();
  const messageText = String(update?.message?.text || '').trim();
  const products = await context.listProducts();
  if (callbackQuery) await answer(token, callbackQuery);

  const session = await context.getSession(chat.chatId);
  const language = normalizeLanguage(session?.language);
  if (!callbackQuery && session?.state === 'awaiting_email' && messageText) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(messageText)) {
      await send(token, chat.chatId, {
        text: 'Please send a valid customer email address, for example name@gmail.com.',
      });
      return { ok: true, handled: 'awaiting_email' };
    }
    const product = productForRef(products, session.productRef);
    if (!product) {
      await context.clearSession(chat.chatId);
      await send(token, chat.chatId, {
        text: 'That product is no longer available. Please choose Products again.',
      });
      return { ok: true, handled: 'stale_product' };
    }
    const order = await context.createOrder({
      productId: product.id,
      customerEmail: messageText,
      paymentMethod: 'wallet',
      ...chat,
    });
    await context.clearSession(chat.chatId);
    await send(
      token,
      chat.chatId,
      orderPaymentMessage(order, context.receiver, language),
    );
    return { ok: true, handled: 'create_order_with_email', orderId: order.id };
  }

  if (!callbackQuery) {
    const normalized = messageText.toLowerCase();
    if (
      normalized === '/start' ||
      normalized === '/help' ||
      normalized === '/menu' ||
      !messageText
    ) {
      await sendMenu(token, chat.chatId, sasifyBotMenu(products, language));
      return { ok: true, handled: 'menu' };
    }
    if (normalized.startsWith('/start ')) {
      const ref = normalized.slice(7).trim();
      const product =
        productForRef(products, ref) ||
        products.find((item) => String(item.id).toLowerCase() === ref);
      await send(
        token,
        chat.chatId,
        product ? productMessage(product, language) : sasifyBotMenu(products, language),
      );
      return { ok: true, handled: product ? 'deep_link_product' : 'menu' };
    }
    const quickActions = {
      '🛍 products': 'products',
      products: 'products',
      '/products': 'products',
      '💬 support': 'support',
      support: 'support',
      '👛 wallet': 'wallet',
      wallet: 'wallet',
      '🔗 api': 'api-products',
      '🔌 api access': 'api-products',
      '🔌 api products': 'api-products',
      api: 'api-products',
      '🌐 language': 'language',
      language: 'language',
      '🛡 warranty': 'warranty',
      warranty: 'warranty',
    };
    const quickAction = quickActions[normalized];
    if (quickAction === 'products') {
      await send(token, chat.chatId, productCategoriesMessage(products, language));
      return { ok: true, handled: 'products' };
    }
    if (quickAction === 'api-products') {
      await send(token, chat.chatId, productsMessage(products, 0, 'api', language));
      return { ok: true, handled: 'api_products' };
    }
    const quickMessage = menuText(quickAction, language);
    if (quickMessage) {
      await send(token, chat.chatId, quickMessage);
      return { ok: true, handled: quickAction };
    }
    await send(token, chat.chatId, {
      text: 'Use the quick menu below to browse products or manage your order.',
    });
    return { ok: true, handled: 'fallback' };
  }

  if (data === 'menu:language') {
    await send(token, chat.chatId, languageMessage(language));
    return { ok: true, handled: 'language' };
  }
  if (data.startsWith('language:')) {
    const selectedLanguage = normalizeLanguage(data.slice(9));
    if (typeof context.setLanguage === 'function')
      await context.setLanguage(chat.chatId, selectedLanguage);
    await sendMenu(
      token,
      chat.chatId,
      sasifyBotMenu(products, selectedLanguage),
    );
    return { ok: true, handled: 'language_changed', language: selectedLanguage };
  }
  if (data === 'menu:home') {
    if (session?.state === 'awaiting_email') await context.clearSession(chat.chatId);
      await sendMenu(token, chat.chatId, sasifyBotMenu(products, language));
    return { ok: true, handled: 'menu' };
  }
  if (data === 'back:products') {
    if (session?.state === 'awaiting_email') await context.clearSession(chat.chatId);
    await send(token, chat.chatId, productCategoriesMessage(products, language));
    return { ok: true, handled: 'products' };
  }
  if (data === 'menu:products') {
    if (session?.state === 'awaiting_email') await context.clearSession(chat.chatId);
    await send(token, chat.chatId, productCategoriesMessage(products, language));
    return { ok: true, handled: 'products' };
  }
  if (data === 'menu:api') {
    await send(token, chat.chatId, productsMessage(products, 0, 'api', language));
    return { ok: true, handled: 'api_products' };
  }
  if (data.startsWith('products:')) {
    await send(
      token,
      chat.chatId,
      productsMessage(products, Number(data.slice(9)) || 0, 'all', language),
    );
    return { ok: true, handled: 'products_page' };
  }
  if (data.startsWith('category:')) {
    const [, category = 'all', page = '0'] = data.split(':');
    await send(
      token,
      chat.chatId,
      productsMessage(products, Number(page) || 0, category, language),
    );
    return { ok: true, handled: 'category' };
  }
  if (data === 'api:request' || data === 'api:details') {
    await send(token, chat.chatId, productsMessage(products, 0, 'api', language));
    return { ok: true, handled: 'api_products' };
  }
  if (data.startsWith('product:')) {
    const product = productForRef(products, data.slice(8));
    await send(
      token,
      chat.chatId,
      product
        ? productMessage(product, language)
        : {
            text: 'That product is no longer available. Please open Products again.',
          },
    );
    return { ok: true, handled: 'product' };
  }
  if (data.startsWith('buy:')) {
    const product = productForRef(products, data.slice(4));
    if (!product) {
      await send(token, chat.chatId, {
        text: 'That product is no longer available. Please open Products again.',
      });
      return { ok: true, handled: 'stale_product' };
    }
    if (product.requires_customer_email) {
      await context.setSession(chat.chatId, {
        ...session,
        state: 'awaiting_email',
        productRef: productRef(product.id),
      });
      await send(token, chat.chatId, {
        text: `📧 ${product.name} requires a customer email for supplier delivery.\n\nSend the email address you want the supplier to use.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '← Back to products', callback_data: 'back:products' }],
            [{ text: '🏠 Main menu', callback_data: 'menu:home' }],
          ],
        },
      });
      return { ok: true, handled: 'request_email' };
    }
    const order = await context.createOrder({
      productId: product.id,
      paymentMethod: 'wallet',
      ...chat,
    });
    await send(
      token,
      chat.chatId,
      orderPaymentMessage(order, context.receiver, language),
    );
    return { ok: true, handled: 'create_order', orderId: order.id };
  }
  if (data.startsWith('pay:')) {
    const [, orderId, method] = data.split(':');
    let order;
    try {
      order = await context.setPaymentMethod({
        orderId,
        chatId: chat.chatId,
        method: method === 'binance'
          ? 'binance'
          : method === 'crypto'
            ? 'crypto'
          : method === 'bank'
            ? 'bank'
            : 'wallet',
      });
    } catch (error) {
      await send(token, chat.chatId, {
        text: String(error?.message || 'That payment method is not available for this order.'),
        reply_markup: {
          inline_keyboard: [
            [{ text: '← Back to order', callback_data: `order:${orderId}` }],
            [{ text: '🏠 Main menu', callback_data: 'menu:home' }],
          ],
        },
      });
      return { ok: true, handled: 'payment_method_rejected' };
    }
    if (!order) {
      await send(token, chat.chatId, {
        text: 'Order not found or it is not linked to this Telegram account.',
      });
      return { ok: true, handled: 'missing_order' };
    }
    await send(
      token,
      chat.chatId,
        paymentMethodMessage(
        order,
        context.receiver,
        method === 'crypto'
          ? 'crypto'
          : method === 'binance'
            ? 'binance'
          : method === 'bank'
            ? 'bank'
            : 'wallet',
        language,
      ),
    );
    return { ok: true, handled: 'payment_method' };
  }
  if (data.startsWith('order:')) {
    const order = await context.getOrder({
      orderId: data.slice(6),
      chatId: chat.chatId,
    });
    await send(
      token,
      chat.chatId,
      order
        ? orderPaymentMessage(order, context.receiver, language)
        : {
            text: 'Order not found or it is not linked to this Telegram account.',
            reply_markup: {
              inline_keyboard: [
                [{ text: botCopy(language).buy, callback_data: 'menu:products' }],
                [{ text: botCopy(language).main, callback_data: 'menu:home' }],
              ],
            },
          },
    );
    return { ok: true, handled: order ? 'order_payment' : 'missing_order' };
  }
  if (data.startsWith('paid:')) {
    const orderId = data.slice(5);
    const order = await context.claimOrder({ orderId, chatId: chat.chatId });
    await send(token, chat.chatId, {
      text: `✅ Payment marked as submitted for order ${String(order.id).slice(0, 8)}.\n\nThe signed receipt will be matched automatically. Credentials will be sent here only after verification.`,
      reply_markup: {
        inline_keyboard: [
          [{ text: botCopy(language).checkStatus, callback_data: `status:${order.id}` }],
          [{ text: botCopy(language).main, callback_data: 'menu:home' }],
        ],
      },
    });
    return { ok: true, handled: 'payment_claimed', orderId };
  }
  if (data.startsWith('status:')) {
    const order = await context.getOrder({
      orderId: data.slice(7),
      chatId: chat.chatId,
    });
    const statusKeyboard = order
      ? [
          [{ text: '← Back to order', callback_data: `order:${order.id}` }],
          [{ text: botCopy(language).history, callback_data: 'menu:history' }],
          [{ text: botCopy(language).buy, callback_data: 'menu:products' }],
          [{ text: botCopy(language).main, callback_data: 'menu:home' }],
        ]
      : [
          [{ text: botCopy(language).buy, callback_data: 'menu:products' }],
          [{ text: botCopy(language).main, callback_data: 'menu:home' }],
        ];
    await send(token, chat.chatId, {
      text: order
        ? `📦 Order ${String(order.id).slice(0, 8)}\n\nProduct: ${order.productName}\nAmount: ${money(order.amount)}\nStatus: ${order.statusLabel}\n${order.statusDetail}`
        : 'Order not found or it is not linked to this Telegram account.',
      reply_markup: {
        inline_keyboard: statusKeyboard,
      },
    });
    return { ok: true, handled: 'status' };
  }
  if (data === 'menu:history') {
    const orders = await context.listOrders(chat.chatId);
    const text = orders.length
      ? `🧾 Purchase history\n\n${orders.map((order) => `• ${String(order.id).slice(0, 8)} — ${compactName(order.productName, 32)} — ${order.statusLabel}`).join('\n')}`
      : '🧾 Purchase history\n\nNo purchases are linked to this Telegram account yet.';
    await send(token, chat.chatId, {
      text,
      reply_markup: {
        inline_keyboard: [
          [{ text: botCopy(language).buy, callback_data: 'menu:products' }],
          [{ text: botCopy(language).main, callback_data: 'menu:home' }],
        ],
      },
    });
    return { ok: true, handled: 'history' };
  }
  if (data === 'menu:profile') {
    await send(token, chat.chatId, {
      text: `👤 Profile\n\nTelegram ID: ${chat.userId}\nName: ${chat.firstName || 'Not provided'}${chat.username ? `\nUsername: @${chat.username}` : ''}\n\nOrders are securely linked to this private Telegram chat.`,
      reply_markup: {
        inline_keyboard: [[{ text: botCopy(language).main, callback_data: 'menu:home' }]],
      },
    });
    return { ok: true, handled: 'profile' };
  }
  if (data.startsWith('menu:')) {
    const menu = menuText(data.slice(5), language);
    await send(token, chat.chatId, menu || sasifyBotMenu(products, language));
    return { ok: true, handled: data.slice(5) };
  }
  await send(token, chat.chatId, sasifyBotMenu(products, language));
  return { ok: true, handled: 'fallback' };
}

export function formatTelegramDelivery({
  productName,
  credentials,
  delivery,
  instructions = '',
}) {
  const lines = [
    '✅ Payment verified — your delivery is ready.',
    '',
    `Product: ${productName || 'Digital product'}`,
  ];
  if (credentials && typeof credentials === 'object') {
    const labels = {
      email: 'Email',
      username: 'Username',
      password: 'Password',
      twoFactor: '2FA Key',
      key: 'Key',
    };
    for (const [field, value] of Object.entries(credentials)) {
      if (value == null || value === '' || field === 'notes') continue;
      lines.push(`${labels[field] || field}: ${String(value)}`);
    }
  }
  if (delivery?.content)
    lines.push('', 'Delivery:', String(delivery.content).slice(0, 4000));
  const guide = instructions || delivery?.instructions;
  if (guide) lines.push('', 'Instructions:', String(guide).slice(0, 4000));
  lines.push(
    '',
    'Keep this message private. Contact support with your order reference if you need help.',
  );
  return lines.join('\n');
}
