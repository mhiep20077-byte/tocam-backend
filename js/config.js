/**
 * ============================================================
 * 🍊 CẤU HÌNH THÔNG TIN SHOP TỔ CAM - LOCKET GOLD
 * Bạn có thể thay đổi toàn bộ thông tin ngân hàng, Zalo
 * ở đây. Website sẽ tự động cập nhật ở tất cả các vị trí!
 * ============================================================
 */

const TO_CAM_CONFIG = {
  // --- THÔNG TIN THƯƠNG HIỆU ---
  BRAND_NAME: "TỔ CAM",
  BRAND_SLOGAN: "Cổng Dịch Vụ Locket Gold Độc Quyền 24/7",
  WEBSITE_URL: "https://tocam.vip",

  // --- THÔNG TIN THANH TOÁN (VPBANK - NGUYEN MINH HIEP) ---
  BANK_ID: "VPB", 
  BANK_NAME: "VPBank (Ngân hàng TMCP Việt Nam Thịnh Vượng)",
  ACCOUNT_NUMBER: "643391953", 
  ACCOUNT_NUMBER_DISPLAY: "6433 9195 3",
  ACCOUNT_HOLDER: "NGUYEN MINH HIEP",
  QR_IMAGE_PATH: "", // Dùng VietQR động tự tạo theo chuẩn Napas247

  // --- THÔNG TIN LIÊN HỆ & CSKH (chỉ Zalo) ---
  ZALO_PHONE: "0386.116.104",
  ZALO_URL: "https://zalo.me/0386116104",

  // --- THÔNG TIN DOH PROFILE (CÀI ĐẶT DNS BƯỚC 3) ---
  DOH_SERVER_URL: "https://doh.tocam.vip/dns-query",
  MOBILECONFIG_DOWNLOAD_URL: "https://wallhack.space/gold",

  // --- THÔNG TIN GÓI DỊCH VỤ ---
  PLANS: {
    TEST: {
      id: "test",
      name: "Gói Test",
      price: 9000,
      formattedPrice: "9.000đ",
      unit: "/1 ngày",
      badge: "DÙNG THỬ"
    },
    MONTH6: {
      id: "6month",
      name: "Gói 6 Tháng",
      price: 39000,
      formattedPrice: "39.000đ",
      unit: "/6 tháng",
      badge: "PHỔ BIẾN"
    },
    YEARLY: {
      id: "yearly",
      name: "Gói 1 Năm",
      price: 69000,
      formattedPrice: "69.000đ",
      unit: "/năm",
      badge: "TIẾT KIỆM"
    },
    LIFETIME: {
      id: "lifetime",
      name: "Gói Vĩnh Viễn",
      price: 99000,
      formattedPrice: "99.000đ",
      unit: "/trọn đời",
      badge: "KHUYÊN DÙNG"
    }
  }
};

// ============================================================
// 🎬 NƠI LƯU & CẤU HÌNH VIDEO VIP CỦA BẠN (Thư mục videos/)
// Bạn chỉ cần bỏ file video (.mp4) vào thư mục: videos/
// rồi thêm hoặc đổi tên file trong danh sách dưới đây:
// ============================================================
const VIP_VIDEOS_CONFIG = [
  {
    id: "vip-1",
    title: "🎬 video-1.mp4",
    src: "videos/video-1.mp4", // File video có sẵn trong thư mục /videos/
    fallback: "videos/video-1.mp4",
    thumb: "images/thumb-video-1.jpg"
  },
  {
    id: "vip-2",
    title: "🎬 video-2.mp4",
    src: "videos/video-2.mp4", // File video có sẵn trong thư mục /videos/
    fallback: "videos/video-2.mp4",
    thumb: "images/thumb-video-2.jpg"
  }
];

// Đưa config vào window để sử dụng toàn cầu
if (typeof window !== 'undefined') {
  window.TO_CAM_CONFIG = TO_CAM_CONFIG;
  window.VIP_VIDEOS = VIP_VIDEOS_CONFIG;
}

