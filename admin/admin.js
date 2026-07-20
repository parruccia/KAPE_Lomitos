// ══════════════════════════════════════
//  admin.js — CRUD de productos con Supabase
// ══════════════════════════════════════

let todosLosProductos = [];
let categoriaActiva   = 'todos';
let editandoId        = null;

let todasLasCategorias  = [];
let editandoCategoriaId = null;
let todosLosHorarios = [];

let todosLosCupones = [];
let editandoCuponId = null;

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) mostrarPanel();
});

// ── LOGIN ──
async function login() {
  const email   = document.getElementById('loginEmail').value.trim();
  const pass    = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');
  const btn     = document.getElementById('loginBtn');

  errorEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Ingresando...';

  const { error } = await db.auth.signInWithPassword({ email, password: pass });

  btn.disabled = false;
  btn.textContent = 'Ingresar';

  if (error) { errorEl.textContent = 'Email o contraseña incorrectos.'; return; }
  mostrarPanel();
}

// ── LOGOUT ──
async function logout() {
  await db.auth.signOut();
  document.getElementById('panelScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

// ── MOSTRAR PANEL ──
function mostrarPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('panelScreen').style.display = 'flex';
  cargarProductos();
  cargarCategorias();
}

// ── CAMBIAR SECCIÓN ──
function cambiarSeccion(btn) {
  document.querySelectorAll('.seccion-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const sec = btn.dataset.sec;
  document.getElementById('seccionProductos').style.display  = sec === 'productos'  ? 'block' : 'none';
  document.getElementById('seccionCategorias').style.display = sec === 'categorias' ? 'block' : 'none';
  document.getElementById('seccionHorarios').style.display    = sec === 'horarios'  ? 'block' : 'none';
  document.getElementById('seccionCupones').style.display     = sec === 'cupones'   ? 'block' : 'none';
  if (sec === 'categorias' && !todasLasCategorias.length) cargarCategorias();
  if (sec === 'horarios' && !todosLosHorarios.length) cargarHorarios();
  if (sec === 'cupones' && !todosLosCupones.length) cargarCupones();
}

// ── CARGAR PRODUCTOS ──
async function cargarProductos() {
  const { data, error } = await db
    .from('productos')
    .select('*')
    .order('categoria')
    .order('orden');

  document.getElementById('loadingAdmin').style.display = 'none';
  document.getElementById('tablaProductos').style.display = 'table';

  if (error) { showToast('Error al cargar productos'); return; }

  todosLosProductos = data;
  renderTabla();
}

// ── RENDER TABLA ──
function renderTabla() {
  let lista = categoriaActiva === 'todos'
    ? todosLosProductos
    : todosLosProductos.filter(p => p.categoria === categoriaActiva);

  if (categoriaActiva !== 'todos') {
    lista = [...lista].sort((a, b) => a.orden - b.orden);
  }

  const body = document.getElementById('tablaBody');

  if (!lista.length) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:rgba(240,237,232,.25);font-family:var(--font-d);letter-spacing:.1em;text-transform:uppercase;font-size:.8rem">Sin productos</td></tr>`;
    return;
  }

  const mostrarFlechas = categoriaActiva !== 'todos';

  body.innerHTML = lista.map((p, i) => `
    <tr>
      <td class="td-nombre">
        ${p.imagen ? `<img src="${p.imagen}" class="td-img" alt="${p.nombre}" />` : '<span class="td-no-img">Sin imagen</span>'}
        ${p.nombre}
      </td>
      <td data-label="Tamaño" style="color:rgba(240,237,232,.45);font-size:.82rem">${p.tamano || '—'}</td>
      <td data-label="Categoría" class="td-cat">${p.categoria}</td>
      <td data-label="Precio" class="td-precio">${formatPrice(p.precio)}</td>
      <td data-label="Estado">
        <button class="estado-btn ${p.activo ? 'activo' : 'inactivo'}"
                onclick="toggleActivo('${p.id}', ${p.activo})">
          ${p.activo ? 'Activo' : 'Inactivo'}
        </button>
      </td>
      <td data-label="Acciones">
        <div class="acciones">
          ${mostrarFlechas ? `
            <button class="accion-btn flecha" onclick="moverProducto('${p.id}', -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="accion-btn flecha" onclick="moverProducto('${p.id}', 1)" ${i === lista.length - 1 ? 'disabled' : ''}>↓</button>
          ` : ''}
          <button class="accion-btn editar" onclick="abrirModal('${p.id}')">Editar</button>
          <button class="accion-btn eliminar" onclick="eliminarProducto('${p.id}', '${p.nombre}')">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── FILTRAR ──
function filtrar(btn) {
  document.querySelectorAll('.filtro').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  categoriaActiva = btn.dataset.cat;
  renderTabla();
}

// ── TOGGLE ACTIVO ──
async function toggleActivo(id, estadoActual) {
  const { error } = await db.from('productos').update({ activo: !estadoActual }).eq('id', id);
  if (error) { showToast('Error al actualizar'); return; }
  const p = todosLosProductos.find(x => x.id === id);
  if (p) p.activo = !estadoActual;
  renderTabla();
  showToast(`Producto ${!estadoActual ? 'activado' : 'desactivado'}`);
}

// ── LLENAR SELECT DE CATEGORÍAS ──
function llenarSelectCategorias() {
  const select = document.getElementById('mCategoria');
  select.innerHTML = todasLasCategorias
    .map(c => `<option value="${c.slug}">${c.nombre}</option>`)
    .join('');
}

// ── LLENAR FILTROS DE PRODUCTOS ──
function llenarFiltrosProductos() {
  const cont = document.getElementById('filtrosProductos');
  const botonesExtra = todasLasCategorias.map(c => `
    <button class="filtro" data-cat="${c.slug}" onclick="filtrar(this)">${c.nombre}</button>
  `).join('');
  cont.innerHTML = `<button class="filtro active" data-cat="todos" onclick="filtrar(this)">Todos</button>` + botonesExtra;
}

// ── ABRIR MODAL ──
function abrirModal(id = null) {
  editandoId = id;
  const modal   = document.getElementById('modal');
  const overlay = document.getElementById('modalOverlay');
  const title   = document.getElementById('modalTitle');
  const errorEl = document.getElementById('modalError');
  const preview = document.getElementById('mImagenPreview');

  errorEl.textContent = '';
  preview.style.display = 'none';
  preview.src = '';
  document.getElementById('mImagen').value = '';
  llenarSelectCategorias();

  if (id) {
    const p = todosLosProductos.find(x => x.id === id);
    title.textContent = 'Editar producto';
    document.getElementById('mNombre').value      = p.nombre;
    document.getElementById('mTamano').value      = p.tamano || '';
    document.getElementById('mDescripcion').value = p.descripcion || '';
    document.getElementById('mPrecio').value      = p.precio;
    document.getElementById('mCategoria').value   = p.categoria;
    document.getElementById('mOrden').value       = p.orden;
    document.getElementById('mSalsasIncluidas').value   = p.salsas_incluidas || 0;
    document.getElementById('mToppingsIncluidos').value = p.toppings_incluidos || 0;
    if (p.imagen) { preview.src = p.imagen; preview.style.display = 'block'; }
  } else {
    title.textContent = 'Nuevo producto';
    document.getElementById('mNombre').value      = '';
    document.getElementById('mTamano').value      = '';
    document.getElementById('mDescripcion').value = '';
    document.getElementById('mPrecio').value      = '';
    document.getElementById('mCategoria').value   = 'lomitos';
    document.getElementById('mOrden').value       = '';
    document.getElementById('mSalsasIncluidas').value   = 0;
    document.getElementById('mToppingsIncluidos').value = 0;
  }

  modal.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ── CERRAR MODAL ──
function cerrarModal() {
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  editandoId = null;
}

// ── PREVIEW IMAGEN ──
function previewImagen(input) {
  const preview = document.getElementById('mImagenPreview');
  const file    = input.files[0];
  if (!file) return;
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
}

// ── SUBIR IMAGEN ──
async function subirImagen(file) {
  const ext    = file.name.split('.').pop();
  const nombre = `${Date.now()}.${ext}`;
  const { error } = await db.storage.from('productos').upload(nombre, file, { upsert: true });
  if (error) return null;
  const { data } = db.storage.from('productos').getPublicUrl(nombre);
  return data.publicUrl;
}

// ── GUARDAR PRODUCTO ──
async function guardarProducto() {
  const nombre      = document.getElementById('mNombre').value.trim();
  const tamano      = document.getElementById('mTamano').value.trim();
  const descripcion = document.getElementById('mDescripcion').value.trim();
  const precio      = parseInt(document.getElementById('mPrecio').value);
  const categoria   = document.getElementById('mCategoria').value;
  const orden       = parseInt(document.getElementById('mOrden').value) || 0;
  const salsas_incluidas   = parseInt(document.getElementById('mSalsasIncluidas').value) || 0;
  const toppings_incluidos = parseInt(document.getElementById('mToppingsIncluidos').value) || 0;
  const fileInput   = document.getElementById('mImagen');
  const errorEl     = document.getElementById('modalError');
  const btn         = document.getElementById('modalBtn');

  errorEl.textContent = '';
  if (!nombre)               { errorEl.textContent = 'El nombre es obligatorio.'; return; }
  if (!precio || isNaN(precio)) { errorEl.textContent = 'El precio es obligatorio.'; return; }

  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const datos = { nombre, tamano, descripcion, precio, categoria, orden, salsas_incluidas, toppings_incluidos };

  if (fileInput.files[0]) {
    btn.textContent = 'Subiendo imagen...';
    const url = await subirImagen(fileInput.files[0]);
    if (url) {
      datos.imagen = url;
    } else {
      errorEl.textContent = 'Error al subir la imagen.';
      btn.disabled = false;
      btn.textContent = 'Guardar';
      return;
    }
  }

  let error;
  if (editandoId) {
    ({ error } = await db.from('productos').update(datos).eq('id', editandoId));
  } else {
    ({ error } = await db.from('productos').insert(datos));
  }

  btn.disabled = false;
  btn.textContent = 'Guardar';

  if (error) { errorEl.textContent = 'Error al guardar. Intentá de nuevo.'; return; }

  cerrarModal();
  showToast(editandoId ? 'Producto actualizado' : 'Producto creado');
  await cargarProductos();
}

// ── ELIMINAR ──
async function eliminarProducto(id, nombre) {
  if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
  const { error } = await db.from('productos').delete().eq('id', id);
  if (error) { showToast('Error al eliminar'); return; }
  showToast(`"${nombre}" eliminado`);
  await cargarProductos();
}

// ══════════════════════════════════════
//  CATEGORÍAS
// ══════════════════════════════════════

// ── CARGAR CATEGORÍAS ──
async function cargarCategorias() {
  const { data, error } = await db.from('categorias').select('*').order('orden');

  document.getElementById('loadingCategorias').style.display = 'none';
  document.getElementById('catGrid').style.display = 'grid';

  if (error) { showToast('Error al cargar categorías'); return; }

  todasLasCategorias = data;
  renderCategorias();
  llenarFiltrosProductos();
}

// ── RENDER TARJETAS ──
function renderCategorias() {
  const grid = document.getElementById('catGrid');

  if (!todasLasCategorias.length) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:2rem;color:rgba(240,237,232,.25);font-family:var(--font-d);letter-spacing:.1em;text-transform:uppercase;font-size:.8rem">Sin categorías</p>`;
    return;
  }

  grid.innerHTML = todasLasCategorias.map((c, i) => `
    <div class="cat-card">
      ${c.imagen ? `<img src="${c.imagen}" class="cat-card__img" alt="${c.nombre}" />` : '<div class="cat-card__img cat-card__img--empty"></div>'}
      <div class="cat-card__body">
        <span class="cat-card__nombre">${c.nombre}</span>
      </div>
      <div class="cat-card__acciones">
        <button class="accion-btn flecha" onclick="moverCategoria('${c.id}', -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="accion-btn flecha" onclick="moverCategoria('${c.id}', 1)" ${i === todasLasCategorias.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="accion-btn editar" onclick="abrirModalCategoria('${c.id}')">Editar</button>
        <button class="accion-btn eliminar" onclick="eliminarCategoria('${c.id}', '${c.nombre}')">Eliminar</button>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════
//  HORARIOS
// ══════════════════════════════════════

const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ── CARGAR HORARIOS ──
async function cargarHorarios() {
  const { data, error } = await db.from('horarios').select('*').order('dia_semana');

  document.getElementById('loadingHorarios').style.display = 'none';
  document.getElementById('horariosLista').style.display = 'block';

  if (error) { showToast('Error al cargar horarios'); return; }

  todosLosHorarios = data;
  renderHorarios();
}

// ── RENDER HORARIOS ──
function renderHorarios() {
  const cont = document.getElementById('horariosLista');

  cont.innerHTML = todosLosHorarios.map(h => `
    <div class="horario-card" data-id="${h.id}">
      <div class="horario-card__header">
        <span class="horario-card__dia">${NOMBRES_DIAS[h.dia_semana]}</span>
        <label class="horario-cerrado">
          <input type="checkbox" ${h.cerrado ? 'checked' : ''} onchange="toggleCerrado('${h.id}', this.checked)" />
          Cerrado todo el día
        </label>
      </div>
     <div class="horario-card__franjas" style="${h.cerrado ? 'display:none' : ''}">
        <div class="horario-franja">
          <span class="horario-franja__label">Turno 1</span>
          <input type="time" class="form-input" id="ap1-${h.id}" value="${h.apertura1 || ''}" />
          <span>a</span>
          <input type="time" class="form-input" id="ci1-${h.id}" value="${h.cierre1 || ''}" />
        </div>
        <div class="horario-franja">
          <span class="horario-franja__label">Turno 2</span>
          <input type="time" class="form-input" id="ap2-${h.id}" value="${h.apertura2 || ''}" />
          <span>a</span>
          <input type="time" class="form-input" id="ci2-${h.id}" value="${h.cierre2 || ''}" />
          <button type="button" class="accion-btn eliminar" title="Quitar turno 2" onclick="quitarTurno2('${h.id}')">✕</button>
        </div>
        <button class="accion-btn guardar-horario" onclick="guardarHorario('${h.id}')">Guardar</button>
      </div>
    </div>
  `).join('');
}

// ── TOGGLE CERRADO (marca el día entero como cerrado) ──
async function toggleCerrado(id, cerrado) {
  const { error } = await db.from('horarios').update({ cerrado }).eq('id', id);
  if (error) { showToast('Error al actualizar'); return; }
  await cargarHorarios();
  showToast(cerrado ? 'Día marcado como cerrado' : 'Día reactivado');
}

// ── GUARDAR HORARIO (turnos de un día) ──
async function guardarHorario(id) {
  const apertura1 = document.getElementById(`ap1-${id}`).value || null;
  const cierre1   = document.getElementById(`ci1-${id}`).value || null;
  const apertura2 = document.getElementById(`ap2-${id}`).value || null;
  const cierre2   = document.getElementById(`ci2-${id}`).value || null;

  const { error } = await db.from('horarios')
    .update({ apertura1, cierre1, apertura2, cierre2 })
    .eq('id', id);

  if (error) { showToast('Error al guardar horario'); return; }
  showToast('Horario actualizado');
  await cargarHorarios();
}

// ── QUITAR TURNO 2 (vacía los campos, sin guardar todavía) ──
function quitarTurno2(id) {
  document.getElementById(`ap2-${id}`).value = '';
  document.getElementById(`ci2-${id}`).value = '';
  showToast('Turno 2 vaciado. Tocá "Guardar" para confirmar.');
}

// ── MOVER CATEGORÍA (arriba/abajo) ──
async function moverCategoria(id, direccion) {
  const index = todasLasCategorias.findIndex(c => c.id === id);
  const indexVecino = index + direccion;

  if (indexVecino < 0 || indexVecino >= todasLasCategorias.length) return;

  const actual  = todasLasCategorias[index];
  const vecino  = todasLasCategorias[indexVecino];

  const { error: e1 } = await db.from('categorias').update({ orden: vecino.orden }).eq('id', actual.id);
  const { error: e2 } = await db.from('categorias').update({ orden: actual.orden }).eq('id', vecino.id);

  if (e1 || e2) { showToast('Error al reordenar'); return; }

  await cargarCategorias();
}

// ── MOVER PRODUCTO (arriba/abajo, dentro de su categoría) ──
async function moverProducto(id, direccion) {
  const producto = todosLosProductos.find(p => p.id === id);
  const listaCategoria = todosLosProductos
    .filter(p => p.categoria === producto.categoria)
    .sort((a, b) => a.orden - b.orden);

  const index = listaCategoria.findIndex(p => p.id === id);
  const indexVecino = index + direccion;

  if (indexVecino < 0 || indexVecino >= listaCategoria.length) return;

  const actual = listaCategoria[index];
  const vecino = listaCategoria[indexVecino];

  const { error: e1 } = await db.from('productos').update({ orden: vecino.orden }).eq('id', actual.id);
  const { error: e2 } = await db.from('productos').update({ orden: actual.orden }).eq('id', vecino.id);

  if (e1 || e2) { showToast('Error al reordenar'); return; }

  await cargarProductos();
}

// ── GENERAR SLUG A PARTIR DEL NOMBRE ──
function generarSlug(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ── ABRIR MODAL CATEGORÍA ──
function abrirModalCategoria(id = null) {
  editandoCategoriaId = id;
  const title   = document.getElementById('modalCategoriaTitle');
  const errorEl = document.getElementById('modalCategoriaError');
  const preview = document.getElementById('cImagenPreview');

  errorEl.textContent = '';
  preview.style.display = 'none';
  preview.src = '';
  document.getElementById('cImagen').value = '';

  if (id) {
    const c = todasLasCategorias.find(x => x.id === id);
    title.textContent = 'Editar categoría';
    document.getElementById('cNombre').value = c.nombre;
    document.getElementById('cPersonalizable').checked = c.personalizable || false;
    document.getElementById('cVisibleMenu').checked = c.visible_en_menu !== false;
    document.getElementById('cPrecioExtra').value = c.precio_extra || '';
    if (c.imagen) { preview.src = c.imagen; preview.style.display = 'block'; }
  } else {
    title.textContent = 'Nueva categoría';
    document.getElementById('cNombre').value = '';
    document.getElementById('cPersonalizable').checked = false;
    document.getElementById('cVisibleMenu').checked = true;
    document.getElementById('cPrecioExtra').value = '';
  }

  document.getElementById('modalCategoria').classList.add('open');
  document.getElementById('modalOverlayCat').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ── CERRAR MODAL CATEGORÍA ──
function cerrarModalCategoria() {
  document.getElementById('modalCategoria').classList.remove('open');
  document.getElementById('modalOverlayCat').classList.remove('open');
  document.body.style.overflow = '';
  editandoCategoriaId = null;
}

// ── PREVIEW IMAGEN CATEGORÍA ──
function previewImagenCategoria(input) {
  const preview = document.getElementById('cImagenPreview');
  const file = input.files[0];
  if (!file) return;
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
}

// ── GUARDAR CATEGORÍA ──
async function guardarCategoria() {
  const nombre    = document.getElementById('cNombre').value.trim();
  const personalizable = document.getElementById('cPersonalizable').checked;
  const visible_en_menu = document.getElementById('cVisibleMenu').checked;
  const precioExtraVal = document.getElementById('cPrecioExtra').value;
  const precio_extra = precioExtraVal ? parseInt(precioExtraVal) : null;
  const fileInput = document.getElementById('cImagen');
  const errorEl   = document.getElementById('modalCategoriaError');
  const btn       = document.getElementById('modalCategoriaBtn');

  errorEl.textContent = '';
  if (!nombre) { errorEl.textContent = 'El nombre es obligatorio.'; return; }

  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const datos = { nombre, personalizable, visible_en_menu, precio_extra };

  if (!editandoCategoriaId) {
    datos.slug  = generarSlug(nombre);
    datos.orden = todasLasCategorias.length
      ? Math.max(...todasLasCategorias.map(c => c.orden)) + 1
      : 1;
  }

  if (fileInput.files[0]) {
    btn.textContent = 'Subiendo imagen...';
    const ext = fileInput.files[0].name.split('.').pop();
    const nombreArchivo = `${Date.now()}.${ext}`;
    const { error: upErr } = await db.storage.from('categorias').upload(nombreArchivo, fileInput.files[0], { upsert: true });
    if (upErr) {
      errorEl.textContent = 'Error al subir la imagen.';
      btn.disabled = false;
      btn.textContent = 'Guardar';
      return;
    }
    const { data } = db.storage.from('categorias').getPublicUrl(nombreArchivo);
    datos.imagen = data.publicUrl;
  }

  let error;
  if (editandoCategoriaId) {
    ({ error } = await db.from('categorias').update(datos).eq('id', editandoCategoriaId));
  } else {
    ({ error } = await db.from('categorias').insert(datos));
  }

  btn.disabled = false;
  btn.textContent = 'Guardar';

  if (error) { errorEl.textContent = 'Error al guardar. Intentá de nuevo.'; return; }

  cerrarModalCategoria();
  showToast(editandoCategoriaId ? 'Categoría actualizada' : 'Categoría creada');
  await cargarCategorias();
}

// ── ELIMINAR CATEGORÍA ──
async function eliminarCategoria(id, nombre) {
  const cat = todasLasCategorias.find(c => c.id === id);
  const productosDeEsaCategoria = todosLosProductos.filter(p => p.categoria === cat.slug);

  let mensaje = `¿Eliminar la categoría "${nombre}"?`;
  if (productosDeEsaCategoria.length) {
    mensaje += `\n\nTiene ${productosDeEsaCategoria.length} producto(s) cargado(s). No se van a borrar, pero quedarán sin categoría visible hasta que les asignes otra.`;
  }
  if (!confirm(mensaje)) return;

  const { error } = await db.from('categorias').delete().eq('id', id);
  if (error) { showToast('Error al eliminar'); return; }
  showToast(`"${nombre}" eliminada`);
  await cargarCategorias();
}

// ── HELPERS ──
function formatPrice(n) {
  return '$' + n.toLocaleString('es-AR');
}

// ── RENDER TABLA DE CUPONES ──
function renderCupones() {
  const tbody = document.getElementById('tablaCuponesBody');

  if (!todosLosCupones.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:rgba(240,237,232,.3)">No hay cupones cargados.</td></tr>';
    return;
  }

  tbody.innerHTML = todosLosCupones.map(c => {
    const valorTexto = c.tipo === 'porcentaje' ? `${c.valor}%` : formatPrice(c.valor);
    const vencTexto  = c.vencimiento ? new Date(c.vencimiento + 'T00:00:00').toLocaleDateString('es-AR') : '—';
    const usosTexto  = c.usos_maximos ? `${c.usos_actuales} / ${c.usos_maximos}` : `${c.usos_actuales} / ∞`;

    const vencido = c.vencimiento && new Date(c.vencimiento + 'T23:59:59') < new Date();
    const agotado  = c.usos_maximos && c.usos_actuales >= c.usos_maximos;
    const estadoTexto = !c.activo ? 'Inactivo' : vencido ? 'Vencido' : agotado ? 'Agotado' : 'Activo';

    return `
      <tr>
        <td class="td-nombre" data-label="Código"><strong>${c.codigo}</strong></td>
        <td data-label="Tipo">${c.tipo === 'porcentaje' ? 'Porcentaje' : 'Fijo'}</td>
        <td data-label="Valor">${valorTexto}</td>
        <td data-label="Vencimiento">${vencTexto}</td>
        <td data-label="Usos">${usosTexto}</td>
        <td data-label="Estado"><button class="estado-btn ${c.activo ? 'activo' : 'inactivo'}" onclick="toggleEstadoCupon(${c.id}, ${!c.activo})">${estadoTexto}</button></td>
        <td data-label="" class="acciones">
          <button class="accion-btn" onclick="abrirModalCupon(${c.id})">Editar</button>
          <button class="accion-btn accion-btn--danger" onclick="eliminarCupon(${c.id})">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── CARGAR CUPONES ──
async function cargarCupones() {
  const { data, error } = await db.from('cupones').select('*').order('creado_en', { ascending: false });

  document.getElementById('loadingCupones').style.display = 'none';
  document.getElementById('tablaCupones').style.display = 'table';

  if (error) { showToast('Error al cargar cupones'); return; }

  todosLosCupones = data;
  renderCupones();
}

// ── RENDER TABLA DE CUPONES ──
function renderCupones() {
  const tbody = document.getElementById('tablaCuponesBody');

  if (!todosLosCupones.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="td-vacio" style="padding:2rem;color:rgba(240,237,232,.3)">No hay cupones cargados.</td></tr>';
    return;
  }

  tbody.innerHTML = todosLosCupones.map(c => {
    const valorTexto = c.tipo === 'porcentaje' ? `${c.valor}%` : formatPrice(c.valor);
    const vencTexto  = c.vencimiento ? new Date(c.vencimiento + 'T00:00:00').toLocaleDateString('es-AR') : '—';
    const usosTexto  = c.usos_maximos ? `${c.usos_actuales} / ${c.usos_maximos}` : `${c.usos_actuales} / ∞`;

    const vencido = c.vencimiento && new Date(c.vencimiento + 'T23:59:59') < new Date();
    const agotado  = c.usos_maximos && c.usos_actuales >= c.usos_maximos;
    const estadoTexto = !c.activo ? 'Inactivo' : vencido ? 'Vencido' : agotado ? 'Agotado' : 'Activo';

    return `
  <tr>
    <td data-label="Código"><strong>${c.codigo}</strong></td>
    <td data-label="Tipo">${c.tipo === 'porcentaje' ? 'Porcentaje' : 'Fijo'}</td>
    <td data-label="Valor">${valorTexto}</td>
    <td data-label="Vencimiento">${vencTexto}</td>
    <td data-label="Usos">${usosTexto}</td>
    <td data-label="Estado"><button class="estado-btn ${c.activo ? 'activo' : 'inactivo'}" onclick="toggleEstadoCupon(${c.id}, ${!c.activo})">${estadoTexto}</button></td>
    <td data-label="Acciones" class="acciones">
      <button class="accion-btn" onclick="abrirModalCupon(${c.id})">Editar</button>
      <button class="accion-btn accion-btn--danger" onclick="eliminarCupon(${c.id})">Eliminar</button>
    </td>
  </tr>
`;
  }).join('');
}

// ── ABRIR MODAL CUPÓN ──
function abrirModalCupon(id = null) {
  editandoCuponId = id;
  const title   = document.getElementById('modalCuponTitle');
  const errorEl = document.getElementById('modalCuponError');

  errorEl.textContent = '';

  if (id) {
    const c = todosLosCupones.find(x => x.id === id);
    title.textContent = 'Editar cupón';
    document.getElementById('cuCodigo').value = c.codigo;
    document.getElementById('cuTipo').value = c.tipo;
    document.getElementById('cuValor').value = c.valor;
    document.getElementById('cuVencimiento').value = c.vencimiento || '';
    document.getElementById('cuUsosMaximos').value = c.usos_maximos || '';
    document.getElementById('cuActivo').checked = c.activo;
  } else {
    title.textContent = 'Nuevo cupón';
    document.getElementById('cuCodigo').value = '';
    document.getElementById('cuTipo').value = 'porcentaje';
    document.getElementById('cuValor').value = '';
    document.getElementById('cuVencimiento').value = '';
    document.getElementById('cuUsosMaximos').value = '';
    document.getElementById('cuActivo').checked = true;
  }

  actualizarLabelValorCupon();

  document.getElementById('modalCupon').classList.add('open');
  document.getElementById('modalOverlayCupon').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ── CERRAR MODAL CUPÓN ──
function cerrarModalCupon() {
  document.getElementById('modalCupon').classList.remove('open');
  document.getElementById('modalOverlayCupon').classList.remove('open');
  document.body.style.overflow = '';
  editandoCuponId = null;
}

// ── LABEL DINÁMICO SEGÚN TIPO ──
function actualizarLabelValorCupon() {
  const tipo = document.getElementById('cuTipo').value;
  document.getElementById('cuValorLabel').textContent = tipo === 'porcentaje' ? 'Valor (%)' : 'Valor ($)';
}
document.addEventListener('DOMContentLoaded', () => {
  const tipoSelect = document.getElementById('cuTipo');
  if (tipoSelect) tipoSelect.addEventListener('change', actualizarLabelValorCupon);
});

// ── GUARDAR CUPÓN ──
async function guardarCupon() {
  const codigo = document.getElementById('cuCodigo').value.trim().toUpperCase();
  const tipo   = document.getElementById('cuTipo').value;
  const valor  = parseFloat(document.getElementById('cuValor').value);
  const vencimiento = document.getElementById('cuVencimiento').value || null;
  const usosMaximosVal = document.getElementById('cuUsosMaximos').value;
  const usos_maximos = usosMaximosVal ? parseInt(usosMaximosVal) : null;
  const activo = document.getElementById('cuActivo').checked;
  const errorEl = document.getElementById('modalCuponError');
  const btn     = document.getElementById('modalCuponBtn');

  errorEl.textContent = '';

  if (!codigo) { errorEl.textContent = 'El código es obligatorio.'; return; }
  if (!valor || valor <= 0) { errorEl.textContent = 'Ingresá un valor válido.'; return; }
  if (tipo === 'porcentaje' && valor > 100) { errorEl.textContent = 'El porcentaje no puede superar 100.'; return; }

  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const datos = { codigo, tipo, valor, vencimiento, usos_maximos, activo };

  let error;
  if (editandoCuponId) {
    ({ error } = await db.from('cupones').update(datos).eq('id', editandoCuponId));
  } else {
    ({ error } = await db.from('cupones').insert(datos));
  }

  btn.disabled = false;
  btn.textContent = 'Guardar';

  if (error) {
    errorEl.textContent = error.code === '23505' ? 'Ya existe un cupón con ese código.' : 'Error al guardar. Intentá de nuevo.';
    return;
  }

  cerrarModalCupon();
  showToast(editandoCuponId ? 'Cupón actualizado' : 'Cupón creado');
  await cargarCupones();
}

// ── ELIMINAR CUPÓN ──
async function eliminarCupon(id) {
  if (!confirm('¿Seguro que querés eliminar este cupón?')) return;

  const { error } = await db.from('cupones').delete().eq('id', id);
  if (error) { showToast('Error al eliminar'); return; }

  showToast('Cupón eliminado');
  await cargarCupones();
}

// ── TOGGLE ESTADO CUPÓN ──
async function toggleEstadoCupon(id, nuevoEstado) {
  const { error } = await db.from('cupones').update({ activo: nuevoEstado }).eq('id', id);
  if (error) { showToast('Error al actualizar estado'); return; }
  showToast(nuevoEstado ? 'Cupón activado' : 'Cupón desactivado');
  await cargarCupones();
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}
