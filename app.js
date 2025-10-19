// app.js — module
const ROOT = document.getElementById('app-root');
const installBtn = document.getElementById('install-btn');
const notifyBtn = document.getElementById('notify-btn');
const connStatus = document.getElementById('connection-status');

let deferredPrompt = null;
let photos = []; // stored in localStorage for simplicity

// ROUTER: hash-based (home, camera, map)
function router() {
  const hash = location.hash.replace('#', '') || 'home';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-route="${hash}"]`)?.classList.add('active');

  if (hash === 'home') renderHome();
  else if (hash === 'camera') renderCamera();
  else if (hash === 'map') renderMap();
  else renderHome();
}

// --- VIEW: Home
function renderHome() {
  ROOT.innerHTML = `
    <section class="card">
      <h2>Welcome</h2>
      <p class="muted">This demo uses <strong>Camera</strong>, <strong>Geolocation</strong>, and <strong>Notifications</strong>. Try the Camera and Map views.</p>
    </section>
    <section class="card">
      <div class="footer-row">
        <h3>Your Photos</h3>
        <button id="clear-photos" class="small">Clear</button>
      </div>
      <div class="list" id="photos-list"></div>
    </section>
  `;
  document.getElementById('clear-photos').addEventListener('click', () => {
    photos = []; localStorage.removeItem('pwa_photos'); renderHome();
  });
  loadPhotos();
}

// --- VIEW: Camera
function renderCamera() {
  ROOT.innerHTML = `
    <section class="card">
      <h2>Camera</h2>
      <p class="muted">Take a photo with your device. Photos are stored locally and available offline.</p>
      <div id="camera-area" class="grid-2">
        <div>
          <video id="video" autoplay playsinline></video>
          <div class="controls">
            <button id="btn-snap" class="small">Snap</button>
            <button id="btn-toggle" class="small">Use file input</button>
            <input id="file-input" type="file" accept="image/*" capture="environment" style="display:none">
          </div>
        </div>
        <div>
          <canvas id="canvas" style="display:none"></canvas>
          <img id="photo-preview" alt="preview" />
        </div>
      </div>
    </section>
  `;

  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const preview = document.getElementById('photo-preview');
  const snapBtn = document.getElementById('btn-snap');
  const toggleBtn = document.getElementById('btn-toggle');
  const fileInput = document.getElementById('file-input');

  // start camera
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream;
    } catch (err) {
      console.warn('Camera not available:', err);
      // Show file input fallback
      fileInput.style.display = 'block';
      toggleBtn.style.display = 'none';
      snapBtn.style.display = 'none';
      preview.alt = 'File input fallback';
    }
  }
  startCamera();

  snapBtn.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/png');
    preview.src = data;
    savePhoto(data);
  });

  toggleBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      savePhoto(reader.result);
    };
    reader.readAsDataURL(f);
  });
}

// --- VIEW: Map (Geolocation)
function renderMap() {
  ROOT.innerHTML = `
    <section class="card">
      <h2>Map & Geolocation</h2>
      <p class="muted">Click "Get my location" to allow geolocation. Location is shown (lat/long) and stored locally.</p>
      <div>
        <div class="controls">
          <button id="loc-get" class="small">Get my location</button>
          <button id="loc-clear" class="small">Clear</button>
        </div>
        <div id="loc-result" style="margin-top:12px;"></div>
      </div>
    </section>
  `;

  const getBtn = document.getElementById('loc-get');
  const clearBtn = document.getElementById('loc-clear');
  const result = document.getElementById('loc-result');

  function showLocation(coords) {
    result.innerHTML = `
      <div class="card">
        <strong>Latitude:</strong> ${coords.latitude} <br>
        <strong>Longitude:</strong> ${coords.longitude} <br>
        <small>Accuracy: ${coords.accuracy} meters</small>
        <div style="margin-top:8px"><a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${coords.latitude}&mlon=${coords.longitude}">Open in OSM</a></div>
      </div>
    `;
    // store last location
    localStorage.setItem('pwa_last_location', JSON.stringify(coords));
  }

  getBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      result.textContent = 'Geolocation not supported by your browser.';
      return;
    }
    result.textContent = 'Getting location…';
    navigator.geolocation.getCurrentPosition(
      pos => {
        showLocation(pos.coords);
      },
      err => {
        result.textContent = `Error: ${err.message}`;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  clearBtn.addEventListener('click', () => {
    localStorage.removeItem('pwa_last_location');
    result.innerHTML = '<em>Cleared</em>';
  });

  // if we have saved location show it
  const saved = localStorage.getItem('pwa_last_location');
  if (saved) showLocation(JSON.parse(saved));
}

// Save and render photos
function savePhoto(dataUrl) {
  photos = JSON.parse(localStorage.getItem('pwa_photos') || '[]');
  photos.unshift({ data: dataUrl, ts: Date.now() });
  localStorage.setItem('pwa_photos', JSON.stringify(photos));
  showToast('Photo saved locally (works offline)');
}

// Load photos into the Home view
function loadPhotos() {
  photos = JSON.parse(localStorage.getItem('pwa_photos') || '[]');
  const list = document.getElementById('photos-list');
  list.innerHTML = photos.length ? photos.map(p => `
    <div class="item">
      <img src="${p.data}" style="max-width:160px;border-radius:8px;display:block;margin-bottom:8px" />
      <div><small>${new Date(p.ts).toLocaleString()}</small></div>
    </div>`).join('') : '<div class="item"><em>No photos yet.</em></div>';
}

// INSTALL flow: PWA install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'inline-block';
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  console.log('Install choice:', choice);
  deferredPrompt = null;
  installBtn.style.display = 'none';
});

// Notifications: ask permission and show a notification via Service Worker
notifyBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) {
    alert('Notifications not supported');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    alert('Notification permission denied');
    return;
  }
  // show notification via service worker (recommended)
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        title: 'Hello from PWA Demo',
        options: {
          body: 'You enabled notifications. Try offline features too!',
          icon: '/manifest.json',
          tag: 'demo-notif'
        }
      }
    });
  } else {
    new Notification('Hello from PWA Demo', { body: 'You enabled notifications.' });
  }
});

// Simple toast (inline)
function showToast(txt) {
  let t = document.createElement('div');
  t.textContent = txt; t.style.position = 'fixed';
  t.style.right = '12px'; t.style.bottom = '12px';
  t.style.background = '#111'; t.style.color = 'white';
  t.style.padding = '10px 12px'; t.style.borderRadius = '10px'; t.style.zIndex = 9999;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Connectivity indicator
function updateConnection() {
  const online = navigator.onLine;
  connStatus.textContent = online ? 'Online' : 'Offline';
  connStatus.className = online ? 'status online' : 'status offline';
}
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);

// register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered', reg);
    } catch (err) {
      console.error('SW registration failed', err);
    }
  });
}

// attach nav buttons
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', (e) => {
  const route = e.currentTarget.dataset.route;
  location.hash = route;
}));

// On load
updateConnection();
window.addEventListener('hashchange', router);
router();
