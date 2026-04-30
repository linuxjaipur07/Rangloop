// ═══════════════════════════════════════════
// CHECKOUT
// ═══════════════════════════════════════════
// CHECKOUT — Complete Razorpay Integration
// ═══════════════════════════════════════════
let checkoutData = {shipping:null, payment:null};

function toggleCO(){ document.getElementById('coWrap').classList.toggle('show'); }

function switchCO(tab, el) {
  document.querySelectorAll('.co-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.co-form').forEach(f => f.classList.remove('active'));
  el.classList.add('active');
  const m = {shipping:'coShipping', payment:'coPayment', review:'coReview'};
  if(m[tab]) document.getElementById(m[tab]).classList.add('active');
  if(tab === 'review') buildReview();
}

function validateShipping() {
  const f = id => document.getElementById(id).value.trim();
  const name=f('coName'), email=f('coEmail'), phone=f('coPhone'),
        address=f('coAddress'), city=f('coCity'), postal=f('coPostal'),
        country=document.getElementById('coCountry').value;
  if(!name||!email||!phone||!address||!city||!postal||!country){showToast('❌ Please fill all fields');return;}
  if(!email.includes('@')){showToast('❌ Invalid email address');return;}
  if(phone.replace(/\D/g,'').length<10){showToast('❌ Invalid phone number');return;}
  checkoutData.shipping = {name,email,phone,address,city,postal,country};
  showToast('✓ Shipping details saved');
  switchCO('payment', document.querySelectorAll('.co-tab')[1]);
}

function selectPaymentMethod(el, method) {
  document.querySelectorAll('.pay-opt').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  checkoutData.payment = method;
  const show = id => document.getElementById(id).style.display = 'block';
  const hide = id => document.getElementById(id).style.display = 'none';
  ['razorpayInfo','upiFields','codNote'].forEach(hide);
  if(method==='Razorpay') show('razorpayInfo');
  if(method==='UPI')      show('upiFields');
  if(method==='COD') {
    show('codNote');
    const t = cart.reduce((s,i)=>s+(i.price*i.qty),0);
    document.getElementById('codTotal').textContent = '₹'+t.toFixed(2);
  }
  // Update confirm button label
  const btn = document.getElementById('confirmBtn');
  if(btn) {
    const labels = {
      Razorpay: '🔒 Pay Now via Razorpay',
      UPI:      '🔵 Pay via UPI',
      COD:      '🚚 Confirm COD Order'
    };
    btn.textContent = labels[method] || 'Confirm Order';
  }
}

function validatePayment() {
  if(!checkoutData.payment){showToast('❌ Select a payment method');return;}
  if(checkoutData.payment === 'UPI') {
    const upiId = document.getElementById('coUPIID').value.trim();
    if(!upiId||!upiId.includes('@')||upiId.split('@').length!==2){showToast('❌ Invalid UPI ID (use: name@bank)');return;}
    const [u,b] = upiId.split('@');
    if(u.length<3||b.length<3){showToast('❌ UPI ID too short');return;}
  }
  showToast('✓ Payment method confirmed');
  switchCO('review', document.querySelectorAll('.co-tab')[2]);
}

