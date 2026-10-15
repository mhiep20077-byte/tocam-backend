/**
 * ============================================================
 * 🍊 TỔ CAM - PAYMENT BACKEND SERVER
 * Nhận webhook từ Casso.vn, xác nhận thanh toán tự động.
 * Tích hợp API Locket: check UID, tạo/gia hạn UID, tải profile.
 * Deploy lên Railway: https://railway.app (miễn phí)
 * ============================================================
 */

// Load .env khi chạy local (Railway tự inject env, dotenv không làm gì thêm)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Chống cache tĩnh trên trình duyệt điện thoại để luôn cập nhật giao diện mới nhất
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});
app.use(express.static(path.join(__dirname, '..'), { etag: false, maxAge: 0 }));

// Middleware xử lý lỗi parse body nếu client gửi format đặc biệt
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[BODY PARSER ERROR]', err.message);
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next();
});

// =============================================
// CẤU HÌNH - Chỉnh theo thông tin của bạn
// =============================================
const CONFIG = {
  PORT: process.env.PORT || 3000,

  // Lấy từ Casso Dashboard > Webhook > Secret Key
  CASSO_SECRET: process.env.CASSO_SECRET || 'YOUR_CASSO_SECRET_KEY',

  // API Key từ SePay (Tùy chọn xác thực bảo mật)
  SEPAY_API_KEY: process.env.SEPAY_API_KEY || '',

  // Thông tin ngân hàng VPBank (Khớp 100% với js/config.js)
  ACCOUNT_NUMBER: process.env.ACCOUNT_NUMBER || '643391953',

  // Giá các gói (đơn vị: VNĐ)
  PLAN_PRICES: {
    TEST: 9000,
    MONTH6: 39000,
    '6MONTH': 39000,
    YEARLY: 69000,
    LIFETIME: 99000
  },

  // Mã gói tương ứng trên hệ thống Locket API (Cụ Cam)
  // LKGT3D: Gói Test (1 coin) - Tương ứng gói 9.000đ
  // LKG6M: Gói 6 Tháng (8 coin) - Tương ứng gói 39.000đ
  // LKG1Y: Gói 1 Năm (15 coin) - Tương ứng gói 69.000đ
  // LKGVV: Gói Vĩnh Viễn (31 coin) - Tương ứng gói 99.000đ
  LOCKET_PACKAGE_CODES: {
    TEST: process.env.LOCKET_PACKAGE_TEST || 'LKGT3D',
    MONTH6: process.env.LOCKET_PACKAGE_6MONTH || process.env.LOCKET_PACKAGE_MONTH6 || 'LKG6M',
    '6MONTH': process.env.LOCKET_PACKAGE_6MONTH || process.env.LOCKET_PACKAGE_MONTH6 || 'LKG6M',
    YEARLY: process.env.LOCKET_PACKAGE_YEARLY || 'LKG1Y',
    LIFETIME: process.env.LOCKET_PACKAGE_LIFETIME || 'LKGVV'
  },

  // Từ khóa trong nội dung chuyển khoản
  MEMO_PREFIX: 'TOCAM',

  // ─── LOCKET API ───────────────────────────────────────────
  // Secret key CTV từ dashboard locket.2707226.xyz (Mã API > Secret Token)
  // Đặt vào biến môi trường LOCKET_SECRET_KEY, KHÔNG hardcode!
  LOCKET_SECRET_KEY: process.env.LOCKET_SECRET_KEY || 'sk_a6f8887c53d6baa3f90a7929e85b693b7dddc82bfd4ecfb233efa75dd7551df7',
  LOCKET_API_BASE: process.env.LOCKET_API_BASE || 'https://locket.2707226.xyz',
};

// =============================================
// LƯU TRẠNG THÁI THANH TOÁN (In-memory)
// Key: username (viết thường)
// Value: { paid, plan, amount, txId, paidAt, username, locketStatus, uid, expiresAt }
// =============================================
const paymentStore = new Map();

// =============================================
// LƯU TRỮ LỊCH SỬ GIAO DỊCH VÀO FILE (PERSISTENT STORE)
// Tự động lưu và giữ lại mọi giao dịch thành công cho người tiếp theo
// =============================================
const TX_FILE = path.join(__dirname, 'transactions.json');
const USERS_FILE = path.join(__dirname, 'users.json');

const KNOWN_AVATARS = {
  'ney_ihnn': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FTmSHu7R3CnYENbOk4roifJlWdD12%2Fpublic%2Fprofile_pic.webp?alt=media&token=19a21efb-5e7c-4c62-9a51-c8a24d1f25cd',
  'kienviet': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2Ft9iNECEtx2dJE9n36VvYb9xoMxy2%2Fpublic%2Fprofile_pic.webp?alt=media&token=dd907711-a017-4c82-8069-21154ec58e21',
  'hna.gnoud_l': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FPnqkZk51svW7NPzpCnSLy0nCAoz2%2Fpublic%2Fprofile_pic.webp?alt=media&token=e7d7986f-5b13-4c06-99fb-2b716dcb4750',
  'xtien287': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F2s6uO8UpjmhKvHLlbjUsYrFaXqu1%2Fpublic%2Fprofile_pic.webp?alt=media&token=d7da47c5-a379-46f9-8c22-ffc0874a4f6b',
  'nth05': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2Fzs4QAybLYGeCojbRg7ZYNeS1g9b2%2Fpublic%2Fprofile_pic.webp?alt=media&token=5ffdaa57-d5ac-4e06-8f7d-974a45d4aea8',
  'gnlg': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FyuHUd1EGnVd6uBMlVfBnP9tvvv53%2Fpublic%2Fprofile_pic.webp?alt=media&token=acf18496-9650-41c3-bfca-0428839cc525',
  'dwyhiu_23': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FcsOqOngrMXNauFZonP5lozhJDpG3%2Fpublic%2Fprofile_pic.webp?alt=media&token=733ef88f-11bf-4956-940d-7181a3aa7fd0',
  'ljaj': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FqJ76CYeThgaDnQYipUGPsC5XeVt2%2Fpublic%2Fprofile_pic.webp?alt=media&token=3cad0f80-e88b-4ca3-89fd-7438957207e8',
  'daothanh': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F5p59vkOpQxWV8w1hItgiJh27Fyo1%2Fpublic%2Fprofile_pic.webp?alt=media&token=b31ebe79-f5ff-4a8f-b7b3-2451d905ca39',
  'yn.nt': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FGrYho8R7FDPeEmQgy5aKMEYx9gl2%2Fpublic%2Fprofile_pic.webp?alt=media&token=4f447328-95e6-46fc-b19c-97dedd3c70ce',
  'trunhmoi': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2Feg66l51dTvhc7zREzqTVVKIvABh2%2Fpublic%2Fprofile_pic.webp?alt=media&token=a09e7abc-0bb3-4e86-8167-7781e644d256',
  'hi_embe': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FzKit3JlPVhdXK3ppE2PDRflNjP32%2Fpublic%2Fprofile_pic.webp?alt=media&token=477e2d02-3e84-48c6-a4bb-a78548ccf589',
  'hieon0': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FVt6ceg2WlBcOGDrWMlMnPOJQuc93%2Fpublic%2Fprofile_pic.webp?alt=media&token=9268ad0d-9843-436e-bf34-d2e5aa19cfd9',
  'mhhiep': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F2c7dlQuxUQULKnrwGPcqsqLW0sK2%2Fpublic%2Fprofile_pic.webp?alt=media&token=c3fc74fd-8200-4123-af8e-f7ff1934fa8c',
  'nguyendinhtuan00': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F2kIObn7acAfhBLuovv4xeg5EChE3%2Fpublic%2Fprofile_pic.webp?alt=media&token=57ad3ef0-3423-42a7-8fd6-9ff6ed1ff3a3'
};

// Chuẩn hoá username bỏ ký tự đặc biệt để so khớp với ngân hàng
function normalizeUsername(str) {
  return (str || '').toLowerCase().trim().replace('@', '').replace(/[^a-z0-9]/gi, '');
}

// Ánh xạ bí danh ngân hàng (khi app ngân hàng tự bỏ ký tự hoặc khách gõ link)
const KNOWN_CANONICAL_ALIASES = {
  'neyihnn': 'ney_ihnn',
  'hnagnoudl': 'hna.gnoud_l',
  'ynnt': 'yn.nt',
  'dwyhiu23': 'dwyhiu_23',
  'hiembe': 'hi_embe',
  'httpslocketcamkienviet': 'kienviet',
  'locketcamkienviet': 'kienviet'
};

// Map lưu người dùng đang ở bước 2 chờ thanh toán
const pendingUsersMap = new Map(); // cleanNorm -> { username, timestamp }

