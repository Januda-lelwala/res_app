"use client";

import { useEffect, useRef, useState } from "react";
import { Recommendation } from "@/lib/types";

interface LatLng { lat: number; lng: number }

interface MapViewProps {
  recommendations: Recommendation[];
  selectedPlace: Recommendation | null;
  onMarkerClick: (place: Recommendation) => void;
  userLocation?: LatLng | null;
}

const GALLE_FORT = { lat: 6.0328, lng: 80.217 };
const GALLE_MAPS_URL = "https://www.google.com/maps/@6.0328,80.217,15z";

export default function MapView({ recommendations, selectedPlace, onMarkerClick, userLocation }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setLoadError(true);
      return;
    }

    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => setIsLoaded(true));
      existingScript.addEventListener("error", () => setLoadError(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setLoadError(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: GALLE_FORT,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      styles: [
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0F3460" }, { lightness: 20 }] },
        { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f0e8" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#e8d5b7" }] },
      ],
    });

    new google.maps.Marker({
      position: GALLE_FORT,
      map: mapInstanceRef.current,
      title: "Galle Fort",
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#0F3460", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
    });
  }, [isLoaded]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const validPlaces = recommendations.filter((p) => p.lat && p.lng);
    if (validPlaces.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(GALLE_FORT);

    validPlaces.forEach((place) => {
      const marker = new google.maps.Marker({
        position: { lat: place.lat!, lng: place.lng! },
        map: mapInstanceRef.current!,
        title: place.name,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#FF6B6B", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
      });
      marker.addListener("click", () => onMarkerClick(place));
      markersRef.current.push(marker);
      bounds.extend({ lat: place.lat!, lng: place.lng! });
    });

    mapInstanceRef.current.fitBounds(bounds, { top: 30, bottom: 30, left: 30, right: 30 });
  }, [recommendations, onMarkerClick]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const validPlaces = recommendations.filter((p) => p.lat && p.lng);

    markersRef.current.forEach((marker, i) => {
      const place = validPlaces[i];
      const isSelected = selectedPlace?.name === place?.name;
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: isSelected ? 11 : 8,
        fillColor: "#FF6B6B",
        fillOpacity: 1,
        strokeColor: isSelected ? "#0F3460" : "#ffffff",
        strokeWeight: isSelected ? 3 : 2,
      });
      if (isSelected && place?.lat && place?.lng) {
        mapInstanceRef.current!.panTo({ lat: place.lat, lng: place.lng });
      }
    });
  }, [selectedPlace, recommendations]);

  // User location dot — blue pulsing circle
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;

    // Remove previous dot
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    userMarkerRef.current = new google.maps.Marker({
      position: userLocation,
      map: mapInstanceRef.current,
      title: "You are here",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#4A90E2",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2.5,
      },
    });

    mapInstanceRef.current.panTo(userLocation);
  }, [userLocation]);

  return (
    <div className="relative w-full h-[200px] rounded-2xl overflow-hidden border border-white/10">
      {loadError ? (
        <div className="w-full h-full bg-ocean/20 flex items-center justify-center">
          <p className="text-sm text-white/40">Map unavailable — add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
        </div>
      ) : (
        <>
          <div ref={mapRef} className="w-full h-full" />
          {!isLoaded && (
            <div className="absolute inset-0 bg-ocean/30 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </>
      )}

      {/* Expand map link */}
      <a
        href={GALLE_MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2.5 right-2.5 bg-white/90 hover:bg-white backdrop-blur-sm text-ocean text-xs font-semibold px-3 py-1.5 rounded-lg shadow transition-colors"
      >
        Expand map ↗
      </a>

      {/* Legend */}
      {recommendations.filter((p) => p.lat && p.lng).length > 0 && (
        <div className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-sm rounded-lg shadow px-2.5 py-1.5 text-xs text-ocean/70 flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-ocean inline-block" />
            Fort
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-coral inline-block" />
            {recommendations.filter((p) => p.lat && p.lng).length} pinned
          </span>
          {userLocation && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              You
            </span>
          )}
        </div>
      )}
    </div>
  );
}
