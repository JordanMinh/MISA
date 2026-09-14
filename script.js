// ============================================================
// script.js — controls the shared navigation bar (#navbody) for
// all pages: index.html, upload.html, saved.html
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  const homeRadio   = document.getElementById('choose1'); // home icon
  const searchRadio = document.getElementById('choose2'); // search icon
  const savedRadio  = document.getElementById('choose3'); // bookmark icon
  const uploadRadio = document.getElementById('choose4'); // remaining icon -> add product

  // Use the "click" event (not "change") so clicking an already selected icon
  // still triggers the action (change only fires when the state changes).
  
  if (homeRadio) {
    homeRadio.addEventListener('click', function () {
      window.location.href = 'index.html';
    });
  }

  if (savedRadio) {
    savedRadio.addEventListener('click', function () {
      window.location.href = 'saved.html';
    });
  }

  if (searchRadio) {
    searchRadio.addEventListener('click', function () {
      window.location.href = 'search.html';
    });
  }

  // ============================================================
// PROTECT THE PRODUCT UPLOAD PAGE
// ============================================================

const ADMIN_PASSWORD = 'misatienlen'; // <-- change the password here

// Enter the password from the Console
window.Password = function (password) {
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem('misa_admin', 'true');

    console.log('%c✓ Authentication successful!', 'color: green; font-size: 16px; font-weight: bold;');
    console.log('You are now authorized to access the product upload page.');

    // Redirect to the upload page if currently on another page
    window.location.href = 'upload.html';
  } else {
    console.log('%c✗ Incorrect password!', 'color: red; font-size: 16px; font-weight: bold;');
  }
};


// Check access to the product upload page
function isAdmin() {
  return sessionStorage.getItem('misa_admin') === 'true';
}


// Add-product button
if (uploadRadio) {
  uploadRadio.addEventListener('click', function () {

    if (isAdmin()) {
      window.location.href = 'upload.html';
    } else {
      alert('You do not have permission to access the product upload page!');
    }

  });
}

  // The search icon now goes directly to the dedicated search page
  // (search.html) — handled by the addEventListener block above.

  // If the current page has a product feed (home page),
  // display all posted products there.
  renderHomeFeed();
});

// ============================================================
// Generate HTML for one product card — shared by the home feed,
// upload.html and saved.html to avoid duplicated code.
// ============================================================

const CATEGORY_MIGRATION = {
  '\u0054\u0068\u1eddi\u0020\u0074\u0072\u0061\u006e\u0067': 'Fashion',
  '\u0110\u0069\u1ec7\u006e\u0020\u0074\u1eed': 'Electronics',
  '\u0047\u0069\u0061\u0020\u0064\u1ee5\u006e\u0067': 'Home & Kitchen',
  '\u004c\u00e0\u006d\u0020\u0111\u1eb9\u0070': 'Beauty',
  '\u004b\u0068\u00e1\u0063': 'Other'
};

const CATEGORY_COLORS = {
  'Fashion': '#e07a5f',
  'Electronics': '#3572EF',
  'Home & Kitchen': '#43aa8b',
  'Beauty': '#d46ab2',
  'Other': '#8890b5'
};

function normalizeCategory(category) {
  return CATEGORY_MIGRATION[category] || category || 'Other';
}

function displayCategory(category) {
  return normalizeCategory(category);
}

