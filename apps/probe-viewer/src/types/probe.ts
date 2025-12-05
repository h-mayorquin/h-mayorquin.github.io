export interface RawManifestEntry {
  id: string;
  manufacturer: string;
  model: string;
  display_name: string;
  json_url: string;
  contact_count: number;
  shank_count: number;
  has_3d_geometry: boolean;
  annotations: Record<string, unknown>;
}

export interface ManifestEntry {
  id: string;
  manufacturer: string;
  model: string;
  displayName: string;
  jsonUrl: string;
  contactCount: number;
  shankCount: number;
  has3dGeometry: boolean;
  annotations: Record<string, unknown>;
}

export interface ProbeInterfaceProbe {
  ndim: number;
  si_units: string;
  annotations?: Record<string, unknown>;
  contact_positions: number[][];
  shank_ids?: number[];
  probe_planar_contour?: number[][];
}

export interface ProbeInterfaceFile {
  specification: string;
  version: string;
  probes: ProbeInterfaceProbe[];
}
