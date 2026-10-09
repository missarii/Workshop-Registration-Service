/* ═══════════════════════════════════════════════════════════
   WorkshopHub — Frontend Application
   Vanilla JS SPA communicating with the Express backend API.
═══════════════════════════════════════════════════════════ */
'use strict';

// ─────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────
let currentUser = null;
let currentPage = 'dashboard';
let editingWorkshopId = null;
let editingUserId = null;
let workshopSearchTimer = null;
let regSearchTimer = null;

// ─────────────────────────────────────────────────────────
// API HELPER
// ─────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch('/api' + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────
function toast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-message">${escHtml(message)}</span>
    <button class="toast-close" onclick="removeToast(this.parentElement)">✕</button>
  `;
  container.appendChild(el);
  setTimeout(() => removeToast(el), 5000);
}

function removeToast(el) {
  if (!el || el.classList.contains('removing')) return;
  el.classList.add('removing');
  setTimeout(() => el.remove(), 260);
}

// ─────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo',
  }).format(new Date(iso));
}

function fmtDateShort(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-LK', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo',
  }).format(new Date(iso));
}

function statusBadge(status) {
  return `<span class="badge badge-${escHtml(status)}">${escHtml(status)}</span>`;
}

function roleBadge(role) {
  return `<span class="role-badge role-${escHtml(role)}">${escHtml(role)}</span>`;
}

function capacityClass(pct) {
  if (pct >= 100) return 'full';
  if (pct >= 80) return 'high';
  if (pct >= 50) return 'medium';
  return 'low';
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

function clearError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible');
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function dtLocalValue(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─────────────────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ─────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────
function navigate(page) {
  // Strict SPEC enforcement (mirrors backend 403s):
  // Admin -> users only. Manager/Staff -> dashboard/workshops/registrations/history only.
  const role = currentUser?.role;
  if (page === 'users' && role !== 'admin') {
    toast('Access denied. Admins only.', 'error');
    return;
  }
  if ((page === 'dashboard' || page === 'workshops' || page === 'registrations' || page === 'history') && role === 'admin') {
    toast('Access denied. Managers / Staff only.', 'error');
    return;
  }

  currentPage = page;

  // Hide all pages
  document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));

  // Show target
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.remove('hidden');

  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Load data
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'workshops': loadWorkshops(); break;
    case 'registrations': loadRegistrations(); break;
    case 'history': loadHistory(); break;
    case 'users': loadUsers(); break;
  }
}

// ─────────────────────────────────────────────────────────
// ROLE VISIBILITY
// ─────────────────────────────────────────────────────────
function applyRoleVisibility() {
  const role = currentUser?.role || '';
  document.querySelectorAll('[data-role-required]').forEach(el => {
    const required = el.dataset.roleRequired.split(' ');
    el.classList.toggle('role-visible', required.includes(role));
  });
}

// ─────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────
async function checkAuth() {
  try {
    currentUser = await api('GET', '/auth/me');
    showApp();
  } catch (e) {
    showLogin();
  } finally {
    hideLoading();
  }
}

function hideLoading() {
  document.getElementById('loading-screen').classList.add('hidden');
}

function showLogin() {
  document.getElementById('login-page').classList.add('active');
  document.getElementById('app').classList.remove('active');
}

function showApp() {
  document.getElementById('login-page').classList.remove('active');
  document.getElementById('app').classList.add('active');

  // Set sidebar user info
  document.getElementById('sidebar-user-name').textContent = currentUser.name;
  document.getElementById('sidebar-user-role').textContent = currentUser.role;
  document.getElementById('user-avatar-initials').textContent = getInitials(currentUser.name);

  applyRoleVisibility();
  // Admin lands on Users (only page they may use). Others land on Dashboard.
  navigate(currentUser.role === 'admin' ? 'users' : 'dashboard');
}

// Login form — glass edition: particles, tilt, caps-lock, quick login, loading state
(function initLoginFx() {
  const page = document.getElementById('login-page');
  if (!page) return;
  const canvas = document.getElementById('login-particles');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dots = [];
    const N = window.matchMedia('(max-width: 920px)').matches ? 45 : 90;
    function resize() {
      const r = page.getBoundingClientRect();
      W = canvas.width = Math.max(1, Math.floor(r.width));
      H = canvas.height = Math.max(1, Math.floor(r.height));
    }
    function seed() {
      dots = Array.from({ length: N }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.8 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        a: 0.25 + Math.random() * 0.55,
        hue: Math.random() < 0.7 ? '255,255,255' : '199,210,254'
      }));
    }
    function tick() {
      if (!page.classList.contains('active')) { requestAnimationFrame(tick); return; }
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < -10) d.x = W + 10; if (d.x > W + 10) d.x = -10;
        if (d.y < -10) d.y = H + 10; if (d.y > H + 10) d.y = -10;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + d.hue + ',' + d.a.toFixed(2) + ')';
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    resize(); seed(); tick();
    window.addEventListener('resize', () => { resize(); seed(); });
  }
  const shell = document.getElementById('login-shell');
  const glare = document.getElementById('login-glare');
  if (shell && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let raf = null;
    shell.addEventListener('pointermove', (ev) => {
      const r = shell.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width - 0.5;
      const py = (ev.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        shell.style.transform = 'perspective(1100px) rotateY(' + (px * 5).toFixed(2) + 'deg) rotateX(' + (-py * 5).toFixed(2) + 'deg)';
        if (glare) { glare.style.setProperty('--glare-x', ((px + 0.5) * 100).toFixed(1) + '%'); glare.style.setProperty('--glare-y', ((py + 0.5) * 100).toFixed(1) + '%'); }
      });
    });
    shell.addEventListener('pointerleave', () => {
      if (raf) cancelAnimationFrame(raf);
      shell.style.transform = '';
    });
  }
  const pw = document.getElementById('login-password');
  const toggle = document.getElementById('pw-toggle');
  if (pw && toggle) {
    toggle.addEventListener('click', () => {
      const show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      toggle.textContent = show ? '🙈' : '👁️';
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      pw.focus();
    });
    const caps = document.getElementById('caps-hint');
    const checkCaps = (ev) => {
      if (!caps) return;
      try {
        const on = ev.getModifierState && ev.getModifierState('CapsLock');
        caps.classList.toggle('visible', !!on);
      } catch (_) {}
    };
    pw.addEventListener('keyup', checkCaps);
    pw.addEventListener('keydown', checkCaps);
  }
  document.querySelectorAll('.login-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const em = document.getElementById('login-email');
      const pw2 = document.getElementById('login-password');
      if (em) em.value = chip.dataset.email || '';
      if (pw2) pw2.value = chip.dataset.pass || '';
      const form = document.getElementById('login-form');
      if (form) form.requestSubmit();
    });
  });
  const remembered = localStorage.getItem('wh_remember_email');
  if (remembered) {
    const em = document.getElementById('login-email');
    if (em && !em.value) em.value = remembered;
  }
})();

// Login form
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearError('login-error');
  const btn = document.getElementById('login-btn');
  const label = btn.querySelector('.btn-label');
  btn.disabled = true;
  btn.classList.add('is-loading');
  if (label) label.textContent = 'Signing in…';

  try {
    const emailVal = document.getElementById('login-email').value;
    const remember = document.getElementById('login-remember');
    const { user } = await api('POST', '/auth/login', {
      email: emailVal,
      password: document.getElementById('login-password').value,
    });
    try {
      if (remember && remember.checked) localStorage.setItem('wh_remember_email', emailVal);
      else localStorage.removeItem('wh_remember_email');
    } catch (_) {}
    currentUser = user;
    showApp();
  } catch (err) {
    showError('login-error', err.message);
    const card = document.querySelector('.login-card');
    if (card) { card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; }
  } finally {
    btn.disabled = false;
    btn.classList.remove('is-loading');
    const lbl = btn.querySelector('.btn-label');
    if (lbl) lbl.textContent = 'Sign In →';
    else btn.textContent = 'Sign In';
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await api('POST', '/auth/logout');
  } catch (_) {}
  currentUser = null;
  showLogin();
});

// ─────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const { stats, upcoming } = await api('GET', '/dashboard');

    // Stat cards
    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card blue">
        <div class="stat-icon">📅</div>
        <div class="stat-value">${stats.upcoming_count ?? 0}</div>
        <div class="stat-label">Upcoming Workshops</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${stats.total_active_registrations ?? 0}</div>
        <div class="stat-label">Active Registrations</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value">${stats.full_workshops_count ?? 0}</div>
        <div class="stat-label">Fully Booked</div>
      </div>
      <div class="stat-card red">
        <div class="stat-icon">🪑</div>
        <div class="stat-value">${stats.available_workshops_count ?? 0}</div>
        <div class="stat-label">With Open Seats</div>
      </div>
    `;

    // Upcoming workshops
    if (!upcoming || upcoming.length === 0) {
      document.getElementById('upcoming-workshops-list').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <div class="empty-state-title">No upcoming workshops</div>
          <div class="empty-state-text">There are no scheduled workshops coming up.</div>
        </div>`;
      return;
    }

    document.getElementById('upcoming-workshops-list').innerHTML =
      upcoming.map(ws => workshopCardHTML(ws, true)).join('');

  } catch (err) {
    toast('Failed to load dashboard: ' + err.message, 'error');
  }
}

// Quick register button on dashboard
document.getElementById('dash-register-btn')?.addEventListener('click', () => openRegisterModal());

// ─────────────────────────────────────────────────────────
// WORKSHOPS
// ─────────────────────────────────────────────────────────
async function loadWorkshops() {
  const search = document.getElementById('workshop-search').value.trim();
  const status = document.getElementById('workshop-status-filter').value;
  const from = document.getElementById('workshop-from').value;
  const to = document.getElementById('workshop-to').value;
  const availableOnly = document.getElementById('available-only').checked;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (availableOnly) params.set('availableOnly', 'true');

  const list = document.getElementById('workshops-list');
  list.innerHTML = '<div class="skeleton" style="height:160px;border-radius:12px;"></div>'.repeat(3);

  try {
    const workshops = await api('GET', '/workshops?' + params.toString());
    if (!workshops.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">🗂️</div>
        <div class="empty-state-title">No workshops found</div>
        <div class="empty-state-text">Try adjusting your filters.</div>
      </div>`;
      return;
    }
    list.innerHTML = workshops.map(ws => workshopCardHTML(ws)).join('');
  } catch (err) {
    toast('Failed to load workshops: ' + err.message, 'error');
  }
}

