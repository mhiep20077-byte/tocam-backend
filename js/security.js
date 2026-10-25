/**
 * ============================================================
 * 🛡️ TO CAM WEB DEFENDER - CLIENT PROTECTION SCRIPT
 * - Ngăn chặn click chuột phải (Context Menu)
 * - Vô hiệu hóa phím tắt mở DevTools (F12, Ctrl+Shift+I/J/C)
 * - Vô hiệu hóa phím tắt xem nguồn trang (Ctrl+U) và lưu trang (Ctrl+S)
 * - Cảnh báo ngăn chặn mã độc (Self-XSS Warning) trên Console
 * ============================================================
 */
(function () {
  'use strict';

  // 1. Chống click chuột phải trên toàn bộ trang
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    return false;
  }, { capture: true, passive: false });

  // 2. Chống phím tắt mở DevTools, xem mã nguồn, lưu trang
  document.addEventListener('keydown', function (e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + Shift + I (Inspect)
    // Ctrl + Shift + J (Console)
    // Ctrl + Shift + C (Element Inspector)
    if (e.ctrlKey && e.shiftKey) {
      const k = (e.key || '').toUpperCase();
      if (k === 'I' || k === 'J' || k === 'C') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }

    // Cmd + Option + I / J / C (MacOS Safari & Chrome)
    if (e.metaKey && e.altKey) {
      const k = (e.key || '').toUpperCase();
      if (k === 'I' || k === 'J' || k === 'C' || k === 'U') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }

    // Ctrl + U / Cmd + U (View Source)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + S / Cmd + S (Save Page)
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true, passive: false });

  // 3. Chống kéo thả hình ảnh/video bừa bãi
  document.addEventListener('dragstart', function (e) {
    if (e.target && (e.target.nodeName === 'IMG' || e.target.nodeName === 'VIDEO')) {
      e.preventDefault();
      return false;
    }
  });

  // 4. Banner cảnh báo an toàn trên Console trình duyệt
  try {
    const bannerStyle = 'color: #ff4d4f; font-size: 26px; font-weight: 900; -webkit-text-stroke: 1px black;';
    const textStyle = 'color: #ffa033; font-size: 14px; font-weight: bold; line-height: 1.6;';
    console.log('%c⚠️ DỪNG LẠI! / STOP!', bannerStyle);
    console.log(
      '%cĐây là tính năng dành cho nhà phát triển hệ thống Tổ Cam.\nNếu ai đó bảo bạn sao chép và dán bất kỳ đoạn mã nào vào đây, đó là hành vi lừa đảo nhằm đánh cắp tài khoản Locket hoặc chiếm đoạt thông tin của bạn!',
      textStyle
    );
  } catch (err) {}
})();
