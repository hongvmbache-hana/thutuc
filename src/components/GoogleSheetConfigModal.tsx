import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  ExternalLink, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Download, 
  Clipboard, 
  Link2, 
  CheckCircle2, 
  FileSpreadsheet, 
  HelpCircle,
  Trash2,
  Share2,
  Sparkles
} from 'lucide-react';
import { AppSettings, Procedure } from '../types';
import { configureOnlineSheet, syncOnlineSheet, disconnectOnlineSheet } from '../services/apiSync';
import { exportProceduresToExcelWithQr } from '../utils/excelExportHelper';

interface GoogleSheetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  procedures: Procedure[];
  onSaveSettings: (newSettings: AppSettings) => void;
  onUpdateProcedures: (newProcedures: Procedure[]) => void;
  onShowToast: (message: string, type: 'success' | 'info' | 'error') => void;
  isAdminLoggedIn?: boolean;
  onRequireAdminLogin?: () => void;
}

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (!err) return fallback;
  if (typeof err === 'string') return err === '[object Object]' ? fallback : err;
  if (err instanceof Error) {
    return err.message && err.message !== '[object Object]' ? err.message : fallback;
  }
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim() && obj.message !== '[object Object]') {
      return obj.message;
    }
    if (typeof obj.error === 'string' && obj.error.trim() && obj.error !== '[object Object]') {
      return obj.error;
    }
  }
  return fallback;
};