function workshopCardHTML(ws, compact = false) {
  const pct = ws.capacity > 0 ? Math.min(100, Math.round((ws.registered_count / ws.capacity) * 100)) : 0;
  const cls = capacityClass(pct);
  const isFull = ws.registered_count >= ws.capacity;
  const canRegister = ws.status === 'scheduled' && !isFull &&
    (currentUser?.role === 'manager' || currentUser?.role === 'staff');

  return `
  <div class="workshop-card">
    <div class="workshop-card-color wc-${escHtml(ws.status)}"></div>
    <div class="workshop-card-body">
      <div class="workshop-card-header">
        <div class="workshop-card-title">${escHtml(ws.title)}</div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
          <span class="workshop-card-code">${escHtml(ws.code)}</span>
          ${statusBadge(ws.status)}
          ${isFull && ws.status === 'scheduled' ? '<span class="badge badge-full">FULL</span>' : ''}
        </div>
      </div>
      <div class="workshop-card-meta">
        <span class="workshop-meta-item">👤 ${escHtml(ws.instructor)}</span>
        <span class="workshop-meta-item">📍 ${escHtml(ws.location)}</span>
        <span class="workshop-meta-item">📅 ${fmtDateShort(ws.starts_at)}</span>
      </div>
      <div class="capacity-bar-wrap">
        <div class="capacity-label">
          <span>Seats: <strong>${ws.registered_count} / ${ws.capacity}</strong></span>
          <span>${ws.available_seats} available</span>
        </div>
        <div class="capacity-bar">
          <div class="capacity-fill ${cls}" style="width:${pct}%;"></div>
        </div>
      </div>
      ${compact ? '' : `<div class="workshop-card-actions">
        <button class="btn btn-secondary btn-sm" onclick="openWorkshopDetail(${ws.id})">👁 View</button>
        ${canRegister ? `<button class="btn btn-primary btn-sm" onclick="openRegisterModal(${ws.id})">📋 Register Attendee</button>` : ''}
        ${(currentUser?.role === 'manager') ? `<button class="btn btn-secondary btn-sm" onclick="openEditWorkshop(${ws.id})">✏️ Edit</button>` : ''}
      </div>`}
    </div>
  </div>`;
}

