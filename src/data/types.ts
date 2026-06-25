export interface HydroObject {
  id: number;
  name: string;
  yearOfCommissioning: number | null;
  waterSource: string;
  throughput: number; // m3/s
  length: number; // km
  lengthEarth: number | null; // km
  lengthLined: number | null; // km
  area: number; // ha
  kpdProject: number | null;
  kpdActual: number | null;
  district: string;
  wearPercentage: number; // 0-100
  technicalCondition: "удов." | "не удов.";
  calculatedStatus: "Normal" | "Monitoring" | "Repair" | "Emergency";
  parameters: string;
  structuresCount: number | null;
  yearOfBalance: number | null;
  coordinates: [number, number];
  inspectionInterval: number; // in months
  cadastralNumber: string;
  stateAct: string;
}

export interface DistrictCenter {
  name: string;
  lat: number;
  lng: number;
}
