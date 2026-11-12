(function () {
  'use strict';
  const cfg = window.MISA_CONFIG || {};
  const required = ['FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID', 'FIREBASE_APP_ID'];
  const missing = required.filter((key) => !cfg[key] || String(cfg[key]).startsWith('REPLACE_'));
  if (missing.length) throw new Error('MISA Firebase configuration is incomplete: ' + missing.join(', '));
  if (!window.firebase) throw new Error('Firebase SDK failed to load. Check internet access to gstatic.com.');

  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: cfg.FIREBASE_API_KEY,
      authDomain: cfg.FIREBASE_AUTH_DOMAIN,
      projectId: cfg.FIREBASE_PROJECT_ID,
      storageBucket: cfg.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: cfg.FIREBASE_MESSAGING_SENDER_ID,
      appId: cfg.FIREBASE_APP_ID,
      measurementId: cfg.FIREBASE_MEASUREMENT_ID
    });
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  const authReady = new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user || null);
    }, (error) => {
      console.error('Firebase auth state error:', error);
      unsubscribe();
      resolve(null);
    });
  });

  const CATEGORY_MIGRATION = {
    'Thời trang': 'Fashion', 'Điện tử': 'Electronics', 'Gia dụng': 'Home & Kitchen',
    'Làm đẹp': 'Beauty', 'Khác': 'Other'
  };
  const CATEGORY_COLORS = {
    Fashion: '#e07a5f', Electronics: '#3572EF', 'Home & Kitchen': '#43aa8b',
    Beauty: '#d46ab2', Other: '#8890b5'
  };
  const SAVED_KEY = 'misa_saved_products';
  let productCache = [];

  function normalizeCategory(category) { return CATEGORY_MIGRATION[category] || category || 'Other'; }
  function removeVietnameseTones(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd').replace(/\u0110/g, 'D').toLowerCase();
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }
  function safeUrl(raw) {
    if (!raw) return '';
    try { const url = new URL(raw); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
    catch (_) { return ''; }
  }
  function formatPrice(value) {
    return Number(value || 0).toLocaleString('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }
  async function getCurrentUser() { await authReady; return auth.currentUser; }
  async function isAdmin() {
    await authReady;
    const user = auth.currentUser;
    if (!user) return false;
    try {
      const snapshot = await db.collection('admins').doc(user.uid).get();
      return snapshot.exists && snapshot.data().role === 'admin';
    } catch (error) {
      console.error('MISA admin check failed:', error);
      return false;
    }
  }
  async function requireAdmin() {
    if (!(await isAdmin())) { location.replace('login.html'); return false; }
    return true;
  }
  async function fetchProducts() {
    await authReady;
    const admin = await isAdmin();
    let query = db.collection('products');
    if (!admin) query = query.where('hidden', '==', false);
    const snapshot = await query.get();
    productCache = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).map((product) => ({
      ...product,
      category: normalizeCategory(product.category),
      desc: product.description || product.desc || '',
      image: product.image_url || product.image || '',
      link: product.link || ''
    }));
    productCache.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return productCache;
  }
  async function refreshProducts() { return fetchProducts(); }
  function getProducts() { return productCache.slice(); }
  function getSavedIds() {
    try { const value = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); return Array.isArray(value) ? value : []; }
    catch (_) { return []; }
  }
  function saveSavedIds(ids) { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); }
  function toggleSavedProduct(id) {
    const ids = getSavedIds(); const index = ids.indexOf(id);
    if (index === -1) ids.push(id); else ids.splice(index, 1);
    saveSavedIds(ids); return ids.includes(id);
  }
  function renderProductCard(product, isSaved, alwaysUnsaveLabel) {
    const category = normalizeCategory(product.category);
    const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
    const image = product.image
      ? `<img loading="lazy" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">`
      : '<div class="image-placeholder" aria-label="No image"></div>';
    const label = alwaysUnsaveLabel ? '★ Remove saved' : (isSaved ? '★ Saved' : '☆ Save product');
    return `<article class="product-card" tabindex="0" data-name="${escapeHtml(removeVietnameseTones(product.name + ' ' + category))}" data-category="${escapeHtml(category)}" data-id="${escapeHtml(product.id)}"><div class="card-top"><div class="category-badge" style="background:${color}">${escapeHtml(category)}</div>${image}</div><div class="info"><div class="p-name">${escapeHtml(product.name)}</div><div class="p-price">${formatPrice(product.price)}</div><div class="p-hint">View details</div></div><button type="button" class="save-btn${isSaved || alwaysUnsaveLabel ? ' saved' : ''}" data-id="${escapeHtml(product.id)}">${label}</button></article>`;
  }
  function ensureProductDetailModal() {
    let modal = document.getElementById('productDetailModal');
    if (modal) return modal;
    modal = document.createElement('div'); modal.id = 'productDetailModal'; modal.className = 'modal-overlay'; modal.hidden = true;
    modal.innerHTML = `<div class="modal-box"><button type="button" class="modal-close" id="modalCloseBtn" aria-label="Close">&times;</button><div class="modal-media"><div class="modal-img" id="modalImg"></div></div><div class="modal-body"><div class="category-badge" id="modalCategory"></div><h3 class="modal-name" id="modalName"></h3><div class="modal-price" id="modalPrice"></div><div class="modal-desc-block"><div class="modal-section-label">Product description</div><p class="modal-desc" id="modalDesc"></p></div><div class="modal-source-block" id="modalSourceBlock"><div class="modal-section-label">Product source</div><div class="modal-source-row"><span class="modal-source-url" id="modalSourceUrl"></span><a href="#" target="_blank" rel="noopener noreferrer" class="modal-link-btn" id="modalLinkBtn">View original product</a></div></div></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeProductDetail(); });
    modal.querySelector('#modalCloseBtn').addEventListener('click', closeProductDetail);
    return modal;
  }
  function closeProductDetail() { const modal = document.getElementById('productDetailModal'); if (modal) modal.hidden = true; }
  function openProductDetail(id) {
    const product = productCache.find((item) => item.id === id); if (!product) return;
    const modal = ensureProductDetailModal(); const category = normalizeCategory(product.category);
    modal.querySelector('#modalImg').innerHTML = product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">` : '';
    const badge = modal.querySelector('#modalCategory'); badge.textContent = category; badge.style.background = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
    modal.querySelector('#modalName').textContent = product.name;
    modal.querySelector('#modalPrice').textContent = formatPrice(product.price);
    modal.querySelector('#modalDesc').textContent = product.desc || 'No description available for this product.';
    const link = safeUrl(product.link); const block = modal.querySelector('#modalSourceBlock'); block.style.display = link ? '' : 'none';
    if (link) { modal.querySelector('#modalSourceUrl').textContent = new URL(link).hostname.replace(/^www\./, ''); modal.querySelector('#modalLinkBtn').href = link; }
    modal.hidden = false;
  }
  let currentCategoryFilter = 'all';
  function applyHomeFilters() {
    document.querySelectorAll('#homeFeedGrid .product-card').forEach((card) => {
      card.style.display = currentCategoryFilter === 'all' || card.dataset.category === currentCategoryFilter ? '' : 'none';
    });
  }
  function renderCategoryFilterBar() {
    const bar = document.getElementById('categoryFilterBar'); if (!bar) return;
    const categories = ['all', ...Object.keys(CATEGORY_COLORS)];
    bar.innerHTML = categories.map((category) => `<button type="button" class="category-chip${category === currentCategoryFilter ? ' active' : ''}" data-value="${category}">${category === 'all' ? 'All' : category}</button>`).join('');
    bar.querySelectorAll('.category-chip').forEach((button) => button.addEventListener('click', () => {
      currentCategoryFilter = button.dataset.value; renderCategoryFilterBar(); applyHomeFilters();
    }));
  }
  async function renderHomeFeed() {
    const grid = document.getElementById('homeFeedGrid'); if (!grid) return;
    try {
      await window.MISA.ready;
      const products = productCache.filter((product) => !product.hidden);
      const saved = getSavedIds();
      grid.innerHTML = products.length ? products.map((product) => renderProductCard(product, saved.includes(product.id))).join('') : '<p class="empty-state">No products have been posted yet.</p>';
      renderCategoryFilterBar();
    } catch (error) {
      grid.innerHTML = '<p class="empty-state">Unable to load products. Please try again later.</p>';
      console.error(error);
    }
  }
  async function saveProduct(id, payload) { await db.collection('products').doc(id).set(payload, { merge: true }); }
  async function addProduct(payload) { const ref = await db.collection('products').add(payload); return ref.id; }
  async function updateProduct(id, payload) { await db.collection('products').doc(id).set(payload, { merge: true }); }
  async function deleteProduct(id) { await db.collection('products').doc(id).delete(); }
  async function uploadToCloudinary(file) {
    if (!(file instanceof File)) throw new Error('Choose an image file first.');
    if (!file.type.startsWith('image/')) throw new Error('Only image files can be uploaded.');
    if (file.size > 10 * 1024 * 1024) throw new Error('Image size must be 10 MB or less.');
    await authReady;
    const user = auth.currentUser; if (!user) throw new Error('Please sign in first.');
    const token = await user.getIdToken();
    const signResponse = await fetch('/api/cloudinary-sign', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({})
    });
    const sign = await signResponse.json().catch(() => ({}));
    if (!signResponse.ok) throw new Error(sign.error || 'Could not sign image upload.');
    const form = new FormData(); form.append('file', file); form.append('api_key', sign.api_key);
    form.append('timestamp', String(sign.timestamp)); form.append('folder', sign.folder); form.append('signature', sign.signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(sign.cloud_name)}/image/upload`, { method: 'POST', body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((result.error && result.error.message) || 'Cloudinary upload failed.');
    return result.secure_url;
  }

  document.addEventListener('click', (event) => {
    const saveButton = event.target.closest('.save-btn');
    if (saveButton) {
      event.stopPropagation(); const saved = toggleSavedProduct(saveButton.dataset.id);
      saveButton.classList.toggle('saved', saved); saveButton.textContent = saved ? '★ Saved' : '☆ Save product'; return;
    }
    const card = event.target.closest('.product-card'); if (card) openProductDetail(card.dataset.id);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeProductDetail();
    const card = event.target.closest && event.target.closest('.product-card');
    if (card && (event.key === 'Enter' || event.key === ' ') && !event.target.closest('.save-btn')) {
      event.preventDefault(); openProductDetail(card.dataset.id);
    }
  });

  window.MISA = {
    auth, db, authReady, CATEGORY_COLORS, normalizeCategory, removeVietnameseTones, escapeHtml,
    safeUrl, formatPrice, getCurrentUser, isAdmin, requireAdmin, fetchProducts, refreshProducts,
    getProducts, getSavedIds, saveSavedIds, toggleSavedProduct, renderProductCard, renderHomeFeed,
    saveProduct, addProduct, updateProduct, deleteProduct, uploadToCloudinary
  };
  window.MISA.ready = fetchProducts().catch((error) => {
    console.error('MISA Firebase data error:', error);
    productCache = [];
    throw error;
  });
})();
