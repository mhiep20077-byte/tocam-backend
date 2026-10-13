// ==================== WebGL Shader Mesh Background (Tổ Cam Theme) ====================
(function initWebGLBg() {
  const cv = document.getElementById('glbg');
  if (!cv) return;
  const gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
  if (!gl) {
    cv.style.display = 'none';
    return;
  }

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
  const FS = [
    'precision highp float;',
    'uniform vec2 u_res; uniform float u_time; uniform vec3 u_theme;',
    'float blobm(vec2 uv,vec2 c,float r){ return smoothstep(r,0.0,distance(uv,c)); }',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/u_res.xy;',
    '  float a=u_res.x/u_res.y; vec2 p=uv; p.x*=a;',
    '  float t=u_time*0.25;',
    '  vec3 col=vec3(0.027, 0.033, 0.05);', // Nền tối luxury
    '  float m1=blobm(p, vec2(a*0.80+0.12*sin(t*0.7), 0.88+0.06*cos(t*0.9)), 0.65*a);',
    '  float m2=blobm(p, vec2(a*0.18+0.10*cos(t*0.6), 0.30+0.10*sin(t*0.8)), 0.55*a);',
    '  float m3=blobm(p, vec2(a*0.52+0.14*sin(t*0.5), 0.58+0.12*cos(t*0.45)), 0.5*a);',
    '  col=mix(col, u_theme * 0.5, m1 * 0.45);',
    '  col=mix(col, vec3(0.98, 0.55, 0.1) * 0.4, m2 * 0.35);',
    '  col=mix(col, u_theme * 0.35, m3 * 0.28);',
    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  function createShader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, createShader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    cv.style.display = 'none';
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uT = gl.getUniformLocation(prog, 'u_time');
  const uTheme = gl.getUniformLocation(prog, 'u_theme');

  // Mặc định Tone Cam Tổ Cam [1.0, 0.48, 0.0]
  window.currentGLTheme = [1.0, 0.48, 0.0];

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    cv.width = Math.max(1, (w * 0.35) | 0);
    cv.height = Math.max(1, (h * 0.35) | 0);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    gl.viewport(0, 0, cv.width, cv.height);
  }
  window.addEventListener('resize', resize);
  resize();

  const start = performance.now();
  function render(now) {
    gl.uniform2f(uRes, cv.width, cv.height);
    gl.uniform1f(uT, (now - start) / 1000);
    gl.uniform3fv(uTheme, window.currentGLTheme);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();

// ==================== Chuyển đổi màu chủ đề ====================
function switchTheme(hex, el) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');

  document.documentElement.style.setProperty('--orange', hex);
  document.documentElement.style.setProperty('--orange-hi', hex);

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  window.currentGLTheme = [r, g, b];
}

// ==================== LOCKET GOLD SIMULATOR STUDIO CONTROLLER ====================
const MOCKUP_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80', // Cà Phê Chill
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80', // Hoàng Hôn
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=80', // Bạn Thân
  'https://images.unsplash.com/photo-1558857563-b37cf5a73e6a?w=600&auto=format&fit=crop&q=80', // Trà Sữa
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80', // Caramen
  'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80', // Bingsu
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80', // Sữa Chua
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80', // Chú Thích Trend
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80'  // DNS & Chứng Nhận
];
const MOCKUP_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4'
];
let isPlayingVideoPreview = false;
let currentMockupPhotoIdx = 0;
let isMockupGoldActive = false; // Mặc định mở Bản Thường theo yêu cầu
let isRecordingVideo = false;
let recordInterval = null;
let recordSeconds = 0;
let isCameraFlipped = false;
let isMockupFlashOn = false;
let isZoomed = false;

// Hiển thị thông báo khi nhấn vào tính năng VIP ở Bản Thường
function showVipLockedAlert(msg) {
  const toast = document.getElementById('vip-toast');
  const toastMsg = document.getElementById('vip-toast-msg');
  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');

  const text = msg || '🔒 Tính năng này độc quyền cho Locket Gold VIP!';

  if (toast && toastMsg) {
    toastMsg.innerText = text;
    toast.classList.add('show');
    clearTimeout(window._vipToastTimeout);
    window._vipToastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  if (di && diText) {
    di.classList.add('expanded');
    diText.innerText = text;
    clearTimeout(window._vipDiTimeout);
    window._vipDiTimeout = setTimeout(() => {
      di.classList.remove('expanded');
      diText.innerText = isMockupGoldActive ? 'Locket Gold VIP' : 'Locket Free (20 bạn)';
    }, 2500);
  }

  if (navigator.vibrate) {
    try { navigator.vibrate([40, 60, 40]); } catch (e) {}
  }
}

// Cập nhật đồng hồ thời gian thực iOS
function updateIOSClock() {
  const clock = document.getElementById('ios-clock');
  if (!clock) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  clock.innerText = `${h}:${m}`;
}
setInterval(updateIOSClock, 1000);
updateIOSClock();

// Âm thanh chụp ảnh giả lập Web Audio API
function playMockupCameraSound() {
  if (!isMockupGoldActive) return; // Bản thường KHÔNG có âm thanh!
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch (e) {}
}

let isMockupMicOn = false;
let isVideoSoundOn = false;

// Cập nhật trạng thái hiển thị của Nút Mic hoặc Nút Loa
function updateMicOrSpeakerState() {
  const btnMic = document.getElementById('btn-mic');
  const icon = document.getElementById('mic-speaker-icon');
  const bgVideo = document.getElementById('locket-bg-video');
  if (!btnMic || !icon) return;

  if (isPlayingVideoPreview) {
    // CHẾ ĐỘ VIDEO: THAY THẾ NÚT MIC THÀNH NÚT MỞ LOA (CHỈ HIỆN Ở BẢN VIP)
    btnMic.classList.add('speaker-mode');
    btnMic.style.display = isMockupGoldActive ? 'flex' : 'none';
    if (bgVideo && !bgVideo.muted && isMockupGoldActive) {
      btnMic.classList.add('unmuted');
      btnMic.classList.remove('active');
      icon.className = 'fa-solid fa-volume-high';
      btnMic.title = 'Tắt tiếng video';
    } else {
      btnMic.classList.remove('unmuted', 'active');
      icon.className = 'fa-solid fa-volume-xmark';
      btnMic.title = 'Mở loa để nghe tiếng video';
    }
  } else {
    // CHẾ ĐỘ CAMERA: CHỈ HIỆN MIC Ở BẢN VIP, BẢN THƯỜNG ẨN MIC
    btnMic.classList.remove('speaker-mode', 'unmuted');
    btnMic.style.display = isMockupGoldActive ? 'flex' : 'none';
    if (isMockupMicOn) {
      btnMic.classList.add('active');
      icon.className = 'fa-solid fa-microphone text-success';
      btnMic.title = 'Micro đang mở (Bấm để tắt)';
    } else {
      btnMic.classList.remove('active');
      icon.className = 'fa-solid fa-microphone-slash';
      btnMic.title = 'Micro đang tắt (Bấm để mở)';
    }
  }
}

// Bấm nút chuyển đổi Micro (chế độ thường) hoặc Mở Loa (chế độ xem video VIP)
function toggleMockupMicOrSpeaker() {
  const bgVideo = document.getElementById('locket-bg-video');
  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');

  if (isPlayingVideoPreview) {
    // Đang phát video: Bật/Tắt Loa
    if (!bgVideo) return;
    if (!isMockupGoldActive) {
      showVipLockedAlert('🔒 Âm thanh video chỉ có trên Locket Gold VIP! Bản thường không hỗ trợ âm thanh.');
      return;
    }
    if (bgVideo.muted) {
      bgVideo.muted = false;
      bgVideo.volume = 1;
      bgVideo.play().catch(() => {});
      isVideoSoundOn = true;
      if (di && diText) {
        di.classList.add('expanded');
        diText.innerText = '🔊 Đã mở loa - Nghe âm thanh video';
        setTimeout(() => di.classList.remove('expanded'), 1800);
      }
    } else {
      bgVideo.muted = true;
      isVideoSoundOn = false;
      if (di && diText) {
        di.classList.add('expanded');
        diText.innerText = '🔇 Đã tắt loa video';
        setTimeout(() => di.classList.remove('expanded'), 1500);
      }
    }
  } else {
    // Đang ở camera bình thường: Bật/Tắt Mic
    if (!isMockupGoldActive) {
      showVipLockedAlert('🔒 Âm thanh / Micro chỉ hỗ trợ trên Locket Gold VIP! Bản thường không mở được.');
      return;
    }
    isMockupMicOn = !isMockupMicOn;
    if (di && diText) {
      di.classList.add('expanded');
      diText.innerText = isMockupMicOn ? '🎙️ Đã mở Micro thu âm!' : '🔇 Đã tắt Micro';
      setTimeout(() => di.classList.remove('expanded'), 1500);
    }
  }

  updateMicOrSpeakerState();
  if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) {}
}

// 1. Chuyển đổi chế độ Bản Thường vs Locket Gold VIP
function setGoldMode(isGold) {
  isMockupGoldActive = isGold;
  const viewport = document.getElementById('locket-viewport');
  const btnFree = document.getElementById('btn-mode-free');
  const btnGold = document.getElementById('btn-mode-gold');
  const crown = document.getElementById('user-crown-icon');
  const friendsPill = document.getElementById('locket-friends-pill');
  const friendsText = document.getElementById('friends-pill-text');
  const shutter = document.getElementById('shutter-btn');
  const rectFill = document.getElementById('box-rect-fill');
  const recLimit = document.getElementById('rec-limit');
  const sendBtn = document.getElementById('btn-send-main');
  const diText = document.getElementById('di-text');
  const diDot = document.getElementById('di-dot');

  // Các icon trong khung Camera
  const btnFlash = document.getElementById('btn-flash');
  const btnMic = document.getElementById('btn-mic');
  const cornerControls = document.getElementById('box-corner-controls');

  // Danh sách bạn bè màn hình gửi
  const privateChip = document.getElementById('friend-private-chip');
  const friendName1 = document.getElementById('friend-name-1');
  const friendName2 = document.getElementById('friend-name-2');
  const chatBadge = document.getElementById('dock-chat-badge');

  // Media video items trong Kho Lưu Trữ Video VIP
  const thumbVid1 = document.getElementById('thumb-video-1');
  const thumbVid2 = document.getElementById('thumb-video-2');
  const thumbUpload = document.getElementById('thumb-video-upload');
  const videoFolderBox = document.getElementById('video-folder-box');
  const videoVipTitle = document.getElementById('video-vip-title');
  const videoGalleryContainer = document.getElementById('video-gallery-container');
  const widgetMediaTitle = document.getElementById('widget-media-title');
  const widgetMediaDesc = document.getElementById('widget-media-desc');

  const bgVideo = document.getElementById('locket-bg-video');
  const bgMedia = document.getElementById('locket-bg-media');

  if (isGold) {
    if (viewport) viewport.classList.add('vip-mode');
    if (btnGold) btnGold.classList.add('active');
    if (btnFree) btnFree.classList.remove('active');
    if (crown) crown.classList.remove('hidden');
    if (friendsPill) friendsPill.classList.add('gold');
    if (friendsText) friendsText.innerText = '66 người bạn';
    if (btnFlash) btnFlash.style.display = 'none';
    if (btnMic) btnMic.style.display = 'flex';
    if (cornerControls) cornerControls.style.display = 'flex';
    if (privateChip) privateChip.style.display = 'flex';
    if (friendName1) friendName1.innerText = 'Ngọn l...';
    if (friendName2) friendName2.innerText = 'Nợn...';
    if (chatBadge) chatBadge.style.display = 'flex';
    if (shutter) shutter.classList.add('gold');
    if (rectFill) rectFill.classList.add('gold');
    if (recLimit) recLimit.innerText = '/ 00:30';
    if (sendBtn) sendBtn.classList.add('gold');
    if (diText) diText.innerText = 'Locket Gold VIP';
    if (diDot) { diDot.style.background = '#ff2d55'; diDot.style.boxShadow = '0 0 8px #ff2d55'; }

    // MỞ KHOÁ VÀ HIỆN TOÀN BỘ PHẦN VIDEO VIP KHI VỀ BẢN VIP
    if (videoFolderBox) videoFolderBox.style.display = '';
    if (videoVipTitle) videoVipTitle.style.display = '';
    if (videoGalleryContainer) videoGalleryContainer.style.display = '';
    if (widgetMediaTitle) widgetMediaTitle.innerText = 'Kho Video VIP & Ảnh Thư Viện';
    if (widgetMediaDesc) widgetMediaDesc.innerText = 'Nơi lưu trữ video của bạn • Tải video không viền lên Locket';

    if (thumbVid1) thumbVid1.classList.remove('free-locked');
    if (thumbVid2) thumbVid2.classList.remove('free-locked');
    if (thumbUpload) thumbUpload.classList.remove('free-locked');

    const feedVid = document.getElementById('feed-media-video');
    const feedSoundBtn = document.getElementById('feed-sound-btn');
    if (feedSoundBtn && feedVid && feedVid.style.display === 'block') {
      feedSoundBtn.style.display = 'flex';
    }

    if (navigator.vibrate) try { navigator.vibrate([30, 40, 30]); } catch (e) {}
  } else {
    if (viewport) viewport.classList.remove('vip-mode');
    if (btnFree) btnFree.classList.add('active');
    if (btnGold) btnGold.classList.remove('active');
    if (crown) crown.classList.add('hidden');
    if (friendsPill) friendsPill.classList.remove('gold');
    if (friendsText) friendsText.innerText = '20 người bạn';
    if (btnFlash) btnFlash.style.display = 'flex';
    if (btnMic) btnMic.style.display = 'none';
    if (cornerControls) cornerControls.style.display = 'none';
    if (privateChip) privateChip.style.display = 'none';
    if (friendName1) friendName1.innerText = 'Ngòn thí';
    if (friendName2) friendName2.innerText = 'Thu';
    if (chatBadge) chatBadge.style.display = 'none';
    if (shutter) shutter.classList.remove('gold');
    if (rectFill) rectFill.classList.remove('gold');
    if (recLimit) recLimit.innerText = '/ 00:03';
    if (sendBtn) sendBtn.classList.remove('gold');
    if (diText) diText.innerText = 'Locket Free (20 bạn)';
    if (diDot) { diDot.style.background = '#38BDF8'; diDot.style.boxShadow = 'none'; }

    // BẢN THƯỜNG: ẨN THƯ MỤC LƯU VIDEO, ẨN TIÊU ĐỀ KHO VIP VÀ ẨN DANH SÁCH VIDEO (CHỈ HIỆN ẢNH)
    if (videoFolderBox) videoFolderBox.style.display = 'none';
    if (videoVipTitle) videoVipTitle.style.display = 'none';
    if (videoGalleryContainer) videoGalleryContainer.style.display = 'none';
    if (widgetMediaTitle) widgetMediaTitle.innerText = 'Ảnh Thư Viện Camera Roll';
    if (widgetMediaDesc) widgetMediaDesc.innerText = 'Chọn ảnh mẫu hoặc chụp ảnh để trải nghiệm Locket';

    // Nếu đang phát video, dừng và chuyển về ảnh vì bản thường không hỗ trợ upload video
    if (bgVideo && isPlayingVideoPreview) {
      bgVideo.pause();
      bgVideo.style.display = 'none';
      if (bgMedia) bgMedia.style.display = 'block';
      isPlayingVideoPreview = false;
      document.querySelectorAll('.photo-thumb-card').forEach((c, idx) => {
        c.classList.toggle('active', idx === 0);
      });
    }

    // Bản thường luôn tắt âm thanh và ẩn hoàn toàn icon loa ở màn hình feed
    isFeedSoundOn = false;
    const feedVid = document.getElementById('feed-media-video');
    if (feedVid) feedVid.muted = true;
    const feedSoundBtn = document.getElementById('feed-sound-btn');
    if (feedSoundBtn) feedSoundBtn.style.display = 'none';

    if (navigator.vibrate) try { navigator.vibrate(20); } catch (e) {}
  }

  updateMicOrSpeakerState();
  updateCaptionDots(currentCaptionIdx);
}

