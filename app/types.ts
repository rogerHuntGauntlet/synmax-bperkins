export interface ShipResult {
  ship_id: number;
  region: [number, number, number, number]; // [y_start, y_end, x_start, x_end]
  displacement_field: {
    range_offsets: number[][];
    azimuth_offsets: number[][];
    magnitude: number[][];
  };
  dominant_frequencies: {
    frequency: [number, number];
    amplitude: number;
    peak_location: [number, number];
  }[];
}

export interface ProcessingResult {
  metadata: {
    file_path: string;
    image_shape: [number, number];
    num_ships_detected: number;
  };
  ships: ShipResult[];
}

export interface ApiResponse {
  success: boolean;
  sessionId: string;
  message?: string;
  results?: ProcessingResult;
  error?: string;
  figures?: string[];
} 