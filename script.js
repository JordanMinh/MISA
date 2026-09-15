(function () {
  'use strict';
  const routes={choose1:'index.html',choose2:'search.html',choose3:'saved.html'};
  async function goAdmin(){
    try{
      if(window.MISA && typeof MISA.isAdmin==='function' && await MISA.isAdmin()){
        location.assign('upload.html'); return;
      }
    }catch(err){console.warn('MISA admin check failed; opening login.',err);}
    location.assign('login.html');
  }
  document.addEventListener('click',function(e){
    const label=e.target.closest('#navbody label[for]');
    if(!label)return;
    const id=label.getAttribute('for');
    if(!routes[id] && id!=='choose4')return;
    e.preventDefault(); e.stopPropagation();
    const radio=document.getElementById(id); if(radio)radio.checked=true;
    id==='choose4' ? goAdmin() : location.assign(routes[id]);
  },true);
  document.addEventListener('DOMContentLoaded',function(){
    if(window.MISA && typeof MISA.renderHomeFeed==='function') MISA.renderHomeFeed();
  });
})();