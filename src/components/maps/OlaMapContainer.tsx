import { useEffect, useRef, useState } from "react";
import { OlaMaps } from "olamaps-web-sdk";
import { OLA_MAPS_API_KEY, DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/ola-maps-config";
import { getOlaSanitizedStyle } from "@/lib/ola-maps-style";

interface OlaMapContainerProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  onMapReady?: (map: any, olaMaps: OlaMaps) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  className?: string;
}

export function OlaMapContainer({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  onMapReady,
  onMapClick,
  className = "w-full h-full",
}: OlaMapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const olaMapsRef = useRef<OlaMaps | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initMap = async () => {
      try {
        console.log("[OlaMapContainer] Initializing map...");
        console.log("[OlaMapContainer] API Key:", OLA_MAPS_API_KEY ? "Present" : "Missing");
        console.log(
          "[OlaMapContainer] Container dimensions:",
          mapContainerRef.current?.offsetWidth,
          "x",
          mapContainerRef.current?.offsetHeight,
        );

        const olaMaps = new OlaMaps({
          apiKey: OLA_MAPS_API_KEY,
        });
        olaMapsRef.current = olaMaps;

        const style = await getOlaSanitizedStyle();
        console.log("[OlaMapContainer] Style type:", typeof style);

        const map = await olaMaps.init({
          style,
          container: mapContainerRef.current!,
          center: center,
          zoom: zoom,
        });

        mapRef.current = map;
        console.log("[OlaMapContainer] Map instance created");

        map.on("load", () => {
          console.log("[OlaMapContainer] Map loaded successfully");
          setIsLoaded(true);

          // Trigger a resize to ensure proper rendering
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.resize();
              console.log("[OlaMapContainer] Map resized");
            }
          }, 100);

          if (onMapReady) {
            onMapReady(map, olaMaps);
          }
        });

        map.on("error", (e: any) => {
          console.error("[OlaMapContainer] Map error:", e);
          setError(e?.message || "Map loading error");
        });

        if (onMapClick) {
          map.on("click", (e: any) => {
            onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
          });
        }
      } catch (err) {
        console.error("[OlaMapContainer] Initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize map");
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        console.log("[OlaMapContainer] Cleaning up map");
        mapRef.current.remove();
        mapRef.current = null;
        olaMapsRef.current = null;
      }
    };
  }, []);

  // Resize map when container becomes visible or changes size
  useEffect(() => {
    if (!mapContainerRef.current || !mapRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        requestAnimationFrame(() => {
          mapRef.current?.resize();
        });
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLoaded]);

  // Update center when prop changes
  useEffect(() => {
    if (mapRef.current && isLoaded) {
      mapRef.current.flyTo({
        center: center,
        zoom: zoom,
        duration: 1000,
      });
    }
  }, [center, zoom, isLoaded]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/50 text-destructive`}>
        <div className="text-center p-4">
          <p className="font-medium">Map failed to load</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className={className} style={{ minHeight: "200px" }} />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="animate-pulse text-muted-foreground">Loading map...</div>
        </div>
      )}
    </div>
  );
}
