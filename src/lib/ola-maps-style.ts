import { OLA_MAPS_API_KEY, OLA_MAPS_STYLE_URL } from "@/lib/ola-maps-config";

/**
 * Appends api_key query parameter to a URL if not already present
 */
function appendApiKey(url: string): string {
  if (!url || typeof url !== "string") return url;
  if (url.includes("api_key=")) return url;
  return url.includes("?") ? `${url}&api_key=${OLA_MAPS_API_KEY}` : `${url}?api_key=${OLA_MAPS_API_KEY}`;
}

type MapStyle = {
  version?: number;
  name?: string;
  sources?: Record<string, any>;
  layers?: any[];
  [key: string]: any;
};

/**
 * Ola Maps styles are MapLibre-compatible style JSON.
 * The SDK automatically handles authentication, so we just need to provide
 * the base style URL. We sanitize problematic 3D layers that can cause
 * rendering issues.
 */
export async function getOlaSanitizedStyle(): Promise<string> {
  try {
    // SDK handles auth automatically, but for fetching we need the key
    const url = `${OLA_MAPS_STYLE_URL}?api_key=${OLA_MAPS_API_KEY}`;
    console.log("[OlaMaps] Fetching style from:", OLA_MAPS_STYLE_URL);

    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error("[OlaMaps] Style fetch failed:", res.status, res.statusText);
      throw new Error(`Style fetch failed: ${res.status}`);
    }

    const style = (await res.json()) as MapStyle;
    console.log("[OlaMaps] Style loaded successfully, version:", style.version);

    if (Array.isArray(style.layers)) {
      const originalCount = style.layers.length;
      style.layers = style.layers.filter((layer) => {
        const id = String(layer?.id ?? "");
        // Known problematic layers from Ola default styles
        if (id.includes("3d_model")) return false;
        if (id.includes("3d_building")) return false;
        return true;
      });
      console.log("[OlaMaps] Filtered layers:", originalCount, "->", style.layers.length);
    }

    // Inject api_key into all tile/source URLs so the SDK doesn't need to append it
    // This prevents the SDK from breaking our blob URL by appending ?api_key=...
    if (style.sources) {
      for (const sourceId of Object.keys(style.sources)) {
        const source = style.sources[sourceId];
        if (source.tiles && Array.isArray(source.tiles)) {
          source.tiles = source.tiles.map((tileUrl: string) => appendApiKey(tileUrl));
        }
        if (source.url && typeof source.url === "string") {
          source.url = appendApiKey(source.url);
        }
      }
    }

    // Also update sprite and glyphs URLs
    if (style.sprite && typeof style.sprite === "string") {
      style.sprite = appendApiKey(style.sprite);
    }
    if (style.glyphs && typeof style.glyphs === "string") {
      style.glyphs = appendApiKey(style.glyphs);
    }

    console.log("[OlaMaps] API keys injected into style sources");

    // Convert to blob URL for the SDK
    const blob = new Blob([JSON.stringify(style)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    return blobUrl;
  } catch (error) {
    console.error("[OlaMaps] Style loading error:", error);
    // Fallback to URL style string with API key; the SDK will use this
    return `${OLA_MAPS_STYLE_URL}?api_key=${OLA_MAPS_API_KEY}`;
  }
}

export function revokeOlaSanitizedStyleUrl(styleUrl: string | null | undefined) {
  if (!styleUrl) return;
  if (styleUrl.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(styleUrl);
    } catch {
      // ignore
    }
  }
}
