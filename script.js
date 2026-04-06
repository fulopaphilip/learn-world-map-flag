const map = L.map('map', {
  minZoom: 1,
  maxZoom: 10   // allow closer zoom
}).setView([20, 0], 2);

// Add a base tile layer (OpenStreetMap)
L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
  {
    maxZoom: 6,
    attribution:
      '&copy; OpenStreetMap contributors &copy; CARTO'
  }
).addTo(map);

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

  if (name === 'France') {
    console.log('France feature properties:', feature.properties);
  }

  // Hover: highlight + tooltip
  layer.on('mouseover', function () {
    layer.setStyle({
      weight: 2,
      color: '#ffcc00',
      fillOpacity: 0.3
    });
    layer.bindTooltip(name, { sticky: true }).openTooltip();
  });

  layer.on('mouseout', function () {
    layer.setStyle({
      weight: 1,
      color: '#333',
      fillOpacity: 0.1
    });
    layer.closeTooltip();
  });

  // Click: popup with flag
  layer.on('click', function (e) {
      const rawIso2Prop =
    feature.properties['ISO3166-1-Alpha-2'] ||
    feature.properties.ISO_A2 ||
    '';

  const rawIso2 = isoOverrides[name] || rawIso2Prop;
  const iso2 = rawIso2.toLowerCase();

  const flagUrl = iso2
    ? `https://flagcdn.com/h40/${iso2}.png`
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

  L.popup()
    .setLatLng(e.latlng)
    .setContent(popupContent)
    .openOn(map);
  });
}
