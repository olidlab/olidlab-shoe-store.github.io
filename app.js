/* OLIDLAB — Static storefront preview. No orders or payment processing. */
(() => {
  'use strict';
  const products = window.OLIDLAB_PRODUCTS || [];
  const config = window.OLIDLAB_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const money = (n) => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(n);
  const escapeHTML = (str) => String(str).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const safeStorage = {
    get(key, fallback) { try { let value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
  };
  let bag = safeStorage.get('olidlab-bag-v1', []);
  let favorites = safeStorage.get('olidlab-faves-v1', []);
  if (!Array.isArray(bag)) bag = [];
  if (!Array.isArray(favorites)) favorites = [];
  let currentProduct = null;
  let currentSize = null;
  let activeCat = 'All';
  let showFavorites = false;
  let toastTimer;
  const FALLBACK = 'assets/shoe-fallback.svg';
  document.addEventListener('error', e => {
    if (e.target && e.target.tagName === 'IMG' && !e.target.dataset.fallbackApplied) {
      e.target.dataset.fallbackApplied = 'true';
      e.target.src = FALLBACK;
      e.target.style.mixBlendMode = 'normal';
    }
  }, true);
  function notify(message) {
    const t = $('toast'); t.textContent = message; t.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 2900);
  }
  function renderProducts() {
    const search = $('searchInput').value.trim().toLowerCase();
    const audience = $('audienceFilter').value;
    const sort = $('sortSelect').value;
    const matches = products.filter(p => (!showFavorites || favorites.includes(p.id)) && (activeCat === 'All' || p.category === activeCat) && (audience === 'All' || p.audience === audience || (p.audience === 'Unisex' && (audience === 'Men' || audience === 'Women'))) && (`${p.name} ${p.brand} ${p.color} ${p.category}`.toLowerCase().includes(search)));
    const sorted = [...matches].sort((a,b) => sort === 'priceAsc' ? a.price - b.price : sort === 'priceDesc' ? b.price - a.price : sort === 'brand' ? a.brand.localeCompare(b.brand) : a.id - b.id);
    $('resultsText').textContent = `Showing ${sorted.length} of ${products.length} styles`;
    $('productTotal').textContent = products.length;
    $('emptyState').hidden = sorted.length !== 0;
    $('productsGrid').innerHTML = sorted.map(p => `<article class="product-card">
        <div class="product-media" role="button" tabindex="0" data-open="${p.id}" aria-label="View ${escapeHTML(p.brand)} ${escapeHTML(p.name)} details">
          <span class="product-badge">${escapeHTML(p.badge)}</span>
          <button class="heart-btn" aria-label="${favorites.includes(p.id)?'Remove from':'Add to'} favorites: ${escapeHTML(p.name)}" aria-pressed="${favorites.includes(p.id)}" data-fav="${p.id}">${favorites.includes(p.id)?'♥':'♡'}</button>
          <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.brand)} ${escapeHTML(p.name)} in ${escapeHTML(p.color)}" loading="lazy" referrerpolicy="no-referrer" />
        </div>
        <div class="product-info"><div class="product-brand">${escapeHTML(p.brand)} · ${escapeHTML(p.audience)}</div><h3 class="product-name">${escapeHTML(p.name)}</h3><div class="product-color">${escapeHTML(p.color)}</div><div class="product-price-row"><strong class="product-price">${money(p.price)}</strong><span class="price-type">${p.verified ? 'RETAIL REFERENCE' : 'ESTIMATED REFERENCE'}</span></div><div class="product-actions"><button class="quick-btn" data-open="${p.id}">QUICK VIEW & ADD +</button><a class="source-btn" href="${escapeHTML(p.source)}" target="_blank" rel="noopener noreferrer" title="View original product source" aria-label="View ${escapeHTML(p.name)} at source">↗</a></div></div>
      </article>`).join('');
  }
  function setCategory(cat) {
    activeCat = cat;
    document.querySelectorAll('[data-cat]').forEach(el => {let selected = el.dataset.cat === cat;el.classList.toggle('active',selected);el.setAttribute('aria-pressed', String(selected));});
    renderProducts();
  }
  function resetFilters() {
    $('searchInput').value=''; $('audienceFilter').value='All'; $('sortSelect').value='featured'; showFavorites = false; $('favoritesOnly').classList.remove('is-active'); $('favoritesOnly').setAttribute('aria-pressed','false'); setCategory('All');
  }
  function openModal(id) {
    let p = products.find(x=>x.id===Number(id)); if(!p)return;
    currentProduct = p; currentSize = null;
    $('modalImage').dataset.fallbackApplied = '';
    $('modalImage').src = p.image;
    $('modalImage').alt = `${p.brand} ${p.name} - ${p.color}`;
    $('modalBrand').textContent = `${p.brand} / ${p.category} / ${p.audience}`.toUpperCase();
    $('modalTitle').textContent = p.name;
    $('modalDesc').textContent = p.description;
    $('modalPrice').textContent = money(p.price);
    $('modalPriceNote').textContent = p.verified ? 'Observed third-party US retail price · subject to change' : 'Indicative USD estimate only · not retailer-verified';
    $('modalSource').href = p.source;
    $('modalSizes').innerHTML = p.sizes.map(n=>`<button type="button" class="size-btn" data-size="${n}" aria-pressed="false">${n}</button>`).join('');
    $('modalBackdrop').hidden = false; document.body.style.overflow='hidden';
    $('modalClose').focus();
  }
  function closeModal() { $('modalBackdrop').hidden = true; document.body.style.overflow=''; currentProduct=null; }
  function saveBag() {safeStorage.set('olidlab-bag-v1',bag);renderBag();}
  function addToBag() {
    if(!currentProduct)return;
    if(currentSize === null) {notify('Please select a US shoe size first.');return;}
    let existing = bag.find(x=>x.id===currentProduct.id && String(x.size)===String(currentSize));
    if(existing) existing.qty = Math.min(99,existing.qty+1);
    else bag.push({id:currentProduct.id,size:currentSize,qty:1});
    saveBag(); closeModal(); openCart(); notify('Added to your demo bag.');
  }
  function renderBag() {
    bag=bag.filter(x=>products.some(p=>p.id===x.id) && Number(x.qty)>0);
    const qty=bag.reduce((sum,x)=>sum+x.qty,0);
    $('bagCount').textContent=qty;
    $('cartQtyTitle').textContent=`(${qty})`;
    $('cartRequest').disabled=qty===0;
    $('cartRequest').style.opacity=qty ? '1' : '.45';
    if(!bag.length) $('cartItems').innerHTML='<div class="cart-empty"><span>◌</span><strong>YOUR BAG IS EMPTY</strong><p>Find a style you love and add it to your demo selection.</p></div>';
    else $('cartItems').innerHTML=bag.map((x,index)=>{let p=products.find(y=>y.id===x.id);return `<div class="cart-item"><img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" referrerpolicy="no-referrer"/><div><h4>${escapeHTML(p.brand)} ${escapeHTML(p.name)}</h4><p>US ${x.size} · ${escapeHTML(p.color)}</p><div class="qty-controls"><button aria-label="Decrease quantity" data-change="${index}" data-delta="-1">−</button><span>${x.qty}</span><button aria-label="Increase quantity" data-change="${index}" data-delta="1">+</button></div><button class="remove-btn" data-remove="${index}">Remove</button></div><span class="cart-item-price">${money(p.price*x.qty)}</span></div>`}).join('');
    $('cartTotal').textContent=money(bag.reduce((sum,x)=>sum+(products.find(p=>p.id===x.id)?.price||0)*x.qty,0));
  }
  function openCart(){closeModal();$('overlay').hidden=false;$('cartDrawer').classList.add('open');$('cartDrawer').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';$('cartClose').focus();}
  function closeCart(){$('overlay').hidden=true;$('cartDrawer').classList.remove('open');$('cartDrawer').setAttribute('aria-hidden','true');document.body.style.overflow='';}
  async function copyInquiry() {
    const lines=['OLIDLAB — Product inquiry (demo only)','Fictional contact +1 (202) 555-0147 is NOT connected.','These are third-party references; OLIDLAB has not confirmed stock/pricing.',''];
    bag.forEach(x=>{let p=products.find(y=>y.id===x.id);lines.push(`${x.qty} × ${p.brand} ${p.name} · US ${x.size} · ${money(p.price)} each (${p.verified?'retail reference':'estimate'})\nSource: ${p.source}`)});
    lines.push('',`Estimated item total: ${$('cartTotal').textContent}`,'Contact the actual retailer to verify price, stock and delivery.');
    const content=lines.join('\n');
    try {if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(content); else {const el=document.createElement('textarea');el.value=content;el.style.position='fixed';el.style.opacity='0';document.body.appendChild(el);el.select();document.execCommand('copy');el.remove();}$('copyStatus').textContent='Inquiry copied. Paste it into your message.';notify('Inquiry copied to clipboard.');} catch {$('copyStatus').textContent='Copy unavailable; please try a secure HTTPS page.';}
  }
  document.querySelector('#categoryTabs').addEventListener('click',e=>{const tab=e.target.closest('[data-cat]');if(tab)setCategory(tab.dataset.cat);});
  ['searchInput','audienceFilter','sortSelect'].forEach(id => $(id).addEventListener(id==='searchInput'?'input':'change',renderProducts));
  $('favoritesOnly').addEventListener('click',()=>{showFavorites=!showFavorites;$('favoritesOnly').classList.toggle('is-active',showFavorites);$('favoritesOnly').setAttribute('aria-pressed',String(showFavorites));renderProducts();});
  $('resetFilters').addEventListener('click',resetFilters);$('emptyReset').addEventListener('click',resetFilters);
  $('searchFocus').addEventListener('click',()=>{$('shop').scrollIntoView();setTimeout(()=>$('searchInput').focus(),300);});
  $('productsGrid').addEventListener('click',e=>{
    const fav=e.target.closest('[data-fav]');if(fav){let id=Number(fav.dataset.fav);favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];safeStorage.set('olidlab-faves-v1',favorites);renderProducts();notify(favorites.includes(id)?'Added to favorites.':'Removed from favorites.');return;}
    const open=e.target.closest('[data-open]');if(open)openModal(open.dataset.open);
  });
  $('productsGrid').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.product-media')){e.preventDefault();openModal(e.target.dataset.open);}});
  document.querySelectorAll('[data-collection]').forEach(el=>el.addEventListener('click',()=>setCategory(el.dataset.collection)));
  $('modalSizes').addEventListener('click',e=>{let el=e.target.closest('[data-size]');if(!el)return;currentSize=Number(el.dataset.size);document.querySelectorAll('.size-btn').forEach(b=>{let active=b===el;b.classList.toggle('active',active);b.setAttribute('aria-pressed', String(active));});});
  $('addFromModal').addEventListener('click',addToBag);
  $('modalClose').addEventListener('click',closeModal);
  $('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal();});
  $('cartOpen').addEventListener('click',openCart);$('cartClose').addEventListener('click',closeCart);$('overlay').addEventListener('click',closeCart);
  $('cartItems').addEventListener('click',e=>{let rm=e.target.closest('[data-remove]');if(rm){bag.splice(Number(rm.dataset.remove),1);saveBag();return;}let change=e.target.closest('[data-change]');if(change){let i=Number(change.dataset.change);bag[i].qty=Math.max(0,Math.min(99,bag[i].qty+Number(change.dataset.delta)));if(!bag[i].qty)bag.splice(i,1);saveBag();}});
  $('cartRequest').addEventListener('click',copyInquiry);
  $('menuToggle').addEventListener('click',()=>{let n=$('mobileNav');n.hidden=!n.hidden;$('menuToggle').setAttribute('aria-expanded',String(!n.hidden));});
  document.querySelectorAll('.mobile-nav a').forEach(a=>a.addEventListener('click',()=>{$('mobileNav').hidden=true;$('menuToggle').setAttribute('aria-expanded','false');}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('modalBackdrop').hidden)closeModal();if($('cartDrawer').classList.contains('open'))closeCart();}});
  const phone=(config.advisorPhone||'').trim();
  if(phone){$('supportNumber').textContent=phone;$('phoneDisclosure').textContent=config.demoPhone ? 'DEMO CONTACT · FICTIONAL NUMBER, NOT ACTIVE' : 'Business support line · verify availability before publishing.';}
  else {$('supportNumber').textContent='COMING SOON';}
  $('contactButton').addEventListener('click',()=>notify('Demo phone only. Add your real support number in store-config.js before launching.'));
  $('footerPolicies').addEventListener('click',()=>notify('Demo preview: no live orders, payment processing, shipping or published return policy.'));
  renderProducts();renderBag();
})();
