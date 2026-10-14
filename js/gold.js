let currentStep = 1;
let selectedPlan = {
  name: 'Gói Vĩnh Viễn',
  price: 119000,
  formattedPrice: '119.000đ',
  code: 'LIFETIME'
};
let currentUsername = '';
let currentUID = null; // UID Locket thật sau khi mua gói thành công
let isAccountGoldActive = false; // Đánh dấu tài khoản đã kích hoạt Gold trên Cụ Cam chưa
let isPaymentVerified = false; // Bắt buộc phải xác nhận thanh toán thành công mới sang bước 3
let paymentSessionStartTime = Date.now(); // Timestamp phiên thanh toán hiện tại, chống bypass thanh toán
let currentAvatarUrl = null; // Ảnh đại diện thật từ Locket CDN khi tra cứu username

// ============================================
// CẤU HÌNH BACKEND URL
// Tự động nhận diện localhost:3000 hoặc Railway production
// ============================================
const BACKEND_URL = (function() {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    if (window.location.origin && !window.location.origin.startsWith('file:')) {
      return window.location.origin;
    }
  }
  return 'https://lockettocam.up.railway.app';
})();

// BẢNG ẢNH ĐẠI DIỆN LOCKET THẬT TỪ HỆ THỐNG
const KNOWN_AVATARS = {
  'kienviet': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2Ft9iNECEtx2dJE9n36VvYb9xoMxy2%2Fpublic%2Fprofile_pic.webp?alt=media&token=dd907711-a017-4c82-8069-21154ec58e21',
  'ney_ihnn': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FTmSHu7R3CnYENbOk4roifJlWdD12%2Fpublic%2Fprofile_pic.webp?alt=media&token=19a21efb-5e7c-4c62-9a51-c8a24d1f25cd',
  'nguyendinhtuan00': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F2kIObn7acAfhBLuovv4xeg5EChE3%2Fpublic%2Fprofile_pic.webp?alt=media&token=57ad3ef0-3423-42a7-8fd6-9ff6ed1ff3a3',
  'ljaj': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FqJ76CYeThgaDnQYipUGPsC5XeVt2%2Fpublic%2Fprofile_pic.webp?alt=media&token=3cad0f80-e88b-4ca3-89fd-7438957207e8',
  'daothanh': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F5p59vkOpQxWV8w1hItgiJh27Fyo1%2Fpublic%2Fprofile_pic.webp?alt=media&token=b31ebe79-f5ff-4a8f-b7b3-2451d905ca39',
  'yn.nt': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FGrYho8R7FDPeEmQgy5aKMEYx9gl2%2Fpublic%2Fprofile_pic.webp?alt=media&token=4f447328-95e6-46fc-b19c-97dedd3c70ce',
  'trunhmoi': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2Feg66l51dTvhc7zREzqTVVKIvABh2%2Fpublic%2Fprofile_pic.webp?alt=media&token=a09e7abc-0bb3-4e86-8167-7781e644d256',
  'hi_embe': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FzKit3JlPVhdXK3ppE2PDRflNjP32%2Fpublic%2Fprofile_pic.webp?alt=media&token=477e2d02-3e84-48c6-a4bb-a78548ccf589',
  'hieon0': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FVt6ceg2WlBcOGDrWMlMnPOJQuc93%2Fpublic%2Fprofile_pic.webp?alt=media&token=9268ad0d-9843-436e-bf34-d2e5aa19cfd9',
  'mhhiep': 'https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2F2c7dlQuxUQULKnrwGPcqsqLW0sK2%2Fpublic%2Fprofile_pic.webp?alt=media&token=3229122d-0f4c-4223-8805-888f8170d36d'
};

// Tạo Avatar chữ SVG dự phòng siêu nhẹ không phụ thuộc bất kỳ API bên ngoài nào
function getSvgAvatar(name, bgColor = '#FFA033') {
  const initial = (name ? String(name).replace('@', '').charAt(0) : 'U').toUpperCase();
  const hex = bgColor || '#FFA033';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${hex}"/><text x="50%" y="54%" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="58" font-weight="800" fill="#ffffff" dominant-baseline="middle" text-anchor="middle">${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Khởi tạo theo config
function initFromConfig() {
  if (typeof TO_CAM_CONFIG !== 'undefined') {
    // Hiển thị thông tin ngân hàng ở bước 2
    const bankNameEl = document.getElementById('cfg-bank-name');
    const accNumEl = document.getElementById('cfg-acc-number');
    const accHolderEl = document.getElementById('cfg-acc-holder');
    const dohLinkEl = document.getElementById('doh-link');
    const qrImg = document.getElementById('vietqr-img');

    if (bankNameEl) bankNameEl.innerText = TO_CAM_CONFIG.BANK_NAME;
    if (accNumEl) accNumEl.innerText = TO_CAM_CONFIG.ACCOUNT_NUMBER_DISPLAY || TO_CAM_CONFIG.ACCOUNT_NUMBER;
    if (accHolderEl) accHolderEl.innerText = TO_CAM_CONFIG.ACCOUNT_HOLDER;
    if (dohLinkEl) dohLinkEl.innerText = TO_CAM_CONFIG.DOH_SERVER_URL;
    if (qrImg && TO_CAM_CONFIG.QR_IMAGE_PATH) qrImg.src = TO_CAM_CONFIG.QR_IMAGE_PATH;
  }
}

function selectPlan(element, name, price, formattedPrice, code) {
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  } else {
    let cardEl = null;
    if (code === 'TEST') cardEl = document.getElementById('plan-card-test');
    else if (code === 'MONTH6' || code === '6MONTH') cardEl = document.getElementById('plan-card-6month');
    else if (code === 'YEARLY') cardEl = document.getElementById('plan-card-yearly');
    else cardEl = document.getElementById('plan-card-lifetime');
    if (cardEl) cardEl.classList.add('active');
  }
  selectedPlan = { name, price, formattedPrice, code };

  const planStorageKey = (code === 'TEST') ? 'test' : ((code === 'MONTH6' || code === '6MONTH') ? '6month' : ((code === 'YEARLY') ? 'yearly' : 'lifetime'));
  try {
    localStorage.setItem('tocam_selected_plan', planStorageKey);
  } catch(e) {}

  // Cập nhật text nút bấm ở Bước 1
  const btn1 = document.getElementById('btn-continue-step1');
  if (btn1) {
    if (code === 'TEST') {
      btn1.innerHTML = `<span>Nâng Cấp/Gia Hạn Gói ${formattedPrice}</span> <i class="fa-solid fa-flask"></i>`;
    } else if (code === 'MONTH6' || code === '6MONTH') {
      btn1.innerHTML = `<span>Nâng Cấp/Gia Hạn Gói ${formattedPrice}</span> <i class="fa-solid fa-fire"></i>`;
    } else if (code === 'YEARLY') {
      btn1.innerHTML = `<span>Nâng Cấp/Gia Hạn Gói ${formattedPrice}</span> <i class="fa-solid fa-arrow-right"></i>`;
    } else {
      btn1.innerHTML = `<span>Nâng Cấp/Gia Hạn Gói ${formattedPrice}</span> <i class="fa-solid fa-crown"></i>`;
    }
  }

  // Cập nhật param trên URL mà không reload trang
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('plan', planStorageKey);
    window.history.replaceState({}, '', url.toString());
  } catch (e) {}

  updatePaymentInfo();

  // Phản hồi rung nhẹ xúc giác trên điện thoại
  if (navigator.vibrate) {
    try { navigator.vibrate(25); } catch(e) {}
  }
}

