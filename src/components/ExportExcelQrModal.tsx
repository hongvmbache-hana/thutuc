import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  CheckSquare,
  Square,
  Building2,
  Layers,
  FileCheck2,
  Download,
  Loader2,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  CheckCircle2,
  TableProperties
} from 'lucide-react';
import { Procedure, AppSettings } from '../types';
import { exportProceduresToExcelWithQr, ExcelExportOptions } from '../utils/excelExportHelper';

interface ExportExcelQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedures: Procedure[];
  settings?: AppSettings;
}

export default function ExportExcelQrModal({
  isOpen,
  onClose,
  procedures,
  settings
}: ExportExcelQrModalProps) {
  // --- 1. Filter state ---
  const [ministryMode, setMinistryMode] = useState<'all' | 'custom'>('all');
  const [selectedMinistries, setSelectedMinistries] = useState<Set<string>>(new Set());
  const [ministrySearch, setMinistrySearch] = useState<string>('');

  const [fieldMode, setFieldMode] = useState<'all' | 'custom'>('all');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [fieldSearch, setFieldSearch] = useState<string>('');

  // --- 2. Excel format options ---
  const [sheetMode, setSheetMode] = useState<'all_and_split' | 'split_only' | 'single_sheet'>('all_and_split');
  const [customHeader, setCustomHeader] = useState<string>('');
  const [customFileName, setCustomFileName] = useState<string>('');

  // --- 3. UI states ---
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  // Extract all unique Ministries (soNganh)
  const allMinistriesWithCounts = useMemo(() => {
    const counts: { [dept: string]: number } = {};
    procedures.forEach(p => {
      const key = (p.soNganh || '').trim() || 'Chưa phân loại';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b, 'vi'))
      .map(name => ({ name, count: counts[name] }));
  }, [procedures]);

  // Sync default selection of ministries when opened
  useEffect(() => {
    if (isOpen) {
      setMinistryMode('all');
      setSelectedMinistries(new Set(allMinistriesWithCounts.map(m => m.name)));
      setFieldMode('all');
      setProgress(null);
      setIsExporting(false);

      const today = new Date().toISOString().substring(0, 10);
      setCustomFileName(`So_tay_TTHC_QRCode_${today}`);
      setCustomHeader(settings?.siteTitle ? `${settings.siteTitle} - THỦ TỤC HÀNH CHÍNH CẤP XÃ` : 'THỦ TỤC HÀNH CHÍNH CẤP XÃ');
    }
  }, [isOpen, allMinistriesWithCounts, settings]);

  // Procedures filtered by ministry
  const procsFilteredByMinistry = useMemo(() => {
    if (ministryMode === 'all') return procedures;
    return procedures.filter(p => {
      const key = (p.soNganh || '').trim() || 'Chưa phân loại';
      return selectedMinistries.has(key);
    });
  }, [procedures, ministryMode, selectedMinistries]);

  // Extract unique Fields (linhVuc) within the currently filtered ministries
  const availableFieldsWithCounts = useMemo(() => {
    const counts: { [lv: string]: number } = {};
    procsFilteredByMinistry.forEach(p => {
      const key = (p.linhVuc || '').trim() || 'Khác';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b, 'vi'))
      .map(name => ({ name, count: counts[name] }));
  }, [procsFilteredByMinistry]);

  // Keep selectedFields synchronized with available fields
  useEffect(() => {
    if (fieldMode === 'all') {
      setSelectedFields(new Set(availableFieldsWithCounts.map(f => f.name)));
    } else {
      // Retain only those currently valid
      const validNames = new Set(availableFieldsWithCounts.map(f => f.name));
      setSelectedFields(prev => {
        const next = new Set<string>();
        prev.forEach(item => {
          if (validNames.has(item)) next.add(item);
        });
        return next;
      });
    }
  }, [fieldMode, availableFieldsWithCounts]);

  // Final procedures to export
  const finalProcedures = useMemo(() => {
    if (fieldMode === 'all') return procsFilteredByMinistry;
    return procsFilteredByMinistry.filter(p => {
      const key = (p.linhVuc || '').trim() || 'Khác';
      return selectedFields.has(key);
    });
  }, [procsFilteredByMinistry, fieldMode, selectedFields]);

  // Update dynamic suggested header when 1 ministry is selected
  useEffect(() => {
    if (ministryMode === 'custom' && selectedMinistries.size === 1) {
      const singleDept = Array.from(selectedMinistries)[0] as string | undefined;
      if (singleDept && singleDept !== 'Chưa phân loại') {
        setCustomHeader(`${singleDept.toUpperCase()} THỦ TỤC HÀNH CHÍNH CẤP XÃ`);
      }
    }
  }, [ministryMode, selectedMinistries]);

  if (!isOpen) return null;

  // Toggle single ministry
  const toggleMinistry = (name: string) => {
    const next = new Set(selectedMinistries);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedMinistries(next);
  };

  // Toggle single field
  const toggleField = (name: string) => {
    const next = new Set(selectedFields);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedFields(next);
  };

  // Select/Deselect all ministries
  const handleSelectAllMinistries = () => {
    setSelectedMinistries(new Set(allMinistriesWithCounts.map(m => m.name)));
  };
  const handleDeselectAllMinistries = () => {
    setSelectedMinistries(new Set());
  };

  // Select/Deselect all fields
  const handleSelectAllFields = () => {
    setSelectedFields(new Set(availableFieldsWithCounts.map(f => f.name)));
  };
  const handleDeselectAllFields = () => {
    setSelectedFields(new Set());
  };

  // Perform export
  const handleExecuteExport = async () => {
    if (finalProcedures.length === 0) {
      alert('Vui lòng chọn ít nhất một thủ tục để xuất file!');
      return;
    }

    setIsExporting(true);
    setProgress({ current: 0, total: finalProcedures.length, message: 'Đang bắt đầu tạo mã QR...' });

    try {
      const options: ExcelExportOptions = {
        sheetMode,
        customHeaderTitle: customHeader.trim() || undefined,
        fileName: customFileName.trim() || undefined,
        onProgress: (current, total, message) => {
          setProgress({ current, total, message });
        }
      };

      await exportProceduresToExcelWithQr(finalProcedures, settings, options);

      // Brief success pause before closing
      setTimeout(() => {
        setIsExporting(false);
        setProgress(null);
        onClose();
      }, 600);
    } catch (error) {
      console.error('Lỗi xuất file Excel:', error);
      alert('Có lỗi xảy ra khi tạo tệp Excel: ' + (error instanceof Error ? error.message : 'Vui lòng thử lại!'));
      setIsExporting(false);
      setProgress(null);
    }
  };

  // Filtered lists by search keywords
  const displayMinistries = allMinistriesWithCounts.filter(m =>
    m.name.toLowerCase().includes(ministrySearch.toLowerCase())
  );

  const displayFields = availableFieldsWithCounts.filter(f =>
    f.name.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white border-b border-emerald-900">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Xuất Excel Kèm Mã QR Code</span>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/40">
                  .xlsx chuẩn in ấn
                </span>
              </h2>
              <p className="text-[11.5px] text-emerald-100/90 font-medium">
                Tùy chọn lọc xuất theo Bộ ngành, Lĩnh vực riêng biệt hoặc toàn bộ danh mục
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/60 text-slate-800 text-xs sm:text-sm">
          {/* Quick Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold block">Tổng trong hệ thống</span>
              <span className="text-lg font-black text-slate-800">{procedures.length}</span>
              <span className="text-[10.5px] text-slate-500 ml-1">TTHC</span>
            </div>
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[11px] text-emerald-700 font-semibold block">Số lượng sẽ xuất</span>
              <span className="text-lg font-black text-emerald-700">{finalProcedures.length}</span>
              <span className="text-[10.5px] text-emerald-600 ml-1">TTHC</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold block">Bộ / Sở ngành</span>
              <span className="text-lg font-black text-indigo-700">
                {ministryMode === 'all' ? allMinistriesWithCounts.length : selectedMinistries.size}
              </span>
              <span className="text-[10.5px] text-slate-500 ml-1">/{allMinistriesWithCounts.length}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-semibold block">Lĩnh vực xuất</span>
              <span className="text-lg font-black text-amber-700">
                {fieldMode === 'all' ? availableFieldsWithCounts.length : selectedFields.size}
              </span>
              <span className="text-[10.5px] text-slate-500 ml-1">/{availableFieldsWithCounts.length}</span>
            </div>
          </div>

          {/* Section 1: Bộ ngành / Sở ngành Filter */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                    1. Bộ ngành / Cơ quan quản lý (Sở, Ngành)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Lựa chọn cơ quan ban hành hoặc cơ quan chuyên ngành cần xuất danh mục
                  </span>
                </div>
              </div>

              {/* Mode toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start sm:self-auto text-xs">
                <button
                  type="button"
                  onClick={() => setMinistryMode('all')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    ministryMode === 'all'
                      ? 'bg-white text-indigo-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({allMinistriesWithCounts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMinistryMode('custom')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    ministryMode === 'custom'
                      ? 'bg-indigo-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chọn riêng ({selectedMinistries.size})
                </button>
              </div>
            </div>

            {/* If Custom Ministry mode selected */}
            {ministryMode === 'custom' && (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={ministrySearch}
                      onChange={(e) => setMinistrySearch(e.target.value)}
                      placeholder="Tìm nhanh Bộ ngành, Sở..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllMinistries}
                      className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllMinistries}
                      className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-slate-50/70 border border-slate-200 rounded-lg">
                  {displayMinistries.length === 0 ? (
                    <div className="col-span-full py-3 text-center text-slate-400 text-xs">
                      Không tìm thấy Bộ ngành phù hợp
                    </div>
                  ) : (
                    displayMinistries.map(m => {
                      const isChecked = selectedMinistries.has(m.name);
                      return (
                        <label
                          key={m.name}
                          onClick={() => toggleMinistry(m.name)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate" title={m.name}>{m.name}</span>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 shrink-0">
                            {m.count}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Lĩnh vực Filter */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                    2. Lĩnh vực thực hiện
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Lọc xuất các thủ tục thuộc những lĩnh vực cụ thể (hoặc tất cả lĩnh vực)
                  </span>
                </div>
              </div>

              {/* Mode toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start sm:self-auto text-xs">
                <button
                  type="button"
                  onClick={() => setFieldMode('all')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    fieldMode === 'all'
                      ? 'bg-white text-amber-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({availableFieldsWithCounts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFieldMode('custom')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    fieldMode === 'custom'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chọn riêng ({selectedFields.size})
                </button>
              </div>
            </div>

            {/* If Custom Field mode selected */}
            {fieldMode === 'custom' && (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fieldSearch}
                      onChange={(e) => setFieldSearch(e.target.value)}
                      placeholder="Tìm nhanh lĩnh vực..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-amber-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllFields}
                      className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllFields}
                      className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1.5 bg-slate-50/70 border border-slate-200 rounded-lg">
                  {displayFields.length === 0 ? (
                    <div className="col-span-full py-3 text-center text-slate-400 text-xs">
                      Không tìm thấy lĩnh vực phù hợp với Bộ ngành đã chọn
                    </div>
                  ) : (
                    displayFields.map(f => {
                      const isChecked = selectedFields.has(f.name);
                      return (
                        <label
                          key={f.name}
                          onClick={() => toggleField(f.name)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate" title={f.name}>{f.name}</span>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 shrink-0">
                            {f.count}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Sheet Structure & Title Options */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <TableProperties className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  3. Cấu trúc Sheet & Định dạng tiêu đề tệp Excel
                </h3>
                <span className="text-[11px] text-slate-500">
                  Tùy biến cách phân chia các Sheet và tiêu đề cơ quan trên đầu trang in
                </span>
              </div>
            </div>

            {/* Sheet Split Options */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5 text-xs">
                Phương thức chia Sheet trong file Excel (.xlsx):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'all_and_split',
                    title: 'Đầy đủ (Chuẩn sổ tay)',
                    desc: 'Mỗi Lĩnh vực 1 Sheet riêng + 1 Sheet Tổng hợp'
                  },
                  {
                    id: 'split_only',
                    title: 'Chỉ các Sheet Lĩnh vực',
                    desc: 'Tách riêng từng lĩnh vực, không tạo sheet Tổng hợp'
                  },
                  {
                    id: 'single_sheet',
                    title: '1 Sheet gộp duy nhất',
                    desc: 'Dồn toàn bộ thủ tục đã chọn vào 1 Sheet chung'
                  }
                ].map(item => (
                  <label
                    key={item.id}
                    onClick={() => setSheetMode(item.id as any)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      sheetMode === item.id
                        ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{item.title}</span>
                      <input
                        type="radio"
                        name="sheetMode"
                        checked={sheetMode === item.id}
                        onChange={() => setSheetMode(item.id as any)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">{item.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Header & File Name Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  Tiêu đề cơ quan trên đầu bảng Excel:
                </label>
                <input
                  type="text"
                  value={customHeader}
                  onChange={(e) => setCustomHeader(e.target.value)}
                  placeholder="THỦ TỤC HÀNH CHÍNH CẤP XÃ"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  Tên tệp Excel tải về (.xlsx):
                </label>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="So_tay_TTHC_QRCode"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Collapsible Preview Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left font-bold text-slate-800 cursor-pointer text-xs"
            >
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-slate-600" />
                <span>Xem trước danh sách sẽ xuất ({finalProcedures.length} thủ tục)</span>
              </div>
              {showPreview ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showPreview && (
              <div className="p-3 border-t border-slate-200 max-h-56 overflow-y-auto">
                {finalProcedures.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 text-xs font-semibold">
                    Không có thủ tục nào theo tiêu chí lọc hiện tại
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                        <th className="py-1.5 px-2 w-10 text-center">STT</th>
                        <th className="py-1.5 px-2 w-28">Mã TTHC</th>
                        <th className="py-1.5 px-2">Tên thủ tục hành chính</th>
                        <th className="py-1.5 px-2 w-36">Lĩnh vực</th>
                        <th className="py-1.5 px-2 w-36">Bộ / Sở ngành</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {finalProcedures.slice(0, 50).map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50/80">
                          <td className="py-1 px-2 text-center font-bold text-slate-600">{idx + 1}</td>
                          <td className="py-1 px-2 font-mono font-bold text-red-700">{p.maTthc}</td>
                          <td className="py-1 px-2 font-medium text-slate-800">{p.tenTthc}</td>
                          <td className="py-1 px-2 text-slate-600">{p.linhVuc}</td>
                          <td className="py-1 px-2 text-slate-500">{p.soNganh || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {finalProcedures.length > 50 && (
                  <div className="text-center py-2 text-[10.5px] text-slate-500 italic bg-slate-50 mt-1 rounded">
                    ... và {finalProcedures.length - 50} thủ tục khác sẽ được đưa đầy đủ vào file Excel.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-time Progress Bar */}
          {isExporting && progress && (
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 animate-fadeIn space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                  <span>{progress.message}</span>
                </span>
                <span>{Math.round((progress.current / (progress.total || 1)) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-emerald-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-200 rounded-full"
                  style={{ width: `${Math.round((progress.current / (progress.total || 1)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-5 py-3.5 bg-white border-t border-slate-200">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Sẽ xuất: <strong className="text-emerald-700 font-bold">{finalProcedures.length}</strong> thủ tục
              {finalProcedures.length !== procedures.length && (
                <span className="text-slate-400 ml-1">
                  (trên tổng số {procedures.length})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              Hủy
            </button>

            {/* Quick Export All button */}
            <button
              type="button"
              onClick={() => {
                setMinistryMode('all');
                setFieldMode('all');
                setSelectedMinistries(new Set(allMinistriesWithCounts.map(m => m.name)));
                setSelectedFields(new Set(availableFieldsWithCounts.map(f => f.name)));
                setTimeout(() => {
                  handleExecuteExport();
                }, 50);
              }}
              disabled={isExporting || procedures.length === 0}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              title="Xuất toàn bộ thủ tục trong hệ thống mà không cần chọn lọc"
            >
              Xuất tất cả ({procedures.length})
            </button>

            {/* Primary Filtered Export button */}
            <button
              type="button"
              onClick={handleExecuteExport}
              disabled={isExporting || finalProcedures.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed"
              id="confirm-export-excel-qr-btn"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xuất Excel & QR...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Tải file Excel ({finalProcedures.length} TTHC)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