function renderProductCard(p, isSaved, alwaysUnsaveLabel) {
  const category = normalizeCategory(p.category);
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
  const img = p.image
    ? '<img src="' + p.image + '" alt="' + p.name + '">'
    : '<img src="" alt="">';
  const priceFmt = Number(p.price).toLocaleString('en-US') + ' ₫';
  const searchable = (p.name + ' ' + category).toLowerCase();

  let label;
  if (alwaysUnsaveLabel) {
    label = '★ Remove saved';
  } else {
    label = isSaved ? '★ Saved' : '☆ Save product';
  }

  return (
    '<div class="product-card" data-name="' + searchable + '" data-category="' + category + '" data-id="' + p.id + '">' +
      '<div class="card-top">' +
        '<div class="category-badge" style="background:' + color + '">' + category + '</div>' +
        img +
      '</div>' +
      '<div class="info">' +
        '<div class="p-name">' + p.name + '</div>' +
        '<div class="p-price">' + priceFmt + '</div>' +
        '<div class="p-hint">View details</div>' +
      '</div>' +
      '<button type="button" class="save-btn' + (isSaved || alwaysUnsaveLabel ? ' saved' : '') + '" data-id="' + p.id + '">' + label + '</button>' +
    '</div>'
  );
}

// ============================================================
// PRODUCT DETAIL MODAL — shared by every page with product cards
// (.product-card): clicking a card (except the save button) opens the modal
// with the full description and a link to the original product (if available).
// ============================================================

function ensureProductDetailModal() {
  let modal = document.getElementById('productDetailModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'productDetailModal';
  modal.className = 'modal-overlay';
  modal.hidden = true;
  modal.innerHTML =
    '<div class="modal-box">' +
      '<button type="button" class="modal-close" id="modalCloseBtn" aria-label="Close">&times;</button>' +
      '<div class="modal-media">' +
        '<div class="modal-img" id="modalImg"></div>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="category-badge" id="modalCategory"></div>' +
        '<h3 class="modal-name" id="modalName"></h3>' +
        '<div class="modal-price" id="modalPrice"></div>' +
        '<div class="modal-desc-block">' +
          '<div class="modal-section-label">Product description</div>' +
          '<p class="modal-desc" id="modalDesc"></p>' +
        '</div>' +
        '<div class="modal-source-block" id="modalSourceBlock">' +
          '<div class="modal-section-label">Product source</div>' +
          '<div class="modal-source-row">' +
            '<span class="modal-source-url" id="modalSourceUrl"></span>' +
            '<a href="#" target="_blank" rel="noopener noreferrer" class="modal-link-btn" id="modalLinkBtn">' +
              '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3h7v7M21 3l-9 9M12 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '<span>View original product</span>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeProductDetail();
  });
  modal.querySelector('#modalCloseBtn').addEventListener('click', closeProductDetail);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeProductDetail();
  });

  return modal;
}

function closeProductDetail() {
  const modal = document.getElementById('productDetailModal');
  if (modal) modal.hidden = true;
}

function openProductDetail(id) {
  const p = getProducts().find(function (x) { return x.id === id; });
  if (!p) return;

  const modal = ensureProductDetailModal();
  const category = normalizeCategory(p.category);
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];

  const imgWrap = modal.querySelector('#modalImg');
  imgWrap.innerHTML = p.image ? '<img src="' + p.image + '" alt="' + p.name + '">' : '';

  const categoryEl = modal.querySelector('#modalCategory');
  categoryEl.textContent = category;
  categoryEl.style.background = color;

  modal.querySelector('#modalName').textContent = p.name;
  modal.querySelector('#modalPrice').textContent = Number(p.price).toLocaleString('en-US') + ' ₫';
  modal.querySelector('#modalDesc').textContent = p.desc || 'No description available for this product.';

  const sourceBlock = modal.querySelector('#modalSourceBlock');
  const sourceUrl = modal.querySelector('#modalSourceUrl');
  const linkBtn = modal.querySelector('#modalLinkBtn');
  if (p.link) {
    let displayUrl = p.link;
    try { displayUrl = new URL(p.link).hostname.replace(/^www\./, ''); } catch (e) {}
    sourceUrl.textContent = displayUrl;
    linkBtn.href = p.link;
    sourceBlock.style.display = '';
  } else {
    linkBtn.href = '#';
    sourceBlock.style.display = 'none';
  }

  modal.hidden = false;
}