// Chuẩn hóa locket username (hỗ trợ cả dán link profile https://locket.cam/username hoặc alias ngân hàng httpslocketcam...)
function cleanLocketUsername(str) {
  if (!str) return '';
  let u = String(str).toLowerCase().trim();
  if (u.includes('locket.cam/')) {
    u = u.split('locket.cam/')[1].split(/[/?#]/)[0];
  } else if (u.includes('locketcam')) {
    u = u.replace(/.*locketcam/, '').replace(/\.ct.*$/, '');
  }
  u = u.replace(/^@+/, '').trim();
  return u;
}

// Kiểm tra username hợp lệ: chỉ chữ (a-z, A-Z), số (0-9), dấu chấm (.), gạch dưới (_), gạch ngang (-)
function isValidLocketUsername(str) {
  if (!str || typeof str !== 'string') return false;
  const clean = cleanLocketUsername(str);
  if (!clean) return false;
  return /^[a-zA-Z0-9._-]+$/.test(clean);
}

function setUsernameError(show, message) {
  const errEl = document.getElementById('username-error-msg');
  const inputEl = document.getElementById('username-input');
  if (errEl) {
    if (message) {
      const span = errEl.querySelector('span');
      if (span) span.innerText = message;
    }
    errEl.style.display = show ? 'flex' : 'none';
  }
  if (inputEl) {
    if (show) {
      inputEl.classList.add('input-invalid');
    } else {
      inputEl.classList.remove('input-invalid');
    }
  }
}

function fillSampleUsername(val) {
  const input = document.getElementById('username-input');
  if (input) {
    input.value = val || 'kienviet';
    setUsernameError(false);
    lookupUsername();
  }
}
window.fillSampleUsername = fillSampleUsername;

function lookupUsername() {
  const input = document.getElementById('username-input');
  const preview = document.getElementById('user-preview');
  const nameEl = document.getElementById('user-name');
  const userTag = document.getElementById('user-tag');
  const avatarEl = document.getElementById('user-avatar');
  const btn = document.querySelector('.btn-lookup');

  if (!input || !input.value.trim()) {
    setUsernameError(true, 'Vui lòng nhập Username Locket của bạn!');
    if (preview) preview.style.display = 'none';
    input?.focus();
    return;
  }

  const rawUsername = cleanLocketUsername(input.value);
  if (!isValidLocketUsername(rawUsername)) {
    setUsernameError(true, 'Username không hợp lệ (chỉ chữ, số, . _ -)');
    if (preview) preview.style.display = 'none';
    input?.focus();
    return;
  }

  // Hợp lệ -> ẩn lỗi & chuẩn hóa giá trị ô nhập
  setUsernameError(false);
  input.value = rawUsername;
  currentUsername = rawUsername;

  // Hiện preview tạm thời ngay lập tức với avatar đẹp (UX tốt)
  preview.style.display = 'flex';
  nameEl.innerText = rawUsername;
  userTag.innerText = '@' + rawUsername;
  
  const initialAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(rawUsername)}&background=FFA033&color=fff&size=128&bold=true`;
  avatarEl.innerHTML = `<img src="${initialAvatarUrl}" alt="${rawUsername}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.parentElement.innerText='${rawUsername.charAt(0).toUpperCase()}';">`;
  avatarEl.style.padding = '0';
  avatarEl.style.overflow = 'hidden';

  // Đánh dấu nút đang loading
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra...'; }

  // Gọi backend proxy → Locket API để xác minh username thật
  fetch(`${BACKEND_URL}/api/locket/uid/check?username=${encodeURIComponent(rawUsername)}`)
    .then(res => res.json())
    .then(json => {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Kiểm Tra'; }

      if (json.ok && json.data) {
        const d = json.data;
        // Cập nhật preview với thông tin thật
        nameEl.innerText = d.username || rawUsername;
        userTag.innerText = '@' + (d.username || rawUsername);

        // Hiển thị ảnh đại diện thật từ Locket nếu có
        const finalAvatar = d.avatarUrl || initialAvatarUrl;
        currentAvatarUrl = finalAvatar;
        avatarEl.innerHTML = `<img src="${finalAvatar}" alt="${d.username || rawUsername}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.parentElement.innerText='${(d.username || rawUsername).charAt(0).toUpperCase()}';">`;
        avatarEl.style.padding = '0';
        avatarEl.style.overflow = 'hidden';

        // Lưu UID ngay nếu tra được
        if (d.uid) {
          currentUID = d.uid;
        }
        isAccountGoldActive = (d.active === true || d.status === 'ACTIVE');

        // Cập nhật badge trạng thái (luôn hiển thị Hợp lệ)
        const badgeWrap = preview.querySelector('div[style*="margin-left: auto"]');
        if (badgeWrap) {
          badgeWrap.innerHTML = `
            <span style="background:rgba(16,185,129,0.2);color:#10B981;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;">
              <i class="fa-solid fa-circle-check"></i> Hợp lệ
            </span>`;
        }
        updatePaymentInfo();
      } else {
        // API trả not found hoặc lỗi nhẹ → vẫn cho tiếp tục nhưng cảnh báo
        console.warn('[LOOKUP] Không tra được username:', json.message);
        updatePaymentInfo();
      }
    })
    .catch(err => {
      // Backend offline hoặc key chưa cấu hình → fallback silent (vẫn cho tiếp tục)
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Kiểm Tra'; }
      console.warn('[LOOKUP] Backend không phản hồi, bỏ qua kiểm tra:', err.message);
      updatePaymentInfo();
    });
}

function goToStep(step) {
  if (step === 3 && !isPaymentVerified) {
    alert('⚠️ Bạn chưa hoàn tất thanh toán. Vui lòng hoàn tất thanh toán ở Bước 2 để hệ thống trừ coin & cấp cấu hình DNS!');
    goToStep(2);
    return;
  }

  if (step === 2) {
    const input = document.getElementById('username-input');
    const inputVal = input ? input.value.trim() : '';
    const candidate = inputVal || currentUsername || '';
    const cleaned = cleanLocketUsername(candidate);

    if (!cleaned) {
      setUsernameError(true, 'Vui lòng nhập Username Locket của bạn trước khi sang bước thanh toán!');
      input?.focus();
      return;
    }

    if (!isValidLocketUsername(cleaned)) {
      setUsernameError(true, 'Username không hợp lệ (chỉ chữ, số, . _ -)');
      input?.focus();
      return;
    }

    setUsernameError(false);
    if (input) input.value = cleaned;
    currentUsername = cleaned;
    isPaymentVerified = false; // Luôn yêu cầu chuyển khoản cho mỗi phiên giao dịch
    paymentSessionStartTime = Date.now(); // Khởi tạo mốc thời gian phiên thanh toán mới
    isPaymentTransitioning = false;
    updatePaymentInfo();
    loadRecentTransactions();
    startPaymentTimer();
    startPaymentPolling(); // ← Bắt đầu polling tự động!
  }

  // Dừng polling khi rời khỏi bước 2
  if (step !== 2) {
    stopPaymentPolling();
  }

  currentStep = step;
  document.querySelectorAll('.wizard-step').forEach(s => s.style.display = 'none');
  const targetStep = document.getElementById(`step-${step}`);
  if (targetStep) targetStep.style.display = 'block';

  // Cập nhật thanh Stepper
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`stepper-${i}`);
    if (stepEl) {
      stepEl.classList.remove('active', 'completed');
      if (i === currentStep) {
        stepEl.classList.add('active');
      } else if (i < currentStep) {
        stepEl.classList.add('completed');
      }
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Ở bước 3: Chờ người dùng nhấn nút kích hoạt, không tự động kích hoạt
  if (step === 3) {
    const terminal = document.getElementById('terminal-content');
    if (terminal) {
      terminal.innerHTML = `
        <div class="terminal-line info">[SẴN SÀNG] Đã xác nhận thanh toán tài khoản @${currentUsername || 'bạn'}</div>
        <div class="terminal-line gold">[HƯỚNG DẪN] 👉 Nhấn nút "Kích Hoạt Gold &amp; Nhận Cấu Hình DNS" bên dưới để nhận file cài đặt!</div>
      `;
    }
    const pendingDns = document.getElementById('dns-actions-pending');
    const readyDns = document.getElementById('dns-actions-ready');
    if (pendingDns) pendingDns.style.display = 'flex';
    if (readyDns) readyDns.style.display = 'none';
  }
}

// ============================================
// KIỂM TRA USERNAME TRƯỚC KHI SANG BƯỚC 3
// ============================================
async function proceedToStep3() {
  const input = document.getElementById('username-input');
  const usernameRaw = (input ? input.value.trim().replace('@', '') : '') || currentUsername;

  if (!usernameRaw) {
    input?.focus();
    alert('Vui lòng nhập Username Locket của bạn trước!');
    return;
  }

  // Đảm bảo currentUsername đã set
  currentUsername = usernameRaw;

  // Nếu chưa tra username thì tự động tra trước khi sang bước 3
  if (!currentUID) {
    const btn = document.querySelector('#step-1 .btn-primary-action');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang kiểm tra tài khoản...</span>'; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/locket/uid/check?username=${encodeURIComponent(usernameRaw)}`);
      const json = await res.json();
      if (json.ok && json.data) {
        // { ok: true, data: { uid: "xxx", active: false, ... } }
        const d = json.data;
        if (d.uid) {
          currentUID = d.uid;
          isAccountGoldActive = (d.active === true || d.status === 'ACTIVE');
          console.log('[STEP3] UID tìm thấy:', currentUID, '| active:', d.active, '| status:', d.status);
        }
      }
    } catch (e) {
      console.warn('[STEP3] Không tra được UID, tiếp tục không có UID:', e.message);
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>Tiếp Tục &gt; Cài Đặt DNS</span><i class="fa-solid fa-arrow-right"></i>'; }
  }

  goToStep(3);
}

// Chuẩn hoá nội dung chuyển khoản an toàn: chỉ gồm chữ cái và số (loại bỏ dấu chấm, gạch)
// Giúp 100% app ngân hàng (Vietcombank, MB, Techcombank, BIDV, VPBank...) KHÔNG bao giờ báo lỗi
function getSafePaymentMemo(u) {
  const clean = (u || 'VIP').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `TOCAM ${clean || 'VIP'}`;
}

