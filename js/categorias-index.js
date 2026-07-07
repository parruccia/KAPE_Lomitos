// ── Categorías con página propia (las viejas, hechas a mano) ──
const paginasFijas = {
  lomitos: 'subPáginas/index.lomitos.html',
  salsas:  'subPáginas/index.salsas.html'
};

async function cargarCategoriasIndex() {
  const { data, error } = await db
    .from('categorias')
    .select('*')
    .order('orden');

  const grid    = document.getElementById('gridCategorias');
  const loading = document.getElementById('loadingCategoriasIndex');

  if (loading) loading.remove();

  if (error || !data.length) {
    grid.innerHTML = '<p class="loading-msg">No hay categorías disponibles.</p>';
    return;
  }

  grid.innerHTML = data.map(c => {
    const href = paginasFijas[c.slug] || `subPáginas/categoria.html?slug=${c.slug}`;
    return `
      <a href="${href}" class="card">
        <div class="card__bar" aria-hidden="true"></div>
        <div class="card__thumb">
          ${c.imagen
            ? `<img src="${c.imagen}" alt="${c.nombre}" loading="lazy" />`
            : ''}
        </div>
        <div class="card__body">
          <span class="card__category">Ver menú completo</span>
          <h2 class="card__title">${c.nombre}</h2>
          <span class="card__cta">Ver productos →</span>
        </div>
      </a>
    `;
  }).join('');
}

cargarCategoriasIndex();