export interface Procedure {
  id: string;
  maTthc: string; // Mã thủ tục hành chính
  tenTthc: string; // Tên thủ tục hành chính
  linhVuc: string; // Lĩnh vực (e.g. Di sản văn hóa, Văn hóa)
  soNganh: string; // Sở, ngành quản lý (e.g. Sở Văn hóa, Thể thao và Du lịch)
  capThucHien: string; // Cấp thực hiện (e.g. Cấp xã, Thành phố, Cấp xã, Thành phố, Liên thông)
  bcciTiepNhan: boolean; // BCCI - Tiếp nhận
  bcciTraKetQua: boolean; // BCCI - Trả kết quả
  dvcttLoai: 'Toàn trình' | 'Một phần' | 'Không'; // DVCTT (Dịch vụ công trực tuyến)
  motCua: boolean; // Thực hiện tại bộ phận một cửa
  canCuPhapLy: string; // Căn cứ pháp lý
  dungChung: boolean; // Dùng chung
  ngayTao: string; // Ngày tạo
  ngayCapNhat: string; // Ngày cập nhật
  ghiChu?: string; // Nội dung văn bản / đường dẫn mã hóa vào QR code
  trangThai?: 'Sửa đổi, bổ sung' | 'Bãi bỏ' | 'Ban hành mới' | 'Hiện hành'; // Trạng thái biến động TTHC
  ngayBanHanh?: string; // Ngày ban hành / quyết định / hiệu lực (YYYY-MM-DD)
  soQuyetDinh?: string; // Số quyết định công bố
}

export interface SearchFilters {
  keyword: string;
  linhVuc: string;
  soNganh: string;
  capThucHien: string;
  bcciTiepNhan: 'all' | 'yes' | 'no';
  bcciTraKetQua: 'all' | 'yes' | 'no';
  dvcttLoai: 'all' | 'Toàn trình' | 'Một phần' | 'Không';
  motCua: 'all' | 'yes' | 'no';
  dungChung: 'all' | 'yes' | 'no';
  trangThai: 'all' | 'Sửa đổi, bổ sung' | 'Bãi bỏ' | 'Ban hành mới' | 'Hiện hành';
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: UserRole; // 'admin': Quản trị viên tối cao, 'editor': Cán bộ nghiệp vụ (Thêm, Sửa, Xóa TTHC), 'viewer': Cán bộ tra cứu
  password?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AppSettings {
  siteTitle: string;
  siteSubtitle: string;
  logoEmoji: string;
  badgeLabel: string;
  systemVersion: string;
  footerMainText: string;
  footerSubText: string;
  onlineExcelUrl?: string; // Đường dẫn biểu mẫu Google Sheets / Excel Online
  onlineExcelAutoSync?: boolean; // Tự động cập nhật khi khởi động ứng dụng
  onlineExcelSyncMode?: 'merge' | 'add_only' | 'replace_all'; // Chế độ đồng bộ mặc định
  lastOnlineSyncDate?: string; // Thời điểm đồng bộ gần nhất
  lastOnlineSyncCount?: number; // Số lượng thủ tục đã đồng bộ lần gần nhất
  // Cấu hình Banner Kiosk
  kioskBannerTitle?: string;
  kioskBannerSubtitle?: string;
  kioskBannerSlogan?: string;
  kioskBannerBgColor?: 'white' | 'red' | 'blue' | 'slate';
  kioskShowStatsOnClock?: boolean; // Hiển thị số thủ tục cấp tỉnh, xã, liên thông, toàn trình/một phần cạnh trên đồng hồ
  // Cấu hình Footer Kiosk
  kioskFooterText?: string;
  kioskFooterMarquee?: string;
  kioskFooterHotline?: string;
  kioskFooterShowMarquee?: boolean;
}

export interface OnlineExcelSyncResult {
  procedures: Procedure[];
  warnings: string[];
  totalParsed: number;
  discoveredLinhVuc: string[];
  discoveredSoNganh: string[];
  sourceUrl: string;
}

export interface NiemYetConfig {
  groupBy: 'linhVuc' | 'soNganh' | 'capThucHien' | 'dvctt';
  columns: 3 | 4 | 5 | 6 | 'auto';
  colorTheme: 'red' | 'burgundy' | 'blue' | 'emerald';
  sortBy: 'count_desc' | 'name_asc' | 'original';
  cardsPerPage: number;
  showDepartment: boolean;
  showCountBadge: boolean;
  hideEmpty: boolean;
  displayTitle: string;
  subTitle: string;
  autoSlideInterval: number; // 0 = off, 10, 15, 30s
  cardShape?: 'a4' | 'standard' | 'elongated';
}

export const DEFAULT_NIEM_YET_CONFIG: NiemYetConfig = {
  groupBy: 'linhVuc',
  columns: 6,
  colorTheme: 'red',
  sortBy: 'count_desc',
  cardsPerPage: 12,
  showDepartment: true,
  showCountBadge: true,
  hideEmpty: true,
  displayTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH',
  subTitle: 'TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG XÃ BA CHẼ',
  autoSlideInterval: 0,
  cardShape: 'a4',
};