function updatePaymentInfo() {
  const amountEl = document.getElementById('pay-amount');
  const memoEl = document.getElementById('pay-memo');
  const qrImg = document.getElementById('vietqr-img');

  const memo = getSafePaymentMemo(currentUsername);
  if (amountEl) amountEl.innerText = selectedPlan.formattedPrice;
  if (memoEl) memoEl.innerText = memo;

  // Cập nhật thông tin hàng giao dịch đang chờ ở bước 2
  const currentTxUser = document.getElementById('step2-current-tx-user');
  const currentTxMemo = document.getElementById('step2-current-tx-memo');
  const currentTxAmount = document.getElementById('step2-current-tx-amount');
  const currentTxRow = document.getElementById('step2-current-tx-row');
  const currentTxIcon = document.getElementById('step2-current-tx-icon');
  const currentTxBadge = document.getElementById('step2-current-tx-badge');
  const currentTxSub = document.getElementById('step2-current-tx-sub');

  const usernameDisplay = currentUsername || 'VIP';
  if (currentTxUser) {
    currentTxUser.innerHTML = `@${usernameDisplay} <span style="font-size:11px; font-weight:600; color:#38BDF8; margin-left:4px;">${selectedPlan.name}</span>`;
  }
  if (currentTxMemo) currentTxMemo.innerText = memo;
  if (currentTxAmount) currentTxAmount.innerText = `+${selectedPlan.formattedPrice}`;

  if (!isPaymentTransitioning) {
    if (currentTxRow) currentTxRow.className = 'step2-tx-row pending';
    if (currentTxIcon) {
      currentTxIcon.className = 'step2-tx-icon pending';
      currentTxIcon.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }
    if (currentTxBadge) {
      currentTxBadge.className = 'step2-tx-badge pending';
      currentTxBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang chờ...';
    }
    if (currentTxSub) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      currentTxSub.innerHTML = `<span>Nội dung: <b style="color:#38BDF8;">${memo}</b></span> &bull; <span>Lúc ${timeStr}</span>`;
    }
  }

  // Sử dụng VietQR động tạo mã QR Napas247 tự động kèm sẵn số tiền & nội dung chuyển khoản
  if (qrImg) {
    if (typeof TO_CAM_CONFIG !== 'undefined' && TO_CAM_CONFIG.QR_IMAGE_PATH) {
      qrImg.src = TO_CAM_CONFIG.QR_IMAGE_PATH;
    } else {
      const bankId = (typeof TO_CAM_CONFIG !== 'undefined' && TO_CAM_CONFIG.BANK_ID) ? TO_CAM_CONFIG.BANK_ID : 'VPB';
      const accNo = (typeof TO_CAM_CONFIG !== 'undefined' && TO_CAM_CONFIG.ACCOUNT_NUMBER) ? TO_CAM_CONFIG.ACCOUNT_NUMBER : '643391953';
      const template = 'compact2';
      const amount = selectedPlan.price;
      qrImg.src = `https://img.vietqr.io/image/${bankId}-${accNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent((typeof TO_CAM_CONFIG !== 'undefined' && TO_CAM_CONFIG.ACCOUNT_HOLDER) ? TO_CAM_CONFIG.ACCOUNT_HOLDER : 'NGUYEN MINH HIEP')}`;
    }
  }
}

function copyText(text, successMsg = 'Đã sao chép vào bộ nhớ tạm!') {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert(successMsg);
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert(successMsg);
  }
}

function copyCurrentMemo() {
  const memo = getSafePaymentMemo(currentUsername);
  copyText(memo, `Đã chép nội dung: ${memo}`);
}

function copyCurrentAccountNumber() {
  const accNo = (typeof TO_CAM_CONFIG !== 'undefined') ? TO_CAM_CONFIG.ACCOUNT_NUMBER : '2027022007';
  copyText(accNo, `Đã chép số tài khoản: ${accNo}`);
}

let timerInterval;
let paymentPollInterval;
let isPaymentTransitioning = false;

// Đổi trạng thái hàng giao dịch ở bước 2 thành "Thành công" và tự động chuyển sang bước 3
function markPaymentSuccessAndProceed(data) {
  if (isPaymentTransitioning) return;
  isPaymentTransitioning = true;
  isPaymentVerified = true; // Đánh dấu thanh toán thành công tuyệt đối!

  console.log('[PAYMENT] ✅ Chuyển trạng thái giao dịch sang THÀNH CÔNG và sang Bước 3!');

  if (data && data.uid) {
    currentUID = data.uid;
    console.log('[PAYMENT] UID Locket:', currentUID);
  }

  stopPaymentPolling();
  if (timerInterval) clearInterval(timerInterval);

  // 1. Cập nhật khối đơn hàng đang chờ thành 'Đã nhận tiền thành công'
  const pendingWrap = document.getElementById('step2-pending-card-wrap');
  const pendingPulse = document.getElementById('step2-pending-pulse');
  const pendingTitle = document.getElementById('step2-pending-title');
  const pendingTag = document.getElementById('step2-pending-tag');
  const currentTxRow = document.getElementById('step2-current-tx-row');
  const currentTxIcon = document.getElementById('step2-current-tx-icon');
  const currentTxBadge = document.getElementById('step2-current-tx-badge');
  const currentTxAmount = document.getElementById('step2-current-tx-amount');
  const currentTxSub = document.getElementById('step2-current-tx-sub');

  if (pendingWrap) {
    pendingWrap.style.background = 'rgba(16, 185, 129, 0.08)';
    pendingWrap.style.borderColor = '#10B981';
  }
  if (pendingPulse) pendingPulse.style.background = '#10B981';
  if (pendingTitle) {
    pendingTitle.innerText = 'ĐÃ NHẬN TIỀN THÀNH CÔNG!';
    pendingTitle.style.color = '#10B981';
  }
  if (pendingTag) {
    pendingTag.innerText = 'Đã Xác Nhận';
    pendingTag.style.background = 'rgba(16, 185, 129, 0.2)';
    pendingTag.style.color = '#10B981';
    pendingTag.style.borderColor = '#10B981';
  }

  if (currentTxRow) currentTxRow.className = 'step2-tx-row success';
  if (currentTxIcon) {
    currentTxIcon.className = 'step2-tx-icon success';
    currentTxIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
  }
  if (currentTxBadge) {
    currentTxBadge.className = 'step2-tx-badge success';
    currentTxBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Thành công';
  }
  if (currentTxAmount) currentTxAmount.className = 'step2-tx-amount success';
  if (currentTxSub) {
    currentTxSub.innerHTML = '<span style="color:#10B981; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Đã nhận tiền thành công! Đang chuyển bước 3...</span>';
  }

  // 2. LƯU LỊCH SỬ GIAO DỊCH THÀNH CÔNG VÀO HỆ THỐNG & ĐẨY VÀO TRANG ĐẦU
  const rawU = (currentUsername || 'VIP').toLowerCase().replace('@', '');
  const planCode = selectedPlan ? selectedPlan.code : 'LIFETIME';
  const txId = (data && data.txId) || `tx_${Date.now()}`;
  const completedItem = {
    username: rawU,
    plan: planCode,
    amount: selectedPlan ? selectedPlan.price : 119000,
    time: new Date().toISOString(),
    txId: txId,
    status: 'success',
    avatarUrl: currentAvatarUrl || (KNOWN_AVATARS[rawU] || null)
  };

  // Thêm vào danh sách bộ nhớ và lưu vào localStorage ngay lập tức
  allRecentTransactions = allRecentTransactions.filter(x => x && x.txId !== txId);
  allRecentTransactions.unshift(completedItem);

  try {
    let saved = JSON.parse(localStorage.getItem('tocam_recent_transactions') || '[]');
    saved = saved.filter(x => x && x.txId !== txId);
    saved.unshift(completedItem);
    if (saved.length > 100) saved.pop();
    localStorage.setItem('tocam_recent_transactions', JSON.stringify(saved));
  } catch (e) {}

  // Đưa về trang 1 để người mua mới lập tức xuất hiện ở đầu bảng,
  // nếu hàng đầy thì các hàng cũ hơn sẽ tự động đẩy sang các trang sau!
  currentTxPage = 1;
  renderRecentTxPage();

  // Đồng bộ lên backend để lưu vào file transactions.json
  const syncToBackend = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/record-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completedItem)
      });
    } catch (err) {
      if (BACKEND_URL.includes('localhost') || BACKEND_URL.includes('127.0.0.1')) {
        try {
          await fetch('https://lockettocam.up.railway.app/api/record-transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(completedItem)
          });
        } catch (e) {}
      }
    }
  };
  syncToBackend();

  // 3. Chờ 1.2s để người dùng nhìn thấy rõ chữ "Thành công" rồi hiện animation và chuyển bước 3
  setTimeout(() => {
    showPaymentSuccessAnimation(() => {
      goToStep(3);
      isPaymentTransitioning = false;
    });
  }, 1200);
}

// ============================================
// POLLING KIỂM TRA THANH TOÁN TỰ ĐỘNG
// Hỏi backend mỗi 2 giây khi đang ở bước 2, gửi kèm timestamp phiên thanh toán
// ============================================
function startPaymentPolling() {
  stopPaymentPolling();
  if (!currentUsername) return;

  console.log('[POLLING] Bắt đầu kiểm tra thanh toán cho @' + currentUsername + ' (since: ' + paymentSessionStartTime + ')');

  paymentPollInterval = setInterval(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/check-payment?username=${encodeURIComponent(currentUsername)}&since=${paymentSessionStartTime}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.paid) {
        console.log('[POLLING] ✅ Đã thanh toán! Locket status:', data.locketStatus);
        markPaymentSuccessAndProceed(data);
      } else if (data.consumed) {
        console.log('[POLLING] Giao dịch trước đã hoàn tất kích hoạt. Chờ chuyển khoản mới để gia hạn...');
      }
    } catch (e) {
      // Backend chưa sẵn hoặc offline - bỏ qua lỗi im lặng
      console.warn('[POLLING] Backend không phản hồi:', e.message);
    }
  }, 2000);
}

function stopPaymentPolling() {
  if (paymentPollInterval) {
    clearInterval(paymentPollInterval);
    paymentPollInterval = null;
  }
}

