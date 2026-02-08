

# Plan: Replace Ola Maps with Google Maps

## Overview
Replace the current Ola Maps integration with Google Maps while preserving all existing functionality including map display, markers, radius circles, place autocomplete, and click-to-select location.

---

## Current Ola Maps Usage

| Component | Functionality |
|-----------|---------------|
| `MapSearch.tsx` | Main map search page with property markers, radius circle, place autocomplete, filters |
| `PropertyLocationPicker.tsx` | Location picker for adding/editing properties with draggable marker |
| `OlaMapContainer.tsx` | Reusable map container component |
| `use-ola-autocomplete.tsx` | Hook for place autocomplete |
| `ola-maps-config.ts` | API key and config constants |
| `ola-maps-style.ts` | Style fetching and sanitization |

---

## Implementation Steps

### Step 1: Install Google Maps Dependencies
Remove Ola Maps packages and add Google Maps React library:
- Remove: `olamaps-web-sdk`, `maplibre-gl`
- Add: `@react-google-maps/api` (official React wrapper for Google Maps)

### Step 2: Create Google Maps Configuration
Replace `src/lib/ola-maps-config.ts` with `src/lib/google-maps-config.ts`:
- Store Google Maps API key
- Define default center coordinates
- Define default zoom level

### Step 3: Create Google Maps Provider Component
Create `src/components/maps/GoogleMapsProvider.tsx`:
- Wrap the app with `LoadScript` or use `useJsApiLoader` hook
- Load required libraries: `places`, `geometry`
- Handle loading and error states

### Step 4: Create Google Map Container Component
Replace `src/components/maps/OlaMapContainer.tsx` with `GoogleMapContainer.tsx`:
- Use `GoogleMap` component from `@react-google-maps/api`
- Support `center`, `zoom`, `onMapReady`, `onMapClick` props
- Handle map resize and responsive behavior

### Step 5: Create Google Places Autocomplete Hook
Replace `src/hooks/use-ola-autocomplete.tsx` with `use-google-autocomplete.tsx`:
- Use Google Places Autocomplete Service
- Return predictions with place details
- Support location biasing

### Step 6: Update MapSearch Page
Update `src/pages/MapSearch.tsx`:
- Replace Ola Maps initialization with Google Maps
- Use `Marker` component for property markers and center marker
- Use `Circle` component for radius visualization
- Use `InfoWindow` for property popups
- Replace autocomplete API calls with Google Places API

### Step 7: Update PropertyLocationPicker
Update `src/components/properties/PropertyLocationPicker.tsx`:
- Use Google Maps components
- Implement draggable marker with `Marker` component
- Use Google Places Autocomplete for search

### Step 8: Update Main Entry Point
Update `src/main.tsx`:
- Remove MapLibre CSS import
- Add GoogleMapsProvider wrapper if using global provider approach

### Step 9: Clean Up Old Files
Delete Ola Maps specific files:
- `src/lib/ola-maps-config.ts`
- `src/lib/ola-maps-style.ts`
- `src/components/maps/OlaMapContainer.tsx` (replaced)
- `src/hooks/use-ola-autocomplete.tsx` (replaced)

---

## Technical Details

### New File Structure

```text
src/
├── lib/
│   └── google-maps-config.ts          # API key, defaults
├── components/
│   └── maps/
│       └── GoogleMapContainer.tsx     # Reusable map component
├── hooks/
│   └── use-google-autocomplete.tsx    # Places autocomplete hook
└── pages/
    └── MapSearch.tsx                  # Updated to use Google Maps
```

### Key Component Mappings

| Ola Maps | Google Maps (@react-google-maps/api) |
|----------|--------------------------------------|
| `OlaMaps.init()` | `<GoogleMap>` component |
| `olaMaps.addMarker()` | `<Marker>` component |
| `olaMaps.addPopup()` | `<InfoWindow>` component |
| `map.addSource() + map.addLayer()` | `<Circle>` component |
| `map.flyTo()` | `map.panTo()` + `map.setZoom()` |
| Autocomplete API fetch | `google.maps.places.AutocompleteService` |

### API Key Handling
The Google Maps API key will be stored in `google-maps-config.ts`. Since this is a frontend map that requires a public API key, it's acceptable to include it in the codebase (similar to the current Ola Maps setup). For production, you should:
- Restrict the API key to specific domains in Google Cloud Console
- Enable only the required APIs (Maps JavaScript API, Places API)

---

## Risk Considerations

1. **API Key Required**: You'll need a Google Cloud Platform account with billing enabled and the Maps JavaScript API + Places API enabled
2. **Usage Costs**: Google Maps has a pricing model - first $200/month is free, then pay-per-use
3. **Domain Restrictions**: Configure API key restrictions in Google Cloud Console for security

---

## Testing Checklist
After implementation:
- [ ] Map loads and displays correctly on MapSearch page
- [ ] Place autocomplete returns suggestions when typing
- [ ] Selecting a place centers the map and shows radius circle
- [ ] Property markers display with correct colors
- [ ] Clicking a marker shows property info popup
- [ ] Radius slider updates the circle visualization
- [ ] PropertyLocationPicker shows map and allows click/drag to set location
- [ ] Dragging the marker updates the coordinates
- [ ] Search in PropertyLocationPicker works

