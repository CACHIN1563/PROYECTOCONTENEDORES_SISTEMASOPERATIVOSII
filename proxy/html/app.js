// ══════════════════════════════════════════════════
//  GeoPoints SO2 — app.js
//  Lógica principal del mapa y comunicación con API
// ══════════════════════════════════════════════════

// ── Colores por categoría ──────────────────────────
const CATEGORY_COLORS = {
    'Cultural':       '#4f8ef7',
    'Gastronomía':    '#f97316',
    'Servicio':       '#a78bfa',
    'Naturaleza':     '#34d399',
    'Comercial':      '#fbbf24',
    'Arqueología':    '#c084fc',
    'Transporte':     '#38bdf8',
    'Religión':       '#fb7185',
    'Entretenimiento':'#f472b6',
    'Emergencia':     '#f87171',
    'Otro':           '#94a3b8',
    'default':        '#4f8ef7'
};

function getCategoryColor(cat) {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS['default'];
}

// Crea un icono SVG circular con el color de la categoría
function createCategoryIcon(category) {
    const color = getCategoryColor(category);
    const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
            <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22S28 23.5 28 14C28 6.27 21.73 0 14 0z"
                  fill="${color}" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
            <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
        </svg>`;
    return L.divIcon({
        html: svgIcon,
        className: '',
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -36]
    });
}

// ── Inicialización del Mapa ─────────────────────────
const map = L.map('map', { zoomControl: true }).setView([14.62, -90.52], 12);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap | © CARTO | Proyecto SO2'
}).addTo(map);

// ── Estado global ───────────────────────────────────
let currentMarkers = [];
let tempMarker     = null;
let radiusCircle   = null;
let radiusCenterMarker = null;

// ── Click en el mapa ────────────────────────────────
map.on('click', function(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);

    // Rellena el formulario de Agregar
    document.getElementById('lat').value = lat;
    document.getElementById('lng').value = lng;

    // Rellena el formulario de Búsqueda por Radio
    document.getElementById('search-lat').value = lat;
    document.getElementById('search-lng').value = lng;

    // Marcador temporal translúcido
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = L.circleMarker([e.latlng.lat, e.latlng.lng], {
        radius: 7,
        color: '#fff',
        weight: 2,
        fillColor: '#4f8ef7',
        fillOpacity: 0.7
    }).addTo(map).bindPopup('📍 Coordenadas capturadas').openPopup();
});

// ── Renderizar puntos en mapa y lista ───────────────
function renderPOIs(data) {
    // Limpiar capas anteriores
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];
    document.getElementById('poi-list').innerHTML = '';
    document.getElementById('poi-count').textContent = data.length;

    if (data.length === 0) {
        document.getElementById('poi-list').innerHTML =
            '<li class="empty-list">No se encontraron puntos para los filtros aplicados.</li>';
        return;
    }

    data.forEach(poi => {
        const color = getCategoryColor(poi.category);

        // — Pin en el mapa —
        const marker = L.marker([poi.lat, poi.lng], { icon: createCategoryIcon(poi.category) })
            .addTo(map)
            .bindPopup(`
                <div style="font-family:Inter,sans-serif;min-width:170px;">
                    <strong style="font-size:0.95rem;">${poi.name}</strong><br>
                    <span style="font-size:0.78rem;color:#888;">${poi.category}</span><br>
                    <span style="font-size:0.82rem;margin-top:4px;display:block;">${poi.description || ''}</span>
                    <hr style="margin:6px 0;border-color:#eee;">
                    <button class="btn btn-danger" style="padding:4px 8px;font-size:0.7rem;" onclick="deletePoint(${poi.id})">🗑️ Eliminar</button> 
                    <hr style="margin:6px 0;border-color:#eee;">
                    <span style="font-size:0.72rem;color:#aaa;">
                        Lat: ${parseFloat(poi.lat).toFixed(5)}, Lng: ${parseFloat(poi.lng).toFixed(5)}
                    </span>
                </div>
            `);
        currentMarkers.push(marker);

        // — Item en la lista lateral —
        const li = document.createElement('li');
        li.className = 'poi-item';
        li.style.borderLeftColor = color;
        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div onclick="map.setView([${poi.lat}, ${${poi.lng}}], 16); marker.openPopup();" style="flex:1;">
                    <div class="poi-item-name">${poi.name}</div>
                    <div class="poi-item-desc">${poi.description || '<em style="color:#555;">Sin descripción</em>'}</div>
                </div>
                <button class="btn btn-danger" style="width:auto; padding:4px 6px; margin-left:8px;" onclick="event.stopPropagation(); deletePoint(${poi.id})">✕</button>
            </div>
            <div class="poi-item-footer" onclick="map.setView([${poi.lat}, ${${poi.lng}}], 16); marker.openPopup();">
                <span class="tag" style="background:${color}22;color:${color};border:1px solid ${color}44;">${poi.category}</span>
                <span class="poi-coords">${parseFloat(poi.lat).toFixed(4)}, ${parseFloat(poi.lng).toFixed(4)}</span>
            </div>
        `;
        document.getElementById('poi-list').appendChild(li);
    });
}