// Người dùng chủ động bấm "Tôi Đã Chuyển Khoản — Nâng Cấp Ngay" ở Bước 2
async function confirmPaymentAndProceed() {
  const btn = document.getElementById('btn-paid-proceed');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang xác nhận với ngân hàng...</span>';
  }

  const userToQuery = currentUsername || 'VIP';

  try {
    const res = await fetch(`${BACKEND_URL}/check-payment?username=${encodeURIComponent(userToQuery)}&since=${paymentSessionStartTime}`);
    if (res.ok) {
      const data = await res.json();
      if (data.paid) {
        if (btn) {
          btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Đã xác nhận thanh toán!</span>';
        }
        markPaymentSuccessAndProceed(data);
        return;
      }
    }
  } catch (e) {
    console.warn('[CONFIRM_PAY] Lỗi polling:', e.message);
  }

  // BẢO MẬT: Bắt buộc thanh toán thật thành công mới sang bước 3, KHÔNG cho phép bỏ qua!
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-bolt"></i> <span>Tôi Đã Chuyển Khoản — Nâng Cấp Ngay</span>';
  }

  const memo = `TOCAM ${currentUsername || 'VIP'}`.toUpperCase();
  alert(`⚠️ Hệ thống chưa nhận được thanh toán từ ngân hàng!\n\n` +
        `• Số tiền cần chuyển: ${selectedPlan.formattedPrice}\n` +
        `• Đúng nội dung chuyển: ${memo}\n\n` +
        `Nếu bạn vừa chuyển khoản, vui lòng đợi 10 - 30 giây để ngân hàng đồng bộ dữ liệu. Hệ thống sẽ tự động chuyển sang bước 3 ngay khi nhận được tiền!`);
}

// Animation chúc mừng khi thanh toán thành công
function showPaymentSuccessAnimation(callback) {
  const step2 = document.getElementById('step-2');
  if (!step2) { callback(); return; }

  // Tạo overlay "Đã thanh toán!"
  const overlay = document.createElement('div');
  overlay.innerHTML = `
    <div style="
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(7,9,14,0.92);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      animation: fadeIn 0.3s ease;
    ">
      <div style="font-size: 72px; animation: bounceIn 0.6s ease;">🎊</div>
      <h2 style="
        font-family: 'Fredoka', sans-serif;
        color: #FF7A00; font-size: 28px;
        margin: 16px 0 8px; text-align:center;
      ">Thanh Toán Thành Công!</h2>
      <p style="color: #94A3B8; font-size: 14px; text-align:center;">
        Đang chuyển sang bước cài đặt DNS...
      </p>
      <div style="
        width: 200px; height: 4px;
        background: rgba(255,122,0,0.2);
        border-radius: 99px; margin-top: 20px; overflow:hidden;
      ">
        <div id="success-bar" style="
          height: 100%; width: 0%;
          background: linear-gradient(90deg, #FF7A00, #FFB000);
          border-radius: 99px;
          transition: width 1.8s ease;
        "></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Animate thanh tiến trình
  setTimeout(() => {
    const bar = document.getElementById('success-bar');
    if (bar) bar.style.width = '100%';
  }, 50);

  // Chuyển sang bước 3 sau 2 giây
  setTimeout(() => {
    overlay.remove();
    callback();
  }, 2000);
}
function startPaymentTimer() {
  clearInterval(timerInterval);
  let timeLeft = 600; // 10 phút đếm ngược
  const timerEl = document.getElementById('timer-count');

  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (timerEl) timerEl.innerText = '00:00 (Hết hạn)';
      return;
    }
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    if (timerEl) {
      timerEl.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

// Thêm log dòng vào terminal
function termLog(terminal, text, type) {
  const p = document.createElement('div');
  p.className = `terminal-line ${type}`;
  p.innerText = text;
  terminal.appendChild(p);
  terminal.scrollTop = terminal.scrollHeight;
}

async function checkActivation() {
  const terminal = document.getElementById('terminal-content');
  const btn = document.querySelector('#step-3 .btn-primary-action');
  if (!terminal) return;

  terminal.innerHTML = '';
  if (btn) { 
    btn.disabled = true; 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang xử lý cấu hình...</span>'; 
  }

  termLog(terminal, '[HỆ THỐNG] Đang chuẩn bị cấu hình Locket Gold...', 'info');

  const username = currentUsername || document.getElementById('username-input')?.value?.trim().replace('@', '') || '';
  if (!currentUsername && username) currentUsername = username;

  if (!username && !currentUID) {
    terminal.innerHTML = '';
    termLog(terminal, '[LỖI] Chưa có thông tin tài khoản. Vui lòng quay lại bước 1!', 'info');
    if (btn) { 
      btn.disabled = false; 
      btn.innerHTML = '<i class="fa-solid fa-bolt"></i> <span>Kích Hoạt Gold &amp; Nhận Cấu Hình DNS</span>'; 
    }
    return;
  }

  // 1. Kiểm tra UID thực tế nếu chưa có
  let uid = currentUID;

  try {
    const checkRes = await fetch(`${BACKEND_URL}/api/locket/uid/check?username=${encodeURIComponent(username)}`);
    const checkJson = await checkRes.json();
    if (checkJson.ok && checkJson.data) {
      const d = checkJson.data;
      if (d.uid) {
        uid = d.uid;
        currentUID = uid;
      }
    }
  } catch (err) {
    console.warn('[ACTIVATION] Lỗi kiểm tra UID:', err.message);
  }

  // 2. KÍCH HOẠT / GIA HẠN THÊM DỊCH VỤ:
  // DÙ USERNAME ĐÃ GOLD HAY CHƯA ĐỀU PHẢI GỌI ĐỂ GIA HẠN THÊM THỜI GIAN
  termLog(terminal, `[GIA HẠN DỊCH VỤ] ⚡ Đang kết nối máy chủ kích hoạt gói ${selectedPlan.name}...`, 'info');
  try {
    const activateRes = await fetch(`${BACKEND_URL}/api/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, plan: selectedPlan ? selectedPlan.code : 'LIFETIME' })
    });
    const activateJson = await activateRes.json();

    if (activateRes.status === 403) {
      terminal.innerHTML = '';
      termLog(terminal, `[LỖI THANH TOÁN] ${activateJson.message || 'Chưa hoàn tất thanh toán. Vui lòng thanh toán ở Bước 2!'}`, 'info');
      alert(activateJson.message || 'Vui lòng hoàn tất thanh toán trước khi nhận cấu hình DNS!');
      isPaymentVerified = false;
      goToStep(2);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-bolt"></i> <span>Kích Hoạt Gold &amp; Nhận Cấu Hình DNS</span>'; }
      return;
    }

    if (activateRes.ok && activateJson.ok) {
      isAccountGoldActive = true;
      if (activateJson.uid) {
        uid = activateJson.uid;
        currentUID = uid;
      }
      termLog(terminal, `[THÀNH CÔNG] ✅ Đã gia hạn thành công gói ${selectedPlan.name}!`, 'success');
      if (activateJson.expiresAt) {
        const expDate = new Date(activateJson.expiresAt).toLocaleDateString('vi-VN');
        termLog(terminal, `[HẠN DÙNG MỚI] 📅 Hạn sử dụng sau khi gia hạn: ${expDate}`, 'gold');
      }
    } else if (activateRes.status === 409) {
      isAccountGoldActive = true;
      termLog(terminal, `[GIA HẠN] ✅ Tài khoản Locket Gold hợp lệ, đang đồng bộ hồ sơ DNS...`, 'info');
    } else {
      console.warn('[ACTIVATION] Phản hồi kích hoạt:', activateJson);
      termLog(terminal, `[THÔNG BÁO] ${activateJson.message || 'Đang đồng bộ cấu hình DNS...'}`, 'info');
    }
  } catch (activateErr) {
    console.warn('[ACTIVATION] Lỗi kích hoạt:', activateErr.message);
  }

  // 3. Tải profile .mobileconfig ngầm
  try {
    const bodyData = uid ? { uid } : { username };
    const profileRes = await fetch(`${BACKEND_URL}/api/locket/profile/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    if (profileRes.ok) {
      const blob = await profileRes.blob();
      const url = URL.createObjectURL(blob);
      const directDownloadLink = uid 
        ? `${BACKEND_URL}/api/locket/profile/download?uid=${encodeURIComponent(uid)}`
        : `${BACKEND_URL}/api/locket/profile/download?username=${encodeURIComponent(username)}`;

      terminal.innerHTML = '';
      termLog(terminal, '[HOÀN TẤT] ✅ Cấu hình Locket Gold đã sẵn sàng!', 'success');
      termLog(terminal, '[HƯỚNG DẪN] Cài đặt hồ sơ vào iPhone bằng Safari để nhận đặc quyền Gold.', 'gold');

      // Tạo nút TẢI FILE trực tiếp trong terminal
      const dlBtn = document.createElement('a');
      dlBtn.href = url;
      dlBtn.download = 'LocketGold.mobileconfig';
      dlBtn.className = 'terminal-line success';
      dlBtn.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px 12px;background:rgba(16,185,129,0.15);border:1px solid #10B981;border-radius:10px;cursor:pointer;text-decoration:none;font-weight:800;color:#10B981;';
      dlBtn.innerHTML = '⬇️ TẢI FILE .mobileconfig (Mở Safari trên iPhone)';
      terminal.appendChild(dlBtn);

      // Tạo nút SAO CHÉP LINK TẢI trực tiếp trong terminal
      const copyBtnTerm = document.createElement('div');
      copyBtnTerm.className = 'terminal-line gold';
      copyBtnTerm.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:6px;padding:8px 12px;background:rgba(255,160,51,0.15);border:1px solid #FFA033;border-radius:10px;cursor:pointer;font-weight:800;color:#FFA033;';
      copyBtnTerm.innerHTML = '📋 SAO CHÉP LINK TẢI HỒ SƠ DNS (Dán vào Safari)';
      copyBtnTerm.onclick = () => {
        copyText(directDownloadLink, 'Đã sao chép link tải hồ sơ DNS! Mở Safari dán link để cài đặt.');
      };
      terminal.appendChild(copyBtnTerm);

      terminal.scrollTop = 0;

      // Tự động kích hoạt tải file
      dlBtn.click();

      // Cập nhật nút tải chính ở guide-box
      const downloadBtn = document.getElementById('btn-download-dns');
      if (downloadBtn) {
        downloadBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = url;
          a.download = 'LocketGold.mobileconfig';
          document.body.appendChild(a);
          a.click();
          a.remove();
        };
        downloadBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Tải Lại Hồ Sơ DNS (.mobileconfig)</span>';
      }
      // Hiển thị phần Tải và Sao chép Link ở Bước 1
      const pendingDns = document.getElementById('dns-actions-pending');
      const readyDns = document.getElementById('dns-actions-ready');
      if (pendingDns) pendingDns.style.display = 'none';
      if (readyDns) readyDns.style.display = 'flex';
    } else {
      terminal.innerHTML = '';
      termLog(terminal, '[THÔNG BÁO] Đã kích hoạt gói Gold thành công! Vui lòng tải hồ sơ DNS bên dưới.', 'success');
      // Vẫn mở nút tải trực tiếp cho người dùng
      const pendingDns = document.getElementById('dns-actions-pending');
      const readyDns = document.getElementById('dns-actions-ready');
      if (pendingDns) pendingDns.style.display = 'none';
      if (readyDns) readyDns.style.display = 'flex';
    }
  } catch (err) {
    terminal.innerHTML = '';
    console.error('[ACTIVATION] Lỗi tải profile:', err.message);
    termLog(terminal, '[HOÀN TẤT] Đã ghi nhận kích hoạt! Vui lòng bấm Tải cấu hình DNS bên dưới.', 'gold');
    const pendingDns = document.getElementById('dns-actions-pending');
    const readyDns = document.getElementById('dns-actions-ready');
    if (pendingDns) pendingDns.style.display = 'none';
    if (readyDns) readyDns.style.display = 'flex';
  }

  if (btn) { 
    btn.disabled = false; 
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Đã Kích Hoạt Thành Công & Nhận DNS</span>'; 
  }
}

// ============================================
// HÀM TẢI PROFILE DNS TRỰC TIẾP TỪ LOCKET CỤ CAM
// ============================================
async function downloadProfileDNS() {
  const btn = document.getElementById('btn-download-dns');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang tạo cấu hình DNS...</span>';
  }

  try {
    const uid = currentUID;
    const bodyData = uid ? { uid } : { username: currentUsername };

    const res = await fetch(`${BACKEND_URL}/api/locket/profile/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'LocketGold.mobileconfig';
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Đã tải cấu hình thành công!</span>';
        setTimeout(() => { btn.innerHTML = originalText; }, 4000);
      }
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'Không thể tạo file cấu hình DNS. Vui lòng thử lại hoặc liên hệ CSKH.');
      if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
    }
  } catch (e) {
    console.error('[DNS DOWNLOAD]', e);
    alert('Lỗi kết nối máy chủ khi tạo DNS profile.');
    if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
  }
}

