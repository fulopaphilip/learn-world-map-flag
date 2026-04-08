import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import polylabel from 'polylabel';
import './style.css';

// ---- MAP & GLOBAL STATE ----
const map = L.map('map', {
  minZoom: 1,
  maxZoom: 10
}).setView([20, 0], 2);

let isSatellite = false;
let useRandomColors = false;
let showNameOnHover = false;
let showNameOnMap = false;

let countriesLayer = null;
let labelsLayer = null;
let lastSelectedLayer = null;
const countryIndex = new Map();
const countriesForSearch = []; // { name, iso2, bounds }
const countryLabels = []; // global

// name -> random border color
const countryBorderColors = {};

// ISO overrides for problematic codes
const isoOverrides = {
};

// ---- BASE LAYERS ----
const baseStreets = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
  {
    maxZoom: 15,
    attribution: '© OpenStreetMap contributors © CARTO'
  }
);

const baseSatellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19,
    attribution: 'Tiles © Esri'
  }
);

baseStreets.addTo(map); // default

function isMobile() {
  return window.innerWidth <= 768; // simple heuristic
}

function updateLabelFontSize() {
  if (!isMobile()) return; // only affect phones

  const z = map.getZoom();
  // choose a size curve: smaller when zoomed out, bigger when zoomed in
  // adjust numbers to taste
  let size;
  if (z <= 2) size = 8;
  else if (z === 3) size = 9;
  else if (z === 4) size = 10;
  else if (z === 5) size = 11;
  else if (z >= 6) size = 12;

  const labels = document.querySelectorAll('.country-label-text');
  labels.forEach(el => {
    el.style.fontSize = size + 'px';
  });
}

// initial set and on every zoom
map.on('zoomend', updateLabelFontSize);
updateLabelFontSize();

// ---- BORDER STYLE ----
function getRandomBorderColor(name) {
  if (countryBorderColors[name]) return countryBorderColors[name];
  const hue = Math.floor(Math.random() * 360);
  const color = `hsl(${hue}, 70%, 50%)`;
  countryBorderColors[name] = color;
  return color;
}

function countryStyle(feature) {
  const name = feature.properties.name || 'Unknown';

  let color;
  if (useRandomColors) {
    color = getRandomBorderColor(name);
  } else {
    color = isSatellite ? '#ffffff' : '#333333';
  }

  return {
    color,
    weight: 1,
    fillOpacity: 0.1
  };
}

// ---- LABEL POSITION  ----
function getMainPolygonCenter(feature) {
  const geom = feature.geometry;
  if (!geom) return null;

  function ringArea(ring) {
    let area = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = ring[j];
      const [x2, y2] = ring[i];
      area += (x1 * y2 - x2 * y1);
    }
    return Math.abs(area / 2);
  }

  function centroidOfRing(ring) {
    let sumLat = 0;
    let sumLng = 0;
    let count = 0;
    ring.forEach(pt => {
      const [lng, lat] = pt;
      sumLat += lat;
      sumLng += lng;
      count++;
    });
    return [sumLng / count, sumLat / count]; // [lng,lat]
  }

  let poly = null;
  let centroid = null;

  if (geom.type === 'Polygon') {
    const outer = geom.coordinates[0];
    poly = geom.coordinates;
    centroid = centroidOfRing(outer);
  } else if (geom.type === 'MultiPolygon') {
    let maxArea = 0;
    geom.coordinates.forEach(polygon => {
      const outer = polygon[0];
      const area = ringArea(outer);
      if (area > maxArea) {
        maxArea = area;
        poly = polygon;
        centroid = centroidOfRing(outer);
      }
    });
  } else {
    const temp = L.geoJSON(feature);
    return temp.getBounds().getCenter();
  }

  if (!poly || !centroid) {
    const temp = L.geoJSON(feature);
    return temp.getBounds().getCenter();
  }

  const p = polylabel(poly, 1.0); // [lng,lat]

  const blend = 0.6; // 0 = pure polylabel, 1 = pure centroid
  const lng = blend * centroid[0] + (1 - blend) * p[0];
  const lat = blend * centroid[1] + (1 - blend) * p[1];

  return L.latLng(lat, lng);
}

