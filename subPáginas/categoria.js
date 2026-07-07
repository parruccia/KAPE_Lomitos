// ── Obtener el slug desde la URL ──
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

// ── Cargar la categoría (nombre) y sus productos ──
async function cargarCategoria() {
  if (!slug) {
    document.getElementById('categoriaNombre').textContent = 'Categoría no encontrada';
    document.getElementById('loadingMsg').style.display = 'none';
    return;
  }

  // 1. Traer datos de la categoría (nombre)
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

  document.getElementById('categoriaNombre').textContent = categoria.nombre;
  document.getElementById('pageTitle').textContent = `${categoria.nombre} — KAPÉ`;

  // 2. Traer productos de esa categoría
  cargarProductos();
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
      <div class="qty" data-name="${p.nombre}" data-size="${p.tamano || ''}" data-price="${p.precio}">
        <button class="qty__btn add" onclick="changeQty(this, 1)">＋</button>
        <span class="qty__count">0</span>
        <button class="qty__btn" onclick="changeQty(this, -1)">－</button>
      </div>
    </article>
  `).join('');

  updateCartUI();
}

cargarCategoria();