// 2. Chuyển đổi giữa Chế Độ Camera, Chế Độ Gửi Ảnh và Chế Độ Lướt Feed ("Feed")
function switchMockupView(mode) {
  const cameraHeader = document.getElementById('locket-real-header');
  const sendHeader = document.getElementById('locket-send-header');
  const cameraControls = document.getElementById('locket-camera-controls');
  const sendControls = document.getElementById('locket-send-controls');
  const boxInner = document.getElementById('box-inner-controls');
  const boxCorner = document.getElementById('box-corner-controls');
  const captionPill = document.getElementById('locket-caption-pill');
  const cameraBox = document.getElementById('locket-camera-box');
  const feedView = document.getElementById('locket-feed-view');
  const bgVideo = document.getElementById('locket-bg-video');
  const feedVideo = document.getElementById('feed-media-video');

  if (mode === 'feed') {
    // 1. TẠM DỪNG VÀ TẮT ÂM VIDEO / CAMERA TRƯỚC ĐÓ ĐỂ KHÔNG BỊ PHÁT LỒNG KHI LƯỚT BẠN BÈ
    if (bgVideo) {
      try {
        bgVideo.pause();
      } catch (_) {}
    }

    if (cameraHeader) cameraHeader.style.display = 'none';
    if (sendHeader) sendHeader.style.display = 'none';
    if (cameraControls) cameraControls.style.display = 'none';
    if (sendControls) sendControls.style.display = 'none';
    if (cameraBox) cameraBox.style.display = 'none';
    if (feedView) feedView.style.display = 'flex';
    closeAllDrawers();
    renderFeedPost(currentFeedPostIdx);
  } else if (mode === 'send') {
    // Tạm dừng video ở màn hình feed nếu có
    if (feedVideo) {
      try { feedVideo.pause(); } catch (_) {}
    }
    if (feedView) feedView.style.display = 'none';
    if (cameraBox) cameraBox.style.display = 'block';
    if (cameraHeader) cameraHeader.style.display = 'none';
    if (sendHeader) sendHeader.style.display = 'flex';
    if (cameraControls) cameraControls.style.display = 'none';
    if (sendControls) sendControls.style.display = 'flex';
    if (boxCorner) boxCorner.style.display = 'none';
    if (captionPill) captionPill.style.display = 'inline-flex';

    updateCaptionDots(currentCaptionIdx);

    if (isPlayingVideoPreview) {
      if (boxInner) boxInner.style.display = 'flex';
      const btnFlash = document.getElementById('btn-flash');
      const btnZoom = document.getElementById('btn-zoom');
      if (btnFlash) btnFlash.style.display = 'none';
      if (btnZoom) btnZoom.style.display = 'none';
      updateMicOrSpeakerState();
    } else {
      if (boxInner) boxInner.style.display = 'none';
    }
  } else {
    // Mode 'camera'
    // Tạm dừng video ở màn hình feed
    if (feedVideo) {
      try { feedVideo.pause(); } catch (_) {}
    }
    if (feedView) feedView.style.display = 'none';
    if (cameraBox) cameraBox.style.display = 'block';
    if (cameraHeader) cameraHeader.style.display = 'flex';
    if (sendHeader) sendHeader.style.display = 'none';
    if (cameraControls) cameraControls.style.display = 'flex';
    if (sendControls) sendControls.style.display = 'none';
    if (boxInner) boxInner.style.display = 'flex';
    const btnFlash = document.getElementById('btn-flash');
    const btnZoom = document.getElementById('btn-zoom');
    if (btnFlash) btnFlash.style.display = isMockupGoldActive ? 'none' : 'flex';
    if (btnZoom) btnZoom.style.display = 'inline-block';
    if (boxCorner) boxCorner.style.display = isMockupGoldActive ? 'flex' : 'none';
    if (captionPill) captionPill.style.display = 'none';
    updateMicOrSpeakerState();

    // Tiếp tục phát lại video ở camera nếu trước đó người dùng đang bật video trong camera
    if (bgVideo && bgVideo.style.display === 'block' && bgVideo.src) {
      try {
        bgVideo.play().catch(() => {});
      } catch (_) {}
    }

    closeAllDrawers();
  }
  if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {}
}
window.switchMockupView = switchMockupView;

function cancelSendMode() {
  if (typeof isRecordingVideo !== 'undefined' && isRecordingVideo) {
    if (typeof recordInterval !== 'undefined') clearInterval(recordInterval);
    if (typeof recordAnimFrameId !== 'undefined' && recordAnimFrameId) cancelAnimationFrame(recordAnimFrameId);
    isRecordingVideo = false;
    const shutter = document.getElementById('shutter-btn');
    if (shutter) shutter.classList.remove('recording');
  }

  const cameraBox = document.getElementById('locket-camera-box');
  if (cameraBox) cameraBox.classList.remove('recording');
  const progressSvg = document.querySelector('.box-progress-svg');
  if (progressSvg) progressSvg.classList.remove('active');
  const rectFillElem = document.getElementById('box-rect-fill');
  if (rectFillElem) rectFillElem.style.strokeDashoffset = '920';

  const di = document.getElementById('dynamic-island');
  if (di) di.classList.remove('expanded');
  const diDot = document.getElementById('di-dot');
  if (diDot) diDot.classList.remove('rec');
  const diText = document.getElementById('di-text');
  if (diText) diText.innerText = '';

  // 1. Dừng và ẩn video preview nếu đang phát
  const bgVideo = document.getElementById('locket-bg-video');
  const bgMedia = document.getElementById('locket-bg-media');
  const webcamVideo = document.getElementById('locket-live-webcam');
  if (bgVideo) {
    try {
      bgVideo.pause();
      bgVideo.currentTime = 0;
    } catch (_) {}
    bgVideo.style.display = 'none';
  }
  if (isWebcamActive && liveWebcamStream && webcamVideo) {
    webcamVideo.style.display = 'block';
    webcamVideo.play().catch(() => {});
    if (bgMedia) bgMedia.style.display = 'none';
  } else if (bgMedia) {
    bgMedia.style.display = 'block';
  }
  isPlayingVideoPreview = false;

  // 2. Reset text chú thích về mặc định & xoá màu cũ
  const capText = document.getElementById('locket-caption-text');
  if (capText) capText.innerText = 'Thêm một tin nhắn';
  const photoInput = document.getElementById('photo-caption-input');
  if (photoInput) photoInput.value = '';
  const capPill = document.getElementById('locket-caption-pill');
  if (capPill) {
    Array.from(capPill.classList).forEach(c => {
      if (c.startsWith('pill-')) capPill.classList.remove(c);
    });
  }
  currentCaptionIdx = 0;
  updateCaptionDots(0);

  // 3. Đưa khung chụp về chế độ Camera
  switchMockupView('camera');
}
window.cancelSendMode = cancelSendMode;

// ==================== LOCKET FEED / TIMELINE CONTROLLER ====================
const MOCKUP_FEED_POSTS = [
  {
    id: 'post_friend_1',
    userName: 'lhy',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    timeAgo: '58ph',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80',
    caption: 'cầu xin đi',
    captionColor: 'pill-halloween',
    status: 'posted'
  },
  {
    id: 'post_friend_2',
    userName: 'Thanh Trúc',
    userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    timeAgo: '2h',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=500&auto=format&fit=crop&q=80',
    caption: '🕯 Giáng sinh an lành',
    captionColor: 'pill-xmas-green',
    status: 'posted'
  },
  {
    id: 'post_friend_3',
    userName: 'Minh Anh',
    userAvatar: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=100&auto=format&fit=crop&q=80',
    timeAgo: '4h',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80',
    caption: '🌊 Biển ơi húuuuuuu',
    captionColor: 'pill-bien-oi',
    status: 'posted'
  },
  {
    id: 'post_friend_4',
    userName: 'Đức Huy',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    timeAgo: '8h',
    type: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=80',
    caption: '☕ Cà phê chill sáng',
    captionColor: 'pill-dark',
    status: 'posted'
  }
];

let currentFeedPostIdx = 0;
let isFeedSoundOn = false;

function renderFeedPost(idx) {
  if (!MOCKUP_FEED_POSTS || MOCKUP_FEED_POSTS.length === 0) return;
  const post = MOCKUP_FEED_POSTS[idx] || MOCKUP_FEED_POSTS[0];
  if (!post) return;

  const mediaBg = document.getElementById('feed-media-bg');
  const mediaVideo = document.getElementById('feed-media-video');
  const soundBtn = document.getElementById('feed-sound-btn');
  const capText = document.getElementById('feed-caption-text');
  const capPill = document.getElementById('feed-caption-pill');
  const uploadRow = document.getElementById('feed-uploading-row');
  const authorRow = document.getElementById('feed-author-row');
  const authorAvatar = document.getElementById('feed-author-avatar');
  const authorName = document.getElementById('feed-author-name');
  const postTime = document.getElementById('feed-post-time');
  const noActivityPill = document.getElementById('feed-no-activity-pill');
  const reactionBar = document.getElementById('feed-reaction-bar');

  // Media
  if (post.type === 'video') {
    if (mediaBg) mediaBg.style.display = 'none';
    if (mediaVideo) {
      mediaVideo.style.display = 'block';
      mediaVideo.src = post.mediaUrl;
      // Bản thường tuyệt đối không mở được loa (luôn tắt tiếng)
      mediaVideo.muted = !isMockupGoldActive || !isFeedSoundOn;
      mediaVideo.load();
      mediaVideo.play().catch(() => {});
    }
    if (soundBtn) {
      soundBtn.style.display = isMockupGoldActive ? 'flex' : 'none';
      const soundIcon = document.getElementById('feed-sound-icon');
      if (soundIcon) {
        soundIcon.className = (isMockupGoldActive && isFeedSoundOn) ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
      }
    }
  } else {
    if (mediaVideo) {
      mediaVideo.pause();
      mediaVideo.style.display = 'none';
    }
    if (mediaBg) {
      mediaBg.style.display = 'block';
      mediaBg.style.backgroundImage = `url('${post.mediaUrl}')`;
    }
    if (soundBtn) soundBtn.style.display = 'none';
  }

  // Caption
  if (capText) capText.innerText = post.caption || '';
  if (capPill) {
    Array.from(capPill.classList).forEach(c => {
      if (c.startsWith('pill-')) capPill.classList.remove(c);
    });
    capPill.classList.add(post.captionColor || 'pill-dark');

    // Hiển thị pill caption nếu bài đăng có chú thích (không rỗng và không phải placeholder)
    const hasCap = Boolean(
      post.caption &&
      post.caption.trim() !== '' &&
      post.caption.trim() !== 'Thêm một tin nhắn' &&
      post.caption.trim() !== 'Aa Văn bản'
    );
    if (hasCap) {
      capPill.style.display = 'inline-flex';
    } else {
      capPill.style.display = 'none';
    }
  }

  // Trạng thái đang tải (Ảnh 2) hay Đã đăng (Ảnh 1)
  if (post.status === 'uploading') {
    if (uploadRow) uploadRow.style.display = 'inline-flex';
    if (authorRow) authorRow.style.display = 'none';
    if (noActivityPill) noActivityPill.style.display = 'inline-flex';
    if (reactionBar) reactionBar.style.display = 'none';
  } else {
    if (uploadRow) uploadRow.style.display = 'none';
    if (authorRow) authorRow.style.display = 'inline-flex';
    if (authorAvatar) authorAvatar.src = post.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80';
    if (authorName) authorName.innerText = post.userName || 'Bạn';
    if (postTime) postTime.innerText = post.timeAgo || 'Vừa xong';

    if (noActivityPill) noActivityPill.style.display = 'none';
    if (reactionBar) reactionBar.style.display = 'flex';
  }
}
window.renderFeedPost = renderFeedPost;

