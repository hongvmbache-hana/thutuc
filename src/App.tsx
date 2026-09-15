import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Procedure, SearchFilters, AppSettings } from './types';
import { INITIAL_PROCEDURES, LINH_VUC_PRESETS, SO_NGANH_PRESETS, CAP_THUC_HIEN_PRESETS, DEFAULT_APP_SETTINGS } from './mockData';
import Header from './components/Header';
import StatsDashboard from './components/StatsDashboard';
import AdvancedSearch from './components/AdvancedSearch';
import ProcedureModal from './components/ProcedureModal';
import ExportButton from './components/ExportButton';
import AdminPanel from './components/AdminPanel';
import ImportExcelModal from './components/ImportExcelModal';
import BienDongReportModal from './components/BienDongReportModal';
import OnlineSpreadsheetModal from './components/OnlineSpreadsheetModal';
import AdminLoginModal from './components/AdminLoginModal';
import NiemYetBoard from './components/NiemYetBoard';
import { getProcedureTrangThai } from './utils/bienDongHelper';
import { fetchOnlineSpreadsheet, parseSpreadsheetBuffer } from './utils/onlineExcelSync';
import { fetchServerData, syncDataToServer, resetServerData } from './services/apiSync';
import { 
  Building2, 
  MapPin, 
  FileCheck, 
  Copy, 
  Edit3, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  HelpCircle, 
  SearchX, 
  AlertCircle, 
  DatabaseBackup,
  Upload,
  FileUp,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Globe,
  RefreshCw,
  FileBarChart2,
  TrendingUp,
  FileSpreadsheet,
  LayoutGrid,
  Lock,
  LogOut,
  Sliders,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  // --- STATE ---
  const [activeMainTab, setActiveMainTab] = useState<'niemyet' | 'quanly'>(() => {
    const saved = localStorage.getItem('tthc_active_main_tab');
    return (saved === 'quanly' || saved === 'niemyet') ? saved : 'niemyet';
  });

  const handleSelectMainTab = (tab: 'niemyet' | 'quanly') => {
    setActiveMainTab(tab);
    localStorage.setItem('tthc_active_main_tab', tab);
  };

  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isSyncingOnline, setIsSyncingOnline] = useState(false);
  const [isBienDongModalOpen, setIsBienDongModalOpen] = useState(false);
  const [isOnlineSpreadsheetOpen, setIsOnlineSpreadsheetOpen] = useState(false);
  const [isServerSyncing, setIsServerSyncing] = useState(false);
  const [serverSyncStatus, setServerSyncStatus] = useState<'synced' | 'pending' | 'offline'>('pending');
  const [serverLastUpdated, setServerLastUpdated] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    linhVuc: '',
    soNganh: '',
    capThucHien: '',
    bcciTiepNhan: 'all',
    bcciTraKetQua: 'all',
    dvcttLoai: 'all',
    motCua: 'all',
    dungChung: 'all',
    trangThai: 'all'
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportExcelOpen, setIsImportExcelOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [sortBy, setSortBy] = useState<keyof Procedure>('maTthc');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  } | null>(null);

  // Admin panel authorization state (synced with localStorage) and modal open trigger
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('tthc_is_admin_logged_in') === 'true';
  });
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [loginActionContext, setLoginActionContext] = useState<string>('Thao tác Quản trị Dữ liệu');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const handleAdminLoggedInChange = (val: boolean) => {
    setIsAdminLoggedIn(val);
    localStorage.setItem('tthc_is_admin_logged_in', String(val));
    if (!val) {
      localStorage.removeItem('tthc_admin_username');
    }
  };

  const handleAdminLogout = () => {
    handleAdminLoggedInChange(false);
    showToast('Đã đăng xuất tài khoản Quản trị. Hệ thống chuyển về Chế độ Xem (Chỉ đọc).', 'info');
  };

  const checkAdminPermission = (actionName?: string, onAuthorizedCallback?: () => void): boolean => {
    if (!isAdminLoggedIn) {
      setLoginActionContext(actionName || 'Thao tác dữ liệu TTHC');
      if (onAuthorizedCallback) {
        setPendingAction(() => onAuthorizedCallback);
      } else {
        setPendingAction(null);
      }
      setIsAdminLoginModalOpen(true);
      return false;
    }
    return true;
  };

  // Load general web settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('tthc_app_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_APP_SETTINGS;
      }
    }
    return DEFAULT_APP_SETTINGS;
  });

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('tthc_app_settings', JSON.stringify(newSettings));
    setIsServerSyncing(true);
    syncDataToServer({
      procedures,
      linhVucPresets,
      soNganhPresets,
      settings: newSettings,
      updatedBy: localStorage.getItem('tthc_admin_username') || 'Admin'
    })
      .then(res => {
        if (res && res.success) {
          setServerSyncStatus('synced');
          setServerLastUpdated(res.lastUpdated || new Date().toISOString());
        }
      })
      .catch(err => {
        console.warn('Lỗi đồng bộ cấu hình lên máy chủ:', err);
        setServerSyncStatus('offline');
      })
      .finally(() => setIsServerSyncing(false));
  };

  // Presets Handlers syncing to Server
  const handleSaveLinhVucPresets = (newPresets: string[]) => {
    setLinhVucPresets(newPresets);
    localStorage.setItem('tthc_linh_vuc_presets', JSON.stringify(newPresets));
    syncDataToServer({
      procedures,
      linhVucPresets: newPresets,
      soNganhPresets,
      settings,
      updatedBy: localStorage.getItem('tthc_admin_username') || 'Admin'
    }).catch(err => console.warn('Lỗi đồng bộ lĩnh vực:', err));
  };

  const handleSaveSoNganhPresets = (newPresets: string[]) => {
    setSoNganhPresets(newPresets);
    localStorage.setItem('tthc_so_nganh_presets', JSON.stringify(newPresets));
    syncDataToServer({
      procedures,
      linhVucPresets,
      soNganhPresets: newPresets,
      settings,
      updatedBy: localStorage.getItem('tthc_admin_username') || 'Admin'
    }).catch(err => console.warn('Lỗi đồng bộ ban ngành:', err));
  };

  // Load Admin presets from LocalStorage or seed defaults
  const [linhVucPresets, setLinhVucPresets] = useState<string[]>(() => {
    const saved = localStorage.getItem('tthc_linh_vuc_presets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return LINH_VUC_PRESETS;
      }
    }
    return LINH_VUC_PRESETS;
  });

  const [soNganhPresets, setSoNganhPresets] = useState<string[]>(() => {
    const saved = localStorage.getItem('tthc_so_nganh_presets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return SO_NGANH_PRESETS;
      }
    }
    return SO_NGANH_PRESETS;
  });

  // Helper to migrate legacy 'Cấp tỉnh' and 'Cấp xã, cấp tỉnh' to 'Thành phố' and 'Cấp xã, Thành phố',
  // and sanitize any corrupted procedure names or legal basis containing URLs / QR links
  const migrateCapThucHien = (procList: Procedure[]): Procedure[] => {
    return procList.map(p => {
      let cap = p.capThucHien;
      if (cap === 'Cấp tỉnh') cap = 'Thành phố';
      else if (cap === 'Cấp xã, cấp tỉnh' || cap === 'Cấp xã, Cấp tỉnh') cap = 'Cấp xã, Thành phố';

      let tenTthc = (p.tenTthc || '').trim();
      let canCuPhapLy = (p.canCuPhapLy || '').trim();
      let ghiChu = (p.ghiChu || '').trim();

      // Nếu canCuPhapLy thực chất là link URL (chứa http, https, www, dichvucong)
      if (/https?:\/\/|www\.|dichvucong\.gov\.vn/i.test(canCuPhapLy) || canCuPhapLy.includes('://')) {
        if (!ghiChu) {
          ghiChu = canCuPhapLy;
        }
        canCuPhapLy = 'Quy định pháp luật hiện hành';
      }

      // Nếu trong tên thủ tục chứa link URL hoặc QR link
      const urlMatch = tenTthc.match(/\s*\(?(https?:\/\/[^\s\)]+|www\.[^\s\)]+|(?:https?:\/\/)?(?:www\.)?dichvucong\.gov\.vn[^\s\)]*)\)?/i);
      if (urlMatch) {
        if (!ghiChu) {
          ghiChu = urlMatch[1].trim();
        }
        tenTthc = tenTthc
          .replace(/\s*\(\s*https?:\/\/[^\)]+\)/gi, '')
          .replace(/\s*\(\s*www\.[^\)]+\)/gi, '')
          .replace(/\s*\(?(?:https?:\/\/)?(?:www\.)?dichvucong\.gov\.vn[^\s\)]*\)?/gi, '')
          .replace(/\s*https?:\/\/[^\s\)]+/gi, '')
          .replace(/\s*www\.[^\s\)]+/gi, '')
          .replace(/\s*\((?:Link|Mã QR|QR Code|QR|Đường dẫn|Nội dung QR|Nội dung|Ghi chú)[\s\:\-]+[^\)]*\)/gi, '')
          .trim();
      }

      return {
        ...p,
        capThucHien: cap,
        tenTthc,
        canCuPhapLy,
        ghiChu: ghiChu || undefined
      };
    });
  };

  // Tải dữ liệu từ máy chủ trung tâm dùng chung (đảm bảo máy tính khác hoặc người xem link luôn có dữ liệu mới nhất)
  const loadDataFromServer = async (showNotification = false) => {
    setIsServerSyncing(true);
    try {
      const serverRes = await fetchServerData();
      if (serverRes && serverRes.success && serverRes.procedures) {
        const serverProcs = migrateCapThucHien(serverRes.procedures);

        // Kiểm tra nếu máy này có dữ liệu trong LocalStorage đã lưu trước đó
        const localSaved = localStorage.getItem('tthc_procedures');
        let localProcs: Procedure[] = [];
        if (localSaved) {
          try {
            localProcs = JSON.parse(localSaved);
          } catch (e) {}
        }

        // Trường hợp đặc biệt: Máy Admin này trước đó đã nhập nhiều thủ tục trên trình duyệt,
        // trong khi máy chủ trung tâm mới khởi tạo chỉ có 11 thủ tục mặc định:
        // -> Hệ thống tự động đẩy dữ liệu của Admin lên máy chủ dùng chung để các máy khác xem được ngay.
        if (localProcs.length > serverProcs.length && serverProcs.length <= INITIAL_PROCEDURES.length) {
          console.log(`[ĐỒNG BỘ MÁY CHỦ] Tự động tải ${localProcs.length} thủ tục từ máy tính này lên máy chủ trung tâm...`);
          const pushRes = await syncDataToServer({
            procedures: localProcs,
            linhVucPresets: serverRes.linhVucPresets || linhVucPresets,
            soNganhPresets: serverRes.soNganhPresets || soNganhPresets,
            settings: serverRes.settings || settings,
            updatedBy: 'Admin (Đồng bộ khởi tạo đa máy)'
          });
          setProcedures(localProcs);
          setServerLastUpdated(pushRes.lastUpdated || new Date().toISOString());
          setServerSyncStatus('synced');
          if (showNotification) {
            showToast(`Đã đồng bộ thành công ${localProcs.length} thủ tục lên máy chủ dùng chung!`, 'success');
          }
          return;
        }

        // Trường hợp thông thường: Cập nhật dữ liệu chuẩn từ máy chủ trung tâm
        setProcedures(serverProcs);
        localStorage.setItem('tthc_procedures', JSON.stringify(serverProcs));

        if (serverRes.linhVucPresets && serverRes.linhVucPresets.length > 0) {
          setLinhVucPresets(serverRes.linhVucPresets);
          localStorage.setItem('tthc_linh_vuc_presets', JSON.stringify(serverRes.linhVucPresets));
        }

        if (serverRes.soNganhPresets && serverRes.soNganhPresets.length > 0) {
          setSoNganhPresets(serverRes.soNganhPresets);
          localStorage.setItem('tthc_so_nganh_presets', JSON.stringify(serverRes.soNganhPresets));
        }

        if (serverRes.settings) {
          setSettings(serverRes.settings);
          localStorage.setItem('tthc_app_settings', JSON.stringify(serverRes.settings));
        }

        setServerLastUpdated(serverRes.lastUpdated || new Date().toISOString());
        setServerSyncStatus('synced');

        if (showNotification) {
          showToast(`Đã tải và đồng bộ ${serverProcs.length} thủ tục từ máy chủ dùng chung!`, 'success');
        }
      } else {
        setServerSyncStatus('offline');
        if (showNotification) {
          showToast('Không thể kết nối đến máy chủ trung tâm.', 'error');
        }
      }
    } catch (err) {
      console.warn('Lỗi kết nối máy chủ:', err);
      setServerSyncStatus('offline');
    } finally {
      setIsServerSyncing(false);
    }
  };

  const serverLastUpdatedRef = useRef<string | null>(serverLastUpdated);
  useEffect(() => {
    serverLastUpdatedRef.current = serverLastUpdated;
  }, [serverLastUpdated]);

  // Nạp dữ liệu ban đầu và thiết lập lắng nghe đồng bộ
  useEffect(() => {
    // 1. Nạp tức thời từ LocalStorage để không bị trễ màn hình
    const saved = localStorage.getItem('tthc_procedures');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Procedure[];
        const filtered = migrateCapThucHien(parsed.filter(p => p.capThucHien !== 'Cấp huyện'));
        setProcedures(filtered);
      } catch (e) {
        setProcedures(migrateCapThucHien(INITIAL_PROCEDURES));
      }
    } else {
      setProcedures(migrateCapThucHien(INITIAL_PROCEDURES));
    }

    // 2. Nạp dữ liệu chính thức từ máy chủ trung tâm dùng chung
    loadDataFromServer(false);

    // 3. Tự động kiểm tra cập nhật khi người dùng chuyển lại tab (focus)
    const handleWindowFocus = () => {
      fetchServerData().then(res => {
        if (res && res.success && res.lastUpdated && res.lastUpdated !== serverLastUpdatedRef.current) {
          loadDataFromServer(false);
        }
      }).catch(() => {});
    };
    window.addEventListener('focus', handleWindowFocus);

    // 4. Định kỳ kiểm tra sau mỗi 25 giây
    const pollInterval = setInterval(() => {
      fetchServerData().then(res => {
        if (res && res.success && res.lastUpdated && res.lastUpdated !== serverLastUpdatedRef.current) {
          loadDataFromServer(false);
        }
      }).catch(() => {});
    }, 25000);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(pollInterval);
    };
  }, []);

  // Auto-sync in background from Online Excel if configured and autoSync is active
  useEffect(() => {
    if (settings.onlineExcelUrl && settings.onlineExcelAutoSync) {
      console.log("Đang tự động đồng bộ từ biểu mẫu Excel Online:", settings.onlineExcelUrl);
      fetchOnlineSpreadsheet(settings.onlineExcelUrl)
        .then(({ buffer, isCsv, sourceUrl }) => parseSpreadsheetBuffer(buffer, isCsv, sourceUrl))
        .then(result => {
          handleImportSuccess(result.procedures, settings.onlineExcelSyncMode || 'merge', true);
          if (result.discoveredLinhVuc.length > 0 || result.discoveredSoNganh.length > 0) {
            handleAddNewPresets(result.discoveredLinhVuc, result.discoveredSoNganh);
          }
          const updatedSettings: AppSettings = {
            ...settings,
            lastOnlineSyncDate: new Date().toISOString(),
            lastOnlineSyncCount: result.procedures.length
          };
          handleSaveSettings(updatedSettings);
          showToast(`Tự động cập nhật ${result.procedures.length} TTHC từ biểu mẫu Excel Online thành công!`, 'info');
        })
        .catch(err => {
          console.warn("Tự động đồng bộ từ biểu mẫu online thất bại:", err);
        });
    }
  }, [settings.onlineExcelUrl, settings.onlineExcelAutoSync]);

  // Sync to LocalStorage AND Central Shared Server whenever procedures change
  const saveProceduresToStorage = (updatedProcedures: Procedure[]) => {
    if (!isAdminLoggedIn) {
      showToast("Chỉ tài khoản Quản trị viên mới có quyền cập nhật và lưu trữ dữ liệu!", "error");
      setIsAdminLoginModalOpen(true);
      return;
    }

    setProcedures(updatedProcedures);
    localStorage.setItem('tthc_procedures', JSON.stringify(updatedProcedures));

    // Đẩy đồng bộ lên máy chủ dùng chung để máy tính khác xem được ngay
    setIsServerSyncing(true);
    syncDataToServer({
      procedures: updatedProcedures,
      linhVucPresets,
      soNganhPresets,
      settings,
      updatedBy: isAdminLoggedIn ? (localStorage.getItem('tthc_admin_username') || 'Admin') : 'Người dùng'
    })
      .then(res => {
        if (res && res.success) {
          setServerSyncStatus('synced');
          setServerLastUpdated(res.lastUpdated || new Date().toISOString());
        }
      })
      .catch(err => {
        console.warn("Lỗi lưu dữ liệu lên máy chủ trung tâm:", err);
        setServerSyncStatus('offline');
      })
      .finally(() => {
        setIsServerSyncing(false);
      });
  };

  // Đẩy thủ công dữ liệu hiện tại lên máy chủ
  const handleForcePushToServer = async () => {
    setIsServerSyncing(true);
    try {
      const res = await syncDataToServer({
        procedures,
        linhVucPresets,
        soNganhPresets,
        settings,
        updatedBy: localStorage.getItem('tthc_admin_username') || 'Admin'
      });
      if (res && res.success) {
        setServerSyncStatus('synced');
        setServerLastUpdated(res.lastUpdated || new Date().toISOString());
        showToast(`Đã đẩy toàn bộ ${procedures.length} thủ tục lên máy chủ dùng chung thành công! Mọi máy tính khác xem sẽ thấy ngay.`, 'success');
      }
    } catch (err: any) {
      showToast(`Lỗi khi đẩy lên máy chủ: ${err?.message || 'Không thể kết nối'}`, 'error');
    } finally {
      setIsServerSyncing(false);
    }
  };

  // Tải lại thủ công dữ liệu mới nhất từ máy chủ
  const handleForcePullFromServer = async () => {
    await loadDataFromServer(true);
  };

  const handleUpdateProcedureFromModal = (updatedProc: Procedure) => {
    const updated = procedures.map(p => p.id === updatedProc.id ? updatedProc : p);
    saveProceduresToStorage(updated);
    showToast(`Đã cập nhật trạng thái biến động của thủ tục: ${updatedProc.maTthc}`, 'success');
  };

  // Toast notifier helper
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // --- CRUD FUNCTIONS ---
  
  // Create or Update
  const handleSaveProcedure = (newProcedure: Procedure) => {
    if (!checkAdminPermission(
      editingProcedure ? `Cập nhật thủ tục [${newProcedure.maTthc}]` : 'Thêm mới thủ tục hành chính',
      () => handleSaveProcedure(newProcedure)
    )) return;
    let updated: Procedure[];
    
    if (editingProcedure) {
      // Update existing
      updated = procedures.map(p => p.id === newProcedure.id ? newProcedure : p);
      showToast(`Đã cập nhật thủ tục: ${newProcedure.maTthc}`, 'success');
    } else {
      // Check duplicate code
      const codeExists = procedures.some(p => p.maTthc.toLowerCase() === newProcedure.maTthc.toLowerCase());
      if (codeExists) {
        showToast(`Mã thủ tục [${newProcedure.maTthc}] đã tồn tại trong danh mục!`, 'error');
        return;
      }
      
      // New insert
      updated = [newProcedure, ...procedures];
      showToast(`Đã thêm mới thủ tục: ${newProcedure.maTthc}`, 'success');
    }

    saveProceduresToStorage(updated);
    setIsModalOpen(false);
    setEditingProcedure(null);
  };

  // Delete single procedure
  const handleDeleteProcedure = (id: string, maTthc: string) => {
    if (!checkAdminPermission(`Xóa thủ tục [${maTthc}]`, () => handleDeleteProcedure(id, maTthc))) return;
    setCustomConfirm({
      title: 'Xác nhận xóa thủ tục',
      message: `Bạn có chắc chắn muốn xóa thủ tục hành chính có mã [${maTthc}] ra khỏi hệ thống cơ sở dữ liệu không? Hành động này không thể hoàn tác!`,
      confirmText: 'Xóa thủ tục',
      cancelText: 'Hủy bỏ',
      type: 'danger',
      onConfirm: () => {
        const updated = procedures.filter(p => p.id !== id);
        saveProceduresToStorage(updated);
        if (selectedIds.has(id)) {
          const newSelected = new Set(selectedIds);
          newSelected.delete(id);
          setSelectedIds(newSelected);
        }
        showToast(`Đã xóa thành công thủ tục: ${maTthc}`, 'info');
      }
    });
  };

  // Delete multiple selected procedures
  const handleDeleteSelected = () => {
    if (!checkAdminPermission(`Xóa ${selectedIds.size} thủ tục đã chọn`, () => handleDeleteSelected())) return;
    if (selectedIds.size === 0) {
      showToast('Vui lòng chọn ít nhất một thủ tục để xóa!', 'error');
      return;
    }

    const count = selectedIds.size;
    setCustomConfirm({
      title: `Xác nhận xóa ${count} thủ tục đã chọn`,
      message: `Bạn có chắc chắn muốn xóa ${count} thủ tục hành chính đang được chọn khỏi cơ sở dữ liệu? Thao tác này sẽ loại bỏ hoàn toàn các thủ tục này và KHÔNG THỂ HOÀN TÁC!`,
      confirmText: `Xóa ${count} thủ tục`,
      cancelText: 'Hủy bỏ',
      type: 'danger',
      onConfirm: () => {
        const updated = procedures.filter(p => !selectedIds.has(p.id));
        saveProceduresToStorage(updated);
        setSelectedIds(new Set());
        showToast(`Đã xóa thành công ${count} thủ tục hành chính đã chọn!`, 'info');
      }
    });
  };

  // Delete ALL procedures in database
  const handleDeleteAllProcedures = () => {
    if (!checkAdminPermission('Xóa toàn bộ cơ sở dữ liệu TTHC', () => handleDeleteAllProcedures())) return;
    if (procedures.length === 0) {
      showToast('Cơ sở dữ liệu hiện không có thủ tục nào để xóa!', 'info');
      return;
    }

    const totalCount = procedures.length;
    setCustomConfirm({
      title: 'Cảnh báo: Xóa TOÀN BỘ thủ tục hành chính',
      message: `Bạn có chắc chắn muốn xóa TOÀN BỘ ${totalCount} thủ tục hành chính đang lưu trữ trong hệ thống? Thao tác này sẽ làm sạch hoàn toàn cơ sở dữ liệu và KHÔNG THỂ HOÀN TÁC! Khuyến nghị: Bạn nên tải file sao lưu JSON trước khi xóa.`,
      confirmText: `Xóa sạch toàn bộ (${totalCount} TTHC)`,
      cancelText: 'Hủy bỏ',
      type: 'danger',
      onConfirm: () => {
        saveProceduresToStorage([]);
        setSelectedIds(new Set());
        showToast(`Đã xóa sạch toàn bộ ${totalCount} thủ tục hành chính khỏi hệ thống!`, 'info');
      }
    });
  };

  // Clone/Copy procedure for rapid creation
  const handleCloneProcedure = (proto: Procedure) => {
    if (!checkAdminPermission(`Nhân bản thủ tục [${proto.maTthc}]`, () => handleCloneProcedure(proto))) return;
    const cloned: Procedure = {
      ...proto,
      id: `tthc-${Date.now()}`,
      maTthc: `${proto.maTthc}_SAOCHEP`,
      tenTthc: `(Bản sao) ${proto.tenTthc}`,
      ngayTao: new Date().toISOString(),
      ngayCapNhat: new Date().toISOString()
    };
    
    const updated = [cloned, ...procedures];
    saveProceduresToStorage(updated);
    showToast(`Đã nhân bản thủ tục, hãy sửa lại chi tiết mã TTHC mới!`, 'info');
    
    // Auto open editing for the newly cloned procedure
    setEditingProcedure(cloned);
    setIsModalOpen(true);
  };

  // INLINE Toggles for rapid editing ("quản lý thêm, sửa, xóa nhanh nhất")
  const toggleInlineField = (id: string, field: keyof Pick<Procedure, 'bcciTiepNhan' | 'bcciTraKetQua' | 'motCua' | 'dungChung'>) => {
    if (!checkAdminPermission('Thay đổi nhanh thiết lập TTHC', () => toggleInlineField(id, field))) return;
    const updated = procedures.map(p => {
      if (p.id === id) {
        const newVal = !p[field];
        return {
          ...p,
          [field]: newVal,
          ngayCapNhat: new Date().toISOString()
        };
      }
      return p;
    });
    saveProceduresToStorage(updated);
    showToast("Thay đổi cài đặt trực tiếp thành công", "success");
  };

  const handleInlineDvcttChange = (id: string, value: 'Toàn trình' | 'Một phần' | 'Không') => {
    if (!checkAdminPermission('Thay đổi dịch vụ công trực tuyến', () => handleInlineDvcttChange(id, value))) return;
    const updated = procedures.map(p => {
      if (p.id === id) {
        return {
          ...p,
          dvcttLoai: value,
          ngayCapNhat: new Date().toISOString()
        };
      }
      return p;
    });
    saveProceduresToStorage(updated);
    showToast("Đã cập nhật dịch vụ trực tuyến trực tiếp", "success");
  };

  // --- RECOVERY & BACKUPS ---
  
  // Reset database back to default
  const handleResetToPresets = () => {
    if (!checkAdminPermission('Khôi phục danh sách gốc ban đầu', () => handleResetToPresets())) return;
    setCustomConfirm({
      title: 'Khôi phục dữ liệu gốc',
      message: 'Hành động này sẽ khôi phục dữ liệu về danh sách 11 thủ tục mẫu ban đầu tại Nghệ An & các bộ ngành trên cả máy này và máy chủ dùng chung. Mọi sửa đổi và dữ liệu hiện tại của bạn sẽ bị ghi đè hoàn toàn! Bạn có chắc chắn muốn thực hiện?',
      confirmText: 'Khôi phục gốc',
      cancelText: 'Hủy bỏ',
      type: 'warning',
      onConfirm: async () => {
        try {
          const res = await resetServerData();
          const defaults = migrateCapThucHien(INITIAL_PROCEDURES);
          setProcedures(defaults);
          localStorage.setItem('tthc_procedures', JSON.stringify(defaults));
          setSelectedIds(new Set());
          setServerLastUpdated(res.lastUpdated || new Date().toISOString());
          setServerSyncStatus('synced');
          showToast("Đã khôi phục danh sách thủ tục mặc định trên máy chủ thành công!", "info");
        } catch (e) {
          saveProceduresToStorage(INITIAL_PROCEDURES);
          setSelectedIds(new Set());
          showToast("Khôi phục danh sách thủ tục mặc định thành công", "info");
        }
      }
    });
  };

  // Download raw database backup (JSON)
  const handleBackupDownload = () => {
    if (!checkAdminPermission('Sao lưu dữ liệu TTHC (.json)', () => handleBackupDownload())) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(procedures, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Sao_luu_TTHC_${new Date().toISOString().substring(0, 10)}.json`);
    dlAnchorElem.click();
    showToast("Đã xuất gói sao lưu dữ liệu JSON thành công", "success");
  };

  // Upload JSON backup file
  const handleBackupUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!checkAdminPermission('Nạp dữ liệu sao lưu JSON')) {
      event.target.value = ''; // clear input
      return;
    }
    const fileReader = new FileReader();
    if (!event.target.files || event.target.files.length === 0) return;
    
    fileReader.readAsText(event.target.files[0], "UTF-8");
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && 'maTthc' in parsed[0]) {
          saveProceduresToStorage(parsed);
          setSelectedIds(new Set());
          showToast(`Phục hồi thành công ${parsed.length} tài liệu thủ tục!`, "success");
        } else {
          showToast("Định dạng file backup JSON không đúng chuẩn hệ thống TTHC!", "error");
        }
      } catch (err) {
        showToast("Lỗi đọc file dữ liệu. File JSON bị hỏng!", "error");
      }
    };
    event.target.value = ''; // clear input
  };

  // --- EXCEL IMPORT HANDLERS ---
  const handleImportSuccess = (
    imported: Procedure[], 
    mode: 'merge' | 'add_only' | 'replace_all',
    bypassAuthCheck: boolean = false
  ) => {
    if (!bypassAuthCheck && !checkAdminPermission('Nhập dữ liệu TTHC từ file Excel', () => handleImportSuccess(imported, mode, true))) return;

    let updatedList: Procedure[] = [];

    if (mode === 'replace_all') {
      updatedList = imported;
      setSelectedIds(new Set());
      showToast(`Đã ghi đè toàn bộ danh sách bằng ${imported.length} thủ tục từ file Excel!`, 'success');
    } else if (mode === 'add_only') {
      const existingCodeSet = new Set(procedures.map(p => p.maTthc.toLowerCase().trim()));
      const newItems = imported.filter(p => !existingCodeSet.has(p.maTthc.toLowerCase().trim()));
      updatedList = [...newItems, ...procedures];
      showToast(`Đã thêm mới ${newItems.length} thủ tục (${imported.length - newItems.length} thủ tục trùng mã bị bỏ qua)!`, 'success');
    } else {
      // Merge mode: update existing if matching maTthc, add new otherwise
      const importedCodeMap = new Map<string, Procedure>();
      imported.forEach(p => {
        importedCodeMap.set(p.maTthc.toLowerCase().trim(), p);
      });

      let updatedCount = 0;
      const mergedList = procedures.map(p => {
        const matching = importedCodeMap.get(p.maTthc.toLowerCase().trim());
        if (matching) {
          updatedCount++;
          importedCodeMap.delete(p.maTthc.toLowerCase().trim());
          return {
            ...matching,
            id: p.id,
            ngayCapNhat: new Date().toISOString()
          };
        }
        return p;
      });

      const newAdditions = Array.from(importedCodeMap.values());
      updatedList = [...newAdditions, ...mergedList];
      showToast(`Đã đồng bộ: Cập nhật ${updatedCount} thủ tục, thêm mới ${newAdditions.length} thủ tục!`, 'success');
    }

    saveProceduresToStorage(updatedList);
  };

  // Quick sync directly from configured online Excel URL
  const handleQuickSyncOnlineExcel = async () => {
    if (!settings.onlineExcelUrl) {
      showToast('Chưa cấu hình đường dẫn biểu mẫu Excel Online trong Ban Quản Trị.', 'error');
      setIsAdminPanelOpen(true);
      return;
    }

    if (!isAdminLoggedIn) {
      showToast('Vui lòng đăng nhập tài khoản quản trị (Admin) để có quyền đồng bộ thủ tục!', 'error');
      setIsAdminPanelOpen(true);
      return;
    }

    setIsSyncingOnline(true);
    showToast('Đang kết nối & tải dữ liệu từ biểu mẫu online...', 'info');

    try {
      const { buffer, isCsv, sourceUrl } = await fetchOnlineSpreadsheet(settings.onlineExcelUrl);
      const result = await parseSpreadsheetBuffer(buffer, isCsv, sourceUrl);

      handleImportSuccess(result.procedures, settings.onlineExcelSyncMode || 'merge', true);

      if (result.discoveredLinhVuc.length > 0 || result.discoveredSoNganh.length > 0) {
        handleAddNewPresets(result.discoveredLinhVuc, result.discoveredSoNganh);
      }

      const updatedSettings: AppSettings = {
        ...settings,
        lastOnlineSyncDate: new Date().toISOString(),
        lastOnlineSyncCount: result.procedures.length
      };
      handleSaveSettings(updatedSettings);

      showToast(`Đã đồng bộ thành công ${result.procedures.length} thủ tục từ biểu mẫu Excel Online!`, 'success');
    } catch (err: any) {
      console.error("Lỗi đồng bộ online:", err);
      showToast(err.message || 'Lỗi kết nối hoặc đọc dữ liệu từ biểu mẫu online.', 'error');
    } finally {
      setIsSyncingOnline(false);
    }
  };

  const handleAddNewPresets = (newLinhVucList: string[], newSoNganhList: string[]) => {
    let updatedLv = [...linhVucPresets];
    let hasNewLv = false;
    newLinhVucList.forEach(lv => {
      if (lv && !updatedLv.includes(lv)) {
        updatedLv.push(lv);
        hasNewLv = true;
      }
    });
    if (hasNewLv) {
      setLinhVucPresets(updatedLv);
      localStorage.setItem('tthc_linh_vuc_presets', JSON.stringify(updatedLv));
    }

    let updatedSn = [...soNganhPresets];
    let hasNewSn = false;
    newSoNganhList.forEach(sn => {
      if (sn && !updatedSn.includes(sn)) {
        updatedSn.push(sn);
        hasNewSn = true;
      }
    });
    if (hasNewSn) {
      setSoNganhPresets(updatedSn);
      localStorage.setItem('tthc_so_nganh_presets', JSON.stringify(updatedSn));
    }
  };

  // --- FILTER & SORT ACTIONS ---
  
  // Dynamic categories calculation based on updated procedures list combined with custom admin settings
  const availableLinhVucPreset = Array.from(new Set([...linhVucPresets, ...procedures.map(p => p.linhVuc)])).filter(Boolean) as string[];
  const availableSoNganhPreset = Array.from(new Set([...soNganhPresets, ...procedures.map(p => p.soNganh)])).filter(Boolean) as string[];
  const availableCapThucHienPreset = Array.from(new Set([...CAP_THUC_HIEN_PRESETS, ...procedures.map(p => p.capThucHien)])).filter(Boolean) as string[];

  const filteredProcedures = procedures.filter(p => {
    // 1. Keyword search (Mã, Tên, Căn cứ pháp lý, Ghi chú)
    if (filters.keyword.trim() !== '') {
      const kw = filters.keyword.toLowerCase().trim();
      const codeMatch = p.maTthc.toLowerCase().includes(kw);
      const nameMatch = p.tenTthc.toLowerCase().includes(kw);
      const sourceMatch = p.canCuPhapLy.toLowerCase().includes(kw);
      const noteMatch = p.ghiChu?.toLowerCase().includes(kw);
      if (!codeMatch && !nameMatch && !sourceMatch && !noteMatch) return false;
    }

    // 2. Lĩnh vực dropdown
    if (filters.linhVuc && p.linhVuc !== filters.linhVuc) return false;
    
    // 3. Sở ngành dropdown
    if (filters.soNganh && p.soNganh !== filters.soNganh) return false;
    
    // 4. Cấp thực hiện dropdown (Tự động cập nhật: khi chọn 'Cấp xã' hoặc 'Thành phố', thủ tục 'Cấp xã, Thành phố' cũng sẽ hiển thị)
    if (filters.capThucHien) {
      const selectedCap = filters.capThucHien.trim();
      if (selectedCap === 'Cấp xã') {
        const isMatch = p.capThucHien === 'Cấp xã' || 
                        p.capThucHien === 'Cấp xã, Thành phố' || 
                        p.capThucHien === 'Cấp xã, cấp tỉnh' || 
                        p.capThucHien === 'Cấp xã, Cấp tỉnh' ||
                        p.capThucHien.toLowerCase().includes('xã');
        if (!isMatch) return false;
      } else if (selectedCap === 'Thành phố' || selectedCap === 'Cấp tỉnh') {
        const isMatch = p.capThucHien === 'Thành phố' || 
                        p.capThucHien === 'Cấp tỉnh' || 
                        p.capThucHien === 'Cấp xã, Thành phố' || 
                        p.capThucHien === 'Cấp xã, cấp tỉnh' || 
                        p.capThucHien === 'Cấp xã, Cấp tỉnh' ||
                        p.capThucHien.toLowerCase().includes('thành phố') ||
                        p.capThucHien.toLowerCase().includes('tỉnh');
        if (!isMatch) return false;
      } else if (selectedCap === 'Cấp xã, Thành phố' || selectedCap === 'Cấp xã, cấp tỉnh') {
        const isMatch = p.capThucHien === 'Cấp xã, Thành phố' || 
                        p.capThucHien === 'Cấp xã, cấp tỉnh' || 
                        p.capThucHien === 'Cấp xã, Cấp tỉnh' || 
                        (p.capThucHien.toLowerCase().includes('xã') && (p.capThucHien.toLowerCase().includes('thành phố') || p.capThucHien.toLowerCase().includes('tỉnh')));
        if (!isMatch) return false;
      } else if (p.capThucHien !== selectedCap) {
        return false;
      }
    }

    // 5. BCCI Tiếp nhận flag
    if (filters.bcciTiepNhan === 'yes' && !p.bcciTiepNhan) return false;
    if (filters.bcciTiepNhan === 'no' && p.bcciTiepNhan) return false;

    // 6. BCCI Trả kết quả flag
    if (filters.bcciTraKetQua === 'yes' && !p.bcciTraKetQua) return false;
    if (filters.bcciTraKetQua === 'no' && p.bcciTraKetQua) return false;

    // 7. DVCTT types
    if (filters.dvcttLoai !== 'all' && p.dvcttLoai !== filters.dvcttLoai) return false;

    // 8. Bộ phận một cửa
    if (filters.motCua === 'yes' && !p.motCua) return false;
    if (filters.motCua === 'no' && p.motCua) return false;

    // 9. Dùng chung
    if (filters.dungChung === 'yes' && !p.dungChung) return false;
    if (filters.dungChung === 'no' && p.dungChung) return false;

    // 10. Trạng thái biến động TTHC (Sửa đổi bổ sung, Bãi bỏ, Ban hành mới, Hiện hành)
    if (filters.trangThai && filters.trangThai !== 'all') {
      const pStatus = getProcedureTrangThai(p);
      if (pStatus !== filters.trangThai) return false;
    }

    return true;
  });

  // Sorting
  const sortProcedures = (field: keyof Procedure) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const sortedProcedures = [...filteredProcedures].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    // Boolean string handling for alignment
    if (typeof valA === 'boolean') valA = valA ? 1 : 0;
    if (typeof valB === 'boolean') valB = valB ? 1 : 0;

    if (valA === undefined) return 1;
    if (valB === undefined) return -1;

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getSortIcon = (field: keyof Procedure) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 ml-1 text-red-700 animate-bounce" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 ml-1 text-red-700 animate-bounce" />
    );
  };

  // Selection statuses against current filtered list
  const isAllFilteredSelected = 
    filteredProcedures.length > 0 && 
    filteredProcedures.every(p => selectedIds.has(p.id));

  const isSomeFilteredSelected = 
    filteredProcedures.some(p => selectedIds.has(p.id)) && 
    !isAllFilteredSelected;

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Unselect all filtered items
      const newSelected = new Set(selectedIds);
      filteredProcedures.forEach(p => newSelected.delete(p.id));
      setSelectedIds(newSelected);
    } else {
      // Select all filtered items
      const newSelected = new Set(selectedIds);
      filteredProcedures.forEach(p => newSelected.add(p.id));
      setSelectedIds(newSelected);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      
      {/* 0. Top Navigation Tab Switcher */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2 select-none shrink-0 print:hidden z-30">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => handleSelectMainTab('niemyet')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeMainTab === 'niemyet'
                  ? 'bg-[#c51f24] text-white shadow-sm ring-1 ring-white/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              id="tab-nav-niemyet"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-300" />
              <span>BẢNG NIÊM YẾT TTHC (KIOSK)</span>
            </button>

            <button
              onClick={() => handleSelectMainTab('quanly')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeMainTab === 'quanly'
                  ? 'bg-[#c51f24] text-white shadow-sm ring-1 ring-white/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              id="tab-nav-quanly"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>QUẢN TRỊ & TRA CỨU DỮ LIỆU</span>
              <span className="bg-amber-400 text-red-950 px-1.5 py-0.2 rounded font-mono text-[10px] font-black">
                {procedures.length} TTHC
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                if (!checkAdminPermission('Mở và điều chỉnh Biểu mẫu Online 2 chiều', () => setIsOnlineSpreadsheetOpen(true))) return;
                setIsOnlineSpreadsheetOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/90 hover:bg-emerald-600 text-emerald-100 rounded-lg text-xs font-semibold cursor-pointer border border-emerald-600 transition-colors"
              title="Mở biểu mẫu đồng bộ 2 chiều với Google Sheets / Excel Online (Yêu cầu quyền Quản trị viên)"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-300" />
              <span>Biểu mẫu Online</span>
            </button>

            {isAdminLoggedIn ? (
              <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-lg border border-slate-700">
                <div 
                  className="flex items-center gap-1.5 px-2 py-0.5 text-emerald-400 font-bold text-xs" 
                  title="Đã đăng nhập Quản trị viên - Toàn quyền Thêm, Sửa, Xóa"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="hidden md:inline font-mono">{localStorage.getItem('tthc_admin_username') || 'Admin'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminPanelOpen(true)}
                  className="p-1 text-slate-300 hover:text-amber-300 hover:bg-slate-700/60 rounded cursor-pointer transition-colors"
                  title="Cài đặt hệ thống"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="p-1 text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 rounded cursor-pointer transition-colors"
                  title="Đăng xuất quyền quản trị"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLoginActionContext('Đăng nhập Quản trị viên để Thêm, Sửa, Xóa TTHC');
                  setIsAdminLoginModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm cursor-pointer active:scale-95"
                id="top-nav-admin-login-btn"
                title="Đăng nhập để có quyền Thêm, Sửa, Xóa dữ liệu"
              >
                <Lock className="w-3.5 h-3.5 text-slate-950" />
                <span>Đăng nhập Quản trị</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast Alert popup (Available across all tabs) */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-white font-semibold text-xs border animate-slideIn ${
          toast.type === 'success' 
            ? 'bg-emerald-600 border-emerald-500' 
            : toast.type === 'error' 
              ? 'bg-red-700 border-red-600 animate-shake' 
              : 'bg-slate-800 border-slate-700'
        }`} id="global-alert-toast">
          <span className="bg-white/20 p-1 rounded-md">
            <Check className="w-4 h-4" />
          </span>
          <span>{toast.message}</span>
          <button 
            onClick={() => setToast(null)}
            className="ml-3 hover:text-slate-200 text-[10px] uppercase font-bold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Tab Render */}
      {activeMainTab === 'niemyet' ? (
        /* Tab 1: Kiosk Administrative Procedure Listing */
        <NiemYetBoard
          procedures={procedures}
          settings={settings}
          onViewProcedureDetail={(procedure) => {
            setEditingProcedure(procedure);
            setIsModalOpen(true);
          }}
          onOpenManagementTab={() => handleSelectMainTab('quanly')}
        />
      ) : (
        /* Tab 2: Full Data Management Dashboard */
        <>
          {/* 1. Portal Header */}
          <Header 
            totalCount={procedures.length} 
            settings={settings} 
            isServerSyncing={isServerSyncing}
            serverStatus={serverSyncStatus}
            onRefreshServer={() => loadDataFromServer(true)}
            lastSyncTime={serverLastUpdated}
          />

          {/* 2. Main Dashboard Container */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">

        {/* Dynamic Bento KPI stats layout */}
        <StatsDashboard 
          procedures={procedures} 
          onOpenReportModal={() => setIsBienDongModalOpen(true)}
        />

        {/* Advanced search control bar */}
        <AdvancedSearch 
          filters={filters} 
          onFilterChange={setFilters}
          linhVucPresets={availableLinhVucPreset}
          soNganhPresets={availableSoNganhPreset}
          capThucHienPresets={availableCapThucHienPreset}
        />

        {/* 3. Action Rows and Printable table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Table action title bar */}
          <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">
                  DANH SÁCH THỦ TỤC HÀNH CHÍNH CHI TIẾT
                </h3>
                <span className="bg-red-100 text-red-900 border border-red-200 font-bold px-2 py-0.5 rounded-full text-[10px] font-mono">
                  Đã lọc: {filteredProcedures.length} / {procedures.length}
                </span>

                {isAdminLoggedIn ? (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    🔓 Chế độ Quản trị (Admin)
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 animate-pulse">
                    🔒 Chế độ Xem (Chỉ đọc)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Nhấp chuột vào bất cứ biểu tượng dấu <span className="font-semibold text-slate-700">✓ / ✗</span> trong bảng để chuyển đổi cấu hình nhanh. {!isAdminLoggedIn && <span className="text-red-700 font-bold">(Cần đăng nhập quản trị viên để thay đổi)</span>}
              </p>
            </div>

            {/* General action buttons: Adding, backups and exports */}
            <div className="flex flex-wrap items-center gap-2 sm:self-center">
              
              {/* Reset Default */}
              <button
                type="button"
                onClick={() => {
                  if (!checkAdminPermission('Khôi phục danh sách thủ tục mặc định ban đầu', () => handleResetToPresets())) return;
                  handleResetToPresets();
                }}
                className="flex items-center gap-1 px-2.5 py-2 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 bg-white transition-colors cursor-pointer"
                title="Khôi phục 11 thủ tục gốc đề xuất ban đầu (Yêu cầu quyền Quản trị viên)"
                id="reset-to-origin-records"
              >
                Mặc định
              </button>

              {/* Data Import / Backup Controls */}
              <div className="relative group/backup">
                <button
                  type="button"
                  onClick={() => {
                    if (!checkAdminPermission('Sao lưu dữ liệu TTHC (.json)', () => handleBackupDownload())) return;
                    handleBackupDownload();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-slate-200 text-indigo-700 rounded-lg text-xs font-semibold border border-slate-200 bg-white transition-colors cursor-pointer"
                  title="Tải tệp JSON lưu trữ ngoại tuyến dữ liệu của bạn (Yêu cầu quyền Quản trị viên)"
                >
                  <DatabaseBackup className="w-4 h-4" />
                  <span className="hidden md:inline">Sao lưu</span>
                </button>
              </div>

              {/* Loader backup input */}
              <button
                type="button"
                onClick={() => {
                  if (!checkAdminPermission('Nạp dữ liệu sao lưu TTHC (.json)', () => {
                    document.getElementById('restore-file-input')?.click();
                  })) return;
                  document.getElementById('restore-file-input')?.click();
                }}
                className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-indigo-50 border border-indigo-200 bg-indigo-50/20 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                title="Chọn tệp JSON đã lưu để nạp ngược lại vào hệ thống (Yêu cầu quyền Quản trị viên)"
                id="restore-file-btn"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden md:inline">Nạp dữ liệu</span>
              </button>
              <input
                type="file"
                id="restore-file-input"
                accept=".json"
                className="hidden"
                onChange={handleBackupUpload}
              />

              {/* Export Button Wrapper */}
              <ExportButton procedures={sortedProcedures} settings={settings} />

              {/* Online Spreadsheet Modal Trigger - Direct 2-Way Sync */}
              <button
                type="button"
                onClick={() => {
                  if (!checkAdminPermission('Mở và điều chỉnh Biểu mẫu Online 2 chiều', () => setIsOnlineSpreadsheetOpen(true))) return;
                  setIsOnlineSpreadsheetOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95 border border-emerald-500"
                id="online-spreadsheet-modal-trigger"
                title="Mở biểu mẫu trực tuyến 2 chiều để sửa đổi, thêm, xóa trực tiếp (Yêu cầu quyền Quản trị viên)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Biểu Mẫu Online (Sửa 2 chiều)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
              </button>

              {/* Import from Excel Button */}
              <button
                type="button"
                onClick={() => {
                  if (!checkAdminPermission('Nhập dữ liệu TTHC từ file Excel', () => setIsImportExcelOpen(true))) return;
                  setIsImportExcelOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                id="import-excel-modal-trigger"
                title="Nhập dữ liệu thủ tục hàng loạt từ file Excel chuẩn kèm mã QR"
              >
                <FileUp className="w-4 h-4 text-emerald-700" />
                <span>Nhập Excel</span>
              </button>

              {/* Quick Online Excel Sync button if URL configured */}
              {settings.onlineExcelUrl && (
                <button
                  type="button"
                  onClick={handleQuickSyncOnlineExcel}
                  disabled={isSyncingOnline}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                  title="Đồng bộ tức thì từ biểu mẫu Excel Online đã cấu hình"
                  id="quick-sync-online-excel-btn"
                >
                  {isSyncingOnline ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-700" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-teal-700" />
                  )}
                  <span>Đồng bộ Online</span>
                </button>
              )}

              {/* Delete Selected Button (visible when procedures are selected) */}
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 animate-fadeIn"
                  title={`Xóa ${selectedIds.size} thủ tục hành chính đã chọn`}
                  id="toolbar-delete-selected"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa đã chọn ({selectedIds.size})</span>
                </button>
              )}

              {/* Delete All Procedures Button */}
              <button
                type="button"
                onClick={handleDeleteAllProcedures}
                disabled={procedures.length === 0}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  procedures.length === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300'
                }`}
                title="Xóa toàn bộ thủ tục hành chính khỏi cơ sở dữ liệu"
                id="delete-all-procedures-btn"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span className="hidden lg:inline">Xóa toàn bộ</span>
              </button>

              {/* Security Admin Panel button */}
              <AdminPanel
                settings={settings}
                onSaveSettings={handleSaveSettings}
                linhVucPresets={linhVucPresets}
                setLinhVucPresets={setLinhVucPresets}
                soNganhPresets={soNganhPresets}
                setSoNganhPresets={setSoNganhPresets}
                onSaveLinhVucPresets={handleSaveLinhVucPresets}
                onSaveSoNganhPresets={handleSaveSoNganhPresets}
                onShowToast={showToast}
                isAuthorized={isAdminLoggedIn}
                setIsAuthorized={handleAdminLoggedInChange}
                isOpen={isAdminPanelOpen}
                setIsOpen={setIsAdminPanelOpen}
                procedures={procedures}
                onImportSuccess={(imported, mode) => handleImportSuccess(imported, mode, true)}
                onAddNewPresets={handleAddNewPresets}
                onDeleteAllProcedures={handleDeleteAllProcedures}
                onResetToPresets={handleResetToPresets}
                onBackupDownload={handleBackupDownload}
                onPushToServer={handleForcePushToServer}
                onPullFromServer={handleForcePullFromServer}
                serverLastUpdated={serverLastUpdated}
                isServerSyncing={isServerSyncing}
                onOpenOnlineSpreadsheet={() => {
                  if (!checkAdminPermission('Mở và điều chỉnh Biểu mẫu Online 2 chiều', () => setIsOnlineSpreadsheetOpen(true))) return;
                  setIsOnlineSpreadsheetOpen(true);
                }}
              />

              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

              {/* Báo cáo Biến động TTHC (Sửa đổi, bổ sung, bãi bỏ theo Tháng, Quý) */}
              <button
                type="button"
                onClick={() => setIsBienDongModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                title="Tổng hợp báo cáo danh mục TTHC Sửa đổi, Bổ sung, Bãi bỏ theo Tháng, Quý phục vụ kiểm soát TTHC"
                id="open-bien-dong-report-btn"
              >
                <FileBarChart2 className="w-4 h-4 text-amber-700" />
                <span className="hidden sm:inline">Báo cáo Sửa đổi / Bãi bỏ</span>
              </button>

              {/* Create Button */}
              <button
                type="button"
                onClick={() => {
                  if (!checkAdminPermission('Thêm thủ tục hành chính mới', () => {
                    setEditingProcedure(null);
                    setIsModalOpen(true);
                  })) return;
                  setEditingProcedure(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer hover:shadow-lg active:scale-95"
                id="add-new-procedure"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm thủ tục</span>
              </button>

            </div>
          </div>

          {/* Batch Selection Action Bar */}
          {selectedIds.size > 0 && (
            <div className="bg-red-50/90 border-b border-red-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 animate-fadeIn text-xs">
              <div className="flex items-center gap-2.5">
                <div className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] font-mono shadow-xs">
                  {selectedIds.size}
                </div>
                <span className="font-bold text-red-950">
                  Đang chọn <span className="font-mono text-red-700">{selectedIds.size}</span> / {procedures.length} thủ tục hành chính
                </span>
                {filteredProcedures.length < procedures.length && (
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    (trong {filteredProcedures.length} thủ tục đang hiển thị)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allSet = new Set(procedures.map(p => p.id));
                    setSelectedIds(allSet);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  Chọn tất cả CSDL ({procedures.length})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  Bỏ chọn
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-md font-bold text-[11px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  id="bulk-delete-selected-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa {selectedIds.size} thủ tục đã chọn</span>
                </button>
              </div>
            </div>
          )}

          {/* Table Container responsive */}
          <div className="overflow-x-auto w-full">
            
            {procedures.length === 0 ? (
              
              /* Completely Empty Database Feedback */
              <div className="py-16 px-4 text-center max-w-lg mx-auto space-y-4 animate-fadeIn">
                <div className="bg-red-50 text-red-700 mx-auto w-16 h-16 rounded-full flex items-center justify-center border border-red-100 shadow-inner">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800 uppercase tracking-wide">Cơ sở dữ liệu TTHC đang trống</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Hiện chưa có thủ tục hành chính nào được lưu trong hệ thống. Bạn có thể khôi phục 11 thủ tục mẫu ban đầu tại Nghệ An & các bộ ngành, nhập dữ liệu từ file Excel, hoặc thêm mới thủ tục.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleResetToPresets}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Khôi phục dữ liệu gốc (11 TTHC)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!checkAdminPermission()) return;
                      setIsImportExcelOpen(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Nhập từ file Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!checkAdminPermission()) return;
                      setEditingProcedure(null);
                      setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm thủ tục mới</span>
                  </button>
                </div>
              </div>

            ) : sortedProcedures.length === 0 ? (
              
              /* Zero Results feedback */
              <div className="py-16 px-4 text-center max-w-md mx-auto space-y-3">
                <div className="bg-red-50 text-red-700 mx-auto w-14 h-14 rounded-full flex items-center justify-center border border-red-100">
                  <SearchX className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 uppercase">Không tìm thấy thủ tục nào phù hợp</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hệ thống không tìm thấy kết quả khớp với nội dung tìm kiếm hoặc các tiêu chí bộ lọc của bạn. Hãy thử thay đổi, nới rộng điều kiện tìm kiếm hoặc đặt lại bộ lọc.
                </p>
                <button
                  type="button"
                  onClick={() => setFilters({
                    keyword: '',
                    linhVuc: '',
                    soNganh: '',
                    capThucHien: '',
                    bcciTiepNhan: 'all',
                    bcciTraKetQua: 'all',
                    dvcttLoai: 'all',
                    motCua: 'all',
                    dungChung: 'all'
                  })}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>

            ) : (

              /* Native styled data list match standard layouts */
              <table className="w-full text-left border-collapse" id="procedures-data-table">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-500 uppercase select-none">
                    {/* Bulk Selection Checkbox Header */}
                    <th className="py-3 px-3 text-center w-[3%] select-none">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          id="select-all-procedures-checkbox"
                          checked={isAllFilteredSelected}
                          ref={(input) => {
                            if (input) {
                              input.indeterminate = isSomeFilteredSelected;
                            }
                          }}
                          onChange={handleSelectAllFiltered}
                          className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                          title={isAllFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả thủ tục đang hiển thị"}
                        />
                      </div>
                    </th>

                    <th className="py-3 px-3 text-center style-th w-[4%]">STT</th>
                    
                    <th 
                      onClick={() => sortProcedures('maTthc')}
                      className="py-3 px-3 text-center cursor-pointer hover:bg-slate-200 transition-colors w-[11%]"
                    >
                      <div className="flex items-center justify-center">
                        Mã TTHC {getSortIcon('maTthc')}
                      </div>
                    </th>

                    <th 
                      onClick={() => sortProcedures('tenTthc')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-200 transition-colors w-[32%]"
                    >
                      <div className="flex items-center">
                        Tên thủ tục hành chính {getSortIcon('tenTthc')}
                      </div>
                    </th>

                    <th 
                      onClick={() => sortProcedures('linhVuc')}
                      className="py-3 px-3 cursor-pointer hover:bg-slate-200 transition-colors w-[15%]"
                    >
                      <div className="flex items-center">
                        Lĩnh vực / Bộ, ngành {getSortIcon('linhVuc')}
                      </div>
                    </th>

                    <th 
                      onClick={() => sortProcedures('capThucHien')}
                      className="py-3 px-2 text-center cursor-pointer hover:bg-slate-200 transition-colors w-[10%]"
                    >
                      <div className="flex items-center justify-center">
                        Thẩm quyền {getSortIcon('capThucHien')}
                      </div>
                    </th>

                    <th className="py-3 px-2 text-center w-[8%]">BCCI T.Nhận / Trả</th>
                    
                    <th 
                      onClick={() => sortProcedures('dvcttLoai')}
                      className="py-3 px-2 text-center cursor-pointer hover:bg-slate-200 transition-colors w-[10%]"
                    >
                      <div className="flex items-center justify-center">
                        Một Cửa / DVCTT {getSortIcon('dvcttLoai')}
                      </div>
                    </th>

                    <th className="py-3 px-3 text-center w-[10%]">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {sortedProcedures.map((p, index) => {
                    
                    // Style badges according to levels
                    const isCapXa = p.capThucHien === 'Cấp xã';
                    const isCapHuyen = p.capThucHien === 'Cấp huyện';
                    const isThanhPho = p.capThucHien === 'Thành phố' || p.capThucHien === 'Cấp tỉnh';
                    const isCapXaThanhPho = p.capThucHien === 'Cấp xã, Thành phố' || p.capThucHien === 'Cấp xã, cấp tỉnh' || p.capThucHien === 'Cấp xã, Cấp tỉnh' || (p.capThucHien.toLowerCase().includes('xã') && (p.capThucHien.toLowerCase().includes('thành phố') || p.capThucHien.toLowerCase().includes('tỉnh')));
                    const isLienThong = p.capThucHien === 'TTHC liên thông';

                    return (
                      <tr 
                        key={p.id} 
                        className={`transition-all group ${
                          selectedIds.has(p.id) 
                            ? 'bg-red-50/80 hover:bg-red-50/95' 
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* 0. Row Selection Checkbox */}
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(p.id)}
                              onChange={() => handleToggleSelectOne(p.id)}
                              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                              title={`Chọn thủ tục ${p.maTthc}`}
                            />
                          </div>
                        </td>
                        
                        {/* 1. STT */}
                        <td className="py-3 px-3 text-center text-slate-400 font-semibold font-mono">
                          {index + 1}
                        </td>

                        {/* 2. Mã TTHC */}
                        <td className="py-3 px-3 text-center font-bold font-mono tracking-wide text-red-950 bg-red-50/30 group-hover:bg-red-50/65 transition-colors">
                          {p.maTthc}
                        </td>

                        {/* 3. Tên Thủ tục */}
                        <td className="py-3 px-4 text-slate-800 font-semibold max-w-sm">
                          {(() => {
                            const pStatus = getProcedureTrangThai(p);
                            if (pStatus === 'Sửa đổi, bổ sung') {
                              return (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 mb-1">
                                  ⚡ Sửa đổi, bổ sung
                                </span>
                              );
                            }
                            if (pStatus === 'Bãi bỏ') {
                              return (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 mb-1">
                                  ⛔ Bãi bỏ
                                </span>
                              );
                            }
                            if (pStatus === 'Ban hành mới') {
                              return (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 mb-1">
                                  ✨ Ban hành mới
                                </span>
                              );
                            }
                            return null;
                          })()}
                          <div className="line-clamp-3 leading-relaxed hover:line-clamp-none transition-all duration-300">
                            {p.tenTthc}
                          </div>
                          {p.canCuPhapLy && (
                            <div className="text-[10px] text-slate-400 mt-1.5 flex items-start gap-1 font-normal line-clamp-1 group-hover:line-clamp-none">
                              <span className="font-bold text-amber-700 block whitespace-nowrap shrink-0">Căn cứ:</span>
                              <span className="italic">{p.canCuPhapLy}</span>
                            </div>
                          )}
                          {p.ghiChu && (
                            <div className="text-[10px] text-emerald-800 mt-1 font-normal flex items-start gap-1 bg-emerald-50/80 px-1.5 py-0.5 rounded border border-emerald-200/60 line-clamp-1 group-hover:line-clamp-none">
                              <span className="font-bold text-emerald-900 block whitespace-nowrap shrink-0">Nội dung QR:</span>
                              <span className="text-emerald-700">{p.ghiChu}</span>
                            </div>
                          )}
                        </td>

                        {/* 4. Lĩnh vực / Sở ngành */}
                        <td className="py-3 px-3 whitespace-normal">
                          <span className="text-slate-800 font-bold block">{p.linhVuc}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">{p.soNganh}</span>
                        </td>

                        {/* 5. Cấp thực hiện badge */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-[10.5px] font-bold block text-center ${
                            isCapXaThanhPho
                              ? 'bg-teal-100 text-teal-900 border border-teal-300'
                              : isCapXa 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : isCapHuyen 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : isThanhPho 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-purple-100 text-purple-800'
                          }`}>
                            {p.capThucHien}
                          </span>
                          
                          {/* Common Use indicator toggle slider */}
                          <button
                            type="button"
                            onClick={() => toggleInlineField(p.id, 'dungChung')}
                            className={`mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold inline-block cursor-pointer transition-colors ${
                              p.dungChung 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                            title="Xác thực dùng chung toàn thẩm quyền. Nhấn để đảo chiều."
                          >
                            {p.dungChung ? 'Dùng chung ✓' : 'Bản quyền riêng ✗'}
                          </button>
                        </td>

                        {/* 6. BCCI (Tiếp nhận & Trả kết quả) */}
                        <td className="py-3 px-2 text-center whitespace-nowrap space-y-1">
                          
                          {/* BCCI Tiếp nhận */}
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[10px] text-slate-400 text-right w-11 font-mono">T.nhận:</span>
                            <button
                              type="button"
                              onClick={() => toggleInlineField(p.id, 'bcciTiepNhan')}
                              className={`p-1 rounded-full transition-colors cursor-pointer ${
                                p.bcciTiepNhan 
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                                  : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                              }`}
                              title="Tiếp nhận hồ sơ BCCI"
                            >
                              {p.bcciTiepNhan ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          </div>

                          {/* BCCI Trả */}
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[10px] text-slate-400 text-right w-11 font-mono">H.thành:</span>
                            <button
                              type="button"
                              onClick={() => toggleInlineField(p.id, 'bcciTraKetQua')}
                              className={`p-1 rounded-full transition-colors cursor-pointer ${
                                p.bcciTraKetQua 
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                                  : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                              }`}
                              title="Trả kết quả qua BCCI"
                            >
                              {p.bcciTraKetQua ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          </div>

                        </td>

                        {/* 7. Một cửa & Loại dịch vụ công trực tuyến detail */}
                        <td className="py-3 px-2 text-center whitespace-nowrap space-y-1.5">
                          
                          {/* Một cửa check inline toggle */}
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10.5px] font-bold text-slate-500">Một cửa:</span>
                            <button
                              type="button"
                              onClick={() => toggleInlineField(p.id, 'motCua')}
                              className={`text-[10.5px] font-bold px-1.5 py-0.2 rounded cursor-pointer transition-colors ${
                                p.motCua 
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' 
                                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                              }`}
                              title="Giải quyết tại phòng một cửa. Nhấp để thay đổi."
                            >
                              {p.motCua ? 'CÓ' : 'KHÔNG'}
                            </button>
                          </div>

                          {/* DVCTT badge dropdown */}
                          <div className="inline-block relative">
                            <select
                              value={p.dvcttLoai}
                              onChange={(e) => handleInlineDvcttChange(p.id, e.target.value as any)}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border focus:outline-none cursor-pointer ${
                                p.dvcttLoai === 'Toàn trình'
                                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                                  : p.dvcttLoai === 'Một phần'
                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                              title="Cấp độ dịch vụ trực tuyến. Thay đổi trực tiếp tại đây."
                            >
                              <option value="Toàn trình">Toàn trình</option>
                              <option value="Một phần">Một phần</option>
                              <option value="Không">Giao dịch giấy</option>
                            </select>
                          </div>

                        </td>

                        {/* 8. Actions column: Edit, Clone, Delete */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            
                            {/* Clone action button */}
                            <button
                              type="button"
                              onClick={() => handleCloneProcedure(p)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-all cursor-pointer"
                              title="Nhân bản lập tức thủ tục này để tạo mã mới"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit main button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!checkAdminPermission(`Chỉnh sửa thủ tục [${p.maTthc}]`, () => {
                                  setEditingProcedure(p);
                                  setIsModalOpen(true);
                                })) return;
                                setEditingProcedure(p);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all cursor-pointer"
                              title="Chỉnh sửa chi tiết thủ tục"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteProcedure(p.id, p.maTthc)}
                              className="p-1.5 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all cursor-pointer"
                              title="Xóa thủ tục hành chính khỏi cơ sở dữ liệu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>

            )}

          </div>

          {/* Table Footer counts */}
          {sortedProcedures.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
              <p>
                Hiển thị <span className="text-slate-800">{sortedProcedures.length}</span> thủ tục hành chính trên tổng số <span className="text-slate-800">{procedures.length}</span> thủ tục.
              </p>
              <p className="flex items-center gap-1.5 text-emerald-600">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>Toàn bộ dữ liệu được lưu trữ tự động trên thiết bị của bạn.</span>
              </p>
            </div>
          )}

        </div>

        {/* 4. Help Section regarding administrative management instructions */}
        <div className="bg-slate-800 text-white rounded-xl p-5 shadow-sm border-l-4 border-amber-500 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <h4 className="font-bold text-sm text-amber-400 flex items-center gap-1.5 uppercase">
              <AlertCircle className="w-4 h-4" /> 
              Hướng dẫn khai báo mã TTHC và đồng bộ dữ liệu
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mã thủ tục hành chính tại Việt Nam thường được cung cấp đồng bộ bởi Cơ sở dữ liệu quốc gia về thủ tục hành chính. Khi thêm mới, vui lòng giữ nguyên định dạng phân cấp dấu chấm (ví dụ: <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono">1.014312</code>) để bộ phân tích thông minh có thể nhận diện và sắp xếp chính xác thứ tự cây phả hệ nghiệp vụ hành chính đa quốc gia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCustomConfirm({
                title: 'Hệ thống Hỗ trợ',
                message: 'Vui lòng nhắn tin hoặc gửi Email trực tiếp cho quản trị viên cổng thông tin tại địa chỉ: hongvm.bache@gmail.com để được giải quyết và khắc phục mọi vướng mắc nghiệp vụ.',
                confirmText: 'Đã hiểu',
                cancelText: '', // Empty cancelText means only OK button (custom alert dialog)
                onConfirm: () => {},
                type: 'info'
              });
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-100 text-xs font-bold rounded-lg transition-colors cursor-pointer self-start md:self-center shrink-0"
          >
            Liên hệ Hỗ trợ
          </button>
        </div>

      </main>

      {/* 5. Footer copyrights */}
      <footer className="bg-slate-900 text-slate-400 text-center py-5 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>{settings.footerMainText}</p>
          <p className="text-slate-600">
            {settings.footerSubText}
          </p>
        </div>
      </footer>
    </>
  )}

      {/* 6. Form Adding/Editing Modal Drawer */}
      <ProcedureModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProcedure(null);
        }}
        onSave={handleSaveProcedure}
        procedureToEdit={editingProcedure}
        linhVucPresets={availableLinhVucPreset}
        soNganhPresets={availableSoNganhPreset}
        capThucHienPresets={availableCapThucHienPreset}
        isAdminLoggedIn={isAdminLoggedIn}
        onRequireAdminLogin={() => {
          setLoginActionContext('Lưu thông tin thủ tục hành chính');
          setIsAdminLoginModalOpen(true);
        }}
      />

      {/* 7. Excel Data Import Modal */}
      <ImportExcelModal
        isOpen={isImportExcelOpen}
        onClose={() => setIsImportExcelOpen(false)}
        existingProcedures={procedures}
        onImportSuccess={handleImportSuccess}
        onShowToast={showToast}
        onAddNewPresets={handleAddNewPresets}
        isAdminLoggedIn={isAdminLoggedIn}
        onRequireAdminLogin={() => {
          setLoginActionContext('Nhập dữ liệu TTHC từ file Excel');
          setIsAdminLoginModalOpen(true);
        }}
      />

      {/* 8. Custom Confirm Modal Dialog */}
      {customConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
            {/* Header */}
            <div className={`px-5 py-4 flex items-center gap-3 text-white ${
              customConfirm.type === 'danger'
                ? 'bg-red-700'
                : customConfirm.type === 'warning'
                  ? 'bg-amber-600'
                  : 'bg-slate-900'
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm tracking-wide uppercase">{customConfirm.title}</h4>
            </div>

            {/* Content text */}
            <div className="p-5 font-semibold text-slate-700 text-xs leading-relaxed">
              {customConfirm.message}
            </div>

            {/* Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              {customConfirm.cancelText && (
                <button
                  type="button"
                  onClick={() => setCustomConfirm(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  {customConfirm.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(null);
                }}
                className={`px-4 py-2 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm ${
                  customConfirm.type === 'danger'
                    ? 'bg-red-700 hover:bg-red-800'
                    : customConfirm.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {customConfirm.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal Báo cáo tổng hợp TTHC Sửa đổi, Bổ sung, Bãi bỏ (theo Tháng, Quý) */}
      {isBienDongModalOpen && (
        <BienDongReportModal
          isOpen={isBienDongModalOpen}
          onClose={() => setIsBienDongModalOpen(false)}
          procedures={procedures}
          onUpdateProcedure={handleUpdateProcedureFromModal}
          availableLinhVuc={availableLinhVucPreset}
          agencyName={settings.agencyName}
          isAdminLoggedIn={isAdminLoggedIn}
          onRequireAdminLogin={() => {
            setLoginActionContext('Cập nhật trạng thái biến động thủ tục hành chính');
            setIsAdminLoginModalOpen(true);
          }}
        />
      )}

      {/* 10. Biểu mẫu Online trực tuyến sửa đổi 2 chiều */}
      {isOnlineSpreadsheetOpen && (
        <OnlineSpreadsheetModal
          isOpen={isOnlineSpreadsheetOpen}
          onClose={() => setIsOnlineSpreadsheetOpen(false)}
          procedures={procedures}
          onUpdateProcedures={(updated) => {
            saveProceduresToStorage(updated);
          }}
          linhVucPresets={availableLinhVucPreset}
          soNganhPresets={availableSoNganhPreset}
          capThucHienPresets={availableCapThucHienPreset}
          settings={settings}
          onShowToast={showToast}
          isAdminLoggedIn={isAdminLoggedIn}
          onRequireAdminLogin={() => {
            setLoginActionContext('Chỉnh sửa biểu mẫu online 2 chiều');
            setIsAdminLoginModalOpen(true);
          }}
        />
      )}

      {/* 11. Modal Đăng nhập Quản trị viên */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => {
          setIsAdminLoginModalOpen(false);
          setPendingAction(null);
        }}
        onShowToast={showToast}
        onLoginSuccess={(displayName) => {
          localStorage.setItem('tthc_admin_username', displayName || 'Quản trị viên');
          handleAdminLoggedInChange(true);
          setIsAdminLoginModalOpen(false);
          showToast(`Đăng nhập Quản trị viên thành công (${displayName || 'Quản trị viên'})! Bạn đã có quyền Thêm, Sửa, Xóa dữ liệu.`, 'success');
          if (pendingAction) {
            const action = pendingAction;
            setPendingAction(null);
            action();
          }
        }}
        actionTitle={loginActionContext}
      />

    </div>
  );
}
