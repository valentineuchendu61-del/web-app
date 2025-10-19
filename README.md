# PWA Demo — Camera & Geolocation

## Overview
This is a vanilla JavaScript Progressive Web App demonstrating:
- Installable app (manifest + beforeinstallprompt).
- Service Worker + caching strategies and offline support.
- Native device features: Camera (getUserMedia & file capture), Geolocation (navigator.geolocation), and Notifications (Notification API + SW).
- At least 3 views: Home, Camera, Map — connected with a consistent SPA flow.
- Responsive layout and simple performance considerations.

## Files
- `index.html` — main shell and navigation.
- `styles.css` — styling (responsive).
- `app.js` — app logic (routing, native feature usage).
- `manifest.json` — PWA metadata.
- `sw.js` — service worker implementing caching strategies.
- `README.md` — this file.

## How to run (development)
You must serve via HTTPS to use camera/geolocation on many browsers (or use `localhost` which is considered secure):
1. Using `serve` or `http-server`:
   - `npm i -g http-server`
   - `http-server -c-1 -p 8080` (for plain HTTP on localhost)
2. For HTTPS, either:
   - Deploy to GitHub Pages (they serve via HTTPS), or
   - Use `http-server` with SSL flags or `mkcert` to get local certs.

## Native features used & implementation
1. **Camera**
   - `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
   - Fallback: `<input type="file" accept="image/*" capture="environment">`
   - Photo capture: draw video frame to `<canvas>` then `toDataURL()` and store in `localStorage` (available offline).

2. **Geolocation**
   - `navigator.geolocation.getCurrentPosition(...)` to get latitude/longitude and accuracy.
   - Saved to `localStorage` for offline access.

3. **Notifications**
   - `Notification.requestPermission()` to request permission.
   - The app sends a message to the Service Worker which calls `self.registration.showNotification(...)` — this ensures notifications are shown even when page is not in foreground (service worker required for cross-tab/background notifications).

## Service Worker & Caching strategy
- **Precache**: app shell (`index.html`, `styles.css`, `app.js`, `manifest.json`) on `install`.
- **Navigation**: network-first for page navigations, fallback to cached `index.html`.
- **API** (`/api/*`): network-first with cache fallback.
- **Static resources**: cache-first with runtime caching.
- Images fallback to a tiny inline SVG when offline.

## Offline UX
- Connection status indicator in the footer.
- Core features (viewing saved photos, last location) work while offline since they are stored locally.
- If network is absent, navigation still loads cached app shell.

## Code quality
- The PWA logic (service worker, caching, install prompt, notifications) is implemented in vanilla JS as requested.
- Code is commented and modularized by view.
- For production, move images out of localStorage to IndexedDB, add proper icon PNGs in `manifest.json`, and a robust server-side push system if you want Push API.

## Notes / Limitations
- Push Notifications (Push API) require a server and subscription flow (not included). The demo shows client-side notifications via the SW.
- Storing many large images in `localStorage` will hit quotas. For a real app, use IndexedDB.