function cycleFeedPost(direction) {
  if (!MOCKUP_FEED_POSTS || MOCKUP_FEED_POSTS.length === 0) return;
  currentFeedPostIdx = (currentFeedPostIdx + direction + MOCKUP_FEED_POSTS.length) % MOCKUP_FEED_POSTS.length;
  renderFeedPost(currentFeedPostIdx);
  if (navigator.vibrate) try { navigator.vibrate(20); } catch (e) {}
}
window.cycleFeedPost = cycleFeedPost;

function showHistoryDemo() {
  switchMockupView('feed');
}
window.showHistoryDemo = showHistoryDemo;

function sendFeedReaction(emoji) {
  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');
  if (di && diText) {
    di.classList.add('expanded');
    diText.innerText = `${emoji} Đã gửi cảm xúc đến bạn bè!`;
    setTimeout(() => {
      di.classList.remove('expanded');
      diText.innerText = isMockupGoldActive ? 'Locket Gold VIP' : 'Locket Free (20 bạn)';
    }, 1500);
  }
  if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
}
window.sendFeedReaction = sendFeedReaction;

function toggleFeedSound() {
  const video = document.getElementById('feed-media-video');
  const icon = document.getElementById('feed-sound-icon');
  if (!video) return;

  // Bản thường tuyệt đối không mở được loa âm thanh
  if (!isMockupGoldActive) {
    video.muted = true;
    isFeedSoundOn = false;
    if (icon) icon.className = 'fa-solid fa-volume-xmark';
    showVipLockedAlert('🔒 Bản thường không thể mở loa! Hãy nâng cấp Locket Gold VIP để nghe âm thanh video.');
    return;
  }

  isFeedSoundOn = !isFeedSoundOn;
  video.muted = !isFeedSoundOn;
  if (icon) {
    icon.className = isFeedSoundOn ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
  }

  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');
  if (di && diText) {
    di.classList.add('expanded');
    diText.innerText = isFeedSoundOn ? '🔊 Đã mở loa video' : '🔇 Đã tắt loa video';
    setTimeout(() => di.classList.remove('expanded'), 1500);
  }
  if (navigator.vibrate) try { navigator.vibrate(20); } catch (e) {}
}
window.toggleFeedSound = toggleFeedSound;

function cycleFeedFilter() {
  const filterText = document.getElementById('feed-filter-text');
  if (!filterText) return;
  const filters = ['Mọi người', 'Bạn thân 💛', 'Gia đình 🏠', 'Nhóm VIP 👑'];
  const cur = filters.indexOf(filterText.innerText);
  const next = (cur + 1) % filters.length;
  filterText.innerText = filters[next];
  if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {}
}
window.cycleFeedFilter = cycleFeedFilter;

function openFeedActionSheet() {
  const sheet = document.getElementById('feed-action-sheet');
  const saveText = document.getElementById('feed-save-btn-text');
  if (!sheet) return;

  const currentPost = MOCKUP_FEED_POSTS[currentFeedPostIdx];
  if (saveText && currentPost) {
    saveText.innerText = currentPost.type === 'video' ? 'Lưu video vào Thư viện' : 'Lưu ảnh vào Thư viện';
  }

  sheet.style.display = 'flex';
  if (navigator.vibrate) try { navigator.vibrate(15); } catch (_) {}
}
window.openFeedActionSheet = openFeedActionSheet;

function closeFeedActionSheet() {
  const sheet = document.getElementById('feed-action-sheet');
  if (sheet) sheet.style.display = 'none';
}
window.closeFeedActionSheet = closeFeedActionSheet;

