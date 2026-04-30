// ═══════════════════════════════════════════
// OTP VERIFICATION SYSTEM
// ═══════════════════════════════════════════
let otpGenerated = '';
let otpTimerInterval = null;
let otpVerified = false;

function startCheckout() {
  if(cart.length === 0){ showToast('❌ Your cart is empty'); return; }
  if(otpVerified) {
    // Already verified this session — go straight to checkout
    toggleCO();
    return;
  }
  // Show OTP modal
  showOTPStep(1);
  openModal('otp');
}

function showOTPStep(step) {
  document.getElementById('otpStep1').style.display = step===1 ? 'block' : 'none';
  document.getElementById('otpStep2').style.display = step===2 ? 'block' : 'none';
  document.getElementById('otpStep3').style.display = step===3 ? 'block' : 'none';
}

function otpBoxInput(el, index) {
  el.classList.toggle('filled', el.value !== '');
  // Auto move to next box
  if(el.value && index < 5) {
    document.querySelectorAll('.otp-box')[index + 1].focus();
  }
}

function otpBoxKey(el, index, e) {
  // On backspace move to previous box
  if(e.key === 'Backspace' && !el.value && index > 0) {
    document.querySelectorAll('.otp-box')[index - 1].focus();
  }
}

function getOTPBoxValue() {
  return Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
}

function clearOTPBoxes() {
  document.querySelectorAll('.otp-box').forEach(b => { b.value=''; b.classList.remove('filled'); });
}

async function sendOTP() {
  const phone = document.getElementById('otpPhone').value.trim();
  const code  = document.getElementById('otpCountryCode').value;
  const errEl = document.getElementById('otpPhoneError');

  if(phone.replace(/\D/g,'').length < 10){
    errEl.style.display = 'block'; return;
  }
  errEl.style.display = 'none';

  // Generate 6-digit OTP
  otpGenerated = Math.floor(100000 + Math.random() * 900000).toString();
  const fullPhone = code + phone.replace(/\D/g,'');

  showToast('Sending OTP...');

  // Send SMS via Fast2SMS (India) or log in console for testing
  const smsSent = await sendSMSOTP(fullPhone, otpGenerated);

  if(smsSent || FAST2SMS_API_KEY.includes('YOUR_FAST2SMS_KEY')) {
    // Show OTP in console for testing (remove in production)
    if(FAST2SMS_API_KEY.includes('YOUR_FAST2SMS_KEY')) {
      console.log(`🔐 OTP for testing: ${otpGenerated}`);
      showToast(`📱 Test OTP: ${otpGenerated} (check console)`);
    } else {
      showToast(`✓ OTP sent to ${code} ${phone}`);
    }
    document.getElementById('otpSentMsg').textContent = `OTP sent to ${code} ${phone}`;
    showOTPStep(2);
    clearOTPBoxes();
    document.getElementById('otpError').style.display = 'none';
    startOTPTimer(60);
    // Focus first box
    setTimeout(() => document.querySelectorAll('.otp-box')[0].focus(), 100);
  } else {
    showToast('❌ Failed to send OTP. Try again.');
  }
}