function formatCountryName(name) {
  if (!name) return '';

  const maxLen = 14; // max length for a single line

  if (name.length <= maxLen) return name;

  const words = name.split(' ');
  if (words.length === 1) {
    // single very long word: cannot split cleanly, leave as one line
    return name;
  }

  // Greedy line building: fill line1 up to maxLen, rest goes to line2
  let line1 = '';
  let line2 = '';
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!line1.length) {
      // first word
      if (word.length > maxLen) {
        // word itself too long, just put everything in line2
        line1 = word;
      } else {
        line1 = word;
      }
    } else if ((line1 + ' ' + word).length <= maxLen) {
      line1 += ' ' + word;
    } else {
      // rest goes to line2
      line2 = words.slice(i).join(' ');
      break;
    }
  }

  if (!line2) {
    return line1; // nothing wrapped
  }

  return line1 + '<br>' + line2;
}

// ---- GEOJSON LOAD ----

fetch('countries.geojson')
  .then(r => r.json())
  .then(data => {
    // 1) Countries layer: borders + interactions
  countriesLayer = L.geoJSON(data, {
  style: countryStyle,
  onEachFeature: function (feature, layer) {
    onEachCountry(feature, layer);

    const name = (feature.properties.name || 'Unknown').trim(); // <--- trim
    const rawIso2Prop =
      feature.properties['ISO3166-1-Alpha-2'] ||
      feature.properties.ISO_A2 ||
      '';
    const rawIso2 = isoOverrides[name] || rawIso2Prop;
    const iso2 = rawIso2.toLowerCase();

    countryIndex.set(name, { feature, layer }); // <--- key is exactly `name`

    countriesForSearch.push({
      name,         // <--- same `name`
      iso2,
      bounds: layer.getBounds()
    });
  }
}).addTo(map);

    // Labels layer
    labelsLayer = L.layerGroup();

    L.geoJSON(data, {
      onEachFeature: function (feature, layer) {
        const center = getMainPolygonCenter(feature);
        if (!center) return;

        const rawName = feature.properties.name || 'Unknown';
        const labelHtml = formatCountryName(rawName);

        const labelMarker = L.marker(center, {
          icon: L.divIcon({
            className: 'country-label',
            html: `<div class="country-label-text">${labelHtml}</div>`,
            iconSize: [0, 0]
          })
        });

        // approximate size from bounds (used to hide tiny countries when zoomed out)
        const bounds = layer.getBounds();
        const size = bounds.getNorthEast().distanceTo(bounds.getSouthWest());

        countryLabels.push({ size, marker: labelMarker });
        labelsLayer.addLayer(labelMarker);
      }
    });
    console.log('countriesForSearch length:', countriesForSearch.length);
  });

const topMenu = document.getElementById('top-menu');
const searchPanel = document.getElementById('search-panel');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

let currentMode = 'learn'; // default

function setMode(mode) {
  currentMode = mode;

  // toggle active button
  document.querySelectorAll('#top-menu .menu-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // panels visibility
  if (mode === 'search') {
    searchPanel.classList.remove('hidden');
    searchInput.focus();
  } else {
    searchPanel.classList.add('hidden');
  }

  // learn/game share same map for now; game mode is just reserved
}

topMenu.addEventListener('click', e => {
  const btn = e.target.closest('.menu-btn');
  if (!btn) return;
  setMode(btn.dataset.mode);
});

let currentMatches = [];
let selectedIndex = -1;

function renderSearchResults(query) {
  searchResults.innerHTML = '';


  if (!query) return;

  const q = query.toLowerCase();

  const matches = countriesForSearch
    .filter(c => c.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 50);

  currentMatches = matches;

  matches.forEach((country, idx) => {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.dataset.index = idx;

    const flagUrl = country.iso2
      ? `https://flagcdn.com/${country.iso2}.svg`
      : '';

    item.innerHTML = `
      ${flagUrl ? `<img src="${flagUrl}" alt="">` : ''}
      <span>${country.name}</span>
    `;

    item.addEventListener('click', () => {
      selectCountryFromSearch(idx);
    });

    searchResults.appendChild(item);
  });
}

function selectCountryFromSearch(index) {
  if (index < 0 || index >= currentMatches.length) return;

  const { name } = currentMatches[index];
  const entry = countryIndex.get(name);
  if (!entry) return;

  const { feature, layer } = entry;

  // 1) Reset previous selection completely
  if (lastSelectedLayer) {
    countriesLayer.resetStyle(lastSelectedLayer);
    lastSelectedLayer.closeTooltip && lastSelectedLayer.closeTooltip();
    lastSelectedLayer.unbindTooltip && lastSelectedLayer.unbindTooltip();
  }

  // 2) Zoom to main part
  const bounds = getMainBounds(layer);
  if (bounds && bounds.isValid && bounds.isValid()) {
    map.flyToBounds(bounds, {
      padding: [20, 20],
      animate: true,
      duration: 1.0
    });
  }

  // 3) Highlight and label only NEW layer
  const base = countryStyle(feature);
  layer.setStyle({
    color: base.color,
    weight: base.weight + 1,
    fillOpacity: 0.4
  });

  const countryName = feature.properties.name || 'Unknown';
  const labelPos = getMainCenter(layer);
  layer.bindTooltip(countryName, { sticky: true, direction: 'center' })
       .openTooltip(labelPos);

  // 4) Remember current selection
  lastSelectedLayer = layer;
}

function updateSearchSelection() {
  const items = searchResults.querySelectorAll('.search-item');
  items.forEach((el, i) => {
    el.classList.toggle('active', i === selectedIndex);
  });
}

function getMainPartLatLngs(layer) {
  const latlngs = layer.getLatLngs();

  // Simple Polygon
  if (!Array.isArray(latlngs[0])) {
    return latlngs;
  }

  // MultiPolygon-like: choose part with largest area
  let maxArea = 0;
  let mainPart = latlngs[0];

  latlngs.forEach(part => {
    const ring = Array.isArray(part[0]) ? part[0] : part;
    if (!ring || ring.length < 3) return;

    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const p1 = ring[i];
      const p2 = ring[(i + 1) % ring.length];
      area += (p1.lng * p2.lat) - (p2.lng * p1.lat);
    }
    area = Math.abs(area) / 2;

    if (area > maxArea) {
      maxArea = area;
      mainPart = ring;
    }
  });

  return mainPart;
}

