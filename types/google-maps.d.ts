// Minimal ambient declarations for Google Maps JS API
// (avoids installing @types/google.maps as a dep for now)
declare namespace google {
  namespace maps {
    class Map {
      constructor(el: HTMLElement, opts?: MapOptions);
      fitBounds(bounds: LatLngBounds, padding?: number | Padding): void;
      panTo(latLng: LatLng | LatLngLiteral): void;
    }
    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      setIcon(icon: Symbol | string): void;
      addListener(event: string, handler: () => void): void;
    }
    class LatLngBounds {
      extend(point: LatLng | LatLngLiteral): void;
    }
    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      styles?: MapTypeStyle[];
    }
    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: Symbol | string;
    }
    interface LatLng {
      lat(): number;
      lng(): number;
    }
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    interface Padding {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    }
    interface Symbol {
      path: SymbolPath | string;
      scale?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
    }
    interface MapTypeStyle {
      featureType?: string;
      elementType?: string;
      stylers?: object[];
    }
    enum SymbolPath {
      CIRCLE = 0,
      FORWARD_CLOSED_ARROW = 1,
      FORWARD_OPEN_ARROW = 2,
      BACKWARD_CLOSED_ARROW = 3,
      BACKWARD_OPEN_ARROW = 4,
    }
  }
}
