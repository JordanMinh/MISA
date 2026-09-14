// upload.js — logic for the admin dashboard (upload.html)
// (shared navigation is handled in script.js)

// Check access permission
if (sessionStorage.getItem('misa_admin') !== 'true') {
  alert('You do not have permission to access the admin dashboard!');
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('productForm');
  const imageInput = document.getElementById('pImage');
  const imageDrop = document.getElementById('imageDrop');
  const dropHint = document.getElementById('dropHint');
  const formHeading = document.getElementById('formHeading');
  const submitBtn = document.getElementById('submitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const formNote = document.getElementById('formNote');
  const adminSearchInput = document.getElementById('adminSearchInput');
  const adminCategoryFilterBar = document.getElementById('adminCategoryFilter');

  let pendingImage = '';
  let editingId = null;          // null = adding a new product, value = editing this product
  let adminCategoryFilter = 'all';

  // Ensure the original link is always a full external URL
  // (e.g. if the user enters "shopee.vn/abc" without "https://").
  function normalizeExternalLink(raw) {
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return 'https://' + raw;
  }

  // ------------------------------------------------------------
  // Select / preview image
  // ------------------------------------------------------------
  imageInput.addEventListener('change', function () {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      pendingImage = e.target.result;
      showImagePreview(pendingImage);
    };
    reader.readAsDataURL(file);
  });

  function showImagePreview(src) {
    dropHint.style.display = 'none';
    let preview = imageDrop.querySelector('img');
    if (!preview) {
      preview = document.createElement('img');
      imageDrop.appendChild(preview);
    }
    preview.src = src;
  }

  function clearImagePreview() {
    dropHint.style.display = '';
    const preview = imageDrop.querySelector('img');
    if (preview) preview.remove();
  }

  // ------------------------------------------------------------
  // Add / update product (shared form)
  // ------------------------------------------------------------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('pName').value.trim();
    const price = document.getElementById('pPrice').value;
    const category = document.getElementById('pCategory').value;
    const desc = document.getElementById('pDesc').value.trim();
    const link = normalizeExternalLink(document.getElementById('pLink').value.trim());

    if (!name || !price) return;

    const products = getProducts();

    if (editingId) {
      // Editing: update the product by id while keeping its hidden/visible state
      const idx = products.findIndex(function (p) { return p.id === editingId; });
      if (idx !== -1) {
        products[idx] = Object.assign({}, products[idx], {
          name, price, category, desc, link,
          image: pendingImage || products[idx].image || ''
        });
      }
    } else {
      // Adding a new product
      products.unshift({
        id: 'p_' + Date.now(),
        name,
        price,
        category,
        desc,
        link,
        image: pendingImage || '',
        hidden: false
      });
    }

    saveProducts(products);
    exitEditMode();
    renderAdminTable();
  });

  cancelEditBtn.addEventListener('click', function () {
    exitEditMode();
  });

  function enterEditMode(p) {
    editingId = p.id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pCategory').value = p.category || 'Other';
    document.getElementById('pDesc').value = p.desc || '';
    document.getElementById('pLink').value = p.link || '';
    pendingImage = p.image || '';
    if (pendingImage) {
      showImagePreview(pendingImage);
    } else {
      clearImagePreview();
    }

    formHeading.textContent = 'Edit Product';
    submitBtn.textContent = 'Save Changes';
    formNote.textContent = 'You are editing a posted product.';
    cancelEditBtn.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function exitEditMode() {
    editingId = null;
    form.reset();
    pendingImage = '';
    clearImagePreview();
    document.getElementById('pCategory').value = 'Other';

    formHeading.textContent = 'Post a New Product';
    submitBtn.textContent = 'Post Product';
    formNote.textContent = 'The product will appear in the management list below.';
    cancelEditBtn.hidden = true;
  }

  // ------------------------------------------------------------
  // Product management table: display / search / filter by category /
  // edit / show-hide / delete
  // ------------------------------------------------------------
  function renderAdminTable() {
    const body = document.getElementById('adminTableBody');
    const products = getProducts();

    renderAdminCategoryFilterBar();

    if (products.length === 0) {
      body.innerHTML = '<p class="empty-state">No products yet. Post your first product above!</p>';
      applyAdminFilters();
      return;
    }

    body.innerHTML = products.map(renderAdminRow).join('');

    body.querySelectorAll('[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const p = getProducts().find(function (x) { return x.id === btn.dataset.id; });
        if (p) enterEditMode(p);
      });
    });

    body.querySelectorAll('[data-action="toggle-hidden"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const products = getProducts();
        const p = products.find(function (x) { return x.id === btn.dataset.id; });
        if (!p) return;
        p.hidden = !p.hidden;
        saveProducts(products);
        renderAdminTable();
      });
    });

    body.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const products = getProducts();
        const p = products.find(function (x) { return x.id === btn.dataset.id; });
        if (!p) return;
        const ok = confirm('Delete product "' + p.name + '"? This action cannot be undone.');
        if (!ok) return;

        saveProducts(products.filter(function (x) { return x.id !== btn.dataset.id; }));

        // Remove the deleted product from the saved list (if present)
        saveSavedIds(getSavedIds().filter(function (id) { return id !== btn.dataset.id; }));

        if (editingId === btn.dataset.id) exitEditMode();
        renderAdminTable();
      });
    });

    applyAdminFilters();
  }

  function renderAdminRow(p) {
    const category = p.category || 'Other';
    const color = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
    const priceFmt = Number(p.price).toLocaleString('en-US') + ' ₫';
    const img = p.image ? '<img src="' + p.image + '" alt="' + p.name + '">' : '<div class="row-img-placeholder"></div>';
    const isHidden = !!p.hidden;
    const searchable = removeVietnameseTones(p.name + ' ' + category);

    return (
      '<div class="admin-row" data-name="' + searchable + '" data-category="' + category + '" data-id="' + p.id + '">' +
        '<div class="col-img">' + img + '</div>' +
        '<div class="col-name" data-label="Name: ">' + p.name + '</div>' +
        '<div class="col-price" data-label="Price: ">' + priceFmt + '</div>' +
        '<div class="col-cat" data-label="Category: "><span class="category-badge" style="background:' + color + '">' + category + '</span></div>' +
        '<div class="col-status" data-label="Status: ">' +
          '<span class="status-badge ' + (isHidden ? 'is-hidden' : 'is-visible') + '">' + (isHidden ? 'Hidden' : 'Visible') + '</span>' +
        '</div>' +
        '<div class="col-actions" data-label="Actions: ">' +
          '<button type="button" class="row-btn edit-btn" data-action="edit" data-id="' + p.id + '">Edit</button>' +
          '<button type="button" class="row-btn toggle-btn" data-action="toggle-hidden" data-id="' + p.id + '">' + (isHidden ? 'Show' : 'Hide') + '</button>' +
          '<button type="button" class="row-btn delete-btn" data-action="delete" data-id="' + p.id + '">Delete</button>' +
        '</div>' +
      '</div>'
    );
  }

  function applyAdminFilters() {
    const q = removeVietnameseTones(adminSearchInput.value.trim());
    const rows = document.querySelectorAll('.admin-row:not(.admin-row-head)');
    rows.forEach(function (row) {
      const name = row.dataset.name || '';
      const category = row.dataset.category || '';
      const matchesSearch = !q || name.includes(q);
      const matchesCategory = adminCategoryFilter === 'all' || category === adminCategoryFilter;
      row.style.display = (matchesSearch && matchesCategory) ? '' : 'none';
    });
  }

  function renderAdminCategoryFilterBar() {
    const categories = ['all'].concat(Object.keys(CATEGORY_COLORS));
    adminCategoryFilterBar.innerHTML = categories.map(function (cat) {
      const label = cat === 'all' ? 'All' : cat;
      const activeClass = cat === adminCategoryFilter ? ' active' : '';
      return '<button type="button" class="category-chip' + activeClass + '" data-value="' + cat + '">' + label + '</button>';
    }).join('');

    adminCategoryFilterBar.querySelectorAll('.category-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        adminCategoryFilter = chip.dataset.value;
        adminCategoryFilterBar.querySelectorAll('.category-chip').forEach(function (c) {
          c.classList.toggle('active', c.dataset.value === adminCategoryFilter);
        });
        applyAdminFilters();
      });
    });
  }

  adminSearchInput.addEventListener('input', applyAdminFilters);

  renderAdminTable();
});