export type StationType = 'fuel' | 'charging';

export interface Station {
  id: number;
  type: StationType;
  name: string;
  brand?: string;
  operator?: string;
  address?: string;
  distance: number; // metre cinsinden
  lat: number;
  lon: number;
  amenity: string;
}

export interface OverpassElement {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags?: {
    name?: string;
    brand?: string;
    operator?: string;
    amenity?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
  };
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

