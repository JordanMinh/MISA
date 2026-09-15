document.addEventListener('DOMContentLoaded', async function(){
  await MISA.ready; const input=document.getElementById('pageSearchInput'), bar=document.getElementById('searchCategoryFilter'), grid=document.getElementById('searchResultsGrid'); let active='all';
  const preset=new URLSearchParams(location.search).get('q'); if(preset)input.value=preset;
  function render(){const q=MISA.removeVietnameseTones(input.value.trim());const products=MISA.getProducts().filter(p=>!p.hidden).filter(p=>(!q||MISA.removeVietnameseTones(p.name+' '+p.category).includes(q))&&(active==='all'||MISA.normalizeCategory(p.category)===active));grid.innerHTML=products.length?products.map(p=>MISA.renderProductCard(p,MISA.getSavedIds().includes(p.id))).join(''):'<p class="empty-state">No matching products found.</p>';}
  function renderBar(){bar.innerHTML=['all',...Object.keys(MISA.CATEGORY_COLORS)].map(c=>`<button type="button" class="category-chip${c===active?' active':''}" data-value="${c}">${c==='all'?'All':c}</button>`).join('');bar.querySelectorAll('.category-chip').forEach(b=>b.onclick=()=>{active=b.dataset.value;renderBar();render();});}
  input.addEventListener('input',render); renderBar(); render();
});