// ============================================
// HÀM SAO CHÉP LINK TẢI DNS PROFILE
// ============================================
function copyDNSDownloadLink() {
  const targetUid = currentUID || '';
  const directLink = targetUid 
    ? `${BACKEND_URL}/api/locket/profile/download?uid=${encodeURIComponent(targetUid)}`
    : `${BACKEND_URL}/api/locket/profile/download?username=${encodeURIComponent(currentUsername || 'khach_hang')}`;
  copyText(directLink, 'Đã sao chép link tải file cấu hình DNS (.mobileconfig)! Mở trên Safari iPhone để cài đặt.');
}

// ============================================
// LỊCH SỬ GIAO DỊCH GẦN ĐÂY Ở BƯỚC 2 (PHÂN TRANG & TỰ ĐỘNG ĐẨY HÀNG)
// ============================================
let currentTxPage = 1;
const TX_PAGE_SIZE = 5; // 5 đơn mỗi trang, khi đầy hàng sẽ tự động đẩy sang trang khác
let allRecentTransactions = [];

function formatRelativeOrAbsoluteTime(timeInput) {
  if (!timeInput) return 'Vừa xong';
  const d = new Date(timeInput);
  if (isNaN(d.getTime())) return 'Gần đây';
  
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours} giờ trước`;
  }
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function changeTxPage(p) {
  const total = allRecentTransactions.length;
  const totalPages = Math.max(1, Math.ceil(total / TX_PAGE_SIZE));
  if (p < 1 || p > totalPages || p === currentTxPage) return;
  currentTxPage = p;
  renderRecentTxPage();
  const txBox = document.querySelector('.step2-tx-history-box');
  if (txBox) {
    txBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
window.changeTxPage = changeTxPage;

function jumpToTxPage() {
  const input = document.getElementById('step2-tx-jump-input');
  if (!input) return;
  const p = parseInt(input.value, 10);
  const total = allRecentTransactions.length;
  const totalPages = Math.max(1, Math.ceil(total / TX_PAGE_SIZE));
  if (isNaN(p) || p < 1 || p > totalPages) {
    input.classList.add('error');
    input.focus();
    setTimeout(() => { if (input) input.classList.remove('error'); }, 1200);
    return;
  }
  input.value = '';
  changeTxPage(p);
}
window.jumpToTxPage = jumpToTxPage;

function renderRecentTxPage() {
  const container = document.getElementById('step2-recent-txs') || document.getElementById('tx-history-list');
  const paginationEl = document.getElementById('step2-tx-pagination');
  if (!container) return;

  const total = allRecentTransactions.length;
  if (total === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:18px 10px; color:#64748B; font-size:12px;">
        <i class="fa-regular fa-clock" style="font-size:18px; margin-bottom:6px; display:block;"></i>
        Chưa có giao dịch thành công nào
      </div>
    `;
    if (paginationEl) paginationEl.style.display = 'none';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / TX_PAGE_SIZE));
  if (currentTxPage > totalPages) currentTxPage = totalPages;
  if (currentTxPage < 1) currentTxPage = 1;

  const startIndex = (currentTxPage - 1) * TX_PAGE_SIZE;
  const endIndex = Math.min(startIndex + TX_PAGE_SIZE, total);
  const pageItems = allRecentTransactions.slice(startIndex, endIndex);

  container.innerHTML = pageItems.map((tx) => {
    const isLifetime = tx.plan === 'LIFETIME';
    const isTest = tx.plan === 'TEST';
    const isMonth6 = tx.plan === 'MONTH6' || tx.plan === '6MONTH';
    const planName = isLifetime ? 'Gói Vĩnh Viễn' : (isTest ? 'Gói Test 1 Ngày' : (isMonth6 ? 'Gói 6 Tháng' : 'Gói 1 Năm'));
    const planColor = isLifetime ? '#FFA033' : (isTest ? '#C084FC' : (isMonth6 ? '#10B981' : '#38BDF8'));
    const formattedAmount = Number(tx.amount || (isLifetime ? 119000 : (isTest ? 9000 : (isMonth6 ? 39000 : 69000)))).toLocaleString('vi-VN') + 'đ';
    const timeStr = formatRelativeOrAbsoluteTime(tx.time);
    
    // Che 2 ký tự giữa của username để bảo mật thông tin khách hàng thật
    const u = (tx.username || 'khach_hang').toLowerCase();
    let masked = u;
    if (u.length <= 3) {
      masked = u.charAt(0) + '**' + u.slice(-1);
    } else {
      masked = u.slice(0, 2) + '***' + u.slice(-2);
    }

    const avatarSrc = (tx.avatarUrl && tx.avatarUrl.includes('http'))
      ? tx.avatarUrl
      : (KNOWN_AVATARS[u] || null);

    const isVeryRecent = tx.time && (Date.now() - new Date(tx.time).getTime() < 15000);
    const popAnimStyle = isVeryRecent ? 'animation: successPop 0.5s ease-out forwards; border: 1.5px solid #10B981;' : '';

    return `
      <div class="step2-tx-row completed" style="${popAnimStyle}">
        <div class="step2-tx-left">
          ${avatarSrc ? `
            <img src="${avatarSrc}" alt="${masked}" class="step2-tx-avatar-img"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              referrerpolicy="no-referrer">
            <div class="step2-tx-icon completed" style="display:none;">
              <i class="fa-solid fa-check"></i>
            </div>
          ` : `
            <div class="step2-tx-icon completed">
              <i class="fa-solid fa-check"></i>
            </div>
          `}
          <div class="step2-tx-info">
            <div class="step2-tx-title">
              @${masked} <span style="font-size: 11px; font-weight: 700; color: ${planColor}; margin-left: 4px;">${planName}</span>
            </div>
            <div class="step2-tx-sub">
              <span>Lúc ${timeStr}</span> &bull; <span style="color:#10B981;">Tự động kích hoạt</span>
            </div>
          </div>
        </div>
        <div class="step2-tx-right">
          <span class="step2-tx-amount completed">+${formattedAmount}</span>
          <span class="step2-tx-badge completed">
            <i class="fa-solid fa-check"></i> Thành công
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Render thanh phân trang chuẩn với nút < Lùi, Trang X/Y, Tiến > và ô Nhảy đến trang
  if (paginationEl) {
    if (totalPages <= 1) {
      paginationEl.style.display = 'none';
    } else {
      paginationEl.style.display = 'flex';
      
      let pageButtonsHtml = '';
      for (let p = 1; p <= totalPages; p++) {
        if (totalPages > 5 && Math.abs(p - currentTxPage) > 1 && p !== 1 && p !== totalPages) {
          if (p === 2 || p === totalPages - 1) {
            pageButtonsHtml += `<span class="step2-tx-page-dots">&hellip;</span>`;
          }
          continue;
        }
        pageButtonsHtml += `
          <button type="button" class="step2-tx-page-btn ${p === currentTxPage ? 'active' : ''}" onclick="changeTxPage(${p})">
            ${p}
          </button>
        `;
      }

      paginationEl.innerHTML = `
        <div class="step2-tx-page-group">
          <button type="button" class="step2-tx-btn-nav btn-prev" ${currentTxPage === 1 ? 'disabled' : ''} onclick="changeTxPage(${currentTxPage - 1})" title="Về trang trước">
            <i class="fa-solid fa-chevron-left"></i>
            <span>Lùi</span>
          </button>

          <div class="step2-tx-page-indicator">
            <span>Trang <b class="page-curr">${currentTxPage}</b> / <span class="page-total">${totalPages}</span></span>
          </div>

          <button type="button" class="step2-tx-btn-nav btn-next" ${currentTxPage === totalPages ? 'disabled' : ''} onclick="changeTxPage(${currentTxPage + 1})" title="Sang trang sau">
            <span>Tiến</span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div class="step2-tx-page-nums">
          ${pageButtonsHtml}
        </div>

        <div class="step2-tx-divider"></div>

        <div class="step2-tx-jump-box">
          <input type="number" class="step2-tx-jump-input" id="step2-tx-jump-input"
            min="1" max="${totalPages}" placeholder="Nhảy đến"
            onkeydown="if(event.key==='Enter'){event.preventDefault();jumpToTxPage();}" />
          <button type="button" class="step2-tx-jump-btn" onclick="jumpToTxPage()" title="Chuyển đến trang này">
            <span>Đi</span>
          </button>
        </div>
      `;
    }
  }
}

async function loadRecentTransactions() {
  const container = document.getElementById('step2-recent-txs') || document.getElementById('tx-history-list');
  if (!container) return;

  try {
    let serverList = [];
    try {
      const res = await fetch(`${BACKEND_URL}/api/recent-transactions`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          serverList = json.data;
        }
      }
    } catch (e) {}

    // Fallback sang Railway nếu serverList rỗng và BACKEND_URL là localhost
    if (serverList.length === 0 && (BACKEND_URL.includes('localhost') || BACKEND_URL.includes('127.0.0.1'))) {
      try {
        const fbRes = await fetch('https://lockettocam.up.railway.app/api/recent-transactions');
        if (fbRes.ok) {
          const json = await fbRes.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            serverList = json.data;
          }
        }
      } catch (e) {}
    }

    let localList = [];
    try {
      localList = JSON.parse(localStorage.getItem('tocam_recent_transactions') || '[]');
    } catch (e) {}

    const defaultSeedList = [
      { username: 'kienviet', plan: 'TEST', amount: 9000, time: "2026-10-14T10:33:00.000Z", txId: 89862435, avatarUrl: "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2Ft9iNECEtx2dJE9n36VvYb9xoMxy2%2Fpublic%2Fprofile_pic.webp?alt=media&token=dd907711-a017-4c82-8069-21154ec58e21" },
      { username: 'ney_ihnn', plan: 'TEST', amount: 9000, time: "2026-10-14T05:43:00.000Z", txId: "89790277", avatarUrl: "https://cdn2.locketcamera.com/v0/b/locket-img/o/users%2FTmSHu7R3CnYENbOk4roifJlWdD12%2Fpublic%2Fprofile_pic.webp?alt=media&token=19a21efb-5e7c-4c62-9a51-c8a24d1f25cd" },
      { username: 'nguyendinhtuan00', plan: 'TEST', amount: 5000, time: '2026-10-12T17:48:24.000Z', txId: 'cam_2kIObn7acAfhBLuovv4xeg5EChE3', avatarUrl: KNOWN_AVATARS['nguyendinhtuan00'] },
      { username: 'hi_embe', plan: 'MONTH6', amount: 39000, time: '2026-10-12T12:36:07.000Z', txId: 'cam_zKit3JlPVhdXK3ppE2PDRflNjp32', avatarUrl: KNOWN_AVATARS['hi_embe'] },
      { username: 'ljaj', plan: 'YEARLY', amount: 69000, time: '2026-10-12T14:15:21.000Z', txId: 'cam_qJ76CYeThgaDnQYipUGPsC5XeVt2', avatarUrl: KNOWN_AVATARS['ljaj'] },
      { username: 'daothanh', plan: 'YEARLY', amount: 69000, time: '2026-10-12T13:57:26.000Z', txId: 'cam_5p59vkOpQxWV8w1hItgiJh27Fyo1', avatarUrl: KNOWN_AVATARS['daothanh'] },
      { username: 'yn.nt', plan: 'YEARLY', amount: 69000, time: '2026-10-12T13:46:00.000Z', txId: 'cam_GrYho8R7FDPeEmQgy5aKMEYx9gl2', avatarUrl: KNOWN_AVATARS['yn.nt'] },
      { username: 'trunhmoi', plan: 'YEARLY', amount: 69000, time: '2026-10-12T13:16:02.000Z', txId: 'cam_eg66151dTvhc7zREzqTWVKiVABh2', avatarUrl: KNOWN_AVATARS['trunhmoi'] },
      { username: 'hieon0', plan: 'YEARLY', amount: 69000, time: '2026-10-12T11:37:18.000Z', txId: 'cam_Vt6ceg2WlBcOGDrkM1MnPOJQuc93', avatarUrl: KNOWN_AVATARS['hieon0'] },
      { username: 'mhhiep', plan: 'YEARLY', amount: 69000, time: '2026-10-12T10:53:46.000Z', txId: 'cam_2c7d1QuxUQUlKNrwGPcqsqLW0sK2', avatarUrl: KNOWN_AVATARS['mhhiep'] }
    ];

    // Hợp nhất: localList, serverList, seed, và chuẩn hóa khử hoàn toàn trùng lặp theo normalize username
    const all = [...localList, ...serverList, ...defaultSeedList];
    const normMap = new Map();

    all.forEach(item => {
      if (!item || !item.username) return;
      let rawU = String(item.username).toLowerCase().trim().replace('@', '');
      if (rawU.includes('kienviet')) {
        rawU = 'kienviet';
      }
      const normKey = rawU.replace(/[^a-z0-9]/gi, '');
      // Bỏ qua tài khoản test demo
      if (!normKey || normKey.includes('testdemo') || normKey === 'testuser') return;

      const realAvatar = (item.avatarUrl && item.avatarUrl.includes('locketcamera.com'))
        ? item.avatarUrl
        : (KNOWN_AVATARS[rawU] || KNOWN_AVATARS[normKey] || item.avatarUrl || null);

      const parsedItem = {
        ...item,
        username: rawU,
        time: item.time || new Date().toISOString(),
        avatarUrl: realAvatar
      };

      if (!normMap.has(normKey)) {
        normMap.set(normKey, parsedItem);
      } else {
        const prev = normMap.get(normKey);
        // Ưu tiên username có chứa ký tự . hoặc _ (username chính xác trên Locket)
        const betterUser = (rawU.includes('.') || rawU.includes('_')) ? rawU : prev.username;
        // Ưu tiên avatar thật từ cdn2.locketcamera.com
        const betterAvatar = (realAvatar && realAvatar.includes('locketcamera.com')) ? realAvatar : prev.avatarUrl;
        // Ưu tiên txId thật của ngân hàng (không phải tx_ tự sinh)
        const betterTxId = (item.txId && !String(item.txId).startsWith('tx_')) ? item.txId : prev.txId;
        // Giữ thời gian mới hơn
        const betterTime = (new Date(item.time || 0) > new Date(prev.time || 0)) ? item.time : prev.time;
        normMap.set(normKey, {
          ...prev,
          ...parsedItem,
          username: betterUser,
          avatarUrl: betterAvatar,
          txId: betterTxId,
          time: betterTime
        });
      }
    });

    const uniqueTxList = Array.from(normMap.values());
    uniqueTxList.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
    allRecentTransactions = uniqueTxList;

    // Lưu lại danh sách vào localStorage để luôn duy trì danh sách sạch không trùng
    try {
      localStorage.setItem('tocam_recent_transactions', JSON.stringify(uniqueTxList.slice(0, 60)));
    } catch (e) {}

    renderRecentTxPage();
  } catch (err) {
    console.warn('[HISTORY] Lỗi tải lịch sử:', err.message);
  }
}

// Kiểm tra xem chuỗi có đại diện cho gói Test 9k không
function isTestPlan(str) {
  if (!str) return false;
  const s = String(str).toLowerCase().trim();
  return s.includes('test') || s.includes('9000') || s.includes('9k') || s.includes('5000') || s.includes('5k') || s.includes('dungthu');
}

// Kiểm tra xem chuỗi có đại diện cho gói 39k / 6 tháng không
function is6MonthPlan(str) {
  if (!str) return false;
  const s = String(str).toLowerCase().trim();
  return s.includes('39') || s.includes('6m') || s.includes('6thang') || s.includes('6month') || s.includes('phobien');
}

// Kiểm tra xem chuỗi có đại diện cho gói 69k / 1 năm không
function isYearlyPlan(str) {
  if (!str) return false;
  const s = String(str).toLowerCase().trim();
  return s.includes('69') || s.includes('year') || s.includes('1y') || s.includes('1nam') || s.includes('nam') || s.includes('tietkiem');
}

// Đọc query parameter ?plan= từ URL khi load trang
function checkUrlPlanParam() {
  const params = new URLSearchParams(window.location.search);
  const rawParam = params.get('plan') || params.get('package') || params.get('goi') || params.get('p') || localStorage.getItem('tocam_selected_plan') || '';

  if (isTestPlan(rawParam)) {
    const card = document.getElementById('plan-card-test') || document.querySelector('.plan-card[onclick*="TEST"]');
    selectPlan(card, 'Gói Test (1 Ngày)', 9000, '9.000đ', 'TEST');
  } else if (is6MonthPlan(rawParam)) {
    const card = document.getElementById('plan-card-6month') || document.querySelector('.plan-card[onclick*="MONTH6"]');
    selectPlan(card, 'Gói 6 Tháng', 39000, '39.000đ', 'MONTH6');
  } else if (isYearlyPlan(rawParam)) {
    const card = document.getElementById('plan-card-yearly') || document.querySelector('.plan-card[onclick*="YEARLY"]');
    selectPlan(card, 'Gói 1 Năm', 69000, '69.000đ', 'YEARLY');
  } else {
    const card = document.getElementById('plan-card-lifetime') || document.querySelector('.plan-card[onclick*="LIFETIME"]');
    selectPlan(card, 'Gói Vĩnh Viễn', 119000, '119.000đ', 'LIFETIME');
  }

  const urlUser = params.get('username') || params.get('user');
  if (urlUser) {
    const uInput = document.getElementById('username-input');
    if (uInput) {
      uInput.value = urlUser;
      lookupUsername();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initFromConfig();
  checkUrlPlanParam();
  loadRecentTransactions();
  // Tự động làm mới lịch sử mỗi 10 giây
  setInterval(loadRecentTransactions, 10000);

  const uInput = document.getElementById('username-input');
  if (uInput) {
    // Kiểm tra trực tiếp khi người dùng gõ
    uInput.addEventListener('input', () => {
      const raw = uInput.value.trim();
      if (!raw) {
        setUsernameError(false);
        const preview = document.getElementById('user-preview');
        if (preview) preview.style.display = 'none';
        return;
      }
      const cleaned = cleanLocketUsername(raw);
      if (!isValidLocketUsername(cleaned)) {
        setUsernameError(true, 'Username không hợp lệ (chỉ chữ, số, . _ -)');
      } else {
        setUsernameError(false);
      }
    });

    // Khi người dùng click ra ngoài (blur): tự động làm sạch link hoặc @
    uInput.addEventListener('blur', () => {
      const raw = uInput.value.trim();
      if (raw) {
        const cleaned = cleanLocketUsername(raw);
        if (isValidLocketUsername(cleaned)) {
          uInput.value = cleaned;
          setUsernameError(false);
        } else {
          setUsernameError(true, 'Username không hợp lệ (chỉ chữ, số, . _ -)');
        }
      }
    });

    // Tự động nhận diện khi dán cả link locket.cam/...
    uInput.addEventListener('paste', () => {
      setTimeout(() => {
        const cleaned = cleanLocketUsername(uInput.value);
        if (cleaned && isValidLocketUsername(cleaned)) {
          uInput.value = cleaned;
          setUsernameError(false);
        }
      }, 0);
    });

    uInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        lookupUsername();
      }
    });
  }
});

// ============================================
// TRA CỨU DNS & LỊCH SỬ GIAO DỊCH (LOOKUP MODAL)
// ============================================
let currentLookupData = null;

function openLookupModal(prefillUser) {
  const modal = document.getElementById('lookup-modal');
  const input = document.getElementById('lookup-username-input');
  const pinField = document.getElementById('lookup-pin-field');
  const pinInput = document.getElementById('lookup-pin-input');
  const resultBox = document.getElementById('lookup-result-box');
  const setPinBox = document.getElementById('lookup-set-pin-box');

  if (modal) modal.classList.add('active');
  if (resultBox) resultBox.style.display = 'none';
  if (setPinBox) setPinBox.style.display = 'none';
  if (pinField) pinField.style.display = 'none';
  if (pinInput) pinInput.value = '';

  const userToFill = prefillUser || currentUsername || document.getElementById('username-input')?.value?.trim().replace('@', '') || '';
  if (input && userToFill) {
    input.value = userToFill;
    submitUserLookup();
  } else if (input) {
    input.focus();
  }
}

function closeLookupModal() {
  const modal = document.getElementById('lookup-modal');
  if (modal) modal.classList.remove('active');
}

async function submitUserLookup(e) {
  if (e) e.preventDefault();

  const uInput = document.getElementById('lookup-username-input');
  const pinInput = document.getElementById('lookup-pin-input');
  const btn = document.getElementById('btn-submit-lookup');
  const pinField = document.getElementById('lookup-pin-field');
  const resultBox = document.getElementById('lookup-result-box');

  const rawUser = cleanLocketUsername(uInput?.value || '');
  if (uInput) uInput.value = rawUser;
  const username = rawUser;
  const pin = (pinInput?.value || '').trim();

  if (!username) {
    alert('Vui lòng nhập Username Locket cần tra cứu!');
    uInput?.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang tra cứu hệ thống...</span>';
  }

  // Ẩn bảng kết quả cũ ngay lập tức để user lạ tuyệt đối không thấy bất kỳ thông tin nào
  if (resultBox) resultBox.style.display = 'none';

  try {
    const res = await fetch(`${BACKEND_URL}/api/user/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin })
    });
    const data = await res.json();

    if (res.status === 404 || data.notFound) {
      alert(`⚠️ Không tìm thấy gói đã mua của @${username}.\n\nNếu bạn chưa từng mua gói, vui lòng chọn gói và tiến hành thanh toán ở màn hình chính!`);
      if (resultBox) resultBox.style.display = 'none';
      return;
    }

    if (data.requirePin) {
      if (pinField) pinField.style.display = 'block';
      pinInput?.focus();
      alert('🔒 Tài khoản này đã được đặt mã PIN bảo mật. Vui lòng nhập mã PIN để xem thông tin!');
      return;
    }

    if (data.wrongPin) {
      alert('❌ Mã PIN không chính xác. Vui lòng nhập lại!');
      pinInput?.focus();
      return;
    }

    if (data.ok && data.user) {
      currentLookupData = data.user;
      renderLookupResult(data.user);
    } else {
      alert(data.message || 'Lỗi tra cứu thông tin.');
    }
  } catch (err) {
    console.error('[LOOKUP ERROR]:', err);
    alert('Không thể kết nối đến máy chủ tra cứu. Vui lòng thử lại sau!');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> <span>Tra Cứu Ngay</span>';
    }
  }
}

