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
- **Adaptive country styling:**
  - Dark borders on the light map  
  - White borders on the satellite map, staying white consistently on hover and click  

The goal is not a full GIS toolkit, but a learning tool: a calm, visual way to explore the world and connect shapes on the map with country names and flags.

## Tech Stack

- **HTML / CSS / JavaScript**  
- **Leaflet.js** for the interactive map and popups  
- **GeoJSON** country polygons  
- **Flag CDN** (SVG flags by ISO 3166‑1 alpha‑2 code)  

No build step or framework is required; everything runs as plain static files in the browser.

## How It Works (High Level)

1. The page initializes a Leaflet map centered on the world.  
2. A GeoJSON file with all country polygons is loaded and added as a layer.  
3. Each polygon:
   - shows a tooltip with the country name on hover  
   - opens a popup on click with the country name and its flag  
4. Flags are loaded by constructing the CDN URL from the country’s ISO 2‑letter code.  
5. A small settings button (gear icon) opens a floating panel to switch between:
   - a light map background without labels  
   - a satellite background  
6. When switching to satellite, all country borders are restyled to white and stay white even on hover, so they remain clearly visible over imagery.

## Running Locally

You can run this project as a simple static site.

1. Clone or download the repository.
2. From the project folder, start a small HTTP server, for example:

   ```bash
   # Python 3
   python -m http.server 8000 --bind 0.0.0.0
   ```

3. Open in your browser:

   ```text
   http://localhost:8000
   ```

## Future Ideas

Some possible extensions:

- Show extra info in the popup (capital, region, population data, etc.)  
- Add a “practice mode” with random country prompts (“Find: …”)  
- Keyboard search to jump to a country by name  
- Progress tracking for learning all flags  

For now, the focus stays on the original idea: a simple, distraction‑free world map to explore and memorize countries and their flags.
