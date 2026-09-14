import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  FileSpreadsheet, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  QrCode, 
  Link2, 
  CheckSquare, 
  Square, 
  Filter, 
  Sparkles,
  ClipboardPaste,
  Eye,
  AlertCircle,
  HelpCircle,
  Upload
} from 'lucide-react';
import QRCode from 'qrcode';
import { Procedure, AppSettings } from '../types';
import { syncDataToServer, fetchServerData } from '../services/apiSync';
import { exportProceduresToExcelWithQr } from '../utils/excelExportHelper';

interface OnlineSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedures: Procedure[];
  onUpdateProcedures: (updated: Procedure[]) => void;
  linhVucPresets: string[];
  soNganhPresets: string[];
  capThucHienPresets: string[];
  settings: AppSettings;
  onShowToast: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function OnlineSpreadsheetModal({
  isOpen,
  onClose,
  procedures,
  onUpdateProcedures,
  linhVucPresets,
  soNganhPresets,
  capThucHienPresets,
  settings,
  onShowToast
}: OnlineSpreadsheetModalProps) {
  if (!isOpen) return null;

  // Local state for grid rows
  const [gridData, setGridData] = useState<Procedure[]>(() => procedures);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLinhVuc, setFilterLinhVuc] = useState('all');
  const [filterCapThucHien, setFilterCapThucHien] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Sync status
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => new Date().toLocaleTimeString('vi-VN'));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Modals inside spreadsheet
  const [qrPreview, setQrPreview] = useState<{ maTthc: string; tenTthc: string; content: string; qrDataUrl: string } | null>(null);
  const [isGoogleSheetsShareOpen, setIsGoogleSheetsShareOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [copiedFormula, setCopiedFormula] = useState(false);

  // Synchronize when procedures prop changes from web UI (unless user is actively typing unsaved changes)
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setGridData(procedures);
    }
  }, [procedures, hasUnsavedChanges]);

  // Debounced auto-save to server & parent state
  const saveTimeoutRef = useRef<any>(null);

  const triggerSave = useCallback((dataToSave: Procedure[], notify = false) => {
    setIsSaving(true);
    // 1. Update parent state in App.tsx
    onUpdateProcedures(dataToSave);
    
    // 2. Persist to server & localStorage
    localStorage.setItem('tthc_procedures', JSON.stringify(dataToSave));
    syncDataToServer({
      procedures: dataToSave,
      linhVucPresets,
      soNganhPresets,
      settings,
      updatedBy: localStorage.getItem('tthc_admin_username') || 'Admin (Biểu mẫu Online)'
    })
      .then(() => {
        setHasUnsavedChanges(false);
        setLastSavedTime(new Date().toLocaleTimeString('vi-VN'));
        if (notify) {
          onShowToast(`Đã đồng bộ thành công ${dataToSave.length} thủ tục lên Cổng Web & Máy chủ!`, 'success');
        }
      })
      .catch((err) => {
        console.error('Lỗi lưu bảng tính lên máy chủ:', err);
        onShowToast('Lỗi lưu lên máy chủ. Đã lưu tạm thời vào trình duyệt.', 'error');
      })
      .finally(() => {
        setIsSaving(false);
      });
  }, [linhVucPresets, soNganhPresets, settings, onUpdateProcedures, onShowToast]);

  const handleCellChange = (id: string, field: keyof Procedure, value: any) => {
    const updated = gridData.map(row => {
      if (row.id === id) {
        return {
          ...row,
          [field]: value,
          ngayCapNhat: new Date().toISOString()
        };
      }
      return row;
    });

    setGridData(updated);
    setHasUnsavedChanges(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    // Auto-save after 800ms of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      triggerSave(updated, false);
    }, 800);
  };

  // Add new row at the top
  const handleAddNewRow = () => {
    const newId = `tthc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newProcedure: Procedure = {
      id: newId,
      maTthc: '',
      tenTthc: '',
      linhVuc: linhVucPresets[0] || 'Lao động',
      soNganh: soNganhPresets[0] || 'Bộ Nội vụ',
      capThucHien: 'Cấp xã',
      canCuPhapLy: 'Quy định pháp luật hiện hành',
      bcciTiepNhan: false,
      bcciTraKetQua: false,
      motCua: true,
      dvcttLoai: 'Toàn trình',
      dungChung: true,
      ngayTao: new Date().toISOString(),
      ngayCapNhat: new Date().toISOString(),
      ghiChu: ''
    };

    const updated = [newProcedure, ...gridData];
    setGridData(updated);
    triggerSave(updated, false);
    onShowToast('Đã thêm 1 dòng thủ tục mới ở đầu bảng tính', 'info');
  };

  // Duplicate a row
  const handleDuplicateRow = (proc: Procedure) => {
    const newId = `tthc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cloned: Procedure = {
      ...proc,
      id: newId,
      maTthc: proc.maTthc ? `${proc.maTthc}-copy` : '',
      tenTthc: `${proc.tenTthc} (Bản sao)`,
      ngayTao: new Date().toISOString(),
      ngayCapNhat: new Date().toISOString()
    };

    const index = gridData.findIndex(p => p.id === proc.id);
    const updated = [...gridData];
    updated.splice(index + 1, 0, cloned);

    setGridData(updated);
    triggerSave(updated, false);
    onShowToast(`Đã nhân bản thủ tục "${proc.maTthc || 'Mới'}"`, 'info');
  };

  // Delete single row
  const handleDeleteRow = (id: string, maTthc: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thủ tục "${maTthc || 'này'}" khỏi biểu mẫu online và hệ thống web?`)) {
      return;
    }

    const updated = gridData.filter(row => row.id !== id);
    setGridData(updated);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    triggerSave(updated, true);
  };

  // Delete multiple selected rows
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} thủ tục đã chọn khỏi biểu mẫu online và hệ thống web?`)) {
      return;
    }

    const updated = gridData.filter(row => !selectedIds.has(row.id));
    setGridData(updated);
    setSelectedIds(new Set());
    triggerSave(updated, true);
  };

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredData.length && filteredData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(p => p.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Show QR preview popover
  const handleShowQr = async (proc: Procedure) => {
    const content = (proc.ghiChu || '').trim() || 
      `https://dichvucong.gov.vn/thu-tuc-hanh-chinh/${proc.maTthc}`;
    try {
      const url = await QRCode.toDataURL(content, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrPreview({
        maTthc: proc.maTthc,
        tenTthc: proc.tenTthc,
        content,
        qrDataUrl: url
      });
    } catch (e) {
      onShowToast('Không thể tạo mã QR cho nội dung này', 'error');
    }
  };

  // Filtered dataset for searching
  const filteredData = useMemo(() => {
    return gridData.filter(p => {
      if (filterLinhVuc !== 'all' && p.linhVuc !== filterLinhVuc) return false;
      if (filterCapThucHien !== 'all' && p.capThucHien !== filterCapThucHien) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (p.maTthc || '').toLowerCase().includes(term) ||
        (p.tenTthc || '').toLowerCase().includes(term) ||
        (p.linhVuc || '').toLowerCase().includes(term) ||
        (p.soNganh || '').toLowerCase().includes(term) ||
        (p.canCuPhapLy || '').toLowerCase().includes(term) ||
        (p.ghiChu || '').toLowerCase().includes(term)
      );
    });
  }, [gridData, searchTerm, filterLinhVuc, filterCapThucHien]);

  // Export CSV
  const handleDownloadCsv = () => {
    window.open('/api/tthc/sheet.csv', '_blank');
    onShowToast('Đang tải về file CSV chuẩn của biểu mẫu online...', 'info');
  };

  // Export Excel with QR
  const handleExportExcelWithQr = async () => {
    try {
      onShowToast('Đang tạo file Excel kèm mã QR chuẩn...', 'info');
      await exportProceduresToExcelWithQr(gridData, settings);
      onShowToast('Xuất file Excel kèm mã QR thành công!', 'success');
    } catch (err: any) {
      console.error(err);
      onShowToast('Lỗi xuất Excel: ' + (err?.message || 'Thử lại'), 'error');
    }
  };

  // Paste handler
  const handleApplyPastedText = () => {
    if (!pasteRawText.trim()) return;

    try {
      const lines = pasteRawText.split(/\r?\n/).filter(line => line.trim().length > 0);
      const newRows: Procedure[] = [];
      const now = new Date().toISOString();

      lines.forEach((line, index) => {
        // Support TSV (tab-separated from Excel) or comma-separated
        const cells = line.includes('\t') 
          ? line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''))
          : line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

        if (cells.length < 2) return;

        // Check if header row
        if (cells[0].toLowerCase().includes('stt') || cells[1]?.toLowerCase().includes('mã tthc')) {
          return;
        }

        const maTthc = cells[1] || cells[0] || '';
        const tenTthc = cells[2] || cells[1] || 'Thủ tục mới';
        if (!maTthc && !tenTthc) return;

        const linhVuc = cells[3] || linhVucPresets[0] || 'Lao động';
        const soNganh = cells[4] || soNganhPresets[0] || 'Bộ Nội vụ';
        const capThucHien = cells[5] || 'Cấp xã';
        const canCuPhapLy = cells[6] || 'Quy định pháp luật hiện hành';
        const qrContent = cells[7] || '';

        const bcciTiepNhan = /có|co|yes|true|1/i.test(cells[8] || '');
        const bcciTraKetQua = /có|co|yes|true|1/i.test(cells[9] || '');
        const motCua = /có|co|yes|true|1/i.test(cells[10] || '');

        let dvcttLoai: 'Toàn trình' | 'Một phần' | 'Không' = 'Một phần';
        const dvcRaw = (cells[11] || '').toLowerCase();
        if (dvcRaw.includes('toàn trình') || dvcRaw.includes('toan trinh')) dvcttLoai = 'Toàn trình';
        else if (dvcRaw.includes('không') || dvcRaw.includes('khong')) dvcttLoai = 'Không';

        const dungChung = /có|co|yes|true|1/i.test(cells[12] || '');

        newRows.push({
          id: `tthc_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
          maTthc,
          tenTthc,
          linhVuc,
          soNganh,
          capThucHien,
          canCuPhapLy,
          bcciTiepNhan,
          bcciTraKetQua,
          motCua,
          dvcttLoai,
          dungChung,
          ngayTao: now,
          ngayCapNhat: now,
          ghiChu: qrContent
        });
      });

      if (newRows.length === 0) {
        onShowToast('Không nhận diện được dòng dữ liệu hợp lệ nào từ văn bản đã dán', 'error');
        return;
      }

      const updated = [...newRows, ...gridData];
      setGridData(updated);
      triggerSave(updated, true);
      setIsPasteModalOpen(false);
      setPasteRawText('');
      onShowToast(`Đã thêm thành công ${newRows.length} dòng từ Excel vào biểu mẫu!`, 'success');
    } catch (e: any) {
      onShowToast('Lỗi xử lý dữ liệu dán: ' + e?.message, 'error');
    }
  };

  // Live CSV public link for Google Sheets IMPORTDATA
  const liveCsvUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/tthc/sheet.csv` 
    : '/api/tthc/sheet.csv';
  
  const googleSheetsFormula = `=IMPORTDATA("${liveCsvUrl}")`;

  const handleCopyFormula = () => {
    navigator.clipboard.writeText(googleSheetsFormula);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2500);
    onShowToast('Đã sao chép công thức Google Sheets vào clipboard!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fadeIn">
      <div className={`bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-300 w-full transition-all duration-200 ${
        isFullscreen ? 'h-full max-w-full rounded-none' : 'h-[95vh] max-w-[98vw]'
      }`}>
        
        {/* 1. TOP HEADER & METADATA BAR */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-700 shrink-0">
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600/60 rounded-xl border border-emerald-400/40 text-emerald-200 shadow-inner flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Đồng bộ 2 chiều trực tiếp
                </span>
                <span className="text-[11px] text-slate-300 font-mono">
                  {gridData.length} Thủ tục
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-white mt-0.5">
                MẪU BIỂU NHẬP DỮ LIỆU THỦ TỤC HÀNH CHÍNH (TRỰC TUYẾN 2 CHIỀU)
              </h2>
            </div>
          </div>

          {/* Sync status & Window actions */}
          <div className="flex items-center space-x-2">
            
            {/* Live Save Status */}
            <div className="hidden sm:flex items-center gap-2 bg-emerald-950/60 border border-emerald-600/40 px-3 py-1 rounded-lg text-xs">
              <span className={`w-2 h-2 rounded-full ${
                isSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`} />
              <span className="text-emerald-200 text-[11px]">
                {isSaving ? 'Đang lưu vào máy chủ...' : `Đã đồng bộ (${lastSavedTime})`}
              </span>
            </div>

            {/* Google Sheets Link Modal Button */}
            <button
              type="button"
              onClick={() => setIsGoogleSheetsShareOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700/70 hover:bg-teal-600 text-white rounded-lg text-xs font-bold border border-teal-500/50 shadow-xs cursor-pointer transition-colors"
              title="Xem liên kết kết nối tự động với Google Sheets hoặc Excel Online"
            >
              <Link2 className="w-3.5 h-3.5 text-teal-200" />
              <span className="hidden md:inline">Liên kết Google Sheets</span>
            </button>

            {/* Toggle Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
              title="Đóng bảng tính"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. SPREADSHEET TOOLBAR */}
        <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          
          {/* Left Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Add Row Button */}
            <button
              type="button"
              onClick={handleAddNewRow}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
              id="spreadsheet-add-row-btn"
              title="Thêm 1 dòng thủ tục mới lên đầu biểu mẫu"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm dòng mới</span>
            </button>

            {/* Save All Explicit Button */}
            <button
              type="button"
              onClick={() => triggerSave(gridData, true)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              title="Lưu tất cả thay đổi ngay lập tức lên Cổng Web & Máy chủ"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu & Cập nhật Web'}</span>
            </button>

            {/* Paste from Excel Button */}
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              title="Sao chép từ Excel hoặc Google Sheets rồi dán vào đây"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Dán từ Excel</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              title="Tải về file CSV chuẩn của biểu mẫu online"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Tải CSV</span>
            </button>

            {/* Export Excel with QR */}
            <button
              type="button"
              onClick={handleExportExcelWithQr}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
              title="Xuất file Excel (.xlsx) kèm hình ảnh mã QR thực tế và cột Mã TTHC chuẩn"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Xuất Excel (Kèm QR)</span>
            </button>

            {/* Delete Selected Rows */}
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all animate-fadeIn"
                title={`Xóa ${selectedIds.size} dòng đã chọn`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa đã chọn ({selectedIds.size})</span>
              </button>
            )}
          </div>

          {/* Right Filters & Quick Search */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Linh Vuc Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterLinhVuc}
                onChange={(e) => setFilterLinhVuc(e.target.value)}
                className="bg-transparent border-none text-xs font-medium text-slate-700 focus:outline-none cursor-pointer max-w-[140px]"
              >
                <option value="all">Tất cả lĩnh vực</option>
                {linhVucPresets.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm trong bảng tính..."
                className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-emerald-600 w-48 sm:w-60 shadow-inner"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. INTERACTIVE SPREADSHEET TABLE GRID */}
        <div className="flex-1 overflow-auto bg-slate-200 select-text relative">
          <table className="w-full text-left text-xs border-collapse bg-white shadow-xs">
            
            {/* Sticky Spreadsheet Headers */}
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 border-b-2 border-slate-300 select-none shadow-sm">
              
              {/* Row 1: Column Letters like Excel (A, B, C, D...) */}
              <tr className="bg-slate-200/90 text-[10px] text-slate-500 font-mono uppercase border-b border-slate-300">
                <th className="p-1 text-center w-10 border-r border-slate-300">
                  <button 
                    type="button" 
                    onClick={handleToggleSelectAll}
                    className="cursor-pointer text-slate-500 hover:text-emerald-700"
                    title="Chọn tất cả"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredData.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600 inline" />
                    ) : (
                      <Square className="w-3.5 h-3.5 inline" />
                    )}
                  </button>
                </th>
                <th className="p-1 text-center w-12 border-r border-slate-300">A</th>
                <th className="p-1 text-center w-36 border-r border-slate-300">B</th>
                <th className="p-1 text-center min-w-[280px] border-r border-slate-300">C</th>
                <th className="p-1 text-center w-44 border-r border-slate-300">D</th>
                <th className="p-1 text-center w-44 border-r border-slate-300">E</th>
                <th className="p-1 text-center w-32 border-r border-slate-300">F</th>
                <th className="p-1 text-center w-52 border-r border-slate-300">G</th>
                <th className="p-1 text-center min-w-[220px] border-r border-slate-300">H</th>
                <th className="p-1 text-center w-24 border-r border-slate-300">I</th>
                <th className="p-1 text-center w-24 border-r border-slate-300">J</th>
                <th className="p-1 text-center w-24 border-r border-slate-300">K</th>
                <th className="p-1 text-center w-28 border-r border-slate-300">L</th>
                <th className="p-1 text-center w-24 border-r border-slate-300">M</th>
                <th className="p-1 text-center w-24">Thao tác</th>
              </tr>

              {/* Row 2: Human-readable Column Labels matching user's template */}
              <tr className="text-slate-800 text-[11px] font-bold">
                <th className="p-2 text-center border-r border-slate-300 bg-slate-100">#</th>
                <th className="p-2 text-center border-r border-slate-300 bg-slate-100">STT</th>
                <th className="p-2 border-r border-slate-300 bg-slate-100">
                  <span>Mã TTHC</span> <span className="text-red-500">(*)</span>
                </th>
                <th className="p-2 border-r border-slate-300 bg-slate-100">
                  <span>Tên Thủ tục Hành chính</span> <span className="text-red-500">(*)</span>
                </th>
                <th className="p-2 border-r border-slate-300 bg-slate-100">
                  <span>Lĩnh vực</span> <span className="text-red-500">(*)</span>
                </th>
                <th className="p-2 border-r border-slate-300 bg-slate-100">
                  <span>Bộ, ngành quản lý</span> <span className="text-red-500">(*)</span>
                </th>
                <th className="p-2 border-r border-slate-300 bg-slate-100">
                  <span>Cấp thực hiện</span>
                </th>
                <th className="p-2 border-r border-slate-300 bg-slate-100">
                  <span>Căn cứ pháp lý</span>
                </th>
                <th className="p-2 border-r border-slate-300 bg-slate-100">
                  <span>Nội dung mã QR (URL / Link)</span>
                </th>
                <th className="p-2 text-center border-r border-slate-300 bg-slate-100">
                  BCCI Tiếp nhận
                </th>
                <th className="p-2 text-center border-r border-slate-300 bg-slate-100">
                  BCCI Trả kết quả
                </th>
                <th className="p-2 text-center border-r border-slate-300 bg-slate-100">
                  Một cửa
                </th>
                <th className="p-2 text-center border-r border-slate-300 bg-slate-100">
                  DVC trực tuyến
                </th>
                <th className="p-2 text-center border-r border-slate-300 bg-slate-100">
                  Dùng chung
                </th>
                <th className="p-2 text-center bg-slate-100">
                  Hành động
                </th>
              </tr>
            </thead>

            {/* Table Body - Interactive Cells */}
            <tbody className="divide-y divide-slate-200">
              {filteredData.map((row, index) => {
                const isSelected = selectedIds.has(row.id);
                return (
                  <tr 
                    key={row.id} 
                    className={`hover:bg-amber-50/60 transition-colors group ${
                      isSelected ? 'bg-indigo-50/70' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-2 text-center border-r border-slate-200">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(row.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>

                    {/* STT */}
                    <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200 text-xs select-none">
                      {index + 1}
                    </td>

                    {/* Mã TTHC (Editable Input) */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.maTthc || ''}
                        placeholder="1.014352..."
                        onChange={(e) => handleCellChange(row.id, 'maTthc', e.target.value)}
                        className="w-full bg-transparent px-2 py-1 rounded font-mono font-bold text-red-800 text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none hover:bg-slate-100"
                      />
                    </td>

                    {/* Tên TTHC (Editable Textarea/Input) */}
                    <td className="p-1 border-r border-slate-200">
                      <textarea
                        rows={1}
                        value={row.tenTthc || ''}
                        placeholder="Nhập tên thủ tục hành chính..."
                        onChange={(e) => handleCellChange(row.id, 'tenTthc', e.target.value)}
                        className="w-full bg-transparent px-2 py-1 rounded font-medium text-slate-800 text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none hover:bg-slate-100 resize-none overflow-hidden"
                        style={{ minHeight: '32px' }}
                      />
                    </td>

                    {/* Lĩnh vực (Editable with Datalist) */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        list="linhvuc-suggestions"
                        value={row.linhVuc || ''}
                        placeholder="Lĩnh vực..."
                        onChange={(e) => handleCellChange(row.id, 'linhVuc', e.target.value)}
                        className="w-full bg-transparent px-2 py-1 rounded text-slate-700 text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none hover:bg-slate-100"
                      />
                    </td>

                    {/* Bộ, ngành quản lý */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        list="songanh-suggestions"
                        value={row.soNganh || ''}
                        placeholder="Bộ ngành..."
                        onChange={(e) => handleCellChange(row.id, 'soNganh', e.target.value)}
                        className="w-full bg-transparent px-2 py-1 rounded text-slate-700 text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none hover:bg-slate-100"
                      />
                    </td>

                    {/* Cấp thực hiện (Select) */}
                    <td className="p-1 border-r border-slate-200">
                      <select
                        value={row.capThucHien || 'Cấp xã'}
                        onChange={(e) => handleCellChange(row.id, 'capThucHien', e.target.value)}
                        className="w-full bg-transparent px-1 py-1 rounded text-slate-700 text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      >
                        <option value="Cấp xã">Cấp xã</option>
                        <option value="Thành phố">Thành phố</option>
                        <option value="Cấp xã, Thành phố">Cấp xã, Thành phố</option>
                        <option value="TTHC liên thông">TTHC liên thông</option>
                      </select>
                    </td>

                    {/* Căn cứ pháp lý */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.canCuPhapLy || ''}
                        placeholder="Căn cứ pháp lý..."
                        onChange={(e) => handleCellChange(row.id, 'canCuPhapLy', e.target.value)}
                        className="w-full bg-transparent px-2 py-1 rounded text-slate-600 text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none hover:bg-slate-100"
                      />
                    </td>

                    {/* Nội dung mã QR / Link Cổng DVC */}
                    <td className="p-1 border-r border-slate-200">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={row.ghiChu || ''}
                          placeholder="https://dichvucong.gov.vn/..."
                          onChange={(e) => handleCellChange(row.id, 'ghiChu', e.target.value)}
                          className="flex-1 bg-transparent px-2 py-1 rounded text-indigo-700 text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none hover:bg-slate-100 truncate"
                        />
                        <button
                          type="button"
                          onClick={() => handleShowQr(row)}
                          className="p-1 hover:bg-slate-200 text-slate-500 hover:text-emerald-700 rounded cursor-pointer transition-colors"
                          title="Xem trước mã QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                    {/* BCCI Tiếp nhận (Click Toggle) */}
                    <td className="p-1 text-center border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleCellChange(row.id, 'bcciTiepNhan', !row.bcciTiepNhan)}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                          row.bcciTiepNhan 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {row.bcciTiepNhan ? 'Có' : 'Không'}
                      </button>
                    </td>

                    {/* BCCI Trả kết quả (Click Toggle) */}
                    <td className="p-1 text-center border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleCellChange(row.id, 'bcciTraKetQua', !row.bcciTraKetQua)}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                          row.bcciTraKetQua 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {row.bcciTraKetQua ? 'Có' : 'Không'}
                      </button>
                    </td>

                    {/* Một cửa (Click Toggle) */}
                    <td className="p-1 text-center border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleCellChange(row.id, 'motCua', !row.motCua)}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                          row.motCua 
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {row.motCua ? 'Có' : 'Không'}
                      </button>
                    </td>

                    {/* DVC trực tuyến (Select) */}
                    <td className="p-1 text-center border-r border-slate-200">
                      <select
                        value={row.dvcttLoai || 'Không'}
                        onChange={(e) => handleCellChange(row.id, 'dvcttLoai', e.target.value)}
                        className={`text-[11px] font-bold rounded px-1.5 py-0.5 focus:outline-none cursor-pointer ${
                          row.dvcttLoai === 'Toàn trình' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' 
                            : row.dvcttLoai === 'Một phần' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-300' 
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <option value="Toàn trình">Toàn trình</option>
                        <option value="Một phần">Một phần</option>
                        <option value="Không">Không</option>
                      </select>
                    </td>

                    {/* Dùng chung (Click Toggle) */}
                    <td className="p-1 text-center border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleCellChange(row.id, 'dungChung', !row.dungChung)}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                          row.dungChung 
                            ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' 
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {row.dungChung ? 'Có' : 'Không'}
                      </button>
                    </td>

                    {/* Thao tác (Duplicate & Delete) */}
                    <td className="p-1 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(row)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                          title="Nhân bản dòng này"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id, row.maTthc)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={15} className="p-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">Không tìm thấy thủ tục nào phù hợp với bộ lọc</p>
                    <button
                      type="button"
                      onClick={() => { setSearchTerm(''); setFilterLinhVuc('all'); setFilterCapThucHien('all'); }}
                      className="mt-2 text-xs text-emerald-700 font-bold hover:underline"
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. BOTTOM STATUS BAR */}
        <div className="bg-slate-100 px-5 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 shrink-0 gap-2">
          <div className="flex items-center space-x-4">
            <span className="font-bold text-slate-700">
              Tổng số dòng: <span className="text-emerald-700 font-mono">{gridData.length}</span> (Hiển thị: {filteredData.length})
            </span>
            {selectedIds.size > 0 && (
              <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-[11px]">
                Đang chọn: {selectedIds.size}
              </span>
            )}
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Mẹo: Bạn có thể nhấp chuột trực tiếp vào bất cứ ô nào để chỉnh sửa tức thì.
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-xs cursor-pointer transition-colors"
            >
              Đóng biểu mẫu
            </button>
            <button
              type="button"
              onClick={() => triggerSave(gridData, true)}
              disabled={isSaving}
              className="px-4.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Hoàn tất & Cập nhật Web</span>
            </button>
          </div>
        </div>

      </div>

      {/* DATALISTS FOR AUTOCOMPLETE */}
      <datalist id="linhvuc-suggestions">
        {linhVucPresets.map(l => (
          <option key={l} value={l} />
        ))}
      </datalist>

      <datalist id="songanh-suggestions">
        {soNganhPresets.map(s => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* MODAL: QR PREVIEW */}
      {qrPreview && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">Mã QR Thủ tục</h3>
              <button onClick={() => setQrPreview(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border flex flex-col items-center justify-center">
              <img src={qrPreview.qrDataUrl} alt="QR Code" className="w-48 h-48 rounded shadow-xs" />
              <p className="font-mono text-xs font-bold text-red-800 mt-2">{qrPreview.maTthc}</p>
              <p className="text-xs text-slate-600 font-medium line-clamp-2 mt-1">{qrPreview.tenTthc}</p>
            </div>

            <div className="bg-slate-100 p-2.5 rounded-lg text-left">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Nội dung mã QR:</p>
              <p className="text-xs text-indigo-700 break-all font-mono mt-0.5 max-h-20 overflow-y-auto">
                {qrPreview.content}
              </p>
            </div>

            <div className="flex gap-2">
              {qrPreview.content.startsWith('http') && (
                <a
                  href={qrPreview.content}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Mở liên kết
                </a>
              )}
              <button
                type="button"
                onClick={() => setQrPreview(null)}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GOOGLE SHEETS LIVE IMPORTDATA LINK */}
      {isGoogleSheetsShareOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Liên kết 2 chiều với Google Sheets & Excel Online</h3>
              </div>
              <button onClick={() => setIsGoogleSheetsShareOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có thể mở một file Google Sheets mới, và dán công thức bên dưới vào ô <strong>A1</strong>. Google Sheets sẽ <strong>tự động lấy toàn bộ {gridData.length} thủ tục hành chính</strong> từ hệ thống web về trang tính:
            </p>

            {/* Formula Box */}
            <div className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl font-mono text-xs break-all relative border border-slate-700 flex items-center justify-between gap-2">
              <span>{googleSheetsFormula}</span>
              <button
                type="button"
                onClick={handleCopyFormula}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedFormula ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFormula ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>

            {/* Direct CSV URL */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Đường dẫn CSV trực tiếp thời gian thực:</p>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  readOnly
                  value={liveCsvUrl}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono text-slate-700"
                />
                <a
                  href={liveCsvUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-bold shrink-0 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Mở
                </a>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1 text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Cách thức hoạt động 2 chiều:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800">
                <li>Bất kỳ khi nào bạn thêm, sửa, xóa thủ tục ở <strong>Mẫu biểu online này</strong>, dữ liệu tự động cập nhật ngay lên Website.</li>
                <li>Ngược lại, khi bạn sửa trên <strong>Giao diện Web</strong> (thêm TTHC, sửa chi tiết), mẫu biểu này cũng tự động cập nhật đồng thời.</li>
                <li>Bạn cũng có thể dán dữ liệu mới từ Excel vào mẫu biểu này bất cứ lúc nào qua nút <strong>"Dán từ Excel"</strong>.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsGoogleSheetsShareOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PASTE RAW TSV/CSV FROM EXCEL */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Dán nhanh các dòng từ Excel hoặc Google Sheets</h3>
              </div>
              <button onClick={() => setIsPasteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Hãy mở file Excel hoặc Google Sheets của bạn, chọn các ô hoặc hàng dữ liệu, bấm <strong>Ctrl + C</strong> rồi dán (<strong>Ctrl + V</strong>) vào ô dưới đây. Hệ thống sẽ tự động chuyển thành các dòng trong bảng tính online!
            </p>

            <textarea
              rows={8}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder="Dán các dòng dữ liệu sao chép từ Excel vào đây (STT, Mã TTHC, Tên thủ tục, Lĩnh vực, Bộ ngành, Cấp thực hiện...)"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 shadow-inner"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplyPastedText}
                disabled={!pasteRawText.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                Xác nhận thêm vào biểu mẫu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
