# learn-world-map-flag
# World Map Flags

An interactive world map to learn all countries and their flags by simple hovering and clicking.

Available published via: <https://fulopaphilip.github.io/learn-world-map-flag/>

## Motivation

I wanted to learn all the countries and flags in the world, but could not find a website that matched how I wanted to practice.  
Most sites are either cluttered with extra information, packed into quizzes with timers, or show long lists and tables instead of focusing on the map itself.

What I really wanted was something very simple:

- a clean world map  
- official country borders highlighted  
- when I hover over a country, I see its name  
- when I click on a country, I see its flag  

So this project is my own solution: a minimal, focused world map built with Leaflet where the interaction is just hover and click, without distractions.

## Features

- **Interactive world map** using [Leaflet](https://leafletjs.com)  
- **Country borders** drawn from GeoJSON (all official countries)  
- **Hover:** show the country name as a tooltip  
- **Click:** open a popup with the country name and its flag (SVG)  
- **Flags:** loaded dynamically from a flag CDN based on ISO country codes  
- **Responsive design:** works on desktop and mobile, with larger popups and flags on phones  
- **Two basemaps:**
  - Light “no labels” map background  
  - Satellite imagery background  
- **Settings panel:**
  - Gear icon control in the bottom‑left corner  
  - Simple popup panel to switch between map and satellite background  
- **Polylabel-based label placement** with centroid blending
- Optional random border colours mode to give each country a stable, unique outline colour.
- Option to always show country labels on the map, so names remain visible at all times.
- Switched to an npm/Vite build environment, bundling Leaflet, polylabel, and other dependencies for easier local development and deployment.

The goal is not a full GIS toolkit, but a learning tool: a calm, visual way to explore the world and connect shapes on the map with country names and flags.

## Tech Stack

- **HTML / CSS / JavaScript**  
- **Leaflet.js** for the interactive map and popups  
- **GeoJSON** country polygons  
- **Flag CDN** (SVG flags by ISO 3166‑1 alpha‑2 code)  

## Future Ideas

Some possible extensions:

- Show extra info in the popup (capital, region, population data, etc.)  
- Add a “practice mode” with random country prompts (“Find: …”)  
- Keyboard search to jump to a country by name  
- Progress tracking for learning all flags  

For now, the focus stays on the original idea: a simple, distraction‑free world map to explore and memorize countries and their flags.
