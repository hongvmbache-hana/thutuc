import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home,
  Search,
  Megaphone,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Printer,
  QrCode,
  CheckCircle2,
  Clock,
  Building2,
  ExternalLink,
  Layers,
  Sparkles,
  Filter,
  Eye,
  X,
  FileText,
  Phone,
  Mail,
  HelpCircle,
  Copy,
  Download,
  Share2,
  Grid,
  List,
  RotateCcw,
  Volume2
} from 'lucide-react';
import QRCode from 'qrcode';
import { Procedure, AppSettings, NiemYetConfig, DEFAULT_NIEM_YET_CONFIG } from '../types';

interface NiemYetBoardProps {
  procedures: Procedure[];
  settings: AppSettings;
  onViewProcedureDetail?: (procedure: Procedure) => void;
  onOpenManagementTab?: () => void;
}

// Smart mapping helper for field to Ministry / Department
const FIELD_TO_MINISTRY_MAP: { [key: string]: string } = {
  'AN TOÀN THỰC PHẨM': 'BỘ Y TẾ',
  'BẢO HIỂM XÃ HỘI': 'BỘ NỘI VỤ',
  'BẢO TRỢ XÃ HỘI': 'BỘ Y TẾ',
  'CHỨNG THỰC': 'BỘ TƯ PHÁP',
  'ĐẤT ĐAI': 'UBND TỈNH QUẢNG NINH',
  'GIÁO DỤC VÀ ĐÀO TẠO THUỘC HỆ THỐNG GIÁO DỤC QUỐC DÂN': 'BỘ GIÁO DỤC VÀ ĐÀO TẠO',
  'GIÁO DỤC VÀ ĐÀO TẠO': 'BỘ GIÁO DỤC VÀ ĐÀO TẠO',
  'HOẠT ĐỘNG XÂY DỰNG': 'BỘ XÂY DỰNG',
  'XÂY DỰNG': 'BỘ XÂY DỰNG',
  'HỘ TỊCH': 'BỘ TƯ PHÁP',
  'NGƯỜI CÓ CÔNG': 'BỘ NỘI VỤ',
  'THÀNH LẬP VÀ HOẠT ĐỘNG DOANH NGHIỆP (HỘ KINH DOANH)': 'BỘ TÀI CHÍNH',
  'HỘ KINH DOANH': 'BỘ TÀI CHÍNH',
  'ĐĂNG KÝ KINH DOANH': 'BỘ KẾ HOẠCH VÀ ĐẦU TƯ',
  'TÍN NGƯỠNG, TÔN GIÁO': 'BỘ DÂN TỘC VÀ TÔN GIÁO',
  'TÔN GIÁO': 'BỘ DÂN TỘC VÀ TÔN GIÁO',
  'VĂN HÓA': 'BỘ VĂN HÓA, THỂ THAO VÀ DU LỊCH',
  'DI SẢN VĂN HÓA': 'BỘ VĂN HÓA, THỂ THAO VÀ DU LỊCH',
  'THỂ THAO': 'BỘ VĂN HÓA, THỂ THAO VÀ DU LỊCH',
  'DU LỊCH': 'BỘ VĂN HÓA, THỂ THAO VÀ DU LỊCH',
  'TƯ PHÁP': 'BỘ TƯ PHÁP',
  'Y TẾ': 'BỘ Y TẾ',
  'NÔNG NGHIỆP VÀ PHÁT TRIỂN NÔNG THÔN': 'BỘ NÔNG NGHIỆP VÀ PHÁT TRIỂN NÔNG THÔN',
  'LÂM NGHIỆP': 'BỘ NÔNG NGHIỆP VÀ PHÁT TRIỂN NÔNG THÔN',
  'THỦY SẢN': 'BỘ NÔNG NGHIỆP VÀ PHÁT TRIỂN NÔNG THÔN',
  'TÀI CHÍNH': 'BỘ TÀI CHÍNH',
  'CÔNG THƯƠNG': 'BỘ CÔNG THƯƠNG',
  'GIAO THÔNG VẬN TẢI': 'BỘ GIAO THÔNG VẬN TẢI',
  'THÔNG TIN VÀ TRUYỀN THÔNG': 'BỘ THÔNG TIN VÀ TRUYỀN THÔNG',
  'KHOA HỌC VÀ CÔNG NGHỆ': 'BỘ KHOA HỌC VÀ CÔNG NGHỆ',
  'LAO ĐỘNG': 'BỘ LAO ĐỘNG - THƯƠNG BINH VÀ XÃ HỘI',
  'CÔNG AN': 'BỘ CÔNG AN',
  'QUỐC PHÒNG': 'BỘ QUỐC PHÒNG',
};

// Clean department name
const getCleanDepartment = (field: string, procedures: Procedure[]): string => {
  const normalizedField = field.trim().toUpperCase();
  if (FIELD_TO_MINISTRY_MAP[normalizedField]) {
    return FIELD_TO_MINISTRY_MAP[normalizedField];
  }

  // Check from actual procedures in this field
  const foundProc = procedures.find(p => p.soNganh && p.soNganh.trim());
  if (foundProc && foundProc.soNganh) {
    let dept = foundProc.soNganh.trim().toUpperCase();
    if (dept.startsWith('SỞ ')) {
      dept = dept.replace(/^SỞ\s+/, 'BỘ ');
    }
    return dept;
  }

  return 'UBND TỈNH QUẢNG NINH';
};

