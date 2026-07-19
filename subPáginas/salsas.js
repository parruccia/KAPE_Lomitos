// ── Carga productos desde Supabase y los renderiza ──
async function cargarProductos() {
  const { data, error } = await db
    .from('productos')
    .select('*')
    .eq('categoria', 'salsas')
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
      <div class="qty" data-name="${p.nombre}" data-size="${p.tamano || ''}" data-price="${p.precio}" data-categoria="${p.categoria}">
        <button class="qty__btn add" onclick="changeQty(this, 1)">＋</button>
        <span class="qty__count">0</span>
        <button class="qty__btn" onclick="changeQty(this, -1)">－</button>
      </div>
    </article>
  `).join('');

  updateCartUI();
}

cargarProductos();