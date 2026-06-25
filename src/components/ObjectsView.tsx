import React from "react";
import { HydroObject } from "../data/types";
import { Search, ChevronDown, ChevronUp, SlidersHorizontal, Trash2, Database, Eye } from "lucide-react";

interface ObjectsViewProps {
  data: HydroObject[];
  onSelectObject: (obj: HydroObject) => void;
  initialStatusFilter: string | null;
  initialSearchQuery: string;
}

type SortField = "id" | "district" | "waterSource" | "yearOfCommissioning" | "length" | "wearPercentage" | "technicalCondition" | "calculatedStatus";
type SortOrder = "asc" | "desc";

export default function ObjectsView({ 
  data, 
  onSelectObject,
  initialStatusFilter,
  initialSearchQuery
}: ObjectsViewProps) {
  // Filter and search states
  const [searchQuery, setSearchQuery] = React.useState(initialSearchQuery || "");
  const [statusFilter, setStatusFilter] = React.useState<string>(initialStatusFilter || "All");
  const [districtFilter, setDistrictFilter] = React.useState<string>("All");
  const [wearRange, setWearRange] = React.useState<string>("All");
  const [yearRange, setYearRange] = React.useState<string>("All");

  // Sorting state
  const [sortField, setSortField] = React.useState<SortField>("id");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setPageSize] = React.useState(20);

  // Sync initial status filter or global search query from props
  React.useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  React.useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Unique lists for filters
  const uniqueDistricts = React.useMemo(() => {
    const districts = new Set(data.map((item) => item.district));
    return ["All", ...Array.from(districts).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      return numA - numB;
    })];
  }, [data]);

  const uniqueStatuses = ["All", "Normal", "Monitoring", "Repair", "Emergency"];

  // Handle sorting trigger
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setDistrictFilter("All");
    setWearRange("All");
    setYearRange("All");
    setSortField("id");
    setSortOrder("asc");
    setCurrentPage(1);
  };

  // Filtered dataset
  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      // 1. Search Query (matches channel ID, district, water source or parameters)
      const query = searchQuery.toLowerCase().trim();
      const matchSearch = query === "" || 
        item.id.toString().includes(query) ||
        item.district.toLowerCase().includes(query) ||
        item.waterSource.toLowerCase().includes(query) ||
        item.parameters.toLowerCase().includes(query);

      // 2. Status Filter
      const matchStatus = statusFilter === "All" || item.calculatedStatus === statusFilter;

      // 3. District Filter
      const matchDistrict = districtFilter === "All" || item.district === districtFilter;

      // 4. Wear range filter
      let matchWear = true;
      if (wearRange === "low") matchWear = item.wearPercentage <= 25;
      else if (wearRange === "mid") matchWear = item.wearPercentage > 25 && item.wearPercentage <= 50;
      else if (wearRange === "high") matchWear = item.wearPercentage > 50 && item.wearPercentage <= 75;
      else if (wearRange === "critical") matchWear = item.wearPercentage > 75;

      // 5. Year Range filter
      let matchYear = true;
      const yr = item.yearOfCommissioning;
      if (yearRange === "old") matchYear = yr !== null && yr < 1950;
      else if (yearRange === "mid") matchYear = yr !== null && yr >= 1950 && yr < 1980;
      else if (yearRange === "new") matchYear = yr !== null && yr >= 1980;
      else if (yearRange === "unknown") matchYear = yr === null;

      return matchSearch && matchStatus && matchDistrict && matchWear && matchYear;
    });
  }, [data, searchQuery, statusFilter, districtFilter, wearRange, yearRange]);

  // Sorted and Paginated dataset
  const sortedData = React.useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Handle nulls
      if (valA === null || valA === undefined) return sortOrder === "asc" ? 1 : -1;
      if (valB === null || valB === undefined) return sortOrder === "asc" ? -1 : 1;

      if (typeof valA === "string") {
        return sortOrder === "asc" 
          ? valA.localeCompare(valB, "ru") 
          : valB.localeCompare(valA, "ru");
      } else {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
    });
  }, [filteredData, sortField, sortOrder]);

  // Pagination boundaries
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = React.useMemo(() => {
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, startIndex, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 inline ml-1" /> : <ChevronDown className="w-3.5 h-3.5 inline ml-1" />;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              Государственный Реестр Каналов
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Найдено объектов: {totalItems} из {data.length}
            </p>
          </div>
          
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Сбросить фильтры
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 pt-2">
          {/* Search bar */}
          <div className="relative sm:col-span-2 md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Поиск по каналу, району..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* District Select */}
          <select
            value={districtFilter}
            onChange={(e) => { setDistrictFilter(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">Все районы</option>
            {uniqueDistricts.filter(d => d !== "All").map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">Все статусы риска</option>
            <option value="Normal">Исправное (Норма)</option>
            <option value="Monitoring">Требует наблюдения</option>
            <option value="Repair">Требует ремонта</option>
            <option value="Emergency">Аварийное состояние</option>
          </select>

          {/* Wear Range Select */}
          <select
            value={wearRange}
            onChange={(e) => { setWearRange(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">Любой износ</option>
            <option value="low">0% – 25% (Низкий)</option>
            <option value="mid">25% – 50% (Средний)</option>
            <option value="high">50% – 75% (Высокий)</option>
            <option value="critical">Более 75% (Аварийный)</option>
          </select>

          {/* Year Range Select */}
          <select
            value={yearRange}
            onChange={(e) => { setYearRange(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">Любой год постройки</option>
            <option value="old">До 1950 года (Очень старые)</option>
            <option value="mid">1950 – 1980 годы (Средние)</option>
            <option value="new">После 1980 года (Относ. новые)</option>
            <option value="unknown">Год постройки не указан</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-850 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <th onClick={() => handleSort("id")} className="px-6 py-4 cursor-pointer hover:bg-slate-800 select-none">
                  № Объекта {getSortIcon("id")}
                </th>
                <th onClick={() => handleSort("district")} className="px-6 py-4 cursor-pointer hover:bg-slate-800 select-none">
                  Район {getSortIcon("district")}
                </th>
                <th onClick={() => handleSort("waterSource")} className="px-6 py-4 cursor-pointer hover:bg-slate-800 select-none">
                  Водоисточник {getSortIcon("waterSource")}
                </th>
                <th onClick={() => handleSort("yearOfCommissioning")} className="px-6 py-4 cursor-pointer hover:bg-slate-800 select-none text-center">
                  Год ввода {getSortIcon("yearOfCommissioning")}
                </th>
                <th onClick={() => handleSort("length")} className="px-6 py-4 cursor-pointer hover:bg-slate-800 select-none text-right">
                  Протяжённость, км {getSortIcon("length")}
                </th>
                <th onClick={() => handleSort("wearPercentage")} className="px-6 py-4 cursor-pointer hover:bg-slate-800 select-none text-center">
                  Износ, % {getSortIcon("wearPercentage")}
                </th>
                <th onClick={() => handleSort("technicalCondition")} className="px-6 py-4 cursor-pointer hover:bg-slate-800 select-none text-center">
                  Тех. Состояние {getSortIcon("technicalCondition")}
                </th>
                <th onClick={() => handleSort("calculatedStatus")} className="px-6 py-4 cursor-pointer hover:bg-slate-800 select-none text-center">
                  Расчётный статус {getSortIcon("calculatedStatus")}
                </th>
                <th className="px-6 py-4 text-center">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 text-xs font-medium">
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr 
                    key={item.id}
                    className="hover:bg-slate-950/40 transition-colors group"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {item.id}
                    </td>
                    <td className="px-6 py-4">
                      {item.district}
                    </td>
                    <td className="px-6 py-4">
                      {item.waterSource}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      {item.yearOfCommissioning ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {item.length.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      <span className={`font-bold ${
                        item.wearPercentage > 75 ? "text-rose-400" : item.wearPercentage > 50 ? "text-orange-400" : "text-slate-300"
                      }`}>
                        {item.wearPercentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.technicalCondition === "удов." ? "bg-emerald-950/40 text-emerald-400" : "bg-rose-955/40 text-rose-400"
                      }`}>
                        {item.technicalCondition === "удов." ? "Удовл." : "Неудовл."}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        item.calculatedStatus === "Normal" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40" :
                        item.calculatedStatus === "Monitoring" ? "bg-sky-950/40 text-sky-400 border-sky-900/40" :
                        item.calculatedStatus === "Repair" ? "bg-orange-950/40 text-orange-400 border-orange-900/40" :
                        "bg-rose-955/40 text-rose-400 border-rose-900/40"
                      }`}>
                        {item.calculatedStatus === "Normal" ? "Норма" :
                         item.calculatedStatus === "Monitoring" ? "Наблюдение" :
                         item.calculatedStatus === "Repair" ? "Ремонт" : "Авария"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onSelectObject(item)}
                        className="p-1.5 bg-slate-950 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg border border-slate-850 transition-all"
                        title="Открыть паспорт канала"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500 font-semibold">
                    Объекты по заданным фильтрам не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-950 border-t border-slate-850 flex justify-between items-center text-xs font-semibold text-slate-400">
            <div>
              Показано {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} из {totalItems} каналов
            </div>
            
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-900 select-none transition-all"
              >
                Назад
              </button>
              
              <div className="flex items-center px-3 font-mono text-slate-300">
                {currentPage} / {totalPages}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-900 select-none transition-all"
              >
                Вперёд
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
