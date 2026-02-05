
# Fix Ola Maps Rendering & Adjust Map Height

## Summary
The map shows markers and Ola branding but the **actual map tiles are not rendering** because:

1. **Blob URL is being appended with API key** - The current code creates a blob URL for the sanitized style, but later code or the SDK appends `?api_key=...` to it, resulting in an invalid URL like `blob:https://..../uuid?api_key=xyz` that cannot be fetched (ERR_FILE_NOT_FOUND).
2. **Circle layers are added before map style finishes loading** - The code tries to add GeoJSON sources/layers immediately after `olaMaps.init()` resolves instead of waiting for the `map.on("load")` event to fire.

Additionally, the map height should **fill the left panel** (not overflow or require scrolling).

---

## Root Cause Analysis

```text
Console log trace:
1. Style fetched and Blob URL created successfully
2. olaMaps.init({style: blobUrl, ...}) called
3. Map instance created  (before tiles are fully loaded)
4. updateRadiusCircle() called immediately via effects
   -> ERROR: Style is not done loading
5. SDK internally tries to fetch: blobUrl?api_key=... -> ERR_FILE_NOT_FOUND
```

The Ola SDK internally augments any style URL with the API key. For blob URLs this produces an invalid path.

---

## Proposed Solution

### 1. Embed the API key inside the style JSON
Instead of returning a plain blob URL, we modify the style sources to include authenticated tile URLs directly, so the SDK does not need to append the key.

### 2. Wait for the map `load` event before adding layers
All code that calls `addSource` / `addLayer` (the radius circle) must run **only** after the `map.on("load")` callback fires.

### 3. Ensure stable map container height
Use `min-h-0` plus `flex-1` to let the map container fill remaining space in a flex column layout without overflowing.

---

## Technical Details

### File Changes

| File | Change |
|------|--------|
| `src/lib/ola-maps-style.ts` | Inline the API key into tile source URLs inside the style JSON. Return a data URI or pre-authenticated blob so the SDK no longer adds `?api_key` to the blob. |
| `src/pages/MapSearch.tsx` | 1. Move `updateRadiusCircle()` and `updatePropertyMarkers()` calls into the `map.on("load")` callback. 2. Introduce a `mapLoaded` state to guard subsequent effect-based updates. 3. Adjust container CSS to ensure full-height fill. |
| `src/components/maps/OlaMapContainer.tsx` | Apply the same `onLoad` guarding pattern for any layer additions. |
| `src/components/properties/PropertyLocationPicker.tsx` | Ensure resize only happens after style is fully loaded (already mostly correct). |

---

### Code Highlights

**ola-maps-style.ts (updated logic)**
```typescript
// After sanitizing layers, inject api_key into tile URLs so SDK doesn't need to augment
if (style.sources) {
  for (const sourceId of Object.keys(style.sources)) {
    const source = style.sources[sourceId];
    if (source.tiles && Array.isArray(source.tiles)) {
      source.tiles = source.tiles.map((tileUrl: string) =>
        tileUrl.includes("?") ? `${tileUrl}&api_key=${OLA_MAPS_API_KEY}` : `${tileUrl}?api_key=${OLA_MAPS_API_KEY}`
      );
    }
    if (source.url && typeof source.url === "string") {
      source.url = source.url.includes("?")
        ? `${source.url}&api_key=${OLA_MAPS_API_KEY}`
        : `${source.url}?api_key=${OLA_MAPS_API_KEY}`;
    }
  }
}
// Also update sprite/glyphs if present
if (style.sprite && typeof style.sprite === "string") {
  style.sprite = style.sprite.includes("?")
    ? `${style.sprite}&api_key=${OLA_MAPS_API_KEY}`
    : `${style.sprite}?api_key=${OLA_MAPS_API_KEY}`;
}
if (style.glyphs && typeof style.glyphs === "string") {
  style.glyphs = style.glyphs.includes("?")
    ? `${style.glyphs}&api_key=${OLA_MAPS_API_KEY}`
    : `${style.glyphs}?api_key=${OLA_MAPS_API_KEY}`;
}
// Create blob URL (SDK will no longer need to mutate it)
const blob = new Blob([JSON.stringify(style)], { type: "application/json" });
return URL.createObjectURL(blob);
```

**MapSearch.tsx (guarded layer additions)**
```typescript
// Add new state
const [mapLoaded, setMapLoaded] = useState(false);

// Inside initMap, after `olaMaps.init`:
map.on("load", () => {
  console.log("[MapSearch] Map fully loaded");
  setMapLoaded(true);
  updateCenterMarker();
  updateRadiusCircle();
  updatePropertyMarkers();
});

// Guard effects:
useEffect(() => {
  if (!mapLoaded || !mapRef.current) return;
  updateRadiusCircle();
}, [radius, mapLoaded]);
```

**Container height CSS**
```tsx
// Left panel wrapper
<div className="w-full md:w-1/2 lg:w-2/5 flex flex-col h-full min-h-0">
  {/* Filters card - shrink-0 */}
  <Card className="m-4 mb-0 shrink-0 ...">
  {/* Map fills remaining space */}
  <div className="flex-1 m-4 rounded-xl overflow-hidden border min-h-0">
    <div ref={mapContainerRef} className="h-full w-full" />
  </div>
</div>
```

---

## Outcome
After these changes:
- The map tiles will render correctly because tile/source URLs already contain the API key.
- The radius circle and markers will only be added after MapLibre finishes loading the style.
- The map container will fill the available left-panel height without overflow.

