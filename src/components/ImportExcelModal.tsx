import React, { useState, useRef } from 'react';
import { Procedure } from '../types';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  HelpCircle,
  Plus,
  ArrowRight,
  Database,
  Globe,
  Loader2,
  Lock,
  ShieldAlert
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { fetchOnlineSpreadsheet, parseSpreadsheetBuffer } from '../utils/onlineExcelSync';
import { parseWorkbookToProcedures, loadWorkbookFromBuffer } from '../utils/excelParserHelper';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProcedures: Procedure[];
  onImportSuccess: (imported: Procedure[], mode: 'merge' | 'add_only' | 'replace_all') => void;
  onShowToast: (message: string, type: 'success' | 'info' | 'error') => void;
  onAddNewPresets?: (newLinhVuc: string[], newSoNganh: string[]) => void;
  isAdminLoggedIn?: boolean;
  onRequireAdminLogin?: () => void;
}

export default function ImportExcelModal({
  isOpen,
  onClose,
  existingProcedures,
  onImportSuccess,
  onShowToast,
  onAddNewPresets,
  isAdminLoggedIn = false,
  onRequireAdminLogin
}: ImportExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isLoadingOnline, setIsLoadingOnline] = useState(false);
  const [parsedProcedures, setParsedProcedures] = useState<Procedure[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'add_only' | 'replace_all'>('merge');
  const [parseLogs, setParseLogs] = useState<{ total: number; sheetsCount: number; warnings: string[] }>({
    total: 0,
    sheetsCount: 0,
    warnings: []
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load configured online Excel URL from settings
  const savedSettingsRaw = typeof window !== 'undefined' ? localStorage.getItem('tthc_app_settings') : null;
  const configuredOnlineUrl = savedSettingsRaw ? (JSON.parse(savedSettingsRaw).onlineExcelUrl || '') : '';

  // Handler to fetch and load procedures directly from configured online Excel URL
  const handleLoadFromOnlineUrl = async () => {
    if (!isAdminLoggedIn) {
      onShowToast('Chỉ Quản trị viên mới có quyền nạp dữ liệu từ biểu mẫu online!', 'error');
      if (onRequireAdminLogin) {
        onClose();
        onRequireAdminLogin();
      }
      return;
    }

    if (!configuredOnlineUrl) {
      onShowToast('Chưa cấu hình đường dẫn biểu mẫu Excel Online trong Ban Quản Trị.', 'error');
      return;
    }

    setIsLoadingOnline(true);
    onShowToast('Đang kết nối và tải dữ liệu từ biểu mẫu online...', 'info');

    try {
      const { buffer, isCsv, sourceUrl } = await fetchOnlineSpreadsheet(configuredOnlineUrl);
      const result = await parseSpreadsheetBuffer(buffer, isCsv, sourceUrl);

      setParsedProcedures(result.procedures);
      setParseLogs({
        total: result.totalParsed,
        sheetsCount: 1,
        warnings: result.warnings
      });

      if (onAddNewPresets && (result.discoveredLinhVuc.length > 0 || result.discoveredSoNganh.length > 0)) {
        onAddNewPresets(result.discoveredLinhVuc, result.discoveredSoNganh);
      }

      onShowToast(`Đã nạp thành công ${result.totalParsed} thủ tục từ biểu mẫu online!`, 'success');
    } catch (err: any) {
      console.error("Lỗi nạp biểu mẫu online:", err);
      onShowToast(err.message || 'Không thể đọc dữ liệu từ biểu mẫu online.', 'error');
    } finally {
      setIsLoadingOnline(false);
    }
  };

  if (!isOpen) return null;

  // 1. GENERATE & DOWNLOAD STANDARD EXCEL TEMPLATE
  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Cổng Tra Cứu TTHC';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Bieu_Mau_Nhap_TTHC', {
        views: [{ showGridLines: true }]
      });

      // Title header row
      worksheet.mergeCells('A1:M1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'BIỂU MẪU NHẬP DỮ LIỆU THỦ TỤC HÀNH CHÍNH (ĐỒNG BỘ MÃ QR VÀ CÁC CỘT)';
      titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF991B1B' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 32;

      // Note guide row
      worksheet.mergeCells('A2:M2');
      const guideCell = worksheet.getCell('A2');
      guideCell.value = 'Lưu ý: Không đổi tên các cột ở Hàng 3. Cột "Nội dung đưa vào mã QR" có thể điền link URL hoặc nội dung văn bản để quét QR.';
      guideCell.font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF475569' } };
      guideCell.alignment = { horizontal: 'left', vertical: 'middle' };
      worksheet.getRow(2).height = 20;

      // Headers (Row 3)
      const headers = [
        'STT',
        'Mã TTHC (*)',
        'Tên Thủ tục Hành chính (*)',
        'Lĩnh vực (*)',
        'Bộ, ngành quản lý (*)',
        'Cấp thực hiện / Thẩm quyền (*)',
        'Căn cứ pháp lý / Quyết định',
        'Nội dung đưa vào mã QR (URL / Văn bản)',
        'BCCI Tiếp nhận (Có/Không)',
        'BCCI Trả kết quả (Có/Không)',
        'Bộ phận Một cửa (Có/Không)',
        'Dịch vụ công trực tuyến (Toàn trình/Một phần/Không)',
        'Dùng chung (Có/Không)'
      ];

      const headerRow = worksheet.getRow(3);
      headerRow.values = headers;
      headerRow.height = 30;

      // Set columns widths
      const colWidths = [6, 26, 45, 20, 24, 18, 35, 45, 14, 14, 14, 20, 14];
      colWidths.forEach((w, idx) => {
        worksheet.getColumn(idx + 1).width = w;
      });

      // Style Header Row
      for (let c = 1; c <= headers.length; c++) {
        const cell = headerRow.getCell(c);
        cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFB91C1C' } // Red Header
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }

      // Sample Data Rows
      const sampleData = [
        [
          1,
          '1.000234.000.00.00.H42',
          'Thực hiện hỗ trợ khi hòa giải viên gặp tai nạn hoặc rủi ro ảnh hưởng đến sức khỏe, tính mạng trong khi thực hiện hoạt động hòa giải',
          'Hoà giải cơ sở',
          'Sở Tư pháp',
          'Cấp xã',
          'Quyết định số 421/QĐ-VP.UBND ngày 14/01/2026',
          'https://dichvucong.gov.vn/p/home/dvc-tthc-thu-tuc-hanh-chinh-chi-tiet.html?ma_tthc=1.000234.000.00.00.H42',
          'Có',
          'Có',
          'Có',
          'Toàn trình',
          'Có'
        ],
        [
          2,
          '1.000235.000.00.00.H42',
          'Thủ tục công nhận hòa giải viên',
          'Hoà giải cơ sở',
          'Sở Tư pháp',
          'Cấp xã',
          'Quyết định số 371/QĐ-UBND ngày 05/02/2021',
          'https://dichvucong.gov.vn/p/home/dvc-tthc-thu-tuc-hanh-chinh-chi-tiet.html?ma_tthc=1.000235.000.00.00.H42',
          'Không',
          'Có',
          'Có',
          'Một phần',
          'Không'
        ],
        [
          3,
          '1.000236.000.00.00.H42',
          'Thủ tục công nhận tổ trưởng tổ hòa giải',
          'Hoà giải cơ sở',
          'Sở Tư pháp',
          'Cấp xã',
          'Quyết định số 371/QĐ-UBND ngày 05/02/2021',
          'UBND Xã Ba Chẽ - Bộ phận Tư pháp hộ tịch tiếp nhận hồ sơ',
          'Có',
          'Có',
          'Có',
          'Một phần',
          'Có'
        ],
        [
          4,
          '1.003412.000.00.00.H42',
          'Đăng ký khai sinh, đăng ký thường trú, cấp thẻ bảo hiểm y tế cho trẻ em dưới 6 tuổi',
          'Hộ tịch',
          'Sở Tư pháp',
          'Liên thông',
          'Nghị định 63/2024/NĐ-CP',
          'https://dichvucong.gov.vn/p/home/dvc-tthc-thu-tuc-hanh-chinh-chi-tiet.html?ma_tthc=1.003412.000.00.00.H42',
          'Có',
          'Có',
          'Có',
          'Toàn trình',
          'Có'
        ],
        [
          5,
          '1.013794',
          'Thủ tục gia hạn giấy chứng nhận đủ điều kiện hoạt động điểm cung cấp dịch vụ trò chơi điện tử công cộng',
          'Phát thanh, truyền hình và thông tin điện tử',
          'Bộ Thông tin và Truyền thông',
          'Cấp xã, Thành phố',
          'Quyết định số 256/QĐ-TTPVHCC',
          'https://dichvucong.gov.vn/p/home/dvc-tthc-thu-tuc-hanh-chinh-chi-tiet.html?ma_tthc=1.013794',
          'Không',
          'Có',
          'Có',
          'Toàn trình',
          'Có'
        ]
      ];

      sampleData.forEach((rowValues, rIdx) => {
        const row = worksheet.addRow(rowValues);
        row.height = 36;
        for (let c = 1; c <= headers.length; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Times New Roman', size: 10.5 };
          cell.alignment = { 
            horizontal: c === 1 ? 'center' : (c >= 9 && c <= 13 ? 'center' : 'left'), 
            vertical: 'middle', 
            wrapText: true 
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bieu_mau_nhap_TTHC_Chuan.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onShowToast('Đã tải xuống biểu mẫu Excel chuẩn thành công!', 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Không thể tạo file mẫu Excel', 'error');
    }
  };

  // 2. PARSE EXCEL / CSV FILE (Sử dụng bộ phân tích thông minh chuẩn hóa Tên, Mã TTHC và Lĩnh vực)
  const processExcelFile = async (uploadedFile: File) => {
    if (!isAdminLoggedIn) {
      onShowToast('Chỉ Quản trị viên mới có quyền nạp tệp dữ liệu vào hệ thống!', 'error');
      if (onRequireAdminLogin) {
        onClose();
        onRequireAdminLogin();
      }
      return;
    }

    setIsParsing(true);
    setFile(uploadedFile);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const isCsv = uploadedFile.name.toLowerCase().endsWith('.csv');
      const workbook = await loadWorkbookFromBuffer(arrayBuffer, isCsv);

      // Sử dụng thuật toán nhận diện và trích xuất chuẩn hóa toàn diện
      const parseResult = parseWorkbookToProcedures(workbook);

      setParsedProcedures(parseResult.procedures);
      setParseLogs({
        total: parseResult.procedures.length,
        sheetsCount: workbook.worksheets.length,
        warnings: parseResult.warnings
      });

      // Thông báo các lĩnh vực và sở ngành mới phát hiện cho bộ lọc hệ thống
      if (onAddNewPresets && (parseResult.discoveredLinhVuc.length > 0 || parseResult.discoveredSoNganh.length > 0)) {
        onAddNewPresets(parseResult.discoveredLinhVuc, parseResult.discoveredSoNganh);
      }

      if (parseResult.procedures.length > 0) {
        onShowToast(`Đọc và chuẩn hóa thành công ${parseResult.procedures.length} thủ tục từ tệp!`, 'success');
      } else {
        onShowToast('Không tìm thấy thủ tục nào trong file, vui lòng kiểm tra lại hàng tiêu đề.', 'error');
      }
    } catch (err: any) {
      console.error('Lỗi khi đọc file Excel:', err);
      setParseLogs({ 
        total: 0, 
        sheetsCount: 0, 
        warnings: [`Lỗi phân tích: ${err.message || 'Không thể đọc nội dung file Excel / CSV'}`] 
      });
      onShowToast('Tệp Excel/CSV bị lỗi hoặc cấu trúc không hợp lệ!', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const name = droppedFile.name.toLowerCase();
      if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
        processExcelFile(droppedFile);
      } else {
        onShowToast('Vui lòng chọn tệp định dạng Excel (.xlsx, .xls) hoặc CSV (.csv)!', 'error');
      }
    }
  };

  // 3. EXECUTE IMPORT
  const handleConfirmImport = () => {
    if (!isAdminLoggedIn) {
      onShowToast('Vui lòng đăng nhập tài khoản Quản trị viên để có quyền nạp dữ liệu thủ tục vào hệ thống!', 'error');
      if (onRequireAdminLogin) {
        onClose();
        onRequireAdminLogin();
      }
      return;
    }

    if (parsedProcedures.length === 0) {
      onShowToast('Chưa có dữ liệu nào để nhập vào hệ thống!', 'error');
      return;
    }

    onImportSuccess(parsedProcedures, importMode);
    onClose();
  };

  // Check duplicate statistics
  const existingCodes = new Set(existingProcedures.map(p => p.maTthc.toLowerCase().trim()));
  const duplicateCount = parsedProcedures.filter(p => existingCodes.has(p.maTthc.toLowerCase().trim())).length;
  const newCount = parsedProcedures.length - duplicateCount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-red-800 text-white px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-wide uppercase">
                Nhập Dữ Liệu Thủ Tục Từ File Excel
              </h3>
              <p className="text-xs text-red-100 font-medium">
                Tự động đồng bộ Mã TTHC, Tên thủ tục, Bộ/Ngành, Cấp thực hiện & Nội dung tạo mã QR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Security Warning Banner when not admin */}
        {!isAdminLoggedIn && (
          <div className="bg-amber-500 text-slate-950 px-6 py-2.5 text-xs font-bold flex flex-wrap items-center justify-between gap-2 border-b border-amber-600 shadow-inner">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-slate-950 shrink-0" />
              <span>YÊU CẦU QUYỀN QUẢN TRỊ VIÊN: Chỉ tài khoản Quản trị viên mới có quyền nạp/nhập dữ liệu thủ tục hành chính vào hệ thống!</span>
            </div>
            {onRequireAdminLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireAdminLogin();
                }}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Đăng nhập Quản trị viên
              </button>
            )}
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Online Excel Banner if configured */}
          {configuredOnlineUrl && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Globe className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-teal-900 flex items-center gap-2">
                    Biểu mẫu Excel Online đã cấu hình
                    <span className="text-[10px] bg-teal-200/70 text-teal-900 px-1.5 py-0.2 rounded font-mono font-medium">
                      Sẵn sàng
                    </span>
                  </div>
                  <p className="text-xs text-teal-700 truncate max-w-lg font-mono text-[11px] mt-0.5" title={configuredOnlineUrl}>
                    {configuredOnlineUrl}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLoadFromOnlineUrl}
                disabled={isLoadingOnline}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                id="load-from-configured-online-excel-btn"
              >
                {isLoadingOnline ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Nạp từ biểu mẫu online</span>
              </button>
            </div>
          )}

          {/* Step 1: Template & Upload Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Download Standard Template Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider">
                  <Download className="w-4 h-4" />
                  Biểu mẫu Excel chuẩn
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tải tệp mẫu Excel có đầy đủ cấu trúc các cột: Mã TTHC, Tên thủ tục, Bộ/Ngành, Thẩm quyền, Căn cứ pháp lý và Nội dung tạo mã QR.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Tải file mẫu Excel (.xlsx)
              </button>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div 
              className={`md:col-span-2 border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all ${
                isDragOver 
                  ? 'border-red-600 bg-red-50/50' 
                  : 'border-slate-300 hover:border-red-400 bg-slate-50/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="p-3 bg-red-100/70 text-red-700 rounded-full mb-2">
                <Upload className="w-6 h-6" />
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-slate-800 mb-1">
                Kéo thả file Excel vào đây hoặc <span className="text-red-700 underline cursor-pointer" onClick={() => fileInputRef.current?.click()}>duyệt tìm từ máy tính</span>
              </h4>
              <p className="text-[11px] text-slate-500 max-w-md">
                Hỗ trợ <strong>.xlsx, .xls, .csv</strong>. Tự động nhận diện và sửa lỗi hoán đổi cột Mã TTHC & Tên thủ tục, trích xuất mã nhúng trong tên, nhận diện tiêu đề nhóm Lĩnh vực.
              </p>

              {file && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã chọn: {file.name} ({Math.round(file.size / 1024)} KB)</span>
                </div>
              )}
            </div>
          </div>

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Đang đọc dữ liệu và xử lý các cột từ tệp Excel...</p>
            </div>
          )}

          {/* Step 2: Parsed Preview & Options */}
          {!isParsing && parsedProcedures.length > 0 && (
            <div className="space-y-4">
              
              {/* Stats & Duplicate summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Tổng số tìm thấy: <strong className="text-slate-900 text-sm">{parsedProcedures.length}</strong> thủ tục
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-blue-700">
                    Mới: <strong>{newCount}</strong>
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-amber-700">
                    Đã có trong hệ thống: <strong>{duplicateCount}</strong>
                  </span>
                </div>

                {/* Import Mode Options */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 uppercase">Chế độ nạp:</span>
                  <select
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-600"
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                  >
                    <option value="merge">Cập nhật trùng mã + Thêm mới (Khuyên dùng)</option>
                    <option value="add_only">Chỉ thêm mới (Bỏ qua nếu trùng mã TTHC)</option>
                    <option value="replace_all">Ghi đè toàn bộ (Xóa danh sách cũ)</option>
                  </select>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-red-600" />
                    Bảng xem trước dữ liệu trích xuất ({parsedProcedures.length} bản ghi)
                  </h4>
                  <span className="text-[11px] text-slate-500 italic">
                    Hiển thị tối đa 50 thủ tục xem trước
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 uppercase font-bold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">STT</th>
                        <th className="py-2.5 px-3 w-36">Mã TTHC</th>
                        <th className="py-2.5 px-3 w-64">Tên Thủ Tục</th>
                        <th className="py-2.5 px-3 w-32">Lĩnh vực</th>
                        <th className="py-2.5 px-3 w-32">Bộ / Ngành</th>
                        <th className="py-2.5 px-3 w-28">Thẩm quyền</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Nội dung vào mã QR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedProcedures.slice(0, 50).map((p, idx) => {
                        const isDup = existingCodes.has(p.maTthc.toLowerCase().trim());
                        return (
                          <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isDup ? 'bg-amber-50/30' : ''}`}>
                            <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-slate-800 block">{p.maTthc}</span>
                              {isDup && (
                                <span className="inline-block mt-0.5 text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                                  Trùng mã
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              <div>{p.tenTthc}</div>
                              {p.canCuPhapLy && (
                                <div className="text-[10px] text-slate-500 italic mt-0.5">{p.canCuPhapLy}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{p.linhVuc}</td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">{p.soNganh}</td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.capThucHien === 'Cấp xã, Thành phố' || p.capThucHien === 'Cấp xã, cấp tỉnh' || p.capThucHien === 'Cấp xã, Cấp tỉnh'
                                  ? 'bg-teal-100 text-teal-800 border border-teal-300'
                                  : p.capThucHien === 'Cấp xã'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : p.capThucHien === 'Thành phố' || p.capThucHien === 'Cấp tỉnh'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-purple-100 text-purple-800'
                              }`}>
                                {p.capThucHien}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-emerald-800 text-[11px] font-mono break-all line-clamp-2">
                              {p.ghiChu || (
                                <span className="text-slate-400 italic font-sans">(Tự động tạo link theo mã TTHC)</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Warnings display if any */}
          {parseLogs.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Thông báo:</strong>
                <ul className="list-disc list-inside space-y-0.5 mt-1">
                  {parseLogs.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {!isAdminLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  onShowToast('Vui lòng đăng nhập Quản trị viên để có quyền nạp dữ liệu vào hệ thống!', 'error');
                  if (onRequireAdminLogin) {
                    onClose();
                    onRequireAdminLogin();
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Lock className="w-4 h-4" />
                <span>Đăng nhập Quản trị viên để Nạp dữ liệu</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedProcedures.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
              >
                <Database className="w-4 h-4" />
                <span>Nạp {parsedProcedures.length} thủ tục vào hệ thống</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