// ── Cargar todos los puntos (con filtro por categoría) ─
async function loadPoints() {
    clearRadiusVisuals(); // si había búsqueda por radio, limpiar visuals
    const filterCat = document.getElementById('filter-cat').value;
    let url = '/api/pois';
    if (filterCat) url += `?category=${encodeURIComponent(filterCat)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error en la respuesta de la API');
        const data = await response.json();
        renderPOIs(data);
    } catch (error) {
        console.error('Error cargando POIs:', error);
        showToast('Error al conectar con la API', 'error');
    }
}

// ── Eliminar un punto ──────────────────────────────
async function deletePoint(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este punto?')) return;

    try {
        const response = await fetch(`/api/pois/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Punto eliminado correctamente', 'success');
            loadPoints();
        } else {
            showToast('Error al eliminar el punto', 'error');
        }
    } catch (error) {
        console.error('Error eliminando POI:', error);
        showToast('Error de conexión con la API', 'error');
    }
}

// ── Búsqueda por radio ──────────────────────────────
async function searchByRadius() {
    const lat      = document.getElementById('search-lat').value;
    const lng      = document.getElementById('search-lng').value;
    const radiusKm = parseFloat(document.getElementById('radius-km').value);

    if (!lat || !lng) {
        showToast('Haz clic en el mapa para definir el centro de búsqueda', 'error');
        return;
    }
    if (!radiusKm || radiusKm <= 0) {
        showToast('Ingresa un radio válido mayor a 0', 'error');
        return;
    }

    const radiusMeters = radiusKm * 1000;

    // Dibujar círculo de búsqueda en el mapa
    if (radiusCircle) map.removeLayer(radiusCircle);
    if (radiusCenterMarker) map.removeLayer(radiusCenterMarker);

    radiusCircle = L.circle([parseFloat(lat), parseFloat(lng)], {
        radius: radiusMeters,
        color:       '#4f8ef7',
        weight:       2,
        fillColor:   '#4f8ef7',
        fillOpacity:  0.08,
        dashArray:   '6 4'
    }).addTo(map);

    radiusCenterMarker = L.circleMarker([parseFloat(lat), parseFloat(lng)], {
        radius: 5,
        color: '#4f8ef7',
        fillColor: '#4f8ef7',
        fillOpacity: 1,
        weight: 2
    }).addTo(map).bindPopup(`Centro de búsqueda — radio: ${radiusKm} km`);

    map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] });

    // Mostrar banner de radio activo
    document.getElementById('radius-banner').classList.add('visible');

    // Llamar a la API con parámetros de radio
    const url = `/api/pois?lat=${lat}&lng=${lng}&radius=${radiusMeters}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error en la API');
        const data = await response.json();
        renderPOIs(data);
        showToast(`${data.length} punto(s) encontrado(s) en ${radiusKm} km`, 'info');
    } catch (error) {
        console.error('Error en búsqueda por radio:', error);
        showToast('Error al realizar la búsqueda', 'error');
    }
}

// ── Limpiar búsqueda por radio ──────────────────────
function clearRadiusVisuals() {
    if (radiusCircle)        { map.removeLayer(radiusCircle);        radiusCircle = null; }
    if (radiusCenterMarker)  { map.removeLayer(radiusCenterMarker);  radiusCenterMarker = null; }
    document.getElementById('radius-banner').classList.remove('visible');
}

function clearRadiusSearch() {
    clearRadiusVisuals();
    document.getElementById('search-lat').value = '';
    document.getElementById('search-lng').value = '';
    document.getElementById('radius-km').value  = '2';
    loadPoints();
    showToast('Búsqueda por radio limpiada', 'info');
}

// ── Guardar un nuevo punto ──────────────────────────
async function savePoint() {
    const lat  = document.getElementById('lat').value;
    const lng  = document.getElementById('lng').value;
    const name = document.getElementById('name').value.trim();
    const desc = document.getElementById('desc').value.trim();
    const cat  = document.getElementById('cat').value;

    if (!lat || !lng) {
        showToast('Haz clic en el mapa para capturar las coordenadas', 'error');
        return;
    }
    if (!name) {
        showToast('El nombre del lugar es obligatorio', 'error');
        return;
    }

    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const response = await fetch('/api/pois', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: desc, category: cat, lat: parseFloat(lat), lng: parseFloat(lng) })
        });

        if (response.ok) {
            // Limpiar formulario
            ['name', 'desc', 'lat', 'lng'].forEach(id => document.getElementById(id).value = '');
            if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
            loadPoints();
            showToast('¡Punto guardado exitosamente!', 'success');
        } else {
            const err = await response.json();
            showToast(err.error || 'Error al guardar el punto', 'error');
        }
    } catch (error) {
        console.error('Error guardando POI:', error);
        showToast('Error de conexión con la API', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '＋ Guardar Punto';
    }
}

// ── Toast de notificación ───────────────────────────
let toastTimer = null;
function showToast(message, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = `show ${type}`;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = ''; }, 3000);
}

// ── Carga inicial ───────────────────────────────────
loadPoints();
