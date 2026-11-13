import React, { useState, useMemo } from 'react';
import { Procedure } from '../types';
import {
  TrangThaiBienDong,
  getProcedureTrangThai,
  getProcedureDate,
  filterProceduresForReport,
  computeBienDongStats,
  exportBienDongExcelReport,
  BienDongFilterOptions
} from '../utils/bienDongHelper';
import {
  X,
  FileSpreadsheet,
  Printer,
  Calendar,
  CalendarRange,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Clock,
  Search,
  Check,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  Lock
} from 'lucide-react';

interface BienDongReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedures: Procedure[];
  onUpdateProcedure?: (updated: Procedure) => void;
  availableLinhVuc?: string[];
  agencyName?: string;
  isAdminLoggedIn?: boolean;
  onRequireAdminLogin?: () => void;
}

export default function BienDongReportModal({
  isOpen,
  onClose,
  procedures,
  onUpdateProcedure,
  availableLinhVuc = [],
  agencyName = 'UBND XÃ BA CHẼ',
  isAdminLoggedIn = true,
  onRequireAdminLogin
}: BienDongReportModalProps) {
  // Current date values
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

  const formatInputDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const defaultFromDate = formatInputDate(new Date(currentYear, now.getMonth(), 1));
  const defaultToDate = formatInputDate(now);

  // Filter state
  const [periodType, setPeriodType] = useState<'quarter' | 'month' | 'year' | 'date_range' | 'all'>('quarter');
  const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [fromDate, setFromDate] = useState<string>(defaultFromDate);
  const [toDate, setToDate] = useState<string>(defaultToDate);
  const [selectedCap, setSelectedCap] = useState<string>('all');
  const [selectedLinhVuc, setSelectedLinhVuc] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'bien_dong' | TrangThaiBienDong>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Sub-tab view: 'detail' (danh sách chi tiết) | 'summary' (bảng tổng hợp theo lĩnh vực)
  const [activeTab, setActiveTab] = useState<'detail' | 'summary'>('detail');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const isInvalidDateRange = periodType === 'date_range' && Boolean(fromDate && toDate && fromDate > toDate);

  // Filtered procedures for current period
  const filterOptions: BienDongFilterOptions = useMemo(() => ({
    periodType,
    quarter: selectedQuarter,
    month: selectedMonth,
    year: selectedYear,
    fromDate,
    toDate,
    capThucHien: selectedCap,
    linhVuc: selectedLinhVuc,
    statusFilter: statusFilter
  }), [periodType, selectedQuarter, selectedMonth, selectedYear, fromDate, toDate, selectedCap, selectedLinhVuc, statusFilter]);

  // All procedures in this period matching period/cap/linhVuc (regardless of statusFilter) for KPI card counts
  const basePeriodProcedures = useMemo(() => {
    return filterProceduresForReport(procedures, {
      ...filterOptions,
      statusFilter: 'all'
    });
  }, [procedures, filterOptions]);

  const baseStats = useMemo(() => {
    return computeBienDongStats(basePeriodProcedures);
  }, [basePeriodProcedures]);

  // All procedures in this period (including statusFilter, without keyword search)
  const periodProcedures = useMemo(() => {
    return filterProceduresForReport(procedures, filterOptions);
  }, [procedures, filterOptions]);

  // Statistics
  const stats = useMemo(() => {
    return computeBienDongStats(periodProcedures);
  }, [periodProcedures]);

  // Filtered with search keyword
  const displayProcedures = useMemo(() => {
    if (!searchKeyword.trim()) return periodProcedures;
    const kw = searchKeyword.toLowerCase().trim();
    return periodProcedures.filter(p =>
      p.maTthc.toLowerCase().includes(kw) ||
      p.tenTthc.toLowerCase().includes(kw) ||
      p.linhVuc.toLowerCase().includes(kw) ||
      (p.canCuPhapLy && p.canCuPhapLy.toLowerCase().includes(kw))
    );
  }, [periodProcedures, searchKeyword]);

  const formatDisplayDate = (iso: string) => {
    const parts = iso.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
  };

  // Title string based on period
  const periodTitle = useMemo(() => {
    if (periodType === 'quarter') return `Quý ${selectedQuarter} Năm ${selectedYear}`;
    if (periodType === 'month') return `Tháng ${selectedMonth} Năm ${selectedYear}`;
    if (periodType === 'year') return `Cả Năm ${selectedYear}`;
    if (periodType === 'date_range') {
      if (fromDate && toDate) {
        return `Từ ngày ${formatDisplayDate(fromDate)} đến ngày ${formatDisplayDate(toDate)}`;
      }
      if (fromDate) return `Từ ngày ${formatDisplayDate(fromDate)}`;
      if (toDate) return `Đến ngày ${formatDisplayDate(toDate)}`;
      return 'Theo khoảng ngày';
    }
    return 'Toàn thời gian';
  }, [periodType, selectedQuarter, selectedMonth, selectedYear, fromDate, toDate]);

  // Handle Quick Status Update for a procedure directly in the modal
  const handleQuickStatusChange = (proc: Procedure, newStatus: TrangThaiBienDong) => {
    if (!isAdminLoggedIn) {
      if (onRequireAdminLogin) onRequireAdminLogin();
      return;
    }
    if (!onUpdateProcedure) return;
    const updated: Procedure = {
      ...proc,
      trangThai: newStatus,
      ngayCapNhat: new Date().toISOString()
    };
    onUpdateProcedure(updated);
  };

  // Handle Export Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportBienDongExcelReport({
        procedures: periodProcedures,
        filterOptions,
        agencyName,
        reportTitle: `BÁO CÁO TỔNG HỢP DANH MỤC TTHC SỬA ĐỔI, BỔ SUNG, BÃI BỎ ${periodTitle.toUpperCase()}`
      });
    } catch (err) {
      console.error('Lỗi khi xuất file Excel báo cáo:', err);
      alert('Không thể xuất file Excel báo cáo. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Print Report
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn"
        id="bien-dong-report-modal"
      >
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700/60 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Báo cáo định kỳ
              </span>
              <span className="text-xs text-slate-300 font-medium font-mono">
                {periodTitle}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Báo cáo Tổng hợp TTHC Sửa đổi, Bổ sung & Bãi bỏ
            </h2>
            <p className="text-xs text-slate-300">
              Thống kê, tổng hợp biến động thủ tục hành chính phục vụ công tác kiểm soát TTHC và chỉ số cải cách hành chính (PAR INDEX)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors"
              title="Đóng cửa sổ"
              id="close-bien-dong-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PERIOD CONTROLS & FILTER BAR */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3 shrink-0">
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Period Type Selection Tabs */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setPeriodType('quarter')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  periodType === 'quarter'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Báo cáo theo Quý
              </button>

              <button
                onClick={() => setPeriodType('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  periodType === 'month'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Báo cáo theo Tháng
              </button>

              <button
                onClick={() => setPeriodType('date_range')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  periodType === 'date_range'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Theo khoảng ngày
              </button>

              <button
                onClick={() => setPeriodType('year')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  periodType === 'year'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Cả Năm
              </button>

              <button
                onClick={() => setPeriodType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  periodType === 'all'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Toàn thời gian
              </button>
            </div>

            {/* Quick Export & Print Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                disabled={isExporting || isInvalidDateRange}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                id="export-bien-dong-excel-btn"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isExporting ? 'Đang xuất Excel...' : 'Xuất Excel Báo cáo'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
                title="In hoặc lưu file PDF"
                id="print-bien-dong-report-btn"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>In / Xuất PDF</span>
              </button>
            </div>

          </div>

          {/* Selectors for Quarter / Month / Year / Date Range & Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
            
            {/* Year Selector (only when not date_range or all) */}
            {periodType !== 'date_range' && periodType !== 'all' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Năm báo cáo</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-600"
                >
                  <option value={2026}>Năm 2026</option>
                  <option value={2025}>Năm 2025</option>
                  <option value={2024}>Năm 2024</option>
                  <option value={2023}>Năm 2023</option>
                  <option value={2022}>Năm 2022</option>
                  <option value={2021}>Năm 2021</option>
                </select>
              </div>
            )}

            {/* Date Range Selectors (if periodType === 'date_range') */}
            {periodType === 'date_range' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Từ ngày</label>
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-600"
                    id="report-from-date"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Đến ngày</label>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-600"
                    id="report-to-date"
                  />
                </div>
              </>
            )}

            {/* Quarter Selector (if periodType === 'quarter') */}
            {periodType === 'quarter' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Chọn Quý</label>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-600"
                >
                  <option value={1}>Quý I (Tháng 1 - 3)</option>
                  <option value={2}>Quý II (Tháng 4 - 6)</option>
                  <option value={3}>Quý III (Tháng 7 - 9)</option>
                  <option value={4}>Quý IV (Tháng 10 - 12)</option>
                </select>
              </div>
            )}

            {/* Month Selector (if periodType === 'month') */}
            {periodType === 'month' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Chọn Tháng</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-600"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Trạng thái TTHC</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="bien_dong">⭐ Chỉ TTHC Biến động (SĐBS, Bãi bỏ)</option>
                <option value="Sửa đổi, bổ sung">Sửa đổi, bổ sung</option>
                <option value="Bãi bỏ">Bãi bỏ</option>
                <option value="Ban hành mới">Ban hành mới</option>
                <option value="Hiện hành">Đang hiện hành</option>
              </select>
            </div>

            {/* Authority level */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Cấp thực hiện</label>
              <select
                value={selectedCap}
                onChange={(e) => setSelectedCap(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="all">Tất cả các cấp</option>
                <option value="Cấp xã">Cấp xã</option>
                <option value="Thành phố">Thành phố</option>
                <option value="Cấp xã, Thành phố">Cấp xã & Thành phố</option>
                <option value="TTHC liên thông">Liên thông</option>
              </select>
            </div>

            {/* Sector */}
            <div className="space-y-1 col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Lĩnh vực quản lý</label>
              <select
                value={selectedLinhVuc}
                onChange={(e) => setSelectedLinhVuc(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-600"
              >
                <option value="all">-- Tất cả Lĩnh vực ({availableLinhVuc.length}) --</option>
                {availableLinhVuc.map(lv => (
                  <option key={lv} value={lv}>{lv}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Quick date presets & validation warning for date_range */}
          {periodType === 'date_range' && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Chọn nhanh:</span>
                <button
                  type="button"
                  onClick={() => {
                    const t = formatInputDate(now);
                    setFromDate(t);
                    setToDate(t);
                  }}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-red-400 hover:text-red-700 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                    setFromDate(formatInputDate(d7));
                    setToDate(formatInputDate(now));
                  }}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-red-400 hover:text-red-700 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                >
                  7 ngày qua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
                    setFromDate(formatInputDate(d30));
                    setToDate(formatInputDate(now));
                  }}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-red-400 hover:text-red-700 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                >
                  30 ngày qua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    setFromDate(formatInputDate(firstOfMonth));
                    setToDate(formatInputDate(now));
                  }}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-red-400 hover:text-red-700 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                >
                  Từ đầu tháng
                </button>
              </div>

              {isInvalidDateRange && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Ngày bắt đầu ("Từ ngày") không được lớn hơn ngày kết thúc ("Đến ngày").</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* 4 CORE KPI METRIC CARDS - Click để lọc & hiển thị danh sách thủ tục tương ứng */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white border-b border-slate-100 shrink-0">
          
          {/* Card 1: Sửa đổi, bổ sung */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter(prev => prev === 'Sửa đổi, bổ sung' ? 'all' : 'Sửa đổi, bổ sung');
              setActiveTab('detail');
            }}
            title="Nhấn để xem các thủ tục Sửa đổi, Bổ sung"
            className={`text-left rounded-xl p-3.5 flex items-center justify-between transition-all cursor-pointer border ${
              statusFilter === 'Sửa đổi, bổ sung'
                ? 'bg-amber-100/80 border-amber-500 ring-2 ring-amber-400/70 shadow-sm'
                : 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/60 hover:border-amber-400 hover:shadow-xs'
            }`}
          >
            <div>
              <p className="text-[11px] font-bold uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
                <span>Sửa đổi, Bổ sung</span>
                {statusFilter === 'Sửa đổi, bổ sung' && (
                  <span className="text-[9px] bg-amber-700 text-white px-1.5 py-0.2 rounded">Đang lọc</span>
                )}
              </p>
              <p className="text-2xl font-black text-amber-900 font-mono mt-0.5">{baseStats.suaDoi}</p>
              <p className="text-[11px] text-amber-700 font-medium">Thủ tục hành chính</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold shrink-0">
              SĐBS
            </div>
          </button>

          {/* Card 2: Bãi bỏ */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter(prev => prev === 'Bãi bỏ' ? 'all' : 'Bãi bỏ');
              setActiveTab('detail');
            }}
            title="Nhấn để xem các thủ tục Bãi bỏ / Hủy bỏ"
            className={`text-left rounded-xl p-3.5 flex items-center justify-between transition-all cursor-pointer border ${
              statusFilter === 'Bãi bỏ'
                ? 'bg-rose-100/80 border-rose-500 ring-2 ring-rose-400/70 shadow-sm'
                : 'bg-rose-50/70 border-rose-200/80 hover:bg-rose-100/60 hover:border-rose-400 hover:shadow-xs'
            }`}
          >
            <div>
              <p className="text-[11px] font-bold uppercase text-rose-800 tracking-wider flex items-center gap-1.5">
                <span>Bãi bỏ / Hủy bỏ</span>
                {statusFilter === 'Bãi bỏ' && (
                  <span className="text-[9px] bg-rose-700 text-white px-1.5 py-0.2 rounded">Đang lọc</span>
                )}
              </p>
              <p className="text-2xl font-black text-rose-900 font-mono mt-0.5">{baseStats.baiBo}</p>
              <p className="text-[11px] text-rose-700 font-medium">Thủ tục hết hiệu lực</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-800 flex items-center justify-center font-bold shrink-0">
              BÃI
            </div>
          </button>

          {/* Card 3: Ban hành mới */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter(prev => prev === 'Ban hành mới' ? 'all' : 'Ban hành mới');
              setActiveTab('detail');
            }}
            title="Nhấn để xem các thủ tục Ban hành mới"
            className={`text-left rounded-xl p-3.5 flex items-center justify-between transition-all cursor-pointer border ${
              statusFilter === 'Ban hành mới'
                ? 'bg-emerald-100/80 border-emerald-500 ring-2 ring-emerald-400/70 shadow-sm'
                : 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/60 hover:border-emerald-400 hover:shadow-xs'
            }`}
          >
            <div>
              <p className="text-[11px] font-bold uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                <span>Ban hành mới</span>
                {statusFilter === 'Ban hành mới' && (
                  <span className="text-[9px] bg-emerald-700 text-white px-1.5 py-0.2 rounded">Đang lọc</span>
                )}
              </p>
              <p className="text-2xl font-black text-emerald-900 font-mono mt-0.5">{baseStats.banHanhMoi}</p>
              <p className="text-[11px] text-emerald-700 font-medium">Quy trình công bố mới</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-800 flex items-center justify-center font-bold shrink-0">
              MỚI
            </div>
          </button>

          {/* Card 4: Tổng số TTHC trong kỳ */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setActiveTab('detail');
            }}
            title="Nhấn để hiển thị toàn bộ TTHC trong kỳ báo cáo"
            className={`text-left rounded-xl p-3.5 flex items-center justify-between transition-all cursor-pointer border ${
              statusFilter === 'all'
                ? 'bg-blue-100/80 border-blue-500 ring-2 ring-blue-400/70 shadow-sm'
                : 'bg-blue-50/70 border-blue-200/80 hover:bg-blue-100/60 hover:border-blue-400 hover:shadow-xs'
            }`}
          >
            <div>
              <p className="text-[11px] font-bold uppercase text-blue-800 tracking-wider flex items-center gap-1.5">
                <span>Tổng TTHC xét duyệt</span>
                {statusFilter === 'all' && (
                  <span className="text-[9px] bg-blue-700 text-white px-1.5 py-0.2 rounded">Tất cả</span>
                )}
              </p>
              <p className="text-2xl font-black text-blue-900 font-mono mt-0.5">{baseStats.total}</p>
              <p className="text-[11px] text-blue-700 font-medium">
                Biến động: <strong className="text-blue-950 font-mono">{baseStats.tongBienDong}</strong> TTHC
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-800 flex items-center justify-center font-bold shrink-0">
              TỔNG
            </div>
          </button>

        </div>

        {/* SUB-VIEW TABS (Chi tiết danh mục vs Bảng tổng hợp theo lĩnh vực) & SEARCH */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'detail'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Danh mục chi tiết ({displayProcedures.length} thủ tục)
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'summary'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Tổng hợp theo Lĩnh vực ({Object.keys(stats.byLinhVuc).length} lĩnh vực)
            </button>
          </div>

          {activeTab === 'detail' && (
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm mã TTHC, tên, quyết định..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-red-600"
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          )}

        </div>

        {/* MODAL BODY (SCROLLABLE TABLE CONTENT) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          
          {/* TAB 1: DANH MỤC CHI TIẾT TTHC */}
          {activeTab === 'detail' && (
            <div>
              {displayProcedures.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">Không tìm thấy thủ tục hành chính phù hợp</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Không có thủ tục nào khớp với kỳ báo cáo "{periodTitle}" hoặc bộ lọc được chọn.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider select-none">
                        <th className="py-2.5 px-3 text-center w-12">STT</th>
                        <th className="py-2.5 px-3 text-center w-28">Mã TTHC</th>
                        <th className="py-2.5 px-4">Tên thủ tục hành chính</th>
                        <th className="py-2.5 px-3 w-40">Lĩnh vực</th>
                        <th className="py-2.5 px-3 text-center w-28">Thẩm quyền</th>
                        <th className="py-2.5 px-3 text-center w-40">Trạng thái biến động</th>
                        <th className="py-2.5 px-3 w-56">Quyết định / Căn cứ</th>
                        <th className="py-2.5 px-3 text-center w-24">Ngày hiệu lực</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayProcedures.map((proc, index) => {
                        const st = getProcedureTrangThai(proc);
                        const pDate = getProcedureDate(proc);
                        const formattedDate = pDate.toLocaleDateString('vi-VN');

                        return (
                          <tr 
                            key={proc.id} 
                            className={`hover:bg-slate-50 transition-colors ${
                              st === 'Bãi bỏ' ? 'bg-rose-50/30' :
                              st === 'Sửa đổi, bổ sung' ? 'bg-amber-50/30' :
                              st === 'Ban hành mới' ? 'bg-emerald-50/30' : ''
                            }`}
                          >
                            <td className="py-3 px-3 text-center font-mono text-slate-400 font-semibold">
                              {index + 1}
                            </td>

                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 bg-slate-50">
                              {proc.maTthc}
                            </td>

                            <td className="py-3 px-4 font-semibold text-slate-800 max-w-sm">
                              <div className="line-clamp-2 leading-relaxed">{proc.tenTthc}</div>
                              {proc.ghiChu && (
                                <span className="text-[10px] text-slate-400 font-normal italic block mt-0.5">
                                  {proc.ghiChu}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-slate-700">
                              <span className="font-semibold block">{proc.linhVuc}</span>
                              <span className="text-[10px] text-slate-400 block">{proc.soNganh}</span>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                proc.capThucHien.includes('xã') 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}>
                                {proc.capThucHien}
                              </span>
                            </td>

                            {/* Status with Quick Toggle Dropdown */}
                            <td className="py-3 px-3 text-center">
                              <div className="relative inline-block">
                                <select
                                  value={st}
                                  onChange={(e) => handleQuickStatusChange(proc, e.target.value as TrangThaiBienDong)}
                                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-colors appearance-none pr-6 ${
                                    st === 'Bãi bỏ'
                                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                                      : st === 'Sửa đổi, bổ sung'
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : st === 'Ban hành mới'
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-slate-100 text-slate-700 border-slate-300'
                                  }`}
                                  title="Nhấn để đổi trạng thái biến động của thủ tục này"
                                >
                                  <option value="Hiện hành">Đang hiện hành</option>
                                  <option value="Sửa đổi, bổ sung">Sửa đổi, bổ sung</option>
                                  <option value="Bãi bỏ">Bãi bỏ</option>
                                  <option value="Ban hành mới">Ban hành mới</option>
                                </select>
                                <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                              </div>
                            </td>

                            <td className="py-3 px-3 text-slate-600 text-[11px]">
                              <span className="line-clamp-2 italic">{proc.canCuPhapLy || 'Quy định pháp luật hiện hành'}</span>
                            </td>

                            <td className="py-3 px-3 text-center text-[11px] text-slate-600 font-mono">
                              {formattedDate}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BẢNG TỔNG HỢP SỐ LIỆU THEO LĨNH VỰC */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Bảng Thống Kê Biến Động Theo Từng Lĩnh Vực ({periodTitle})
                  </h4>
                </div>
                
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3 text-center w-12">STT</th>
                      <th className="py-2.5 px-4">Lĩnh vực quản lý</th>
                      <th className="py-2.5 px-3 text-center w-28 bg-blue-50/50">Tổng số TTHC</th>
                      <th className="py-2.5 px-3 text-center w-32 bg-amber-50/50 text-amber-900">Sửa đổi, Bổ sung</th>
                      <th className="py-2.5 px-3 text-center w-28 bg-rose-50/50 text-rose-900">Bãi bỏ</th>
                      <th className="py-2.5 px-3 text-center w-28 bg-emerald-50/50 text-emerald-900">Ban hành mới</th>
                      <th className="py-2.5 px-3 text-center w-28">Hiện hành</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {Object.keys(stats.byLinhVuc).sort().map((lvName, idx) => {
                      const item = stats.byLinhVuc[lvName];
                      return (
                        <tr key={lvName} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {lvName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono text-blue-900 bg-blue-50/30">
                            {item.total}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono text-amber-900 bg-amber-50/30">
                            {item.suaDoi || 0}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono text-rose-900 bg-rose-50/30">
                            {item.baiBo || 0}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-900 bg-emerald-50/30">
                            {item.banHanhMoi || 0}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                            {item.hienHanh || 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={2} className="py-3 px-4 text-center uppercase">
                        TỔNG CỘNG TOÀN ĐƠN VỊ
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-blue-950 text-sm">
                        {stats.total}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-amber-950 text-sm bg-amber-100/60">
                        {stats.suaDoi}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-rose-950 text-sm bg-rose-100/60">
                        {stats.baiBo}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-950 text-sm bg-emerald-100/60">
                        {stats.banHanhMoi}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-800 text-sm">
                        {stats.hienHanh}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Kỳ báo cáo: <strong className="text-slate-800">{periodTitle}</strong> • Tổng số: <strong className="text-slate-800">{stats.total}</strong> thủ tục (SĐBS: <strong className="text-amber-700">{stats.suaDoi}</strong>, Bãi bỏ: <strong className="text-rose-700">{stats.baiBo}</strong>)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={isExporting || isInvalidDateRange}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất File Excel</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
