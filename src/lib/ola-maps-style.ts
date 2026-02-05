import { OLA_MAPS_API_KEY, OLA_MAPS_STYLE_URL } from "@/lib/ola-maps-config";

/**
  * Returns the Ola Maps style URL for use with the SDK.
  * 
  * IMPORTANT: Do NOT manually append api_key to the URL.
  * The Ola Maps SDK handles authentication automatically when you pass
  * the apiKey in the OlaMaps constructor. Manually appending the key
  * causes duplicate parameters (api_key=...&api_key=...) which results
  * in 403 Forbidden errors.
 */
 export function getOlaStyleUrl(): string {
   // Return the raw style URL without any api_key parameter.
   // The SDK will append authentication automatically.
   return OLA_MAPS_STYLE_URL;
}