// QR payload resolver
const getQrPayload = (procedure: Procedure): string => {
  if (procedure.ghiChu && procedure.ghiChu.trim()) {
    return procedure.ghiChu.trim();
  }
  if (procedure.canCuPhapLy && (/https?:\/\/|www\.|dichvucong\.gov\.vn/i.test(procedure.canCuPhapLy) || procedure.canCuPhapLy.includes('://'))) {
    return procedure.canCuPhapLy.trim();
  }
  return `https://dichvucong.gov.vn/p/home/dvc-tthc-thu-tuc-hanh-chinh-chi-tiet.html?ma_tthc=${encodeURIComponent(procedure.maTthc)}`;
};

export default function NiemYetBoard({
  procedures,
  settings,
  onViewProcedureDetail,
  onOpenManagementTab
}: NiemYetBoardProps) {
  // Load configuration from localStorage
  const [config, setConfig] = useState<NiemYetConfig>(() => {
    const saved = localStorage.getItem('tthc_niemyet_config');
    if (saved) {
      try {
        return { ...DEFAULT_NIEM_YET_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_NIEM_YET_CONFIG;
      }
    }
    return DEFAULT_NIEM_YET_CONFIG;
  });

  const saveConfig = (newConfig: NiemYetConfig) => {
    setConfig(newConfig);
    localStorage.setItem('tthc_niemyet_config', JSON.stringify(newConfig));
  };

  // State
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPaknModalOpen, setIsPaknModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [detailCatalogSearch, setDetailCatalogSearch] = useState('');
  const [detailCatalogDvcttFilter, setDetailCatalogDvcttFilter] = useState<'all' | 'Toàn trình' | 'Một phần' | 'Không'>('all');
  const [selectedProcedureForQr, setSelectedProcedureForQr] = useState<Procedure | null>(null);
  const [qrCodeModalDataUrl, setQrCodeModalDataUrl] = useState<string>('');
  const [previewDetailProcedure, setPreviewDetailProcedure] = useState<Procedure | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hh}:${mm}:${ss}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Pre-generate QR code when modal procedure is opened
  useEffect(() => {
    if (selectedProcedureForQr) {
      const payload = getQrPayload(selectedProcedureForQr);
      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(url => setQrCodeModalDataUrl(url))
        .catch(err => console.error('QR code generation error:', err));
    } else {
      setQrCodeModalDataUrl('');
    }
  }, [selectedProcedureForQr]);

  // Group procedures based on configuration (Lĩnh vực, Bộ/Ngành, Cấp thực hiện, DVC)
  const groupedData = useMemo(() => {
    const groups: { [key: string]: Procedure[] } = {};

    procedures.forEach(p => {
      let key = 'Chưa phân loại';
      if (config.groupBy === 'linhVuc') {
        key = (p.linhVuc && p.linhVuc.trim()) ? p.linhVuc.trim() : 'Chưa phân loại';
      } else if (config.groupBy === 'soNganh') {
        key = (p.soNganh && p.soNganh.trim()) ? p.soNganh.trim() : 'UBND Tỉnh Quảng Ninh';
      } else if (config.groupBy === 'capThucHien') {
        key = (p.capThucHien && p.capThucHien.trim()) ? p.capThucHien.trim() : 'Cấp Xã';
      } else if (config.groupBy === 'dvctt') {
        key = p.dvcttLoai === 'Toàn trình' 
          ? 'DVCTT Toàn trình' 
          : p.dvcttLoai === 'Một phần' 
            ? 'DVCTT Một phần' 
            : 'Thực hiện trực tiếp tại Bộ phận Một cửa';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(p);
    });

    // Convert to array of group items
    let list = Object.entries(groups).map(([name, procs]) => {
      return {
        name,
        count: procs.length,
        procedures: procs,
        department: getCleanDepartment(name, procs)
      };
    });

    // Filter empty if configured
    if (config.hideEmpty) {
      list = list.filter(g => g.count > 0);
    }

    // Sort items
    if (config.sortBy === 'count_desc') {
      list.sort((a, b) => b.count - a.count);
    } else if (config.sortBy === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }
    // 'original' preserves discovered order

    return list;
  }, [procedures, config.groupBy, config.hideEmpty, config.sortBy]);

  // Pagination for cards
  const cardsPerPage = config.cardsPerPage;
  const totalPages = Math.max(1, Math.ceil(groupedData.length / cardsPerPage));

  // Auto-slideshow for kiosk
  useEffect(() => {
    if (config.autoSlideInterval <= 0 || totalPages <= 1 || selectedGroup !== null) return;
    const interval = setInterval(() => {
      setCurrentPage(prev => (prev >= totalPages ? 1 : prev + 1));
    }, config.autoSlideInterval * 1000);
    return () => clearInterval(interval);
  }, [config.autoSlideInterval, totalPages, selectedGroup]);

  // Clamp current page
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const pagedGroups = useMemo(() => {
    if (cardsPerPage >= 999) return groupedData;
    const start = (currentPage - 1) * cardsPerPage;
    return groupedData.slice(start, start + cardsPerPage);
  }, [groupedData, currentPage, cardsPerPage]);

  // Filtered search results for top search bar
  const globalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return procedures.filter(p => 
      p.tenTthc.toLowerCase().includes(query) ||
      p.maTthc.toLowerCase().includes(query) ||
      (p.linhVuc && p.linhVuc.toLowerCase().includes(query)) ||
      (p.canCuPhapLy && p.canCuPhapLy.toLowerCase().includes(query))
    ).slice(0, 50);
  }, [procedures, searchQuery]);

  // When a group is selected, get procedures in that group
  const activeGroupProcedures = useMemo(() => {
    if (!selectedGroup) return [];
    const groupItem = groupedData.find(g => g.name === selectedGroup);
    if (!groupItem) return [];

    let list = [...groupItem.procedures];

    // Filter by internal search query in catalog view
    if (detailCatalogSearch.trim()) {
      const q = detailCatalogSearch.toLowerCase().trim();
      list = list.filter(p => 
        p.tenTthc.toLowerCase().includes(q) ||
        p.maTthc.toLowerCase().includes(q) ||
        (p.canCuPhapLy && p.canCuPhapLy.toLowerCase().includes(q))
      );
    }

    // Filter by DVCTT
    if (detailCatalogDvcttFilter !== 'all') {
      list = list.filter(p => p.dvcttLoai === detailCatalogDvcttFilter);
    }

    return list;
  }, [selectedGroup, groupedData, detailCatalogSearch, detailCatalogDvcttFilter]);

  // Color theme helper
  const getThemeClasses = () => {
    if (config.colorTheme === 'burgundy') {
      return {
        cardBg: 'bg-gradient-to-b from-[#881337] via-[#9f1239] to-[#701a35]',
        cardBorder: 'border-rose-300/40',
        badgeBg: 'border-white/50 text-white',
        activePill: 'bg-rose-700 text-white'
      };
    }
    if (config.colorTheme === 'blue') {
      return {
        cardBg: 'bg-gradient-to-b from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a]',
        cardBorder: 'border-sky-300/40',
        badgeBg: 'border-white/50 text-white',
        activePill: 'bg-blue-700 text-white'
      };
    }
    if (config.colorTheme === 'emerald') {
      return {
        cardBg: 'bg-gradient-to-b from-[#065f46] via-[#047857] to-[#064e3b]',
        cardBorder: 'border-emerald-300/40',
        badgeBg: 'border-white/50 text-white',
        activePill: 'bg-emerald-700 text-white'
      };
    }
    // Default: Red as in uploaded image
    return {
      cardBg: 'bg-[#c51f24] hover:bg-[#b51b20]',
      cardBorder: 'border-red-400/30',
      badgeBg: 'border-white/60 text-white',
      activePill: 'bg-red-700 text-white'
    };
  };

  const theme = getThemeClasses();

  // Columns styling helper
  const getGridColsClass = () => {
    if (config.columns === 3) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    if (config.columns === 4) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    if (config.columns === 5) return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
    if (config.columns === 6) return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
  };

  // Print bulletin catalog for this category
  const handlePrintCategory = () => {
    window.print();
  };

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isHighContrast 
          ? 'bg-black text-white' 
          : 'bg-[#f3f4f6] text-slate-800'
      }`}
      id="niem-yet-board-container"
    >
      {/* ================= 1. HEADER SECTION (Exact match with user image) ================= */}
      <header className="bg-white border-b-4 border-amber-400 shadow-sm px-4 sm:px-6 py-3.5 select-none shrink-0 print:hidden">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-3">
          
          {/* Left: Emblem & Titles */}
          <div className="flex items-center gap-3.5">
            {/* National stylized Emblem icon */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-red-200 bg-red-50 relative overflow-hidden">
              <div className="absolute inset-0 bg-radial from-red-600 to-red-800 opacity-95"></div>
              {/* Stylized emblem hands & star */}
              <svg className="w-8 h-8 text-amber-300 relative z-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.6-6.2 4.6 2.3-7.3-6.1-4.5h7.6z" />
              </svg>
            </div>

            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-[#c51f24] uppercase leading-tight font-serif">
                {config.displayTitle || 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH'}
              </h1>
              <p className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide mt-0.5">
                {config.subTitle || 'TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG XÃ BA CHẼ'}
              </p>
            </div>
          </div>

          {/* Right: Digital Clock, Contrast Toggle, Settings Button */}
          <div className="flex items-center gap-3">
            {/* Live Red Clock as in image */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-red-50/70 border border-red-200 rounded-lg">
              <Clock className="w-4 h-4 text-[#c51f24]" />
              <span className="font-mono font-bold text-base text-[#c51f24] tracking-wider">
                {currentTime || '10:16:05'}
              </span>
            </div>

            {/* High Contrast / Dark toggle */}
            <button
              type="button"
              onClick={() => setIsHighContrast(!isHighContrast)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer border border-slate-200"
              title="Chuyển đổi chế độ tương phản cao cho người cao tuổi / khiếm thị"
              id="kiosk-contrast-toggle"
            >
              <div className="w-5 h-5 rounded-full border-2 border-slate-700 overflow-hidden flex">
                <div className="w-1/2 h-full bg-slate-800"></div>
                <div className="w-1/2 h-full bg-white"></div>
              </div>
            </button>

            {/* Kiosk Fullscreen toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer border border-slate-200 hidden md:flex items-center justify-center"
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Chế độ toàn màn hình Kiosk'}
              id="kiosk-fullscreen-toggle"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Config Button (Yellow with Gear as in photo) */}
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-900 p-2 sm:px-3.5 sm:py-2 rounded-lg font-bold text-xs shadow-xs border border-amber-500 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Cấu hình cách phân chia và giao diện hiển thị bảng niêm yết"
              id="open-niemyet-config-btn"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Cấu hình</span>
            </button>
          </div>

        </div>
      </header>

      {/* ================= 2. TOOLBAR SECTION (Exact match with user image) ================= */}
      <div className="bg-[#eef2f6] border-b border-slate-200 px-4 sm:px-6 py-2.5 shrink-0 print:hidden">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: "TRANG CHỦ" Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedGroup(null);
              setDetailCatalogSearch('');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#c51f24] hover:bg-[#b01a1f] active:scale-95 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-xs transition-all cursor-pointer shrink-0"
            id="kiosk-home-btn"
          >
            <Home className="w-4 h-4" />
            <span>TRANG CHỦ</span>
          </button>

          {/* Center: Large Touch Search Input ("Chạm vào đây để nhập mã hoặc tên thủ tục...") */}
          <div className="flex-1 max-w-2xl relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Chạm vào đây để nhập mã hoặc tên thủ tục..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!isSearchOpen && e.target.value.trim()) {
                    setIsSearchOpen(true);
                  }
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full pl-10 pr-10 py-2.5 bg-white rounded-lg border border-slate-300 text-sm placeholder-slate-400 text-slate-800 shadow-xs focus:ring-2 focus:ring-[#c51f24] focus:border-transparent outline-none transition-all font-medium"
                id="kiosk-touch-search-input"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Search Autocomplete Dropdown */}
            {isSearchOpen && searchQuery.trim() && (
              <div 
                className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[65vh] overflow-y-auto p-2 animate-fadeIn"
                id="kiosk-quick-search-dropdown"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 text-xs font-bold text-slate-500">
                  <span>KẾT QUẢ TÌM KIẾM ({globalSearchResults.length} THỦ TỤC)</span>
                  <button 
                    type="button" 
                    onClick={() => setIsSearchOpen(false)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Đóng [X]
                  </button>
                </div>

                {globalSearchResults.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Không tìm thấy thủ tục nào khớp với từ khóa "{searchQuery}"
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {globalSearchResults.map((proc, idx) => (
                      <div 
                        key={proc.id} 
                        className="p-3 hover:bg-red-50/70 transition-colors flex items-center justify-between gap-3 group/item cursor-pointer rounded-lg"
                        onClick={() => {
                          setPreviewDetailProcedure(proc);
                          setIsSearchOpen(false);
                        }}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-red-100 text-red-800 font-bold text-[11px] flex items-center justify-center shrink-0 font-mono mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-black text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                {proc.maTthc}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium truncate">
                                {proc.linhVuc}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 mt-0.5 group-hover/item:text-red-700 transition-colors line-clamp-2">
                              {proc.tenTthc}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProcedureForQr(proc);
                            }}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 transition-colors"
                            title="Quét mã QR tra cứu trên điện thoại"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewDetailProcedure(proc);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                          >
                            Xem
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: "Hướng dẫn PAKN" & "Cấu hình" Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Hướng dẫn PAKN Button */}
            <button
              type="button"
              onClick={() => setIsPaknModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
              id="kiosk-pakn-guide-btn"
              title="Hướng dẫn phản ánh, kiến nghị về thủ tục hành chính"
            >
              <Megaphone className="w-4 h-4 text-amber-600" />
              <span>Hướng dẫn PAKN</span>
            </button>

            {/* Quick Button to Switch back to Full Data Management Table */}
            {onOpenManagementTab && (
              <button
                type="button"
                onClick={onOpenManagementTab}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Mở bảng dữ liệu chi tiết và chế độ quản trị"
                id="switch-to-data-management-btn"
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="hidden md:inline">Quản trị TTHC</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ================= 3. MAIN CONTENT AREA ================= */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 flex flex-col justify-between">
        
        {/* CASE A: If user clicked on a category card -> Show detailed catalog list */}
        {selectedGroup !== null ? (
          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
            
            {/* Catalog View Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-800 text-white flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  id="back-to-kiosk-cards-btn"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">
                      DANH MỤC NIÊM YẾT CHÍNH THỨC
                    </span>
                    <span className="bg-amber-400 text-red-950 px-2 py-0.5 rounded-full font-mono text-[11px] font-black">
                      {activeGroupProcedures.length} TTHC
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-wide mt-0.5">
                    {selectedGroup}
                  </h2>
                </div>
              </div>

              {/* Action Tools in Catalog view */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search within this category */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Lọc trong lĩnh vực này..."
                    value={detailCatalogSearch}
                    onChange={(e) => setDetailCatalogSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white/10 hover:bg-white/20 focus:bg-white text-white focus:text-slate-900 placeholder-white/70 focus:placeholder-slate-400 text-xs rounded-lg border border-white/30 outline-none transition-all w-48 sm:w-64"
                  />
                  <Search className="w-3.5 h-3.5 text-white/70 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Filter by DVCTT */}
                <select
                  value={detailCatalogDvcttFilter}
                  onChange={(e) => setDetailCatalogDvcttFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg border border-white/30 outline-none cursor-pointer"
                >
                  <option value="all" className="text-slate-800">Tất cả mức độ DVC</option>
                  <option value="Toàn trình" className="text-slate-800">DVCTT Toàn trình</option>
                  <option value="Một phần" className="text-slate-800">DVCTT Một phần</option>
                  <option value="Không" className="text-slate-800">Trực tiếp tại Một cửa</option>
                </select>

                {/* Print button */}
                <button
                  type="button"
                  onClick={handlePrintCategory}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-red-900 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                  id="print-category-bulletin-btn"
                >
                  <Printer className="w-4 h-4" />
                  <span>In bảng niêm yết</span>
                </button>
              </div>
            </div>

            {/* List of administrative procedures sorted and formatted */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100">
              {activeGroupProcedures.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
                  <p className="text-sm font-semibold text-slate-600">
                    Không tìm thấy thủ tục hành chính nào phù hợp với bộ lọc.
                  </p>
                </div>
              ) : (
                activeGroupProcedures.map((procedure, index) => {
                  const qrPayload = getQrPayload(procedure);

                  return (
                    <div 
                      key={procedure.id}
                      className="py-4 sm:py-5 first:pt-2 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 px-3 rounded-xl transition-colors"
                    >
                      {/* Left info: STT, Code, Title, Metadata */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Numerical index STT */}
                        <div className="w-8 h-8 rounded-lg bg-red-100 text-[#c51f24] font-mono font-black text-sm flex items-center justify-center shrink-0 mt-0.5 border border-red-200">
                          {String(index + 1).padStart(2, '0')}
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Code and Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-[#c51f24] bg-red-50 px-2.5 py-0.5 rounded-md border border-red-200">
                              MÃ TTHC: {procedure.maTthc}
                            </span>

                            {procedure.dvcttLoai === 'Toàn trình' && (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                DVCTT Toàn trình
                              </span>
                            )}

                            {procedure.dvcttLoai === 'Một phần' && (
                              <span className="bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-sky-600" />
                                DVCTT Một phần
                              </span>
                            )}

                            {procedure.motCua && (
                              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Tiếp nhận Một cửa
                              </span>
                            )}

                            {procedure.bcciTiepNhan && (
                              <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Qua Bưu chính (BCCI)
                              </span>
                            )}

                            {procedure.trangThai && procedure.trangThai !== 'Hiện hành' && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                procedure.trangThai === 'Bãi bỏ' 
                                  ? 'bg-rose-100 text-rose-800 border-rose-300' 
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {procedure.trangThai}
                              </span>
                            )}
                          </div>

                          {/* Procedure Title */}
                          <h3 className="text-base font-bold text-slate-900 leading-snug">
                            {procedure.tenTthc}
                          </h3>

                          {/* Legal base */}
                          {procedure.canCuPhapLy && (
                            <p className="text-xs text-slate-500 line-clamp-2">
                              <span className="font-semibold text-slate-600">Căn cứ pháp lý: </span>
                              {procedure.canCuPhapLy}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: QR Code Scanner for Phone & Action Buttons */}
                      <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                        {/* Interactive QR Code Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedProcedureForQr(procedure)}
                          className="flex items-center gap-2 p-2 bg-slate-100 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-xl transition-all cursor-pointer group"
                          title="Bấm để phóng to mã QR quét trên điện thoại"
                        >
                          <div className="w-10 h-10 bg-white rounded-lg p-1 border border-slate-200 flex items-center justify-center">
                            <QrCode className="w-8 h-8 text-slate-800 group-hover:text-[#c51f24] transition-colors" />
                          </div>
                          <div className="text-left leading-tight pr-1 hidden sm:block">
                            <span className="text-[10px] font-black uppercase text-[#c51f24] block">Quét QR</span>
                            <span className="text-[10px] text-slate-500 block">Tra cứu online</span>
                          </div>
                        </button>

                        {/* View detail procedure modal button */}
                        <button
                          type="button"
                          onClick={() => setPreviewDetailProcedure(procedure)}
                          className="px-3.5 py-2.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-[#c51f24] border border-slate-200 hover:border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Chi tiết</span>
                        </button>

                        {/* Open Public Portal link if available */}
                        {qrPayload.startsWith('http') && (
                          <a
                            href={qrPayload}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                            title="Mở trực tiếp trên Cổng Dịch vụ công Quốc gia"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Catalog footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Đang hiển thị {activeGroupProcedures.length} thủ tục hành chính</span>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="text-[#c51f24] font-bold hover:underline"
              >
                ← Quay lại danh sách lĩnh vực
              </button>
            </div>

          </div>
        ) : (
          /* CASE B: Default Kiosk Grid (Exact representation as shown in uploaded photo!) */
          <div className="flex-1 flex flex-col justify-between space-y-4">
            
            {/* The 12-Card Grid (2 rows x 6 cols as depicted in photo) */}
            <div className={`grid ${getGridColsClass()} gap-3.5 sm:gap-4.5 flex-1 content-start`}>
              {pagedGroups.map((item, idx) => {
                // Pad count with zero if < 10 (e.g. "01 TTHC", "09 TTHC", "12 TTHC")
                const paddedCount = item.count < 10 ? `0${item.count}` : `${item.count}`;

                return (
                  <div
                    key={item.name + idx}
                    onClick={() => {
                      setSelectedGroup(item.name);
                      setDetailCatalogSearch('');
                    }}
                    className={`
                      ${theme.cardBg}
                      ${theme.cardBorder}
                      text-white rounded-xl sm:rounded-2xl p-4 sm:p-5
                      flex flex-col justify-between
                      shadow-md hover:shadow-xl hover:scale-[1.02]
                      border transition-all duration-200 cursor-pointer
                      relative overflow-hidden group select-none
                      min-h-[160px] sm:min-h-[185px] lg:min-h-[210px]
                    `}
                    id={`kiosk-card-${idx}`}
                  >
                    {/* Background subtle sheen effect */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover:bg-white/10 transition-all"></div>

                    {/* Top Row: Star emblem & Badge counter */}
                    <div className="flex items-center justify-between gap-2 shrink-0">
                      {/* Stylized Star Emblem on card */}
                      <div className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.6-6.2 4.6 2.3-7.3-6.1-4.5h7.6z" />
                        </svg>
                      </div>

                      {/* Badge counter: e.g. "01 TTHC", "36 TTHC" */}
                      {config.showCountBadge && (
                        <span className={`px-2.5 py-0.5 rounded-full border ${theme.badgeBg} font-mono font-bold text-xs sm:text-xs tracking-wider uppercase shadow-xs`}>
                          {paddedCount} TTHC
                        </span>
                      )}
                    </div>

                    {/* Middle: Category Name in bold uppercase, centered */}
                    <div className="my-auto py-2 text-center">
                      <h3 className="text-sm sm:text-base lg:text-[16px] font-black uppercase tracking-tight text-white leading-snug drop-shadow-xs line-clamp-3">
                        {item.name}
                      </h3>
                    </div>

                    {/* Bottom: Department with building icon */}
                    {config.showDepartment && (
                      <div className="pt-2 border-t border-white/25 border-dashed flex items-center justify-center gap-1.5 text-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-white/80 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-white/95 tracking-wide truncate">
                          {item.department}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ================= 4. BOTTOM BAR / PAGINATION (Matches bottom of user's photo: < 1/3 >) ================= */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-700 shadow-sm shrink-0">
              
              {/* Left info */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">
                  Tổng số: {groupedData.length} danh mục ({procedures.length} TTHC đã niêm yết)
                </span>
                {config.autoSlideInterval > 0 && (
                  <span className="hidden sm:inline bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    Tự chuyển trang ({config.autoSlideInterval}s)
                  </span>
                )}
              </div>

              {/* Right pagination controls as seen in image: < 1/3 > */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-800 cursor-pointer"
                  title="Trang trước"
                  id="kiosk-prev-page-btn"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 py-1 bg-slate-100 rounded-lg font-mono font-bold text-xs text-slate-900 border border-slate-200">
                  {currentPage} / {totalPages}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-800 cursor-pointer"
                  title="Trang tiếp theo"
                  id="kiosk-next-page-btn"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Page Jump buttons if more than 1 page */}
                {totalPages > 1 && totalPages <= 6 && (
                  <div className="hidden md:flex items-center gap-1 ml-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-6 h-6 rounded-md font-mono text-[11px] font-bold cursor-pointer ${
                          currentPage === p
                            ? 'bg-[#c51f24] text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* ================= 5. PAKN (PHẢN ÁNH KIẾN NGHỊ) GUIDANCE MODAL ================= */}
      {isPaknModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsPaknModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#c51f24] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/20">
                  <Megaphone className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base uppercase">
                    HƯỚNG DẪN GỬI PHẢN ÁNH, KIẾN NGHỊ (PAKN)
                  </h3>
                  <p className="text-xs text-red-100">
                    Quy trình tiếp nhận và xử lý phản ánh về quy định hành chính
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPaknModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-sm text-slate-700">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
                <strong>Theo quy định của Chính phủ:</strong> Người dân và doanh nghiệp có quyền gửi phản ánh, kiến nghị về các hành vi chậm trễ, gây phiền hà hoặc không thực hiện, thực hiện không đúng quy định hành chính của cán bộ, công chức.
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-[#c51f24]">
                  CÁC KÊNH TIẾP NHẬN PHẢN ÁNH, KIẾN NGHỊ:
                </h4>

                {/* Channel 1: National Public Service Portal */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3.5">
                  <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-[#c51f24]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-slate-900 text-sm">
                      1. Cổng Dịch Vụ Công Quốc Gia
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gửi phản ánh trực tuyến 24/7, theo dõi quá trình xử lý và nhận kết quả minh bạch.
                    </p>
                    <a
                      href="https://dichvucong.gov.vn/p/home/dvc-phan-anh-kien-nghi.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c51f24] hover:underline mt-1.5"
                    >
                      <span>Truy cập dichvucong.gov.vn</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Channel 2: Hotline & One-stop office */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3.5">
                  <div className="p-3 bg-red-100 text-[#c51f24] rounded-xl shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-slate-900 text-sm">
                      2. Đường Dây Nóng & Bộ Phận Một Cửa
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Liên hệ trực tiếp với Lãnh đạo hoặc Công chức trực tại Bộ phận tiếp nhận và trả kết quả:
                    </p>
                    <div className="mt-2 text-xs font-medium space-y-1">
                      <p>• <strong>Điện thoại đường dây nóng:</strong> 0203.3888.xxx / 1900.xxxx</p>
                      <p>• <strong>Địa chỉ tiếp nhận:</strong> Trung tâm Phục vụ Hành chính công xã Ba Chẽ</p>
                      <p>• <strong>Thời gian:</strong> Giờ hành chính từ Thứ Hai đến Thứ Sáu hàng tuần</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acceptance conditions */}
              <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Lưu ý khi gửi phản ánh, kiến nghị:</p>
                <p>• Sử dụng ngôn ngữ tiếng Việt có dấu, nội dung rõ ràng, ghi rõ họ tên và số điện thoại liên hệ.</p>
                <p>• Phản ánh về hành vi của công chức hoặc sự không phù hợp của quy định hành chính.</p>
                <p>• Không tiếp nhận phản ánh, kiến nghị về khiếu nại, tố cáo và giải quyết khiếu nại, tố cáo.</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPaknModalOpen(false)}
                className="px-4 py-2 bg-[#c51f24] hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. CONFIGURATION MODAL (As user requested: "có cấu hình để phân hiển thị theo tùy ý của người dùng") ================= */}
      {isConfigModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsConfigModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500 text-slate-950">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">CẤU HÌNH BẢNG NIÊM YẾT</h3>
                  <p className="text-xs text-slate-400">Tùy biến cách phân chia danh mục và giao diện hiển thị</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
              
              {/* Option 1: Grouping mode (Lĩnh vực / Bộ ngành / Cấp thực hiện / DVCTT) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 text-xs block">
                  1. Phân chia danh mục thẻ theo:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => saveConfig({ ...config, groupBy: 'linhVuc' })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      config.groupBy === 'linhVuc'
                        ? 'border-[#c51f24] bg-red-50/70 text-[#c51f24] font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Theo LĨNH VỰC</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Đất đai, Hộ tịch, Chứng thực, Xây dựng... (Như ảnh mẫu)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => saveConfig({ ...config, groupBy: 'soNganh' })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      config.groupBy === 'soNganh'
                        ? 'border-[#c51f24] bg-red-50/70 text-[#c51f24] font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Theo BỘ, NGÀNH</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Bộ Tư pháp, Bộ Y tế, UBND Tỉnh, Bộ Nội vụ...
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => saveConfig({ ...config, groupBy: 'capThucHien' })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      config.groupBy === 'capThucHien'
                        ? 'border-[#c51f24] bg-red-50/70 text-[#c51f24] font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Theo CẤP THỰC HIỆN</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Cấp Xã, Cấp Huyện, Cấp Tỉnh, Liên thông
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => saveConfig({ ...config, groupBy: 'dvctt' })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      config.groupBy === 'dvctt'
                        ? 'border-[#c51f24] bg-red-50/70 text-[#c51f24] font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Theo MỨC ĐỘ DVC</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Toàn trình, Một phần, Nộp trực tiếp tại Một cửa
                    </div>
                  </button>
                </div>
              </div>

              {/* Option 2: Number of columns (3, 4, 5, 6 as in photo) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-900 text-xs block">
                  2. Số cột hiển thị trên màn hình:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 4, 5, 6].map(cols => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => saveConfig({ ...config, columns: cols as any })}
                      className={`py-2 px-3 rounded-lg border text-center font-bold text-xs cursor-pointer transition-all ${
                        config.columns === cols
                          ? 'bg-red-700 text-white border-red-700'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {cols} Cột {cols === 6 && '(Mẫu chuẩn)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 3: Color theme of cards */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-900 text-xs block">
                  3. Màu sắc thẻ niêm yết:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'red', name: 'Đỏ cờ (Ảnh mẫu)', color: 'bg-[#c51f24]' },
                    { id: 'burgundy', name: 'Đỏ Burgundy', color: 'bg-[#881337]' },
                    { id: 'blue', name: 'Xanh DVC', color: 'bg-[#1e40af]' },
                    { id: 'emerald', name: 'Xanh Ngọc', color: 'bg-[#065f46]' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => saveConfig({ ...config, colorTheme: t.id as any })}
                      className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        config.colorTheme === t.id
                          ? 'border-slate-800 ring-2 ring-slate-800/20 font-bold'
                          : 'border-slate-200'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full ${t.color} shrink-0`}></span>
                      <span className="text-[11px] truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 4: Sorting */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-900 text-xs block">
                  4. Sắp xếp danh mục:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'count_desc', label: 'Số TTHC giảm dần' },
                    { id: 'name_asc', label: 'Tên A - Z' },
                    { id: 'original', label: 'Thứ tự ban đầu' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => saveConfig({ ...config, sortBy: s.id as any })}
                      className={`py-2 px-2.5 rounded-lg border text-center font-semibold text-[11px] cursor-pointer ${
                        config.sortBy === s.id
                          ? 'bg-[#c51f24] text-white border-[#c51f24]'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 5: Header Titles customization */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-900 text-xs block">
                  5. Tùy chỉnh tiêu đề bảng niêm yết:
                </label>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Dòng tiêu đề chính:</span>
                  <input
                    type="text"
                    value={config.displayTitle}
                    onChange={(e) => saveConfig({ ...config, displayTitle: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    placeholder="BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Tên cơ quan / đơn vị niêm yết:</span>
                  <input
                    type="text"
                    value={config.subTitle}
                    onChange={(e) => saveConfig({ ...config, subTitle: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                    placeholder="TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG XÃ BA CHẼ"
                  />
                </div>
              </div>

              {/* Option 6: Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.showDepartment}
                    onChange={(e) => saveConfig({ ...config, showDepartment: e.target.checked })}
                    className="rounded text-[#c51f24] focus:ring-[#c51f24]"
                  />
                  <span className="font-semibold text-slate-800">Hiển thị tên Bộ, Ngành / Cơ quan quản lý ở chân thẻ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.showCountBadge}
                    onChange={(e) => saveConfig({ ...config, showCountBadge: e.target.checked })}
                    className="rounded text-[#c51f24] focus:ring-[#c51f24]"
                  />
                  <span className="font-semibold text-slate-800">Hiển thị số lượng TTHC ở góc trên thẻ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.hideEmpty}
                    onChange={(e) => saveConfig({ ...config, hideEmpty: e.target.checked })}
                    className="rounded text-[#c51f24] focus:ring-[#c51f24]"
                  />
                  <span className="font-semibold text-slate-800">Ẩn các nhóm không có thủ tục nào (0 TTHC)</span>
                </label>
              </div>

              {/* Option 7: Kiosk Auto Slideshow */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <label className="font-bold text-slate-900 text-xs block">
                  Chế độ Tự động chuyển trang (Slideshow Kiosk):
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { val: 0, label: 'Tắt (Thủ công)' },
                    { val: 10, label: '10 giây' },
                    { val: 15, label: '15 giây' },
                    { val: 30, label: '30 giây' }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => saveConfig({ ...config, autoSlideInterval: item.val })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                        config.autoSlideInterval === item.val
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => saveConfig(DEFAULT_NIEM_YET_CONFIG)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục mặc định</span>
              </button>

              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Hoàn tất & Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. QR CODE POPUP MODAL ================= */}
      {selectedProcedureForQr && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedProcedureForQr(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <span className="font-mono text-xs font-black text-[#c51f24] bg-red-50 px-2.5 py-0.5 rounded-md border border-red-200 inline-block">
                MÃ TTHC: {selectedProcedureForQr.maTthc}
              </span>
              <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-3">
                {selectedProcedureForQr.tenTthc}
              </h3>
            </div>

            {/* The High Resolution QR Code */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block shadow-inner">
              {qrCodeModalDataUrl ? (
                <img 
                  src={qrCodeModalDataUrl} 
                  alt="QR Code" 
                  className="w-56 h-56 mx-auto rounded-lg"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                  Đang tạo mã QR...
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Dùng <strong>Camera điện thoại</strong> hoặc <strong>Zalo</strong> quét mã để xem toàn văn hướng dẫn và nộp hồ sơ trực tuyến.
            </p>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedProcedureForQr(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 8. FAST PROCEDURE DETAILS DRAWER ================= */}
      {previewDetailProcedure && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewDetailProcedure(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-amber-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                  {previewDetailProcedure.maTthc}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {previewDetailProcedure.linhVuc}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setPreviewDetailProcedure(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#c51f24] block mb-1">
                  TÊN THỦ TỤC HÀNH CHÍNH
                </span>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {previewDetailProcedure.tenTthc}
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Cấp thực hiện</span>
                  <span className="font-bold text-slate-800">{previewDetailProcedure.capThucHien || 'Cấp Xã'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Cơ quan quản lý</span>
                  <span className="font-bold text-slate-800">{previewDetailProcedure.soNganh || 'UBND Tỉnh Quảng Ninh'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Mức độ DVC</span>
                  <span className="font-bold text-slate-800">{previewDetailProcedure.dvcttLoai}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Một cửa</span>
                  <span className="font-bold text-slate-800">{previewDetailProcedure.motCua ? 'Có tiếp nhận' : 'Không'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Bưu chính BCCI</span>
                  <span className="font-bold text-slate-800">{previewDetailProcedure.bcciTiepNhan ? 'Có hỗ trợ' : 'Không'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Trạng thái</span>
                  <span className="font-bold text-slate-800">{previewDetailProcedure.trangThai || 'Hiện hành'}</span>
                </div>
              </div>

              {previewDetailProcedure.canCuPhapLy && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    CĂN CỨ PHÁP LÝ BAN HÀNH
                  </span>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                    {previewDetailProcedure.canCuPhapLy}
                  </p>
                </div>
              )}

              {/* QR Code preview inside drawer */}
              <div className="p-3.5 bg-red-50/50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-red-900 text-xs">Mã QR tra cứu & Nộp hồ sơ trực tuyến</span>
                  <p className="text-[11px] text-red-700">Quét mã bằng Zalo hoặc Camera điện thoại để nộp trực tuyến</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProcedureForQr(previewDetailProcedure);
                  }}
                  className="px-3 py-1.5 bg-[#c51f24] hover:bg-red-800 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                >
                  Mở mã QR
                </button>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDetailProcedure(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