function feedActionSave() {
  closeFeedActionSheet();
  const currentPost = MOCKUP_FEED_POSTS[currentFeedPostIdx];
  if (!currentPost) return;

  try {
    const a = document.createElement('a');
    a.href = currentPost.mediaUrl;
    a.download = `locket_${currentPost.userName || 'moment'}_${Date.now()}.${currentPost.type === 'video' ? 'mp4' : 'jpg'}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (_) {}

  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');
  if (di && diText) {
    di.classList.add('expanded');
    diText.innerText = `💾 Đã lưu ${currentPost.type === 'video' ? 'video' : 'ảnh'} vào Thư viện!`;
    setTimeout(() => {
      di.classList.remove('expanded');
      diText.innerText = isMockupGoldActive ? 'Locket Gold VIP' : 'Locket Free (20 bạn)';
    }, 1800);
  }
  if (navigator.vibrate) try { navigator.vibrate(25); } catch (_) {}
}
window.feedActionSave = feedActionSave;

function feedActionShare() {
  closeFeedActionSheet();
  const currentPost = MOCKUP_FEED_POSTS[currentFeedPostIdx];
  const shareUrl = window.location.href;

  if (navigator.share && currentPost) {
    navigator.share({
      title: `Khoảnh khắc Locket của ${currentPost.userName}`,
      text: currentPost.caption || 'Xem khoảnh khắc trên Locket!',
      url: shareUrl
    }).catch(() => {});
  }

  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');
  if (di && diText) {
    di.classList.add('expanded');
    diText.innerText = '📤 Đã sao chép liên kết chia sẻ!';
    setTimeout(() => {
      di.classList.remove('expanded');
      diText.innerText = isMockupGoldActive ? 'Locket Gold VIP' : 'Locket Free (20 bạn)';
    }, 1800);
  }
  if (navigator.vibrate) try { navigator.vibrate(20); } catch (_) {}
}
window.feedActionShare = feedActionShare;

function feedActionDelete() {
  closeFeedActionSheet();
  if (!MOCKUP_FEED_POSTS || MOCKUP_FEED_POSTS.length === 0) return;

  MOCKUP_FEED_POSTS.splice(currentFeedPostIdx, 1);

  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');
  if (di && diText) {
    di.classList.add('expanded');
    diText.innerText = '🗑️ Đã xóa khoảnh khắc thành công!';
    setTimeout(() => {
      di.classList.remove('expanded');
      diText.innerText = isMockupGoldActive ? 'Locket Gold VIP' : 'Locket Free (20 bạn)';
    }, 1800);
  }

  if (MOCKUP_FEED_POSTS.length === 0) {
    setTimeout(() => {
      switchMockupView('camera');
    }, 400);
  } else {
    currentFeedPostIdx = Math.min(currentFeedPostIdx, MOCKUP_FEED_POSTS.length - 1);
    renderFeedPost(currentFeedPostIdx);
  }

  if (navigator.vibrate) try { navigator.vibrate([30, 40]); } catch (_) {}
}
window.feedActionDelete = feedActionDelete;

function shareCurrentFeedPost() {
  openFeedActionSheet();
}
window.shareCurrentFeedPost = shareCurrentFeedPost;

function confirmSendToFriends() {
  const bgVideo = document.getElementById('locket-bg-video');
  const bgMedia = document.getElementById('locket-bg-media');
  const capText = document.getElementById('locket-caption-text');
  const capPill = document.getElementById('locket-caption-pill');

  let mediaType = isPlayingVideoPreview ? 'video' : 'image';
  let mediaSrc = '';

  if (mediaType === 'video' && bgVideo && bgVideo.src) {
    mediaSrc = bgVideo.src;
  } else if (bgMedia && bgMedia.style.backgroundImage) {
    const raw = bgMedia.style.backgroundImage;
    mediaSrc = raw.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
  } else {
    mediaSrc = MOCKUP_PHOTOS[currentMockupPhotoIdx] || MOCKUP_PHOTOS[0];
  }

  const photoInput = document.getElementById('photo-caption-input');
  const rawInputVal = (photoInput && photoInput.value) ? photoInput.value.trim() : '';
  const rawSpanVal = (capText && capText.innerText) ? capText.innerText.trim() : '';

  let captionText = '';
  if (rawInputVal && rawInputVal !== 'Thêm một tin nhắn' && rawInputVal !== 'Aa Văn bản') {
    captionText = rawInputVal;
  } else if (rawSpanVal && rawSpanVal !== 'Thêm một tin nhắn' && rawSpanVal !== 'Aa Văn bản') {
    captionText = rawSpanVal;
  }

  let captionColor = 'pill-dark';
  if (capPill) {
    const pillClasses = Array.from(capPill.classList);
    const activeColor = pillClasses.find(c => c.startsWith('pill-') && c !== 'pill-dark');
    if (activeColor) {
      captionColor = activeColor;
    } else if (captionText) {
      captionColor = getCaptionColorClass(captionText);
    }
  } else if (captionText) {
    captionColor = getCaptionColorClass(captionText);
  }

  // 1. Tạo bài đăng mới với trạng thái Đang gửi (Ảnh 2 của user)
  const myPost = {
    id: 'my_post_' + Date.now(),
    userName: 'Bạn',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    timeAgo: 'Vừa xong',
    type: mediaType,
    mediaUrl: mediaSrc,
    caption: captionText,
    captionColor: captionColor,
    status: 'uploading' // Vòng xoay spinner "Đang gửi..."
  };

  // Đưa bài mới lên vị trí đầu tiên
  MOCKUP_FEED_POSTS.unshift(myPost);
  currentFeedPostIdx = 0;

  // 2. Chuyển ngay sang màn hình Feed để thấy bài đang load (Ảnh 2 của user)
  switchMockupView('feed');
  renderFeedPost(0);

  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');
  if (di && diText) {
    di.classList.add('expanded');
    diText.innerText = '📤 Đang gửi lên Widget bạn bè...';
  }
  if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}

  // 3. Sau 1.4s: Đăng thành công -> Hiển thị bài đã đăng kèm thời gian và thanh thả cảm xúc (Ảnh 1 của user)
  setTimeout(() => {
    myPost.status = 'posted';
    if (currentFeedPostIdx === 0) {
      renderFeedPost(0);
    }
    // Reset ô nhập caption cho lượt chụp/đăng mới tiếp theo
    if (photoInput) photoInput.value = '';
    if (capText) capText.innerText = 'Thêm một tin nhắn';
    if (di && diText) {
      diText.innerText = '✈️ Đã đăng khoảnh khắc thành công!';
      setTimeout(() => {
        di.classList.remove('expanded');
        diText.innerText = isMockupGoldActive ? 'Locket Gold VIP' : 'Locket Free (20 bạn)';
      }, 1800);
    }
    if (navigator.vibrate) try { navigator.vibrate([40, 60]); } catch (e) {}
  }, 1400);
}
window.confirmSendToFriends = confirmSendToFriends;

function toggleFriendSelect(el) {
  if (!el) return;
  el.classList.toggle('active');
  if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {}
}

function mockupDownloadPhoto() {
  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');
  if (di && diText) {
    di.classList.add('expanded');
    diText.innerText = '💾 Đã lưu ảnh vào Camera Roll!';
    setTimeout(() => {
      di.classList.remove('expanded');
      diText.innerText = isMockupGoldActive ? 'Locket Gold VIP' : 'Locket Free';
    }, 1500);
  }
  if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) {}
}

function showHistoryDemo() {
  // Lướt lên xem bài đăng bạn bè và bài của mình
  switchMockupView('feed');
}
window.showHistoryDemo = showHistoryDemo;

// ==================== QUẢN LÝ NGĂN KÉO BOTTOM SHEET (CHÚ THÍCH & TẠO DIỆN MẠO) ====================
function openCaptionDrawer() {
  const backdrop = document.getElementById('locket-sheet-backdrop');
  const drawer = document.getElementById('vip-caption-drawer');
  if (backdrop) backdrop.classList.add('active');
  if (drawer) drawer.classList.add('open');
  if (navigator.vibrate) try { navigator.vibrate(20); } catch (e) {}
}

function openEffectsDrawer() {
  const backdrop = document.getElementById('locket-sheet-backdrop');
  const drawer = document.getElementById('vip-effects-drawer');
  if (backdrop) backdrop.classList.add('active');
  if (drawer) drawer.classList.add('open');
  if (navigator.vibrate) try { navigator.vibrate(20); } catch (e) {}
}

function closeAllDrawers() {
  const backdrop = document.getElementById('locket-sheet-backdrop');
  const capDrawer = document.getElementById('vip-caption-drawer');
  const effDrawer = document.getElementById('vip-effects-drawer');
  const galDrawer = document.getElementById('locket-gallery-drawer');
  closeFeedActionSheet();
  if (backdrop) backdrop.classList.remove('active');
  if (capDrawer) capDrawer.classList.remove('open');
  if (effDrawer) effDrawer.classList.remove('open');
  if (galDrawer) galDrawer.classList.remove('open');
}
window.closeAllDrawers = closeAllDrawers;

// ==================== DRAWER THƯ VIỆN ẢNH & VIDEO iOS CHUẨN LOCKET ====================
function openGalleryPickerDrawer() {
  const backdrop = document.getElementById('locket-sheet-backdrop');
  const drawer = document.getElementById('locket-gallery-drawer');
  if (backdrop) backdrop.classList.add('active');
  if (drawer) drawer.classList.add('open');
  if (navigator.vibrate) try { navigator.vibrate(20); } catch (e) {}
}
window.openGalleryPickerDrawer = openGalleryPickerDrawer;

function switchPickerSubTab(tab) {
  const btnPhotos = document.getElementById('picker-tab-photos');
  const btnAlbums = document.getElementById('picker-tab-albums');
  if (tab === 'photos') {
    if (btnPhotos) btnPhotos.classList.add('active');
    if (btnAlbums) btnAlbums.classList.remove('active');
  } else {
    if (btnAlbums) btnAlbums.classList.add('active');
    if (btnPhotos) btnPhotos.classList.remove('active');
  }
}
window.switchPickerSubTab = switchPickerSubTab;

function selectPickerPhoto(idx) {
  setMockupPhoto(idx);
  switchMockupView('send');
  closeAllDrawers();
}
window.selectPickerPhoto = selectPickerPhoto;

function selectPickerVideo(idx) {
  if (!isMockupGoldActive) {
    showVipLockedAlert('🔒 Bản thường chỉ có thể chọn Ảnh! Hãy bật Locket Gold VIP để chọn và phát Video.');
    return;
  }
  handleVideoCardClick(idx);
  closeAllDrawers();
}
window.selectPickerVideo = selectPickerVideo;

const CAPTION_COLOR_MAP = {
  'Aa Văn bản': 'pill-dark',
  '🎃 Halloween': 'pill-halloween',
  '🕯 Giáng sinh an lành': 'pill-xmas-green',
  '🎄 Giáng sinh an lành': 'pill-xmas-red',
  '🥂 Xin chào 2027!': 'pill-2027-gold',
  '💫 Xin chào 2027!': 'pill-2027-purple',
  '2027': 'pill-2027-red',
  '⭐ Review': 'pill-dark',
  '🎵 Đang phát': 'pill-dark',
  '📍 Vị trí': 'pill-dark',
  '☀️ Thời tiết': 'pill-weather',
  '🔥 4': 'pill-streak',
  '🥺 Nho anh ch?': 'pill-nho-anh',
  '🌊 Biển ơi húuuuuuu': 'pill-bien-oi',
  '❤️ Yêu Mẹ': 'pill-yeu-me',
  '💔 nhớ ngy': 'pill-nho-ngy',
  '🌀 Oẳn tà là vằn': 'pill-oan-ta',
  '🤔 Khả Năng Cao': 'pill-kha-nang',
  '💅 ơ quá kiêu': 'pill-qua-kieu',
  '❄️ lạnh nhớ ai': 'pill-lanh-nho-ai',
  '🙅‍♂️ Đừng nhăng nhít': 'pill-nhang-nhit',
  '🥀 hôm nay tôi buồn': 'pill-toi-buon',
  '🍻 gặp nhau cái nhỉ': 'pill-gap-nhau',
  '🥰 ank iu eim': 'pill-ank-iu',
  '🪷 Mong tôn hoa sen thấy cảnh': 'pill-sen',
  '🥊 đấm nhau không': 'pill-dam-nhau',
  '🐉 siêu cấp bá khí': 'pill-ba-khi',
  '👻 dự án ma': 'pill-du-an-ma',
  '💳 đọc số tài khoản': 'pill-so-tk',
  '🚶 ai sợ thì đi về': 'pill-ai-so',
  '🧶 còn cái nịt': 'pill-cai-nit',
  '🎤 cảnh báo có hát': 'pill-canh-bao',
  '😒 Thân chưa mà dỡn': 'pill-than-chua',
  '🤨 Ai mượn?': 'pill-ai-muon',
  '🙄 Hay ra dẻ quá à!': 'pill-hay-ra-de',
  '🎮 Giảm sức mạnh con tướng': 'pill-giam-sm',
  '🫣 Mắc cỡ quá hai ơi': 'pill-mac-co',
  '🪩 Party Time!': 'pill-party',
  '☀️ Good morning': 'pill-morning',
  '🌙 Goodnight': 'pill-night',
  '🕶️ OOTD': 'pill-ootd',
  '🥰 Miss you': 'pill-missyou',
  '😤 Dỗi rồi': 'pill-pout',
  '💭 Đang bận tương tư': 'pill-crush',
  '📩 Rep tin nhắn đi': 'pill-rep',
  '🐥 Mỏ hỗn nhưng tâm hiền': 'pill-snark',
  '🫂 Muốn được ôm': 'pill-hug',
  '🫱 Hơi bị nhớ': 'pill-miss',
  '🔥 Đang ghen': 'pill-jealous',
  '🌌 Ngủ ngon giấc mơ có em': 'pill-sweetdream',
  '🗡️ Hảo hán': 'pill-hero',
  '🤧 Cảm lạnh': 'pill-cold-sick',
  '🏳️ Bất lực': 'pill-helpless',
  '🥺 Xin lũi được chưa': 'pill-sorry',
  '😭 Rớt nước mắt': 'pill-cry',
  '📉 Gục ngã': 'pill-fall',
  '🌪️ Tiền đình': 'pill-dizzy',
  '👎 Chê mạnh': 'pill-dislike',
  '💅 Xinh gái ấn phím 1': 'pill-pretty',
  '🤡 Đi làm vì đam mê': 'pill-clown',
  '💖 Yeuu Emm': 'pill-pink',
  '💙 Yeuu Anhh': 'pill-blue',
  '🌧️ Hồi chiều trời mưa': 'pill-rain',
  '🍂 côn viên lá làn': 'pill-autumn',
  '🐷 aiiii hoiiii ?': 'pill-pig',
  '👂 Tai ông để ngoài đầu à': 'pill-ear',
  '🙄 Chan bố mày đi': 'pill-angry',
  '🥬 oách xà lách': 'pill-salad',
  '🤭 è hé': 'pill-giggle',
  '📞 Ủa alo': 'pill-phone',
  '🍃 Máy chủ lá đu đủ': 'pill-leaf',
  '🥶 lạnh thấy mẹ': 'pill-cold',
  '🤷‍♂️ Đấy Là Cái Việc': 'pill-thatsthat',
  '📱 Đẹp trai ấn phím 2': 'pill-handsome'
};

function getCaptionColorClass(text) {
  if (!text) return 'pill-dark';
  const clean = text.trim();
  if (CAPTION_COLOR_MAP[clean]) return CAPTION_COLOR_MAP[clean];
  const pills = document.querySelectorAll('.vip-cap-pill');
  for (const btn of pills) {
    const btnText = btn.innerText.trim();
    if (btnText === clean || btnText.includes(clean) || clean.includes(btnText)) {
      const cls = Array.from(btn.classList).find(c => c.startsWith('pill-'));
      if (cls) return cls;
    }
  }
  return 'pill-dark';
}

function applyQuickCaption(text, direction = 0) {
  const capText = document.getElementById('locket-caption-text');
  const photoInput = document.getElementById('photo-caption-input');
  const pill = document.getElementById('locket-caption-pill');
  if (capText) capText.innerText = text;
  if (photoInput) {
    if (text === 'Thêm một tin nhắn' || text === 'Aa Văn bản') {
      photoInput.value = '';
    } else {
      photoInput.value = text;
    }
  }
  if (pill) {
    pill.style.display = 'inline-flex';

    // Xoá mọi màu caption cũ và gán màu rực rỡ tương ứng
    Array.from(pill.classList).forEach(c => {
      if (c.startsWith('pill-')) pill.classList.remove(c);
    });
    const colorCls = getCaptionColorClass(text);
    pill.classList.add(colorCls);

    if (direction !== 0 && capText) {
      capText.classList.remove('slide-in-right', 'slide-in-left');
      void capText.offsetWidth; // Force reflow
      capText.classList.add(direction > 0 ? 'slide-in-right' : 'slide-in-left');
      setTimeout(() => {
        capText.classList.remove('slide-in-right', 'slide-in-left');
      }, 240);
    } else {
      pill.style.transform = 'translateX(-50%) scale(1.06)';
      setTimeout(() => {
        pill.style.transform = 'translateX(-50%) scale(1)';
      }, 150);
    }
  }

  // Đồng bộ index và dãy dấu chấm lướt caption
  const list = isMockupGoldActive ? ALL_VIP_CAPTIONS : STANDARD_CAPTIONS;
  const foundIdx = list.indexOf(text);
  if (foundIdx !== -1) {
    currentCaptionIdx = foundIdx;
  }
  updateCaptionDots(currentCaptionIdx);

  closeAllDrawers();
  if (navigator.vibrate) try { navigator.vibrate(20); } catch (e) {}
}

function selectTextMessageCaption(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const pill = document.getElementById('locket-caption-pill');
  const input = document.getElementById('photo-caption-input');
  const capText = document.getElementById('locket-caption-text');

  // Đưa pill về màu đen mờ chuẩn Locket như trong ảnh người dùng
  if (pill) {
    pill.style.display = 'inline-flex';
    Array.from(pill.classList).forEach(c => {
      if (c.startsWith('pill-')) pill.classList.remove(c);
    });
    pill.classList.add('pill-dark');
  }

  if (capText) {
    capText.innerText = input && input.value.trim() ? input.value.trim() : 'Thêm một tin nhắn';
  }

  // Đóng drawer ngay lập tức
  closeAllDrawers();

  // "Trỏ ra cái này": Focus con trỏ vào ô nhập "Thêm một tin nhắn" trên ảnh
  setTimeout(() => {
    if (input) {
      input.focus();
      if (input.value) {
        input.select();
      }
    }
  }, 100);

  if (navigator.vibrate) try { navigator.vibrate(20); } catch (_) {}
}
window.selectTextMessageCaption = selectTextMessageCaption;

function focusPhotoCaptionInput(e) {
  if (e) e.stopPropagation();
  const input = document.getElementById('photo-caption-input');
  if (input) {
    input.focus();
  }
}
window.focusPhotoCaptionInput = focusPhotoCaptionInput;

function handlePhotoCaptionInput(val) {
  const capText = document.getElementById('locket-caption-text');
  const cleanVal = (val || '').trim();
  if (capText) {
    capText.innerText = cleanVal || 'Thêm một tin nhắn';
  }
}
window.handlePhotoCaptionInput = handlePhotoCaptionInput;

// Tương thích ngược
function focusAaInput(e) {
  selectTextMessageCaption(e);
}
window.focusAaInput = focusAaInput;

function handleAaInput(val) {
  handlePhotoCaptionInput(val);
}
window.handleAaInput = handleAaInput;

function submitCustomCaption() {
  closeAllDrawers();
}
window.submitCustomCaption = submitCustomCaption;

function handleCaptionInput(e) {
  if (e && e.key === 'Enter') {
    e.preventDefault();
    closeAllDrawers();
  }
}
window.handleCaptionInput = handleCaptionInput;

function applyFilterLook(type, el) {
  document.querySelectorAll('.effect-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');

  const bg = document.getElementById('locket-bg-media');
  if (bg) {
    bg.style.filter = 'brightness(1.2) contrast(1.15) hue-rotate(25deg)';
    setTimeout(() => {
      bg.style.filter = isMockupFlashOn ? 'brightness(1.4)' : 'brightness(1)';
    }, 1800);
  }

  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');
  if (di && diText) {
    di.classList.add('expanded');
    diText.innerText = '✨ Áp dụng diện mạo VIP';
    setTimeout(() => {
      di.classList.remove('expanded');
      diText.innerText = isMockupGoldActive ? 'Locket Gold VIP' : 'Locket Free';
    }, 1600);
  }
  if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
}

// Chạm caption đổi chú thích (Có kiểm tra VIP)
function handleCardCaptionClick(text, el) {
  if (!isMockupGoldActive) {
    showVipLockedAlert('🔒 Kho Caption Hot Trend chỉ dành cho Locket Gold VIP! Vui lòng bật chế độ VIP.');
    return;
  }
  setMockupCaption(text, el);
}

// Chạm caption trong Bottom Sheet Drawer (Có kiểm tra VIP)
function handleDrawerCaptionClick(text, isFreeAllowed) {
  if (isFreeAllowed || STANDARD_CAPTIONS.includes(text)) {
    applyQuickCaption(text);
    return;
  }
  if (!isMockupGoldActive) {
    showVipLockedAlert('🔒 Caption Hot Trend này chỉ có trên Locket Gold VIP!');
    return;
  }
  applyQuickCaption(text);
}

function setMockupCaption(text, el) {
  document.querySelectorAll('.caption-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');

  applyQuickCaption(text);
}

// ==================== 4. QUẢN LÝ LƯỚT CAPTION QUA LẠI ====================
// Caption Chuẩn Bản Thường (Theo ảnh chụp màn hình thực tế của người dùng)
const STANDARD_CAPTIONS = [
  'Aa Văn bản',
  '🎃 Halloween',
  '🕯 Giáng sinh an lành',
  '🎄 Giáng sinh an lành',
  '🥂 Xin chào 2027!',
  '💫 Xin chào 2027!',
  '2027',
  '⭐ Review',
  '🎵 Đang phát',
  '📍 Vị trí',
  '☀️ Thời tiết',
  '⏰ 1:57 SA',
  '🔥 4'
];

// Caption Độc Quyền VIP (Hot trend mở rộng khi bật Locket Gold)
const ALL_VIP_CAPTIONS = [
  '✨ slay cả ngày cùng locket gold 💅',
  '🥺 Nho anh ch?',
  '🌊 Biển ơi húuuuuuu',
  '❤️ Yêu Mẹ',
  '💔 nhớ ngy',
  '🌀 Oẳn tà là vằn',
  '🤔 Khả Năng Cao',
  '💅 ơ quá kiêu',
  '❄️ lạnh nhớ ai',
  '🙅‍♂️ Đừng nhăng nhít',
  '🥀 hôm nay tôi buồn',
  '🍻 gặp nhau cái nhỉ',
  '🥰 ank iu eim',
  '🪷 Mong tôn hoa sen thấy cảnh',
  '🥊 đấm nhau không',
  '🐉 siêu cấp bá khí',
  '👻 dự án ma',
  '💳 đọc số tài khoản',
  '🚶 ai sợ thì đi về',
  '🧶 còn cái nịt',
  '🎤 cảnh báo có hát',
  '😒 Thân chưa mà dỡn',
  '🤨 Ai mượn?',
  '🙄 Hay ra dẻ quá à!',
  '🎮 Giảm sức mạnh con tướng',
  '🫣 Mắc cỡ quá hai ơi',
  '🍊 tổ cam vip - uy tín 24/7 bảo hành đến khi web còn 🔥',
  '🎬 khoảnh khắc video 30 giây siêu nét 📸'
];
let currentCaptionIdx = 0;

function cycleCaption(direction) {
  // Bản Thường: lướt qua các caption chuẩn General từ ảnh chụp
  // Bản VIP: lướt qua toàn bộ kho caption Hot Trend VIP độc quyền
  const list = isMockupGoldActive ? ALL_VIP_CAPTIONS : STANDARD_CAPTIONS;
  currentCaptionIdx = (currentCaptionIdx + direction + list.length) % list.length;
  const newCap = list[currentCaptionIdx];
  applyQuickCaption(newCap, direction);
  updateCaptionDots(currentCaptionIdx);
}

// Cập nhật dãy dấu chấm lướt caption (Dots Indicator)
function updateCaptionDots(idx = currentCaptionIdx) {
  const dotsContainer = document.getElementById('locket-dots-row');
  if (!dotsContainer) return;

  const totalDots = 6;
  const activeDot = ((idx % totalDots) + totalDots) % totalDots;

  dotsContainer.innerHTML = Array.from({ length: totalDots }).map((_, i) => {
    const isAct = i === activeDot ? 'active' : '';
    return `<span class="${isAct}" onclick="onDotClick(${i})" title="Caption ${i + 1}"></span>`;
  }).join('');
}

function onDotClick(dotIdx) {
  const list = isMockupGoldActive ? ALL_VIP_CAPTIONS : STANDARD_CAPTIONS;
  currentCaptionIdx = dotIdx % list.length;
  applyQuickCaption(list[currentCaptionIdx], 0);
  updateCaptionDots(currentCaptionIdx);
}

// Cử chỉ vuốt kéo chuột / chạm màn hình trực tiếp trên caption và màn hình để lướt
function setupCaptionSwipeGesture() {
  const box = document.getElementById('locket-camera-box');
  const pill = document.getElementById('locket-caption-pill');
  const dotsRow = document.getElementById('locket-dots-row');
  if (!box || !pill) return;

  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  let hasDragged = false;
  let wheelThrottle = false;

  function onSwipeStart(clientX) {
    const sendHeader = document.getElementById('locket-send-header');
    if (!sendHeader || sendHeader.style.display === 'none') return false;
    isDragging = true;
    startX = clientX;
    currentX = clientX;
    hasDragged = false;
    pill.classList.add('dragging');
    return true;
  }

  function onSwipeMove(clientX) {
    if (!isDragging) return;
    currentX = clientX;
    const diffX = currentX - startX;
    if (Math.abs(diffX) > 5) {
      hasDragged = true;
      const clamped = Math.max(-42, Math.min(42, diffX * 0.45));
      pill.style.transform = `translateX(calc(-50% + ${clamped}px)) scale(1.02)`;
    }
  }

  function onSwipeEnd() {
    if (!isDragging) return;
    isDragging = false;
    pill.classList.remove('dragging');
    pill.style.transform = 'translateX(-50%)';

    const diffX = currentX - startX;
    if (Math.abs(diffX) > 15) {
      if (diffX < 0) {
        cycleCaption(1); // Vuốt sang trái -> xem caption tiếp theo
      } else {
        cycleCaption(-1); // Vuốt sang phải -> xem caption trước đó
      }
    }
  }

  // Pointer Events trên chính thanh Caption Pill
  pill.addEventListener('pointerdown', (e) => {
    if (onSwipeStart(e.clientX)) {
      try { pill.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    }
  });

  pill.addEventListener('pointermove', (e) => {
    if (isDragging) {
      onSwipeMove(e.clientX);
      e.preventDefault();
    }
  });

  pill.addEventListener('pointerup', (e) => {
    if (isDragging) {
      try { pill.releasePointerCapture(e.pointerId); } catch (_) {}
      onSwipeEnd();
    }
  });

  pill.addEventListener('pointercancel', (e) => {
    if (isDragging) {
      try { pill.releasePointerCapture(e.pointerId); } catch (_) {}
      onSwipeEnd();
    }
  });

  // Hỗ trợ vuốt trên toàn bộ khung ảnh (Camera box)
  box.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#locket-caption-pill') || 
        e.target.closest('#box-inner-controls') || 
        e.target.closest('#box-corner-controls')) return;
    if (onSwipeStart(e.clientX)) {
      try { box.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    }
  });

  box.addEventListener('pointermove', (e) => {
    if (isDragging) {
      onSwipeMove(e.clientX);
      e.preventDefault();
    }
  });

  box.addEventListener('pointerup', () => {
    if (isDragging) {
      onSwipeEnd();
    }
  });

  box.addEventListener('pointercancel', () => {
    if (isDragging) {
      onSwipeEnd();
    }
  });

  // Hỗ trợ vuốt trên dãy dấu chấm
  if (dotsRow) {
    dotsRow.addEventListener('pointerdown', (e) => {
      if (onSwipeStart(e.clientX)) {
        try { dotsRow.setPointerCapture(e.pointerId); } catch (_) {}
      }
    });
    dotsRow.addEventListener('pointermove', (e) => {
      if (isDragging) onSwipeMove(e.clientX);
    });
    dotsRow.addEventListener('pointerup', () => {
      if (isDragging) onSwipeEnd();
    });
  }

  // Chặn mở drawer nếu người dùng vừa thao tác kéo lướt chuột; click bình thường sẽ mở drawer
  pill.addEventListener('click', (e) => {
    if (hasDragged) {
      e.stopImmediatePropagation();
      e.preventDefault();
      hasDragged = false;
    } else {
      if (e.target && e.target.id === 'photo-caption-input') {
        return; // Cho phép người dùng gõ trực tiếp vào ô input "Thêm một tin nhắn" trên ảnh
      }
      openCaptionDrawer();
    }
  });

  // Lăn con trỏ chuột (Mouse Wheel) để lướt caption siêu mượt trên PC
  box.addEventListener('wheel', (e) => {
    const sendHeader = document.getElementById('locket-send-header');
    if (!sendHeader || sendHeader.style.display === 'none') return;
    if (wheelThrottle) return;
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    if (Math.abs(delta) > 10) {
      e.preventDefault();
      wheelThrottle = true;
      if (delta > 0) {
        cycleCaption(1);
      } else {
        cycleCaption(-1);
      }
      setTimeout(() => { wheelThrottle = false; }, 160);
    }
  }, { passive: false });
}

// Hỗ trợ cuộn chuột & kéo lướt mượt mà trong danh sách chú thích (Drawer)
function setupDrawerDragToScroll() {
  const list = document.querySelector('.caption-pills-list');
  if (!list) return;

  let isDown = false;
  let startY = 0;
  let scrollTop = 0;
  let hasMoved = false;

  list.addEventListener('mousedown', (e) => {
    isDown = true;
    hasMoved = false;
    startY = e.pageY;
    scrollTop = list.scrollTop;
    list.classList.add('dragging');
  });

  window.addEventListener('mouseup', () => {
    isDown = false;
    if (list) list.classList.remove('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDown || !list) return;
    const diffY = e.pageY - startY;
    if (Math.abs(diffY) > 5) {
      hasMoved = true;
      e.preventDefault();
      list.scrollTop = scrollTop - diffY;
    }
  });

  // Chặn click nhầm vào caption nếu người dùng đang kéo lướt danh sách
  list.addEventListener('click', (e) => {
    if (hasMoved) {
      e.stopPropagation();
      e.preventDefault();
      hasMoved = false;
    }
  }, true);

  // Cuộn con trỏ chuột (Mouse Wheel) mượt mà
  list.addEventListener('wheel', (e) => {
    e.stopPropagation();
    list.scrollTop += e.deltaY;
  }, { passive: true });
}

// Cử chỉ lướt lên vào Feed Timeline và lướt xuống quay về Camera
function setupFeedGestures() {
  const cameraBox = document.getElementById('locket-camera-box');
  const feedView = document.getElementById('locket-feed-view');

  // 1. Vuốt lên từ Camera Box để vào màn hình Feed
  if (cameraBox) {
    let camStartY = 0;
    let camStartX = 0;
    let isCamTracking = false;

    cameraBox.addEventListener('pointerdown', (e) => {
      const sendHeader = document.getElementById('locket-send-header');
      if (sendHeader && sendHeader.style.display !== 'none') return;
      if (e.target.closest('#box-inner-controls') || e.target.closest('#box-corner-controls')) return;
      camStartY = e.clientY;
      camStartX = e.clientX;
      isCamTracking = true;
    });

    cameraBox.addEventListener('pointerup', (e) => {
      if (!isCamTracking) return;
      isCamTracking = false;
      const diffY = e.clientY - camStartY;
      const diffX = e.clientX - camStartX;
      if (diffY < -30 && Math.abs(diffY) > Math.abs(diffX)) {
        switchMockupView('feed');
      }
    });

    cameraBox.addEventListener('pointercancel', () => { isCamTracking = false; });
  }

  // 2. Cử chỉ trong Feed View:
  // - Vuốt xuống: Trở lại màn hình Camera
  // - Vuốt lên: Xem bài đăng bạn bè tiếp theo
  if (feedView) {
    let feedStartY = 0;
    let feedStartX = 0;
    let isFeedTracking = false;

    feedView.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.locket-feed-dock') || e.target.closest('.locket-feed-header') || e.target.closest('.reaction-emojis')) return;
      feedStartY = e.clientY;
      feedStartX = e.clientX;
      isFeedTracking = true;
    });

    feedView.addEventListener('pointerup', (e) => {
      if (!isFeedTracking) return;
      isFeedTracking = false;
      const diffY = e.clientY - feedStartY;
      const diffX = e.clientX - feedStartX;

      if (Math.abs(diffY) > 30 && Math.abs(diffY) > Math.abs(diffX)) {
        if (diffY > 30) {
          switchMockupView('camera');
        } else if (diffY < -30) {
          cycleFeedPost(1);
        }
      }
    });

    feedView.addEventListener('pointercancel', () => { isFeedTracking = false; });

    // Hỗ trợ cuộn chuột
    feedView.addEventListener('wheel', (e) => {
      if (feedView.style.display === 'none') return;
      e.preventDefault();
      if (e.deltaY > 15) {
        cycleFeedPost(1);
      } else if (e.deltaY < -15) {
        cycleFeedPost(-1);
      }
    }, { passive: false });
  }
}

// ==================== 5. QUẢN LÝ KHO VIDEO VIP & ẢNH THƯ VIỆN ====================
function getVipVideoList() {
  if (window.VIP_VIDEOS && Array.isArray(window.VIP_VIDEOS) && window.VIP_VIDEOS.length > 0) {
    return window.VIP_VIDEOS;
  }
  return [
    {
      title: '🎬 video-1.mp4',
      src: 'videos/video-1.mp4',
      fallback: 'videos/video-1.mp4',
      thumb: 'images/thumb-video-1.jpg'
    },
    {
      title: '🎬 video-2.mp4',
      src: 'videos/video-2.mp4',
      fallback: 'videos/video-2.mp4',
      thumb: 'images/thumb-video-2.jpg'
    }
  ];
}

// ==================== QUẢN LÝ LƯU TRỮ VÀ HIỂN THỊ MEDIA TẢI LÊN (INDEXEDDB) ====================
const UPLOAD_DB_NAME = 'LocketUserMediaDB';
const UPLOAD_DB_VERSION = 1;
const UPLOAD_STORE_NAME = 'uploads';
const uploadedMediaCache = new Map();

function openUploadMediaDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const req = indexedDB.open(UPLOAD_DB_NAME, UPLOAD_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(UPLOAD_STORE_NAME)) {
        db.createObjectStore(UPLOAD_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function saveUploadedMediaToDB(item) {
  const db = await openUploadMediaDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(UPLOAD_STORE_NAME, 'readwrite');
      const store = tx.objectStore(UPLOAD_STORE_NAME);
      store.put(item);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (err) {
      resolve(false);
    }
  });
}

async function getAllUploadedMediaFromDB() {
  const db = await openUploadMediaDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(UPLOAD_STORE_NAME, 'readonly');
      const store = tx.objectStore(UPLOAD_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (err) {
      resolve([]);
    }
  });
}

async function deleteUploadedMediaFromDB(id) {
  const db = await openUploadMediaDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(UPLOAD_STORE_NAME, 'readwrite');
      const store = tx.objectStore(UPLOAD_STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (err) {
      resolve(false);
    }
  });
}

function generateVideoThumbnail(file) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          URL.revokeObjectURL(url);
          resolve('images/thumb-video-1.jpg');
        }
      }, 2500);

      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(0.5, video.duration > 1 ? 0.5 : 0.1);
        } catch (e) {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            URL.revokeObjectURL(url);
            resolve('images/thumb-video-1.jpg');
          }
        }
      };

      video.onseeked = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 120;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } catch (err) {
          URL.revokeObjectURL(url);
          resolve('images/thumb-video-1.jpg');
        }
      };

      video.onerror = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve('images/thumb-video-1.jpg');
      };
    } catch (e) {
      resolve('images/thumb-video-1.jpg');
    }
  });
}

function generateImageThumbnail(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve('images/thumb-video-1.jpg');
    reader.readAsDataURL(file);
  });
}

function renderUploadedCard(item) {
  const container = document.getElementById('user-uploaded-items-list');
  if (container) {
    const existing = document.getElementById(`uploaded-${item.id}`);
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.className = 'photo-thumb-card uploaded-item vip-item';
    card.id = `uploaded-${item.id}`;
    card.title = item.name;
    card.onclick = () => playUploadedItem(item.id, card);

    const prefix = item.type === 'video' ? '🎬 ' : '🖼️ ';
    card.innerHTML = `
      <button class="uploaded-card-delete" onclick="event.stopPropagation(); removeUploadedItem('${item.id}')" title="Xóa file này">×</button>
      <img src="${item.thumb || 'images/thumb-video-1.jpg'}" alt="${item.name}">
      <span>${prefix}${item.name}</span>
    `;

    container.appendChild(card);
  }

  // Đồng bộ vào iOS Gallery Picker Drawer
  const pickerContainer = document.getElementById('picker-user-uploaded-items');
  if (pickerContainer) {
    const existingPickerItem = document.getElementById(`picker-item-${item.id}`);
    if (existingPickerItem) existingPickerItem.remove();

    const pickerItem = document.createElement('div');
    pickerItem.id = `picker-item-${item.id}`;
    pickerItem.className = `ios-grid-item ${item.type === 'video' ? 'picker-vip-item' : 'photo-item'}`;
    pickerItem.title = item.name;
    pickerItem.onclick = () => {
      playUploadedItem(item.id);
      closeAllDrawers();
    };

    if (item.type === 'video') {
      pickerItem.innerHTML = `
        <img src="${item.thumb || 'images/thumb-video-1.jpg'}" alt="${item.name}">
        <span class="ios-video-duration">VIP</span>
      `;
    } else {
      pickerItem.innerHTML = `
        <img src="${item.thumb || 'images/thumb-video-1.jpg'}" alt="${item.name}">
      `;
    }
    pickerContainer.prepend(pickerItem);
  }
}

async function playUploadedItem(id, el) {
  const item = uploadedMediaCache.get(id);
  if (!item) return;

  if (item.type === 'video') {
    // Kiểm tra bản thường: KHÔNG cho chọn video ở bản thường
    if (!isMockupGoldActive) {
      showVipLockedAlert('🔒 Bản thường không thể chọn Video! Hãy bật Locket Gold VIP để phát Video.');
      return;
    }

    document.querySelectorAll('.photo-thumb-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');

    const bgVideo = document.getElementById('locket-bg-video');
    const bgMedia = document.getElementById('locket-bg-media');
    const webcamVideo = document.getElementById('locket-live-webcam');
    const fileUrl = URL.createObjectURL(item.blob);

    if (webcamVideo) webcamVideo.style.display = 'none';
    if (bgVideo) {
      bgVideo.pause();
      if (item.thumb) bgVideo.poster = item.thumb;
      bgVideo.src = fileUrl;
      bgVideo.load();
      bgVideo.muted = true;
      isVideoSoundOn = false;
      bgVideo.style.display = 'block';
      bgVideo.play().catch(() => {});
      isPlayingVideoPreview = true;
    }
    if (bgMedia) bgMedia.style.display = 'none';

    switchMockupView('send');
    updateMicOrSpeakerState();

    const di = document.getElementById('dynamic-island');
    const diText = document.getElementById('di-text');
    if (di && diText) {
      di.classList.add('expanded');
      diText.innerText = `🎬 ${item.name} đang phát!`;
      setTimeout(() => {
        di.classList.remove('expanded');
        diText.innerText = 'Locket Gold VIP';
      }, 1800);
    }
  } else {
    // Ảnh tải lên
    document.querySelectorAll('.photo-thumb-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');

    const bgVideo = document.getElementById('locket-bg-video');
    const bgMedia = document.getElementById('locket-bg-media');
    const webcamVideo = document.getElementById('locket-live-webcam');
    const fileUrl = URL.createObjectURL(item.blob);

    if (webcamVideo) webcamVideo.style.display = 'none';
    if (bgVideo) {
      bgVideo.pause();
      bgVideo.style.display = 'none';
      isPlayingVideoPreview = false;
    }
    if (bgMedia) {
      bgMedia.style.display = 'block';
      bgMedia.style.backgroundImage = `url('${fileUrl}')`;
    }

    switchMockupView('send');
    updateMicOrSpeakerState();

    const di = document.getElementById('dynamic-island');
    const diText = document.getElementById('di-text');
    if (di && diText) {
      di.classList.add('expanded');
      diText.innerText = `🖼️ ${item.name}`;
      setTimeout(() => {
        di.classList.remove('expanded');
        diText.innerText = isMockupGoldActive ? 'Locket Gold VIP' : 'Locket Free';
      }, 1800);
    }
  }
}

async function removeUploadedItem(id) {
  uploadedMediaCache.delete(id);
  await deleteUploadedMediaFromDB(id);
  const card = document.getElementById(`uploaded-${id}`);
  if (card) card.remove();
  const pickerItem = document.getElementById(`picker-item-${id}`);
  if (pickerItem) pickerItem.remove();
  showVipLockedAlert('🗑️ Đã xóa media khỏi kho lưu trữ.');
}

async function loadSavedMediaUploads() {
  const items = await getAllUploadedMediaFromDB();
  items.forEach(item => {
    uploadedMediaCache.set(item.id, item);
    renderUploadedCard(item);
  });
}

function handleVideoCardClick(idx, el) {
  // Ở bản thường: Không cho phép chọn hoặc phát Video
  if (!isMockupGoldActive) {
    showVipLockedAlert('🔒 Bản thường không thể chọn Video! Hãy bật Locket Gold VIP để phát Video.');
    return;
  }

  document.querySelectorAll('.photo-thumb-card').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');

  const bgVideo = document.getElementById('locket-bg-video');
  const bgMedia = document.getElementById('locket-bg-media');
  const webcamVideo = document.getElementById('locket-live-webcam');
  if (webcamVideo) webcamVideo.style.display = 'none';
  const defaultFallbacks = [
    'videos/video-1.mp4',
    'videos/video-2.mp4'
  ];
  const list = getVipVideoList();
  const videoObj = list[idx] || list[0] || {};
  const fallbackUrl = videoObj.fallback || defaultFallbacks[idx % 2];
  const videoUrl = videoObj.src || fallbackUrl;

  if (bgVideo) {
    bgVideo.onerror = () => {
      if (bgVideo.src !== fallbackUrl) {
        console.warn('Local video failed, switching to fallback:', fallbackUrl);
        bgVideo.src = fallbackUrl;
        bgVideo.load();
        bgVideo.play().catch(() => {});
      }
    };

    bgVideo.pause();
    if (videoObj.thumb) {
      bgVideo.poster = videoObj.thumb;
    }
    bgVideo.src = videoUrl;
    bgVideo.load();
    bgVideo.muted = true;
    isVideoSoundOn = false;
    bgVideo.style.display = 'block';
    bgVideo.play().catch(e => {
      console.warn('Play attempt muted:', e);
      bgVideo.muted = true;
      bgVideo.play().catch(() => {});
    });
    isPlayingVideoPreview = true;
  }
  if (bgMedia) bgMedia.style.display = 'none';

  // Chuyển sang màn hình Gửi để người dùng xem video và thêm caption
  switchMockupView('send');
  updateMicOrSpeakerState();

  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');
  if (di && diText) {
    di.classList.add('expanded');
    diText.innerText = `🎬 ${(videoObj && videoObj.title) || 'Video'} đang phát!`;
    setTimeout(() => {
      di.classList.remove('expanded');
      diText.innerText = 'Locket Gold VIP';
    }, 1800);
  }
  if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) {}
}

function triggerDeviceUpload() {
  const fileInput = document.getElementById('user-media-upload-input');
  if (fileInput) fileInput.click();
}

async function handleUserMediaUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const isVideo = file.type.startsWith('video/');

  // Ở bản thường: Không cho phép chọn/tải Video
  if (isVideo && !isMockupGoldActive) {
    showVipLockedAlert('🔒 Bản thường không thể chọn hoặc tải Video! Hãy bật Locket Gold VIP để tải Video.');
    e.target.value = '';
    return;
  }

  // Tự động tạo ảnh thumbnail
  const thumbUrl = isVideo ? await generateVideoThumbnail(file) : await generateImageThumbnail(file);

  const mediaItem = {
    id: 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name: file.name,
    type: isVideo ? 'video' : 'image',
    blob: file,
    thumb: thumbUrl,
    createdAt: Date.now()
  };

  // Lưu vĩnh viễn vào IndexedDB của trình duyệt để không bị mất khi tải lại trang!
  uploadedMediaCache.set(mediaItem.id, mediaItem);
  await saveUploadedMediaToDB(mediaItem);

  // Render thẻ mới vào danh sách lướt
  renderUploadedCard(mediaItem);

  // Phát hoặc xem ngay file vừa tải lên
  const cardEl = document.getElementById(`uploaded-${mediaItem.id}`);
  playUploadedItem(mediaItem.id, cardEl);
  closeAllDrawers();

  // Reset input để có thể chọn lại file cùng tên nếu muốn
  e.target.value = '';
}

// Đổi Ảnh Thư Viện Camera Roll
function setMockupPhoto(idx, el) {
  currentMockupPhotoIdx = idx;
  document.querySelectorAll('.photo-thumb-card').forEach(c => c.classList.remove('active'));
  const targetCard = el || document.getElementById(`thumb-photo-${idx}`) || document.querySelectorAll('#camera-roll-photos-container .photo-thumb-card')[idx];
  if (targetCard) targetCard.classList.add('active');

  const bg = document.getElementById('locket-bg-media');
  const bgVideo = document.getElementById('locket-bg-video');
  const webcamVideo = document.getElementById('locket-live-webcam');
  if (webcamVideo) webcamVideo.style.display = 'none';
  const thumb = document.getElementById('gallery-thumb');
  const photoUrl = MOCKUP_PHOTOS[idx] || MOCKUP_PHOTOS[0];

  // Nếu đang xem video, dừng video và hiển thị ảnh
  if (bgVideo) {
    bgVideo.pause();
    bgVideo.style.display = 'none';
    isPlayingVideoPreview = false;
  }
  if (bg) {
    bg.style.display = 'block';
    bg.style.filter = 'brightness(0.3)';
    setTimeout(() => {
      bg.style.backgroundImage = `url('${photoUrl}')`;
      bg.style.filter = isMockupFlashOn ? 'brightness(1.4)' : 'brightness(1)';
    }, 120);
  }
  if (thumb) thumb.src = photoUrl;
  if (navigator.vibrate) try { navigator.vibrate(20); } catch (e) {}
}

let currentVipGalleryVideoIdx = -1;

function cycleGalleryPhoto() {
  const webcamVideo = document.getElementById('locket-live-webcam');
  if (webcamVideo) webcamVideo.style.display = 'none';

  if (!isMockupGoldActive) {
    // 1. Ở BẢN THƯỜNG: Chỉ lướt qua các ảnh trong Camera Roll, viền active ở đúng thẻ ảnh và hiện đúng ảnh
    const photoCards = document.querySelectorAll('#camera-roll-photos-container .photo-thumb-card');
    const totalPhotos = photoCards.length || MOCKUP_PHOTOS.length;
    currentMockupPhotoIdx = (currentMockupPhotoIdx + 1) % totalPhotos;
    const targetCard = photoCards[currentMockupPhotoIdx] || document.getElementById(`thumb-photo-${currentMockupPhotoIdx}`);
    setMockupPhoto(currentMockupPhotoIdx, targetCard);
  } else {
    // 2. Ở BẢN VIP: Có Kho Video VIP -> Lướt qua các video VIP, viền active ở thẻ video và PHÁT ĐÚNG VIDEO ĐÓ
    const videoCards = Array.from(document.querySelectorAll('#video-gallery-container .photo-thumb-card:not(.upload-trigger)'));
    if (videoCards.length > 0) {
      currentVipGalleryVideoIdx = (currentVipGalleryVideoIdx + 1) % videoCards.length;
      const targetCard = videoCards[currentVipGalleryVideoIdx];
      if (targetCard.id && targetCard.id.startsWith('uploaded-')) {
        const id = targetCard.id.replace('uploaded-', '');
        playUploadedItem(id, targetCard);
      } else {
        handleVideoCardClick(currentVipGalleryVideoIdx, targetCard);
      }
    } else {
      // Nếu chưa có video nào, lướt ảnh Camera Roll
      const photoCards = document.querySelectorAll('#camera-roll-photos-container .photo-thumb-card');
      const totalPhotos = photoCards.length || MOCKUP_PHOTOS.length;
      currentMockupPhotoIdx = (currentMockupPhotoIdx + 1) % totalPhotos;
      const targetCard = photoCards[currentMockupPhotoIdx] || document.getElementById(`thumb-photo-${currentMockupPhotoIdx}`);
      setMockupPhoto(currentMockupPhotoIdx, targetCard);
    }
  }
}

// ==================== QUẢN LÝ WEBCAM / CAMERA THỰC TẾ ====================
let liveWebcamStream = null;
let isWebcamActive = false;
let mediaRecorderInstance = null;
let recordedMediaChunks = [];
let fallbackStreamObj = null;
let lastRecordedVideoUrl = null;

async function initLiveWebcam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }
  try {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 720 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: isMockupGoldActive
      });
    } catch (eMic) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 720 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
    }
    liveWebcamStream = stream;
    isWebcamActive = true;
    const webcamVideo = document.getElementById('locket-live-webcam');
    const bgMedia = document.getElementById('locket-bg-media');
    const bgVideo = document.getElementById('locket-bg-video');
    const btnCam = document.getElementById('btn-toggle-cam');
    if (bgVideo) {
      bgVideo.pause();
      bgVideo.style.display = 'none';
      isPlayingVideoPreview = false;
    }
    if (webcamVideo) {
      webcamVideo.srcObject = stream;
      webcamVideo.style.display = 'block';
      webcamVideo.play().catch(() => {});
    }
    if (bgMedia) bgMedia.style.display = 'none';
    if (btnCam) btnCam.classList.add('active');
    return true;
  } catch (err) {
    console.warn('Cannot open webcam:', err);
    isWebcamActive = false;
    const btnCam = document.getElementById('btn-toggle-cam');
    if (btnCam) btnCam.classList.remove('active');

    // Nếu bị chặn (user đã từ chối trước đó) → hướng dẫn bật lại
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      showCameraBlockedToast();
    }
    return false;
  }
}

function showCameraBlockedToast() {
  // Xóa toast cũ nếu còn
  const old = document.getElementById('cam-blocked-toast');
  if (old) old.remove();

  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
  const isFirefox = /Firefox/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  let hint = 'Vào <b>Cài đặt trình duyệt → Quyền riêng tư → Camera</b> rồi cho phép trang này.';
  if (isChrome) hint = 'Nhấn vào <b>🔒 biểu tượng khoá</b> trên thanh địa chỉ → <b>Camera → Cho phép</b> rồi tải lại trang.';
  else if (isFirefox) hint = 'Nhấn vào <b>🛡️ biểu tượng khiên</b> trên thanh địa chỉ → <b>Camera → Cho phép</b> rồi tải lại trang.';
  else if (isSafari) hint = 'Vào <b>Safari → Cài đặt cho trang web này → Camera → Cho phép</b> rồi tải lại trang.';

  const toast = document.createElement('div');
  toast.id = 'cam-blocked-toast';
  toast.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <span style="font-size:28px;line-height:1;">📷</span>
      <div>
        <div style="font-weight:800;font-size:14px;margin-bottom:4px;color:#fff;">Camera bị chặn!</div>
        <div style="font-size:12.5px;color:#CBD5E1;line-height:1.5;">${hint}</div>
        <button onclick="location.reload()" style="margin-top:10px;background:linear-gradient(135deg,#FF7A00,#FF4D00);border:none;color:#fff;font-weight:800;font-size:12px;padding:7px 18px;border-radius:99px;cursor:pointer;">🔄 Tải lại trang</button>
      </div>
      <button onclick="this.closest('#cam-blocked-toast').remove()" style="background:none;border:none;color:#64748B;font-size:18px;cursor:pointer;padding:0;line-height:1;margin-left:auto;">✕</button>
    </div>
  `;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(90vw, 360px)',
    background: 'linear-gradient(165deg, rgba(20,25,40,0.98) 0%, rgba(10,13,22,0.99) 100%)',
    border: '1.5px solid rgba(255,122,0,0.5)',
    borderRadius: '18px',
    padding: '16px',
    zIndex: '999999',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(255,80,0,0.2)',
    animation: 'slideUpToast 0.4s cubic-bezier(0.34,1.56,0.64,1)',
  });
  document.body.appendChild(toast);

  // Tự ẩn sau 12 giây
  setTimeout(() => toast.remove(), 12000);
}

