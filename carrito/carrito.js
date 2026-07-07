// ══════════════════════════════════════
//  carrito.js — carrito compartido Kapé
//  Se incluye en TODAS las páginas
// ══════════════════════════════════════

function getCart() {
  try { return JSON.parse(localStorage.getItem('kape_cart')) || {}; }
  catch { return {}; }
}

function saveCart(cart) {
  localStorage.setItem('kape_cart', JSON.stringify(cart));
}

function changeQty(btn, delta) {
  const qtyEl   = btn.parentElement;
  const countEl = qtyEl.querySelector('.qty__count');
  const name    = qtyEl.dataset.name;
  const size    = qtyEl.dataset.size;
  const price   = parseInt(qtyEl.dataset.price);
  const cart    = getCart();

  let current = parseInt(countEl.textContent) || 0;
  current = Math.max(0, current + delta);
  countEl.textContent = current;

  if (current === 0) {
    delete cart[name];
  } else {
    cart[name] = { name, size, price, qty: current };
    if (delta > 0) showToast(`<span>${name}</span> agregado`);
  }

  saveCart(cart);
  updateCartUI();
}

function removeItem(key) {
  const cart = getCart();
  delete cart[key];
  saveCart(cart);
  document.querySelectorAll('.qty').forEach(el => {
    if (el.dataset.name === key)
      el.querySelector('.qty__count').textContent = '0';
  });
  updateCartUI();
}

function updateCartUI() {
  const cart    = getCart();
  const items   = Object.values(cart);
  const total   = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count   = items.reduce((s, i) => s + i.qty, 0);

  const badge   = document.getElementById('cartBadge');
  const totalEl = document.getElementById('cartTotal');
  const drawerEl= document.getElementById('drawerItems');
  const drawerT = document.getElementById('drawerTotal');
  const cartBtn = document.querySelector('.cart-btn');

  if (cartBtn) cartBtn.classList.toggle('visible', count > 0);

  if (totalEl) totalEl.textContent = formatPrice(total);
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  }
  if (drawerT) drawerT.textContent = formatPrice(total);

  // sincroniza contadores visuales
  document.querySelectorAll('.qty').forEach(el => {
    const n = el.dataset.name;
    const c = el.querySelector('.qty__count');
    if (c) c.textContent = cart[n] ? cart[n].qty : 0;
  });

  if (!drawerEl) return;

  if (items.length === 0) {
    drawerEl.innerHTML = '<p class="drawer__empty">Tu carrito está vacío.</p>';
    return;
  }

  drawerEl.innerHTML = items.map(i => `
    <div class="drawer-item">
      <div class="drawer-item__info">
        <span class="drawer-item__name">${i.qty}× ${i.name}</span>
        <span class="drawer-item__size">${i.size}</span>
      </div>
      <span class="drawer-item__price">${formatPrice(i.price * i.qty)}</span>
      <button class="drawer-item__remove" onclick="removeItem('${i.name}')">✕</button>
    </div>
  `).join('');
}

function toggleDrawer() {
  const d    = document.getElementById('drawer');
  const o    = document.getElementById('overlay');
  if (!d || !o) return;
  const open = d.classList.toggle('open');
  o.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

function zoomImagen(src) {
  let overlay = document.getElementById('zoomOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'zoomOverlay';
    overlay.className = 'zoom-overlay';
    overlay.onclick = () => overlay.classList.remove('open');
    overlay.innerHTML = '<img id="zoomImg" src="" alt="Zoom" />';
    document.body.appendChild(overlay);
  }
  document.getElementById('zoomImg').src = src;
  overlay.classList.add('open');
}

function handleCheckout() {
  const items = Object.values(getCart());
  if (items.length === 0) {
    showToast('Tu carrito está vacío');
    return;
  }

  const path = decodeURIComponent(window.location.pathname);
  const enSubpagina = path.includes('/subPáginas/');
  const rutaDatos = enSubpagina ? '../datos/datos.html' : 'datos/datos.html';

  window.location.href = rutaDatos;
}

let toastTimer;
function showToast(html) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = html;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

function formatPrice(n) {
  return '$' + n.toLocaleString('es-AR');
}

document.addEventListener('DOMContentLoaded', updateCartUI);