// Clicking any product card (except the save button) on any page
// opens the detail modal — event delegation avoids reattaching
// listeners every time the product grid is rendered.
document.addEventListener('click', function (e) {
  const saveBtn = e.target.closest('.save-btn');
  if (saveBtn) return; // so the save button can handle itself and not open the modal

  const card = e.target.closest('.product-card');
  if (!card) return;

  openProductDetail(card.dataset.id);
});

function renderHomeFeed() {
  const grid = document.getElementById('homeFeedGrid');
  if (!grid) return; // this page does not have a feed (not the home page)

  // Show only products that are not hidden by the admin (p.hidden !== true)
  const products = getProducts().filter(function (p) { return !p.hidden; });
  const savedIds = getSavedIds();

  if (products.length === 0) {
    grid.innerHTML =
      '<p class="empty-state">No products have been posted yet. Visit ' +
      '<a href="upload.html" style="color:#3572EF;">Add Product</a> to post the first product!</p>';
    return;
  }

  grid.innerHTML = products.map(function (p) {
    return renderProductCard(p, savedIds.includes(p.id));
  }).join('');

  renderCategoryFilterBar();

  grid.querySelectorAll('.save-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const isNowSaved = toggleSavedProduct(btn.dataset.id);
      btn.classList.toggle('saved', isNowSaved);
      btn.textContent = isNowSaved ? '★ Saved' : '☆ Save product';
    });
  });
}

// ============================================================
// SEARCH FIX: unaccented queries such as "dien thoai" previously
// did not match accented product names because strings were compared directly.
// The function below removes Vietnamese diacritics before comparison,
// so both accented and unaccented searches work correctly.
// It is shared by search.html and the admin management table.
// ============================================================
function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase();
}

let currentCategoryFilter = 'all';

// The home page only filters by category here; text search
// has moved to the dedicated search page (search.html / search.js).
function applyFilters() {
  const cards = document.querySelectorAll('.product-card');

  cards.forEach((card) => {
    const category = card.dataset.category || '';
    const matchesCategory = currentCategoryFilter === 'all' || category === currentCategoryFilter;
    card.style.display = matchesCategory ? '' : 'none';
  });
}

function setCategoryFilter(category, barEl) {
  currentCategoryFilter = category;
  if (barEl) {
    barEl.querySelectorAll('.category-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.value === category);
    });
  }
  applyFilters();
}

function renderCategoryFilterBar() {
  const bar = document.getElementById('categoryFilterBar');
  if (!bar) return; // this page does not have a filter bar (not the home page)

  const categories = ['all'].concat(Object.keys(CATEGORY_COLORS));
  const labels = { all: 'All' };

  bar.innerHTML = categories.map(function (cat) {
    const isAll = cat === 'all';
    const label = isAll ? labels.all : cat;
    const activeClass = cat === currentCategoryFilter ? ' active' : '';
    return '<button type="button" class="category-chip' + activeClass + '" data-value="' + cat + '">' + label + '</button>';
  }).join('');

  bar.querySelectorAll('.category-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      setCategoryFilter(chip.dataset.value, bar);
    });
  });
}

// ============================================================
// Store products in localStorage (browser-side demo,
// not connected to a real server). Data is shared between
// upload.html (where products are added) and saved.html (where
// saved products are displayed).
// ============================================================

const PRODUCTS_KEY = 'misa_products';
const SAVED_KEY = 'misa_saved_products';

function getProducts() {
  try {
    const products = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
    return products.map(function (p) {
      return Object.assign({}, p, { category: normalizeCategory(p.category) });
    });
  } catch (e) {
    return [];
  }
}

function saveProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

function getSavedIds() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveSavedIds(ids) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
}

function toggleSavedProduct(id) {
  const ids = getSavedIds();
  const idx = ids.indexOf(id);
  if (idx === -1) {
    ids.push(id);
  } else {
    ids.splice(idx, 1);
  }
  saveSavedIds(ids);
  return ids.includes(id);
}