function stopLiveWebcam() {
  if (liveWebcamStream) {
    liveWebcamStream.getTracks().forEach(track => track.stop());
    liveWebcamStream = null;
  }
  isWebcamActive = false;
  const webcamVideo = document.getElementById('locket-live-webcam');
  const bgMedia = document.getElementById('locket-bg-media');
  const btnCam = document.getElementById('btn-toggle-cam');
  if (webcamVideo) {
    webcamVideo.srcObject = null;
    webcamVideo.style.display = 'none';
  }
  if (bgMedia) bgMedia.style.display = 'block';
  if (btnCam) btnCam.classList.remove('active');
}

async function toggleWebcamMode() {
  const webcamVideo = document.getElementById('locket-live-webcam');
  const bgMedia = document.getElementById('locket-bg-media');
  const bgVideo = document.getElementById('locket-bg-video');

  // Nếu camera thật đã có stream nhưng tạm bị ẩn do người dùng bấm chọn ảnh/video:
  if (isWebcamActive && liveWebcamStream && webcamVideo && webcamVideo.style.display === 'none') {
    if (bgVideo) {
      bgVideo.pause();
      bgVideo.style.display = 'none';
      isPlayingVideoPreview = false;
    }
    if (bgMedia) bgMedia.style.display = 'none';
    webcamVideo.style.display = 'block';
    webcamVideo.play().catch(() => {});
    const btnCam = document.getElementById('btn-toggle-cam');
    if (btnCam) btnCam.classList.add('active');
    showVipLockedAlert('📷 Đã quay lại Camera thật của máy!');
    return;
  }

  if (isWebcamActive) {
    stopLiveWebcam();
  } else {
    await initLiveWebcam();
  }
}

function createFallbackRecordStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = MOCKUP_PHOTOS[currentMockupPhotoIdx] || MOCKUP_PHOTOS[0];

  let frame = 0;
  let animId = null;
  function draw() {
    frame++;
    const zoom = 1 + Math.sin(frame * 0.05) * 0.02;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    try {
      ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    } catch (e) {}
    ctx.restore();
    animId = requestAnimationFrame(draw);
  }
  draw();

  const stream = canvas.captureStream ? canvas.captureStream(30) : null;
  return { stream, stop: () => cancelAnimationFrame(animId) };
}

// ==================== 6. BẤM CHỤP & NHẤN GIỮ ĐỂ QUAY VIDEO ====================
let shutterPressTimer = null;
let isHoldingShutterToRecord = false;
let shutterPressStartTime = 0;

let isShutterPointerDown = false;

function setupShutterEvents() {
  const shutter = document.getElementById('shutter-btn');
  if (!shutter) return;

  function onPointerDown(e) {
    if (e.button && e.button !== 0) return;
    isShutterPointerDown = true;
    shutterPressStartTime = Date.now();
    isHoldingShutterToRecord = false;
    shutter.style.transform = 'scale(0.92)';

    // Giữ nút tròn 280ms -> Tự động chuyển sang quay video
    if (shutterPressTimer) clearTimeout(shutterPressTimer);
    shutterPressTimer = setTimeout(() => {
      if (isShutterPointerDown) {
        isHoldingShutterToRecord = true;
        startMockupRecording();
      }
    }, 280);
  }

  function onPointerUp(e) {
    // RẤT QUAN TRỌNG: Chỉ chụp hoặc dừng quay nếu chính nút Shutter được nhấn xuống trước đó!
    if (!isShutterPointerDown) return;
    isShutterPointerDown = false;

    shutter.style.transform = '';
    const isHold = isHoldingShutterToRecord;
    shutterPressStartTime = 0;

    if (shutterPressTimer) {
      clearTimeout(shutterPressTimer);
      shutterPressTimer = null;
    }

    if (isHold) {
      // Đang quay video bằng nhấn giữ -> Nhả tay ra thì dừng quay
      isHoldingShutterToRecord = false;
      stopMockupRecording();
    } else if (!isRecordingVideo) {
      // Nhấn nhả nhanh TRÊN NÚT CHỤP -> Chụp ảnh ngay lập tức
      takeMockupPhoto();
    }
  }

  shutter.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mouseup', onPointerUp);

  shutter.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchend', onPointerUp);
  window.addEventListener('touchcancel', () => {
    isShutterPointerDown = false;
    if (shutterPressTimer) {
      clearTimeout(shutterPressTimer);
      shutterPressTimer = null;
    }
    shutter.style.transform = '';
  });

  // Chặn click mặc định của trình duyệt để tránh double trigger
  shutter.addEventListener('click', (e) => {
    e.preventDefault();
  });
}

