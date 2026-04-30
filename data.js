// ═══════════════════════════════════════════
// DATA — loaded from Supabase, fallback local
// ═══════════════════════════════════════════
let products = [
  {id:1, name:"Linen Blazer",          price:385, img:"https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600",  cat:"Women",      tags:["New","Summer"]},
  {id:2, name:"Silk Midi Dress",        price:420, img:"https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600",  cat:"Women",      tags:["Evening"]},
  {id:3, name:"Cashmere Sweater",       price:295, img:"https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600",  cat:"Men",        tags:["Minimalist"]},
  {id:4, name:"Leather Tote",           price:340, img:"https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600",  cat:"Accessories",tags:["New"]},
  {id:5, name:"Wool Overcoat",          price:680, img:"https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600",  cat:"Men",        tags:["Statement"]},
  {id:6, name:"Cotton Shirt Dress",     price:245, img:"https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600",  cat:"Women",      tags:["Summer","New"]},
  {id:7, name:"Denim Jacket",           price:198, img:"https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=600",  cat:"Women",      tags:["Minimalist"]},
  {id:8, name:"Wide-Leg Trousers",      price:265, img:"https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600",  cat:"Women",      tags:["New","Statement"]},
  {id:9, name:"Structured Turtleneck",  price:175, img:"https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600",  cat:"Men",        tags:["Minimalist","New"]},
  {id:10,name:"Floral Wrap Skirt",      price:195, img:"https://images.unsplash.com/photo-1583496661160-fb5218afa3e8?w=600",  cat:"Women",      tags:["Summer","New"]},
  {id:11,name:"Tailored Suit Jacket",   price:520, img:"https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600",  cat:"Men",        tags:["Statement","New"]},
  {id:12,name:"Silk Scarf",             price:125, img:"https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600",  cat:"Accessories",tags:["Summer","New"]},
  {id:13,name:"Pleated Midi Skirt",     price:235, img:"https://images.unsplash.com/photo-1592301933927-35b597393c0a?w=600",  cat:"Women",      tags:["Evening","Statement"]},
  {id:14,name:"Linen Trousers",         price:210, img:"https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600",  cat:"Men",        tags:["Summer","Minimalist"]},
  {id:15,name:"Leather Belt Bag",       price:285, img:"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600",  cat:"Accessories",tags:["New","Statement"]},
  {id:16,name:"Broderie Anglaise Top",  price:155, img:"https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=600",  cat:"Women",      tags:["Summer"]},
  {id:17,name:"Roll-Neck Knit",         price:220, img:"https://images.unsplash.com/photo-1614975059251-992f11792b9f?w=600",  cat:"Women",      tags:["Minimalist"]},
  {id:18,name:"Slim Chino",             price:185, img:"https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600",  cat:"Men",        tags:["Minimalist","New"]},
];

// Map Supabase row → app product format
function mapProduct(row) {
  return {
    id:   row.id,
    name: row.name,
    price:row.price,
    img:  row.image,
    cat:  row.category,
    tags: row.tags || [],
    desc: row.description || ''
  };
}

// Load products from Supabase (runs on page load)
async function loadProductsFromSupabase() {
  // Skip if credentials not set yet
  if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    console.log('ℹ️ Supabase not connected yet — using local data');
    return;
  }
  try {
    showLoadingSpinner(true);
    const rows = await sb.get('products');
    if (rows && rows.length > 0) {
      products = rows.map(mapProduct);
      console.log(`✅ Loaded ${products.length} products from Supabase`);
      // Re-render whatever is on screen
      renderGrid('homeGrid', products.slice(0,8));
      renderGrid('shopGrid', products);
      renderGrid('newGrid', products);
    }
  } catch (err) {
    console.warn('⚠️ Supabase load failed, using local data:', err.message);
  } finally {
    showLoadingSpinner(false);
  }
}

// Save order to Supabase
async function saveOrderToSupabase(orderData) {
  if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) return null;
  try {
    const result = await sb.post('orders', orderData);
    console.log('✅ Order saved:', result);
    return result;
  } catch (err) {
    console.warn('⚠️ Order save failed:', err.message);
    return null;
  }
}

// Add product to Supabase (Admin)
async function saveProductToSupabase(product) {
  if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) return null;
  try {
    const result = await sb.post('products', {
      name: product.name,
      price: product.price,
      image: product.img,
      category: product.cat,
      tags: product.tags,
      description: product.desc || ''
    });
    return result;
  } catch (err) {
    console.warn('⚠️ Product save failed:', err.message);
    return null;
  }
}

// Loading spinner
function showLoadingSpinner(show) {
  let spinner = document.getElementById('sb-spinner');
  if (!spinner) {
    spinner = document.createElement('div');
    spinner.id = 'sb-spinner';
    spinner.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(245,240,232,.85);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        z-index:99999;backdrop-filter:blur(4px);">
        <div style="width:40px;height:40px;border:2px solid var(--border);
          border-top-color:var(--accent);border-radius:50%;
          animation:spin .8s linear infinite;"></div>
        <p style="margin-top:18px;font-family:var(--fd);font-size:18px;
          color:var(--muted);letter-spacing:2px;">Loading...</p>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(spinner);
  }
  spinner.style.display = show ? 'block' : 'none';
}

let cart=[], wishlist=[], curFilter='All', curPM=null, selSz='S';