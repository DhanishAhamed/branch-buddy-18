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
 * Some default styles may include 3D-related layers that reference source-layers
 * not present for all accounts/regions, which causes MapLibre to throw and the
 * map to render blank. We sanitize those layers to keep the base map working.
 */
export async function getOlaSanitizedStyle(): Promise<MapStyle | string> {
  try {
    const url = `${OLA_MAPS_STYLE_URL}?api_key=${OLA_MAPS_API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Style fetch failed: ${res.status}`);
    const style = (await res.json()) as MapStyle;

    if (Array.isArray(style.layers)) {
      style.layers = style.layers.filter((layer) => {
        const id = String(layer?.id ?? "");
        // Known problematic layers from Ola default styles
        if (id.includes("3d_model")) return false;
        if (id.includes("3d_building")) return false;
        return true;
      });
    }

    return style;
  } catch {
    // Fallback to URL style string; better than hard-failing.
    return `${OLA_MAPS_STYLE_URL}?api_key=${OLA_MAPS_API_KEY}`;
  }
}