// Workshop search filters
['workshop-search', 'workshop-status-filter', 'workshop-from', 'workshop-to', 'available-only'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const eventType = id === 'available-only' ? 'change' : (id === 'workshop-search' ? 'input' : 'change');
  el.addEventListener(eventType, () => {
    if (currentPage !== 'workshops') return;
    clearTimeout(workshopSearchTimer);
    workshopSearchTimer = setTimeout(loadWorkshops, 350);
  });
});

document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
  document.getElementById('workshop-search').value = '';
  document.getElementById('workshop-status-filter').value = '';
  document.getElementById('workshop-from').value = '';
  document.getElementById('workshop-to').value = '';
  document.getElementById('available-only').checked = false;
  if (currentPage === 'workshops') loadWorkshops();
});

// Create workshop
document.getElementById('create-workshop-btn')?.addEventListener('click', () => {
  editingWorkshopId = null;
  document.getElementById('workshop-form-title').textContent = '🗂️ New Workshop';
  document.getElementById('ws-form-submit-btn').textContent = 'Create Workshop';
  clearError('ws-form-error');
  ['ws-code','ws-title','ws-description','ws-instructor','ws-location','ws-starts-at','ws-ends-at'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('ws-capacity').value = '';
  document.getElementById('ws-status').value = 'scheduled';
  document.getElementById('ws-code').readOnly = false;
  openModal('modal-workshop-form');
});

async function openEditWorkshop(id) {
  try {
    const ws = await api('GET', `/workshops/${id}`);
    editingWorkshopId = id;
    document.getElementById('workshop-form-title').textContent = '✏️ Edit Workshop';
    document.getElementById('ws-form-submit-btn').textContent = 'Save Changes';
    clearError('ws-form-error');

    document.getElementById('ws-code').value = ws.code;
    document.getElementById('ws-code').readOnly = true;
    document.getElementById('ws-title').value = ws.title;
    document.getElementById('ws-description').value = ws.description || '';
    document.getElementById('ws-instructor').value = ws.instructor;
    document.getElementById('ws-location').value = ws.location;
    document.getElementById('ws-starts-at').value = dtLocalValue(ws.starts_at);
    document.getElementById('ws-ends-at').value = dtLocalValue(ws.ends_at);
    document.getElementById('ws-capacity').value = ws.capacity;
    document.getElementById('ws-status').value = ws.status;

    openModal('modal-workshop-form');
  } catch (err) {
    toast('Failed to load workshop: ' + err.message, 'error');
  }
}

document.getElementById('ws-form-submit-btn')?.addEventListener('click', async () => {
  clearError('ws-form-error');

  const startsRaw = document.getElementById('ws-starts-at').value;
  const endsRaw = document.getElementById('ws-ends-at').value;

  const body = {
    title: document.getElementById('ws-title').value.trim(),
    description: document.getElementById('ws-description').value.trim(),
    instructor: document.getElementById('ws-instructor').value.trim(),
    location: document.getElementById('ws-location').value.trim(),
    starts_at: startsRaw ? new Date(startsRaw).toISOString() : '',
    ends_at: endsRaw ? new Date(endsRaw).toISOString() : '',
    capacity: parseInt(document.getElementById('ws-capacity').value, 10),
    status: document.getElementById('ws-status').value,
  };

  if (!editingWorkshopId) {
    body.code = document.getElementById('ws-code').value.trim().toUpperCase();
  }

  const btn = document.getElementById('ws-form-submit-btn');
  btn.disabled = true;
  try {
    if (editingWorkshopId) {
      await api('PATCH', `/workshops/${editingWorkshopId}`, body);
      toast('Workshop updated successfully.', 'success');
    } else {
      await api('POST', '/workshops', body);
      toast('Workshop created successfully.', 'success');
    }
    closeModal('modal-workshop-form');
    if (currentPage === 'workshops') loadWorkshops();
    if (currentPage === 'dashboard') loadDashboard();
  } catch (err) {
    showError('ws-form-error', err.message);
  } finally {
    btn.disabled = false;
  }
});

async function openWorkshopDetail(id) {
  document.getElementById('ws-detail-title').textContent = 'Workshop Detail';
  document.getElementById('ws-detail-body').innerHTML = '<div class="skeleton" style="height:300px;"></div>';
  openModal('modal-workshop-detail');

  try {
    const { workshop: ws, registrations } = await api('GET', `/workshops/${id}/registrations`);
    document.getElementById('ws-detail-title').textContent = escHtml(ws.title);

    const pct = ws.capacity > 0 ? Math.min(100, Math.round((ws.registered_count / ws.capacity) * 100)) : 0;

    const active = registrations.filter(r => r.status === 'active');
    const cancelled = registrations.filter(r => r.status === 'cancelled');

    document.getElementById('ws-detail-body').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Code</div><div class="detail-value font-mono text-accent">${escHtml(ws.code)}</div></div>
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${statusBadge(ws.status)}</div></div>
        <div class="detail-item"><div class="detail-label">Instructor</div><div class="detail-value">${escHtml(ws.instructor)}</div></div>
        <div class="detail-item"><div class="detail-label">Location</div><div class="detail-value">${escHtml(ws.location)}</div></div>
        <div class="detail-item"><div class="detail-label">Starts</div><div class="detail-value">${fmtDate(ws.starts_at)}</div></div>
        <div class="detail-item"><div class="detail-label">Ends</div><div class="detail-value">${fmtDate(ws.ends_at)}</div></div>
      </div>
      ${ws.description ? `<p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">${escHtml(ws.description)}</p>` : ''}
      <div class="capacity-bar-wrap" style="margin-bottom:20px;">
        <div class="capacity-label">
          <span>Capacity: <strong>${ws.registered_count} / ${ws.capacity} seats filled</strong></span>
          <span>${ws.available_seats} available</span>
        </div>
        <div class="capacity-bar"><div class="capacity-fill ${capacityClass(pct)}" style="width:${pct}%;"></div></div>
      </div>

      ${ws.status === 'scheduled' && ws.registered_count < ws.capacity ? `
        <div style="margin-bottom:16px;">
          <button class="btn btn-primary btn-sm" onclick="closeModal('modal-workshop-detail');openRegisterModal(${ws.id})">
            📋 Register Attendee
          </button>
        </div>` : ''}

      <div class="divider"></div>
      <div style="font-size:14px;font-weight:600;margin-bottom:12px;">
        Active Registrations (${active.length})
      </div>
      ${active.length === 0
        ? '<div class="empty-state" style="padding:20px;"><div class="empty-state-icon">🪑</div><div class="empty-state-title">No active registrations</div></div>'
        : `<div class="table-wrap" style="margin-bottom:20px;">
          <table>
            <thead><tr><th>Attendee</th><th>Email</th><th>Registered At</th><th>Staff</th><th>Action</th></tr></thead>
            <tbody>
              ${active.map(r => `<tr>
                <td>${escHtml(r.attendee_name)}</td>
                <td class="table-mono">${escHtml(r.attendee_email)}</td>
                <td style="color:var(--text-muted);font-size:12px;">${fmtDate(r.registered_at)}</td>
                <td style="color:var(--text-muted);font-size:12px;">${escHtml(r.registered_by_name || '—')}</td>
                <td><button class="btn btn-danger btn-sm" onclick="cancelRegistration(${r.id}, ${ws.id})">Cancel</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`
      }

      ${cancelled.length > 0 ? `
      <div style="font-size:14px;font-weight:600;margin-bottom:12px;">
        Cancelled Registrations (${cancelled.length})
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Attendee</th><th>Email</th><th>Cancelled At</th><th>By</th></tr></thead>
          <tbody>
            ${cancelled.map(r => `<tr style="opacity:0.65;">
              <td>${escHtml(r.attendee_name)}</td>
              <td class="table-mono">${escHtml(r.attendee_email)}</td>
              <td style="color:var(--text-muted);font-size:12px;">${fmtDate(r.cancelled_at)}</td>
              <td style="color:var(--text-muted);font-size:12px;">${escHtml(r.cancelled_by_name || '—')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    `;
  } catch (err) {
    document.getElementById('ws-detail-body').innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">${escHtml(err.message)}</div></div>`;
  }
}

// ─────────────────────────────────────────────────────────
// REGISTRATIONS
// ─────────────────────────────────────────────────────────
async function loadRegistrations() {
  const search = document.getElementById('reg-search').value.toLowerCase();
  const status = document.getElementById('reg-status-filter').value;

  const params = new URLSearchParams();
  if (status) params.set('status', status);

  const tbody = document.getElementById('registrations-table-body');
  tbody.innerHTML = '<tr><td colspan="6"><div class="skeleton" style="height:40px;margin:10px;"></div></td></tr>';

  try {
    let registrations = await api('GET', '/registrations/history?' + params.toString());

    if (search) {
      registrations = registrations.filter(r =>
        r.attendee_name?.toLowerCase().includes(search) ||
        r.attendee_email?.toLowerCase().includes(search) ||
        r.workshop_title?.toLowerCase().includes(search) ||
        r.workshop_code?.toLowerCase().includes(search)
      );
    }

    if (!registrations.length) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state"><div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No registrations found</div></div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = registrations.map(r => `
      <tr>
        <td>
          <div style="font-weight:600;">${escHtml(r.attendee_name)}</div>
          <div style="font-size:11px;color:var(--text-muted);">${escHtml(r.attendee_email)}</div>
        </td>
        <td>
          <div style="font-weight:500;">${escHtml(r.workshop_title || '—')}</div>
          <div class="table-mono" style="font-size:11px;">${escHtml(r.workshop_code || '—')}</div>
        </td>
        <td>${statusBadge(r.status)}</td>
        <td style="font-size:12px;color:var(--text-muted);">${fmtDate(r.registered_at)}</td>
        <td style="font-size:12px;color:var(--text-muted);">${escHtml(r.registered_by_name || '—')}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="openRegHistory(${r.id})">History</button>
            ${r.status === 'active' ? `<button class="btn btn-danger btn-sm" onclick="cancelRegistration(${r.id}, null)">Cancel</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    toast('Failed to load registrations: ' + err.message, 'error');
  }
}

// Registrations filter changes
document.getElementById('reg-status-filter')?.addEventListener('change', () => {
  if (currentPage === 'registrations') loadRegistrations();
});
document.getElementById('reg-search')?.addEventListener('input', () => {
  if (currentPage !== 'registrations') return;
  clearTimeout(regSearchTimer);
  regSearchTimer = setTimeout(loadRegistrations, 300);
});

document.getElementById('reg-register-btn')?.addEventListener('click', () => openRegisterModal());

// ─────────────────────────────────────────────────────────
// REGISTER ATTENDEE MODAL
// ─────────────────────────────────────────────────────────
async function openRegisterModal(preselectedWorkshopId = null) {
  clearError('reg-modal-error');
  document.getElementById('reg-attendee-name').value = '';
  document.getElementById('reg-attendee-email').value = '';
  document.getElementById('reg-notes').value = '';
  document.getElementById('reg-workshop-info').classList.add('hidden');

  // Load available workshops for the select
  try {
    const workshops = await api('GET', '/workshops?status=scheduled');
    const select = document.getElementById('reg-workshop-select');
    select.innerHTML = '<option value="">— Select a workshop —</option>' +
      workshops.map(ws => {
        const available = ws.available_seats;
        const full = available <= 0;
        return `<option value="${ws.id}" ${full ? 'disabled' : ''} ${ws.id == preselectedWorkshopId ? 'selected' : ''}>
          ${escHtml(ws.code)} — ${escHtml(ws.title)} (${available} seats left)${full ? ' [FULL]' : ''}
        </option>`;
      }).join('');

    // Show info for preselected
    if (preselectedWorkshopId) {
      const ws = workshops.find(w => w.id == preselectedWorkshopId);
      if (ws) updateRegWorkshopInfo(ws);
    }
  } catch (err) {
    toast('Failed to load workshops: ' + err.message, 'error');
  }

  openModal('modal-register');
}

document.getElementById('reg-workshop-select')?.addEventListener('change', async function () {
  const id = this.value;
  if (!id) {
    document.getElementById('reg-workshop-info').classList.add('hidden');
    return;
  }
  try {
    const ws = await api('GET', `/workshops/${id}`);
    updateRegWorkshopInfo(ws);
  } catch (_) {}
});

function updateRegWorkshopInfo(ws) {
  const info = document.getElementById('reg-workshop-info');
  const pct = Math.min(100, Math.round((ws.registered_count / ws.capacity) * 100));
  const isFull = ws.registered_count >= ws.capacity;
  document.getElementById('reg-workshop-seats').innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="font-weight:600;">${escHtml(ws.title)}</span>
      ${isFull ? '<span class="badge badge-full">FULL</span>' : `<span class="text-success">✅ ${ws.available_seats} seats left</span>`}
    </div>
    <div class="capacity-bar"><div class="capacity-fill ${capacityClass(pct)}" style="width:${pct}%;"></div></div>
    <div style="margin-top:6px;font-size:12px;color:var(--text-muted);">📅 ${fmtDate(ws.starts_at)} &nbsp;·&nbsp; 📍 ${escHtml(ws.location)}</div>
  `;
  info.classList.remove('hidden');
}

document.getElementById('reg-submit-btn')?.addEventListener('click', async () => {
  clearError('reg-modal-error');
  const workshopId = document.getElementById('reg-workshop-select').value;
  const attendee_name = document.getElementById('reg-attendee-name').value.trim();
  const attendee_email = document.getElementById('reg-attendee-email').value.trim();
  const notes = document.getElementById('reg-notes').value.trim();

  if (!workshopId) return showError('reg-modal-error', 'Please select a workshop.');
  if (!attendee_name) return showError('reg-modal-error', 'Attendee name is required.');
  if (!attendee_email) return showError('reg-modal-error', 'Attendee email is required.');

  const btn = document.getElementById('reg-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Registering…';

  try {
    await api('POST', `/workshops/${workshopId}/registrations`, {
      attendee_name, attendee_email, notes: notes || undefined,
    });
    toast('Attendee registered successfully! 🎉', 'success');
    closeModal('modal-register');
    if (currentPage === 'registrations') loadRegistrations();
    if (currentPage === 'dashboard') loadDashboard();
    if (currentPage === 'workshops') loadWorkshops();
  } catch (err) {
    showError('reg-modal-error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Register';
  }
});

// ─────────────────────────────────────────────────────────
// CANCEL REGISTRATION
// ─────────────────────────────────────────────────────────
async function cancelRegistration(regId, workshopId) {
  if (!confirm('Cancel this registration? The record will be preserved in history.')) return;

  try {
    const { message } = await api('POST', `/registrations/${regId}/cancel`);
    toast(message, 'success');

    // Refresh relevant views
    if (currentPage === 'registrations') loadRegistrations();
    if (currentPage === 'dashboard') loadDashboard();
    if (workshopId) {
      // Refresh the workshop detail modal if open
      const detailModal = document.getElementById('modal-workshop-detail');
      if (detailModal.classList.contains('open')) openWorkshopDetail(workshopId);
    }
  } catch (err) {
    toast('Failed to cancel: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────
// REGISTRATION HISTORY
// ─────────────────────────────────────────────────────────
async function loadHistory() {
  const status = document.getElementById('hist-status-filter').value;
  const params = new URLSearchParams();
  if (status) params.set('status', status);

  const tbody = document.getElementById('history-table-body');
  tbody.innerHTML = '<tr><td colspan="9"><div class="skeleton" style="height:40px;margin:10px;"></div></td></tr>';

  try {
    const registrations = await api('GET', '/registrations/history?' + params.toString());

    if (!registrations.length) {
      tbody.innerHTML = `<tr><td colspan="9">
        <div class="empty-state"><div class="empty-state-icon">📜</div>
        <div class="empty-state-title">No records found</div></div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = registrations.map(r => `
      <tr>
        <td><div style="font-weight:600;">${escHtml(r.attendee_name)}</div></td>
        <td class="table-mono" style="font-size:12px;">${escHtml(r.attendee_email)}</td>
        <td>
          <div style="font-weight:500;font-size:13px;">${escHtml(r.workshop_title || '—')}</div>
          <div class="table-mono" style="font-size:11px;">${escHtml(r.workshop_code || '—')}</div>
        </td>
        <td>${statusBadge(r.status)}</td>
        <td style="font-size:12px;color:var(--text-muted);">${fmtDate(r.registered_at)}</td>
        <td style="font-size:12px;color:var(--text-muted);">${escHtml(r.registered_by_name || '—')}</td>
        <td style="font-size:12px;color:var(--text-muted);">${r.cancelled_at ? fmtDate(r.cancelled_at) : '—'}</td>
        <td style="font-size:12px;color:var(--text-muted);">${r.cancelled_by_name ? escHtml(r.cancelled_by_name) : '—'}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="openRegHistory(${r.id})">📜 Detail</button></td>
      </tr>
    `).join('');
  } catch (err) {
    toast('Failed to load history: ' + err.message, 'error');
  }
}

document.getElementById('hist-status-filter')?.addEventListener('change', () => {
  if (currentPage === 'history') loadHistory();
});

async function openRegHistory(id) {
  document.getElementById('reg-history-body').innerHTML = '<div class="skeleton" style="height:200px;"></div>';
  openModal('modal-reg-history');

  try {
    const { registration: r, history } = await api('GET', `/registrations/${id}/history`);

    const timeline = history.map(h => {
      const isReg = h.action === 'REGISTER_ATTENDEE';
      return `
        <div class="timeline-item timeline-${isReg ? 'register' : 'cancel'}">
          <div class="timeline-dot">${isReg ? '✅' : '❌'}</div>
          <div class="timeline-body">
            <div class="timeline-action">${isReg ? 'Registered' : 'Cancelled'}</div>
            <div class="timeline-meta">by ${escHtml(h.actor_name || 'Unknown')} · ${fmtDate(h.created_at)}</div>
          </div>
        </div>`;
    }).join('');

    document.getElementById('reg-history-body').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Attendee</div><div class="detail-value">${escHtml(r.attendee_name)}</div></div>
        <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value font-mono" style="font-size:13px;">${escHtml(r.attendee_email)}</div></div>
        <div class="detail-item"><div class="detail-label">Workshop</div><div class="detail-value">${escHtml(r.workshop_title || '—')}</div></div>
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${statusBadge(r.status)}</div></div>
      </div>
      ${r.notes ? `<div style="background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:16px;font-size:13px;color:var(--text-secondary);">📝 ${escHtml(r.notes)}</div>` : ''}
      <div class="divider"></div>
      <div style="font-size:14px;font-weight:600;margin-bottom:14px;">Audit Trail</div>
      <div class="timeline">
        ${timeline || '<div class="text-muted" style="font-size:13px;">No audit events recorded.</div>'}
      </div>
    `;
  } catch (err) {
    document.getElementById('reg-history-body').innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">${escHtml(err.message)}</div></div>`;
  }
}

// ─────────────────────────────────────────────────────────
// USERS (Admin only)
// ─────────────────────────────────────────────────────────
async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '<tr><td colspan="6"><div class="skeleton" style="height:40px;margin:10px;"></div></td></tr>';

  try {
    const users = await api('GET', '/users');
    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">No users found</div></div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="user-avatar" style="width:32px;height:32px;font-size:12px;">${getInitials(u.name)}</div>
            <span style="font-weight:600;">${escHtml(u.name)}</span>
          </div>
        </td>
        <td class="table-mono" style="font-size:12px;">${escHtml(u.email)}</td>
        <td>${roleBadge(u.role)}</td>
        <td>
          <span class="badge ${u.is_active ? 'badge-active' : 'badge-cancelled'}">
            ${u.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td style="font-size:12px;color:var(--text-muted);">${fmtDate(u.created_at)}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openEditUser(${JSON.stringify(u).replace(/"/g, '&quot;')})">
            ✏️ Edit
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    toast('Failed to load users: ' + err.message, 'error');
  }
}

document.getElementById('create-user-btn')?.addEventListener('click', () => {
  editingUserId = null;
  document.getElementById('user-form-title').textContent = '👤 New User';
  document.getElementById('user-form-submit-btn').textContent = 'Create User';
  clearError('user-form-error');
  document.getElementById('uf-name').value = '';
  document.getElementById('uf-email').value = '';
  document.getElementById('uf-password').value = '';
  document.getElementById('uf-role').value = 'staff';
  document.getElementById('uf-password-group').style.display = '';
  document.getElementById('uf-active-group').style.display = 'none';
  openModal('modal-user-form');
});

function openEditUser(user) {
  if (typeof user === 'string') user = JSON.parse(user);
  editingUserId = user.id;
  document.getElementById('user-form-title').textContent = '✏️ Edit User';
  document.getElementById('user-form-submit-btn').textContent = 'Save Changes';
  clearError('user-form-error');
  document.getElementById('uf-name').value = user.name;
  document.getElementById('uf-email').value = user.email;
  document.getElementById('uf-password').value = '';
  document.getElementById('uf-role').value = user.role;
  document.getElementById('uf-active').checked = user.is_active;
  document.getElementById('uf-password-group').style.display = 'none';
  document.getElementById('uf-active-group').style.display = '';
  openModal('modal-user-form');
}

document.getElementById('user-form-submit-btn')?.addEventListener('click', async () => {
  clearError('user-form-error');
  const btn = document.getElementById('user-form-submit-btn');
  btn.disabled = true;

  try {
    if (editingUserId) {
      const body = {
        name: document.getElementById('uf-name').value.trim(),
        role: document.getElementById('uf-role').value,
        is_active: document.getElementById('uf-active').checked,
      };
      await api('PATCH', `/users/${editingUserId}`, body);
      toast('User updated successfully.', 'success');
    } else {
      const body = {
        name: document.getElementById('uf-name').value.trim(),
        email: document.getElementById('uf-email').value.trim(),
        password: document.getElementById('uf-password').value,
        role: document.getElementById('uf-role').value,
      };
      await api('POST', '/users', body);
      toast('User created successfully.', 'success');
    }
    closeModal('modal-user-form');
    loadUsers();
  } catch (err) {
    showError('user-form-error', err.message);
  } finally {
    btn.disabled = false;
  }
});

// ─────────────────────────────────────────────────────────
// SIDEBAR NAV BINDINGS
// ─────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.page));
});

// ─────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────
checkAuth();
