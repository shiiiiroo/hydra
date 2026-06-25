import React from "react";
import { HydroObject } from "../data/types";
import { FileText, Download, ShieldAlert, Calendar, Map, CheckCircle2, ChevronRight } from "lucide-react";

interface ReportsViewProps {
  data: HydroObject[];
  onSelectObject: (obj: HydroObject) => void;
}

type ReportTab = "regional" | "attention" | "district" | "schedule";

export default function ReportsView({ data, onSelectObject }: ReportsViewProps) {
  const [activeTab, setActiveTab] = React.useState<ReportTab>("regional");
  const [selectedDistrict, setSelectedDistrict] = React.useState<string>("Район 1");

  // Get unique districts
  const uniqueDistricts = React.useMemo(() => {
    const districts = new Set(data.map((item) => item.district));
    return Array.from(districts).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      return numA - numB;
    });
  }, [data]);

  // Data processors for each report:

  // 1. Regional Summary Data
  const regionalSummary = React.useMemo(() => {
    const total = data.length;
    const statsByDistrict = data.reduce((acc, curr) => {
      if (!acc[curr.district]) {
        acc[curr.district] = { count: 0, totalWear: 0, criticalCount: 0 };
      }
      acc[curr.district].count += 1;
      acc[curr.district].totalWear += curr.wearPercentage;
      if (curr.calculatedStatus === "Emergency" || curr.calculatedStatus === "Repair") {
        acc[curr.district].criticalCount += 1;
      }
      return acc;
    }, {} as { [key: string]: { count: number; totalWear: number; criticalCount: number } });

    const totalWear = data.reduce((sum, item) => sum + item.wearPercentage, 0);
    const avgWear = total > 0 ? (totalWear / total).toFixed(1) : "0";

    const rows = Object.entries(statsByDistrict).map(([name, stat]) => ({
      name,
      count: stat.count,
      avgWear: (stat.totalWear / stat.count).toFixed(1),
      criticalCount: stat.criticalCount
    })).sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, ""), 10);
      const numB = parseInt(b.name.replace(/\D/g, ""), 10);
      return numA - numB;
    });

    return { total, avgWear, rows };
  }, [data]);

  // 2. Attention Required
  const attentionRequiredData = React.useMemo(() => {
    return data
      .filter((item) => item.calculatedStatus === "Repair" || item.calculatedStatus === "Emergency")
      .sort((a, b) => b.wearPercentage - a.wearPercentage);
  }, [data]);

  // 3. District specific
  const districtData = React.useMemo(() => {
    return data.filter((item) => item.district === selectedDistrict);
  }, [data, selectedDistrict]);

  // 4. Inspection Schedule
  const scheduleData = React.useMemo(() => {
    const today = new Date();
    return data.map((item) => {
      const nextDate = new Date(today.getFullYear(), today.getMonth() + item.inspectionInterval, 15);
      return {
        ...item,
        nextDateStr: nextDate.toLocaleDateString("ru-RU", { year: "numeric", month: "long" }),
        nextDateUnix: nextDate.getTime()
      };
    }).sort((a, b) => a.nextDateUnix - b.nextDateUnix);
  }, [data]);

  // Download logic on the fly
  const handleDownload = (format: "txt" | "csv") => {
    let filename = `Report_${activeTab}_${Date.now()}.${format}`;
    let content = "";

    if (activeTab === "regional") {
      content = `СВОДНЫЙ ОТЧЁТ ПО ЖАМБЫЛСКОЙ ОБЛАСТИ\n`;
      content += `Всего объектов: ${regionalSummary.total}\n`;
      content += `Средний процент износа: ${regionalSummary.avgWear}%\n\n`;
      content += `Район,Количество каналов,Средний износ %,Аварийные\n`;
      regionalSummary.rows.forEach(r => {
        content += `${r.name},${r.count},${r.avgWear}%,${r.criticalCount}\n`;
      });
    } else if (activeTab === "attention") {
      content = `ОБЪЕКТЫ ТРЕБУЮЩИЕ ВНИМАНИЯ (РЕМОНТ / АВАРИЯ)\n`;
      content += `Всего критических объектов: ${attentionRequiredData.length}\n\n`;
      content += `ID,Район,Износ %,Состояние,Регламент инспекций\n`;
      attentionRequiredData.forEach(item => {
        content += `${item.id},${item.district},${item.wearPercentage}%,${item.technicalCondition === "удов." ? "Удовл." : "Неудовл."},Каждые ${item.inspectionInterval} мес.\n`;
      });
    } else if (activeTab === "district") {
      content = `ОТЧЁТ ДЛЯ ЛОКАЛЬНЫХ СЛУЖБ - ${selectedDistrict.toUpperCase()}\n`;
      content += `Каналов в районе: ${districtData.length}\n\n`;
      content += `ID,Водоисточник,Расход м3/с,Длина км,Износ %,Состояние\n`;
      districtData.forEach(item => {
        content += `${item.id},${item.waterSource},${item.throughput},${item.length},${item.wearPercentage}%,${item.technicalCondition === "удов." ? "Удовл." : "Неудовл."}\n`;
      });
    } else if (activeTab === "schedule") {
      content = `КАЛЕНДАРНЫЙ ГРАФИК ПЛАНОВЫХ ИНСПЕКЦИЙ И ОСМОТРОВ\n\n`;
      content += `ID,Район,Износ %,Статус риска,Регламент,Ожидаемая дата\n`;
      scheduleData.forEach(item => {
        content += `${item.id},${item.district},${item.wearPercentage}%,${item.calculatedStatus},1 раз в ${item.inspectionInterval} мес.,${item.nextDateStr}\n`;
      });
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[500px]">
      
      {/* Sidebar Report Switcher */}
      <div className="space-y-3.5 bg-slate-900 p-5 rounded-2xl border border-slate-800 h-fit">
        <h3 className="font-bold text-white text-sm flex items-center gap-1.5 pb-2 border-b border-slate-800">
          <FileText className="w-4 h-4 text-slate-400" />
          Шаблоны отчётов
        </h3>

        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab("regional")}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
              activeTab === "regional"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-950 text-slate-400 border-transparent hover:border-slate-800 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <Map className="w-4 h-4 shrink-0" />
              Сводный по региону
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab("attention")}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
              activeTab === "attention"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-950 text-slate-400 border-transparent hover:border-slate-800 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Требующие внимания
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab("district")}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
              activeTab === "district"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-950 text-slate-400 border-transparent hover:border-slate-800 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0" />
              Локальный по району
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab("schedule")}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
              activeTab === "schedule"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-950 text-slate-400 border-transparent hover:border-slate-800 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              График инспекций
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Report Render panel */}
      <div className="lg:col-span-3 bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
        
        <div className="space-y-6 flex-1">
          {/* Top layout */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Генерация отчёта</span>
              <h2 className="text-xl font-bold text-white mt-1">
                {activeTab === "regional" && "Сводный аналитический отчёт по региону"}
                {activeTab === "attention" && "Ведомость дефектов: Объекты требующие внимания"}
                {activeTab === "district" && `Локальный рапорт по району: ${selectedDistrict}`}
                {activeTab === "schedule" && "План-график выездных технических обследований"}
              </h2>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload("csv")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Экспорт CSV
              </button>
              <button
                onClick={() => handleDownload("txt")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Скачать TXT
              </button>
            </div>
          </div>

          {/* Sub Controls for district report */}
          {activeTab === "district" && (
            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-850 max-w-sm">
              <span className="text-xs font-semibold text-slate-400">Выбор района:</span>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white focus:outline-hidden"
              >
                {uniqueDistricts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* PREVIEWS */}

          {/* Tab 1: Regional Summary */}
          {activeTab === "regional" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Каналов всего</span>
                  <span className="text-2xl font-black text-white font-mono mt-1 block">{regionalSummary.total}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Средний износ</span>
                  <span className="text-2xl font-black text-white font-mono mt-1 block">{regionalSummary.avgWear}%</span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs font-medium text-slate-300">
                  <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Район обслуживания</th>
                      <th className="px-4 py-3 text-center">Каналов (ед)</th>
                      <th className="px-4 py-3 text-center">Средний износ</th>
                      <th className="px-4 py-3 text-center">Аварийные/Ремонт</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {regionalSummary.rows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/40">
                        <td className="px-4 py-2.5 font-semibold text-white">{r.name}</td>
                        <td className="px-4 py-2.5 text-center font-mono">{r.count}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-slate-300">{r.avgWear}%</td>
                        <td className="px-4 py-2.5 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded-sm ${r.criticalCount > 0 ? "bg-rose-955/40 text-rose-400 font-bold" : "text-slate-500 bg-slate-950"}`}>
                            {r.criticalCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Attention Required */}
          {activeTab === "attention" && (
            <div className="space-y-4">
              <div className="bg-rose-955/20 border border-rose-900/40 p-4 rounded-xl flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="text-xs font-semibold text-rose-300">
                  В реестр включены только сооружения, находящиеся в неудовлетворительном техническом состоянии или имеющие процент износа выше 50%.
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs font-medium text-slate-300">
                  <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3">№ Объекта</th>
                      <th className="px-4 py-3">Район</th>
                      <th className="px-4 py-3 text-center">Износ, %</th>
                      <th className="px-4 py-3 text-center">Периодичность</th>
                      <th className="px-4 py-3 text-center">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-mono">
                    {attentionRequiredData.slice(0, 100).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850/40">
                        <td className="px-4 py-2.5 font-bold text-white">{item.id}</td>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-300">{item.district}</td>
                        <td className="px-4 py-2.5 text-center text-rose-400 font-bold">{item.wearPercentage}%</td>
                        <td className="px-4 py-2.5 text-center font-sans">1 раз в {item.inspectionInterval} мес.</td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => onSelectObject(item)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-md font-sans font-semibold text-[10px]"
                          >
                            Паспорт
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: District Local Report */}
          {activeTab === "district" && (
            <div className="space-y-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs font-medium text-slate-300">
                  <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3">№ Объекта</th>
                      <th className="px-4 py-3">Водоисточник</th>
                      <th className="px-4 py-3 text-right">Расход м3/с</th>
                      <th className="px-4 py-3 text-center">Износ, %</th>
                      <th className="px-4 py-3 text-center font-sans">Регламент</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-mono">
                    {districtData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850/40">
                        <td className="px-4 py-2.5 font-bold text-white">{item.id}</td>
                        <td className="px-4 py-2.5 font-sans text-slate-300">{item.waterSource}</td>
                        <td className="px-4 py-2.5 text-right">{item.throughput > 0 ? item.throughput.toFixed(2) : "Переменный"}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-white">{item.wearPercentage}%</td>
                        <td className="px-4 py-2.5 text-center font-sans text-[11px]">Раз в {item.inspectionInterval} мес.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Schedule */}
          {activeTab === "schedule" && (
            <div className="space-y-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs font-medium text-slate-300">
                  <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3">№ Объекта</th>
                      <th className="px-4 py-3">Район обслуживания</th>
                      <th className="px-4 py-3 text-center">Статус риска</th>
                      <th className="px-4 py-3 text-center">Очередной осмотр</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-mono">
                    {scheduleData.slice(0, 100).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850/40">
                        <td className="px-4 py-2.5 font-bold text-white">{item.id}</td>
                        <td className="px-4 py-2.5 font-sans text-slate-300">{item.district}</td>
                        <td className="px-4 py-2.5 text-center font-sans font-semibold text-[11px]">
                          <span className={`inline-flex px-2 py-0.5 rounded-sm ${
                            item.calculatedStatus === "Emergency" ? "bg-rose-955/40 text-rose-400" :
                            item.calculatedStatus === "Repair" ? "bg-orange-950/40 text-orange-400" :
                            item.calculatedStatus === "Monitoring" ? "bg-sky-950/40 text-sky-400" : "bg-emerald-950/40 text-emerald-400"
                          }`}>
                            {item.calculatedStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-sans font-semibold text-white">
                          {item.nextDateStr}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-[10px] text-slate-500 text-center font-medium">
          Отчёт сформирован автоматически на основании реальных данных за 2026 год.
        </div>
      </div>
    </div>
  );
}