async function sendSMSOTP(phone, otp) {
  if(FAST2SMS_API_KEY.includes('YOUR_FAST2SMS_KEY')) return false;
  try {
    const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_API_KEY}&variables_values=${otp}&route=otp&numbers=${phone.replace('+91','')}`, {
      method: 'GET',
      headers: {'cache-control': 'no-cache'}
    });
    const data = await res.json();
    return data.return === true;
  } catch(e) {
    console.warn('SMS error:', e);
    return false;
  }
}

function startOTPTimer(seconds) {
  clearInterval(otpTimerInterval);
  let remaining = seconds;
  const timerEl = document.getElementById('otpTimer');
  timerEl.textContent = remaining + 's';
  otpTimerInterval = setInterval(() => {
    remaining--;
    timerEl.textContent = remaining + 's';
    if(remaining <= 0) {
      clearInterval(otpTimerInterval);
      timerEl.textContent = 'Expired';
      timerEl.style.color = '#c0392b';
    }
  }, 1000);
}

function verifyOTP() {
  const entered = getOTPBoxValue();
  if(entered.length < 6){ showToast('❌ Enter all 6 digits'); return; }

  if(entered === otpGenerated) {
    clearInterval(otpTimerInterval);
    document.getElementById('otpError').style.display = 'none';
    showOTPStep(3);
    otpVerified = true;
    showToast('✅ Number verified!');
    // Auto proceed to checkout after 1.5s
    setTimeout(() => {
      closeModal('otp');
      toggleCO();
    }, 1500);
  } else {
    document.getElementById('otpError').style.display = 'block';
    // Shake the boxes
    document.querySelectorAll('.otp-box').forEach(b => {
      b.style.borderColor = '#c0392b';
      b.style.animation = 'shake .3s ease';
      setTimeout(() => { b.style.borderColor=''; b.style.animation=''; }, 400);
    });
    clearOTPBoxes();
    document.querySelectorAll('.otp-box')[0].focus();
  }
}

function resendOTP() {
  const timerEl = document.getElementById('otpTimer');
  if(timerEl.textContent !== 'Expired' && timerEl.textContent !== '0s') {
    showToast('⚠️ Please wait before resending');
    return;
  }
  otpGenerated = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`🔐 Resent OTP: ${otpGenerated}`);
  showToast('✓ OTP resent!');
  clearOTPBoxes();
  timerEl.style.color = 'var(--accent)';
  startOTPTimer(60);
}

// ═══════════════════════════════════════════
// EMAIL NOTIFICATIONS (EmailJS)
// ═══════════════════════════════════════════
function initEmailJS() {
  if(!EMAILJS_PUBLIC_KEY.includes('YOUR_PUBLIC_KEY') && typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }
}

async function sendOrderConfirmationEmail(orderData) {
  if(EMAILJS_SERVICE_ID.includes('YOUR_SERVICE_ID')) {
    console.log('📧 EmailJS not configured yet. Order email would go to:', orderData.user_email);
    return;
  }
  if(typeof emailjs === 'undefined') { console.warn('EmailJS not loaded'); return; }

  const itemsList = orderData.items.map(i =>
    `${i.qty}x ${i.name} (${i.size||'S'}) — ₹${(i.price*i.qty).toFixed(2)}`
  ).join('\n');

  const templateParams = {
    to_email:       orderData.user_email,
    to_name:        orderData.shipping_address.name,
    order_id:       orderData.order_id || 'N/A',
    order_items:    itemsList,
    order_total:    '₹' + orderData.total.toFixed(2),
    payment_method: orderData.payment_method,
    order_status:   orderData.payment_method === 'COD' ? 'Confirmed — Pay on Delivery' : '✅ Payment Received',
    shipping_addr:  `${orderData.shipping_address.address}, ${orderData.shipping_address.city}, ${orderData.shipping_address.postal}, ${orderData.shipping_address.country}`,
    payment_id:     orderData.payment_id || 'N/A',
    shop_name:      'RANGLOOP',
    shop_email:     'hello@rangloop.com',
  };

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    console.log('📧 Order confirmation email sent to:', orderData.user_email);
  } catch(err) {
    console.warn('📧 Email send failed:', err);
  }
}

// ═══════════════════════════════════════════
// SMS ORDER NOTIFICATION (Fast2SMS)
// ═══════════════════════════════════════════
async function sendOrderSMSNotification(orderData) {
  if(FAST2SMS_API_KEY.includes('YOUR_FAST2SMS_KEY')) {
    console.log('📱 SMS not configured. Would send to:', orderData.shipping_address.phone);
    return;
  }
  const phone = orderData.shipping_address.phone.replace(/\D/g,'').slice(-10);
  const msg = `RANGLOOP: Your order #${orderData.order_id} of Rs.${orderData.total.toFixed(2)} via ${orderData.payment_method} is confirmed! Delivery in 5-7 days. Thank you!`;
  try {
    await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_API_KEY}&sender_id=FSTSMS&message=${encodeURIComponent(msg)}&language=english&route=p&numbers=${phone}`, {
      method:'GET', headers:{'cache-control':'no-cache'}
    });
    console.log('📱 Order SMS sent to:', phone);
  } catch(e) {
    console.warn('SMS notification failed:', e);
  }
}