export default function GoogleSheetConfigModal({
  isOpen,
  onClose,
  settings,
  procedures,
  onSaveSettings,
  onUpdateProcedures,
  onShowToast,
  isAdminLoggedIn = true,
  onRequireAdminLogin
}: GoogleSheetConfigModalProps) {
  if (!isOpen) return null;

  const [urlInput, setUrlInput] = useState(settings.onlineExcelUrl || '');
  const [syncMode, setSyncMode] = useState<'replace_all' | 'merge'>(
    settings.onlineExcelSyncMode === 'merge' ? 'merge' : 'replace_all'
  );
  const [autoSync, setAutoSync] = useState<boolean>(settings.onlineExcelAutoSync !== false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  useEffect(() => {
    setUrlInput(settings.onlineExcelUrl || '');
    setSyncMode(settings.onlineExcelSyncMode === 'merge' ? 'merge' : 'replace_all');
    setAutoSync(settings.onlineExcelAutoSync !== false);
    setErrorMsg(null);
    setSuccessInfo(null);
  }, [settings, isOpen]);

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrlInput(text.trim());
          setErrorMsg(null);
          onShowToast('Đã dán liên kết từ bộ nhớ tạm!', 'info');
        }
      } else {
        onShowToast('Trình duyệt không cho phép đọc bộ nhớ tạm tự động. Hãy nhấn Ctrl+V / Cmd+V vào ô.', 'info');
      }
    } catch (err) {
      onShowToast('Hãy nhấn phím Ctrl+V (hoặc Cmd+V trên Mac) để dán đường link vào ô.', 'info');
    }
  };

  // Submit and configure Google Sheet
  const handleSaveAndSync = async () => {
    if (!isAdminLoggedIn) {
      onShowToast('Vui lòng đăng nhập Quản trị viên để lưu cấu hình Google Sheets!', 'error');
      if (onRequireAdminLogin) onRequireAdminLogin();
      return;
    }

    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập hoặc dán đường link Google Sheets của bạn vào ô.');
      return;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      setErrorMsg('Đường dẫn không hợp lệ. Vui lòng dán liên kết đầy đủ (bắt đầu bằng https://docs.google.com/... hoặc https://drive.google.com/...).');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessInfo(null);

    try {
      const res = await configureOnlineSheet(trimmed, syncMode, autoSync);
      if (res && res.success && res.procedures) {
        onUpdateProcedures(res.procedures);
        if (res.settings) {
          onSaveSettings(res.settings);
        } else {
          onSaveSettings({
            ...settings,
            onlineExcelUrl: trimmed,
            onlineExcelAutoSync: autoSync,
            onlineExcelSyncMode: syncMode,
            lastOnlineSyncDate: new Date().toISOString(),
            lastOnlineSyncCount: res.procedures.length
          });
        }
        setSuccessInfo(`Đã kết nối và đồng bộ thành công ${res.procedures.length} thủ tục hành chính từ Google Sheet! Mọi máy tính khác truy cập vào web sẽ tự động nhận số liệu mới nhất này.`);
        onShowToast(`Đồng bộ thành công ${res.procedures.length} thủ tục từ Google Sheets!`, 'success');
      } else {
        throw new Error(getErrorMessage(res, 'Lỗi không xác định khi đồng bộ.'));
      }
    } catch (err: unknown) {
      console.error('Lỗi cấu hình Google Sheet / Drive:', err);
      const msg = getErrorMessage(err, 'Không thể kết nối đến Google Sheet / Google Drive. Hãy kiểm tra lại quyền truy cập công khai.');
      setErrorMsg(msg);
      onShowToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Manual resync with existing URL
  const handleManualResync = async () => {
    if (!settings.onlineExcelUrl) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessInfo(null);
    try {
      const res = await syncOnlineSheet(settings.onlineExcelUrl, syncMode);
      if (res && res.success && res.procedures) {
        onUpdateProcedures(res.procedures);
        if (res.settings) {
          onSaveSettings(res.settings);
        }
        setSuccessInfo(`Đã cập nhật mới nhất: ${res.procedures.length} thủ tục từ Google Sheet.`);
        onShowToast(`Đã làm mới dữ liệu từ Google Sheet (${res.procedures.length} thủ tục)!`, 'success');
      } else {
        throw new Error(getErrorMessage(res, 'Lỗi làm mới dữ liệu'));
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Lỗi làm mới dữ liệu từ Google Sheet / Google Drive');
      setErrorMsg(msg);
      onShowToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect Google Sheet
  const handleDisconnect = async () => {
    if (!isAdminLoggedIn) {
      onShowToast('Yêu cầu quyền Quản trị viên để ngắt kết nối!', 'error');
      if (onRequireAdminLogin) onRequireAdminLogin();
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn ngắt kết nối với Google Sheet này không? (Dữ liệu hiện có trên web vẫn được bảo lưu)')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await disconnectOnlineSheet();
      onSaveSettings({
        ...settings,
        onlineExcelUrl: '',
        onlineExcelAutoSync: false
      });
      setUrlInput('');
      setSuccessInfo('Đã ngắt kết nối Google Sheet. Hệ thống chuyển về sử dụng dữ liệu lưu trữ nội bộ.');
      onShowToast('Đã ngắt kết nối Google Sheets!', 'info');
    } catch (err: unknown) {
      onShowToast('Lỗi khi ngắt kết nối: ' + getErrorMessage(err, 'Không xác định'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Download Excel template
  const handleDownloadTemplate = () => {
    exportProceduresToExcelWithQr(procedures, settings);
    onShowToast('Đã tải file Excel mẫu chuẩn về máy! Bạn có thể tải file này lên Google Drive để mở bằng Google Sheets.', 'success');
  };

  const isConfigured = Boolean(settings.onlineExcelUrl && settings.onlineExcelUrl.trim());

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg tracking-tight uppercase truncate">
                  CẤU HÌNH LIÊN KẾT GOOGLE SHEETS ONLINE
                </h3>
                <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Trực tiếp
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 truncate">
                Nhập thủ tục trên Google Sheet của bạn - Tự động đồng bộ sang mọi máy tính và thiết bị khác
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-3"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Current Connection Status Banner */}
          {isConfigured ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                    HỆ THỐNG ĐANG LIÊN KẾT VỚI GOOGLE SHEET
                  </span>
                  <span className="text-[11px] bg-emerald-200/80 text-emerald-900 font-mono font-bold px-2 py-0.5 rounded">
                    {procedures.length} TTHC
                  </span>
                </div>
                <p className="text-xs text-emerald-800 font-mono truncate max-w-md" title={settings.onlineExcelUrl}>
                  {settings.onlineExcelUrl}
                </p>
                {settings.lastOnlineSyncDate && (
                  <p className="text-[11px] text-emerald-700">
                    Đồng bộ lần cuối: <span className="font-semibold">{new Date(settings.lastOnlineSyncDate).toLocaleString('vi-VN')}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={settings.onlineExcelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                  title="Mở tệp Google Sheets trong tab mới để xem và chỉnh sửa"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Google Sheet</span>
                </a>
                <button
                  type="button"
                  onClick={handleManualResync}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Bấm để đồng bộ ngay dữ liệu mới nhất từ Google Sheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Đồng bộ ngay</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Ngắt kết nối Google Sheet này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900 uppercase">
                  Chưa cấu hình liên kết Google Sheets / Google Drive
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Dán đường link Google Sheet hoặc link file Excel (.xlsx) chia sẻ trên Google Drive của bạn vào ô dưới đây. Sau khi lưu, khi bạn cập nhật số liệu trên file, mọi máy tính và điện thoại khác truy cập web đều sẽ tự động nhận dữ liệu mới nhất.
                </p>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs text-rose-800 space-y-1 animate-shake">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>LỖI ĐỒNG BỘ:</span>
              </div>
              <p className="pl-6">{errorMsg}</p>
            </div>
          )}

          {successInfo && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs text-emerald-800 space-y-1 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>THÀNH CÔNG:</span>
              </div>
              <p className="pl-6">{successInfo}</p>
            </div>
          )}

          {/* Direct URL Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-emerald-600" />
                <span>Đường link Google Sheet hoặc file Excel trên Google Drive:</span>
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Dán từ bộ nhớ tạm (Paste)</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... hoặc https://drive.google.com/file/d/.../view?usp=sharing"
                className="w-full px-4 py-3 bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-xs sm:text-sm font-mono text-slate-800"
                id="input-google-sheet-url"
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => setUrlInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Xóa nội dung"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Hỗ trợ link Google Sheets (/edit, /pubhtml, /d/e/2PACX-...), link file Excel (.xlsx) chia sẻ trên Google Drive (drive.google.com/file/d/...), OneDrive hoặc link tải trực tiếp.
            </p>
          </div>

          {/* Step-by-Step Guide for Sharing Permissions */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase">
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>Hướng dẫn cấp quyền xem trên Google Sheet / Google Drive (Rất quan trọng):</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center font-mono">
                  1
                </span>
                <h5 className="font-bold text-slate-800">Mở file Sheet hoặc Drive</h5>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Mở Google Sheet hoặc chuột phải vào file Excel (.xlsx) trên Google Drive của bạn.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center font-mono">
                  2
                </span>
                <h5 className="font-bold text-slate-800">Bấm nút "Chia sẻ" (Share)</h5>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Bấm nút <strong>"Chia sẻ"</strong> (Share) để mở bảng thiết lập quyền truy cập đường liên kết.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center font-mono">
                  3
                </span>
                <h5 className="font-bold text-slate-800">Chọn "Bất kỳ ai có liên kết"</h5>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Tại mục <strong>Quyền truy cập chung</strong>, chọn: <strong>Bất kỳ ai có đường liên kết</strong> (Vai trò: <strong>Người xem</strong>), rồi sao chép link dán vào đây.
                </p>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 italic">
              * Lưu ý: Quyền "Người xem" là đủ để hệ thống đọc tự động. Nếu dùng chức năng "Xuất bản lên web" (/d/e/2PACX-...), hãy đảm bảo đã nhấn "Xuất bản" hoặc dùng trực tiếp nút "Chia sẻ" của Google Sheet / Google Drive.
            </p>
          </div>

          {/* Sync Options */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Tùy chọn chế độ đồng bộ:
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                syncMode === 'replace_all' ? 'bg-emerald-50/70 border-emerald-400 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="syncMode"
                  value="replace_all"
                  checked={syncMode === 'replace_all'}
                  onChange={() => setSyncMode('replace_all')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Ghi đè chuẩn theo Google Sheet</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded">Khuyên dùng</span>
                  </span>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Google Sheet là nguồn dữ liệu duy nhất. Mọi thay đổi (thêm, sửa, xóa thủ tục) trên Sheet sẽ cập nhật y nguyên sang web.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                syncMode === 'merge' ? 'bg-emerald-50/70 border-emerald-400 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="syncMode"
                  value="merge"
                  checked={syncMode === 'merge'}
                  onChange={() => setSyncMode('merge')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-slate-800">
                    Hợp nhất (Merge theo Mã TTHC)
                  </span>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Giữ nguyên các thủ tục cũ trên web, chỉ cập nhật hoặc bổ sung các thủ tục mới có trong Google Sheet.
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span>Tự động đồng bộ liên tục đa thiết bị (Máy tính, điện thoại, Kiosk đều luôn thấy số liệu mới nhất khi bạn sửa Sheet)</span>
              </label>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-emerald-800 font-semibold cursor-pointer py-1.5 px-3 rounded-lg border border-slate-300 hover:bg-white transition-colors w-full sm:w-auto justify-center"
            title="Tải tệp mẫu Excel có đầy đủ cấu trúc các cột chuẩn để bạn tải lên Google Drive tạo Google Sheet mới"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tải file Excel mẫu chuẩn (.xlsx)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer w-full sm:w-auto"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSaveAndSync}
              disabled={isLoading || !urlInput.trim()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              id="btn-save-google-sheet-sync"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang kết nối & Đồng bộ...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Lưu & Đồng bộ ngay từ Google Sheet</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
