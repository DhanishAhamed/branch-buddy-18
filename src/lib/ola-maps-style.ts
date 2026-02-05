import { OLA_MAPS_API_KEY, OLA_MAPS_STYLE_URL } from "@/lib/ola-maps-config";

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
export async function getOlaSanitizedStyle(): Promise<MapStyle | string> {
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

    return style;
  } catch (error) {
    console.error("[OlaMaps] Style loading error:", error);
    // Fallback to URL style string with API key; the SDK will use this
    return `${OLA_MAPS_STYLE_URL}?api_key=${OLA_MAPS_API_KEY}`;
  }
}
