const map = L.map('map', {
  minZoom: 1,
  maxZoom: 10
}).setView([20, 0], 2);

let isSatellite = false;
let useRandomColors = false;
let showNameOnHover = false;
let countriesLayer = null;
let showNameOnMap = false;     // new setting, off by default
let labelsLayer = null;        // layer to hold text labels

// name → random border color
const countryBorderColors = {};

const isoOverrides = {
  // add more here if you ever find similar issues
};

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


fetch('countries.geojson')
  .then(response => response.json())
  .then(data => {
    countriesLayer = L.geoJSON(data, {
      style: countryStyle,
      onEachFeature: onEachCountry
    }).addTo(map);

    // build label markers for each country (but don't add yet)
    labelsLayer = L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        // this function is only used for point geometries, so we instead
        // compute the center from polygons below
        return L.marker(latlng);
      },
      onEachFeature: function (feature, layer) {
        // not used here; we'll create markers manually for polygons
      }
    });

    // manually add markers at polygon centroids
    labelsLayer = L.layerGroup();

    L.geoJSON(data, {
        onEachFeature: function (feature, layer) {
            const name = feature.properties.name || 'Unknown';

            // compute center based on largest polygon only
            const center = getMainPolygonCenter(feature);

            if (!center) return;

            const label = L.marker(center, {
            icon: L.divIcon({
                className: 'country-label',
                html: `<div class="country-label-text">${name}</div>`,
                iconSize: null
            })
            });

            labelsLayer.addLayer(label);
        }
    });
  });

function getMainPolygonCenter(feature) {
  const geom = feature.geometry;
  if (!geom) return null;

  // coordinates structure depends on type:
  // Polygon:        [ [ [lng, lat], ... ] ]
  // MultiPolygon:   [ [ [ [lng, lat], ... ] ], ... ]
  let polygons = [];

  if (geom.type === 'Polygon') {
    polygons = [geom.coordinates];
  } else if (geom.type === 'MultiPolygon') {
    polygons = geom.coordinates;
  } else {
    return null;
  }

  // Find polygon with largest area (rough approximation on lat/lng)
  let maxArea = 0;
  let mainPoly = null;

  polygons.forEach(coords => {
    const area = polygonArea(coords[0]); // outer ring
    if (area > maxArea) {
      maxArea = area;
      mainPoly = coords[0];
    }
  });

  if (!mainPoly) return null;

  // Compute simple centroid of the chosen ring
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  mainPoly.forEach(pt => {
    const lng = pt[0];
    const lat = pt[1];
    sumLat += lat;
    sumLng += lng;
    count += 1;
  });

  if (count === 0) return null;

  const centerLat = sumLat / count;
  const centerLng = sumLng / count;

  return L.latLng(centerLat, centerLng);
}

// Rough polygon area on lat/lng (shoelace formula)
function polygonArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    area += (x1 * y2 - x2 * y1);
  }
  return Math.abs(area / 2);
}

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
      countriesLayer.setStyle(countryStyle);  // <- recompute white/dark borders
    }
  }

//random colors toggle
    if (e.target.id === 'random-colors-toggle') {
  useRandomColors = e.target.checked;

  // reset cache so each enable gives a consistent new set if you want
  Object.keys(countryBorderColors).forEach(k => delete countryBorderColors[k]);

  if (countriesLayer) {
    countriesLayer.setStyle(countryStyle);
  }
}
    if (e.target.id === 'hover-names-toggle') {
    showNameOnHover = e.target.checked;

    if (!showNameOnHover && countriesLayer) {
      // close + unbind tooltips on all layers
      countriesLayer.eachLayer(function (layer) {
        if (layer.closeTooltip) {
          layer.closeTooltip();
        }
        if (layer.unbindTooltip) {
          layer.unbindTooltip();
        }
      });
    }
  }
  if (e.target.id === 'map-names-toggle') {
    showNameOnMap = e.target.checked;

    if (labelsLayer) {
      if (showNameOnMap) {
        labelsLayer.addTo(map);
      } else {
        map.removeLayer(labelsLayer);
      }
    }
  }
});

function countryStyle(feature) {
  return {
    color: isSatellite ? '#ffffff' : '#333333',  // white on satellite
    weight: isSatellite ? 1 : 1,
    fillOpacity: 0.1
  };
}

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
    // random color for both map types
    color = getRandomBorderColor(name);
  } else {
    // fixed colors: white on satellite, dark on normal
    color = isSatellite ? '#ffffff' : '#333333';
  }

  return {
    color: color,
    weight: 1,
    fillOpacity: 0.1
  };
}