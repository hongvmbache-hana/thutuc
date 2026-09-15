import React, { useState } from 'react';
import { 
  ShieldAlert, 
  LogIn, 
  Lock, 
  Check, 
  Landmark, 
  Tags, 
  Plus, 
  Trash2, 
  X, 
  Sliders, 
  HelpCircle,
  FileText,
  Sparkles,
  RefreshCw,
  Globe,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  Database,
  Eye,
  Loader2,
  Calendar,
  Layers,
  Link2,
  CheckCheck,
  Users,
  Monitor
} from 'lucide-react';
import { Procedure, AppSettings, OnlineExcelSyncResult } from '../types';
import { fetchOnlineSpreadsheet, parseSpreadsheetBuffer, formatOnlineExcelUrl } from '../utils/onlineExcelSync';
import { authenticateUser } from '../utils/userManagement';
import UserManagementTab from './UserManagementTab';
import KioskManagementTab from './KioskManagementTab';

interface AdminPanelProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  linhVucPresets: string[];
  setLinhVucPresets: (presets: string[]) => void;
  soNganhPresets: string[];
  setSoNganhPresets: (presets: string[]) => void;
  onSaveLinhVucPresets?: (presets: string[]) => void;
  onSaveSoNganhPresets?: (presets: string[]) => void;
  onShowToast: (message: string, type: 'success' | 'info' | 'error') => void;
  isAuthorized: boolean;
  setIsAuthorized: (auth: boolean) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  procedures?: Procedure[];
  onImportSuccess?: (imported: Procedure[], mode: 'merge' | 'add_only' | 'replace_all') => void;
  onAddNewPresets?: (newLinhVucList: string[], newSoNganhList: string[]) => void;
  onDeleteAllProcedures?: () => void;
  onResetToPresets?: () => void;
  onBackupDownload?: () => void;
  onPushToServer?: () => Promise<void>;
  onPullFromServer?: () => Promise<void>;
  serverLastUpdated?: string | null;
  isServerSyncing?: boolean;
  onOpenOnlineSpreadsheet?: () => void;
  hideTriggerButton?: boolean;
}

type AdminTab = 'system' | 'kiosk' | 'users' | 'categories' | 'data' | 'online_excel' | 'footer';