function buildReview() {
  const {shipping, payment} = checkoutData;
  if(!shipping) return;
  document.getElementById('reviewAddress').innerHTML =
    `<strong>${shipping.name}</strong><br>${shipping.address}<br>${shipping.city}, ${shipping.postal}<br>${shipping.country}<br><small style="color:var(--muted)">📧 ${shipping.email} &nbsp;|&nbsp; 📱 ${shipping.phone}</small>`;
  document.getElementById('reviewItems').innerHTML =
    cart.map(i=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(14,13,12,.06)">
      <span>${i.qty}× ${i.name} <small style="color:var(--muted)">(${i.size||'S'})</small></span>
      <strong>₹${(i.price*i.qty).toFixed(2)}</strong></div>`).join('');
  const pm = {Razorpay:'💳 Card / UPI / Wallet (Razorpay)', UPI:'🔵 UPI Direct', COD:'🚚 Cash on Delivery'}[payment];
  document.getElementById('reviewPayment').innerHTML = pm||payment;
  document.getElementById('reviewTotal').textContent = '₹'+cart.reduce((s,i)=>s+(i.price*i.qty),0).toFixed(2);
}

async function confirmOrder() {
  if(!document.getElementById('coTerms').checked){showToast('❌ Please accept Terms & Conditions');return;}
  if(!checkoutData.shipping||!checkoutData.payment||cart.length===0){showToast('❌ Complete all steps first');return;}
  if(checkoutData.payment==='COD'){
    await processCODOrder();
  } else if(checkoutData.payment==='UPI'){
    openRazorpay('upi');
  } else if(checkoutData.payment==='Razorpay'){
    openRazorpay('all');
  }
}

// ── RAZORPAY ──────────────────────────────────────────────────────────────
function openRazorpay(mode) {
  if(RAZORPAY_KEY.includes('YOUR_KEY_HERE')){
    showToast('⚠️ Add your Razorpay Key ID first!');
    return;
  }
  const total   = cart.reduce((s,i)=>s+(i.price*i.qty),0);
  const paise   = Math.round(total * 100);
  const {shipping} = checkoutData;

  const options = {
    key:         RAZORPAY_KEY,
    amount:      paise,
    currency:    'INR',
    name:        'RANGLOOP',
    description: `Order — ${cart.length} item(s)`,
    prefill:     {name:shipping.name, email:shipping.email, contact:shipping.phone},
    theme:       {color:'#c9783c'},
    config: mode==='upi' ? {
      display:{
        blocks:{upi:{name:'Pay via UPI',instruments:[{method:'upi'}]}},
        sequence:['block.upi'],
        preferences:{show_default_blocks:false}
      }
    } : {},
    handler: async function(response) {
      const pid = response.razorpay_payment_id;
      showToast('✅ Payment received! Saving order...');
      const saved = await saveOrderToSupabase({
        user_email:       shipping.email,
        items:            cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty,size:i.size||'S'})),
        total:            total,
        shipping_address: shipping,
        payment_method:   checkoutData.payment,
        payment_id:       pid,
        status:           'paid'
      });
      const oid = saved && saved[0] ? saved[0].id : 'N/A';
      finishOrder(oid, shipping.email, total, checkoutData.payment, pid);
    },
    modal: {
      ondismiss: () => showToast('⚠️ Payment cancelled — your cart is saved.')
    }
  };

  const rzp = new Razorpay(options);
  rzp.on('payment.failed', r => {
    showToast('❌ Payment failed: '+r.error.description);
  });
  rzp.open();
}

// ── COD ───────────────────────────────────────────────────────────────────
async function processCODOrder() {
  showToast('Placing your COD order...');
  const total = cart.reduce((s,i)=>s+(i.price*i.qty),0);
  const saved = await saveOrderToSupabase({
    user_email:       checkoutData.shipping.email,
    items:            cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty,size:i.size||'S'})),
    total:            total,
    shipping_address: checkoutData.shipping,
    payment_method:   'COD',
    status:           'confirmed'
  });
  const oid = saved && saved[0] ? saved[0].id : 'N/A';
  finishOrder(oid, checkoutData.shipping.email, total, 'COD', null);
}

// ── FINISH — clear cart + send notifications + show confirmation ──────────
async function finishOrder(orderId, email, total, method, paymentId) {
  // Prepare full order data for notifications
  const notifData = {
    order_id:         orderId,
    user_email:       email,
    items:            cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty,size:i.size||'S'})),
    total:            total,
    payment_method:   method,
    payment_id:       paymentId,
    shipping_address: checkoutData.shipping || {}
  };

  // Send notifications in background (don't await — don't block UI)
  sendOrderConfirmationEmail(notifData);
  sendOrderSMSNotification(notifData);

  // Reset OTP for next order
  otpVerified = false;

  cart=[]; checkoutData={shipping:null,payment:null}; updateCart();
  showOrderConfirmation(orderId, email, total, method, paymentId);
  setTimeout(()=>{
    closeDrawer('cart');
    document.getElementById('coWrap').classList.remove('show');
    resetCheckoutForm();
  }, 3500);
}

// ── ORDER CONFIRMATION MODAL ───────────────────────────────────────────────
function showOrderConfirmation(orderId, email, total, method, paymentId) {
  const emap   = {Razorpay:'💳', UPI:'🔵', COD:'🚚'};
  const emoji  = emap[method]||'✅';
  const isPaid = method !== 'COD';
  const stColor= isPaid ? '#2d6a4f' : '#c9783c';
  const stLabel= isPaid ? '✅ Payment Received' : '🕐 Pay on Delivery';

  const modal = document.createElement('div');
  modal.id = 'orderConfirmModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(14,13,12,.88);backdrop-filter:blur(8px);display:flex;justify-content:center;align-items:center;z-index:10000;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--cream);border-radius:8px;padding:36px;max-width:500px;width:100%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.35);animation:slideUp .4s ease;max-height:90vh;overflow-y:auto;">
      <div style="width:68px;height:68px;background:${stColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 18px;animation:popIn .5s ease;">✅</div>
      <h2 style="font-family:var(--fd);font-size:36px;font-weight:300;margin-bottom:6px;">Order Confirmed!</h2>
      <p style="font-size:13px;color:var(--muted);margin-bottom:24px;">Thank you for shopping with RANGLOOP</p>

      <div style="background:var(--warm);padding:20px;border-radius:6px;margin-bottom:18px;text-align:left;font-size:13px;line-height:2;">
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Order ID</span><strong style="font-family:monospace;color:var(--accent);">#${orderId}</strong></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Email</span><span style="font-size:11px;text-align:right;max-width:60%;">${email}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Amount</span><strong style="color:var(--accent);">₹${total.toFixed(2)}</strong></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Payment</span><strong>${emoji} ${method}</strong></div>
        <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid rgba(14,13,12,.1);margin-top:6px;"><span style="color:var(--muted);">Status</span><strong style="color:${stColor};">${stLabel}</strong></div>
        ${paymentId ? `<div style="padding-top:10px;border-top:1px solid rgba(14,13,12,.1);margin-top:6px;font-size:11px;"><span style="color:var(--muted);display:block;margin-bottom:4px;">Transaction ID</span><code style="font-family:monospace;color:var(--ink);word-break:break-all;font-size:10px;">${paymentId}</code></div>` : ''}
      </div>

      <div style="background:rgba(201,120,60,.08);padding:14px;border-radius:6px;margin-bottom:20px;font-size:12px;line-height:1.8;color:var(--muted);text-align:left;">
        <p>📧 Confirmation sent to <strong style="color:var(--ink);">${email}</strong></p>
        <p>🚚 Delivery in <strong style="color:var(--ink);">5–7 business days</strong></p>
        <p>📱 Track order in your account</p>
      </div>

      <button onclick="closeOrderConfirmation()" style="width:100%;padding:13px;background:var(--ink);color:var(--cream);border:none;border-radius:4px;font-family:var(--fb);font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;">
        Continue Shopping
      </button>
    </div>
    <style>
      @keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
      @keyframes popIn{0%{transform:scale(0)}70%{transform:scale(1.1)}100%{transform:scale(1)}}
    </style>`;
  document.body.appendChild(modal);
}

function closeOrderConfirmation() {
  const m = document.getElementById('orderConfirmModal');
  if(m) m.remove();
  showPage('home');
}

function resetCheckoutForm() {
  // Clear all form fields
  ['coName','coEmail','coPhone','coAddress','coCity','coPostal','coCountry','coUPIID'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const terms=document.getElementById('coTerms'); if(terms) terms.checked=false;
  // Reset tabs and forms
  document.querySelectorAll('.co-tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  document.querySelectorAll('.co-form').forEach((f,i)=>f.classList.toggle('active',i===0));
  document.querySelectorAll('.pay-opt').forEach((p,i)=>p.classList.toggle('active',i===0));
  // Reset confirm button
  const btn=document.getElementById('confirmBtn');
  if(btn){btn.textContent='Confirm & Place Order';btn.style.background='';}
  // Reset payment field visibility
  ['razorpayInfo','upiFields','codNote'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display = id==='razorpayInfo'?'block':'none';
  });
  // Clear OTP boxes and reset OTP state
  clearOTPBoxes();
  showOTPStep(1);
  const otpPhoneEl = document.getElementById('otpPhone');
  if(otpPhoneEl) otpPhoneEl.value='';
  otpGenerated=''; otpVerified=false;
  clearInterval(otpTimerInterval);
  checkoutData={shipping:null,payment:null};
}

function selPay(el){document.querySelectorAll('.pay-opt').forEach(m=>m.classList.remove('active'));el.classList.add('active');}
function placeOrder(){confirmOrder();}

// ═══════════════════════════════════════════
// DRAWERS
// ═══════════════════════════════════════════
function openDrawer(t){
  document.getElementById(t==='cart'?'cartDrawer':'wishDrawer').classList.add('active');
  document.getElementById('overlay').classList.add('show');
  document.body.style.overflow='hidden';
}
function closeDrawer(t){
  document.getElementById(t==='cart'?'cartDrawer':'wishDrawer').classList.remove('active');
  document.getElementById('overlay').classList.remove('show');
  document.body.style.overflow='';
}
function closeAllDrawers(){
  document.querySelectorAll('.drawer').forEach(d=>d.classList.remove('active'));
  document.getElementById('overlay').classList.remove('show');
  document.body.style.overflow='';
}

// ═══════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════
function openModal(t){document.getElementById(t+'Modal').classList.add('open');}
function closeModal(t){document.getElementById(t+'Modal').classList.remove('open');}

// ═══════════════════════════════════════════
// SEARCH — fully working
// ═══════════════════════════════════════════
function openSearch(){
  document.getElementById('searchOverlay').classList.add('open');
  document.body.style.overflow='hidden';
  setTimeout(()=>document.getElementById('searchInput').focus(),80);
}
function closeSearch(){
  document.getElementById('searchOverlay').classList.remove('open');
  document.body.style.overflow='';
  document.getElementById('searchInput').value='';
  document.getElementById('sClear').style.display='none';
  resetSResults();
}
function resetSResults(){
  document.getElementById('sResults').innerHTML=`
    <div class="s-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.2" opacity=".3"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
      <p>Start typing to search</p>
    </div>`;
}
function clearSearch(){
  document.getElementById('searchInput').value='';
  document.getElementById('sClear').style.display='none';
  resetSResults();
  document.getElementById('searchInput').focus();
}
function quickSearch(q){
  document.getElementById('searchInput').value=q;
  runSearch(q);
}
function runSearch(q){
  q=q.trim();
  document.getElementById('sClear').style.display=q?'block':'none';
  if(!q){resetSResults();return;}
  const ql=q.toLowerCase();
  const matched=products.filter(p=>
    p.name.toLowerCase().includes(ql)||
    p.cat.toLowerCase().includes(ql)||
    p.tags.some(t=>t.toLowerCase().includes(ql))
  );
  if(!matched.length){
    document.getElementById('sResults').innerHTML=`<div class="s-noresult">No results for "<em>${q}</em>"</div>`;
    return;
  }
  document.getElementById('sResults').innerHTML=matched.map(p=>`
    <div class="s-item" onclick="openFromSearch(${p.id})">
      <img src="${p.img}" class="s-item-img" alt="${p.name}">
      <div class="s-item-info">
        <div class="s-item-cat">${p.cat} · ${p.tags[0]}</div>
        <div class="s-item-name">${highlight(p.name,q)}</div>
        <div class="s-item-price">$${p.price}</div>
      </div>
      <button class="s-item-btn" onclick="cartFromSearch(${p.id},event)">Add to Bag</button>
    </div>`).join('');
}
function highlight(text,q){
  const re=new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return text.replace(re,'<em style="color:var(--accent);font-style:italic">$1</em>');
}
function openFromSearch(id){closeSearch();showPage('shop');setTimeout(()=>openPM(id),180);}
function cartFromSearch(id,e){e.stopPropagation();addCart(id);closeSearch();}

// ═══════════════════════════════════════════
// GALLERY LIGHTBOX
// ═══════════════════════════════════════════
const lbImgs=[
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200',
  'https://images.unsplash.com/photo-1558769132-cb1aea3c8565?w=1200',
  'https://images.unsplash.com/photo-1560243563-062bfc001d68?w=1200',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200',
];
let lbIdx=0;
function openLightbox(i){
  lbIdx=i;
  document.getElementById('lbImg').src=lbImgs[i];
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeLightbox(){
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow='';
}
function closeLb(e){if(e.target===document.getElementById('lightbox'))closeLightbox();}
function lbNav(d,e){
  e.stopPropagation();
  lbIdx=(lbIdx+d+lbImgs.length)%lbImgs.length;
  const img=document.getElementById('lbImg');
  img.style.opacity='0';
  setTimeout(()=>{img.src=lbImgs[lbIdx];img.style.opacity='1';},150);
}

// ═══════════════════════════════════════════
// SIZE GUIDE TABS
// ═══════════════════════════════════════════
function switchSzTab(tab,el){
  document.querySelectorAll('.sg-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.sg-tbl-wrap').forEach(w=>w.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(tab==='women'?'womenSz':'menSz').classList.add('active');
}

// ═══════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════
function toggleFaq(el){el.classList.toggle('open');}

// ═══════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2600);
}
function toggleMobileNav(){document.getElementById('mobileNav').classList.toggle('open');}

// Global keyboard
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closePM();closeModal('login');closeModal('otp');closeAllDrawers();closeSearch();closeLightbox();}
  if(document.getElementById('lightbox').classList.contains('open')){
    if(e.key==='ArrowLeft')lbNav(-1,e);
    if(e.key==='ArrowRight')lbNav(1,e);
  } else {
    if(e.key==='ArrowLeft')heroSlide(-1);
    if(e.key==='ArrowRight')heroSlide(1);
  }
});

