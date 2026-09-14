// search.js — logic for the search page (search.html)
// (shared navigation is handled in script.js)

document.addEventListener('DOMContentLoaded', function () {
  const input = document.getElementById('pageSearchInput');
  const filterBar = document.getElementById('searchCategoryFilter');
  const grid = document.getElementById('searchResultsGrid');

  let activeCategory = 'all';

  // Allow the page to open with a preset URL query, e.g. search.html?q=shirt
  const presetQuery = new URLSearchParams(window.location.search).get('q');
  if (presetQuery) input.value = presetQuery;

  renderCategoryBar();
  renderResults();

  input.addEventListener('input', renderResults);

  function renderCategoryBar() {
    const categories = ['all'].concat(Object.keys(CATEGORY_COLORS));
    filterBar.innerHTML = categories.map(function (cat) {
      const label = cat === 'all' ? 'All' : cat;
      const activeClass = cat === activeCategory ? ' active' : '';
      return '<button type="button" class="category-chip' + activeClass + '" data-value="' + cat + '">' + label + '</button>';
    }).join('');

    filterBar.querySelectorAll('.category-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        activeCategory = chip.dataset.value;
        filterBar.querySelectorAll('.category-chip').forEach(function (c) {
          c.classList.toggle('active', c.dataset.value === activeCategory);
        });
        renderResults();
      });
    });
  }

  function renderResults() {
    // Search only products that are not hidden by the admin
    const allProducts = getProducts().filter(function (p) { return !p.hidden; });
    const savedIds = getSavedIds();
    const q = removeVietnameseTones(input.value.trim());

    const results = allProducts.filter(function (p) {
      const name = removeVietnameseTones(p.name + ' ' + (p.category || 'Other'));
      const matchesSearch = !q || name.includes(q);
      const matchesCategory = activeCategory === 'all' || (p.category || 'Other') === activeCategory;
      return matchesSearch && matchesCategory;
    });

    if (allProducts.length === 0) {
      grid.innerHTML =
        '<p class="empty-state">No products have been posted yet. Visit ' +
        '<a href="index.html" style="color:#3572EF;">Home</a> to see what is available!</p>';
      return;
    }

    if (results.length === 0) {
      grid.innerHTML = '<p class="empty-state">No matching products found. Try a different search term.</p>';
      return;
    }

    grid.innerHTML = results.map(function (p) {
      return renderProductCard(p, savedIds.includes(p.id));
    }).join('');

    grid.querySelectorAll('.save-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const isNowSaved = toggleSavedProduct(btn.dataset.id);
        btn.classList.toggle('saved', isNowSaved);
        btn.textContent = isNowSaved ? '★ Saved' : '☆ Save product';
      });
    });
  }
});