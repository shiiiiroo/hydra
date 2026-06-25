import { rawCSV } from "./rawDataset";
import { HydroObject, DistrictCenter } from "./types";

// Standard 19 districts center mapping in Zhambyl region around Taraz (42.9000, 71.3700)
export const DISTRICT_CENTERS: { [key: number]: DistrictCenter } = {
  1: { name: "Район 1", lat: 43.02, lng: 71.48 },
  2: { name: "Район 2", lat: 42.85, lng: 71.25 },
  3: { name: "Район 3", lat: 42.87, lng: 73.18 },
  4: { name: "Район 4", lat: 43.20, lng: 74.80 },
  5: { name: "Район 5", lat: 43.60, lng: 73.70 },
  6: { name: "Район 6", lat: 43.50, lng: 70.80 },
  7: { name: "Район 7", lat: 44.50, lng: 69.80 },
  8: { name: "Район 8", lat: 42.60, lng: 70.80 },
  9: { name: "Район 9", lat: 42.90, lng: 72.50 },
  10: { name: "Район 10", lat: 44.30, lng: 73.50 },
  11: { name: "Район 11", lat: 43.10, lng: 72.10 },
  12: { name: "Район 12", lat: 42.95, lng: 71.90 },
  13: { name: "Район 13", lat: 43.35, lng: 71.60 },
  14: { name: "Район 14", lat: 43.45, lng: 72.90 },
  15: { name: "Район 15", lat: 42.75, lng: 72.70 },
  16: { name: "Район 16", lat: 42.55, lng: 71.70 },
  17: { name: "Район 17", lat: 43.85, lng: 71.20 },
  18: { name: "Район 18", lat: 44.15, lng: 72.50 },
  19: { name: "Район 19", lat: 44.35, lng: 70.50 }
};

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseDataset(): HydroObject[] {
  const lines = rawCSV.split("\n");
  const objects: HydroObject[] = [];

  // Parse each line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 15) continue;

    // First column is local id within group, second is the global id
    const localId = parseInt(cols[0], 10);
    const globalId = parseInt(cols[1], 10);

    // If we can't parse a valid global ID, skip this row
    if (isNaN(globalId) || isNaN(localId)) {
      continue;
    }

    const yearOfCommissioning = cols[2] ? parseInt(cols[2], 10) : null;
    const waterSource = cols[3] || "р. Иртыш";
    
    // Parse floats properly by replacing Russian comma with dot
    const throughput = parseFloat((cols[4] || "0").replace(",", "."));
    const length = parseFloat((cols[5] || "0").replace(",", "."));
    const lengthEarth = cols[6] ? parseFloat(cols[6].replace(",", ".")) : null;
    const lengthLined = cols[7] ? parseFloat(cols[7].replace(",", ".")) : null;
    const area = parseFloat((cols[8] || "0").replace(",", ".").replace(/\s/g, ""));
    const kpdProject = cols[11] ? parseFloat(cols[11].replace(",", ".")) : null;
    const kpdActual = cols[12] ? parseFloat(cols[12].replace(",", ".")) : null;

    // Serving district: parse integer to map to standard 1..19
    const rawDistrict = cols[13] || "Район 1";
    const districtNumStr = rawDistrict.replace(/\D/g, "");
    let districtNum = parseInt(districtNumStr, 10);
    if (isNaN(districtNum)) districtNum = 1;
    
    // Group into 19 districts (modulo logic)
    const normalizedDistrictNum = districtNum % 19 === 0 ? 19 : districtNum % 19;
    const mappedDistrict = `Район ${normalizedDistrictNum}`;

    // Wear percentage: parse float
    const rawWear = cols[14] || "30%";
    let wearPercentage = parseFloat(rawWear.replace("%", "").replace(",", "."));
    if (isNaN(wearPercentage)) {
      wearPercentage = 30; // default
    }
    // Clamping if wear is absurd (e.g. 130% from CSV data is possible, clamp to 100 for some math but let's keep it for visual)
    const clampedWear = Math.min(Math.max(wearPercentage, 0), 100);

    // Technical Condition
    const technicalCondition: "удов." | "не удов." = (cols[15] === "не удов.") ? "не удов." : "удов.";

    // Parameters
    const parameters = cols[16] || "ширина по верху - не указана";
    const structuresCount = cols[17] ? parseInt(cols[17], 10) : null;
    const yearOfBalance = cols[18] ? parseInt(cols[18], 10) : null;

    // RISK MODEL & STATUS
    // 0-25% wear = Normal
    // 25-50% wear = Monitoring
    // 50-75% wear = Repair
    // 75-100% wear = Emergency
    let calculatedStatus: "Normal" | "Monitoring" | "Repair" | "Emergency" = "Normal";
    if (clampedWear <= 25) {
      calculatedStatus = "Normal";
    } else if (clampedWear <= 50) {
      calculatedStatus = "Monitoring";
    } else if (clampedWear <= 75) {
      calculatedStatus = "Repair";
    } else {
      calculatedStatus = "Emergency";
    }

    // Additional rule: If technical condition is unsatisfactory, status cannot be lower than Repair.
    if (technicalCondition === "не удов." && (calculatedStatus === "Normal" || calculatedStatus === "Monitoring")) {
      calculatedStatus = "Repair";
    }

    // Inspection Interval (months)
    // Normal: 12, Monitoring: 6, Repair: 3, Emergency: 1
    let inspectionInterval = 12;
    if (calculatedStatus === "Monitoring") inspectionInterval = 6;
    if (calculatedStatus === "Repair") inspectionInterval = 3;
    if (calculatedStatus === "Emergency") inspectionInterval = 1;

    // Approximate Coordinates: based on district center with deterministic pseudo-random offset
    const center = DISTRICT_CENTERS[normalizedDistrictNum] || DISTRICT_CENTERS[1];
    
    // Deterministic offset based on global ID
    const angle = (globalId * 137.5) % 360; // golden angle
    const radius = 0.05 + ((globalId * 0.007) % 0.15); // scatter radius
    const latOffset = Math.sin(angle * Math.PI / 180) * radius;
    const lngOffset = Math.cos(angle * Math.PI / 180) * radius;

    const coordinates: [number, number] = [
      center.lat + latOffset,
      center.lng + lngOffset
    ];

    // Mock cadastral number & state act based on global ID for details page
    const cadastralNumber = `04-${globalId.toString().padStart(3, "0")}-001-${(globalId % 100).toString().padStart(3, "0")}`;
    const stateAct = `№ ${globalId * 37 + 1024}-А`;

    objects.push({
      id: globalId,
      name: `Канал №${globalId}`,
      yearOfCommissioning,
      waterSource,
      throughput,
      length,
      lengthEarth,
      lengthLined,
      area,
      kpdProject,
      kpdActual,
      district: mappedDistrict,
      wearPercentage,
      technicalCondition,
      calculatedStatus,
      parameters,
      structuresCount,
      yearOfBalance,
      coordinates,
      inspectionInterval,
      cadastralNumber,
      stateAct
    });
  }

  // Sort by global ID ascending
  return objects.sort((a, b) => a.id - b.id);
}