// Chuẩn hóa locket username (hỗ trợ cả dán link profile https://locket.cam/username hoặc alias ngân hàng httpslocketcam...)
function cleanLocketUsername(str) {
  if (!str) return '';
  let u = String(str).toLowerCase().trim().replace('@', '');
  if (u.includes('locket.cam/')) {
    u = u.split('locket.cam/')[1].split(/[/?#]/)[0];
  } else if (u.includes('locketcam')) {
    u = u.replace(/.*locketcam/, '');
  }
  // Loại bỏ hậu tố do ngân hàng (Vietcombank/Napas) tự động nối thêm vào đuôi: .CT, .IBFT, CT TU...
  u = u.replace(/[\._\s-]*(ct|ibft|chuyentien).*$/i, '');
  u = u.trim();
  return KNOWN_CANONICAL_ALIASES[u] || u;
}

// Phân giải ngược username chuẩn xác từ ngân hàng (kể cả khi ngân hàng tự ý bỏ dấu _, . hoặc thêm .CT)
function resolveCanonicalUsername(rawUser) {
  if (!rawUser) return '';
  const cleaned = cleanLocketUsername(rawUser);
  const norm = normalizeUsername(cleaned);
  const rawNorm = normalizeUsername(rawUser);

  // Helper kiểm tra pendingUsersMap
  const checkPending = (key) => {
    if (!key) return null;
    if (pendingUsersMap.has(key)) {
      const p = pendingUsersMap.get(key);
      if (p && (Date.now() - p.timestamp < 60 * 60 * 1000)) return p.username;
    }
    return null;
  };

  let found = checkPending(norm) || checkPending(rawNorm);
  if (found) return found;

  // Thử bỏ hậu tố ct/ibft nếu ngân hàng tự ghép dính liền
  const strippedNorm = norm.replace(/(ct|ibft|chuyentien)$/i, '');
  if (strippedNorm && strippedNorm !== norm) {
    found = checkPending(strippedNorm);
    if (found) return found;
  }

  // 2. Tra cứu bí danh chuẩn hóa đã biết
  if (KNOWN_CANONICAL_ALIASES[norm]) return KNOWN_CANONICAL_ALIASES[norm];
  if (KNOWN_CANONICAL_ALIASES[cleaned]) return KNOWN_CANONICAL_ALIASES[cleaned];
  if (strippedNorm && KNOWN_CANONICAL_ALIASES[strippedNorm]) return KNOWN_CANONICAL_ALIASES[strippedNorm];

  // 3. Tra cứu trong users.json nếu có username chứa ký tự đặc biệt (_ hoặc .) khớp norm
  try {
    const users = loadUsers();
    if (users[cleaned]) return users[cleaned].username || cleaned;
    if (strippedNorm && users[strippedNorm]) return users[strippedNorm].username || strippedNorm;
    for (const [k, v] of Object.entries(users)) {
      const kNorm = normalizeUsername(k);
      if (kNorm === norm || (strippedNorm && kNorm === strippedNorm)) {
        return v.username || k;
      }
    }
  } catch (e) {}

  return cleaned;
}

function isValidLocketUsername(str) {
  if (!str || typeof str !== 'string') return false;
  const clean = cleanLocketUsername(str);
  if (!clean) return false;
  return /^[a-zA-Z0-9._-]+$/.test(clean);
}

const DEFAULT_TRANSACTIONS = [
  { username: 'ney_ihnn', plan: 'TEST', amount: 9000, time: "2026-10-14T11:02:00.000Z", txId: "89790277", status: 'success', avatarUrl: KNOWN_AVATARS['ney_ihnn'] },
  { username: 'kienviet', plan: 'TEST', amount: 9000, time: "2026-10-14T10:39:58.000Z", txId: 89862435, status: 'success', avatarUrl: KNOWN_AVATARS['kienviet'] },
  { username: 'hna.gnoud_l', plan: 'MONTH6', amount: 39000, time: "2026-10-14T08:46:05.000Z", txId: "cam_PnqkZk51svW7NPzpCnSLy0nCAoz2", status: 'success', avatarUrl: KNOWN_AVATARS['hna.gnoud_l'] },
  { username: 'xtien287', plan: 'LIFETIME', amount: 119000, time: "2026-10-14T06:49:47.000Z", txId: "cam_2s6uO8UpjmhKvHLlbjUsYrFaXqu1", status: 'success', avatarUrl: KNOWN_AVATARS['xtien287'] },
  { username: 'nth05', plan: 'TEST', amount: 9000, time: "2026-10-14T02:02:39.000Z", txId: "cam_zs4QAybLYGeCojbRg7ZYNeS1g9b2", status: 'success', avatarUrl: KNOWN_AVATARS['nth05'] },
  { username: 'gnlg', plan: 'TEST', amount: 9000, time: "2026-10-14T00:24:34.000Z", txId: "cam_yuHUd1EGnVd6uBMlVfBnP9tvvv53", status: 'success', avatarUrl: KNOWN_AVATARS['gnlg'] },
  { username: 'dwyhiu_23', plan: 'TEST', amount: 9000, time: "2026-10-13T23:42:48.000Z", txId: "cam_csOqOngrMXNauFZonP5lozhJDpG3", status: 'success', avatarUrl: KNOWN_AVATARS['dwyhiu_23'] },
  { username: 'ljaj', plan: 'YEARLY', amount: 69000, time: "2026-10-13T20:30:21.000Z", txId: "cam_qJ76CYeThgaDnQYipUGPsC5XeVt2", status: 'success', avatarUrl: KNOWN_AVATARS['ljaj'] },
  { username: 'mhhieuz', plan: 'LIFETIME', amount: 119000, time: "2026-10-13T13:55:35.000Z", txId: "cam_FuOKHoW1rxUvuGYB0bZ7xl3WckU2", status: 'success', avatarUrl: "https://ui-avatars.com/api/?name=mhhieuz&background=FFA033&color=fff&size=128&bold=true" },
  { username: 'daothanh', plan: 'YEARLY', amount: 69000, time: "2026-10-12T13:57:26.000Z", txId: "cam_5p59vkOpQxWV8w1hItgiJh27Fyo1", status: 'success', avatarUrl: KNOWN_AVATARS['daothanh'] },
  { username: 'yn.nt', plan: 'YEARLY', amount: 69000, time: "2026-10-12T13:46:00.000Z", txId: "cam_GrYho8R7FDPeEmQgy5aKMEYx9gl2", status: 'success', avatarUrl: KNOWN_AVATARS['yn.nt'] },
  { username: 'trunhmoi', plan: 'YEARLY', amount: 69000, time: "2026-10-12T13:16:02.000Z", txId: "cam_eg66l51dTvhc7zREzqTVVKIvABh2", status: 'success', avatarUrl: KNOWN_AVATARS['trunhmoi'] },
  { username: 'hi_embe', plan: 'MONTH6', amount: 39000, time: "2026-10-12T12:36:07.000Z", txId: "cam_zKit3JlPVhdXK3ppE2PDRflNjP32", status: 'success', avatarUrl: KNOWN_AVATARS['hi_embe'] },
  { username: 'hieon0', plan: 'YEARLY', amount: 69000, time: "2026-10-12T11:37:18.000Z", txId: "cam_Vt6ceg2WlBcOGDrWMlMnPOJQuc93", status: 'success', avatarUrl: KNOWN_AVATARS['hieon0'] },
  { username: 'mhhiep', plan: 'YEARLY', amount: 69000, time: "2026-10-12T10:53:46.000Z", txId: "cam_2c7dlQuxUQULKnrwGPcqsqLW0sK2", status: 'success', avatarUrl: KNOWN_AVATARS['mhhiep'] }
];

function loadSavedTransactions() {
  let list = [];
  try {
    if (fs.existsSync(TX_FILE)) {
      const content = fs.readFileSync(TX_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
    }
  } catch (e) {
    console.error('[TX_STORE] Lỗi đọc file transactions.json:', e.message);
  }

  if (list.length === 0) {
    list = [...DEFAULT_TRANSACTIONS];
    try {
      fs.writeFileSync(TX_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {}
  }

  // Luôn nạp avatar thật từ users.json hoặc KNOWN_AVATARS cho mọi giao dịch và lọc trùng lặp
  const users = loadUsers();
  const normMap = new Map();

  list.forEach(tx => {
    if (!tx || !tx.username) return;
    const rawU = String(tx.username).toLowerCase().trim().replace('@', '');
    const normKey = rawU.replace(/[^a-z0-9]/gi, '');
    if (!normKey || normKey.includes('testdemo') || normKey === 'testuser') return;

    const uObj = users[rawU] || users[normKey];
    const realAvatar = (uObj && uObj.avatarUrl && uObj.avatarUrl.includes('locketcamera.com'))
      ? uObj.avatarUrl
      : ((tx.avatarUrl && tx.avatarUrl.includes('locketcamera.com')) ? tx.avatarUrl : (KNOWN_AVATARS[rawU] || tx.avatarUrl || null));

    const item = {
      ...tx,
      username: (rawU.includes('.') || rawU.includes('_')) ? rawU : (normMap.get(normKey)?.username || rawU),
      avatarUrl: realAvatar
    };

    if (!normMap.has(normKey)) {
      normMap.set(normKey, item);
    } else {
      const prev = normMap.get(normKey);
      // Ưu tiên username có dấu . hoặc _
      const betterUser = (rawU.includes('.') || rawU.includes('_')) ? rawU : prev.username;
      // Ưu tiên avatar thật từ Locket
      const betterAvatar = (realAvatar && realAvatar.includes('locketcamera.com')) ? realAvatar : prev.avatarUrl;
      // Ưu tiên txId của ngân hàng (không bắt đầu bằng tx_)
      const betterTxId = (tx.txId && !String(tx.txId).startsWith('tx_')) ? tx.txId : prev.txId;
      normMap.set(normKey, {
        ...prev,
        ...item,
        username: betterUser,
        avatarUrl: betterAvatar,
        txId: betterTxId
      });
    }
  });

  return Array.from(normMap.values()).sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

function saveTransactionToHistory(txItem) {
  try {
    const list = loadSavedTransactions();
    const cleanUser = (txItem.username || '').toLowerCase().trim().replace('@', '');
    const normUser = cleanUser.replace(/[^a-z0-9]/gi, '');
    if (!normUser || normUser.includes('testdemo') || normUser === 'testuser') return list;

    // Tìm xem đã có giao dịch của user này chưa (trùng txId hoặc cùng normUser)
    const existingIndex = list.findIndex(item => {
      if (txItem.txId && item.txId && String(item.txId) === String(txItem.txId)) return true;
      const itemNorm = (item.username || '').toLowerCase().trim().replace('@', '').replace(/[^a-z0-9]/gi, '');
      return itemNorm === normUser;
    });

    const avatar = txItem.avatarUrl || KNOWN_AVATARS[cleanUser] || null;
    const newItem = {
      username: cleanUser,
      plan: txItem.plan || 'LIFETIME',
      amount: Number(txItem.amount) || 99000,
      time: txItem.time || new Date().toISOString(),
      txId: txItem.txId || `tx_${Date.now()}`,
      status: 'success',
      avatarUrl: avatar
    };

    if (existingIndex !== -1) {
      // Đã có bản ghi của user này -> Cập nhật thông tin tốt hơn, tuyệt đối không tạo dòng thứ 2
      const existing = list[existingIndex];
      const preferredUser = (cleanUser.includes('.') || cleanUser.includes('_')) ? cleanUser : existing.username;
      const preferredAvatar = (avatar && avatar.includes('locketcamera.com')) ? avatar : existing.avatarUrl;
      const preferredTxId = (txItem.txId && !String(txItem.txId).startsWith('tx_')) ? txItem.txId : existing.txId;
      list[existingIndex] = {
        ...existing,
        username: preferredUser,
        plan: newItem.plan || existing.plan,
        amount: newItem.amount || existing.amount,
        avatarUrl: preferredAvatar,
        txId: preferredTxId
      };
      fs.writeFileSync(TX_FILE, JSON.stringify(list, null, 2), 'utf-8');
      console.log(`[TX_STORE] 🔄 Đã cập nhật & tránh trùng lặp giao dịch của @${preferredUser}`);
    } else {
      list.unshift(newItem);
      if (list.length > 100) list.pop();
      fs.writeFileSync(TX_FILE, JSON.stringify(list, null, 2), 'utf-8');
      console.log(`[TX_STORE] ✅ Đã lưu giao dịch mới của @${cleanUser} vào file transactions.json!`);
    }
    return list;
  } catch (e) {
    console.error('[TX_STORE] Lỗi ghi transactions.json:', e.message);
    return [];
  }
}

// =============================================
// QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG & LỊCH SỬ MUA (users.json)
// Tự động liên kết danh sách khách hàng từ Cụ Cam (Locket Gold)
// =============================================
const DEFAULT_USERS = {
  "ney_ihnn": {
    "username": "ney_ihnn",
    "uid": "TmSHu7R3CnYENbOk4roifJlWdD12",
    "currentPlan": "TEST",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FTmSHu7R3CnYENbOk4roifJlWdD12%2Fpublic%2Fprofile_pic.webp?alt=media&token=19a21efb-5e7c-4c62-9a51-c8a24d1f25cd",
    "expiresAt": "2026-10-15T11:02:00.197Z",
    "createdAt": "2026-10-14T05:43:00.000Z",
    "lastRenewedAt": "2026-10-14T11:02:00.000Z",
    "history": [{ "txId": "89790277", "plan": "TEST", "amount": 9000, "time": "2026-10-14T11:02:00.000Z", "status": "success" }]
  },
  "kienviet": {
    "username": "kienviet",
    "uid": "t9iNECEtx2dJE9n36VvYb9xoMxy2",
    "currentPlan": "TEST",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2Ft9iNECEtx2dJE9n36VvYb9xoMxy2%2Fpublic%2Fprofile_pic.webp?alt=media&token=dd907711-a017-4c82-8069-21154ec58e21",
    "expiresAt": "2026-10-15T10:39:58.472Z",
    "createdAt": "2026-10-14T10:33:00.000Z",
    "lastRenewedAt": "2026-10-14T10:39:58.000Z",
    "history": [{ "txId": 89862435, "plan": "TEST", "amount": 9000, "time": "2026-10-14T10:33:00.000Z", "status": "success" }]
  },
  "hna.gnoud_l": {
    "username": "hna.gnoud_l",
    "uid": "PnqkZk51svW7NPzpCnSLy0nCAoz2",
    "currentPlan": "MONTH6",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FPnqkZk51svW7NPzpCnSLy0nCAoz2%2Fpublic%2Fprofile_pic.webp?alt=media&token=e7d7986f-5b13-4c06-99fb-2b716dcb4750",
    "expiresAt": "2027-04-12T08:46:05.824Z",
    "createdAt": "2026-10-14T08:46:05.000Z",
    "lastRenewedAt": "2026-10-14T08:46:05.000Z",
    "history": [{ "txId": "cam_PnqkZk51svW7NPzpCnSLy0nCAoz2", "plan": "MONTH6", "amount": 39000, "time": "2026-10-14T08:46:05.000Z", "status": "success" }]
  },
  "xtien287": {
    "username": "xtien287",
    "uid": "2s6uO8UpjmhKvHLlbjUsYrFaXqu1",
    "currentPlan": "LIFETIME",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F2s6uO8UpjmhKvHLlbjUsYrFaXqu1%2Fpublic%2Fprofile_pic.webp?alt=media&token=d7da47c5-a379-46f9-8c22-ffc0874a4f6b",
    "expiresAt": "Vĩnh Viễn",
    "createdAt": "2026-10-14T06:49:47.000Z",
    "lastRenewedAt": "2026-10-14T06:49:47.000Z",
    "history": [{ "txId": "cam_2s6uO8UpjmhKvHLlbjUsYrFaXqu1", "plan": "LIFETIME", "amount": 119000, "time": "2026-10-14T06:49:47.000Z", "status": "success" }]
  },
  "nth05": {
    "username": "nth05",
    "uid": "zs4QAybLYGeCojbRg7ZYNeS1g9b2",
    "currentPlan": "TEST",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2Fzs4QAybLYGeCojbRg7ZYNeS1g9b2%2Fpublic%2Fprofile_pic.webp?alt=media&token=5ffdaa57-d5ac-4e06-8f7d-974a45d4aea8",
    "expiresAt": "2026-10-15T02:02:39.000Z",
    "createdAt": "2026-10-14T02:02:39.000Z",
    "lastRenewedAt": "2026-10-14T02:02:39.000Z",
    "history": [{ "txId": "cam_zs4QAybLYGeCojbRg7ZYNeS1g9b2", "plan": "TEST", "amount": 9000, "time": "2026-10-14T02:02:39.000Z", "status": "success" }]
  },
  "gnlg": {
    "username": "gnlg",
    "uid": "yuHUd1EGnVd6uBMlVfBnP9tvvv53",
    "currentPlan": "TEST",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FyuHUd1EGnVd6uBMlVfBnP9tvvv53%2Fpublic%2Fprofile_pic.webp?alt=media&token=acf18496-9650-41c3-bfca-0428839cc525",
    "expiresAt": "2026-10-15T00:24:34.000Z",
    "createdAt": "2026-10-14T00:24:34.000Z",
    "lastRenewedAt": "2026-10-14T00:24:34.000Z",
    "history": [{ "txId": "cam_yuHUd1EGnVd6uBMlVfBnP9tvvv53", "plan": "TEST", "amount": 9000, "time": "2026-10-14T00:24:34.000Z", "status": "success" }]
  },
  "dwyhiu_23": {
    "username": "dwyhiu_23",
    "uid": "csOqOngrMXNauFZonP5lozhJDpG3",
    "currentPlan": "TEST",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FcsOqOngrMXNauFZonP5lozhJDpG3%2Fpublic%2Fprofile_pic.webp?alt=media&token=733ef88f-11bf-4956-940d-7181a3aa7fd0",
    "expiresAt": "2026-10-14T23:42:48.000Z",
    "createdAt": "2026-10-13T23:42:48.000Z",
    "lastRenewedAt": "2026-10-13T23:42:48.000Z",
    "history": [{ "txId": "cam_csOqOngrMXNauFZonP5lozhJDpG3", "plan": "TEST", "amount": 9000, "time": "2026-10-13T23:42:48.000Z", "status": "success" }]
  },
  "nguyendinhtuan00": {
    "username": "nguyendinhtuan00",
    "uid": "2kIObn7acAfhBLuovv4xeg5EChE3",
    "currentPlan": "TEST",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F2kIObn7acAfhBLuovv4xeg5EChE3%2Fpublic%2Fprofile_pic.webp?alt=media&token=57ad3ef0-3423-42a7-8fd6-9ff6ed1ff3a3",
    "expiresAt": "2026-10-13T17:48:24.751Z",
    "createdAt": "2026-10-12T17:48:24.000Z",
    "lastRenewedAt": "2026-10-12T17:48:24.000Z",
    "history": [{ "txId": "cam_2kIObn7acAfhBLuovv4xeg5EChE3", "plan": "TEST", "amount": 5000, "time": "2026-10-12T17:48:24.000Z", "status": "success" }]
  },
  "ljaj": {
    "username": "ljaj",
    "uid": "qJ76CYeThgaDnQYipUGPsC5XeVt2",
    "currentPlan": "YEARLY",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FqJ76CYeThgaDnQYipUGPsC5XeVt2%2Fpublic%2Fprofile_pic.webp?alt=media&token=3cad0f80-e88b-4ca3-89fd-7438957207e8",
    "expiresAt": "2027-10-12T20:30:21.000Z",
    "createdAt": "2026-10-12T13:30:21.000Z",
    "lastRenewedAt": "2026-10-12T13:30:21.000Z",
    "history": [{ "txId": "cam_qJ76CYeThgaDnQYipUGPsC5XeVt2", "plan": "YEARLY", "amount": 69000, "time": "2026-10-12T13:30:21.000Z", "status": "success" }]
  },
  "mhhieuz": {
    "username": "mhhieuz",
    "uid": "FuOKHoW1rxUvuGYB0bZ7x13WckU2",
    "currentPlan": "LIFETIME",
    "status": "ACTIVE",
    "avatarUrl": "https://ui-avatars.com/api/?name=mhhieuz&background=FFA033&color=fff&size=128&bold=true",
    "expiresAt": "Vĩnh Viễn",
    "createdAt": "2026-07-27T13:55:35.000Z",
    "lastRenewedAt": "2026-10-12T01:25:03.000Z",
    "history": [{ "txId": "cam_FuOKHoW1rxUvuGYB0bZ7x13WckU2", "plan": "LIFETIME", "amount": 119000, "time": "2026-10-12T01:25:03.000Z", "status": "success" }]
  },
  "daothanh": {
    "username": "daothanh",
    "uid": "5p59vkOpQxWV8w1hItgiJh27Fyo1",
    "currentPlan": "YEARLY",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F5p59vkOpQxWV8w1hItgiJh27Fyo1%2Fpublic%2Fprofile_pic.webp?alt=media&token=b31ebe79-f5ff-4a8f-b7b3-2451d905ca39",
    "expiresAt": "2027-10-11T01:07:58.000Z",
    "createdAt": "2026-10-11T18:07:58.000Z",
    "lastRenewedAt": "2026-10-12T12:57:26.000Z",
    "history": [{ "txId": "cam_5p59vkOpQxWV8w1hItgiJh27Fyo1", "plan": "YEARLY", "amount": 69000, "time": "2026-10-12T12:57:26.000Z", "status": "success" }]
  },
  "yn.nt": {
    "username": "yn.nt",
    "uid": "GrYho8R7FDPeEmQgy5aKMEYx9gl2",
    "currentPlan": "YEARLY",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FGrYho8R7FDPeEmQgy5aKMEYx9gl2%2Fpublic%2Fprofile_pic.webp?alt=media&token=4f447328-95e6-46fc-b19c-97dedd3c70ce",
    "expiresAt": "2027-10-11T00:42:32.000Z",
    "createdAt": "2026-10-11T17:42:32.000Z",
    "lastRenewedAt": "2026-10-12T09:46:00.000Z",
    "history": [{ "txId": "cam_GrYho8R7FDPeEmQgy5aKMEYx9gl2", "plan": "YEARLY", "amount": 69000, "time": "2026-10-12T09:46:00.000Z", "status": "success" }]
  },
  "trunhmoi": {
    "username": "trunhmoi",
    "uid": "eg66151dTvhc7zREzqTWVKiVABh2",
    "currentPlan": "YEARLY",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2Feg66l51dTvhc7zREzqTVVKIvABh2%2Fpublic%2Fprofile_pic.webp?alt=media&token=a09e7abc-0bb3-4e86-8167-7781e644d256",
    "expiresAt": "2027-10-11T00:21:16.000Z",
    "createdAt": "2026-10-11T17:21:16.000Z",
    "lastRenewedAt": "2026-10-12T13:16:02.000Z",
    "history": [{ "txId": "cam_eg66151dTvhc7zREzqTWVKiVABh2", "plan": "YEARLY", "amount": 69000, "time": "2026-10-12T13:16:02.000Z", "status": "success" }]
  },
  "mhhuyz": {
    "username": "mhhuyz",
    "uid": "7TULqjjXb0SrWQBbP3EulDIQfE3",
    "currentPlan": "TEST",
    "status": "EXPIRED",
    "avatarUrl": "https://ui-avatars.com/api/?name=mhhuyz&background=EF4444&color=fff&size=128&bold=true",
    "expiresAt": "2026-10-11T21:55:40.000Z",
    "createdAt": "2026-10-10T14:55:40.000Z",
    "lastRenewedAt": "2026-10-10T14:56:31.000Z",
    "history": [{ "txId": "cam_7TULqjjXb0SrWQBbP3EulDIQfE3", "plan": "TEST", "amount": 5000, "time": "2026-10-10T14:56:31.000Z", "status": "success" }]
  },
  "hi_embe": {
    "username": "hi_embe",
    "uid": "zKit3JlPVhdXK3ppE2PDRflNjp32",
    "currentPlan": "YEARLY",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FzKit3JlPVhdXK3ppE2PDRflNjP32%2Fpublic%2Fprofile_pic.webp?alt=media&token=477e2d02-3e84-48c6-a4bb-a78548ccf589",
    "expiresAt": "2027-10-10T12:16:36.000Z",
    "createdAt": "2026-10-10T05:16:36.000Z",
    "lastRenewedAt": "2026-10-12T11:36:07.000Z",
    "history": [{ "txId": "cam_zKit3JlPVhdXK3ppE2PDRflNjp32", "plan": "YEARLY", "amount": 69000, "time": "2026-10-12T11:36:07.000Z", "status": "success" }]
  },
  "hieon0": {
    "username": "hieon0",
    "uid": "Vt6ceg2WlBcOGDrkM1MnPOJQuc93",
    "currentPlan": "YEARLY",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FVt6ceg2WlBcOGDrWMlMnPOJQuc93%2Fpublic%2Fprofile_pic.webp?alt=media&token=9268ad0d-9843-436e-bf34-d2e5aa19cfd9",
    "expiresAt": "2027-10-09T22:26:09.000Z",
    "createdAt": "2026-10-09T15:26:09.000Z",
    "lastRenewedAt": "2026-10-12T13:37:18.000Z",
    "history": [{ "txId": "cam_Vt6ceg2WlBcOGDrkM1MnPOJQuc93", "plan": "YEARLY", "amount": 69000, "time": "2026-10-12T13:37:18.000Z", "status": "success" }]
  },
  "mhhiep": {
    "username": "mhhiep",
    "uid": "2c7d1QuxUQUlKNrwGPcqsqLW0sK2",
    "currentPlan": "YEARLY",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F2c7dlQuxUQULKnrwGPcqsqLW0sK2%2Fpublic%2Fprofile_pic.webp?alt=media&token=3229122d-0f4c-4223-8805-888f8170d36d",
    "expiresAt": "2027-10-09T21:22:25.000Z",
    "createdAt": "2026-10-09T14:22:25.000Z",
    "lastRenewedAt": "2026-10-12T13:53:46.000Z",
    "history": [{ "txId": "cam_2c7d1QuxUQUlKNrwGPcqsqLW0sK2", "plan": "YEARLY", "amount": 69000, "time": "2026-10-12T13:53:46.000Z", "status": "success" }]
  },
  "nguyendinhtuan00": {
    "username": "nguyendinhtuan00",
    "uid": "2kIObn7acAfhBLuovv4xeg5EChE3",
    "currentPlan": "TEST",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F2kIObn7acAfhBLuovv4xeg5EChE3%2Fpublic%2Fprofile_pic.webp?alt=media&token=57ad3ef0-3423-42a7-8fd6-9ff6ed1ff3a3",
    "expiresAt": "2026-10-13T17:48:24.751Z",
    "createdAt": "2026-10-12T17:48:24.000Z",
    "lastRenewedAt": "2026-10-12T17:48:24.000Z",
    "history": [{ "txId": "cam_2kIObn7acAfhBLuovv4xeg5EChE3", "plan": "TEST", "amount": 5000, "time": "2026-10-12T17:48:24.000Z", "status": "success" }]
  }
};

function loadUsers() {
  let users = {};
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) users = parsed;
    }
  } catch (e) {
    console.error('[USERS_STORE] Lỗi đọc users.json:', e.message);
  }

  // Tự động kết hợp danh sách khách hàng Cụ Cam
  let changed = false;
  for (const [k, v] of Object.entries(DEFAULT_USERS)) {
    if (!users[k]) {
      users[k] = v;
      changed = true;
    }
  }
  if (changed) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    } catch (e) {}
  }

  return users;
}

function saveUser(userData) {
  try {
    const users = loadUsers();
    const cleanUser = (userData.username || '').toLowerCase().trim().replace('@', '');
    if (!cleanUser) return null;

    const existing = users[cleanUser] || {
      username: cleanUser,
      createdAt: new Date().toISOString(),
      history: []
    };

    const newHistory = [...(existing.history || [])];
    if (userData.newHistoryItem) {
      const isDupe = newHistory.some(h => 
        (userData.newHistoryItem.txId && h.txId === userData.newHistoryItem.txId) ||
        (h.plan === userData.newHistoryItem.plan && Math.abs(new Date(h.time) - new Date(userData.newHistoryItem.time)) < 60000)
      );
      if (!isDupe) {
        newHistory.unshift(userData.newHistoryItem);
      }
    }

    const updated = {
      ...existing,
      ...userData,
      username: cleanUser,
      updatedAt: new Date().toISOString(),
      history: newHistory.slice(0, 50)
    };
    delete updated.newHistoryItem;

    users[cleanUser] = updated;
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    console.log(`[USERS_STORE] ✅ Đã lưu/cập nhật tài khoản @${cleanUser} trong users.json!`);
    return updated;
  } catch (e) {
    console.error('[USERS_STORE] Lỗi ghi users.json:', e.message);
    return null;
  }
}

// =============================================
// CORS - Cho phép website truy cập
// =============================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// =============================================
// HELPER: Gọi Locket API (dùng https/http native, không cần thêm package)
// =============================================
function locketRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.LOCKET_SECRET_KEY) {
      return reject(new Error('LOCKET_SECRET_KEY chưa được cấu hình trong biến môi trường.'));
    }

    const url = new URL(CONFIG.LOCKET_API_BASE + path);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${CONFIG.LOCKET_SECRET_KEY}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };

    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const rawBuffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';

        // Nếu là file mobileconfig → trả buffer thô
        if (contentType.includes('apple-aspen-config') || contentType.includes('octet-stream')) {
          resolve({ statusCode: res.statusCode, headers: res.headers, buffer: rawBuffer, isFile: true });
        } else {
          try {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(rawBuffer.toString()), isFile: false });
          } catch {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: rawBuffer.toString(), isFile: false });
          }
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// =============================================
// HEALTH CHECK
// =============================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TỔ CAM Payment Backend',
    locketApiConfigured: !!CONFIG.LOCKET_SECRET_KEY,
    time: new Date().toISOString()
  });
});

