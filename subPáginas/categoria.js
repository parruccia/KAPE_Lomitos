// ── Obtener el slug desde la URL ──
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

let categoriaActual = null;
let productoActual = null;
let salsasDisponibles = [];
let toppingsDisponibles = [];
let cantidadesSalsas = {};
let precioSalsaActual = 0;
let precioToppingActual = 0;

// ── Cargar la categoría (nombre, personalizable) y sus productos ──
async function cargarCategoria() {
  if (!slug) {
    document.getElementById('categoriaNombre').textContent = 'Categoría no encontrada';
    document.getElementById('loadingMsg').style.display = 'none';
    return;
  }

  const { data: categoria, error: errorCat } = await db
    .from('categorias')
    .select('*')
    .eq('slug', slug)
    .single();

  if (errorCat || !categoria) {
    document.getElementById('categoriaNombre').textContent = 'Categoría no encontrada';
    document.getElementById('loadingMsg').textContent = 'Esta categoría ya no existe.';
    return;
  }

  categoriaActual = categoria;
  document.getElementById('categoriaNombre').textContent = categoria.nombre;
  document.getElementById('pageTitle').textContent = `${categoria.nombre} — KAPÉ`;

  if (categoria.personalizable) {
    await cargarOpciones();
  }

  cargarProductos();
}

// ── Cargar salsas y toppings disponibles (solo si hace falta) ──
let todasLasCategoriasCache = [];

async function cargarOpciones() {
  const { data, error } = await db
    .from('productos')
    .select('*')
    .in('categoria', ['salsas', 'toppings'])
    .eq('activo', true)
    .order('orden');

  if (!error && data) {
    salsasDisponibles   = data.filter(p => p.categoria === 'salsas');
    toppingsDisponibles = data.filter(p => p.categoria === 'toppings');
  }

  const { data: cats } = await db.from('categorias').select('*');
  if (cats) todasLasCategoriasCache = cats;
}

// ── Carga productos desde Supabase y los renderiza ──
async function cargarProductos() {
  const { data, error } = await db
    .from('productos')
    .select('*')
    .eq('categoria', slug)
    .eq('activo', true)
    .order('orden');

  const lista   = document.getElementById('productosList');
  const loading = document.getElementById('loadingMsg');

  loading.style.display = 'none';

  if (slug === 'promociones') {
    const linkLomitos = document.createElement('a');
    linkLomitos.href = 'categoria.html?slug=lomitos';
    linkLomitos.className = 'ver-lomitos-link';
    linkLomitos.textContent = 'Ver Lomitos por separado →';
    lista.parentNode.insertBefore(linkLomitos, lista);
  }

  if (error || !data.length) {
    lista.innerHTML = '<p class="loading-msg">No hay productos disponibles.</p>';
    return;
  }

  const esPersonalizable = categoriaActual && categoriaActual.personalizable;

  lista.innerHTML = data.map(p => `
    <article class="product">
      <div class="product__img-wrap">
        ${p.imagen
          ? `<img src="${p.imagen}" alt="${p.nombre}" class="product__img" loading="lazy" style="cursor:zoom-in" onclick="zoomImagen('${p.imagen}')" />`
          : `<div class="product__img product__img--placeholder">K</div>`
        }
      </div>
      <div class="product__info">
        <div>
          <span class="product__name">${p.nombre}</span>
          ${p.tamano ? `<span class="product__size">${p.tamano}</span>` : ''}
        </div>
        ${p.descripcion ? `<p class="product__desc">${p.descripcion}</p>` : ''}
        <span class="product__price">${formatPrice(p.precio)}</span>
      </div>
      ${esPersonalizable ? `
        <button class="qty__btn add lomito-add-btn" onclick='abrirPersonalizar(${JSON.stringify(p)})'>＋</button>
      ` : `
        <div class="qty" data-name="${p.nombre}" data-size="${p.tamano || ''}" data-price="${p.precio}" data-categoria="${p.categoria}">
          <button class="qty__btn add" onclick="changeQty(this, 1)">＋</button>
          <span class="qty__count">0</span>
          <button class="qty__btn" onclick="changeQty(this, -1)">－</button>
        </div>
      `}
    </article>
  `).join('');

  updateCartUI();
}

