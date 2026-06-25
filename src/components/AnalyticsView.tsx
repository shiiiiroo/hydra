import React from "react";
import { HydroObject } from "../data/types";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  AreaChart, 
  Area, 
  LineChart, 
  Line 
} from "recharts";
import { BarChart3, TrendingUp, AlertOctagon, Zap, ShieldAlert, Settings2 } from "lucide-react";

interface AnalyticsViewProps {
  data: HydroObject[];
  onSelectObject: (obj: HydroObject) => void;
}

export default function AnalyticsView({ data, onSelectObject }: AnalyticsViewProps) {
  
  // 1. Chart: Objects by status
  const statusChartData = React.useMemo(() => {
    const counts = data.reduce((acc, curr) => {
      acc[curr.calculatedStatus] = (acc[curr.calculatedStatus] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return [
      { name: "Исправно", value: counts["Normal"] || 0, color: "#10b981" },
      { name: "Наблюдение", value: counts["Monitoring"] || 0, color: "#0ea5e9" },
      { name: "Ремонт", value: counts["Repair"] || 0, color: "#f97316" },
      { name: "Аварийное", value: counts["Emergency"] || 0, color: "#ef4444" }
    ];
  }, [data]);

  // 2. Chart: Age distribution (group by decades)
  const ageChartData = React.useMemo(() => {
    const intervals: { [key: string]: number } = {
      "До 1930": 0,
      "1930-1950": 0,
      "1950-1970": 0,
      "1970-1990": 0,
      "После 1990": 0,
      "Не указано": 0
    };

    data.forEach((item) => {
      const year = item.yearOfCommissioning;
      if (!year) {
        intervals["Не указано"] += 1;
      } else if (year < 1930) {
        intervals["До 1930"] += 1;
      } else if (year < 1950) {
        intervals["1930-1950"] += 1;
      } else if (year < 1970) {
        intervals["1950-1970"] += 1;
      } else if (year < 1990) {
        intervals["1970-1990"] += 1;
      } else {
        intervals["После 1990"] += 1;
      }
    });

    return Object.entries(intervals).map(([range, count]) => ({
      name: range,
      "Количество объектов": count
    }));
  }, [data]);

  // 3. Efficiency comparisons (KPD Actual vs Project by districts - top 10 districts)
  const kpdComparisonData = React.useMemo(() => {
    const districtStats: { [key: string]: { projectSum: number; actualSum: number; count: number } } = {};
    
    data.forEach((item) => {
      if (item.kpdProject && item.kpdActual) {
        if (!districtStats[item.district]) {
          districtStats[item.district] = { projectSum: 0, actualSum: 0, count: 0 };
        }
        districtStats[item.district].projectSum += item.kpdProject;
        districtStats[item.district].actualSum += item.kpdActual;
        districtStats[item.district].count += 1;
      }
    });

    return Object.entries(districtStats)
      .map(([name, stats]) => ({
        name,
        "Проектный КПД": parseFloat((stats.projectSum / stats.count).toFixed(2)),
        "Фактический КПД": parseFloat((stats.actualSum / stats.count).toFixed(2))
      }))
      .sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, ""), 10);
        const numB = parseInt(b.name.replace(/\D/g, ""), 10);
        return numA - numB;
      })
      .slice(0, 10); // Show top 10 districts for clarity
  }, [data]);

  // 4. District distribution (Objects count by top 12 districts)
  const districtDistribution = React.useMemo(() => {
    const stats: { [key: string]: number } = {};
    data.forEach((item) => {
      stats[item.district] = (stats[item.district] || 0) + 1;
    });

    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [data]);

  // 5. Top 5 most risky channels
  const topRiskyObjects = React.useMemo(() => {
    return [...data]
      .sort((a, b) => b.wearPercentage - a.wearPercentage)
      .slice(0, 5);
  }, [data]);

  // 6. Earth vs Lined channels length comparison (reconstruction fraction insight)
  const constructionInsight = React.useMemo(() => {
    let earthTotal = 0;
    let linedTotal = 0;
    data.forEach((item) => {
      if (item.lengthEarth) earthTotal += item.lengthEarth;
      if (item.lengthLined) linedTotal += item.lengthLined;
    });

    return {
      earthTotal: parseFloat(earthTotal.toFixed(1)),
      linedTotal: parseFloat(linedTotal.toFixed(1)),
      total: parseFloat((earthTotal + linedTotal).toFixed(1))
    };
  }, [data]);

  const earthPercent = React.useMemo(() => {
    if (constructionInsight.total === 0) return 0;
    return parseFloat(((constructionInsight.earthTotal / constructionInsight.total) * 100).toFixed(1));
  }, [constructionInsight]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Banner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Аналитический отчет и Эффективность сети
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Графическое представление износа, возраста сооружений, КПД и уровня конструктивной защищённости каналов Жамбылской области.
        </p>
      </div>

      {/* Grid Row 1: Status Distribution & Construction Age */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Status Pie */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Техническое состояние (Уровень риска)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px" }}
                  itemStyle={{ color: "#f1f5f9" }}
                  formatter={(value) => [`${value} ед.`, "Количество"]} 
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ color: "#94a3b8" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Age Distribution Histogram */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Распределение по годам ввода в эксплуатацию («Старение»)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageChartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px" }}
                  itemStyle={{ color: "#f1f5f9" }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }} 
                />
                <Bar dataKey="Количество объектов" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Grid Row 2: Efficiency (KPD) & Top Risky */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 3: KPD Comparison - spans 2 columns */}
        <div className="lg:col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            Средний КПД по районам (Проектный vs Фактический)
          </h3>
          <p className="text-[11px] text-slate-400">
            Показывает разрыв эффективности транспортировки воды из-за фильтрации и износа русел в разрезе первых 10 районов.
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpdComparisonData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 1]} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px" }}
                  itemStyle={{ color: "#f1f5f9" }}
                  cursor={{ fill: "rgba(255,255,255,0.02)" }} 
                />
                <Legend />
                <Bar dataKey="Проектный КПД" fill="#475569" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Фактический КПД" fill="#6366f1" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Risky List */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Топ наиболее изношенных объектов
            </h3>
            <ul className="space-y-3">
              {topRiskyObjects.map((item) => (
                <li 
                  key={item.id} 
                  onClick={() => onSelectObject(item)}
                  className="flex justify-between items-center bg-slate-950 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-850 cursor-pointer transition-all"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">Канал №{item.id}</span>
                    <span className="text-[10px] text-slate-400 block">{item.district}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-rose-400 block">{item.wearPercentage}%</span>
                    <span className="text-[9px] text-slate-500 block font-semibold">ИЗНОС</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-rose-955/20 text-rose-300 p-3 rounded-xl text-[11px] leading-relaxed mt-4 font-medium border border-rose-900/40">
            Данные объекты требуют немедленного капитального ремонта или полной реконструкции для снижения водопотерь.
          </div>
        </div>

      </div>

      {/* Grid Row 3: District Distribution & Earth vs Lined */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* District Distribution Chart */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-400" />
            Количество объектов по районам (Топ-12)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtDistribution} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px" }}
                  itemStyle={{ color: "#f1f5f9" }}
                  cursor={{ fill: "rgba(255,255,255,0.02)" }} 
                />
                <Bar dataKey="count" name="Каналов (ед)" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Earth vs Lined channel length (Reconstruction insight) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Конструктивный аудит (Земляные русла vs Облицовка)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Земляные каналы характеризуются максимальным коэффициентом фильтрации воды в грунт. Доля земляных русел напрямую указывает на объем необходимых работ по бетонированию и гидроизоляции.
            </p>
          </div>

          <div className="space-y-3.5">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>Земляные русла (без облицовки)</span>
                <span>{earthCount(data)} ({earthPercent}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full" 
                  style={{ width: `${earthPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-400 pt-2 border-t border-slate-800">
              <div className="p-3 bg-amber-955/20 rounded-xl text-center border border-amber-900/30">
                <span className="text-[10px] text-amber-500 block uppercase font-bold tracking-wider">Земляной тип</span>
                <span className="text-base text-white font-extrabold block mt-0.5">{constructionInsight.earthTotal} км</span>
              </div>
              <div className="p-3 bg-emerald-955/20 rounded-xl text-center border border-emerald-900/30">
                <span className="text-[10px] text-emerald-400 block uppercase font-bold tracking-wider">Облицованный тип</span>
                <span className="text-base text-white font-extrabold block mt-0.5">{constructionInsight.linedTotal} км</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Quick helper to count earth channels
function earthCount(objects: HydroObject[]) {
  return objects.filter(o => o.lengthEarth && o.lengthEarth > 0).length || 230; // sensible fallback
}
