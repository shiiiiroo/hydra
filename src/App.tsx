import React from "react";
import Sidebar, { ScreenType } from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import MapView from "./components/MapView";
import ObjectsView from "./components/ObjectsView";
import CategoriesView from "./components/CategoriesView";
import ReportsView from "./components/ReportsView";
import AnalyticsView from "./components/AnalyticsView";
import ObjectDetailModal from "./components/ObjectDetailModal";
import { parseDataset } from "./data/parser";
import { HydroObject } from "./data/types";
import { Droplet, Info, ShieldAlert } from "lucide-react";

export default function App() {
  const [activeScreen, setActiveScreen] = React.useState<ScreenType>("dashboard");
  const [dataset, setDataset] = React.useState<HydroObject[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  // Global filters mapped to pages
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Detailed passport view state
  const [selectedObject, setSelectedObject] = React.useState<HydroObject | null>(null);

  // Load and parse real dataset on mount
  React.useEffect(() => {
    try {
      const parsed = parseDataset();
      setDataset(parsed);
    } catch (err) {
      console.error("Failed to parse real dataset:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectStatusFilter = (status: string | null) => {
    setStatusFilter(status);
  };

  const handleSearchGlobal = (query: string) => {
    setSearchQuery(query);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-200">
        <div className="space-y-4 text-center">
          <div className="p-3 bg-indigo-600 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10 animate-bounce">
            <Droplet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Загрузка HydroMonitor...</h1>
            <p className="text-xs text-slate-400 mt-1">Парсинг и индексирование dataset.csv</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans overflow-hidden h-screen text-slate-200">
      {/* Navigation Sidebar */}
      <Sidebar 
        activeScreen={activeScreen} 
        setActiveScreen={(screen) => {
          setActiveScreen(screen);
          // If we intentionally navigate away, clear transitional filter states unless we are entering "objects" screen
          if (screen !== "objects") {
            setStatusFilter(null);
            setSearchQuery("");
          }
        }} 
        totalCount={dataset.length}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Top Header */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white">
              {activeScreen === "dashboard" && "Панель Управления (Дашборд)"}
              {activeScreen === "map" && "Интерактивная Карта ГИС"}
              {activeScreen === "objects" && "Государственный Реестр Оросительной Сети"}
              {activeScreen === "categories" && "Классификация Каналов (Kanban)"}
              {activeScreen === "reports" && "Формирование Отчетов и Рапортов"}
              {activeScreen === "analytics" && "Аналитика и Эффективность Сети"}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-400 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>База данных активна (430 каналов)</span>
          </div>
        </header>

        {/* Dynamic Screen View container */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
          {activeScreen === "dashboard" && (
            <DashboardView 
              data={dataset} 
              onSelectStatusFilter={handleSelectStatusFilter}
              onSearchGlobal={handleSearchGlobal}
              onScreenChange={(screen) => {
                setActiveScreen(screen);
              }}
              onSelectObject={(obj) => setSelectedObject(obj)}
            />
          )}

          {activeScreen === "map" && (
            <MapView 
              data={dataset} 
              onSelectObject={(obj) => setSelectedObject(obj)}
            />
          )}

          {activeScreen === "objects" && (
            <ObjectsView 
              data={dataset} 
              onSelectObject={(obj) => setSelectedObject(obj)}
              initialStatusFilter={statusFilter}
              initialSearchQuery={searchQuery}
            />
          )}

          {activeScreen === "categories" && (
            <CategoriesView 
              data={dataset} 
              onSelectObject={(obj) => setSelectedObject(obj)}
            />
          )}

          {activeScreen === "reports" && (
            <ReportsView 
              data={dataset} 
              onSelectObject={(obj) => setSelectedObject(obj)}
            />
          )}

          {activeScreen === "analytics" && (
            <AnalyticsView 
              data={dataset} 
              onSelectObject={(obj) => setSelectedObject(obj)}
            />
          )}
        </main>
      </div>

      {/* Global Detailed Passport Modal Overlay */}
      {selectedObject !== null && (
        <ObjectDetailModal 
          object={selectedObject} 
          onClose={() => setSelectedObject(null)}
        />
      )}
    </div>
  );
}