function getMainBounds(layer) {
  const mainPart = getMainPartLatLngs(layer);
  const tempPoly = L.polygon(mainPart);
  return tempPoly.getBounds();
}

function getMainCenter(layer) {
  return getMainBounds(layer).getCenter();
}

searchInput.addEventListener('input', () => {
  if (currentMode !== 'search') return;
  renderSearchResults(searchInput.value);
});

// keyboard navigation on the input
searchInput.addEventListener('keydown', e => {
  if (currentMode !== 'search') return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (currentMatches.length === 0) return;
    selectedIndex = (selectedIndex + 1) % currentMatches.length;
    updateSearchSelection();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (currentMatches.length === 0) return;
    selectedIndex =
      (selectedIndex - 1 + currentMatches.length) % currentMatches.length;
    updateSearchSelection();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (selectedIndex === -1 && currentMatches.length > 0) {
      selectCountryFromSearch(0);
    } else {
      selectCountryFromSearch(selectedIndex);
    }
  }
});

function updateLabelVisibility() {
  const z = map.getZoom();

  // example thresholds – tweak these:
  const largeThreshold = 4_000_000;   // only very large countries
  const mediumThreshold = 1_500_000;  // medium and large
  const smallThreshold = 100_000;     // hide only very tiny ones

  countryLabels.forEach(({ size, marker }) => {
    let visible = true;

    if (z <= 2) {
      // very very zoomed out: only huge countries
      visible = size >= largeThreshold;
    } else if (z <= 4) {
      // very zoomed out: only large ountries
      visible = size >= mediumThreshold;
    } else if (z <= 5) {
      // a bit closer: hide really tiny ones
      visible = size >= smallThreshold;
    } else {
      // z >= 4: show everything
      visible = true;
    }

    if (visible) {
      if (!labelsLayer.hasLayer(marker)) labelsLayer.addLayer(marker);
    } else {
      if (labelsLayer.hasLayer(marker)) labelsLayer.removeLayer(marker);
    }
  });
}

map.on('zoomend', () => {
  if (showNameOnMap) updateLabelVisibility();
});

// after building labels and enabling "always show" mode:
updateLabelVisibility();
// ---- INTERACTION PER COUNTRY ----
function onEachCountry(feature, layer) {
  const name = feature.properties.name || 'Unknown';

  layer.on('mouseover', function () {
    const base = countryStyle(feature);
    layer.setStyle({
      color: base.color,
      weight: base.weight + 0.5,
      fillOpacity: 0.3
    });

    if (showNameOnHover) {
      layer.bindTooltip(name, { sticky: true }).openTooltip();
    }
  });

  layer.on('mouseout', function () {
    layer.setStyle(countryStyle(feature));
    if (showNameOnHover) {
      layer.closeTooltip();
    }
  });

  layer.on('click', function (e) {
    const rawIso2Prop =
      feature.properties['ISO3166-1-Alpha-2'] ||
      feature.properties.ISO_A2 ||
      '';
    const rawIso2 = isoOverrides[name] || rawIso2Prop;
    const iso2 = rawIso2.toLowerCase();

    const flagUrl = iso2 ? `https://flagcdn.com/${iso2}.svg` : '';

    const popupContent = `
      <div style="text-align:center;">
        <div>${name}</div>
        ${
          flagUrl
            ? `<div style="margin-top:4px;">
                 <img src="${flagUrl}" alt="${name} flag" class="flag-img" />
               </div>`
            : '<div style="margin-top:4px;">No flag available</div>'
        }
      </div>
    `;

    L.popup({
      maxWidth: 400,
      minWidth: 200
    })
      .setLatLng(e.latlng)
      .setContent(popupContent)
      .openOn(map);
  });
}

