// ═══════════════════════════════════════════
// PAGE NAVIGATION
// ═══════════════════════════════════════════
const pageMap={
  home:'homePage', shop:'shopPage', collections:'collectionsPage',
  new:'newPage', editorial:'editorialPage', about:'aboutPage',
  sustain:'sustainPage', contact:'contactPage', sizeguide:'sizePage',
  shipping:'shippingPage', returns:'returnsPage', journal:'journalPage',
};

function showPage(p){
  document.querySelectorAll('.page').forEach(s=>s.classList.remove('active'));
  const id=pageMap[p];
  if(id) document.getElementById(id).classList.add('active');
  if(p==='home') renderGrid('homeGrid',products.slice(0,8));
  if(p==='shop'||p==='new'){
    const gridId=p==='shop'?'shopGrid':'newGrid';
    renderGrid(gridId,products);
    document.querySelectorAll('.f-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
    curFilter='All';
  }
  window.scrollTo(0,0);
}

function filterAndGo(tag){
  showPage('shop');
  // slight delay so shop page renders first
  setTimeout(()=>{
    curFilter=tag;
    const list=products.filter(p=>p.cat===tag||p.tags.includes(tag));
    renderGrid('shopGrid',list);
    document.querySelectorAll('.f-btn').forEach(b=>{
      const match=b.textContent.trim();
      b.classList.toggle('active',
        match===tag||(tag==='All'&&match==='All')||
        (tag==='Summer'&&match==='All')||(tag==='Evening'&&match==='All')||
        (tag==='Minimalist'&&match==='All')||(tag==='Statement'&&match==='All')||
        (tag==='New'&&match==='New Arrivals')||
        (tag==='Women'&&match==='Women')||
        (tag==='Men'&&match==='Men')||
        (tag==='Accessories'&&match==='Accessories')
      );
    });
  },50);
}
let hsIdx=0, hsDur=5000, hsTimer=null, hsProgTimer=null, hsProg=0;

function startSlider(){
  clearTimeout(hsTimer); clearInterval(hsProgTimer);
  hsProg=0; document.getElementById('hsBar').style.width='0%';
  hsProgTimer=setInterval(()=>{
    hsProg+=100/(hsDur/100);
    if(hsProg>100)hsProg=100;
    document.getElementById('hsBar').style.width=hsProg+'%';
  },100);
  hsTimer=setTimeout(()=>heroSlide(1),hsDur);
}

function goSlide(i){
  const slides=document.querySelectorAll('.hero-slide');
  const dots=document.querySelectorAll('.hs-dot');
  slides[hsIdx].classList.remove('active');
  dots[hsIdx].classList.remove('active');
  hsIdx=(i+slides.length)%slides.length;
  slides[hsIdx].classList.add('active');
  dots[hsIdx].classList.add('active');
  document.getElementById('hsNum').textContent=String(hsIdx+1).padStart(2,'0');
  startSlider();
}
function heroSlide(d){goSlide(hsIdx+d);}

const sl=document.getElementById('heroSlider');
sl.addEventListener('mouseenter',()=>{clearTimeout(hsTimer);clearInterval(hsProgTimer);});
sl.addEventListener('mouseleave',startSlider);
let txStart=0;
sl.addEventListener('touchstart',e=>{txStart=e.touches[0].clientX;},{passive:true});
sl.addEventListener('touchend',e=>{const d=txStart-e.changedTouches[0].clientX;if(Math.abs(d)>50)heroSlide(d>0?1:-1);});
startSlider();

// ═══════════════════════════════════════════
// RENDER PRODUCTS
// ═══════════════════════════════════════════
function renderGrid(id,list){
  const g=document.getElementById(id);
  if(!g)return;
  g.innerHTML=list.map(p=>`
    <div class="card">
      <div class="card-img">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        <button class="wish-btn${wishlist.some(w=>w.id===p.id)?' active':''}" onclick="toggleWish(${p.id},event)">
          ${wishlist.some(w=>w.id===p.id)?'♥':'♡'}
        </button>
        <div class="card-overlay">
          <button class="qv-btn" onclick="openPM(${p.id},event)">Quick View</button>
          <button class="atc-btn" onclick="addCart(${p.id},event)">Add to Bag</button>
        </div>
      </div>
      <div class="card-info">
        <h3>${p.name}</h3>
        <div class="price"><strong>$${p.price}</strong></div>
      </div>
    </div>`).join('');
}

function filterProducts(f,btn){
  curFilter=f;
  if(btn){
    document.querySelectorAll('.f-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }
  const list=f==='All'?products:products.filter(p=>p.cat===f||p.tags.includes(f));
  const shopActive=document.getElementById('shopPage').classList.contains('active');
  const newActive=document.getElementById('newPage').classList.contains('active');
  // Always render both grids so filters work when switching pages
  renderGrid('shopGrid',list);
  renderGrid('newGrid',list);
  // Home grid shows all new arrivals unfiltered
  if(document.getElementById('homePage').classList.contains('active')){
    renderGrid('homeGrid',products.slice(0,8));
  }
}

// ═══════════════════════════════════════════
// PRODUCT MODAL
// ═══════════════════════════════════════════
function openPM(id,e){
  if(e)e.stopPropagation();
  const p=products.find(x=>x.id===id);
  if(!p)return;
  curPM=p;
  document.getElementById('pmName').textContent=p.name;
  document.getElementById('pmPrice').textContent='$'+p.price;
  document.getElementById('pmMain').src=p.img;
  document.getElementById('pmThumbs').innerHTML=
    ['?w=600','?w=600&q=70','?w=400','?w=600&fit=crop'].map((s,i)=>
      `<img src="${p.img}${s}" class="pm-thumb${i===0?' active':''}" onclick="changePMImg('${p.img}${s}',this)">`
    ).join('');
  const inW=wishlist.some(w=>w.id===p.id);
  document.getElementById('pmWishBtn').textContent=inW?'♥ Remove from Wishlist':'♡ Add to Wishlist';
  document.querySelectorAll('.sz-opt').forEach((b,i)=>b.classList.toggle('active',i===1));
  selSz='S';
  document.getElementById('productModal').classList.add('open');
  document.body.style.overflow='hidden';
}
function closePM(){
  document.getElementById('productModal').classList.remove('open');
  document.body.style.overflow='';
  curPM=null;
}
function changePMImg(src,thumb){
  document.getElementById('pmMain').src=src;
  document.querySelectorAll('.pm-thumb').forEach(t=>t.classList.remove('active'));
  thumb.classList.add('active');
}
function selSize(btn){
  document.querySelectorAll('.sz-opt').forEach(s=>s.classList.remove('active'));
  btn.classList.add('active');
  selSz=btn.textContent.trim();
}
function pmAddCart(){if(curPM){addCart(curPM.id);closePM();}}
function pmToggleWish(){
  if(!curPM)return;
  toggleWish(curPM.id);
  const inW=wishlist.some(w=>w.id===curPM.id);
  document.getElementById('pmWishBtn').textContent=inW?'♥ Remove from Wishlist':'♡ Add to Wishlist';
}

// ═══════════════════════════════════════════
// CART
// ═══════════════════════════════════════════
function addCart(id,e){
  if(e)e.stopPropagation();
  const p=products.find(x=>x.id===id);
  if(!p)return;
  const ex=cart.find(i=>i.id===id);
  if(ex)ex.qty++;
  else cart.push({...p,qty:1,size:selSz});
  updateCart();
  showToast(p.name+' added to bag');
}
function rmCart(id){cart=cart.filter(i=>i.id!==id);updateCart();}
function updQty(id,d){
  const item=cart.find(i=>i.id===id);
  if(!item)return;
  item.qty+=d;
  if(item.qty<=0)rmCart(id);
  else updateCart();
}
function updateCart(){
  const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
  document.getElementById('cartCount').textContent=cart.reduce((s,i)=>s+i.qty,0);
  document.getElementById('cartTotal').textContent='$'+total;
  document.getElementById('cartItems').innerHTML=cart.length===0
    ?`<div class="empty"><div class="eico">🛍️</div><p>Your bag is empty</p></div>`
    :cart.map(item=>`
      <div class="cart-item">
        <img src="${item.img}" class="ci-img" alt="${item.name}">
        <div class="ci-info">
          <h4>${item.name}</h4>
          <div class="ci-price">$${item.price} · Size ${item.size||'S'}</div>
          <div class="qty-row">
            <button class="qty-btn" onclick="updQty(${item.id},-1)">−</button>
            <span class="qty-n">${item.qty}</span>
            <button class="qty-btn" onclick="updQty(${item.id},1)">+</button>
          </div>
        </div>
        <button class="rm-btn" onclick="rmCart(${item.id})">Remove</button>
      </div>`).join('');
}

// ═══════════════════════════════════════════
// WISHLIST
// ═══════════════════════════════════════════
function toggleWish(id,e){
  if(e)e.stopPropagation();
  const p=products.find(x=>x.id===id);
  if(!p)return;
  const idx=wishlist.findIndex(w=>w.id===id);
  if(idx>-1){wishlist.splice(idx,1);showToast(p.name+' removed from wishlist');}
  else{wishlist.push(p);showToast(p.name+' added to wishlist');}
  updateWish();
  const home=document.getElementById('homePage').classList.contains('active');
  const shop=document.getElementById('shopPage').classList.contains('active');
  const nw=document.getElementById('newPage').classList.contains('active');
  if(home)renderGrid('homeGrid',products.slice(0,8));
  if(shop)filterProducts(curFilter);
  if(nw)renderGrid('newGrid',products);
}
function updateWish(){
  document.getElementById('wishCount').textContent=wishlist.length;
  document.getElementById('wishItems').innerHTML=wishlist.length===0
    ?`<div class="empty"><div class="eico">♡</div><p>No items saved</p></div>`
    :wishlist.map(item=>`
      <div class="wish-item">
        <span>${item.name} — $${item.price}</span>
        <button onclick="toggleWish(${item.id})">×</button>
      </div>`).join('');
}