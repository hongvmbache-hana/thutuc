// Danh sách 54 đơn vị hành chính cấp xã, phường, đặc khu của tỉnh Quảng Ninh (sau sắp xếp 2024-2025)
// Gồm 30 phường, 22 xã và 2 đặc khu kinh tế (Vân Đồn, Cô Tô)

export interface QuangNinhUnit {
  id: string;
  name: string;
  type: 'phuong' | 'xa' | 'dackhu';
  defaultTitle: string;
  agencyName: string; // Tên cơ quan / đơn vị niêm yết chuẩn
}

export const QUANG_NINH_54_UNITS: QuangNinhUnit[] = [
  // --- I. 30 PHƯỜNG ---
  { id: 'p_an_sinh', name: 'Phường An Sinh', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG AN SINH' },
  { id: 'p_bai_chay', name: 'Phường Bãi Cháy', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG BÃI CHÁY' },
  { id: 'p_binh_khe', name: 'Phường Bình Khê', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG BÌNH KHÊ' },
  { id: 'p_cao_xanh', name: 'Phường Cao Xanh', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG CAO XANH' },
  { id: 'p_cam_pha', name: 'Phường Cẩm Phả', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG CẨM PHẢ' },
  { id: 'p_cua_ong', name: 'Phường Cửa Ông', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG CỬA ÔNG' },
  { id: 'p_dong_mai', name: 'Phường Đông Mai', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG ĐÔNG MAI' },
  { id: 'p_dong_trieu', name: 'Phường Đông Triều', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG ĐÔNG TRIỀU' },
  { id: 'p_ha_an', name: 'Phường Hà An', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG HÀ AN' },
  { id: 'p_ha_lam', name: 'Phường Hà Lầm', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG HÀ LẦM' },
  { id: 'p_ha_long', name: 'Phường Hạ Long', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG HẠ LONG' },
  { id: 'p_ha_tu', name: 'Phường Hà Tu', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG HÀ TU' },
  { id: 'p_hiep_hoa', name: 'Phường Hiệp Hòa', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG HIỆP HÒA' },
  { id: 'p_hoang_que', name: 'Phường Hoàng Quế', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG HOÀNG QUẾ' },
  { id: 'p_hoanh_bo', name: 'Phường Hoành Bồ', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG HOÀNH BỒ' },
  { id: 'p_hong_gai', name: 'Phường Hồng Gai', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG HỒNG GAI' },
  { id: 'p_lien_hoa', name: 'Phường Liên Hòa', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG LIÊN HÒA' },
  { id: 'p_mao_khe', name: 'Phường Mạo Khê', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG MẠO KHÊ' },
  { id: 'p_mong_cai_1', name: 'Phường Móng Cái 1', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG MÓNG CÁI 1' },
  { id: 'p_mong_cai_2', name: 'Phường Móng Cái 2', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG MÓNG CÁI 2' },
  { id: 'p_mong_cai_3', name: 'Phường Móng Cái 3', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG MÓNG CÁI 3' },
  { id: 'p_mong_duong', name: 'Phường Mông Dương', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG MÔNG DƯƠNG' },
  { id: 'p_phong_coc', name: 'Phường Phong Cốc', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG PHONG CỐC' },
  { id: 'p_quang_hanh', name: 'Phường Quang Hanh', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG QUANG HANH' },
  { id: 'p_quang_yen', name: 'Phường Quảng Yên', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG QUẢNG YÊN' },
  { id: 'p_tuan_chau', name: 'Phường Tuần Châu', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG TUẦN CHÂU' },
  { id: 'p_uong_bi', name: 'Phường Uông Bí', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG UÔNG BÍ' },
  { id: 'p_vang_danh', name: 'Phường Vàng Danh', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG VÀNG DANH' },
  { id: 'p_viet_hung', name: 'Phường Việt Hưng', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG VIỆT HƯNG' },
  { id: 'p_yen_tu', name: 'Phường Yên Tử', type: 'phuong', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND PHƯỜNG YÊN TỬ' },

  // --- II. 22 XÃ ---
  { id: 'x_ba_che', name: 'Xã Ba Chẽ', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG XÃ BA CHẼ' },
  { id: 'x_binh_lieu', name: 'Xã Bình Liêu', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ BÌNH LIÊU' },
  { id: 'x_cai_chien', name: 'Xã Cái Chiên', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ CÁI CHIÊN' },
  { id: 'x_dam_ha', name: 'Xã Đầm Hà', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ ĐẦM HÀ' },
  { id: 'x_dien_xa', name: 'Xã Điền Xá', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ ĐIỀN XÁ' },
  { id: 'x_dong_ngu', name: 'Xã Đông Ngũ', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ ĐÔNG NGŨ' },
  { id: 'x_duong_hoa', name: 'Xã Đường Hoa', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ ĐƯỜNG HOA' },
  { id: 'x_hai_hoa', name: 'Xã Hải Hòa', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ HẢI HÒA' },
  { id: 'x_hai_lang', name: 'Xã Hải Lạng', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ HẢI LẠNG' },
  { id: 'x_hai_ninh', name: 'Xã Hải Ninh', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ HẢI NINH' },
  { id: 'x_hai_son', name: 'Xã Hải Sơn', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ HẢI SƠN' },
  { id: 'x_hoanh_mo', name: 'Xã Hoành Mô', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ HOÀNH MÔ' },
  { id: 'x_ky_thuong', name: 'Xã Kỳ Thượng', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ KỲ THƯỢNG' },
  { id: 'x_luc_hon', name: 'Xã Lục Hồn', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ LỤC HỒN' },
  { id: 'x_luong_minh', name: 'Xã Lương Minh', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ LƯƠNG MINH' },
  { id: 'x_quang_duc', name: 'Xã Quảng Đức', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ QUẢNG ĐỨC' },
  { id: 'x_quang_ha', name: 'Xã Quảng Hà', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ QUẢNG HÀ' },
  { id: 'x_quang_la', name: 'Xã Quảng La', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ QUẢNG LA' },
  { id: 'x_quang_tan', name: 'Xã Quảng Tân', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ QUẢNG TÂN' },
  { id: 'x_thong_nhat', name: 'Xã Thống Nhất', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ THỐNG NHẤT' },
  { id: 'x_tien_yen', name: 'Xã Tiên Yên', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ TIÊN YÊN' },
  { id: 'x_vinh_thuc', name: 'Xã Vĩnh Thực', type: 'xa', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND XÃ VĨNH THỰC' },

  // --- III. 2 ĐẶC KHU ---
  { id: 'dk_co_to', name: 'Đặc khu Cô Tô', type: 'dackhu', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND ĐẶC KHU CÔ TÔ' },
  { id: 'dk_van_don', name: 'Đặc khu Vân Đồn', type: 'dackhu', defaultTitle: 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH', agencyName: 'UBND ĐẶC KHU VÂN ĐỒN' },
];

// Danh sách các định dạng tên hiển thị cơ quan thường dùng
export function getAgencyPresetOptions(unit: QuangNinhUnit): string[] {
  const cleanName = unit.name;
  return [
    `TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG ${cleanName.toUpperCase()}`,
    `BỘ PHẬN TIẾP NHẬN VÀ TRẢ KẾT QUẢ ${cleanName.toUpperCase()}`,
    `UBND ${cleanName.toUpperCase()}`,
    `HỘI ĐỒNG NHÂN DÂN - UBND ${cleanName.toUpperCase()}`
  ];
}
