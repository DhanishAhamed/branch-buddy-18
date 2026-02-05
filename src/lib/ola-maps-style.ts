import { OLA_MAPS_API_KEY, OLA_MAPS_STYLE_URL } from "@/lib/ola-maps-config";

type AnyRecord = Record<string, any>;

function appendApiKey(url: string, apiKey: string) {
  if (!url || url.includes("api_key=")) return url;
  return url.includes("?") ? `${url}&api_key=${apiKey}` : `${url}?api_key=${apiKey}`;
}

/**
 * Fetches the Ola style JSON, sanitizes problematic 3D layers, and injects the API key
 * into all source/sprite/glyph URLs.
 *
 * Why this approach?
 * - Passing a style URL lets the SDK append api_key, but we also need to sanitize layers.
 * - If we create a blob URL, some SDK versions append api_key to it -> invalid URL.
 * - Passing a style *object* avoids any SDK URL mutation and keeps auth stable.
 */
export async function getOlaStyle(): Promise<AnyRecord> {
  const styleUrl = appendApiKey(OLA_MAPS_STYLE_URL, OLA_MAPS_API_KEY);

  const res = await fetch(styleUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch Ola style [${res.status}]`);
  }

  const style = (await res.json()) as AnyRecord;

  // Remove known-problematic 3D layers that can reference missing source-layers.
  if (Array.isArray(style.layers)) {
    style.layers = style.layers.filter((layer: AnyRecord) => {
      const sourceLayer = String(layer?.["source-layer"] ?? "");
      const id = String(layer?.id ?? "");
      const type = String(layer?.type ?? "");
      const is3DSourceLayer = sourceLayer === "3d_model" || sourceLayer === "3d_building";
      const is3DLayerId = id.includes("3d_model") || id.includes("3d_building") || id.includes("3d");
      const isFillExtrusion = type === "fill-extrusion";

      // Be conservative: drop explicit 3d source-layers; keep other normal layers.
      if (is3DSourceLayer) return false;
      // Some styles encode 3d buildings as fill-extrusion even when source-layer is missing.
      if (isFillExtrusion && is3DLayerId) return false;
      return true;
    });
  }

  // Inject api_key into tiles/source urls so all subsequent tile fetches authenticate.
  if (style.sources && typeof style.sources === "object") {
    for (const sourceId of Object.keys(style.sources)) {
      const source = style.sources[sourceId];
      if (!source || typeof source !== "object") continue;

      if (Array.isArray(source.tiles)) {
        source.tiles = source.tiles.map((t: string) => appendApiKey(String(t), OLA_MAPS_API_KEY));
      }
      if (typeof source.url === "string") {
        source.url = appendApiKey(source.url, OLA_MAPS_API_KEY);
      }
    }
  }

  if (typeof style.sprite === "string") {
    style.sprite = appendApiKey(style.sprite, OLA_MAPS_API_KEY);
  }
  if (typeof style.glyphs === "string") {
    style.glyphs = appendApiKey(style.glyphs, OLA_MAPS_API_KEY);
  }

  return style;
}

// Kept for compatibility with older imports (not recommended for new code)
export function getOlaStyleUrl(): string {
  return OLA_MAPS_STYLE_URL;
}

