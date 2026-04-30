// ═══════════════════════════════════════════
// INIT — Load from Supabase then render
// ═══════════════════════════════════════════
(async () => {
  initEmailJS(); // Initialize EmailJS
  // Render with local data immediately (fast)
  renderGrid('homeGrid', products.slice(0,8));
  renderGrid('shopGrid', products);
  renderGrid('newGrid',  products);
  updateCart();
  updateWish();

  // Then try to load live data from Supabase
  await loadProductsFromSupabase();
})();