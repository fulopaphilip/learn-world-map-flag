const map = L.map('map', {
  minZoom: 1,
  maxZoom: 10
}).setView([20, 0], 2);

// Base: light, no labels
const baseStreets = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
  {
    maxZoom: 10,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }
);

// Satellite base (ESRI World Imagery)
const baseSatellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  }
);

baseStreets.addTo(map); // default background


// Load GeoJSON via fetch
fetch('countries.geojson')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: '#333',
        weight: 1,
        fillOpacity: 0.1
      },
      onEachFeature: onEachCountry
    }).addTo(map);
  });

const isoOverrides = {
  France: 'fr',
  Norway: 'no',
  Taiwan: 'tw',
  Kosovo: 'xk'
  // add more here if you ever find similar issues
};

function onEachCountry(feature, layer) {
  const name = feature.properties.name || 'Unknown';

  layer.on('mouseover', function () {
    const base = countryStyle(feature);
    layer.setStyle({
      color: base.color,                 // same white or dark as base
      weight: base.weight + 0.5,         // just a bit thicker on hover
      fillOpacity: 0.3
    });
    layer.bindTooltip(name, { sticky: true }).openTooltip();
  });

  layer.on('mouseout', function () {
    layer.setStyle(countryStyle(feature));  // reset to base (white on satellite)
    layer.closeTooltip();
  });

  // Click handler with popup (unchanged)
  layer.on('click', function (e) {
    const rawIso2Prop =
      feature.properties['ISO3166-1-Alpha-2'] ||
      feature.properties.ISO_A2 ||
      '';
    const rawIso2 = isoOverrides[name] || rawIso2Prop;
    const iso2 = rawIso2.toLowerCase();

    const flagUrl = iso2
      ? `https://flagcdn.com/${iso2}.svg`
      : '';

    const popupContent = `
      <div style="text-align:center;">
        <div>${name}</div>
        ${
          flagUrl
            ? `<div style="margin-top:4px;">
                 <img src="${flagUrl}" alt="${name} flag"
                      class="flag-img" />
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

// SETTINGS PANEL STATE
let settingsOpen = false;

// CUSTOM SETTINGS CONTROL (gear button)
const settingsControl = L.control({ position: 'bottomleft' });

settingsControl.onAdd = function (map) {
  const container = L.DomUtil.create('div', 'settings-control leaflet-bar');

  const button = L.DomUtil.create('a', 'settings-button', container);
  button.href = '#';
  button.innerHTML = '⚙'; // simple gear symbol; can replace with an SVG icon

  // prevent map from dragging when clicking the button
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
  if (settingsOpen) {
    panel.classList.add('open');
  } else {
    panel.classList.remove('open');
  }
}

// handle radio changes
document.addEventListener('change', function (e) {
  if (e.target.name === 'basemap') {
    const value = e.target.value;

    if (value === 'streets') {
      if (map.hasLayer(baseSatellite)) map.removeLayer(baseSatellite);
      if (!map.hasLayer(baseStreets)) baseStreets.addTo(map);
    } else if (value === 'satellite') {
      if (map.hasLayer(baseStreets)) map.removeLayer(baseStreets);
      if (!map.hasLayer(baseSatellite)) baseSatellite.addTo(map);
    }
  }
});

let isSatellite = false;
let countriesLayer = null;

document.addEventListener('change', function (e) {
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
});

fetch('countries.geojson')
  .then(response => response.json())
  .then(data => {
    countriesLayer = L.geoJSON(data, {
      style: countryStyle,
      onEachFeature: onEachCountry
    }).addTo(map);
  });

function countryStyle(feature) {
  return {
    color: isSatellite ? '#ffffff' : '#333333',  // white on satellite
    weight: isSatellite ? 1 : 1,
    fillOpacity: 0.1
  };
}