// Ola Maps Configuration using MapLibre GL JS
export const OLA_MAPS_API_KEY =
  import.meta.env.VITE_OLA_MAPS_API_KEY ||
  'rfnYaNtWg4FACoTMxP3dl8K1WPsB7F6spoqsytwU';

export const OLA_STYLE_URL =
  'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json';

export const OLA_AUTOCOMPLETE_URL =
  'https://api.olamaps.io/places/v1/autocomplete';

// Default map center (Calicut, Kerala)
export const DEFAULT_CENTER = { lat: 11.2588, lng: 75.7804 };
export const DEFAULT_ZOOM = 12;
