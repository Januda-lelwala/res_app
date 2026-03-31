"use client";

import { useState } from "react";
import { isInsideGalle } from "./utils";

export type LocationStatus =
  | "idle"        // not requested yet
  | "requesting"  // waiting for browser permission
  | "in-galle"    // got coords, inside Galle
  | "outside"     // got coords, outside Galle
  | "denied"      // user denied permission
  | "unavailable"; // browser doesn't support it or timed out

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface UseLocationResult {
  status: LocationStatus;
  coords: UserLocation | null;
  request: () => void;
}

export function useLocation(): UseLocationResult {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [coords, setCoords] = useState<UserLocation | null>(null);

  function request() {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    setStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        setStatus(isInsideGalle(lat, lng) ? "in-galle" : "outside");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
        } else {
          setStatus("unavailable");
        }
      },
      { timeout: 8000, maximumAge: 60_000 }
    );
  }

  return { status, coords, request };
}
