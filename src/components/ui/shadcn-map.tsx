"use client";

import React, {
  useRef,
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import {
  Plus,
  Minus,
  Locate,
  Layers,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Context for sharing map instance
interface MapContextValue {
  map: maplibregl.Map | null;
}

const MapContext = createContext<MapContextValue>({ map: null });

function useMap() {
  return useContext(MapContext);
}

// Map styles
const MAP_STYLES = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  satellite: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
};

// Main Map component
export function Map({
  children,
  className,
  center = [-106.485, 31.7619],
  zoom = 10,
  style,
  minZoom = 1,
  maxZoom = 20,
  interactive = true,
  onLoad,
  onMove,
  onClick,
}: {
  children?: ReactNode;
  className?: string;
  center?: [number, number];
  zoom?: number;
  style?: "dark" | "light" | "satellite";
  minZoom?: number;
  maxZoom?: number;
  interactive?: boolean;
  onLoad?: (map: maplibregl.Map) => void;
  onMove?: (center: [number, number], zoom: number) => void;
  onClick?: (lngLat: { lng: number; lat: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const { resolvedTheme } = useTheme();

  const mapStyle =
    style || (resolvedTheme === "dark" ? "dark" : "light");

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[mapStyle] || MAP_STYLES.dark,
      center,
      zoom,
      minZoom,
      maxZoom,
      interactive,
      attributionControl: false,
    });

    map.on("load", () => {
      mapRef.current = map;
      setMapInstance(map);
      onLoad?.(map);
    });

    map.on("moveend", () => {
      const c = map.getCenter();
      onMove?.([c.lng, c.lat], map.getZoom());
    });

    map.on("click", (e) => {
      onClick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

  return (
    <MapContext.Provider value={{ map: mapInstance }}>
      <div className={cn("relative h-full w-full overflow-hidden rounded-lg", className)}>
        <div ref={containerRef} className="absolute inset-0" />
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
}

// MapMarker
export function MapMarker({
  children,
  lng,
  lat,
  anchor = "bottom",
}: {
  children?: ReactNode;
  lng: number;
  lat: number;
  anchor?: "center" | "top" | "bottom" | "left" | "right";
}) {
  const { map } = useMap();
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(document.createElement("div"));

  useEffect(() => {
    if (!map) return;

    const marker = new maplibregl.Marker({
      element: containerRef.current,
      anchor,
    })
      .setLngLat([lng, lat])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
    };
  }, [map, lng, lat, anchor]);

  return (
    <div ref={(el) => { if (el) containerRef.current = el; }} className="relative">
      {children || (
        <div className="h-4 w-4 rounded-full border-2 border-white bg-orange-500 shadow-lg" />
      )}
    </div>
  );
}

// MarkerContent
export function MarkerContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {children}
    </div>
  );
}

// MarkerPopup
export function MarkerPopup({
  children,
  className,
  show = true,
}: {
  children: ReactNode;
  className?: string;
  show?: boolean;
}) {
  if (!show) return null;
  return (
    <div
      className={cn(
        "absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border border-white/10 bg-black/90 p-3 text-sm text-white shadow-xl backdrop-blur-sm",
        className
      )}
    >
      {children}
      <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-black/90" />
    </div>
  );
}

// MarkerTooltip
export function MarkerTooltip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white/70",
        className
      )}
    >
      {children}
    </div>
  );
}

// MarkerLabel
export function MarkerLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-1 whitespace-nowrap text-center text-[10px] font-medium text-white/60",
        className
      )}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </div>
  );
}

// MapControls
export function MapControls({
  className,
  showZoom = true,
  showLocate = true,
  showLayers = false,
  showFullscreen = false,
}: {
  className?: string;
  showZoom?: boolean;
  showLocate?: boolean;
  showLayers?: boolean;
  showFullscreen?: boolean;
}) {
  const { map } = useMap();

  const handleZoomIn = useCallback(() => map?.zoomIn(), [map]);
  const handleZoomOut = useCallback(() => map?.zoomOut(), [map]);
  const handleLocate = useCallback(() => {
    if (!map) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }, [map]);

  const btnClass =
    "flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-black/80 text-white/60 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm";

  return (
    <div className={cn("absolute right-3 top-3 z-10 flex flex-col gap-1", className)}>
      {showZoom && (
        <>
          <button className={btnClass} onClick={handleZoomIn}>
            <Plus size={14} />
          </button>
          <button className={btnClass} onClick={handleZoomOut}>
            <Minus size={14} />
          </button>
        </>
      )}
      {showLocate && (
        <button className={btnClass} onClick={handleLocate}>
          <Locate size={14} />
        </button>
      )}
      {showLayers && (
        <button className={btnClass}>
          <Layers size={14} />
        </button>
      )}
      {showFullscreen && (
        <button className={btnClass}>
          <Maximize2 size={14} />
        </button>
      )}
    </div>
  );
}

// MapPopup
export function MapPopup({
  children,
  className,
  lng,
  lat,
  show = true,
  onClose,
}: {
  children: ReactNode;
  className?: string;
  lng: number;
  lat: number;
  show?: boolean;
  onClose?: () => void;
}) {
  const { map } = useMap();
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const contentRef = useRef<HTMLDivElement>(document.createElement("div"));

  useEffect(() => {
    if (!map || !show) return;

    const popup = new maplibregl.Popup({
      closeButton: !!onClose,
      closeOnClick: false,
      className: "custom-map-popup",
    })
      .setLngLat([lng, lat])
      .setDOMContent(contentRef.current)
      .addTo(map);

    if (onClose) {
      popup.on("close", onClose);
    }

    popupRef.current = popup;

    return () => {
      popup.remove();
    };
  }, [map, lng, lat, show, onClose]);

  return (
    <div ref={(el) => { if (el) contentRef.current = el; }} className={cn("text-sm", className)}>
      {children}
    </div>
  );
}

// MapRoute
export function MapRoute({
  coordinates,
  color = "#ff6600",
  width = 3,
  opacity = 0.8,
  id,
}: {
  coordinates: [number, number][];
  color?: string;
  width?: number;
  opacity?: number;
  id?: string;
}) {
  const { map } = useMap();
  const sourceId = id || `route-${Math.random().toString(36).slice(2)}`;
  const layerId = `${sourceId}-layer`;

  useEffect(() => {
    if (!map || coordinates.length < 2) return;

    // Wait for style to be loaded
    const addRoute = () => {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        });
        return;
      }

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        },
      });

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": color,
          "line-width": width,
          "line-opacity": opacity,
        },
      });
    };

    if (map.isStyleLoaded()) {
      addRoute();
    } else {
      map.on("load", addRoute);
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, coordinates, color, width, opacity]);

  return null;
}
