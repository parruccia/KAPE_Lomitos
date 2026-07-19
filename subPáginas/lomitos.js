let productoActual = null; // el lomito que se está personalizando
let salsasDisponibles = [];
let toppingsDisponibles = [];

// ── Carga productos desde Supabase y los renderiza ──
async function cargarProductos() {
  const { data, error } = await db
    .from('productos')
    .select('*')
    .eq('categoria', 'lomitos')
    .eq('activo', true)
    .order('orden');

  const lista    = document.getElementById('productosList');
  const loading  = document.getElementById('loadingMsg');

  loading.style.display = 'none';

  if (error || !data.length) {
    lista.innerHTML = '<p class="loading-msg">No hay productos disponibles.</p>';
    return;
  }

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
      <button class="qty__btn add lomito-add-btn" onclick='abrirPersonalizar(${JSON.stringify(p)})'>＋</button>
    </article>
  `).join('');
}

// ── Cargar salsas y toppings disponibles (una sola vez) ──
async function cargarOpciones() {
  const { data, error } = await db
    .from('productos')
    .select('*')
    .in('categoria', ['salsas', 'toppings'])
    .eq('activo', true)
    .order('orden');

  if (error || !data) return;

  salsasDisponibles   = data.filter(p => p.categoria === 'salsas');
  toppingsDisponibles = data.filter(p => p.categoria === 'toppings');
}

// ── Abrir modal de personalización ──
function abrirPersonalizar(producto) {
  if (!tiendaAbierta) {
    showToast(proximaApertura ? `Cerrado. Abrimos: ${proximaApertura}` : 'Estamos cerrados en este momento 🕐');
    return;
  }

  productoActual = producto;
  document.getElementById('personalizarNombre').textContent = producto.nombre;

  document.getElementById('personalizarSalsas').innerHTML = salsasDisponibles.map(s => `
    <label class="opcion-check">
      <span class="opcion-check__nombre">${s.nombre}</span>
      <span class="opcion-check__precio">+${formatPrice(s.precio)}</span>
      <input type="checkbox" class="opcion-salsa" value='${JSON.stringify({nombre: s.nombre, precio: s.precio})}' onchange="actualizarTotalPersonalizar()" />
    </label>
  `).join('') || '<p style="font-size:.8rem;color:rgba(240,237,232,.3)">No hay salsas cargadas.</p>';

  document.getElementById('personalizarToppings').innerHTML = toppingsDisponibles.map(t => `
    <label class="opcion-check">
      <span class="opcion-check__nombre">${t.nombre}</span>
      <span class="opcion-check__precio">+${formatPrice(t.precio)}</span>
      <input type="checkbox" class="opcion-topping" value='${JSON.stringify({nombre: t.nombre, precio: t.precio})}' onchange="actualizarTotalPersonalizar()" />
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

// ── Recalcular total en tiempo real ──
function actualizarTotalPersonalizar() {
  if (!productoActual) return;
  let total = productoActual.precio;

  document.querySelectorAll('.opcion-salsa:checked, .opcion-topping:checked').forEach(input => {
    const val = JSON.parse(input.value);
    total += val.precio;
  });

  document.getElementById('personalizarTotal').textContent = formatPrice(total);
}

// ── Confirmar y agregar al carrito ──
function confirmarPersonalizar() {
  if (!productoActual) return;

  const salsas = [...document.querySelectorAll('.opcion-salsa:checked')].map(i => JSON.parse(i.value));
  const toppings = [...document.querySelectorAll('.opcion-topping:checked')].map(i => JSON.parse(i.value));

  agregarLomitoAlCarrito(productoActual, salsas, toppings);

  cerrarPersonalizar();
  showToast(`<span>${productoActual.nombre}</span> agregado`);
}

cargarProductos();
cargarOpciones();
updateCartUI();