function renderLookupResult(user) {
  const resultBox = document.getElementById('lookup-result-box');
  const userEl = document.getElementById('lookup-res-user');
  const badgeEl = document.getElementById('lookup-res-badge');
  const expEl = document.getElementById('lookup-res-expiry');
  const uidEl = document.getElementById('lookup-res-uid');
  const dlBtn = document.getElementById('lookup-btn-download-dns');
  const tbody = document.getElementById('lookup-tx-tbody');
  const avatarImg = document.getElementById('lookup-res-avatar-img');
  const avatarFallback = document.getElementById('lookup-res-avatar-fallback');
  const avatarWrap = document.getElementById('lookup-res-avatar-wrap');

  if (userEl) userEl.innerText = `@${user.username}`;
  const renewUserEl = document.getElementById('renew-plan-target-user');
  if (renewUserEl) renewUserEl.innerText = user.username;
  const renewBox = document.getElementById('lookup-renew-box');
  if (renewBox) renewBox.style.display = 'none';
  const pinBox = document.getElementById('lookup-set-pin-box');
  if (pinBox) pinBox.style.display = 'none';

  // Phân loại gói 1:1 chuẩn xác
  const isLifetime = (user.currentPlan === 'LIFETIME' || user.expiresAt === 'Vĩnh Viễn' || (user.expiresAt && new Date(user.expiresAt).getFullYear() >= 2050));
  const isYearly = (user.currentPlan === 'YEARLY');
  const isMonth6 = (user.currentPlan === 'MONTH6' || user.currentPlan === '6MONTH');
  const isTest = (user.currentPlan === 'TEST');

  // Đổi viền avatar tương ứng với gói đã mua
  if (avatarWrap) {
    const borderColor = isLifetime ? '#FFA033' : (isMonth6 ? '#10B981' : (isYearly ? '#38BDF8' : (isTest ? '#A855F7' : '#FFA033')));
    avatarWrap.style.border = `2.5px solid ${borderColor}`;
  }

  // Cập nhật Ảnh đại diện (Avatar)
  const cleanLookupUser = (user.username || '').toLowerCase();
  const initialAvatarUrl = (user.avatarUrl && user.avatarUrl.includes('locketcamera.com'))
    ? user.avatarUrl
    : (KNOWN_AVATARS[cleanLookupUser] || getSvgAvatar(user.username, isLifetime ? '#FFA033' : '#38BDF8'));
  const avatarUrl = user.avatarUrl || initialAvatarUrl;
  if (avatarImg) {
    avatarImg.src = avatarUrl;
    avatarImg.setAttribute('referrerpolicy', 'no-referrer');
    avatarImg.style.display = 'block';
    if (avatarFallback) avatarFallback.style.display = 'none';

    avatarImg.onerror = function() {
      if (this.src !== initialAvatarUrl) {
        this.src = initialAvatarUrl;
      } else {
        this.style.display = 'none';
        if (avatarFallback) avatarFallback.style.display = 'block';
      }
    };
  }

  // TÍCH HỢP ẢNH NHƯ Ở DƯỚI: Nếu avatar chưa phải là ảnh Locket CDN xịn, gọi thử uid/check để cập nhật ảnh thật ngay tức thì
  if (!user.avatarUrl || !user.avatarUrl.includes('locketcamera.com')) {
    fetch(`${BACKEND_URL}/api/locket/uid/check?username=${encodeURIComponent(user.username)}`)
      .then(res => res.json())
      .then(json => {
        if (json.ok && json.data && json.data.avatarUrl && json.data.avatarUrl.includes('locketcamera.com')) {
          if (avatarImg) {
            avatarImg.src = json.data.avatarUrl;
            avatarImg.style.display = 'block';
            if (avatarFallback) avatarFallback.style.display = 'none';
          }
          user.avatarUrl = json.data.avatarUrl;
        }
      })
      .catch(() => {});
  }

  let isExpired = false;
  if (!isLifetime && user.expiresAt) {
    const expDate = new Date(user.expiresAt);
    if (!isNaN(expDate) && expDate.getFullYear() < 2050 && expDate.getTime() < Date.now()) {
      isExpired = true;
    }
  }
  
  if (badgeEl) {
    if (isExpired) {
      badgeEl.innerText = 'ĐÃ HẾT HẠN';
      badgeEl.style.background = '#EF4444';
      badgeEl.style.color = '#fff';
    } else if (isLifetime) {
      badgeEl.innerText = 'GÓI VĨNH VIỄN';
      badgeEl.style.background = '#FFA033';
      badgeEl.style.color = '#000';
    } else if (isYearly) {
      badgeEl.innerText = 'GÓI 1 NĂM';
      badgeEl.style.background = '#38BDF8';
      badgeEl.style.color = '#000';
    } else if (isMonth6) {
      badgeEl.innerText = 'GÓI 6 THÁNG';
      badgeEl.style.background = '#10B981';
      badgeEl.style.color = '#fff';
    } else {
      badgeEl.innerText = 'GÓI TEST (1 NGÀY)';
      badgeEl.style.background = '#A855F7';
      badgeEl.style.color = '#fff';
    }
  }

  // Hạn dùng
  if (expEl) {
    if (isLifetime) {
      expEl.innerText = 'Vĩnh Viễn (Bảo hành trọn đời)';
      expEl.style.color = '#10B981';
    } else {
      const d = new Date(user.expiresAt);
      expEl.innerText = isNaN(d) ? user.expiresAt : d.toLocaleDateString('vi-VN');
      expEl.style.color = isExpired ? '#EF4444' : '#FFA033';
    }
  }

  // UID
  if (uidEl) {
    uidEl.innerText = user.uid ? `${user.uid.substring(0, 16)}...` : 'Chưa gán UID';
    uidEl.title = user.uid || '';
  }

  // Link tải DNS
  if (dlBtn) {
    const downloadUrl = user.dnsDownloadUrl || `${BACKEND_URL}/api/locket/profile/download?username=${encodeURIComponent(user.username)}&uid=${encodeURIComponent(user.uid || '')}`;
    dlBtn.href = downloadUrl;
  }

  // Lịch sử giao dịch
  if (tbody) {
    if (user.history && user.history.length > 0) {
      tbody.innerHTML = user.history.map(item => {
        const timeStr = item.time ? new Date(item.time).toLocaleString('vi-VN') : 'Gần đây';
        let planText = 'Gói 1 Năm';
        let planColor = '#38BDF8';
        let amountText = '69.000đ';
        if (item.plan === 'LIFETIME') {
          planText = 'Gói Vĩnh Viễn';
          planColor = '#FFA033';
          amountText = '119.000đ';
        } else if (item.plan === 'MONTH6' || item.plan === '6MONTH') {
          planText = 'Gói 6 Tháng';
          planColor = '#10B981';
          amountText = '39.000đ';
        } else if (item.plan === 'TEST') {
          planText = 'Gói Test (1 Ngày)';
          planColor = '#C084FC';
          amountText = '9.000đ';
        } else {
          amountText = item.amount ? Number(item.amount).toLocaleString('vi-VN') + 'đ' : '69.000đ';
        }
        return `
          <tr>
            <td style="color:#94A3B8;">${timeStr}</td>
            <td><b style="color:${planColor};">${planText}</b></td>
            <td style="color:#10B981; font-weight:700;">${amountText}</td>
            <td><span style="background:rgba(16,185,129,0.2); color:#10B981; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:800;">${isExpired ? 'Hết hạn' : 'Hoàn tất'}</span></td>
          </tr>
        `;
      }).join('');
    } else {
      const defaultPlanText = isLifetime ? 'Gói Vĩnh Viễn' : (user.currentPlan === 'TEST' ? 'Gói Test (1 Ngày)' : 'Gói 1 Năm');
      const defaultAmount = isLifetime ? '119.000đ' : (user.currentPlan === 'TEST' ? '9.000đ' : '69.000đ');
      tbody.innerHTML = `
        <tr>
          <td style="color:#94A3B8;">Gần đây</td>
          <td><b style="color:#FFA033;">${defaultPlanText}</b></td>
          <td style="color:#10B981; font-weight:700;">${defaultAmount}</td>
          <td><span style="background:rgba(16,185,129,0.2); color:#10B981; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:800;">Hoàn tất</span></td>
        </tr>
      `;
    }
  }

  if (resultBox) {
    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function copyLookupDnsLink() {
  if (!currentLookupData) {
    alert('Không tìm thấy thông tin tài khoản.');
    return;
  }
  const linkToCopy = currentLookupData.dnsDownloadUrl || `${BACKEND_URL}/api/locket/profile/download?username=${encodeURIComponent(currentLookupData.username)}&uid=${encodeURIComponent(currentLookupData.uid || '')}`;
  copyText(linkToCopy, 'Đã sao chép link cấu hình DNS! Mở Safari dán link để cài đặt.');
}

// Bật/tắt box chọn gói gia hạn
function toggleRenewBox() {
  const box = document.getElementById('lookup-renew-box');
  const pinBox = document.getElementById('lookup-set-pin-box');
  const targetUserEl = document.getElementById('renew-plan-target-user');
  if (pinBox) pinBox.style.display = 'none';

  if (box) {
    const isShowing = (box.style.display === 'block');
    box.style.display = isShowing ? 'none' : 'block';
    if (!isShowing) {
      if (targetUserEl && currentLookupData) {
        targetUserEl.innerText = currentLookupData.username;
      }
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

// Bấm nút Gia Hạn: Mở menu chọn gói trực quan
function renewFromLookup() {
  toggleRenewBox();
}

// Khách hàng bấm chọn một gói cụ thể (Test / 1 Năm / Vĩnh Viễn) để gia hạn
function executeRenewPlan(planCode) {
  if (!currentLookupData) {
    alert('Vui lòng tra cứu tài khoản trước khi chọn gói gia hạn.');
    return;
  }
  const username = currentLookupData.username;
  closeLookupModal();

  // 1. Điền vào ô username ở Bước 1
  const uInput = document.getElementById('username-input');
  if (uInput) uInput.value = username;
  currentUsername = username;

  // 2. Chọn đúng gói gia hạn mà khách đã bấm
  if (planCode === 'TEST') {
    selectPlan(null, 'Gói Test (1 Ngày)', 9000, '9.000đ', 'TEST');
  } else if (planCode === 'MONTH6' || planCode === '6MONTH') {
    selectPlan(null, 'Gói 6 Tháng', 39000, '39.000đ', 'MONTH6');
  } else if (planCode === 'YEARLY') {
    selectPlan(null, 'Gói 1 Năm', 69000, '69.000đ', 'YEARLY');
  } else {
    selectPlan(null, 'Gói Vĩnh Viễn', 119000, '119.000đ', 'LIFETIME');
  }

  // 3. Đặt lại cờ thanh toán và reset session timestamp để bảo mật
  isPaymentVerified = false;
  paymentSessionStartTime = Date.now();

  // 4. Cập nhật QR code và thông tin chuyển khoản chuẩn của gói vừa chọn
  updatePaymentInfo();

  // 5. Chuyển sang Bước 2 để hiển thị mã QR và số tiền đúng của gói vừa chọn
  goToStep(2);
}

function toggleSetPinBox() {
  const box = document.getElementById('lookup-set-pin-box');
  const renewBox = document.getElementById('lookup-renew-box');
  if (renewBox) renewBox.style.display = 'none';
  if (box) {
    box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
  }
}

async function submitSetPin() {
  if (!currentLookupData) return;
  const oldPin = document.getElementById('set-pin-old')?.value || '';
  const newPin = document.getElementById('set-pin-new')?.value || '';

  if (!newPin || newPin.length < 4 || newPin.length > 8) {
    alert('Mã PIN mới phải từ 4 đến 8 chữ số!');
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/user/set-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentLookupData.username,
        oldPin,
        newPin
      })
    });
    const data = await res.json();
    if (data.ok) {
      alert('✅ Đã cài đặt mã PIN bảo vệ thành công!');
      toggleSetPinBox();
    } else {
      alert(data.message || 'Lỗi cài đặt mã PIN.');
    }
  } catch (e) {
    alert('Lỗi kết nối máy chủ cài PIN.');
  }
}
