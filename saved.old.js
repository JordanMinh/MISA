// saved.js — logic for saved.html
// (shared navigation is handled in script.js)

document.addEventListener('DOMContentLoaded', function () {
  renderSaved();

  function renderSaved() {
    const grid = document.getElementById('savedGrid');
    const products = getProducts();
    const savedIds = getSavedIds();
    const savedProducts = products.filter(function (p) {
      return savedIds.includes(p.id) && !p.hidden;
    });

    if (savedProducts.length === 0) {
      grid.innerHTML =
        '<p class="empty-state">You have not saved any products yet. Visit ' +
        '<a href="upload.html" style="color:#3572EF;">Add Product</a> to discover and save products.</p>';
      return;
    }

    grid.innerHTML = savedProducts.map(function (p) {
      return renderProductCard(p, true, true);
    }).join('');

    grid.querySelectorAll('.save-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleSavedProduct(btn.dataset.id);
        renderSaved();
      });
    });
  }
});