// ═══════════════════════════════════════════
// ADMIN (triple-click logo)
// ═══════════════════════════════════════════
let lClicks=0,lTimer=null;
document.getElementById('logoEl').addEventListener('click',()=>{
  lClicks++;clearTimeout(lTimer);
  lTimer=setTimeout(()=>lClicks=0,900);
  if(lClicks===3){
    const p=document.getElementById('adminPanel');
    p.style.display=p.style.display==='block'?'none':'block';
    lClicks=0;
  }
});
async function addProduct(){
  const name = document.getElementById('aName').value.trim();
  const price = parseInt(document.getElementById('aPrice').value);
  const img   = document.getElementById('aImg').value.trim();
  const cat   = document.getElementById('aCat')?.value || 'Women';
  if(!name||!price||!img){showToast('Fill all fields');return;}

  const newProduct = {id: Date.now(), name, price, img, cat, tags:['New'], desc:''};

  // Save to Supabase first
  showToast('Saving product...');
  const saved = await saveProductToSupabase(newProduct);
  if (saved && saved[0]) {
    // Use Supabase-assigned ID
    newProduct.id = saved[0].id;
    showToast('Product saved to Supabase! ✓');
  } else {
    showToast('Product added locally!');
  }

  products.push(newProduct);
  document.getElementById('aName').value  = '';
  document.getElementById('aPrice').value = '';
  document.getElementById('aImg').value   = '';
  renderGrid('homeGrid', products.slice(0,8));
  renderGrid('shopGrid', products);
  renderGrid('newGrid', products);
}