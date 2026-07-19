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

// ══════════════════════════════════════
//  LOMITOS PERSONALIZADOS (líneas propias)
// ══════════════════════════════════════

function getLomitosCart() {
  try { return JSON.parse(localStorage.getItem('kape_cart_lomitos')) || []; }
  catch { return []; }
}

function saveLomitosCart(lineas) {
  localStorage.setItem('kape_cart_lomitos', JSON.stringify(lineas));
}

function agregarLomitoAlCarrito(producto, salsas, toppings) {
  const lineas = getLomitosCart();

  const clave = JSON.stringify({
    nombre: producto.nombre,
    size: producto.tamano || '',
    salsas: salsas.map(s => s.nombre).sort(),
    toppings: toppings.map(t => t.nombre).sort()
  });

  const existente = lineas.find(l => l.clave === clave);

  if (existente) {
    existente.qty += 1;
  } else {
    const precioTotal = producto.precio
      + salsas.reduce((s, x) => s + x.precio, 0)
      + toppings.reduce((s, x) => s + x.precio, 0);

    lineas.push({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      clave,
      nombre: producto.nombre,
      size: producto.tamano || '',
      precioUnitario: precioTotal,
      salsas,
      toppings,
      qty: 1
    });
  }

  saveLomitosCart(lineas);
  updateCartUI();
}

function changeQtyLomito(id, delta) {
  if (delta > 0 && !tiendaAbierta) {
    showToast(proximaApertura ? `Cerrado. Abrimos: ${proximaApertura}` : 'Estamos cerrados en este momento 🕐');
    return;
  }

  let lineas = getLomitosCart();
  const linea = lineas.find(l => l.id === id);
  if (!linea) return;

  linea.qty = Math.max(0, linea.qty + delta);
  if (linea.qty === 0) {
    lineas = lineas.filter(l => l.id !== id);
  }

  saveLomitosCart(lineas);
  updateCartUI();
}

function removeLomitoLine(id) {
  const lineas = getLomitosCart().filter(l => l.id !== id);
  saveLomitosCart(lineas);
  updateCartUI();
}

function changeQty(btn, delta) {
  if (delta > 0 && !tiendaAbierta) {
    showToast(proximaApertura ? `Cerrado. Abrimos: ${proximaApertura}` : 'Estamos cerrados en este momento 🕐');
    return;
  }

  const qtyEl    = btn.parentElement;
  const countEl  = qtyEl.querySelector('.qty__count');
  const name     = qtyEl.dataset.name;
  const size     = qtyEl.dataset.size;
  const price    = parseInt(qtyEl.dataset.price);
  const categoria = qtyEl.dataset.categoria || '';
  const cart     = getCart();

  let current = parseInt(countEl.textContent) || 0;
  current = Math.max(0, current + delta);
  countEl.textContent = current;

  if (current === 0) {
    delete cart[name];
  } else {
    cart[name] = { name, size, price, qty: current, categoria };
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
  const cart        = getCart();
  const items       = Object.values(cart);
  const lineasLomito = getLomitosCart();

  const totalItems   = items.reduce((s, i) => s + i.price * i.qty, 0);
  const totalLomitos = lineasLomito.reduce((s, l) => s + l.precioUnitario * l.qty, 0);
  const total        = totalItems + totalLomitos;

  const countItems   = items.reduce((s, i) => s + i.qty, 0);
  const countLomitos = lineasLomito.reduce((s, l) => s + l.qty, 0);
  const count        = countItems + countLomitos;

  const badge   = document.getElementById('cartBadge');
  const totalEl = document.getElementById('cartTotal');
  const drawerEl= document.getElementById('drawerItems');
  const drawerT = document.getElementById('drawerTotal');
  const cartBtn = document.querySelector('.cart-btn');
  
  if (totalEl) totalEl.textContent = formatPrice(total);
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  }
  if (drawerT) drawerT.textContent = formatPrice(total);


  // sincroniza contadores visuales (para bebidas, postres, salsas, toppings sueltos)
  document.querySelectorAll('.qty').forEach(el => {
    const n = el.dataset.name;
    const c = el.querySelector('.qty__count');
    if (c) c.textContent = cart[n] ? cart[n].qty : 0;
  });

  if (!drawerEl) return;

  if (count === 0) {
    drawerEl.innerHTML = '<p class="drawer__empty">Tu carrito está vacío.</p>';
    return;
  }

  const htmlLomitos = lineasLomito.map(l => {
    const salsasTexto   = l.salsas.length ? `Salsas: ${l.salsas.map(s => s.nombre).join(', ')}` : '';
    const toppingsTexto = l.toppings.length ? `Toppings: ${l.toppings.map(t => t.nombre).join(', ')}` : '';
    return `
      <div class="drawer-item">
        <div class="drawer-item__info">
          <span class="drawer-item__name">${l.qty}× ${l.nombre}</span>
          <span class="drawer-item__size">${l.size}</span>
          ${salsasTexto ? `<span class="drawer-item__extras">${salsasTexto}</span>` : ''}
          ${toppingsTexto ? `<span class="drawer-item__extras">${toppingsTexto}</span>` : ''}
        </div>
        <span class="drawer-item__price">${formatPrice(l.precioUnitario * l.qty)}</span>
        <button class="drawer-item__remove" onclick="removeLomitoLine('${l.id}')">✕</button>
      </div>
    `;
  }).join('');

  const htmlItems = items.map(i => `
    <div class="drawer-item">
      <div class="drawer-item__info">
        <span class="drawer-item__name">${i.qty}× ${i.name}</span>
        <span class="drawer-item__size">${i.size}</span>
      </div>
      <span class="drawer-item__price">${formatPrice(i.price * i.qty)}</span>
      <button class="drawer-item__remove" onclick="removeItem('${i.name}')">✕</button>
    </div>
  `).join('');

  drawerEl.innerHTML = htmlLomitos + htmlItems;
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
    overlay.onclick = () => cerrarZoom(true);
    overlay.innerHTML = '<img id="zoomImg" src="" alt="Zoom" />';
    document.body.appendChild(overlay);
  }
  document.getElementById('zoomImg').src = src;
  overlay.classList.add('open');

  history.pushState({ zoom: true }, '');
}