// =============================================
// WEBHOOK CASSO - Nhận thông báo khi có tiền vào
// URL: https://your-backend.railway.app/webhook/casso
// Cấu hình URL này trong Casso Dashboard > Webhook
// =============================================
app.post('/webhook/casso', async (req, res) => {
  console.log('[WEBHOOK] Nhận dữ liệu từ Casso:', JSON.stringify(req.body, null, 2));

  // Xác thực chữ ký từ Casso (bảo mật)
  const cassoSignature = req.headers['x-api-key'] || req.headers['secure-token'];
  if (CONFIG.CASSO_SECRET !== 'YOUR_CASSO_SECRET_KEY' && cassoSignature !== CONFIG.CASSO_SECRET) {
    console.warn('[WEBHOOK] Chữ ký không hợp lệ, từ chối request!');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Casso gửi mảng các giao dịch
  const transactions = req.body.data || [];

  for (const tx of transactions) {
    await processTransaction(tx);
  }

  res.json({ success: true });
});

// =============================================
// WEBHOOK SEPAY - Nhận thông báo tiền vào từ VPBank
// URL: https://lockettocam.up.railway.app/webhook/sepay
// Cấu hình URL này trong SePay Dashboard > Tích hợp Webhooks
// =============================================
app.post('/webhook/sepay', async (req, res) => {
  console.log('[SEPAY] Nhận dữ liệu webhook:', JSON.stringify(req.body, null, 2));

  // Xác thực API Key nếu có cấu hình (Header: Authorization: Apikey YOUR_API_KEY)
  const authHeader = req.headers['authorization'] || '';
  if (CONFIG.SEPAY_API_KEY) {
    const expectedAuth = `Apikey ${CONFIG.SEPAY_API_KEY}`;
    if (authHeader !== expectedAuth && authHeader !== CONFIG.SEPAY_API_KEY) {
      console.warn('[SEPAY] API Key không hợp lệ!');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const data = req.body || {};
  // SePay gửi transferType = 'in' khi có tiền vào
  const amount = data.transferAmount || data.amount || 0;
  const description = data.content || data.description || '';
  const id = data.id || Date.now();
  const when = data.transactionDate || new Date().toISOString();

  // Chuẩn hóa sang định dạng transaction để xử lý
  await processTransaction({
    amount: Number(amount),
    description: String(description),
    id: id,
    when: when
  });

  // SePay yêu cầu trả về HTTP 200 hoặc 201 với JSON success: true
  res.status(200).json({ success: true });
});

// (normalizeUsername đã được định nghĩa ở đầu server.js)

/**
 * Xử lý từng giao dịch từ Casso.
 * Sau khi xác nhận thanh toán → tự động gọi POST /api/uid/create trên Locket API.
 */
async function processTransaction(tx) {
  const { amount, description, id, when } = tx;

  console.log(`[TX] Giao dịch #${id}: ${amount}đ - "${description}" lúc ${when}`);

  if (!description || !amount) return;

  // Chuẩn hoá nội dung chuyển khoản: viết hoa, xóa khoảng thừa
  const memo = description.toUpperCase().trim();

  // Kiểm tra có chứa từ khóa TOCAM không
  if (!memo.includes(CONFIG.MEMO_PREFIX)) {
    console.log(`[TX] Bỏ qua - không chứa "${CONFIG.MEMO_PREFIX}" trong nội dung`);
    return;
  }

  // Tách username linh hoạt: hỗ trợ cả có dấu chấm/gạch và không dấu ("TOCAM YN.NT", "TOCAM YNNT")
  let rawUser = '';
  // Làm sạch các hậu tố ngân hàng (Vietcombank Napas tự thêm .CT, CT TU..., .IBFT, CHUYEN TIEN...)
  const sanitizedMemo = memo.replace(/[\._\s-]+(CT|IBFT|CHUYEN TIEN|CHUYENTIEN)(\s+TU.*)?$/i, '');
  const match = sanitizedMemo.match(/TOCAM\s*([A-Za-z0-9_.-]+)/i) || memo.match(/TOCAM\s*([A-Za-z0-9_.-]+)/i);
  if (match && match[1]) {
    rawUser = match[1];
  } else {
    const parts = sanitizedMemo.split(/\s+/);
    const tocamIdx = parts.indexOf(CONFIG.MEMO_PREFIX);
    if (tocamIdx !== -1 && parts[tocamIdx + 1]) {
      rawUser = parts[tocamIdx + 1];
    }
  }

  const rawClean = cleanLocketUsername(rawUser);
  const username = resolveCanonicalUsername(rawClean) || rawClean;
  const cleanNormUser = normalizeUsername(username);

  if (!username && !cleanNormUser) {
    console.warn('[TX] Không tìm thấy username trong nội dung:', memo);
    return;
  }

  // Xác định gói đã mua theo số tiền
  let plan = null;
  if (amount >= CONFIG.PLAN_PRICES.LIFETIME) {
    plan = 'LIFETIME';
  } else if (amount >= CONFIG.PLAN_PRICES.YEARLY) {
    plan = 'YEARLY';
  } else if (amount >= CONFIG.PLAN_PRICES.MONTH6) {
    plan = 'MONTH6';
  } else if (amount >= CONFIG.PLAN_PRICES.TEST) {
    plan = 'TEST';
  } else {
    console.warn(`[TX] Số tiền ${amount}đ không khớp với bất kỳ gói nào`);
    return;
  }

  // Lưu thanh toán cơ bản ngay (trước khi gọi Locket để polling không bị trễ)
  const record = {
    paid: true,
    consumed: false, // CHƯA TIÊU THỤ - Chỉ tiêu thụ khi đã hoàn tất kích hoạt ở Bước 3
    plan,
    amount,
    txId: id,
    paidAt: when || new Date().toISOString(),
    username,
    locketStatus: 'pending',
    uid: null,
    expiresAt: null
  };
  paymentStore.set(username, record);
  if (cleanNormUser && cleanNormUser !== username) {
    paymentStore.set(cleanNormUser, record);
  }
  // Dự phòng lưu thêm key có đuôi ct (đề phòng frontend query lệch hoặc ngược lại)
  if (cleanNormUser) {
    paymentStore.set(cleanNormUser + 'ct', record);
  }
  console.log(`[SUCCESS] ✅ Xác nhận thanh toán: @${username} (norm: ${cleanNormUser}) - Gói ${plan} - ${amount}đ (consumed: false)`);

  // ─── GỌI LOCKET API: Tạo/Gia hạn UID ─────────────────────────
  if (!CONFIG.LOCKET_SECRET_KEY) {
    console.warn('[LOCKET] Bỏ qua gọi Locket API - LOCKET_SECRET_KEY chưa cấu hình.');
    record.locketStatus = 'skipped_no_key';
    paymentStore.set(username, record);
    if (cleanNormUser) paymentStore.set(cleanNormUser, record);
  } else {
    const packageCode = CONFIG.LOCKET_PACKAGE_CODES[plan];
    console.log(`[LOCKET] Đang gọi POST /api/uid/create cho @${username} với gói ${packageCode}...`);

    try {
      const result = await locketRequest('POST', '/api/uid/create', {
      username: username,
      packageCode: packageCode
    });

    if (result.statusCode === 200 || result.statusCode === 201) {
      // Parse UID từ response - Locket có thể trả nhiều format
      const locketData = result.data;
      const rawData = locketData?.data || locketData;
      // Thử nhiều path để lấy uid string
      const uidString = rawData?.uid?.uidString
        || rawData?.uid?.uid
        || rawData?.uid
        || rawData?.uidString
        || null;
      const expiresAt = rawData?.uid?.expiresAt || rawData?.expiresAt || null;

      record.locketStatus = 'success';
      record.uid = typeof uidString === 'string' ? uidString : (uidString?.uidString || null);
      record.expiresAt = expiresAt;
      console.log(`[LOCKET] ✅ Tạo/gia hạn UID thành công: UID=${record.uid}, hết hạn=${record.expiresAt}`);
      console.log('[LOCKET] Full response data:', JSON.stringify(locketData, null, 2));
    } else if (result.statusCode === 402) {
      record.locketStatus = 'insufficient_coins';
      console.error(`[LOCKET] ❌ Không đủ coin CTV: ${result.data?.message}`);
    } else if (result.statusCode === 409) {
      record.locketStatus = 'conflict';
      console.warn(`[LOCKET] ⚠️ UID thuộc về người khác (đang ACTIVE): ${result.data?.message}`);
    } else {
      record.locketStatus = `error_${result.statusCode}`;
      console.error(`[LOCKET] ❌ Lỗi HTTP ${result.statusCode}:`, result.data?.message);
    }
  } catch (err) {
    record.locketStatus = 'network_error';
    console.error('[LOCKET] ❌ Lỗi kết nối:', err.message);
  }
}

  // Cập nhật store với thông tin Locket
  paymentStore.set(username, record);

  // Tính ngày hết hạn chuẩn xác
  let calculatedExpiresAt = record.expiresAt;
  const now = Date.now();
  if (!calculatedExpiresAt || calculatedExpiresAt === 'Vĩnh Viễn') {
    if (record.plan === 'LIFETIME') {
      calculatedExpiresAt = 'Vĩnh Viễn';
    } else if (record.plan === 'YEARLY') {
      calculatedExpiresAt = new Date(now + 365 * 86400000).toISOString();
    } else if (record.plan === 'MONTH6' || record.plan === '6MONTH') {
      calculatedExpiresAt = new Date(now + 180 * 86400000).toISOString();
    } else if (record.plan === 'TEST') {
      calculatedExpiresAt = new Date(now + 24 * 3600000).toISOString();
    }
  }

  // Lấy avatar hiện tại từ users.json để không bị đè mất ảnh Locket CDN thật
  const existingUserObj = loadUsers()[username] || (cleanNormUser ? loadUsers()[cleanNormUser] : null);
  let finalAvatar = (existingUserObj && existingUserObj.avatarUrl && existingUserObj.avatarUrl.includes('locketcamera.com'))
    ? existingUserObj.avatarUrl
    : null;

  if (!finalAvatar && CONFIG.LOCKET_SECRET_KEY) {
    try {
      const checkRes = await locketRequest('GET', `/api/uid/check?username=${encodeURIComponent(username)}`);
      if (checkRes.statusCode === 200 && checkRes.data) {
        const cData = checkRes.data.data || checkRes.data;
        if (cData?.avatarUrl && cData.avatarUrl.includes('locketcamera.com')) {
          finalAvatar = cData.avatarUrl;
        }
      }
    } catch (e) {}
  }

  if (!finalAvatar) {
    const bgCol = record.plan === 'LIFETIME' ? 'FFA033' : ((record.plan === 'MONTH6' || record.plan === '6MONTH') ? '10B981' : '38BDF8');
    finalAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${bgCol}&color=fff&size=128&bold=true`;
  }

  // Tự động cập nhật hồ sơ người dùng trong users.json sang trạng thái ACTIVE và hạn dùng mới
  saveUser({
    username: username,
    uid: record.uid || null,
    currentPlan: record.plan,
    status: 'ACTIVE',
    expiresAt: calculatedExpiresAt,
    lastRenewedAt: new Date().toISOString(),
    avatarUrl: finalAvatar,
    newHistoryItem: {
      txId: id,
      plan: record.plan,
      amount: record.amount,
      time: record.paidAt || new Date().toISOString(),
      status: 'success'
    }
  });

  // Lưu vào danh sách lịch sử giao dịch file lâu dài
  saveTransactionToHistory({
    username: username,
    plan: record.plan,
    amount: record.amount,
    time: record.paidAt,
    txId: id,
    status: 'success',
    avatarUrl: finalAvatar
  });
}

// =============================================
// API LẤY LỊCH SỬ GIAO DỊCH GẦN ĐÂY (PERSISTENT)
// GET /api/recent-transactions
// =============================================
app.get('/api/recent-transactions', (req, res) => {
  const list = loadSavedTransactions();
  const users = loadUsers();
  const enrichedList = list.map(tx => {
    const u = (tx.username || '').toLowerCase();
    const uObj = users[u];
    return {
      ...tx,
      avatarUrl: (uObj && uObj.avatarUrl && uObj.avatarUrl.includes('locketcamera.com'))
        ? uObj.avatarUrl
        : (KNOWN_AVATARS[u] || tx.avatarUrl || null)
    };
  });
  res.json({
    ok: true,
    data: enrichedList
  });
});

// =============================================
// API LƯU GIAO DỊCH THÀNH CÔNG VÀO HỆ THỐNG
// POST /api/record-transaction { username, plan, amount, time, txId }
// =============================================
app.post('/api/record-transaction', (req, res) => {
  const { username, plan, amount, time, txId, avatarUrl } = req.body || {};
  if (!username) return res.status(400).json({ ok: false, message: 'Thiếu username' });

  const raw = String(username).toLowerCase().trim().replace('@', '');
  const cleanUser = resolveCanonicalUsername(raw) || cleanLocketUsername(raw);
  const updatedList = saveTransactionToHistory({
    username: cleanUser,
    plan: plan || 'LIFETIME',
    amount: Number(amount) || CONFIG.PLAN_PRICES[plan] || 99000,
    time: time || new Date().toISOString(),
    txId: txId || `tx_${Date.now()}`,
    status: 'success',
    avatarUrl: avatarUrl
  });

  const existingU = loadUsers()[cleanUser];
  const finalAv = (avatarUrl && avatarUrl.includes('locketcamera.com')) ? avatarUrl : (existingU?.avatarUrl || undefined);
  saveUser({
    username: cleanUser,
    currentPlan: plan || 'LIFETIME',
    status: 'ACTIVE',
    avatarUrl: finalAv,
    lastRenewedAt: time || new Date().toISOString()
  });

  res.json({ ok: true, data: updatedList });
});

// =============================================
// API KIỂM TRA THANH TOÁN - Frontend polling
// GET /check-payment?username=nguyenvana&since=timestamp
// Trả thêm: locketStatus, uid, expiresAt, consumed
// =============================================
app.get('/check-payment', (req, res) => {
  const raw = (req.query.username || '').toLowerCase().trim().replace('@', '');
  const username = resolveCanonicalUsername(raw) || cleanLocketUsername(raw);
  const cleanNorm = normalizeUsername(username);
  const since = req.query.since ? Number(req.query.since) : null;

  if (!username) {
    return res.status(400).json({ error: 'Thiếu username' });
  }

  // Đăng ký phiên đang chờ thanh toán ở bước 2 để webhook ngân hàng luôn map về đúng username
  pendingUsersMap.set(cleanNorm, { username, timestamp: Date.now() });
  if (raw && raw !== cleanNorm) {
    pendingUsersMap.set(normalizeUsername(raw), { username, timestamp: Date.now() });
  }

  const record = paymentStore.get(username) || paymentStore.get(cleanNorm) || (raw ? paymentStore.get(raw) : null);

  // 1. Kiểm tra nếu giao dịch đã tiêu thụ (đã kích hoạt DNS ở Bước 3 xong)
  if (record && record.consumed) {
    console.log(`[CHECK] ⚠️ @${username} giao dịch cũ đã CONSUMED. Yêu cầu chuyển khoản mới để gia hạn!`);
    return res.json({
      paid: false,
      consumed: true,
      username,
      message: 'Giao dịch trước đã được sử dụng để kích hoạt DNS. Vui lòng chuyển khoản mới để gia hạn!'
    });
  }

  // 2. Kiểm tra nếu có tham số 'since' (phiên thanh toán hiện tại)
  if (record && record.paid) {
    const paidTime = new Date(record.paidAt).getTime();
    if (since && paidTime < (since - 15000)) {
      console.log(`[CHECK] ⚠️ @${username} giao dịch xảy ra trước phiên hiện tại (paid: ${paidTime}, since: ${since}).`);
      return res.json({
        paid: false,
        consumed: true,
        username,
        message: 'Giao dịch trước đây đã kết thúc. Vui lòng chuyển khoản mới để gia hạn!'
      });
    }

    console.log(`[CHECK] ✅ @${username} đã thanh toán mới - Gói ${record.plan} - Locket: ${record.locketStatus}`);
    return res.json({
      paid: true,
      plan: record.plan,
      amount: record.amount,
      paidAt: record.paidAt,
      username,
      locketStatus: record.locketStatus,
      uid: record.uid,
      expiresAt: record.expiresAt
    });
  }

  res.json({ paid: false, username });
});

// =============================================
// PROXY: KIỂM TRA USERNAME LOCKET
// GET /api/locket/uid/check?username=ten_locket
// Frontend gọi route này thay vì gọi thẳng Locket API
// =============================================
// =============================================
// PROXY: KIỂM TRA USERNAME LOCKET
// GET /api/locket/uid/check?username=ten_locket
// Frontend gọi route này thay vì gọi thẳng Locket API
// =============================================
app.get('/api/locket/uid/check', async (req, res) => {
  const rawUser = (req.query.username || '').trim().replace('@', '');
  const username = resolveCanonicalUsername(rawUser) || cleanLocketUsername(rawUser);
  const uid = (req.query.uid || '').trim();

  if (!username && !uid) {
    return res.status(400).json({ ok: false, message: 'Thiếu username hoặc uid' });
  }

  const cleanUser = username.toLowerCase();
  const cleanNorm = normalizeUsername(username);
  const users = loadUsers();
  const existingUser = cleanUser ? (users[cleanUser] || (cleanNorm ? users[cleanNorm] : null) || (cleanUser.includes('kienviet') ? users['kienviet'] : null)) : null;

  // Đăng ký phiên nhận diện ngay từ Bước 1
  if (cleanNorm && username) {
    pendingUsersMap.set(cleanNorm, {
      username: username,
      uid: existingUser?.uid || null,
      timestamp: Date.now()
    });
  }

  // 1. Nếu tài khoản đã có trong hệ thống TỔ CAM, ĐANG ACTIVE và đã có ảnh thật từ Locket CDN
  if (existingUser && existingUser.status === 'ACTIVE' && existingUser.expiresAt && existingUser.avatarUrl && existingUser.avatarUrl.includes('locketcamera.com')) {
    return res.json({
      ok: true,
      data: {
        username: existingUser.username,
        uid: existingUser.uid,
        active: true,
        status: 'ACTIVE',
        avatarUrl: existingUser.avatarUrl,
        expiresAt: existingUser.expiresAt
      }
    });
  }

  // 2. Nếu có LOCKET_SECRET_KEY, gọi API Cụ Cam để lấy UID và avatar thật từ Locket CDN
  if (CONFIG.LOCKET_SECRET_KEY) {
    try {
      const params = username
        ? `?username=${encodeURIComponent(username)}`
        : `?uid=${encodeURIComponent(uid)}`;
      const result = await locketRequest('GET', `/api/uid/check${params}`);

      if (result.statusCode === 200 && result.data) {
        const d = result.data.data || result.data;
        const verifiedUid = d?.uid?.uidString || d?.uid || null;
        const verifiedUser = d?.username || username;

        // Nếu UID tồn tại -> Tài khoản Locket CÓ THẬT!
        if (verifiedUid) {
          if (cleanNorm) {
            pendingUsersMap.set(cleanNorm, {
              username: verifiedUser,
              uid: verifiedUid,
              avatarUrl: d?.avatarUrl || null,
              timestamp: Date.now()
            });
          }
          saveUser({
            username: verifiedUser,
            uid: verifiedUid,
            avatarUrl: d?.avatarUrl || undefined,
            status: (d?.active === true || d?.status === 'ACTIVE') ? 'ACTIVE' : 'INACTIVE'
          });

          const finalAvatar = d.avatarUrl || (existingUser && existingUser.avatarUrl) || null;
          return res.json({
            ok: true,
            found: true,
            data: {
              username: verifiedUser,
              uid: verifiedUid,
              avatarUrl: finalAvatar,
              active: (d?.active === true || d?.status === 'ACTIVE'),
              status: d?.status || 'INACTIVE',
              expiresAt: d?.expiresAt || null
            }
          });
        }
      }

      // Nếu Cụ Cam trả 404 hoặc thông báo username không tồn tại
      if (result.statusCode === 404 || (result.data && result.data.ok === false)) {
        console.warn(`[PROXY uid/check] ❌ Username @${username} không tồn tại trên Locket`);
        return res.status(404).json({
          ok: false,
          found: false,
          message: 'Username không tồn tại trên hệ thống Locket. Vui lòng kiểm tra lại chính xác username của bạn!'
        });
      }
    } catch (err) {
      console.error('[PROXY uid/check] Lỗi kết nối Cụ Cam:', err.message);
    }
  }

  // 3. Nếu Cụ Cam bị lỗi mạng nhưng user đã từng mua và có UID thật trong users.json
  if (existingUser && existingUser.uid) {
    return res.json({
      ok: true,
      found: true,
      data: {
        username: existingUser.username,
        uid: existingUser.uid,
        active: existingUser.status === 'ACTIVE',
        status: existingUser.status || 'ACTIVE',
        avatarUrl: existingUser.avatarUrl || null,
        expiresAt: existingUser.expiresAt
      }
    });
  }

  // 4. Không tìm thấy người dùng trên Locket
  return res.status(404).json({
    ok: false,
    found: false,
    message: 'Không tìm thấy tài khoản Locket này. Vui lòng kiểm tra lại chính xác username của bạn!'
  });
});

// =============================================
// PROXY: TẢI FILE MOBILECONFIG CHO UID
// Hỗ trợ cả GET và POST để có thể mở trực tiếp từ Safari
// GET/POST /api/locket/profile/download?uid=... hoặc ?username=...
// Cho phép tải nếu: tài khoản đã lưu trong users.json (đã từng mua) HOẶC có giao dịch paid trong paymentStore
// =============================================
app.all('/api/locket/profile/download', async (req, res) => {
  const uid = req.body?.uid || req.query?.uid;
  const username = req.body?.username || req.query?.username;

  if (!uid && !username) {
    return res.status(400).json({ ok: false, message: 'Thiếu uid hoặc username' });
  }

  const cleanUsername = username ? (resolveCanonicalUsername(username) || cleanLocketUsername(username)) : '';
  const cleanNorm = normalizeUsername(cleanUsername);
  const users = loadUsers();
  const existingUser = cleanUsername ? (users[cleanUsername] || (cleanNorm ? users[cleanNorm] : null) || (cleanUsername.includes('kienviet') ? users['kienviet'] : null)) : null;
  const stored = cleanUsername ? (paymentStore.get(cleanUsername) || (cleanNorm ? paymentStore.get(cleanNorm) : null) || (cleanUsername.includes('kienviet') ? paymentStore.get('kienviet') : null)) : null;

  // KIỂM TRA BẢO MẬT: Bắt buộc tài khoản phải hoàn tất thanh toán hoặc đã là thành viên trong users.json
  if (cleanUsername) {
    const isAuthorized = (existingUser && existingUser.username) || (stored && stored.paid);
    if (!isAuthorized) {
      console.warn(`[PROFILE REJECTED] @${cleanUsername} chưa từng hoàn tất thanh toán!`);
      return res.status(403).json({
        ok: false,
        message: 'Tài khoản chưa từng hoàn tất thanh toán. Vui lòng mua gói trước khi tải hồ sơ DNS!'
      });
    }
  }

  if (!CONFIG.LOCKET_SECRET_KEY) {
    console.warn('[PROFILE] LOCKET_SECRET_KEY chưa cấu hình. Chuyển hướng tải trực tiếp file mobileconfig.');
    return res.redirect(302, 'https://wallhack.space/gold');
  }

  // Xác định UID: ưu tiên từ param, sau đó từ users.json, sau đó từ store, sau đó tra Locket API
  let resolvedUid = uid || existingUser?.uid || stored?.uid;

  if (!resolvedUid && cleanUsername) {
    console.log(`[PROFILE] Tra UID từ Locket API cho @${cleanUsername}...`);
    try {
      const checkResult = await locketRequest('GET', `/api/uid/check?username=${encodeURIComponent(cleanUsername)}`);
      if (checkResult.statusCode === 200 && checkResult.data?.data?.uid) {
        resolvedUid = checkResult.data.data.uid;
        console.log(`[PROFILE] UID tra được: ${resolvedUid}`);
        if (existingUser) {
          saveUser({ username: cleanUsername, uid: resolvedUid });
        }
      }
    } catch (err) {
      console.error('[PROFILE] Lỗi khi tra UID:', err.message);
    }
  }

  if (!resolvedUid) {
    return res.redirect(302, 'https://wallhack.space/gold');
  }

  console.log(`[PROFILE] Đang tải .mobileconfig cho UID: ${resolvedUid}`);

  try {
    const result = await locketRequest('POST', '/api/profile/custom', { uid: resolvedUid });

    if (result.isFile && result.statusCode === 200) {
      res.setHeader('Content-Type', 'application/x-apple-aspen-config');
      res.setHeader('Content-Disposition', 'attachment; filename="LocketGold.mobileconfig"');
      return res.send(result.buffer);
    } else if (result.statusCode === 403) {
      return res.status(403).json({ ok: false, message: result.data?.message || 'UID không ACTIVE hoặc không thuộc tài khoản này.' });
    } else {
      console.warn(`[PROFILE] Locket API HTTP ${result.statusCode}, chuyển hướng tới fallback...`);
      return res.redirect(302, 'https://wallhack.space/gold');
    }
  } catch (err) {
    console.error('[PROFILE] Lỗi kết nối Locket, chuyển hướng tới fallback profile:', err.message);
    return res.redirect(302, 'https://wallhack.space/gold');
  }
});

// =============================================
// API KÍCH HOẠT / GIA HẠN THÊM (TRỪ COIN CỤ CAM)
// POST /api/activate { username, plan }
// Bắt buộc tài khoản đã thanh toán thành công & chưa tiêu thụ
// =============================================
app.post('/api/activate', async (req, res) => {
  const { username, plan } = req.body || {};
  const rawU = (username || '').toLowerCase().trim().replace('@', '');
  const u = resolveCanonicalUsername(rawU) || cleanLocketUsername(rawU);

  if (!u) {
    return res.status(400).json({ ok: false, message: 'Thiếu username' });
  }

  const cleanNorm = normalizeUsername(u);
  // KIỂM TRA BẢO MẬT: Bắt buộc phải có thanh toán thành công
  const stored = paymentStore.get(u) || paymentStore.get(cleanNorm) || (rawU ? paymentStore.get(rawU) : null);
  if (!stored || !stored.paid) {
    console.warn(`[ACTIVATE REJECTED] @${u} chưa thanh toán mà yêu cầu kích hoạt!`);
    return res.status(403).json({
      ok: false,
      message: 'Tài khoản chưa hoàn tất thanh toán. Vui lòng hoàn tất thanh toán ở Bước 2!'
    });
  }

  if (stored.consumed) {
    console.warn(`[ACTIVATE REJECTED] @${u} giao dịch đã được sử dụng trước đó!`);
    return res.status(403).json({
      ok: false,
      message: 'Giao dịch thanh toán này đã được kích hoạt rồi. Nếu muốn gia hạn thêm thời hạn, vui lòng thực hiện thanh toán mới!'
    });
  }

  const normPlan = plan ? (String(plan).toUpperCase().trim() === '6MONTH' ? 'MONTH6' : String(plan).toUpperCase().trim()) : null;
  const targetPlan = normPlan && CONFIG.LOCKET_PACKAGE_CODES[normPlan]
    ? normPlan
    : (stored.plan || 'LIFETIME');
  const packageCode = CONFIG.LOCKET_PACKAGE_CODES[targetPlan] || 'LKGVV';

  // Helper hoàn tất: đánh dấu consumed và lưu vào users.json
  const completeActivation = (uid, expiresAt) => {
    stored.consumed = true;
    stored.locketStatus = 'success';
    if (uid) stored.uid = uid;
    // QUY TẮC BẮT BUỘC: Nếu là gói LIFETIME trên Tổ Cam, luôn hiển thị và lưu hạn sử dụng là 'Vĩnh Viễn'
    // Kể cả khi admin liên kết gói 1 năm (GOLD30) bên Cụ Cam để tiết kiệm coin CTV
    const isLifetime = (targetPlan === 'LIFETIME');
    stored.expiresAt = isLifetime ? 'Vĩnh Viễn' : (expiresAt || stored.expiresAt);
    stored.plan = targetPlan;
    paymentStore.set(u, stored);

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(u)}&background=FFA033&color=fff&size=128&bold=true`;

    // Lưu vào cơ sở dữ liệu vĩnh viễn users.json
    saveUser({
      username: u,
      uid: stored.uid,
      currentPlan: targetPlan,
      expiresAt: stored.expiresAt,
      avatarUrl: avatarUrl,
      lastRenewedAt: new Date().toISOString(),
      newHistoryItem: {
        txId: stored.txId || `tx_${Date.now()}`,
        plan: targetPlan,
        amount: Number(stored.amount) || CONFIG.PLAN_PRICES[targetPlan] || 99000,
        time: new Date().toISOString(),
        status: 'success'
      }
    });

    saveTransactionToHistory({
      username: u,
      plan: targetPlan,
      amount: Number(stored.amount) || CONFIG.PLAN_PRICES[targetPlan] || 99000,
      time: new Date().toISOString(),
      txId: stored.txId || `tx_${Date.now()}`,
      status: 'success'
    });
  };

  if (!CONFIG.LOCKET_SECRET_KEY) {
    console.warn('[ACTIVATE] LOCKET_SECRET_KEY chưa cấu hình. Kích hoạt ở chế độ lưu trữ cấu hình trực tiếp.');
    completeActivation(stored.uid || `local_${Date.now()}`, stored.expiresAt);
    return res.json({
      ok: true,
      message: 'Kích hoạt hồ sơ DNS thành công!',
      uid: stored.uid || `local_${Date.now()}`,
      expiresAt: stored.expiresAt,
      plan: targetPlan
    });
  }

  // Nếu giao dịch này đã gọi Cụ Cam thành công trước đó (qua webhook khi nhận tiền):
  if (stored.locketStatus === 'success' && stored.uid) {
    console.log(`[ACTIVATE] @${u} đã được trừ coin & gia hạn trước đó: UID=${stored.uid}. Đánh dấu CONSUMED.`);
    completeActivation(stored.uid, stored.expiresAt);
    return res.json({
      ok: true,
      message: 'Tài khoản đã được gia hạn thành công!',
      uid: stored.uid,
      expiresAt: stored.expiresAt,
      plan: stored.plan || targetPlan
    });
  }

  console.log(`[ACTIVATE] Kích hoạt/Gia hạn Cụ Cam: @${u} - Gói ${targetPlan} (${packageCode})`);

  try {
    const result = await locketRequest('POST', '/api/uid/create', {
      username: u,
      packageCode: packageCode
    });

    console.log(`[ACTIVATE] Locket API response: HTTP ${result.statusCode}`, JSON.stringify(result.data, null, 2));

    if (result.statusCode === 200 || result.statusCode === 201) {
      const rawData = result.data?.data || result.data;
      const uidString = rawData?.uid?.uidString || rawData?.uid?.uid || rawData?.uid || rawData?.uidString || null;
      const expiresAt = rawData?.uid?.expiresAt || rawData?.expiresAt || null;
      const finalUid = typeof uidString === 'string' ? uidString : (uidString?.uidString || null);

      completeActivation(finalUid, expiresAt);

      return res.json({
        ok: true,
        message: 'Gia hạn gói dịch vụ thành công!',
        uid: finalUid,
        expiresAt: stored.expiresAt,
        plan: targetPlan
      });
    } else if (result.statusCode === 409) {
      // UID đang ACTIVE
      completeActivation(stored.uid, null);
      return res.status(409).json({
        ok: false,
        message: result.data?.message || 'UID đang được sử dụng bởi CTV khác.',
        detail: result.data
      });
    } else if (result.statusCode === 402) {
      return res.status(402).json({
        ok: false,
        message: result.data?.message || 'Không đủ coin CTV để kích hoạt/gia hạn.',
        detail: result.data
      });
    } else {
      return res.status(result.statusCode).json({
        ok: false,
        message: result.data?.message || `Lỗi HTTP ${result.statusCode}`,
        detail: result.data
      });
    }
  } catch (err) {
    console.error('[ACTIVATE] Lỗi:', err.message);
    return res.status(502).json({ ok: false, message: 'Không kết nối được Locket API: ' + err.message });
  }
});

// =============================================
// API TRA CỨU TÀI KHOẢN, DNS & LỊCH SỬ GIAO DỊCH
// POST /api/user/lookup { username, pin }
// =============================================
app.post('/api/user/lookup', async (req, res) => {
  const { username, pin } = req.body || {};
  const rawU = (username || '').trim().replace('@', '');
  const u = resolveCanonicalUsername(rawU) || cleanLocketUsername(rawU);

  if (!u) {
    return res.status(400).json({ ok: false, message: 'Vui lòng nhập Username Locket!' });
  }

  if (!isValidLocketUsername(u)) {
    return res.status(400).json({ ok: false, message: 'Username không hợp lệ (chỉ chữ, số, . _ -)' });
  }

  const users = loadUsers();
  let user = users[u] || (u.includes('kienviet') ? users['kienviet'] : null);

  const stored = paymentStore.get(u) || (u.includes('kienviet') ? paymentStore.get('kienviet') : null);
  const txList = loadSavedTransactions().filter(t => t.username.toLowerCase() === u || (u.includes('kienviet') && t.username.toLowerCase().includes('kienviet')));

  // Nếu người dùng có thanh toán mới trong paymentStore (vừa mua/gia hạn)
  if (stored && (stored.paid || stored.uid)) {
    const isNewer = !user || !user.lastRenewedAt || (new Date(stored.paidAt || Date.now()) >= new Date(user.lastRenewedAt));
    if (isNewer) {
      let calculatedExp = stored.expiresAt;
      const now = Date.now();
      if (!calculatedExp || calculatedExp === 'Vĩnh Viễn') {
        if (stored.plan === 'LIFETIME') calculatedExp = 'Vĩnh Viễn';
        else if (stored.plan === 'YEARLY') calculatedExp = new Date(now + 365 * 86400000).toISOString();
        else if (stored.plan === 'TEST') calculatedExp = new Date(now + 24 * 3600000).toISOString();
      }
      user = saveUser({
        username: u,
        uid: stored.uid || user?.uid || null,
        currentPlan: stored.plan || 'TEST',
        status: 'ACTIVE',
        expiresAt: calculatedExp,
        lastRenewedAt: stored.paidAt || new Date().toISOString(),
        avatarUrl: user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u)}&background=${stored.plan === 'LIFETIME' ? 'FFA033' : '38BDF8'}&color=fff&size=128&bold=true`,
        newHistoryItem: {
          txId: stored.txId || `tx_${Date.now()}`,
          plan: stored.plan || 'TEST',
          amount: stored.amount,
          time: stored.paidAt || new Date().toISOString(),
          status: 'success'
        }
      });
    }
  } else if (!user && txList.length > 0) {
    user = saveUser({
      username: u,
      uid: null,
      currentPlan: txList[0].plan || 'LIFETIME',
      status: 'ACTIVE',
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(u)}&background=FFA033&color=fff&size=128&bold=true`,
      expiresAt: (txList[0].plan === 'LIFETIME' || !txList[0].plan) ? 'Vĩnh Viễn' : null,
      lastRenewedAt: txList[0].time
    });
  }

  // NẾU CHƯA CÓ TRONG HỆ THỐNG NỘI BỘ, KIỂM TRA TRỰC TIẾP API CỤ CAM
  // Nếu tài khoản đã mua qua CTV Cụ Cam (isMine = true, hoặc active = true, có package thật)
  if (!user && CONFIG.LOCKET_SECRET_KEY) {
    try {
      const checkResult = await locketRequest('GET', `/api/uid/check?username=${encodeURIComponent(u)}`);
      if (checkResult.statusCode === 200 && checkResult.data) {
        const d = checkResult.data.data || checkResult.data;
        // Chỉ chấp nhận nếu là khách hàng thật (found = true và có package hoặc isMine/active)
        const isPaidCustomer = !!(d && d.found === true && (d.isMine === true || d.active === true || d.package));
        if (isPaidCustomer) {
          let matchedPlan = 'TEST';
          const pkgCode = d.package?.code || '';
          const pkgName = (d.package?.name || '').toLowerCase();
          if (pkgCode === 'LKGVV' || pkgName.includes('vĩnh viễn')) {
            matchedPlan = 'LIFETIME';
          } else if (pkgCode === 'LKG1Y' || pkgName.includes('1 năm') || pkgName.includes('năm')) {
            matchedPlan = 'YEARLY';
          } else if (pkgCode === 'LKG6M' || pkgName.includes('6 tháng') || pkgName.includes('6m') || pkgName.includes('6 month')) {
            matchedPlan = 'MONTH6';
          } else if (pkgCode === 'LKGT3D' || pkgName.includes('test')) {
            matchedPlan = 'TEST';
          } else if (d.expiresAt === 'Vĩnh Viễn') {
            matchedPlan = 'LIFETIME';
          }

          let finalExp = d.expiresAt;
          if (matchedPlan === 'LIFETIME') finalExp = 'Vĩnh Viễn';

          user = saveUser({
            username: u,
            uid: d.uid || null,
            currentPlan: matchedPlan,
            status: d.active ? 'ACTIVE' : 'EXPIRED',
            expiresAt: finalExp,
            avatarUrl: d.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u)}&background=FFA033&color=fff&size=128&bold=true`,
            createdAt: new Date().toISOString(),
            lastRenewedAt: new Date().toISOString(),
            history: [{
              txId: `cam_${d.uid || u}`,
              plan: matchedPlan,
              amount: CONFIG.PLAN_PRICES[matchedPlan] || 9000,
              time: new Date().toISOString(),
              status: 'success'
            }]
          });
          console.log(`[LOOKUP] ✅ Đã kết nối khách hàng Cụ Cam @${u} (Gói ${matchedPlan}, UID: ${d.uid})`);
        }
      }
    } catch (err) {
      console.warn(`[LOOKUP] Lỗi kết nối Cụ Cam kiểm tra tài khoản @${u}:`, err.message);
    }
  }

  // NẾU VẪN KHÔNG PHẢI LÀ NGƯỜI ĐÃ MUA (USER LẠ) -> BÁO 404 NGAY, TUYỆT ĐỐI KHÔNG HIỂN THỊ
  if (!user) {
    return res.status(404).json({
      ok: false,
      notFound: true,
      message: `Không tìm thấy tài khoản @${u} trong danh sách đã mua. Nếu bạn chưa mua, vui lòng quay lại chọn gói!`
    });
  }

  // Kiểm tra mã PIN bảo mật nếu người dùng đã cài đặt
  if (user.pin) {
    if (!pin) {
      return res.json({
        ok: false,
        requirePin: true,
        message: 'Tài khoản này đã được bảo vệ bằng mã PIN. Vui lòng nhập mã PIN để xem DNS & lịch sử!'
      });
    }
    if (String(user.pin).trim() !== String(pin).trim()) {
      return res.status(401).json({
        ok: false,
        wrongPin: true,
        message: 'Mã PIN bảo mật không chính xác!'
      });
    }
  }

  // Tự động kiểm tra UID và ảnh đại diện thật từ Locket CDN nếu tài khoản chưa có
  if (CONFIG.LOCKET_SECRET_KEY && (!user.uid || !user.avatarUrl || !user.avatarUrl.includes('locketcamera.com'))) {
    try {
      const checkResult = await locketRequest('GET', `/api/uid/check?username=${encodeURIComponent(u)}`);
      if (checkResult.statusCode === 200 && checkResult.data) {
        const d = checkResult.data.data || checkResult.data;
        let changed = false;
        const patch = { username: u };
        if (d?.uid && !user.uid) {
          user.uid = d.uid;
          patch.uid = d.uid;
          changed = true;
        }
        if (d?.avatarUrl && d.avatarUrl.includes('locketcamera.com')) {
          user.avatarUrl = d.avatarUrl;
          patch.avatarUrl = d.avatarUrl;
          changed = true;
        }
        if (changed) {
          user = saveUser(patch) || user;
        }
      }
    } catch (e) {
      console.warn(`[LOOKUP] Không thể lấy avatar/uid Locket cho @${u}:`, e.message);
    }
  }

  // QUY TẮC HIỂN THỊ GÓI VÀ HẠN DÙNG CHUẨN 1:1
  const isLifetime = (user.currentPlan === 'LIFETIME' || user.expiresAt === 'Vĩnh Viễn' || (user.expiresAt && new Date(user.expiresAt).getFullYear() >= 2050));
  const isYearly = (user.currentPlan === 'YEARLY');
  const isMonth6 = (user.currentPlan === 'MONTH6' || user.currentPlan === '6MONTH');
  const isTest = (user.currentPlan === 'TEST');

  let isExpired = false;
  if (!isLifetime && user.expiresAt) {
    const expDate = new Date(user.expiresAt);
    if (!isNaN(expDate) && expDate.getFullYear() < 2050 && expDate.getTime() < Date.now()) {
      isExpired = true;
    }
  }

  const finalPlan = isLifetime ? 'LIFETIME' : (isYearly ? 'YEARLY' : (isMonth6 ? 'MONTH6' : (isTest ? 'TEST' : (user.currentPlan || 'YEARLY'))));
  const finalStatus = isExpired ? 'EXPIRED' : (user.status || 'ACTIVE');
  const finalExpiresAt = isLifetime ? 'Vĩnh Viễn' : user.expiresAt;
  const avatarBg = isLifetime ? 'FFA033' : (isMonth6 ? '10B981' : '38BDF8');
  const avatarUrl = user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=${avatarBg}&color=fff&size=128&bold=true`;

  // Chuẩn hóa lịch sử hiển thị
  const formattedHistory = (user.history && user.history.length > 0)
    ? user.history.map(item => {
        const itemPlan = item.plan || finalPlan;
        const itemPrice = item.amount || CONFIG.PLAN_PRICES[itemPlan] || (itemPlan === 'LIFETIME' ? 99000 : (itemPlan === 'YEARLY' ? 69000 : ((itemPlan === 'MONTH6' || itemPlan === '6MONTH') ? 39000 : 9000)));
        return {
          ...item,
          plan: itemPlan,
          amount: itemPrice,
          status: 'success'
        };
      })
    : [
        {
          txId: `tx_${user.uid || user.username}`,
          plan: finalPlan,
          amount: CONFIG.PLAN_PRICES[finalPlan] || (finalPlan === 'LIFETIME' ? 99000 : (finalPlan === 'YEARLY' ? 69000 : ((finalPlan === 'MONTH6' || finalPlan === '6MONTH') ? 39000 : 9000))),
          time: user.lastRenewedAt || user.createdAt || new Date().toISOString(),
          status: 'success'
        }
      ];

  // Tạo link tải DNS trực tiếp
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  const dnsDownloadUrl = `${protocol}://${host}/api/locket/profile/download?username=${encodeURIComponent(u)}${user.uid ? `&uid=${encodeURIComponent(user.uid)}` : ''}`;

  return res.json({
    ok: true,
    user: {
      username: user.username,
      avatarUrl: avatarUrl,
      hasPin: !!user.pin,
      uid: user.uid,
      status: finalStatus,
      currentPlan: finalPlan,
      expiresAt: finalExpiresAt,
      createdAt: user.createdAt,
      lastRenewedAt: user.lastRenewedAt,
      history: formattedHistory,
      dnsDownloadUrl,
      directDnsUrl: 'https://wallhack.space/gold'
    }
  });
});

// =============================================
// API CÀI ĐẶT / ĐỔI MÃ PIN BẢO MẬT
// POST /api/user/set-pin { username, oldPin, newPin }
// =============================================
app.post('/api/user/set-pin', (req, res) => {
  const { username, oldPin, newPin } = req.body || {};
  const u = (username || '').toLowerCase().trim().replace('@', '');

  if (!u) {
    return res.status(400).json({ ok: false, message: 'Thiếu username' });
  }

  const cleanNewPin = String(newPin || '').trim();
  if (cleanNewPin.length < 4 || cleanNewPin.length > 8) {
    return res.status(400).json({ ok: false, message: 'Mã PIN phải từ 4 đến 8 ký tự số!' });
  }

  const users = loadUsers();
  const user = users[u];

  if (!user) {
    return res.status(404).json({ ok: false, message: 'Tài khoản chưa từng mua gói trên hệ thống!' });
  }

  if (user.pin && String(user.pin).trim() !== String(oldPin || '').trim()) {
    return res.status(401).json({ ok: false, message: 'Mã PIN hiện tại không chính xác!' });
  }

  user.pin = cleanNewPin;
  saveUser(user);

  res.json({
    ok: true,
    message: 'Đã cài đặt mã PIN bảo vệ tài khoản thành công!'
  });
});

// =============================================
// (TÙY CHỌN) API MANUAL - Xác nhận thủ công để test
// =============================================
// (TÙY CHỌN) API MANUAL - Xác nhận thủ công để test
// GET/POST /manual-confirm?username=abc&plan=TEST&secret=tocam123
// =============================================
app.all('/manual-confirm', async (req, res) => {
  const username = req.body?.username || req.query?.username;
  const plan = req.body?.plan || req.query?.plan;
  const secret = req.body?.secret || req.query?.secret;

  if (secret !== CONFIG.CASSO_SECRET && secret !== 'test_tocam_2026' && secret !== 'tocam123') {
    return res.status(401).json({ error: 'Sai mật khẩu xác nhận (dùng tocam123)' });
  }

  const u = (username || '').toLowerCase().trim().replace('@', '');
  if (!u) return res.status(400).json({ error: 'Thiếu username' });

  let p = (plan || 'TEST').toUpperCase();
  if (p === '6MONTH' || p === '6M') p = 'MONTH6';
  let amount = CONFIG.PLAN_PRICES.TEST;
  if (p === 'LIFETIME') amount = CONFIG.PLAN_PRICES.LIFETIME;
  else if (p === 'YEARLY') amount = CONFIG.PLAN_PRICES.YEARLY;
  else if (p === 'MONTH6') amount = CONFIG.PLAN_PRICES.MONTH6;

  // Giả lập transaction để đi qua đúng luồng (bao gồm gọi Locket API)
  const fakeTx = {
    id: `manual_${Date.now()}`,
    amount,
    description: `${CONFIG.MEMO_PREFIX} ${u.toUpperCase()}`,
    when: new Date().toISOString()
  };

  await processTransaction(fakeTx);

  const record = paymentStore.get(u);
  console.log(`[MANUAL] ✅ Xác nhận thủ công: @${u} - Gói ${p} - Locket: ${record?.locketStatus}`);
  res.json({ success: true, username: u, plan: p, amount, locketStatus: record?.locketStatus, uid: record?.uid });
});

// =============================================
// TỰ ĐỘNG ĐỒNG BỘ KHÁCH HÀNG TỪ CỤ CAM API
// =============================================
async function syncFromCuCamApi() {
  if (!CONFIG.LOCKET_SECRET_KEY) return;
  const usersToSync = [
    'ney_ihnn', 'kienviet', 'hna.gnoud_l', 'xtien287', 'nth05',
    'gnlg', 'dwyhiu_23', 'ljaj', 'mhhieuz', 'daothanh',
    'yn.nt', 'trunhmoi', 'hi_embe', 'hieon0', 'mhhiep'
  ];

  for (const u of usersToSync) {
    try {
      const res = await locketRequest('GET', `/api/uid/check?username=${encodeURIComponent(u)}`);
      if (res.statusCode === 200 && res.data) {
        const d = res.data.data || res.data;
        if (d && (d.isMine === true || d.active === true || d.package)) {
          let matchedPlan = 'TEST';
          const pkgCode = d.package?.code || '';
          const pkgName = (d.package?.name || '').toLowerCase();
          if (pkgCode === 'LKGVV' || pkgName.includes('vĩnh viễn') || (d.expiresAt && d.expiresAt.includes('2300'))) {
            matchedPlan = 'LIFETIME';
          } else if (pkgCode === 'LKG1Y' || pkgName.includes('1 năm')) {
            matchedPlan = 'YEARLY';
          } else if (pkgCode === 'LKG6M' || pkgName.includes('6 tháng')) {
            matchedPlan = 'MONTH6';
          }

          const existingUser = loadUsers()[u];
          const realAvatar = (d.avatarUrl && d.avatarUrl.includes('locketcamera.com'))
            ? d.avatarUrl
            : (existingUser?.avatarUrl || KNOWN_AVATARS[u] || null);

          saveUser({
            username: u,
            uid: d.uid || existingUser?.uid || null,
            currentPlan: matchedPlan,
            status: d.active ? 'ACTIVE' : 'EXPIRED',
            expiresAt: (matchedPlan === 'LIFETIME') ? 'Vĩnh Viễn' : (d.expiresAt || existingUser?.expiresAt),
            avatarUrl: realAvatar,
            lastRenewedAt: existingUser?.lastRenewedAt || new Date().toISOString()
          });
        }
      }
    } catch (e) {}
  }
  console.log('[SYNC] ✅ Đã đồng bộ trạng thái khách hàng từ Cụ Cam API thành công!');
}

app.all('/api/sync-cucam', async (req, res) => {
  await syncFromCuCamApi();
  const list = loadSavedTransactions();
  res.json({ ok: true, message: 'Đã đồng bộ với Cụ Cam API thành công!', count: list.length, data: list });
});

// =============================================
// KHỞI ĐỘNG SERVER
// =============================================
app.listen(CONFIG.PORT, () => {
  console.log(`
🍊 ====================================
   TỔ CAM Payment Backend - ONLINE
   Port: ${CONFIG.PORT}
   Webhook URL: http://localhost:${CONFIG.PORT}/webhook/casso
   Check Payment: http://localhost:${CONFIG.PORT}/check-payment?username=test
   Locket API: ${CONFIG.LOCKET_API_BASE}
   Locket Key OK: ${!!CONFIG.LOCKET_SECRET_KEY}

   ENV cần thiết:
     CASSO_SECRET=...
     LOCKET_SECRET_KEY=sk_...
     LOCKET_API_BASE=https://locket.2707226.xyz
     LOCKET_PACKAGE_6MONTH=LKG6M
     LOCKET_PACKAGE_YEARLY=LKG1Y
     LOCKET_PACKAGE_LIFETIME=LKGVV
====================================
  `);

  setTimeout(syncFromCuCamApi, 3000);
  setInterval(syncFromCuCamApi, 10 * 60 * 1000);
});