// ── Abrir modal de personalización (solo categorías personalizables) ──
function abrirPersonalizar(producto) {
  if (!tiendaAbierta) {
    showToast(proximaApertura ? `Cerrado. Abrimos: ${proximaApertura}` : 'Estamos cerrados en este momento 🕐');
    return;
  }

  productoActual = producto;
  document.getElementById('personalizarNombre').textContent = producto.nombre;

  const catSalsas   = todasLasCategoriasCache.find(c => c.slug === 'salsas');
  const catToppings = todasLasCategoriasCache.find(c => c.slug === 'toppings');
  const precioSalsa   = catSalsas   ? (catSalsas.precio_extra   || 0) : 0;
  const precioTopping = catToppings ? (catToppings.precio_extra || 0) : 0;

  document.getElementById('labelSalsas').textContent = `Salsas (+${formatPrice(precioSalsa)} c/u)`;
  document.getElementById('labelToppings').textContent = `Toppings (+${formatPrice(precioTopping)} c/u)`;

  cantidadesSalsas = {};
  precioSalsaActual = precioSalsa;
  precioToppingActual = precioTopping;

  document.getElementById('personalizarSalsas').innerHTML = salsasDisponibles.map(s => `
    <div class="opcion-cantidad" data-nombre="${s.nombre}">
      <span class="opcion-cantidad__nombre">${s.nombre}</span>
      <span class="opcion-cantidad__precio-dinamico"></span>
      <div class="opcion-cantidad__control">
        <button type="button" class="opcion-cantidad__btn" onclick="cambiarCantidadSalsa('${s.nombre}', -1)">−</button>
        <span class="opcion-cantidad__valor">0</span>
        <button type="button" class="opcion-cantidad__btn" onclick="cambiarCantidadSalsa('${s.nombre}', 1)">+</button>
      </div>
    </div>
  `).join('') || '<p style="font-size:.8rem;color:rgba(240,237,232,.3)">No hay salsas cargadas.</p>';

  document.getElementById('personalizarToppings').innerHTML = toppingsDisponibles.map(t => `
    <label class="opcion-check">
      <span class="opcion-check__nombre">${t.nombre}</span>
      <input type="checkbox" class="opcion-topping" value='${JSON.stringify({nombre: t.nombre, precio: precioTopping})}' onchange="actualizarTotalPersonalizar()" />
    </label>
  `).join('') || '<p style="font-size:.8rem;color:rgba(240,237,232,.3)">No hay toppings cargados.</p>';

  actualizarTotalPersonalizar();

  document.getElementById('modalPersonalizar').classList.add('open');
  document.getElementById('overlayPersonalizar').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarPersonalizar() {
  document.getElementById('modalPersonalizar').classList.remove('open');
  document.getElementById('overlayPersonalizar').classList.remove('open');
  document.body.style.overflow = '';
  productoActual = null;
}

function actualizarTotalPersonalizar() {
  if (!productoActual) return;

  const salsasGratis   = productoActual.salsas_incluidas || 0;
  const toppingsGratis = productoActual.toppings_incluidos || 0;

  const salsasElegidas = actualizarSalsas(salsasGratis);
  actualizarGrupo('.opcion-topping', 'contadorToppings', toppingsGratis, 'toppings');

  const toppingsElegidos = document.querySelectorAll('.opcion-topping:checked').length;

  const salsasPagas   = Math.max(0, salsasElegidas - salsasGratis);
  const toppingsPagos = Math.max(0, toppingsElegidos - toppingsGratis);

  const total = productoActual.precio + (salsasPagas * precioSalsaActual) + (toppingsPagos * precioToppingActual);

  document.getElementById('personalizarTotal').textContent = formatPrice(total);
}

// ── Actualiza contador + etiquetas de precio para salsas (con cantidad) ──
function actualizarSalsas(gratis) {
  const filas = [...document.querySelectorAll('.opcion-cantidad')];

  let totalElegidas = 0;
  filas.forEach(f => totalElegidas += (cantidadesSalsas[f.dataset.nombre] || 0));

  const contador = document.getElementById('contadorSalsas');
  if (gratis > 0) {
    contador.textContent = `(${Math.min(totalElegidas, gratis)} de ${gratis} gratis)`;
    contador.classList.toggle('excedido', totalElegidas > gratis);
  } else {
    contador.textContent = '';
  }

  let acumulado = 0;
  filas.forEach(fila => {
    const nombre = fila.dataset.nombre;
    const qty = cantidadesSalsas[nombre] || 0;
    fila.querySelector('.opcion-cantidad__valor').textContent = qty;

    const tag = fila.querySelector('.opcion-cantidad__precio-dinamico');

    if (qty === 0) { tag.textContent = ''; tag.classList.remove('gratis'); return; }

    const antes = acumulado;
    const gratisEnEsta = Math.max(0, Math.min(acumulado + qty, gratis) - antes);
    const pagasEnEsta  = qty - gratisEnEsta;
    acumulado += qty;

    if (pagasEnEsta === 0) {
      tag.textContent = 'Gratis';
      tag.classList.add('gratis');
    } else if (gratisEnEsta === 0) {
      tag.textContent = `+${formatPrice(pagasEnEsta * precioSalsaActual)}`;
      tag.classList.remove('gratis');
    } else {
      tag.textContent = `${gratisEnEsta} gratis + ${formatPrice(pagasEnEsta * precioSalsaActual)}`;
      tag.classList.remove('gratis');
    }
  });

  return totalElegidas;
}

function cambiarCantidadSalsa(nombre, delta) {
  const actual = cantidadesSalsas[nombre] || 0;
  cantidadesSalsas[nombre] = Math.max(0, actual + delta);
  actualizarTotalPersonalizar();
}

// ── Actualiza contador + etiquetas de precio en un grupo (salsas o toppings) ──
function actualizarGrupo(selector, idContador, gratis, nombreGrupo) {
  const checkboxes = [...document.querySelectorAll(selector)];
  const elegidos = checkboxes.filter(c => c.checked).length;

  const contador = document.getElementById(idContador);
  if (gratis > 0) {
    contador.textContent = `(${Math.min(elegidos, gratis)} de ${gratis} gratis)`;
    contador.classList.toggle('excedido', elegidos > gratis);
  } else {
    contador.textContent = '';
  }

  // Marca cada checkbox: si su posición (orden de aparición) supera el límite gratis, muestra "+precio"
  let contadorTildados = 0;
  checkboxes.forEach(input => {
    const label = input.closest('.opcion-check');
    let precioTag = label.querySelector('.opcion-check__precio-dinamico');
    if (!precioTag) {
      precioTag = document.createElement('span');
      precioTag.className = 'opcion-check__precio-dinamico';
      label.insertBefore(precioTag, input);
    }

    if (input.checked) {
      contadorTildados++;
      const val = JSON.parse(input.value);
      precioTag.textContent = contadorTildados > gratis ? `+${formatPrice(val.precio)}` : 'Gratis';
      precioTag.classList.toggle('gratis', contadorTildados <= gratis);
    } else {
      precioTag.textContent = '';
    }
  });
}

function confirmarPersonalizar() {
  if (!productoActual) return;

  const salsasGratis   = productoActual.salsas_incluidas || 0;
  const toppingsGratis = productoActual.toppings_incluidos || 0;

  const salsas = [];
  let acumulado = 0;
  Object.entries(cantidadesSalsas).forEach(([nombre, qty]) => {
    for (let i = 0; i < qty; i++) {
      const esGratis = acumulado < salsasGratis;
      salsas.push({ nombre, precio: esGratis ? 0 : precioSalsaActual });
      acumulado++;
    }
  });

  const toppings = [...document.querySelectorAll('.opcion-topping:checked')].map((i, idx) => {
    const val = JSON.parse(i.value);
    return { ...val, precio: idx < toppingsGratis ? 0 : val.precio };
  });

  agregarLomitoAlCarrito(productoActual, salsas, toppings);

  cerrarPersonalizar();
  showToast(`<span>${productoActual.nombre}</span> agregado`);
}

cargarCategoria();