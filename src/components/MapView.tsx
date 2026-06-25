import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { HydroObject } from "../data/types";
import { MapPin, Info, Calendar, ShieldAlert, ArrowRight, Layers, Map as MapIcon, SlidersHorizontal } from "lucide-react";

interface MapViewProps {
  data: HydroObject[];
  onSelectObject: (obj: HydroObject) => void;
}

type LayerMode = "status" | "wear" | "age";

// Map center for Zhambyl region (Taraz area)
const MAP_CENTER: [number, number] = [43.1000, 71.8000];
const MAP_ZOOM = 8;

export default function MapView({ data, onSelectObject }: MapViewProps) {
  const [selectedDistrict, setSelectedDistrict] = React.useState<string>("All");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("All");
  const [layerMode, setLayerMode] = React.useState<LayerMode>("status");

  // Get unique districts for dropdown filter
  const uniqueDistricts = React.useMemo(() => {
    const districts = new Set(data.map((item) => item.district));
    return ["All", ...Array.from(districts).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      return numA - numB;
    })];
  }, [data]);

  // Filter objects
  const filteredObjects = React.useMemo(() => {
    return data.filter((item) => {
      const matchDistrict = selectedDistrict === "All" || item.district === selectedDistrict;
      const matchStatus = selectedStatus === "All" || item.calculatedStatus === selectedStatus;
      return matchDistrict && matchStatus;
    });
  }, [data, selectedDistrict, selectedStatus]);

  // Dynamic status list
  const statuses = ["All", "Normal", "Monitoring", "Repair", "Emergency"];

  // Color generator for status marker
  const getMarkerColorClass = (obj: HydroObject, mode: LayerMode) => {
    if (mode === "status") {
      switch (obj.calculatedStatus) {
        case "Normal": return "bg-emerald-500";
        case "Monitoring": return "bg-sky-500";
        case "Repair": return "bg-orange-500";
        case "Emergency": return "bg-red-500";
        default: return "bg-slate-500";
      }
    } else if (mode === "wear") {
      const wear = obj.wearPercentage;
      if (wear <= 25) return "bg-green-500";
      if (wear <= 50) return "bg-yellow-400";
      if (wear <= 75) return "bg-orange-500";
      return "bg-red-600";
    } else {
      // age / year of construction
      const year = obj.yearOfCommissioning;
      if (!year) return "bg-slate-400";
      if (year < 1950) return "bg-purple-700";
      if (year < 1980) return "bg-indigo-500";
      return "bg-teal-500";
    }
  };

  const createCustomIcon = (colorClass: string) => {
    return L.divIcon({
      html: `<div class="w-4.5 h-4.5 rounded-full border-2 border-white shadow-lg ${colorClass} transition-transform hover:scale-125 duration-200"></div>`,
      className: "custom-marker-pin-wrapper",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -10]
    });
  };

  const handleOpenPassport = (obj: HydroObject) => {
    onSelectObject(obj);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Top Banner and Layer Switching */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-indigo-400" />
            Интерактивная ГИС Карта объектов
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Жамбылская область • Нанесено оросительных каналов: {filteredObjects.length} из {data.length}
          </p>
        </div>

        {/* Layer selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            Режим карты:
          </span>
          <button
            onClick={() => setLayerMode("status")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              layerMode === "status"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
            }`}
          >
            По статусу риска
          </button>
          <button
            onClick={() => setLayerMode("wear")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              layerMode === "wear"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
            }`}
          >
            По износу (%)
          </button>
          <button
            onClick={() => setLayerMode("age")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              layerMode === "age"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
            }`}
          >
            По году постройки
          </button>
        </div>
      </div>

      {/* Approximate coordinates badge */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-955/20 border border-amber-900/30 rounded-xl text-amber-400 text-[11px] font-semibold">
        <Info className="w-4 h-4 text-amber-500 shrink-0" />
        <span>Координаты приближённые: Сгенерировано автоматически на основе районов обслуживания Жамбылской области для визуализации ГИС.</span>
      </div>

      {/* Main Grid: Filters + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[550px]">
        {/* Left Filter Panel */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              Фильтрация меток
            </h3>

            {/* District Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Район
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {uniqueDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d === "All" ? "Все районы" : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Статус риска
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s === "All" ? "Все статусы" : 
                     s === "Normal" ? "Норма (Исправно)" : 
                     s === "Monitoring" ? "Наблюдение" : 
                     s === "Repair" ? "Ремонт" : "Авария (Emergency)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Map Legends based on selected LayerMode */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Легенда карты
            </h4>

            {layerMode === "status" && (
              <div className="space-y-2 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-slate-900 block shadow-xs" />
                  <span>Норма (Исправно)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-sky-500 border border-slate-900 block shadow-xs" />
                  <span>Наблюдение</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-orange-500 border border-slate-900 block shadow-xs" />
                  <span>Требует ремонта</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500 border border-slate-900 block shadow-xs" />
                  <span>Аварийное состояние</span>
                </div>
              </div>
            )}

            {layerMode === "wear" && (
              <div className="space-y-2 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-green-500 border border-slate-900 block shadow-xs" />
                  <span>0% – 25% износ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-slate-900 block shadow-xs" />
                  <span>25% – 50% износ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-orange-500 border border-slate-900 block shadow-xs" />
                  <span>50% – 75% износ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-600 border border-slate-900 block shadow-xs" />
                  <span>75% – 100% износ</span>
                </div>
              </div>
            )}

            {layerMode === "age" && (
              <div className="space-y-2 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-teal-500 border border-slate-900 block shadow-xs" />
                  <span>После 1980 года (Новое)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 border border-slate-900 block shadow-xs" />
                  <span>1950 – 1980 годы</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-purple-700 border border-slate-900 block shadow-xs" />
                  <span>До 1950 года (Старое)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-400 border border-slate-900 block shadow-xs" />
                  <span>Не указано</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Rendering Container */}
        <div className="lg:col-span-3 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative shadow-sm h-full min-h-[500px]">
          <MapContainer 
            center={MAP_CENTER} 
            zoom={MAP_ZOOM} 
            scrollWheelZoom={true}
            className="w-full h-full z-10"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredObjects.map((obj) => {
              const colorClass = getMarkerColorClass(obj, layerMode);
              const customIcon = createCustomIcon(colorClass);

              return (
                <Marker 
                  key={obj.id} 
                  position={obj.coordinates} 
                  icon={customIcon}
                >
                  <Popup>
                    <div className="w-64 p-1.5 space-y-3 font-sans text-slate-200">
                      <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-white block leading-tight">
                            Канал №{obj.id}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {obj.district} • {obj.waterSource}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          obj.calculatedStatus === "Normal" ? "bg-emerald-950/40 text-emerald-400" :
                          obj.calculatedStatus === "Monitoring" ? "bg-sky-950/40 text-sky-400" :
                          obj.calculatedStatus === "Repair" ? "bg-orange-950/40 text-orange-400" :
                          "bg-rose-955/40 text-rose-400"
                        }`}>
                          {obj.calculatedStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-800 pb-2.5">
                        <div className="space-y-0.5">
                          <span className="text-slate-500 text-[10px] uppercase font-semibold">Процент износа</span>
                          <span className={`font-mono font-bold block ${
                            obj.wearPercentage > 75 ? "text-rose-400" : obj.wearPercentage > 50 ? "text-orange-400" : "text-white"
                          }`}>
                            {obj.wearPercentage}%
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-500 text-[10px] uppercase font-semibold">Год постройки</span>
                          <span className="font-semibold block text-slate-300">
                            {obj.yearOfCommissioning ?? "Не указан"}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Рекомендация:</span>
                        <p className="text-[11px] text-slate-300 leading-tight">
                          Осмотр каждые {obj.inspectionInterval} {obj.inspectionInterval === 1 ? "месяц" : obj.inspectionInterval === 3 ? "месяца" : "месяцев"}
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenPassport(obj)}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                      >
                        Технический паспорт
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
