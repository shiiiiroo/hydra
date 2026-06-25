import React from "react";
import { HydroObject } from "../data/types";
import { X, Calendar, Download, Shield, MapPin, CheckCircle, AlertTriangle, AlertOctagon, HelpCircle } from "lucide-react";

interface ObjectDetailModalProps {
  object: HydroObject | null;
  onClose: () => void;
}

export default function ObjectDetailModal({ object, onClose }: ObjectDetailModalProps) {
  if (!object) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Normal":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-900/40">
            <CheckCircle className="w-3.5 h-3.5" />
            Исправное (Норма)
          </span>
        );
      case "Monitoring":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-950/40 text-sky-400 border border-sky-900/40">
            <HelpCircle className="w-3.5 h-3.5" />
            Наблюдение
          </span>
        );
      case "Repair":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-950/40 text-orange-400 border border-orange-900/40">
            <AlertTriangle className="w-3.5 h-3.5" />
            Требует ремонта
          </span>
        );
      case "Emergency":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-955/40 text-rose-400 border border-rose-900/40">
            <AlertOctagon className="w-3.5 h-3.5" />
            Аварийное состояние
          </span>
        );
      default:
        return null;
    }
  };

  // Generate schedule of next 3 inspections based on interval
  const getNextInspections = (intervalMonths: number) => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 3; i++) {
      const nextDate = new Date(today.getFullYear(), today.getMonth() + i * intervalMonths, 15);
      dates.push(
        nextDate.toLocaleDateString("ru-RU", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    }
    return dates;
  };

  const handleDownloadReport = (type: "pdf" | "excel") => {
    // Generate simple mock download triggering standard browser notification
    const filename = `Passport_Channel_${object.id}.${type === "pdf" ? "pdf" : "xlsx"}`;
    const element = document.createElement("a");
    const file = new Blob([`Технический Паспорт Канала №${object.id}\nРайон: ${object.district}\nИзнос: ${object.wearPercentage}%\nСостояние: ${object.technicalCondition === "удов." ? "Удовлетворительное" : "Неудовлетворительное"}\nКПД факт/проект: ${object.kpdActual}/${object.kpdProject}`], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white font-sans">
                Технический Паспорт: Канал №{object.id}
              </h2>
              {getStatusBadge(object.calculatedStatus)}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Жамбылская область, {object.district} • Водоисточник: {object.waterSource}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Coordinates warning banner */}
          <div className="bg-indigo-950/30 border border-indigo-900/30 rounded-xl p-3 flex items-start gap-3">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-indigo-400 block">
                Приближённые координаты ГИС
              </span>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Координаты [{object.coordinates[0].toFixed(4)}, {object.coordinates[1].toFixed(4)}] сгенерированы автоматически на основе районного кластера для демонстрационных целей.
              </p>
            </div>
          </div>

          {/* Grid of details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Core Specs */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Основные параметры
              </h3>
              <div className="bg-slate-950 rounded-xl p-4 space-y-3.5 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="text-slate-400">Год ввода</span>
                  <span className="font-semibold text-white">{object.yearOfCommissioning ?? "Не указан"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="text-slate-400">Год на балансе</span>
                  <span className="font-semibold text-white">{object.yearOfBalance ?? "Не указан"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="text-slate-400">Расход воды (м³/с)</span>
                  <span className="font-semibold text-white">{object.throughput > 0 ? object.throughput.toFixed(2) : "Переменная"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Подвеш. площадь</span>
                  <span className="font-semibold text-white">
                    {object.area.toLocaleString()} га
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Dimensions & Efficiency */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Протяжённость и КПД
              </h3>
              <div className="bg-slate-950 rounded-xl p-4 space-y-3.5 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="text-slate-400">Общая длина</span>
                  <span className="font-semibold text-white">{object.length.toFixed(3)} км</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="text-slate-400">Земляное русло</span>
                  <span className="font-semibold text-white">
                    {object.lengthEarth !== null ? `${object.lengthEarth.toFixed(3)} км` : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="text-slate-400">Облицовано</span>
                  <span className="font-semibold text-white">
                    {object.lengthLined !== null ? `${object.lengthLined.toFixed(3)} км` : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">КПД (Проект / Факт)</span>
                  <span className="font-semibold text-white">
                    {object.kpdProject ?? "—"} / {object.kpdActual ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: Status & Legal */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Кадастр и Состояние
              </h3>
              <div className="bg-slate-950 rounded-xl p-4 space-y-3.5 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="text-slate-400">Кадастровый номер</span>
                  <span className="font-mono text-xs font-semibold text-white">{object.cadastralNumber}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="text-slate-400">Государственный акт</span>
                  <span className="font-semibold text-white">{object.stateAct}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="text-slate-400">Процент износа</span>
                  <span className={`font-semibold ${object.wearPercentage > 75 ? "text-rose-400 font-bold" : object.wearPercentage > 50 ? "text-orange-400 font-bold" : "text-white"}`}>
                    {object.wearPercentage}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Тех.состояние (исход.)</span>
                  <span className={`font-semibold ${object.technicalCondition === "не удов." ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}`}>
                    {object.technicalCondition === "удов." ? "Удовл." : "Неудовл."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Physical specs & channel geometry */}
          <div className="bg-slate-950 rounded-2xl p-5 border border-slate-850 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Параметры и Геометрия сечения канала
            </h4>
            <p className="text-sm text-slate-300 font-mono bg-slate-900 p-3 rounded-xl border border-slate-800 leading-relaxed">
              {object.parameters}
            </p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="text-xs text-slate-400">
                Количество гидротехнических сооружений на канале:{" "}
                <span className="font-semibold text-white">{object.structuresCount ?? "Не зафиксировано"}</span>
              </div>
            </div>
          </div>

          {/* Inspection and calendar logic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-800 rounded-2xl p-5 bg-slate-950/50 space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Регламент Планового Осмотра
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                В соответствии с риск-моделью для категории <strong className="text-white">"{object.calculatedStatus}"</strong> периодичность технического освидетельствования составляет:
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                <span className="text-2xl font-bold text-white">
                  1 раз в {object.inspectionInterval} {object.inspectionInterval === 1 ? "месяц" : object.inspectionInterval === 3 ? "месяца" : object.inspectionInterval === 6 ? "месяцев" : "12 месяцев"}
                </span>
              </div>
            </div>

            <div className="border border-slate-800 rounded-2xl p-5 bg-slate-950/50 space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2 text-sm">
                График следующих проверок
              </h4>
              <ul className="space-y-2.5">
                {getNextInspections(object.inspectionInterval).map((dateStr, idx) => (
                  <li key={idx} className="flex justify-between items-center text-xs bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 font-medium">Инспекция {idx + 1}</span>
                    <span className="font-mono text-white font-semibold">{dateStr}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap gap-3 justify-between items-center rounded-b-2xl">
          <div className="text-[10px] text-slate-500">
            Государственная база гидротехнических сооружений Жамбылской области • HydroMonitor MVP
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleDownloadReport("excel")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Скачать Excel
            </button>
            <button
              onClick={() => handleDownloadReport("pdf")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Экспорт PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
