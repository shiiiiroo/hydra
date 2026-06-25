import React from "react";
import { 
  LayoutDashboard, 
  Map, 
  FolderKanban, 
  FileText, 
  BarChart3, 
  Droplet,
  Menu,
  ChevronRight,
  Database
} from "lucide-react";

export type ScreenType = "dashboard" | "map" | "objects" | "categories" | "reports" | "analytics";

interface SidebarProps {
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  totalCount: number;
}

export default function Sidebar({ activeScreen, setActiveScreen, totalCount }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  const menuItems = [
    { id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
    { id: "map", label: "Карта объектов", icon: Map },
    { id: "objects", label: "Реестр объектов", icon: Database },
    { id: "categories", label: "Категории (Kanban)", icon: FolderKanban },
    { id: "reports", label: "Отчёты и Сводки", icon: FileText },
    { id: "analytics", label: "Аналитика", icon: BarChart3 },
  ] as const;

  return (
    <aside 
      className={`bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 border-r border-slate-800 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950">
        <div className={`flex items-center gap-2.5 transition-opacity ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
          <div className="p-2 bg-indigo-600 rounded-xl">
            <Droplet className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight block text-white font-sans">
              HydroMonitor
            </span>
            <span className="text-[10px] text-indigo-400 font-medium block">
              Жамбылская область
            </span>
          </div>
        </div>
        
        {collapsed && (
          <div className="mx-auto p-1.5 bg-indigo-600 rounded-lg">
            <Droplet className="w-4 h-4 text-white" />
          </div>
        )}

        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400"}`} />
              
              <span className={`transition-opacity duration-200 ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                {item.label}
              </span>

              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-950 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Info Panel / Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Всего каналов:</span>
              <span className="font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                {totalCount} ед.
              </span>
            </div>
            <div className="text-[10px] text-slate-500 leading-relaxed">
              Абсолютный источник данных: <br />
              <span className="text-slate-400 font-mono text-[9px]">dataset.csv (430 записей)</span>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <span className="font-mono text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded-sm">
              {totalCount}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
