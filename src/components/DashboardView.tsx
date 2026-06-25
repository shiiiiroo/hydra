import React from "react";
import { HydroObject } from "../data/types";
import { 
  CheckCircle2, 
  HelpCircle, 
  AlertTriangle, 
  AlertOctagon, 
  Layers, 
  Search, 
  MapPin, 
  TrendingUp, 
  FileSpreadsheet, 
  ArrowRight,
  ShieldAlert,
  CalendarDays
} from "lucide-react";

interface DashboardViewProps {
  data: HydroObject[];
  onSelectStatusFilter: (status: string | null) => void;
  onSearchGlobal: (query: string) => void;
  onScreenChange: (screen: "dashboard" | "map" | "objects" | "categories" | "reports" | "analytics") => void;
  onSelectObject: (obj: HydroObject) => void;
}

export default function DashboardView({ 
  data, 
  onSelectStatusFilter, 
  onSearchGlobal, 
  onScreenChange,
  onSelectObject
}: DashboardViewProps) {
  const [searchVal, setSearchVal] = React.useState("");

  // Calculate dynamic stats
  const totalCount = data.length;
  
  const statusCounts = React.useMemo(() => {
    return data.reduce((acc, curr) => {
      acc[curr.calculatedStatus] = (acc[curr.calculatedStatus] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }, [data]);

  const normalCount = statusCounts["Normal"] || 0;
  const monitoringCount = statusCounts["Monitoring"] || 0;
  const repairCount = statusCounts["Repair"] || 0;
  const emergencyCount = statusCounts["Emergency"] || 0;

  // Average wear
  const avgWear = React.useMemo(() => {
    if (totalCount === 0) return 0;
    const totalWear = data.reduce((sum, item) => sum + item.wearPercentage, 0);
    return parseFloat((totalWear / totalCount).toFixed(1));
  }, [data, totalCount]);

  // Total suspended area
  const totalArea = React.useMemo(() => {
    return data.reduce((sum, item) => sum + item.area, 0);
  }, [data]);

  // Total channel length
  const totalLength = React.useMemo(() => {
    return data.reduce((sum, item) => sum + item.length, 0);
  }, [data]);

  // Recent updated/critical channels (just sort by wear descending as a realistic display of channels requiring focus)
  const recentCriticalChannels = React.useMemo(() => {
    return [...data]
      .sort((a, b) => b.wearPercentage - a.wearPercentage)
      .slice(0, 5);
  }, [data]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      onSearchGlobal(searchVal);
      onScreenChange("objects");
    }
  };

  const handleQuickReportDownload = (reportType: string) => {
    let reportTitle = "";
    let content = "";
    
    if (reportType === "critical") {
      reportTitle = "Отчёт по аварийным объектам (Emergency)";
      const criticals = data.filter(d => d.calculatedStatus === "Emergency");
      content = `РЕЕСТР АВАРИЙНЫХ ОБЪЕКТОВ\nВсего объектов: ${criticals.length}\n\n`;
      criticals.forEach(c => {
        content += `Канал №${c.id} - ${c.district} - Износ: ${c.wearPercentage}%\n`;
      });
    } else if (reportType === "summary") {
      reportTitle = "Сводный региональный отчёт";
      content = `СВОДНЫЙ ОТЧЁТ ПО ГИДРОИНФРАСТРУКТУРЕ ЖАМБЫЛСКОЙ ОБЛАСТИ\n\n` +
                `Всего объектов: ${totalCount}\n` +
                `Исправные (Норма): ${normalCount}\n` +
                `Требует наблюдения: ${monitoringCount}\n` +
                `Требует ремонта: ${repairCount}\n` +
                `Аварийные: ${emergencyCount}\n` +
                `Средний износ: ${avgWear}%\n` +
                `Общая длина каналов: ${totalLength.toFixed(1)} км\n` +
                `Общая обслуживаемая площадь: ${totalArea.toLocaleString()} га\n`;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}_report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section with Search bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-linear-to-l from-indigo-600/10 to-transparent pointer-events-none" />
        <div className="max-w-3xl relative z-10 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-3.5 h-3.5" />
            Цифровой Мониторинг Водных Ресурсов
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-sans text-white">
            Гидротехнические сооружения — Жамбылская область
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl">
            Информационно-аналитическая панель мониторинга, каталогизации и оценки технического состояния оросительных каналов региона на основе реальных данных ГКП «Казводхоз».
          </p>

          {/* Quick search */}
          <form onSubmit={handleSearchSubmit} className="pt-2 max-w-xl flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск по номеру объекта или району обслуживания (например: Район 3)..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/80 hover:bg-slate-950 focus:bg-slate-950 text-white placeholder-slate-600 rounded-2xl border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden transition-all text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-2xl transition-all shadow-md shadow-indigo-600/10 active:scale-95 flex items-center gap-1.5"
            >
              Найти
            </button>
          </form>
        </div>
      </div>

      {/* Approximate coordinates badge */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-950/20 border border-amber-900/30 rounded-xl text-amber-400 text-xs font-semibold shadow-xs">
        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
        <span>Approximate coordinates generated for demonstration purposes (по районам Жамбылской области)</span>
      </div>

      {/* 5 Counter Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total */}
        <button
          onClick={() => { onSelectStatusFilter(null); onScreenChange("objects"); }}
          className="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-slate-700 hover:shadow-lg transition-all text-left shadow-xs flex flex-col justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-medium text-xs uppercase tracking-wider block">
              Всего объектов
            </span>
            <span className="text-4xl font-black text-white block font-mono">
              {totalCount}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-indigo-400 font-semibold pt-2 border-t border-slate-800/60 w-full">
            <span>Реестр</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        {/* Card 2: Normal */}
        <button
          onClick={() => { onSelectStatusFilter("Normal"); onScreenChange("objects"); }}
          className="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-emerald-800/60 hover:shadow-lg transition-all text-left shadow-xs flex flex-col justify-between group"
        >
          <div className="space-y-1">
            <span className="text-emerald-400 font-semibold text-xs uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Норма
            </span>
            <span className="text-4xl font-black text-white block font-mono">
              {normalCount}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-emerald-400 font-semibold pt-2 border-t border-slate-800/60 w-full">
            <span>Исправное</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        {/* Card 3: Monitoring */}
        <button
          onClick={() => { onSelectStatusFilter("Monitoring"); onScreenChange("objects"); }}
          className="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-sky-800/60 hover:shadow-lg transition-all text-left shadow-xs flex flex-col justify-between group"
        >
          <div className="space-y-1">
            <span className="text-sky-400 font-semibold text-xs uppercase tracking-wider flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              Наблюдение
            </span>
            <span className="text-4xl font-black text-white block font-mono">
              {monitoringCount}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-sky-400 font-semibold pt-2 border-t border-slate-800/60 w-full">
            <span>Проверить</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        {/* Card 4: Repair */}
        <button
          onClick={() => { onSelectStatusFilter("Repair"); onScreenChange("objects"); }}
          className="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-orange-800/60 hover:shadow-lg transition-all text-left shadow-xs flex flex-col justify-between group"
        >
          <div className="space-y-1">
            <span className="text-orange-400 font-semibold text-xs uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Ремонт
            </span>
            <span className="text-4xl font-black text-white block font-mono">
              {repairCount}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-orange-400 font-semibold pt-2 border-t border-slate-800/60 w-full">
            <span>Требует внимания</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        {/* Card 5: Emergency */}
        <button
          onClick={() => { onSelectStatusFilter("Emergency"); onScreenChange("objects"); }}
          className="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-rose-800/60 hover:shadow-lg transition-all text-left shadow-xs flex flex-col justify-between group"
        >
          <div className="space-y-1">
            <span className="text-rose-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
              <AlertOctagon className="w-4 h-4" />
              Авария
            </span>
            <span className="text-4xl font-black text-white block font-mono">
              {emergencyCount}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-rose-400 font-bold pt-2 border-t border-slate-800/60 w-full">
            <span>Срочный выезд</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </div>

      {/* Quick stats banner & Recent Criticals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Stats & Mini map placeholder/inviter */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Bento grid summary stats */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Средний износ</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">{avgWear}%</span>
                <span className="text-xs text-slate-400">по региону</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-indigo-600 h-full rounded-full" 
                  style={{ width: `${avgWear}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Площадь орошения</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">{(totalArea / 1000).toFixed(1)}k</span>
                <span className="text-xs text-slate-400">га (подвешенная)</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block font-medium">
                {totalArea.toLocaleString()} га всего
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Длина сети</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">{totalLength.toFixed(1)}</span>
                <span className="text-xs text-slate-400">км каналов</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2 block font-medium">
                100% водного ресурса учтено
              </span>
            </div>
          </div>

          {/* Interactive full map quick banner */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xs relative h-72 group">
            {/* Visual representational style of map */}
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
              <div className="text-center space-y-2 z-10 px-6">
                <MapPin className="w-10 h-10 text-indigo-500 mx-auto animate-bounce" />
                <h4 className="font-bold text-white text-lg">Географическое Распределение Объектов</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Карта Жамбылской области с {totalCount} каналами, разбитыми по районам со статусом износа и периодичности планового мониторинга.
                </p>
              </div>
              {/* Fake pins in absolute locations for map preview background */}
              <span className="absolute left-1/4 top-1/3 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
              <span className="absolute right-1/3 top-1/2 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-slate-900 animate-pulse" />
              <span className="absolute left-1/2 top-2/3 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-slate-900 animate-pulse" />
              <span className="absolute right-1/4 top-1/4 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            
            <div className="absolute bottom-6 left-6 right-6 bg-slate-900/95 backdrop-blur-xs p-4 rounded-2xl border border-slate-850 flex justify-between items-center z-20">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Гис модуль</span>
                <span className="font-semibold text-white text-sm">Открыть интерактивную карту ГИС</span>
              </div>
              <button
                onClick={() => onScreenChange("map")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all group-hover:shadow-md"
              >
                Открыть Карту
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Column 3: Recent / Top Risky Objects & Fast Reports */}
        <div className="space-y-6">
          
          {/* Top critical list */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Наибольший износ
            </h3>
            <div className="space-y-2.5">
              {recentCriticalChannels.map((obj) => (
                <div
                  key={obj.id}
                  onClick={() => onSelectObject(obj)}
                  className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-800/50 border border-slate-800/40 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">
                      Канал №{obj.id}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {obj.district} • Год: {obj.yearOfCommissioning ?? "Не указан"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-rose-400 block bg-rose-950/40 px-2 py-1 rounded-lg">
                      {obj.wearPercentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Reports Section */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              Быстрые отчёты
            </h3>
            <p className="text-xs text-slate-400">
              Экспорт текущих аналитических данных в текстовые форматы на лету.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleQuickReportDownload("summary")}
                className="w-full text-left p-3 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-xs font-semibold text-slate-300 flex justify-between items-center transition-all group"
              >
                <span>Сводный отчёт по региону (TXT)</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => handleQuickReportDownload("critical")}
                className="w-full text-left p-3 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-xs font-semibold text-slate-300 flex justify-between items-center transition-all group"
              >
                <span>Аварийные объекты Жамбылской обл. (TXT)</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