function cerrarZoom(desdeClick) {
  const overlay = document.getElementById('zoomOverlay');
  if (!overlay || !overlay.classList.contains('open')) return;

  overlay.classList.remove('open');

  // Si se cerró tocando afuera (no con el botón atrás),
  // "gastamos" la entrada del historial que agregamos al abrir.
  if (desdeClick) history.back();
}

window.addEventListener('popstate', () => {
  cerrarZoom(false);
});

function handleCheckout() {
  if (!tiendaAbierta) {
    showToast(proximaApertura ? `Cerrado. Abrimos: ${proximaApertura}` : 'Estamos cerrados en este momento 🕐');
    return;
  }

  const items = Object.values(getCart());
  const lineasLomito = getLomitosCart();

  if (items.length === 0 && lineasLomito.length === 0) {
    showToast('Tu carrito está vacío');
    return;
  }

  const path = decodeURIComponent(window.location.pathname);
  const enSubpagina = path.includes('/subPáginas/');
  const rutaDatos = enSubpagina ? '../datos/datos.html' : 'datos/datos.html';

  window.location.href = rutaDatos;
}

// ── VERIFICAR SI LA TIENDA ESTÁ ABIERTA ──
let tiendaAbierta = true;
let proximaApertura = '';

async function verificarHorario() {
  const ahora = new Date();
  const diaSemana = ahora.getDay();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

  const { data, error } = await db.from('horarios').select('*').order('dia_semana');

  if (error || !data || !data.length) {
    tiendaAbierta = true;
    return;
  }

  const enRango = (apertura, cierre, minutos) => {
    if (!apertura || !cierre) return false;
    const [ha, ma] = apertura.split(':').map(Number);
    const [hc, mc] = cierre.split(':').map(Number);
    return minutos >= (ha * 60 + ma) && minutos < (hc * 60 + mc);
  };

  const hoy = data.find(h => h.dia_semana === diaSemana);

  if (hoy && !hoy.cerrado) {
    tiendaAbierta = enRango(hoy.apertura1, hoy.cierre1, horaActual) || enRango(hoy.apertura2, hoy.cierre2, horaActual);
  } else {
    tiendaAbierta = false;
  }

  if (!tiendaAbierta) {
    proximaApertura = calcularProximaApertura(data, diaSemana, horaActual);
  }
}

function calcularProximaApertura(horarios, diaActual, minutosActuales) {
  const NOMBRES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  for (let i = 0; i < 8; i++) {
    const dia = (diaActual + i) % 7;
    const h = horarios.find(x => x.dia_semana === dia);
    if (!h || h.cerrado) continue;

    const turnos = [h.apertura1, h.apertura2].filter(Boolean);
    for (const turno of turnos) {
      const [hh, mm] = turno.split(':').map(Number);
      const minTurno = hh * 60 + mm;
      const turnoCorto = turno.slice(0, 5);

      if (i === 0 && minTurno <= minutosActuales) continue;

      if (i === 0) return `Hoy a las ${turnoCorto}`;
      if (i === 1) return `Mañana a las ${turnoCorto}`;
      return `El ${NOMBRES[dia]} a las ${turnoCorto}`;
    }
  }

  return '';
}

// ── MOSTRAR CARTEL DE CERRADO (si corresponde) ──
function mostrarCartelCerrado() {
  if (tiendaAbierta) return;

  const lista = document.getElementById('productosList');
  if (lista) {
    const cartel = document.createElement('div');
    cartel.className = 'cerrado-msg';
    cartel.innerHTML = `
      🕐 Estamos cerrados en este momento. No podés agregar productos, pero podés ver el menú.
      ${proximaApertura ? `<br><strong>Abrimos: ${proximaApertura}</strong>` : ''}
    `;
    lista.parentNode.insertBefore(cartel, lista);
  }

  document.querySelectorAll('.qty__btn.add, .lomito-add-btn').forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '.3';
    btn.style.cursor = 'not-allowed';
  });
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

document.addEventListener('DOMContentLoaded', async () => {
  await verificarHorario();
  mostrarCartelCerrado();
  updateCartUI();
});

function mostrarErrorCritico() {
  document.getElementById('errorBanner').classList.add('visible');
}

window.addEventListener('error', mostrarErrorCritico);
window.addEventListener('unhandledrejection', mostrarErrorCritico);