// ---- SETTINGS CONTROL (gear button) ----
let settingsOpen = false;

const settingsControl = L.control({ position: 'bottomleft' });

settingsControl.onAdd = function (map) {
  const container = L.DomUtil.create('div', 'settings-control leaflet-bar');

  const button = L.DomUtil.create('a', 'settings-button', container);
  button.href = '#';
  button.innerHTML = '⚙';

  L.DomEvent.disableClickPropagation(container);

  button.addEventListener('click', function (e) {
    e.preventDefault();
    toggleSettingsPanel();
  });

  return container;
};

settingsControl.addTo(map);

function toggleSettingsPanel() {
  settingsOpen = !settingsOpen;
  const panel = document.getElementById('settings-panel');
  if (!panel) return;
  if (settingsOpen) {
    panel.classList.add('open');
  } else {
    panel.classList.remove('open');
  }
}

// Close settings when clicking outside the panel and gear
map.getContainer().addEventListener('click', function (e) {
  const panel = document.getElementById('settings-panel');
  if (!panel) return;

  if (!panel.classList.contains('open')) return;

  const clickedInsidePanel = panel.contains(e.target);
  const clickedOnSettingsControl = e.target.closest('.settings-control') !== null;

  if (!clickedInsidePanel && !clickedOnSettingsControl) {
    panel.classList.remove('open');
    settingsOpen = false;
  }
});

// ---- SETTINGS HANDLERS ----
document.addEventListener('change', function (e) {
  // basemap radios
  if (e.target.name === 'basemap') {
    const value = e.target.value;

    if (value === 'streets') {
      isSatellite = false;
      if (map.hasLayer(baseSatellite)) map.removeLayer(baseSatellite);
      if (!map.hasLayer(baseStreets)) baseStreets.addTo(map);
    } else if (value === 'satellite') {
      isSatellite = true;
      if (map.hasLayer(baseStreets)) map.removeLayer(baseStreets);
      if (!map.hasLayer(baseSatellite)) baseSatellite.addTo(map);
    }

    if (countriesLayer) {
      countriesLayer.setStyle(countryStyle);
    }
  }

  const panel = document.getElementById('settings-panel');
  if (!panel) return;

  // if panel is not open, nothing to do
  if (!panel.classList.contains('open')) return;

  const clickedInsidePanel = panel.contains(e.target);
  const clickedOnSettingsControl = e.target.closest('.settings-control') !== null;

  // If click is outside panel AND outside gear button, close panel
  if (!clickedInsidePanel && !clickedOnSettingsControl) {
    panel.classList.remove('open');
    settingsOpen = false;
  }

  // random colors
  if (e.target.id === 'random-colors-toggle') {
    useRandomColors = e.target.checked;
    Object.keys(countryBorderColors).forEach(k => delete countryBorderColors[k]);
    if (countriesLayer) {
      countriesLayer.setStyle(countryStyle);
    }
  }

  if (e.target.name === 'label-mode') {
    const mode = e.target.value;

    // reset flags
    showNameOnHover = false;
    showNameOnMap = false;

    if (mode === 'hover') {
      showNameOnHover = true;
      if (labelsLayer && map.hasLayer(labelsLayer)) {
        map.removeLayer(labelsLayer);
      }
    } else if (mode === 'always') {
      showNameOnMap = true;
      if (labelsLayer && !map.hasLayer(labelsLayer)) {
        labelsLayer.addTo(map);
      }
      // run once immediately with current zoom
      updateLabelVisibility();
      
    } else if (mode === 'hide') {
      if (labelsLayer && map.hasLayer(labelsLayer)) {
        map.removeLayer(labelsLayer);
      }
    }

    // when turning off hover, close/unbind tooltips
    if (!showNameOnHover && countriesLayer) {
      countriesLayer.eachLayer(layer => {
        if (layer.closeTooltip) layer.closeTooltip();
        if (layer.unbindTooltip) layer.unbindTooltip();
      });
    }
  }
});