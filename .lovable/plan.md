

# Plan: Replace Google Maps with Ola Maps (using MapLibre GL JS directly)

## Root Cause of Previous Failure
The previous attempt used the `olamaps-web-sdk` npm package, which internally bundles a specific version of MapLibre GL. This caused the `Rt is not defined` error due to minification/bundler conflicts with Vite. 

## New Approach
Use **MapLibre GL JS** directly (stable, well-maintained) with Ola Maps as the tile provider. This avoids the problematic SDK entirely while giving us full control over initialization and the `transformRequest` pattern for API key injection.

---

## What Changes

### Dependencies
- **Remove**: `@react-google-maps/api`
- **Add**: `maplibre-gl` (v4.7.1 -- compatible, stable)

### Files to Create

1. **`src/lib/ola-maps-config.ts`** -- API key + default center/zoom constants
   - API key: `rfnYaNtWg4FACoTMxP3dl8K1WPsB7F6spoqsytwU`
   - Style URL: `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json`
   - Default center: Calicut (11.2588, 75.7804)

2. **`src/components/maps/OlaMapContainer.tsx`** -- Reusable map wrapper
   - Uses `maplibregl.Map` directly
   - `transformRequest` callback appends `api_key` to all Ola tile/sprite/glyph URLs
   - Exposes `onMapReady` callback with the map instance
   - Handles loading and error states

### Files to Update

3. **`src/pages/MapSearch.tsx`** -- Full rewrite of map logic
   - Initialize map via MapLibre + Ola tiles
   - Markers: use `maplibregl.Marker` with custom colored elements
   - Radius circle: use GeoJSON source + fill/line layers (via `@turf/turf` circle, already installed)
   - Popups: use `maplibregl.Popup`
   - Autocomplete: call Ola Maps Places Autocomplete REST API (`https://api.olamaps.io/places/v1/autocomplete`)
   - All existing filters (type, price, radius slider) preserved
   - Property cards panel on the right preserved

4. **`src/components/properties/PropertyLocationPicker.tsx`** -- Location picker
   - MapLibre map with click-to-place marker
   - Draggable marker via mousedown/mousemove handlers
   - Ola Places Autocomplete for search
   - Same UX: search bar, map, coordinates display, clear button

5. **`src/main.tsx`** -- Add MapLibre CSS import
   - `import 'maplibre-gl/dist/maplibre-gl.css'`

### Files to Delete
- `src/lib/google-maps-config.ts`
- `src/components/maps/GoogleMapsProvider.tsx`
- `src/components/maps/GoogleMapContainer.tsx`
- `src/hooks/use-google-autocomplete.tsx`

---

## Technical Details

### Map Initialization Pattern (avoids the Rt error)
```text
import maplibregl from 'maplibre-gl';

const map = new maplibregl.Map({
  container: containerRef,
  style: STYLE_URL,
  center: [lng, lat],
  zoom: 12,
  transformRequest: (url, resourceType) => {
    // Append api_key to all Ola Maps requests
    if (url.includes('api.olamaps.io')) {
      const separator = url.includes('?') ? '&' : '?';
      return { url: `${url}${separator}api_key=${API_KEY}` };
    }
    return { url };
  },
});
```

### Autocomplete via REST API (no SDK needed)
```text
GET https://api.olamaps.io/places/v1/autocomplete
  ?input={query}
  &api_key={API_KEY}
  &location={lat},{lng}
```

### Radius Circle via Turf.js
```text
import * as turf from '@turf/turf';

const circleGeoJSON = turf.circle([lng, lat], radiusKm, { units: 'kilometers' });
map.getSource('radius').setData(circleGeoJSON);
```

### Marker Colors
- Center marker: green (#22C55E)
- Property markers: blue (#3B82F6), green when selected
- Created via DOM elements styled with CSS

---

## Testing Checklist
After implementation:
- Map loads with Ola tiles (no Rt error, no 403)
- Place autocomplete returns suggestions
- Selecting a place centers map and shows radius circle
- Property markers display with correct colors
- Clicking a marker shows popup with title and price
- Radius slider updates the circle
- PropertyLocationPicker allows click/drag to set location
- Search in PropertyLocationPicker works

