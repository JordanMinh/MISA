(function () {
  'use strict';
  const cfg = window.MISA_CONFIG || {};
  if (!window.supabase || typeof window.supabase.createClient !== 'function')
    throw new Error('MISA: Supabase library could not be loaded.');
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY)
    throw new Error('MISA: Supabase configuration is missing in config.js.');
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const CATEGORY_MIGRATION = {
    'Thời trang': 'Fashion', 'Điện tử': 'Electronics', 'Gia dụng': 'Home & Kitchen',
    'Làm đẹp': 'Beauty', 'Khác': 'Other'
  };
  const CATEGORY_COLORS = {
    Fashion: '#e07a5f', Electronics: '#3572EF', 'Home & Kitchen': '#43aa8b', Beauty: '#d46ab2', Other: '#8890b5'
  };
  const SAVED_KEY = 'misa_saved_products';
  let productCache = [];

  function normalizeCategory(category) { return CATEGORY_MIGRATION[category] || category || 'Other'; }
  function removeVietnameseTones(str) {
    return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').replace(/\u0110/g, 'D').toLowerCase();
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
  function safeUrl(raw) {
    if (!raw) return '';
    try { const u = new URL(raw); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; }
  }
  function formatPrice(v) {
    const amount = Number(v || 0);
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  async function fetchProducts() {
    const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    productCache = (data || []).map(p => ({...p, category: normalizeCategory(p.category), desc: p.description || p.desc || '', image: p.image_url || p.image || '', link: p.link || ''}));
    return productCache;
  }
  async function refreshProducts() { return fetchProducts(); }
  function getProducts() { return productCache.slice(); }
  async function getSession() { const { data } = await sb.auth.getSession(); return data.session; }
  async function isAdmin() {
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return false;
    const { data, error } = await sb.from('admin_users').select('user_id').eq('user_id', userData.user.id).maybeSingle();
    return !error && !!data;
  }
  function getSavedIds() { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch (_) { return []; } }
  function saveSavedIds(ids) { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); }
  function toggleSavedProduct(id) { const ids = getSavedIds(); const i = ids.indexOf(id); i === -1 ? ids.push(id) : ids.splice(i,1); saveSavedIds(ids); return ids.includes(id); }

  function renderProductCard(p, isSaved, alwaysUnsaveLabel) {
    const category = normalizeCategory(p.category), color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
    const img = p.image ? `<img loading="lazy" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">` : '<div class="image-placeholder" aria-label="No image"></div>';
    const label = alwaysUnsaveLabel ? '★ Remove saved' : (isSaved ? '★ Saved' : '☆ Save product');
    return `<article class="product-card" tabindex="0" data-name="${escapeHtml(removeVietnameseTones(p.name+' '+category))}" data-category="${escapeHtml(category)}" data-id="${escapeHtml(p.id)}">
      <div class="card-top"><div class="category-badge" style="background:${color}">${escapeHtml(category)}</div>${img}</div>
      <div class="info"><div class="p-name">${escapeHtml(p.name)}</div><div class="p-price">${formatPrice(p.price)}</div><div class="p-hint">View details</div></div>
      <button type="button" class="save-btn${isSaved || alwaysUnsaveLabel ? ' saved' : ''}" data-id="${escapeHtml(p.id)}">${label}</button>
    </article>`;
  }

  function ensureProductDetailModal() {
    let modal = document.getElementById('productDetailModal'); if (modal) return modal;
    modal = document.createElement('div'); modal.id='productDetailModal'; modal.className='modal-overlay'; modal.hidden=true;
    modal.innerHTML=`<div class="modal-box"><button type="button" class="modal-close" id="modalCloseBtn" aria-label="Close">&times;</button><div class="modal-media"><div class="modal-img" id="modalImg"></div></div><div class="modal-body"><div class="category-badge" id="modalCategory"></div><h3 class="modal-name" id="modalName"></h3><div class="modal-price" id="modalPrice"></div><div class="modal-desc-block"><div class="modal-section-label">Product description</div><p class="modal-desc" id="modalDesc"></p></div><div class="modal-source-block" id="modalSourceBlock"><div class="modal-section-label">Product source</div><div class="modal-source-row"><span class="modal-source-url" id="modalSourceUrl"></span><a href="#" target="_blank" rel="noopener noreferrer" class="modal-link-btn" id="modalLinkBtn">View original product</a></div></div></div></div>`;
    document.body.appendChild(modal); modal.addEventListener('click', e=>{if(e.target===modal) closeProductDetail()}); modal.querySelector('#modalCloseBtn').addEventListener('click', closeProductDetail); return modal;
  }
  function closeProductDetail(){ const m=document.getElementById('productDetailModal'); if(m)m.hidden=true; }
  function openProductDetail(id){ const p=productCache.find(x=>x.id===id); if(!p)return; const m=ensureProductDetailModal(); const c=normalizeCategory(p.category); m.querySelector('#modalImg').innerHTML=p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">`:''; const ce=m.querySelector('#modalCategory'); ce.textContent=c; ce.style.background=CATEGORY_COLORS[c]||CATEGORY_COLORS.Other; m.querySelector('#modalName').textContent=p.name; m.querySelector('#modalPrice').textContent=formatPrice(p.price); m.querySelector('#modalDesc').textContent=p.desc||'No description available for this product.'; const link=safeUrl(p.link); const block=m.querySelector('#modalSourceBlock'); block.style.display=link?'':'none'; if(link){m.querySelector('#modalSourceUrl').textContent=new URL(link).hostname.replace(/^www\./,'');m.querySelector('#modalLinkBtn').href=link;} m.hidden=false; }

  async function renderHomeFeed(){ const grid=document.getElementById('homeFeedGrid'); if(!grid)return; try{await window.MISA.ready; const products=productCache.filter(p=>!p.hidden), saved=getSavedIds(); grid.innerHTML=products.length?products.map(p=>renderProductCard(p,saved.includes(p.id))).join(''):'<p class="empty-state">No products have been posted yet.</p>'; renderCategoryFilterBar(); }catch(e){grid.innerHTML='<p class="empty-state">Unable to load products. Please try again later.</p>';console.error(e);} }
  let currentCategoryFilter='all';
  function applyFilters(){document.querySelectorAll('#homeFeedGrid .product-card').forEach(c=>c.style.display=currentCategoryFilter==='all'||c.dataset.category===currentCategoryFilter?'':'none');}
  function renderCategoryFilterBar(){const bar=document.getElementById('categoryFilterBar');if(!bar)return;const cats=['all',...Object.keys(CATEGORY_COLORS)];bar.innerHTML=cats.map(c=>`<button type="button" class="category-chip${c===currentCategoryFilter?' active':''}" data-value="${c}">${c==='all'?'All':c}</button>`).join('');bar.querySelectorAll('.category-chip').forEach(ch=>ch.addEventListener('click',()=>{currentCategoryFilter=ch.dataset.value;renderCategoryFilterBar();applyFilters();}));}

  document.addEventListener('click', e=>{const save=e.target.closest('.save-btn'); if(save){e.stopPropagation(); const now=toggleSavedProduct(save.dataset.id); save.classList.toggle('saved',now); save.textContent=now?'★ Saved':'☆ Save product'; return;} const card=e.target.closest('.product-card');if(card)openProductDetail(card.dataset.id);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeProductDetail(); if((e.key==='Enter'||e.key===' ')&&e.target.closest('.product-card')&&!e.target.closest('.save-btn')){e.preventDefault();openProductDetail(e.target.closest('.product-card').dataset.id);}});

  async function requireAdmin(){ const ok=await isAdmin(); if(!ok){window.location.replace('login.html');return false;} return true; }
  window.MISA={sb,CATEGORY_COLORS,normalizeCategory,removeVietnameseTones,escapeHtml,safeUrl,formatPrice,fetchProducts,refreshProducts,getProducts,getSession,isAdmin,requireAdmin,getSavedIds,saveSavedIds,toggleSavedProduct,renderProductCard,openProductDetail,renderHomeFeed};
  window.MISA.ready=fetchProducts().catch(e=>{console.error('MISA data error:',e);productCache=[];});
})();