let recordAnimFrameId = null;
let recordStartTime = 0;

function startMockupRecording() {
  if (isRecordingVideo) return;
  isRecordingVideo = true;
  recordSeconds = 0;
  // Bản Thường: Đúng 3 giây chuẩn Locket Free; Bản VIP: Tối đa 30 giây HD
  const maxSec = isMockupGoldActive ? 30 : 3;

  recordedMediaChunks = [];
  let streamToRecord = liveWebcamStream;

  if (!streamToRecord && window.HTMLCanvasElement && HTMLCanvasElement.prototype.captureStream) {
    fallbackStreamObj = createFallbackRecordStream();
    streamToRecord = fallbackStreamObj && fallbackStreamObj.stream;
  }

  // Ở bản thường: Lọc chỉ lấy video track, hoàn toàn không ghi âm thanh
  if (!isMockupGoldActive && streamToRecord) {
    const vTracks = streamToRecord.getVideoTracks();
    if (vTracks.length > 0) {
      streamToRecord = new MediaStream(vTracks);
    }
  }

  if (streamToRecord && window.MediaRecorder) {
    try {
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';
      mediaRecorderInstance = new MediaRecorder(streamToRecord, { mimeType: mime });
      mediaRecorderInstance.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedMediaChunks.push(e.data);
      };
      mediaRecorderInstance.start(100);
    } catch (e) {
      console.warn('MediaRecorder error:', e);
      mediaRecorderInstance = null;
    }
  }

  const shutter = document.getElementById('shutter-btn');
  const rectFill = document.getElementById('box-rect-fill');
  const cameraBox = document.getElementById('locket-camera-box');
  const progressSvg = document.querySelector('.box-progress-svg');
  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');
  const diDot = document.getElementById('di-dot');

  const perimeter = rectFill && rectFill.getTotalLength ? rectFill.getTotalLength() : 912;

  if (shutter) shutter.classList.add('recording');
  if (cameraBox) cameraBox.classList.add('recording');
  if (progressSvg) progressSvg.classList.add('active');

  // Đảm bảo không có transition trễ, cập nhật mượt mà 60fps/120fps theo requestAnimationFrame
  if (rectFill) {
    rectFill.style.transition = 'none';
    rectFill.style.strokeDasharray = perimeter;
    rectFill.style.strokeDashoffset = perimeter;
  }

  if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) {}

  recordStartTime = performance.now();

  function animateRecordProgress(now) {
    if (!isRecordingVideo) return;
    const elapsedMs = now - recordStartTime;
    const totalMs = maxSec * 1000;
    const progress = Math.min(elapsedMs / totalMs, 1);

    if (rectFill) {
      rectFill.style.strokeDashoffset = perimeter * (1 - progress);
    }

    if (elapsedMs >= totalMs) {
      stopMockupRecording();
      return;
    }

    recordAnimFrameId = requestAnimationFrame(animateRecordProgress);
  }

  if (recordAnimFrameId) cancelAnimationFrame(recordAnimFrameId);
  recordAnimFrameId = requestAnimationFrame(animateRecordProgress);
}

function stopMockupRecording() {
  if (!isRecordingVideo) return;
  if (recordAnimFrameId) {
    cancelAnimationFrame(recordAnimFrameId);
    recordAnimFrameId = null;
  }
  isRecordingVideo = false;

  const shutter = document.getElementById('shutter-btn');
  const rectFill = document.getElementById('box-rect-fill');
  const di = document.getElementById('dynamic-island');
  const diText = document.getElementById('di-text');
  const diDot = document.getElementById('di-dot');
  const bgVideo = document.getElementById('locket-bg-video');
  const bgMedia = document.getElementById('locket-bg-media');
  const webcamVideo = document.getElementById('locket-live-webcam');

  const perimeter = rectFill && rectFill.getTotalLength ? rectFill.getTotalLength() : 912;

  if (shutter) shutter.classList.remove('recording');
  const cameraBox = document.getElementById('locket-camera-box');
  if (cameraBox) cameraBox.classList.remove('recording');
  const progressSvg = document.querySelector('.box-progress-svg');
  if (progressSvg) progressSvg.classList.remove('active');
  if (rectFill) rectFill.style.strokeDashoffset = perimeter;
  if (di) di.classList.remove('expanded');
  if (diText) diText.innerText = '';
  if (diDot) diDot.classList.remove('rec');

  function applyRecordedVideo(url) {
    if (bgVideo) {
      bgVideo.src = url;
      if (!isMockupGoldActive) {
        bgVideo.muted = true;
        isVideoSoundOn = false;
      } else {
        bgVideo.muted = false;
        isVideoSoundOn = true;
      }
      bgVideo.style.display = 'block';
      bgVideo.play().catch(() => {
        bgVideo.muted = true;
        bgVideo.play().catch(() => {});
      });
      isPlayingVideoPreview = true;
    }
    if (webcamVideo) webcamVideo.style.display = 'none';
    if (bgMedia) bgMedia.style.display = 'none';
    updateMicOrSpeakerState();
  }

  if (mediaRecorderInstance && mediaRecorderInstance.state !== 'inactive') {
    mediaRecorderInstance.onstop = () => {
      if (fallbackStreamObj && fallbackStreamObj.stop) {
        fallbackStreamObj.stop();
        fallbackStreamObj = null;
      }
      const mime = mediaRecorderInstance.mimeType || 'video/webm';
      const blob = new Blob(recordedMediaChunks, { type: mime });
      if (lastRecordedVideoUrl) URL.revokeObjectURL(lastRecordedVideoUrl);
      lastRecordedVideoUrl = URL.createObjectURL(blob);
      applyRecordedVideo(lastRecordedVideoUrl);
    };
    try {
      mediaRecorderInstance.stop();
    } catch (e) {
      console.warn('Error stopping mediaRecorder:', e);
    }
  } else {
    if (fallbackStreamObj && fallbackStreamObj.stop) {
      fallbackStreamObj.stop();
      fallbackStreamObj = null;
    }
    // Tuyệt đối KHÔNG gán video xe hơi từ kho upload nữa!
    if (bgMedia) bgMedia.style.display = 'block';
    if (bgVideo) bgVideo.style.display = 'none';
    isPlayingVideoPreview = false;
  }

  setTimeout(() => {
    if (rectFill) rectFill.style.strokeDashoffset = perimeter;
    if (di) di.classList.remove('expanded');
    if (diText) diText.innerText = '';
    if (diDot) diDot.classList.remove('rec');
    // Quay video xong -> Chuyển sang Gửi
    switchMockupView('send');
  }, 400);

  if (navigator.vibrate) try { navigator.vibrate([60, 30, 60]); } catch (e) {}
}