export default function AdminPanel({
  settings,
  onSaveSettings,
  linhVucPresets,
  setLinhVucPresets,
  soNganhPresets,
  setSoNganhPresets,
  onSaveLinhVucPresets,
  onSaveSoNganhPresets,
  onShowToast,
  isAuthorized,
  setIsAuthorized,
  isOpen,
  setIsOpen,
  procedures = [],
  onImportSuccess,
  onAddNewPresets,
  onDeleteAllProcedures,
  onResetToPresets,
  onBackupDownload,
  onPushToServer,
  onPullFromServer,
  serverLastUpdated,
  isServerSyncing = false,
  onOpenOnlineSpreadsheet,
  hideTriggerButton = false
}: AdminPanelProps) {
  const [username, setUsername] = useState(() => localStorage.getItem('tthc_admin_username') || '');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('system');
  const [adminConfirm, setAdminConfirm] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  } | null>(null);

  // Website Config Temporary local states (initialized from current settings on open/auth)
  const [siteTitle, setSiteTitle] = useState(settings.siteTitle);
  const [siteSubtitle, setSiteSubtitle] = useState(settings.siteSubtitle);
  const [logoEmoji, setLogoEmoji] = useState(settings.logoEmoji);
  const [badgeLabel, setBadgeLabel] = useState(settings.badgeLabel);
  const [systemVersion, setSystemVersion] = useState(settings.systemVersion);
  const [footerMainText, setFooterMainText] = useState(settings.footerMainText);
  const [footerSubText, setFooterSubText] = useState(settings.footerSubText);

  // Online Excel Configuration state
  const [onlineExcelUrl, setOnlineExcelUrl] = useState(settings.onlineExcelUrl || '');
  const [onlineExcelAutoSync, setOnlineExcelAutoSync] = useState(settings.onlineExcelAutoSync || false);
  const [onlineExcelSyncMode, setOnlineExcelSyncMode] = useState<'merge' | 'add_only' | 'replace_all'>(settings.onlineExcelSyncMode || 'merge');
  const [isFetchingOnline, setIsFetchingOnline] = useState(false);
  const [onlinePreviewData, setOnlinePreviewData] = useState<OnlineExcelSyncResult | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [previewFilter, setPreviewFilter] = useState('');

  // Add field temporary input states for categories
  const [newLinhVuc, setNewLinhVuc] = useState('');
  const [newSoNganh, setNewSoNganh] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    // 1. Authenticate against User Management store
    const auth = authenticateUser(cleanUser, cleanPass);
    if (auth.success && auth.user) {
      if (auth.user.role !== 'admin') {
        setErrorMsg('Tài khoản của bạn thuộc vai trò Cán bộ nhưng không có quyền Quản trị tối cao (Chỉ Admin mới được vào Quản trị hệ thống).');
        onShowToast('Tài khoản không có quyền truy cập Ban Quản Trị hệ thống.', 'error');
        return;
      }

      setIsAuthorized(true);
      setErrorMsg('');
      const displayName = auth.user.fullName || auth.user.username;
      localStorage.setItem('tthc_admin_username', auth.user.username);
      localStorage.setItem('tthc_is_admin_logged_in', 'true');
      setUsername(auth.user.username);

      // Sync form fields with active props when logging in
      setSiteTitle(settings.siteTitle);
      setSiteSubtitle(settings.siteSubtitle);
      setLogoEmoji(settings.logoEmoji);
      setBadgeLabel(settings.badgeLabel);
      setSystemVersion(settings.systemVersion);
      setFooterMainText(settings.footerMainText);
      setFooterSubText(settings.footerSubText);
      setOnlineExcelUrl(settings.onlineExcelUrl || '');
      setOnlineExcelAutoSync(settings.onlineExcelAutoSync || false);
      setOnlineExcelSyncMode(settings.onlineExcelSyncMode || 'merge');

      onShowToast(`Đăng nhập thành công với tài khoản quản trị ${displayName}! Đã mở toàn quyền Thêm, Sửa, Xóa.`, 'success');
      return;
    }

    // 2. Legacy fallback
    const lowerUser = cleanUser.toLowerCase();
    const isHongvm = (lowerUser === 'hongvm' || lowerUser === 'hongvm.bache@gmail.com') && (cleanPass === 'Vungochan@2015' || cleanPass === 'vungochan@2015');
    const isNguyenVanA = lowerUser === 'nguyenvana' && cleanPass === 'nguyenvana@2026';
    const isAdmin = lowerUser === 'admin' && (cleanPass === 'Vungochan@2015' || cleanPass === 'vungochan@2015' || cleanPass === 'admin@2026' || cleanPass === '123456');

    if (isHongvm || isNguyenVanA || isAdmin) {
      setIsAuthorized(true);
      setErrorMsg('');
      const displayName = isHongvm ? 'Hongvm' : (isAdmin ? 'Admin' : 'NguyenVanA');
      localStorage.setItem('tthc_admin_username', displayName);
      localStorage.setItem('tthc_is_admin_logged_in', 'true');
      setUsername(displayName);
      
      // Sync form fields with active props when logging in
      setSiteTitle(settings.siteTitle);
      setSiteSubtitle(settings.siteSubtitle);
      setLogoEmoji(settings.logoEmoji);
      setBadgeLabel(settings.badgeLabel);
      setSystemVersion(settings.systemVersion);
      setFooterMainText(settings.footerMainText);
      setFooterSubText(settings.footerSubText);
      setOnlineExcelUrl(settings.onlineExcelUrl || '');
      setOnlineExcelAutoSync(settings.onlineExcelAutoSync || false);
      setOnlineExcelSyncMode(settings.onlineExcelSyncMode || 'merge');
      
      onShowToast(`Đăng nhập thành công với tài khoản quản trị ${displayName}! Đã mở toàn quyền Thêm, Sửa, Xóa.`, 'success');
    } else {
      setErrorMsg(auth.error || 'Tên đăng nhập hoặc mật khẩu quản trị không chính xác. Vui lòng kiểm tra lại.');
      onShowToast('Đăng nhập thất bại! Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.', 'error');
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    setUsername('');
    setPassword('');
    localStorage.removeItem('tthc_admin_username');
    localStorage.removeItem('tthc_is_admin_logged_in');
    onShowToast('Đã đăng xuất khỏi tài khoản quản trị viên.', 'info');
  };

  // Save the entire system configurations
  const handleSaveConfig = () => {
    const updated: AppSettings = {
      ...settings,
      siteTitle: siteTitle.trim() || settings.siteTitle,
      siteSubtitle: siteSubtitle.trim() || settings.siteSubtitle,
      logoEmoji: logoEmoji.trim() || settings.logoEmoji,
      badgeLabel: badgeLabel.trim() || settings.badgeLabel,
      systemVersion: systemVersion.trim() || settings.systemVersion,
      footerMainText: footerMainText.trim() || settings.footerMainText,
      footerSubText: footerSubText.trim() || settings.footerSubText,
      onlineExcelUrl: onlineExcelUrl.trim(),
      onlineExcelAutoSync,
      onlineExcelSyncMode
    };
    onSaveSettings(updated);
    onShowToast('Đã lưu cấu hình trang web thành công!', 'success');
  };

  // Save specifically online Excel configuration
  const handleSaveOnlineConfig = () => {
    if (!isAuthorized) {
      onShowToast('Chỉ Quản trị viên mới được phép lưu cấu hình biểu mẫu online!', 'error');
      return;
    }
    const updated: AppSettings = {
      ...settings,
      onlineExcelUrl: onlineExcelUrl.trim(),
      onlineExcelAutoSync,
      onlineExcelSyncMode
    };
    onSaveSettings(updated);
    onShowToast('Đã lưu cấu hình liên kết biểu mẫu Excel Online thành công!', 'success');
  };

  // Fetch and preview online spreadsheet
  const handleTestAndPreviewOnline = async () => {
    const trimmed = onlineExcelUrl.trim();
    if (!trimmed) {
      setOnlineError('Vui lòng nhập đường dẫn biểu mẫu Google Sheets hoặc Excel Online.');
      onShowToast('Vui lòng dán đường dẫn biểu mẫu Excel Online!', 'error');
      return;
    }

    setIsFetchingOnline(true);
    setOnlineError(null);

    try {
      const { buffer, isCsv, sourceUrl } = await fetchOnlineSpreadsheet(trimmed);
      const result = await parseSpreadsheetBuffer(buffer, isCsv, sourceUrl);
      setOnlinePreviewData(result);
      onShowToast(`Đã nạp thành công ${result.totalParsed} thủ tục từ biểu mẫu online!`, 'success');
    } catch (err: any) {
      console.error("Lỗi nạp Excel online:", err);
      const msg = err.message || 'Không thể kết nối hoặc đọc dữ liệu từ đường dẫn đã cung cấp.';
      setOnlineError(msg);
      onShowToast(msg, 'error');
    } finally {
      setIsFetchingOnline(false);
    }
  };

  // Execute online sync directly into procedure catalog
  const handleExecuteOnlineSync = (modeOverride?: 'merge' | 'add_only' | 'replace_all') => {
    if (!isAuthorized) {
      onShowToast('Chỉ Quản trị viên mới có quyền đồng bộ dữ liệu biểu mẫu online!', 'error');
      return;
    }
    if (!onImportSuccess) {
      onShowToast('Chức năng cập nhật thủ tục chưa được kích hoạt ở màn hình chính.', 'error');
      return;
    }

    const mode = modeOverride || onlineExcelSyncMode;

    if (!onlinePreviewData || onlinePreviewData.procedures.length === 0) {
      onShowToast('Vui lòng nhấn "Kiểm tra & Xem trước" để nạp dữ liệu từ Excel online trước khi đồng bộ.', 'info');
      return;
    }

    const modeText = mode === 'replace_all'
      ? 'ghi đè toàn bộ danh mục hiện tại'
      : mode === 'add_only'
        ? 'chỉ thêm các thủ tục mới'
        : 'cập nhật thông minh (hợp nhất theo mã TTHC)';

    setAdminConfirm({
      title: 'Xác nhận đồng bộ thủ tục hành chính',
      message: `Bạn đang chuẩn bị đồng bộ ${onlinePreviewData.procedures.length} thủ tục từ biểu mẫu Excel Online với chế độ [${modeText}]. Bạn có chắc chắn muốn tiến hành cập nhật?`,
      confirmText: 'Đồng bộ ngay',
      cancelText: 'Hủy bỏ',
      type: mode === 'replace_all' ? 'danger' : 'warning',
      onConfirm: () => {
        // 1. Execute procedure catalog update
        onImportSuccess(onlinePreviewData.procedures, mode);

        // 2. Register any newly discovered linh vuc and so nganh
        if (onAddNewPresets && (onlinePreviewData.discoveredLinhVuc.length > 0 || onlinePreviewData.discoveredSoNganh.length > 0)) {
          onAddNewPresets(onlinePreviewData.discoveredLinhVuc, onlinePreviewData.discoveredSoNganh);
        }

        // 3. Save sync history timestamp to settings
        const updatedSettings: AppSettings = {
          ...settings,
          onlineExcelUrl: onlineExcelUrl.trim(),
          onlineExcelAutoSync,
          onlineExcelSyncMode,
          lastOnlineSyncDate: new Date().toISOString(),
          lastOnlineSyncCount: onlinePreviewData.procedures.length
        };
        onSaveSettings(updatedSettings);

        onShowToast(`Đồng bộ thành công ${onlinePreviewData.procedures.length} thủ tục từ biểu mẫu Excel Online!`, 'success');
      }
    });
  };

  // Reset to default presets
  const handleResetToDefault = () => {
    setAdminConfirm({
      title: 'Khôi phục thiết lập gốc',
      message: 'Bạn có chắc chắn muốn khôi phục giao diện, logo, tiêu đề và chân trang (footer) về trạng thái chuẩn ban đầu của xã Ba Chẽ không?',
      confirmText: 'Khôi phục chuẩn',
      cancelText: 'Hủy bỏ',
      type: 'warning',
      onConfirm: () => {
        const defaults: AppSettings = {
          siteTitle: 'Xã Ba Chẽ - CỔNG TRA CỨU THỦ TỤC HÀNH CHÍNH',
          siteSubtitle: 'Cổng thông tin điện tử nâng cao chỉ số cải cách hành chính, quản lý dữ liệu số hóa quy chuẩn quốc gia',
          logoEmoji: '🏛️',
          badgeLabel: 'DỮ LIỆU ĐỒNG BỘ',
          systemVersion: 'v2.6.4',
          footerMainText: '© 2026 Thiết kế By TTPVHCC xã Ba Chẽ - Hệ thổng quản lý dữ liệu Thủ tục Hành chính.',
          footerSubText: 'Phục vụ công tác chuyển đổi số cấp cơ sở và nâng cao chỉ số cải cách hành chính (PAR INDEX).'
        };
        setSiteTitle(defaults.siteTitle);
        setSiteSubtitle(defaults.siteSubtitle);
        setLogoEmoji(defaults.logoEmoji);
        setBadgeLabel(defaults.badgeLabel);
        setSystemVersion(defaults.systemVersion);
        setFooterMainText(defaults.footerMainText);
        setFooterSubText(defaults.footerSubText);
        
        onSaveSettings(defaults);
        onShowToast('Đã khôi phục thiết lập mặc định hệ thống thành công!', 'info');
      }
    });
  };

  const handleAddLinhVuc = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newLinhVuc.trim();
    if (!val) return;
    if (linhVucPresets.includes(val)) {
      onShowToast('Lĩnh vực này đã tồn tại trong cấu hình!', 'error');
      return;
    }
    const updated = [val, ...linhVucPresets];
    if (onSaveLinhVucPresets) {
      onSaveLinhVucPresets(updated);
    } else {
      setLinhVucPresets(updated);
      localStorage.setItem('tthc_linh_vuc_presets', JSON.stringify(updated));
    }
    setNewLinhVuc('');
    onShowToast(`Đã thêm lĩnh vực mới: ${val}`, 'success');
  };

  const handleDeleteLinhVuc = (item: string) => {
    setAdminConfirm({
      title: 'Xóa lĩnh vực gợi ý',
      message: `Bạn có chắc chắn muốn xóa lĩnh vực "${item}" ra khỏi danh mục gợi ý không?`,
      confirmText: 'Xóa danh mục',
      cancelText: 'Hủy bỏ',
      type: 'danger',
      onConfirm: () => {
        const updated = linhVucPresets.filter(x => x !== item);
        if (onSaveLinhVucPresets) {
          onSaveLinhVucPresets(updated);
        } else {
          setLinhVucPresets(updated);
          localStorage.setItem('tthc_linh_vuc_presets', JSON.stringify(updated));
        }
        onShowToast(`Đã xóa lĩnh vực: ${item}`, 'info');
      }
    });
  };

  const handleAddSoNganh = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newSoNganh.trim();
    if (!val) return;
    if (soNganhPresets.includes(val)) {
      onShowToast('Bộ, ngành/ban này đã có trong cấu hình!', 'error');
      return;
    }
    const updated = [val, ...soNganhPresets];
    if (onSaveSoNganhPresets) {
      onSaveSoNganhPresets(updated);
    } else {
      setSoNganhPresets(updated);
      localStorage.setItem('tthc_so_nganh_presets', JSON.stringify(updated));
    }
    setNewSoNganh('');
    onShowToast(`Đã thêm ban/bộ ngành mới: ${val}`, 'success');
  };

  const handleDeleteSoNganh = (item: string) => {
    setAdminConfirm({
      title: 'Xóa ban/bộ ngành gợi ý',
      message: `Bạn có chắc chắn muốn xóa ban/bộ ngành "${item}" ra khỏi danh mục gợi ý không?`,
      confirmText: 'Xóa danh mục',
      cancelText: 'Hủy bỏ',
      type: 'danger',
      onConfirm: () => {
        const updated = soNganhPresets.filter(x => x !== item);
        if (onSaveSoNganhPresets) {
          onSaveSoNganhPresets(updated);
        } else {
          setSoNganhPresets(updated);
          localStorage.setItem('tthc_so_nganh_presets', JSON.stringify(updated));
        }
        onShowToast(`Đã xóa ban/bộ ngành: ${item}`, 'info');
      }
    });
  };

  return (
    <>
      {!hideTriggerButton && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            // Auto sync from current live settings
            setSiteTitle(settings.siteTitle);
            setSiteSubtitle(settings.siteSubtitle);
            setLogoEmoji(settings.logoEmoji);
            setBadgeLabel(settings.badgeLabel);
            setSystemVersion(settings.systemVersion);
            setFooterMainText(settings.footerMainText);
            setFooterSubText(settings.footerSubText);
            setOnlineExcelUrl(settings.onlineExcelUrl || '');
            setOnlineExcelAutoSync(settings.onlineExcelAutoSync || false);
            setOnlineExcelSyncMode(settings.onlineExcelSyncMode || 'merge');
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-amber-400 border border-slate-700 hover:border-amber-500 rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer"
          id="trigger-admin-panel"
        >
          <Lock className="w-3.5 h-3.5 text-amber-500" />
          <span>⚙️ Trang quản trị Admin</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden"
            id="admin-management-container"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-900 text-white select-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                  <ShieldAlert className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wider uppercase flex items-center gap-2">
                    CỔNG QUẢN TRỊ ADMIN TOÀN DIỆN
                    <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase font-mono font-bold tracking-normal animate-pulse">
                      Live CMS
                    </span>
                  </h3>
                  <p className="text-[10.5px] text-slate-300 font-medium">
                    Thay đổi logo, tên trang web, nội dung chân trang, quản trị cơ sở dữ liệu và đồng bộ biểu mẫu Excel Online
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-white rounded-full p-1.5 hover:bg-slate-800 transition-all cursor-pointer"
                onClick={() => setIsOpen(false)}
                id="close-admin-panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header Tabs (Visible only if successfully logged in) */}
            {isAuthorized && (
              <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex flex-wrap gap-2 text-xs font-bold text-slate-600 select-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('system')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'system' 
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80' 
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  id="tab-btn-system"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Giao diện & Hệ thống
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('kiosk')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'kiosk' 
                      ? 'bg-white text-red-700 shadow-sm border border-slate-200/80' 
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  id="tab-btn-kiosk"
                >
                  <Monitor className="w-3.5 h-3.5 text-red-600" />
                  <span>Banner & Footer Kiosk</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'users' 
                      ? 'bg-white text-purple-700 shadow-sm border border-slate-200/80' 
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  id="tab-btn-users"
                >
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>Người dùng & Phân quyền</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('categories')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'categories' 
                      ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80' 
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Tags className="w-3.5 h-3.5" />
                  Danh mục cơ sở
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('data')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'data' 
                      ? 'bg-white text-rose-700 shadow-sm border border-slate-200/80' 
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-rose-600" />
                  <span>CSDL & Xóa TTHC</span>
                  <span className="bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                    {procedures.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('online_excel')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'online_excel' 
                      ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80' 
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Biểu mẫu Excel Online</span>
                  {onlineExcelUrl && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" title="Đã cấu hình đường dẫn"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('footer')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'footer' 
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80' 
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Nội dung Chân trang
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
              {!isAuthorized ? (
                /* 1. Unauthorized login form */
                <form onSubmit={handleLogin} className="max-w-md mx-auto space-y-4 py-6" id="admin-login-form">
                  <div className="text-center space-y-1.5 mb-5">
                    <div className="bg-amber-100 text-amber-800 p-3.5 rounded-full w-14 h-14 mx-auto flex items-center justify-center shadow-inner">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm uppercase mt-2 tracking-wide">Đăng nhập tài khoản Quản trị viên</h4>
                    <p className="text-xs text-slate-500 font-semibold">
                      Đăng nhập để có quyền Thêm mới, Sửa đổi dữ liệu, Xóa TTHC và cấu hình hệ thống
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg text-center font-bold">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-4 shadow-sm border border-slate-200 rounded-xl p-5 bg-white">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Tên tài khoản</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: canbo_motcua hoặc email..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        id="admin-username"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Mật khẩu</label>
                      <input
                        type="password"
                        required
                        placeholder="Nhập mật khẩu..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        id="admin-password"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
                      id="submit-admin-login"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Xác thực & Mở quyền Quản trị (Thêm, Sửa, Xóa)</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* 2. Logged-in workspace with separated views */
                <div className="space-y-6">
                  {/* Security welcome bar */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
                    <div>
                      <p className="text-slate-800 font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                        Quản trị viên: <span className="text-red-700 font-mono font-extrabold text-sm">{username}</span> (Quyền tối cao)
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Mọi thay đổi dưới đây sẽ lập tức có hiệu lực và được lưu trữ tự động vào trình duyệt người dùng.
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold rounded-lg transition-colors cursor-pointer border border-slate-200 flex items-center gap-1"
                        title="Khôi phục lại giao diện ban đầu"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                        Mặc định gốc
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-[10.5px] font-bold rounded-lg transition-colors cursor-pointer border border-red-200"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: SYSTEM & HEADING PARAMETERS */}
                  {activeTab === 'system' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5 animate-fadeIn">
                      <div className="border-b border-slate-100 pb-2.5">
                        <h4 className="font-extrabold text-xs uppercase text-slate-800 flex items-center gap-2">
                          <Sliders className="w-4.5 h-4.5 text-indigo-600" />
                          Thay đổi nhận diện & Nội dung Website chính
                        </h4>
                        <p className="text-[10.5px] text-slate-500 mt-0.5">
                          Điều chỉnh Logo, Tiêu đề cổng thủ tục hành chính, Mô tả phụ hiển thị trên thanh tiêu đề của trang chủ.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Logo Emoji input */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block">Biểu tượng Hệ thống (Logo Emoji)</label>
                          <div className="flex gap-2">
                            <span className="bg-slate-100 border border-slate-200 text-xl px-3 py-1.5 rounded-lg flex items-center justify-center select-none">{logoEmoji}</span>
                            <input
                              type="text"
                              maxLength={4}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                              value={logoEmoji}
                              onChange={(e) => setLogoEmoji(e.target.value)}
                              placeholder="🏛️, 📂, 🛡️..."
                            />
                          </div>
                          <p className="text-[10px] text-slate-400">Có thể dán một biểu tượng emoji từ bàn phím của bạn</p>
                        </div>

                        {/* Badge Label input */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block">Nhãn Huy hiệu (Badge Label)</label>
                          <input
                            type="text"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 uppercase focus:outline-none focus:border-indigo-600 focus:bg-white"
                            value={badgeLabel}
                            onChange={(e) => setBadgeLabel(e.target.value)}
                            placeholder="Ví dụ: DỮ LIỆU ĐỒNG BỘ"
                          />
                          <p className="text-[10px] text-slate-400">Nhãn chữ nhỏ nổi bật cạnh biểu tượng</p>
                        </div>

                        {/* Website Main Title */}
                        <div className="space-y-1 md:col-span-2">
                          <label className="font-bold text-slate-700 block">Tên trang web (Tiêu đề chính)</label>
                          <input
                            type="text"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-extrabold text-slate-800 uppercase focus:outline-none focus:border-indigo-600 focus:bg-white"
                            value={siteTitle}
                            onChange={(e) => setSiteTitle(e.target.value)}
                            placeholder="Ví dụ: CƠ SỞ DỮ LIỆU THỦ TỤC HÀNH CHÍNH"
                          />
                        </div>

                        {/* Website Subtitle Description */}
                        <div className="space-y-1 md:col-span-2">
                          <label className="font-bold text-slate-700 block">Mô tả phụ hệ thống (Subtitle)</label>
                          <textarea
                            rows={2}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-600 focus:bg-white"
                            value={siteSubtitle}
                            onChange={(e) => setSiteSubtitle(e.target.value)}
                            placeholder="Nhập văn bản mô tả ngắn gọn..."
                          />
                        </div>

                        {/* Config Software Version */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block">Phiên bản Số hóa (Version)</label>
                          <input
                            type="text"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-indigo-600 focus:bg-white"
                            value={systemVersion}
                            onChange={(e) => setSystemVersion(e.target.value)}
                            placeholder="Ví dụ: v2.6.4"
                          />
                        </div>
                      </div>

                      {/* Apply changes button */}
                      <div className="flex justify-end pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleSaveConfig}
                          className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Cập nhật Cài đặt Hệ thống
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB: KIOSK BANNER & FOOTER CONFIGURATION */}
                  {activeTab === 'kiosk' && (
                    <div className="animate-fadeIn">
                      <KioskManagementTab
                        settings={settings}
                        onSaveSettings={onSaveSettings}
                        onShowToast={onShowToast}
                        procedures={procedures}
                      />
                    </div>
                  )}

                  {/* TAB: USER MANAGEMENT & ROLE PERMISSIONS */}
                  {activeTab === 'users' && (
                    <div className="animate-fadeIn">
                      <UserManagementTab
                        onShowToast={onShowToast}
                        currentUsername={username}
                      />
                    </div>
                  )}

                  {/* TAB 2: EXSITING CATEGORIES MANAGEMENT */}
                  {activeTab === 'categories' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                      
                      {/* Left side: Linh Vuc Category list */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 justify-between">
                          <div className="flex items-center gap-2">
                            <Tags className="w-5 h-5 text-indigo-600" />
                            <h4 className="font-extrabold text-xs uppercase text-slate-800">Cấu hình Lĩnh Vực ({linhVucPresets.length})</h4>
                          </div>
                        </div>

                        {/* Register form */}
                        <form onSubmit={handleAddLinhVuc} className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Nhập tên lĩnh vực mới..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white"
                            value={newLinhVuc}
                            onChange={(e) => setNewLinhVuc(e.target.value)}
                          />
                          <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-[8px] p-2 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                            title="Thêm Lĩnh Vực mới"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </form>

                        {/* Categories scroll area */}
                        <div className="max-h-60 overflow-y-auto border border-slate-150 rounded-lg divide-y divide-slate-100 bg-slate-50/50">
                          {linhVucPresets.map(item => (
                            <div key={item} className="p-2.5 flex items-center justify-between group hover:bg-white text-xs transition-colors">
                              <span className="font-semibold text-slate-700">{item}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteLinhVuc(item)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                title="Xóa lĩnh vực"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          {linhVucPresets.length === 0 && (
                            <p className="text-center text-slate-400 text-[11px] py-6">Chưa khai báo lĩnh vực nào.</p>
                          )}
                        </div>
                      </div>

                      {/* Right side: Departments database category list */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 justify-between">
                          <div className="flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-emerald-600" />
                            <h4 className="font-extrabold text-xs uppercase text-slate-800">Cấu hình Ban Bộ Ngành ({soNganhPresets.length})</h4>
                          </div>
                        </div>

                        {/* Register form */}
                        <form onSubmit={handleAddSoNganh} className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Nhập ban/bộ ngành mới..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white"
                            value={newSoNganh}
                            onChange={(e) => setNewSoNganh(e.target.value)}
                          />
                          <button
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-[8px] p-2 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                            title="Thêm ban bộ ngành"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </form>

                        {/* Departments scroll area */}
                        <div className="max-h-60 overflow-y-auto border border-slate-150 rounded-lg divide-y divide-slate-100 bg-slate-50/50">
                          {soNganhPresets.map(item => (
                            <div key={item} className="p-2.5 flex items-center justify-between group hover:bg-white text-xs transition-colors">
                              <span className="font-semibold text-slate-700">{item}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSoNganh(item)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                title="Xóa ban bộ ngành"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          {soNganhPresets.length === 0 && (
                            <p className="text-center text-slate-400 text-[11px] py-6">Chưa khai báo ban bộ ngành nào.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB: DATA & PROCEDURES MANAGEMENT */}
                  {activeTab === 'data' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6 animate-fadeIn">
                      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-extrabold text-xs uppercase text-slate-800 flex items-center gap-2">
                            <Database className="w-4.5 h-4.5 text-rose-600" />
                            <span>Quản trị Cơ sở dữ liệu & Thao tác Thủ tục Hành chính</span>
                          </h4>
                          <p className="text-[10.5px] text-slate-500 mt-0.5">
                            Quản lý toàn bộ hồ sơ dữ liệu TTHC, sao lưu dự phòng, phục hồi và xóa dữ liệu hệ thống.
                          </p>
                        </div>
                        <span className="bg-rose-100 text-rose-800 border border-rose-200 font-bold px-3 py-1 rounded-full text-xs font-mono shrink-0">
                          Tổng số: {procedures.length} thủ tục
                        </span>
                      </div>

                      {/* Status Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Tổng số thủ tục</p>
                          <p className="text-2xl font-black text-slate-800 font-mono mt-1">{procedures.length}</p>
                          <p className="text-[10.5px] text-slate-500 mt-1">Hồ sơ sẵn sàng tra cứu</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                          <p className="text-[10px] uppercase font-bold text-emerald-600">Máy chủ lưu trữ tập trung</p>
                          <p className="text-sm font-bold text-emerald-800 mt-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            ✓ Đồng bộ đa thiết bị
                          </p>
                          <p className="text-[10.5px] text-emerald-700/80 mt-1">
                            {serverLastUpdated 
                              ? `Cập nhật: ${new Date(serverLastUpdated).toLocaleTimeString('vi-VN')} ${new Date(serverLastUpdated).toLocaleDateString('vi-VN')}` 
                              : 'Tự động lưu vào CSDL máy chủ'}
                          </p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                          <p className="text-[10px] uppercase font-bold text-indigo-600">Chia sẻ dữ liệu</p>
                          <p className="text-sm font-bold text-indigo-800 mt-1">Xem trên mọi máy tính</p>
                          <p className="text-[10.5px] text-indigo-700/80 mt-1">Không bị mất khi đổi máy hoặc chia sẻ link</p>
                        </div>
                      </div>

                      {/* Central Server Multi-Device Sync Card */}
                      <div className="border border-blue-200 rounded-xl overflow-hidden bg-gradient-to-br from-blue-50/60 to-indigo-50/40">
                        <div className="bg-blue-100/70 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-700" />
                            <h5 className="font-extrabold text-xs uppercase text-blue-900">Đồng bộ dữ liệu máy chủ dùng chung (Xem trên máy khác)</h5>
                          </div>
                          <span className="text-[10px] font-bold text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Đang hoạt động
                          </span>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Mỗi khi bạn thêm mới, chỉnh sửa hoặc nhập dữ liệu từ Excel, hệ thống đã <strong>tự động lưu vào máy chủ trung tâm</strong>. Bất kỳ ai mở liên kết web hoặc truy cập từ máy tính khác đều xem được dữ liệu mới nhất mà Admin đã cập nhật.
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-2.5 pt-1">
                            {onPushToServer && (
                              <button
                                type="button"
                                disabled={isServerSyncing}
                                onClick={onPushToServer}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                id="admin-push-server-btn"
                              >
                                <Globe className="w-4 h-4" />
                                <span>{isServerSyncing ? 'Đang đẩy lên...' : 'Đẩy toàn bộ dữ liệu này lên máy chủ ngay'}</span>
                              </button>
                            )}

                            {onPullFromServer && (
                              <button
                                type="button"
                                disabled={isServerSyncing}
                                onClick={onPullFromServer}
                                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                id="admin-pull-server-btn"
                              >
                                <RefreshCw className={`w-4 h-4 text-slate-600 ${isServerSyncing ? 'animate-spin' : ''}`} />
                                <span>Tải lại dữ liệu mới nhất từ máy chủ</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Operations Zone */}
                      <div className="border border-rose-200 rounded-xl overflow-hidden bg-rose-50/30">
                        <div className="bg-rose-100/70 px-4 py-3 border-b border-rose-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-rose-700" />
                            <h5 className="font-extrabold text-xs uppercase text-rose-900">Quản lý cơ sở dữ liệu & Thao tác xóa</h5>
                          </div>
                          <span className="text-[10px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                            Thẩm quyền Admin
                          </span>
                        </div>
                        
                        <div className="p-4 space-y-4">
                          {/* Clear all procedures */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-rose-200">
                            <div>
                              <h6 className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                                <Trash2 className="w-4 h-4 text-rose-600" />
                                <span>Xóa toàn bộ thủ tục hành chính</span>
                              </h6>
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                Xóa sạch hoàn toàn tất cả <strong className="text-slate-800">{procedures.length}</strong> thủ tục hành chính đang lưu trong hệ thống. Thao tác này sẽ làm sạch cơ sở dữ liệu và không thể hoàn tác nếu không có file sao lưu.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={procedures.length === 0}
                              onClick={() => {
                                if (onDeleteAllProcedures) {
                                  onDeleteAllProcedures();
                                }
                              }}
                              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                procedures.length === 0
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm active:scale-95'
                              }`}
                              title="Xóa sạch toàn bộ thủ tục hành chính trong hệ thống"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Xóa toàn bộ CSDL ({procedures.length} TTHC)</span>
                            </button>
                          </div>

                          {/* Reset to initial presets */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200">
                            <div>
                              <h6 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                <RefreshCw className="w-4 h-4 text-slate-600" />
                                <span>Khôi phục dữ liệu mẫu ban đầu (11 thủ tục)</span>
                              </h6>
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                Đặt lại danh sách các thủ tục hành chính chuẩn theo mẫu ban đầu tại Nghệ An & các bộ ngành.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isAuthorized) {
                                  onShowToast('Chỉ Quản trị viên mới được phép khôi phục dữ liệu gốc!', 'error');
                                  return;
                                }
                                if (onResetToPresets) {
                                  onResetToPresets();
                                }
                              }}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-4 h-4 text-slate-600" />
                              <span>Khôi phục dữ liệu gốc</span>
                            </button>
                          </div>

                          {/* Offline Backup download */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200">
                            <div>
                              <h6 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                <Download className="w-4 h-4 text-indigo-600" />
                                <span>Tải gói sao lưu dự phòng (Tệp JSON)</span>
                              </h6>
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                Xuất toàn bộ danh mục thủ tục hành chính hiện có ra file JSON để lưu trữ ngoại tuyến hoặc chuyển sang máy tính khác.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isAuthorized) {
                                  onShowToast('Chỉ Quản trị viên mới được phép tải bản sao lưu CSDL!', 'error');
                                  return;
                                }
                                if (onBackupDownload) {
                                  onBackupDownload();
                                }
                              }}
                              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                            >
                              <Download className="w-4 h-4 text-indigo-700" />
                              <span>Sao lưu CSDL (.json)</span>
                            </button>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: FOOTER CONTENT SETUP */}
                  {activeTab === 'footer' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5 animate-fadeIn">
                      <div className="border-b border-slate-100 pb-2.5">
                        <h4 className="font-extrabold text-xs uppercase text-slate-800 flex items-center gap-2">
                          <FileText className="w-4.5 h-4.5 text-indigo-600" />
                          Quản lý nội dung Chân trang (Footer Settings)
                        </h4>
                        <p className="text-[10.5px] text-slate-500 mt-0.5">
                          Tùy biến nhãn bản quyền liên hệ, thông tin cơ quan chủ quản, sứ mệnh trang web xuất hiện ở phía dưới chân trang chung.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs">
                        {/* Footer Main Text copyright description */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block">Dòng tiêu đề chính (Bản quyền / CQ Chủ quản)</label>
                          <input
                            type="text"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                            value={footerMainText}
                            onChange={(e) => setFooterMainText(e.target.value)}
                            placeholder="Ví dụ: © 2026 Bản quyền thuộc Cổng thông tin điều chế..."
                          />
                        </div>

                        {/* Footer secondary text information */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block">Dòng liên kết / Slogan phục vụ công bố (Sub footer text)</label>
                          <textarea
                            rows={3}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-600 focus:bg-white"
                            value={footerSubText}
                            onChange={(e) => setFooterSubText(e.target.value)}
                            placeholder="Hỗ trợ nâng cao công tác kỹ thuật..."
                          />
                        </div>
                      </div>

                      {/* Apply changes button */}
                      <div className="flex justify-end pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleSaveConfig}
                          className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Cập nhật Chân trang Footer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: ONLINE EXCEL & GOOGLE SHEETS SYNCHRONIZATION */}
                  {activeTab === 'online_excel' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5 animate-fadeIn">
                      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-extrabold text-xs uppercase text-slate-800 flex items-center gap-2">
                            <Globe className="w-4.5 h-4.5 text-emerald-600" />
                            <span>Cấu hình Lấy Thủ tục Hành chính từ Biểu mẫu Excel Online</span>
                            <span className="text-[9.5px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase">
                              Cập nhật tức thì
                            </span>
                          </h4>
                          <p className="text-[10.5px] text-slate-500 mt-0.5">
                            Kết nối trực tiếp với Google Sheets hoặc file Excel (.xlsx / .csv) trên Internet để cập nhật danh mục TTHC nhanh chóng mà không cần tải lên thủ công.
                          </p>
                        </div>

                        {/* Last sync info badge */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-600 shrink-0 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-slate-400 block text-[9px]">Lần đồng bộ gần nhất:</span>
                            <span className="font-bold text-slate-700">
                              {settings.lastOnlineSyncDate 
                                ? `${new Date(settings.lastOnlineSyncDate).toLocaleDateString('vi-VN')} ${new Date(settings.lastOnlineSyncDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` 
                                : 'Chưa từng đồng bộ'}
                            </span>
                            {settings.lastOnlineSyncCount ? (
                              <span className="ml-1 text-emerald-600 font-bold">({settings.lastOnlineSyncCount} TTHC)</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* 2-WAY LIVE SPREADSHEET CARD */}
                      <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 text-white rounded-xl p-4 shadow-md border border-emerald-600/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Biểu mẫu 2 chiều
                            </span>
                            <span className="text-xs text-emerald-200 font-semibold">
                              (Sửa trực tiếp - Đồng bộ tự động cả 2 nơi)
                            </span>
                          </div>
                          <h4 className="text-sm sm:text-base font-extrabold text-white">
                            Mở Biểu Mẫu Nhập Dữ Liệu TTHC Online (Dạng Bảng Tính)
                          </h4>
                          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                            Mở giao diện bảng tính dạng Google Sheets/Excel ngay trên hệ thống. Bạn có thể trực tiếp thêm, sửa, xóa, dán dữ liệu. Mọi thay đổi sẽ tự động cập nhật ngay lên Cổng Web & Máy chủ và ngược lại.
                          </p>
                        </div>

                        {onOpenOnlineSpreadsheet && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isAuthorized) {
                                onShowToast('Chỉ Quản trị viên mới được phép mở và điều chỉnh Biểu mẫu Online 2 chiều!', 'error');
                                return;
                              }
                              onOpenOnlineSpreadsheet();
                            }}
                            className="shrink-0 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                            <span>Mở Bảng Tính Online Ngay</span>
                          </button>
                        )}
                      </div>

                      {/* Guide Box */}
                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-950 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>Hướng dẫn kết nối với Google Sheets (Google Trang tính):</span>
                        </div>
                        <ol className="list-decimal list-inside text-[11px] text-emerald-800 space-y-1 pl-1 leading-relaxed">
                          <li>Mở file Google Sheets chứa bảng biểu mẫu thủ tục hành chính của bạn.</li>
                          <li>
                            Bấm nút <strong>"Chia sẻ" (Share)</strong> ở góc trên bên phải màn hình.
                          </li>
                          <li>
                            Tại mục <em>Quyền truy cập chung</em>, chọn <strong>"Bất kỳ ai có đường liên kết"</strong> với vai trò <strong>"Người xem" (Viewer)</strong>.
                          </li>
                          <li>
                            Bấm <strong>"Sao chép đường liên kết"</strong> và dán vào ô bên dưới. Hệ thống sẽ tự động nhận diện và trích xuất dữ liệu.
                          </li>
                        </ol>
                      </div>

                      {/* URL Input Form */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                              <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đường dẫn Biểu mẫu Excel / Google Sheets Online:</span>
                            </label>
                            {onlineExcelUrl && (
                              <a
                                href={onlineExcelUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
                              >
                                <span>Mở biểu mẫu trong tab mới</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          
                          <div className="relative">
                            <input
                              type="url"
                              required
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all pr-24 shadow-inner"
                              placeholder="https://docs.google.com/spreadsheets/d/1.../edit hoặc link file .xlsx trực tuyến"
                              value={onlineExcelUrl}
                              onChange={(e) => {
                                setOnlineExcelUrl(e.target.value);
                                setOnlineError(null);
                              }}
                              id="online-excel-url-input"
                            />
                            <div className="absolute right-2 top-2 flex items-center gap-1">
                              {onlineExcelUrl.includes('docs.google.com') && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                  Google Sheets
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-500 pt-0.5">
                            <span>Định dạng hỗ trợ: Google Sheets, OneDrive, Dropbox, file .xlsx hoặc .csv online.</span>
                            {onlineExcelUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOnlineExcelUrl('');
                                  setOnlinePreviewData(null);
                                  setOnlineError(null);
                                }}
                                className="text-red-600 hover:underline cursor-pointer font-semibold"
                              >
                                Xóa đường dẫn
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Sync Mode Selection */}
                        <div className="space-y-2 pt-1">
                          <label className="font-bold text-slate-700 text-xs block">
                            Chế độ đồng bộ & cập nhật dữ liệu:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {/* Merge mode */}
                            <label 
                              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                onlineExcelSyncMode === 'merge'
                                  ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500'
                                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="radio"
                                  name="syncMode"
                                  checked={onlineExcelSyncMode === 'merge'}
                                  onChange={() => setOnlineExcelSyncMode('merge')}
                                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                  <span className="font-bold text-slate-800 text-xs block">Hợp nhất thông minh</span>
                                  <span className="text-[10px] text-emerald-700 font-semibold">(Khuyến nghị sử dụng)</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                                Cập nhật các thủ tục đã có nếu trùng mã TTHC, tự động thêm mới các thủ tục chưa có.
                              </p>
                            </label>

                            {/* Add only mode */}
                            <label 
                              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                onlineExcelSyncMode === 'add_only'
                                  ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500'
                                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="radio"
                                  name="syncMode"
                                  checked={onlineExcelSyncMode === 'add_only'}
                                  onChange={() => setOnlineExcelSyncMode('add_only')}
                                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                  <span className="font-bold text-slate-800 text-xs block">Chỉ thêm mới</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                                Chỉ nạp các thủ tục mới vào hệ thống, giữ nguyên vẹn các thủ tục đã tồn tại.
                              </p>
                            </label>

                            {/* Replace all mode */}
                            <label 
                              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                onlineExcelSyncMode === 'replace_all'
                                  ? 'border-red-500 bg-red-50/50 shadow-sm ring-1 ring-red-500'
                                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="radio"
                                  name="syncMode"
                                  checked={onlineExcelSyncMode === 'replace_all'}
                                  onChange={() => setOnlineExcelSyncMode('replace_all')}
                                  className="mt-0.5 text-red-600 focus:ring-red-500"
                                />
                                <div>
                                  <span className="font-bold text-slate-800 text-xs block text-red-700">Ghi đè toàn bộ</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                                Thay thế hoàn toàn danh mục hiện tại bằng toàn bộ danh sách từ biểu mẫu online.
                              </p>
                            </label>
                          </div>
                        </div>

                        {/* Auto-Sync on load toggle */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">
                              Tự động đồng bộ ngầm khi mở trang web
                            </span>
                            <span className="text-[10.5px] text-slate-500 block">
                              Hệ thống sẽ tự động kiểm tra và lấy dữ liệu cập nhật mới nhất từ biểu mẫu online mỗi khi tải trang.
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={onlineExcelAutoSync}
                              onChange={(e) => setOnlineExcelAutoSync(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </div>

                        {/* Action buttons bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={handleSaveOnlineConfig}
                            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-bold text-xs shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Lưu cấu hình liên kết</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleTestAndPreviewOnline}
                              disabled={isFetchingOnline || !onlineExcelUrl.trim()}
                              className={`px-4.5 py-2 rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                                isFetchingOnline || !onlineExcelUrl.trim()
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              {isFetchingOnline ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  <span>Đang kết nối & tải dữ liệu...</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4" />
                                  <span>Kiểm tra & Xem trước Dữ liệu</span>
                                </>
                              )}
                            </button>

                            {onlinePreviewData && (
                              <button
                                type="button"
                                onClick={() => handleExecuteOnlineSync()}
                                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                              >
                                <CheckCheck className="w-4 h-4 text-amber-300" />
                                <span>Đồng bộ ngay ({onlinePreviewData.procedures.length} TTHC)</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Error box if any */}
                        {onlineError && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 flex items-start gap-2.5 animate-fadeIn">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <span className="font-bold block">Không thể tải dữ liệu từ biểu mẫu online:</span>
                              <p className="text-[11px] leading-relaxed">{onlineError}</p>
                              <p className="text-[10.5px] text-red-800 font-semibold mt-1">
                                Gợi ý: Hãy mở Google Sheets &gt; Bấm "Chia sẻ" &gt; Chọn quyền "Bất kỳ ai có đường liên kết đều có thể xem", sau đó bấm "Kiểm tra & Xem trước Dữ liệu" lại.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Preview Section if data loaded */}
                        {onlinePreviewData && (
                          <div className="mt-4 border border-emerald-200 rounded-xl bg-slate-50/70 p-4 space-y-3 animate-fadeIn">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                                    Kết quả nạp dữ liệu từ biểu mẫu online:
                                  </span>
                                  <span className="text-[11px] text-emerald-700 font-bold ml-2">
                                    {onlinePreviewData.totalParsed} thủ tục sẵn sàng
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Tìm trong dữ liệu vừa nạp..."
                                  value={previewFilter}
                                  onChange={(e) => setPreviewFilter(e.target.value)}
                                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 w-48"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleExecuteOnlineSync()}
                                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                  <span>Đồng bộ vào cơ sở dữ liệu</span>
                                </button>
                              </div>
                            </div>

                            {/* Summary Badges */}
                            <div className="flex flex-wrap gap-2 text-[11px]">
                              <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700 shadow-2xs">
                                📊 Tổng số TTHC: <strong className="text-emerald-700">{onlinePreviewData.totalParsed}</strong>
                              </span>
                              <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700 shadow-2xs">
                                📂 Lĩnh vực: <strong className="text-indigo-700">{onlinePreviewData.discoveredLinhVuc.length}</strong>
                              </span>
                              <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700 shadow-2xs">
                                🏛️ Sở, Ban ngành: <strong className="text-amber-700">{onlinePreviewData.discoveredSoNganh.length}</strong>
                              </span>
                              <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700 shadow-2xs">
                                ⚙️ Chế độ sẽ áp dụng: <strong className="text-red-700 uppercase">{onlineExcelSyncMode}</strong>
                              </span>
                            </div>

                            {/* Preview Table */}
                            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-inner">
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                                  <tr>
                                    <th className="py-2 px-2.5 text-center w-10">STT</th>
                                    <th className="py-2 px-3 w-28">Mã TTHC</th>
                                    <th className="py-2 px-3">Tên thủ tục hành chính</th>
                                    <th className="py-2 px-3 w-32">Lĩnh vực</th>
                                    <th className="py-2 px-3 w-28">Cấp thực hiện</th>
                                    <th className="py-2 px-3 w-24 text-center">Trạng thái</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {onlinePreviewData.procedures
                                    .filter(p => {
                                      if (!previewFilter) return true;
                                      const q = previewFilter.toLowerCase();
                                      return (
                                        p.tenTthc.toLowerCase().includes(q) ||
                                        p.maTthc.toLowerCase().includes(q) ||
                                        p.linhVuc.toLowerCase().includes(q) ||
                                        p.soNganh.toLowerCase().includes(q)
                                      );
                                    })
                                    .slice(0, 50)
                                    .map((p, idx) => {
                                      const exists = procedures.some(x => x.maTthc.toLowerCase() === p.maTthc.toLowerCase());
                                      return (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                          <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                                          <td className="py-1.5 px-3 font-mono font-bold text-red-700">{p.maTthc}</td>
                                          <td className="py-1.5 px-3 font-semibold text-slate-800">{p.tenTthc}</td>
                                          <td className="py-1.5 px-3 text-slate-600 truncate max-w-[130px]">{p.linhVuc}</td>
                                          <td className="py-1.5 px-3">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                              p.capThucHien === 'Thành phố'
                                                ? 'bg-blue-100 text-blue-800'
                                                : p.capThucHien === 'Cấp xã, Thành phố'
                                                  ? 'bg-purple-100 text-purple-800'
                                                  : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                              {p.capThucHien}
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-3 text-center">
                                            {exists ? (
                                              <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                                                Cập nhật
                                              </span>
                                            ) : (
                                              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                                                Mới
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                            {onlinePreviewData.procedures.length > 50 && (
                              <p className="text-[10px] text-slate-400 text-center italic">
                                Đang hiển thị 50 / {onlinePreviewData.procedures.length} thủ tục hành chính trong bảng xem trước.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* System visual preview simulation panel */}
                  <div className="bg-slate-900 text-slate-300 p-4 rounded-xl border border-slate-800 space-y-2 select-none shadow text-xs">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>XEM TRƯỚC SƠ BỘ GIAO DIỆN KIỂU DÁNG MỚI:</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-sans space-y-2 text-[11px]">
                      {/* Simulation header */}
                      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                        <span className="text-sm">{logoEmoji}</span>
                        <span className="bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded text-[9px] font-bold border border-amber-400/30 font-mono uppercase">{badgeLabel}</span>
                        <span className="font-extrabold text-white text-[11px] uppercase tracking-wide">{siteTitle}</span>
                        <span className="text-slate-500 font-mono text-[9px] ml-auto">{systemVersion}</span>
                      </div>
                      {/* Simulation description */}
                      <span className="text-slate-400 block italic leading-snug">{siteSubtitle}</span>

                      {/* Simulation footer */}
                      <div className="border-t border-slate-800 pt-2 text-[9.5px] text-slate-500 space-y-1">
                        <span className="block font-semibold">{footerMainText}</span>
                        <span className="block text-[8.5px] leading-relaxed italic">{footerSubText}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions bar */}
            <div className="px-6 py-4.5 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0 gap-3">
              {isAuthorized && (
                <p className="text-[10px] text-emerald-700 font-extrabold bg-emerald-100/70 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 mr-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                  Ghi dữ liệu thành công!
                </p>
              )}
              <button
                type="button"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-md transition-colors cursor-pointer"
                onClick={() => setIsOpen(false)}
              >
                Đóng Ban Quản Trị
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Local Administration Confirm Overlay */}
      {adminConfirm && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-scaleIn">
            <div className={`px-5 py-3.5 flex items-center gap-2 text-white ${
              adminConfirm.type === 'danger' 
                ? 'bg-red-700' 
                : adminConfirm.type === 'warning' 
                  ? 'bg-amber-600' 
                  : 'bg-slate-900'
            }`}>
              <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
              <h4 className="font-bold text-xs tracking-wide uppercase">{adminConfirm.title}</h4>
            </div>

            <div className="p-5 font-semibold text-slate-700 text-xs leading-relaxed">
              {adminConfirm.message}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              {adminConfirm.cancelText && (
                <button
                  type="button"
                  onClick={() => setAdminConfirm(null)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  {adminConfirm.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  adminConfirm.onConfirm();
                  setAdminConfirm(null);
                }}
                className={`px-3 py-1.5 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer shadow-sm ${
                  adminConfirm.type === 'danger'
                    ? 'bg-red-700 hover:bg-red-800'
                    : adminConfirm.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {adminConfirm.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
