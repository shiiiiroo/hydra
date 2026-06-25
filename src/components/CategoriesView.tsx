import React from "react";
import { HydroObject } from "../data/types";
import { FolderKanban, CheckCircle2, HelpCircle, AlertTriangle, AlertOctagon, ArrowRight, Eye, Search } from "lucide-react";

interface CategoriesViewProps {
  data: HydroObject[];
  onSelectObject: (obj: HydroObject) => void;
}

export default function CategoriesView({ data, onSelectObject }: CategoriesViewProps) {
  const [searchTerm, setSearchTerm] = React.useState("");

  // Group objects by calculated status
  const groupedData = React.useMemo(() => {
    const groups: { [key in HydroObject["calculatedStatus"]]: HydroObject[] } = {
      Normal: [],
      Monitoring: [],
      Repair: [],
      Emergency: []
    };

    data.forEach((item) => {
      // Apply kanban-specific quick search if typed
      const matchesSearch = searchTerm === "" || 
        item.id.toString().includes(searchTerm) ||
        item.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.waterSource.toLowerCase().includes(searchTerm.toLowerCase());

      if (matchesSearch) {
        groups[item.calculatedStatus].push(item);
      }
    });

    return groups;
  }, [data, searchTerm]);

  const columns = [
    {
      id: "Normal" as const,
      title: "Норма (Исправно)",
      subtitle: "0 – 25% износ",
      colorClass: "border-t-4 border-t-emerald-500 bg-emerald-950/10",
      headerBg: "bg-emerald-950/30 text-emerald-400 border-emerald-900/30",
      badgeColor: "bg-emerald-600 text-white",
      icon: CheckCircle2
    },
    {
      id: "Monitoring" as const,
      title: "Наблюдение",
      subtitle: "25 – 50% износ",
      colorClass: "border-t-4 border-t-sky-500 bg-sky-950/10",
      headerBg: "bg-sky-950/30 text-sky-400 border-sky-900/30",
      badgeColor: "bg-sky-600 text-white",
      icon: HelpCircle
    },
    {
      id: "Repair" as const,
      title: "Ремонт",
      subtitle: "50 – 75% износ",
      colorClass: "border-t-4 border-t-orange-500 bg-orange-950/10",
      headerBg: "bg-orange-950/30 text-orange-400 border-orange-900/30",
      badgeColor: "bg-orange-600 text-white",
      icon: AlertTriangle
    },
    {
      id: "Emergency" as const,
      title: "Аварийное",
      subtitle: "75 – 100% износ",
      colorClass: "border-t-4 border-t-rose-500 bg-rose-955/10",
      headerBg: "bg-rose-955/30 text-rose-400 border-rose-900/30",
      badgeColor: "bg-rose-600 text-white",
      icon: AlertOctagon
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Header and Quick Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-400" />
            Распределение по уровням риска (Kanban)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Интерактивный Канбан-интерфейс группировки каналов по оценкам износа и тех.состояния.
          </p>
        </div>

        {/* Local Search input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Быстрый поиск в Kanban..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Kanban Board columns wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 items-start min-h-[500px]">
        {columns.map((col) => {
          const list = groupedData[col.id];
          const Icon = col.icon;
          return (
            <div 
              key={col.id} 
              className={`rounded-2xl border border-slate-800 shadow-xs flex flex-col max-h-[70vh] md:max-h-[650px] ${col.colorClass}`}
            >
              {/* Column Header */}
              <div className={`p-4 rounded-t-2xl border-b border-slate-850 flex items-center justify-between ${col.headerBg}`}>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    {col.title}
                  </h3>
                  <p className="text-[10px] opacity-80 font-medium">
                    {col.subtitle}
                  </p>
                </div>
                <span className={`font-mono text-xs font-extrabold px-2 py-1 rounded-lg ${col.badgeColor}`}>
                  {list.length}
                </span>
              </div>

              {/* Cards List container with scroll */}
              <div className="p-3 overflow-y-auto space-y-3 flex-1">
                {list.length > 0 ? (
                  list.map((obj) => (
                    <div
                      key={obj.id}
                      onClick={() => onSelectObject(obj)}
                      className="bg-slate-900 rounded-xl p-4 border border-slate-800/80 hover:border-slate-700 hover:shadow-md cursor-pointer transition-all space-y-3 group"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-bold text-white text-xs bg-slate-950 px-2 py-0.5 rounded-md">
                          № {obj.id}
                        </span>
                        <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-lg ${
                          obj.wearPercentage > 75 ? "bg-rose-955/40 text-rose-400" : 
                          obj.wearPercentage > 50 ? "bg-orange-950/40 text-orange-400" : "text-slate-300 bg-slate-950"
                        }`}>
                          {obj.wearPercentage}% износ
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block">Обслуживание:</span>
                        <p className="text-xs font-semibold text-white leading-tight">
                          {obj.district}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {obj.waterSource}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-850 flex justify-between items-center text-[10px] text-slate-500 font-semibold group-hover:text-indigo-400 transition-colors">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          Паспорт канала
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-xl">
                    Пусто
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
