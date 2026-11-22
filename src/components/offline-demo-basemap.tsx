"use client";

import { GridLayer, type Coords } from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { paintDemoMapTile } from "../lib/demo-map-background";

export function OfflineDemoBasemap() {
  const map = useMap();
  useEffect(() => {
    class LocalArtwork extends GridLayer {
      createTile(coordinates: Coords) {
        const canvas = document.createElement("canvas");
        const size = 256;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = canvas.height = size * ratio;
        canvas.className = "demo-background-tile";
        canvas.setAttribute("aria-hidden", "true");
        const context = canvas.getContext("2d");
        if (context) {
          context.scale(ratio, ratio);
          paintDemoMapTile(context, size, coordinates.x, coordinates.y);
        }
        return canvas;
      }
    }
    const artwork = new LocalArtwork({ tileSize: 256, keepBuffer: 1, updateWhenIdle: true, attribution: "BhuSutra · original demo artwork" });
    artwork.addTo(map);
    return () => { artwork.remove(); };
  }, [map]);
  return null;
}
