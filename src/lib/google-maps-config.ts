// Google Maps Configuration
// IMPORTANT: Replace with your own API key from Google Cloud Console
// Required APIs: Maps JavaScript API, Places API
// Set up domain restrictions for *.lovable.app in production
export const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

// Default map center (Calicut, Kerala)
export const DEFAULT_CENTER = { lat: 11.2588, lng: 75.7804 };
export const DEFAULT_ZOOM = 12;

// Map libraries to load
export const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = [
  'places',
  'geometry',
];