function takeMockupPhoto() {
  const flash = document.getElementById('camera-flash');
  if (flash) {
    flash.classList.add('flash-active');
    setTimeout(() => flash.classList.remove('flash-active'), 90);
  }

  playMockupCameraSound();
  if (navigator.vibrate) try { navigator.vibrate(35); } catch (e) {}

  const webcamVideo = document.getElementById('locket-live-webcam');
  const bgMedia = document.getElementById('locket-bg-media');

  if (isWebcamActive && liveWebcamStream && webcamVideo) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = webcamVideo.videoWidth || 720;
      canvas.height = webcamVideo.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (isCameraFlipped) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);
      const snapshotUrl = canvas.toDataURL('image/jpeg', 0.9);
      if (bgMedia) {
        bgMedia.style.backgroundImage = `url('${snapshotUrl}')`;
        bgMedia.style.display = 'block';
      }
      webcamVideo.style.display = 'none';
    } catch (e) {
      console.warn('Canvas snapshot error:', e);
    }
  }

  setTimeout(() => {
    switchMockupView('send');
  }, 220);
}

// 7. Bật/Tắt Flash Màn Hình
function toggleMockupFlash() {
  isMockupFlashOn = !isMockupFlashOn;
  const btn = document.getElementById('btn-flash');
  const bg = document.getElementById('locket-bg-media');
  const webcamVideo = document.getElementById('locket-live-webcam');
  if (btn) btn.classList.toggle('active', isMockupFlashOn);
  const filterVal = isMockupFlashOn ? 'brightness(1.4) contrast(1.1)' : 'brightness(1)';
  if (bg) bg.style.filter = filterVal;
  if (webcamVideo) webcamVideo.style.filter = filterVal;
  if (navigator.vibrate) try { navigator.vibrate(20); } catch (e) {}
}

// 8. Bật/Tắt Phóng to Zoom 1x / 2x
function toggleMockupZoom() {
  isZoomed = !isZoomed;
  const chip = document.getElementById('btn-zoom');
  const bg = document.getElementById('locket-bg-media');
  const webcamVideo = document.getElementById('locket-live-webcam');
  if (chip) chip.innerText = isZoomed ? '2x' : '1x';
  const scale = isZoomed ? 1.35 : 1;
  const flip = isCameraFlipped ? -1 : 1;
  if (bg) bg.style.transform = `scale(${scale}) scaleX(${flip})`;
  if (webcamVideo) webcamVideo.style.transform = `scale(${scale}) scaleX(${flip})`;
  if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {}
}

// 9. Bật/Tắt Lưới Camera
function toggleMockupGrid() {
  const grid = document.getElementById('camera-grid-lines');
  const btn = document.getElementById('btn-grid');
  if (grid) grid.classList.toggle('active');
  if (btn) btn.classList.toggle('active');
  if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {}
}

// 10. Lật Camera Selfie / Cam Sau
function flipCameraEffect() {
  isCameraFlipped = !isCameraFlipped;
  const bg = document.getElementById('locket-bg-media');
  const webcamVideo = document.getElementById('locket-live-webcam');
  const scale = isZoomed ? 1.35 : 1;
  const flip = isCameraFlipped ? -1 : 1;
  if (webcamVideo) {
    webcamVideo.style.transform = `scale(${scale}) scaleX(${flip})`;
  }
  if (bg) {
    bg.style.transform = `scale(${scale}) scaleX(${flip}) rotate(2deg)`;
    setTimeout(() => {
      bg.style.transform = `scale(${scale}) scaleX(${flip}) rotate(0deg)`;
    }, 180);
  }
  if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) {}
}


// ==================== Mưa quả cam & icon emoji rơi xuống ====================
function triggerLogoRain() {
  const rain = document.getElementById('rain');
  if (!rain) return;

  const icons = ['🍊', '🧡', '⚡', '👑', '✨', '🔥', '⭐'];
  for (let i = 0; i < 26; i++) {
    const el = document.createElement('div');
    el.className = 'rain-icon';
    el.innerText = icons[Math.floor(Math.random() * icons.length)];
    el.style.left = Math.random() * 95 + 'vw';
    el.style.top = '-50px';
    el.style.animation = `dropRain ${Math.random() * 1.5 + 1.2}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;
    el.style.animationDelay = (Math.random() * 0.4) + 's';
    rain.appendChild(el);
  }

  setTimeout(() => {
    rain.innerHTML = '';
  }, 3600);
}

// ==================== Floating Contact Modal ====================
function openContactModal() {
  const m = document.getElementById('contact-modal');
  if (m) m.classList.add('active');
}

function closeContactModal() {
  const m = document.getElementById('contact-modal');
  if (m) m.classList.remove('active');
}

// Đồng bộ liên kết Telegram & Zalo từ config.js
function syncContactConfig() {
  if (typeof TO_CAM_CONFIG === 'undefined') return;

  // Telegram
  document.querySelectorAll('.cfg-tele-link').forEach(el => {
    el.href = TO_CAM_CONFIG.TELEGRAM_URL;
  });
  document.querySelectorAll('.cfg-tele-user').forEach(el => {
    el.innerText = TO_CAM_CONFIG.TELEGRAM_USERNAME;
  });

  // Zalo
  document.querySelectorAll('.cfg-zalo-link').forEach(el => {
    el.href = TO_CAM_CONFIG.ZALO_URL;
  });
  document.querySelectorAll('.cfg-zalo-phone').forEach(el => {
    el.innerText = TO_CAM_CONFIG.ZALO_PHONE;
  });
}

// ==================== Khởi tạo khi trang tải xong ====================
document.addEventListener('DOMContentLoaded', () => {
  syncContactConfig();

  // Lenis smooth scroll
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // Intro Splash screen progress loader
  const intro = document.getElementById('intro-screen');
  const bar = document.getElementById('intro-bar');
  let progress = 0;

  const timer = setInterval(() => {
    progress += Math.floor(Math.random() * 20) + 18;
    if (progress >= 100) {
      progress = 100;
      if (bar) bar.style.width = '100%';
      clearInterval(timer);
      setTimeout(() => {
        if (intro) intro.classList.add('hide');
        triggerLogoRain();
      }, 350);
    } else {
      if (bar) bar.style.width = progress + '%';
    }
  }, 65);

  setTimeout(() => {
    if (intro && !intro.classList.contains('hide')) {
      intro.classList.add('hide');
      triggerLogoRain();
    }
  }, 1600);

  // Khởi tạo sự kiện nhấn chụp & nhấn giữ quay video chuẩn Locket
  setupShutterEvents();
  // Khởi tạo cử chỉ vuốt lướt đổi caption trên khung camera & PC
  setupCaptionSwipeGesture();
  // Cập nhật dãy dấu chấm chỉ báo lướt caption
  updateCaptionDots(0);
  // Khởi tạo cuộn danh sách drawer chú thích
  setupDrawerDragToScroll();
  // Khởi tạo cử chỉ vuốt lướt Timeline Feed & Camera
  setupFeedGestures();
  // Cập nhật giờ hiển thị trên caption đồng hồ
  updateLiveCaptionTime();

  // Mặc định khởi tạo giao diện Bản Thường chuẩn Locket
  setGoldMode(false);

  // Tải danh sách video/ảnh đã lưu từ IndexedDB để luôn hiển thị và không bị mất
  loadSavedMediaUploads();

  // Tự động xin phép và mở camera liên tục ngay khi khởi động
  initLiveWebcam();
  document.addEventListener('pointerdown', function autoCamPrompt() {
    if (!isWebcamActive) {
      initLiveWebcam();
    }
  }, { once: true });

  // Đảm bảo nút huỷ luôn bắt sự kiện click và touch chuẩn xác
  const btnDismiss = document.getElementById('btn-send-dismiss') || document.querySelector('.btn-send-dismiss');
  if (btnDismiss) {
    btnDismiss.addEventListener('click', (e) => {
      e.preventDefault();
      cancelSendMode(e);
    });
    btnDismiss.addEventListener('pointerup', (e) => {
      e.preventDefault();
      cancelSendMode(e);
    });
  }
});

function updateLiveCaptionTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'CH' : 'SA';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const timeStr = `${hours}:${minutes} ${period}`;
  document.querySelectorAll('.caption-time-text').forEach(el => {
    el.innerText = timeStr;
  });
}

// Hàm chọn gói trên trang chủ index.html (chỉ chọn gói, không tự động chuyển trang)
function selectIndexPlan(card, plan) {
  document.querySelectorAll('.plans-grid .plan-card').forEach(c => c.classList.remove('active'));
  if (card) card.classList.add('active');

  let targetPlan = plan;
  if (!targetPlan && card && card.id) {
    if (card.id.includes('test')) targetPlan = 'test';
    else if (card.id.includes('6month')) targetPlan = '6month';
    else if (card.id.includes('yearly')) targetPlan = 'yearly';
    else targetPlan = 'lifetime';
  }
  if (!targetPlan) targetPlan = 'lifetime';

  try {
    localStorage.setItem('tocam_selected_plan', targetPlan);
  } catch (e) {}

  if (navigator.vibrate) {
    try { navigator.vibrate(25); } catch (e) {}
  }

  // Cập nhật text & link cho nút bấm nâng cấp ở dưới
  const btnProceed = document.getElementById('btn-index-proceed-upgrade');
  const btnProceedText = document.getElementById('btn-index-proceed-text');
  const btnHero = document.getElementById('btn-hero-upgrade');

  let planLabel = 'Gói Vĩnh Viễn (119K)';
  const planUrl = `gold.html?plan=${encodeURIComponent(targetPlan)}`;

  if (targetPlan === 'test') {
    planLabel = 'Gói Test Dùng Thử (5K)';
  } else if (targetPlan === '6month') {
    planLabel = 'Gói 6 Tháng (39K)';
  } else if (targetPlan === 'yearly') {
    planLabel = 'Gói 1 Năm (69K)';
  } else {
    planLabel = 'Gói Vĩnh Viễn (119K)';
  }

  if (btnProceedText) {
    btnProceedText.textContent = `Tiến Hành Nâng Cấp ${planLabel}`;
  }
  if (btnProceed) {
    btnProceed.href = planUrl;
    if (targetPlan === 'test') {
      btnProceed.className = 'btn-card-action';
      btnProceed.style.background = 'linear-gradient(135deg, #9333EA 0%, #A855F7 100%)';
      btnProceed.style.boxShadow = '0 8px 24px rgba(168, 85, 247, 0.4)';
    } else if (targetPlan === '6month') {
      btnProceed.className = 'btn-card-action btn-card-6month';
      btnProceed.style.background = '';
      btnProceed.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.35)';
    } else if (targetPlan === 'yearly') {
      btnProceed.className = 'btn-card-action btn-card-yearly';
      btnProceed.style.background = '';
      btnProceed.style.boxShadow = '0 8px 24px rgba(56, 189, 248, 0.35)';
    } else {
      btnProceed.className = 'btn-card-action btn-card-gold';
      btnProceed.style.background = '';
      btnProceed.style.boxShadow = '0 8px 24px rgba(255, 122, 0, 0.35)';
    }
  }

  if (btnHero) {
    btnHero.href = planUrl;
    const heroSpan = btnHero.querySelector('span');
    if (heroSpan) {
      heroSpan.textContent = `Bắt Đầu Nâng Cấp ${planLabel} Ngay`;
    }
  }
}

// Bấm vào thẻ hoặc nút chọn gói trên trang chủ: hỗ trợ nếu cần
function selectAndUpgrade(plan, card) {
  selectIndexPlan(card, plan);
}

// Nút Bắt Đầu Nâng Cấp ở dưới danh sách gói: chuyển sang trang nâng cấp với gói đã chọn
function goToCurrentSelectedPlan(e) {
  if (e) e.preventDefault();
  const activeCard = document.querySelector('.plans-grid .plan-card.active');
  let chosen = 'lifetime';
  if (activeCard && activeCard.id) {
    if (activeCard.id.includes('test')) chosen = 'test';
    else if (activeCard.id.includes('6month')) chosen = '6month';
    else if (activeCard.id.includes('yearly')) chosen = 'yearly';
    else if (activeCard.id.includes('lifetime')) chosen = 'lifetime';
  } else {
    chosen = localStorage.getItem('tocam_selected_plan') || 'lifetime';
  }
  window.location.href = `gold.html?plan=${encodeURIComponent(chosen)}`;
}

