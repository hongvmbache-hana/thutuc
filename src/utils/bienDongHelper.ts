import ExcelJS from 'exceljs';
import { Procedure } from '../types';

export type TrangThaiBienDong = 'Sửa đổi, bổ sung' | 'Bãi bỏ' | 'Ban hành mới' | 'Hiện hành';

/**
 * Xác định trạng thái biến động của thủ tục hành chính.
 * Ưu tiên thuộc tính p.trangThai; nếu chưa có thì tự động nhận diện từ từ khóa
 * trong Tên thủ tục, Căn cứ pháp lý hoặc Ghi chú.
 */
export function getProcedureTrangThai(p: Procedure): TrangThaiBienDong {
  if (p.trangThai) {
    const norm = p.trangThai.toLowerCase().trim();
    if (norm.includes('bãi bỏ') || norm.includes('bãi') || norm.includes('hủy')) return 'Bãi bỏ';
    if (norm.includes('sửa đổi') || norm.includes('bổ sung') || norm.includes('thay thế')) return 'Sửa đổi, bổ sung';
    if (norm.includes('mới') || norm.includes('ban hành')) return 'Ban hành mới';
    if (norm.includes('hiện hành')) return 'Hiện hành';
  }

  const text = `${p.tenTthc} ${p.canCuPhapLy || ''} ${p.ghiChu || ''}`.toLowerCase();

  // 1. Kiểm tra từ khóa bãi bỏ
  if (
    text.includes('bãi bỏ') ||
    text.includes('hủy bỏ') ||
    text.includes('hết hiệu lực') ||
    text.includes('đình chỉ')
  ) {
    return 'Bãi bỏ';
  }

  // 2. Kiểm tra từ khóa sửa đổi, bổ sung, thay thế
  if (
    text.includes('sửa đổi, bổ sung') ||
    text.includes('sửa đổi bổ sung') ||
    text.includes('sửa đổi') ||
    text.includes('bổ sung') ||
    text.includes('thay thế') ||
    text.includes('điều chỉnh thông tin') ||
    text.includes('thay đổi thông tin')
  ) {
    return 'Sửa đổi, bổ sung';
  }

  // 3. Kiểm tra từ khóa ban hành mới
  if (
    text.includes('ban hành mới') ||
    text.includes('công bố mới') ||
    text.includes('mới ban hành') ||
    text.includes('thành lập mới')
  ) {
    return 'Ban hành mới';
  }

  return 'Hiện hành';
}

/**
 * Lấy ngày tháng ghi nhận hiệu lực / ban hành của thủ tục
 */
export function getProcedureDate(p: Procedure): Date {
  if (p.ngayBanHanh) {
    const d = new Date(p.ngayBanHanh);
    if (!isNaN(d.getTime())) return d;
  }

  // Tìm kiếm ngày trong Căn cứ pháp lý (VD: ngày 25/11/2021 hoặc 25-11-2021 hoặc 2026)
  if (p.canCuPhapLy) {
    const match = p.canCuPhapLy.match(/ngày\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Fallback sang ngayCapNhat hoặc ngayTao
  if (p.ngayCapNhat) {
    const d = new Date(p.ngayCapNhat);
    if (!isNaN(d.getTime())) return d;
  }

  if (p.ngayTao) {
    const d = new Date(p.ngayTao);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

/**
 * Trả về Quý (1, 2, 3, 4) của một ngày
 */
export function getQuarterFromDate(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/**
 * Lọc thủ tục theo kỳ báo cáo (Tháng, Quý, Năm)
 */
export interface BienDongFilterOptions {
  periodType: 'quarter' | 'month' | 'year' | 'all';
  quarter: number; // 1, 2, 3, 4
  month: number; // 1 - 12
  year: number; // e.g. 2026
  capThucHien?: string;
  linhVuc?: string;
  statusFilter?: 'all' | 'bien_dong' | TrangThaiBienDong; // 'bien_dong' là chỉ lấy SĐBS & Bãi bỏ & Ban hành mới
}

export function filterProceduresForReport(
  procedures: Procedure[],
  options: BienDongFilterOptions
): Procedure[] {
  return procedures.filter(p => {
    // 1. Lọc theo trạng thái
    const status = getProcedureTrangThai(p);
    if (options.statusFilter === 'bien_dong') {
      if (status === 'Hiện hành') return false;
    } else if (options.statusFilter && options.statusFilter !== 'all') {
      if (status !== options.statusFilter) return false;
    }

    // 2. Lọc theo cấp thực hiện
    if (options.capThucHien && options.capThucHien !== 'all') {
      if (p.capThucHien !== options.capThucHien && !p.capThucHien.includes(options.capThucHien)) {
        return false;
      }
    }

    // 3. Lọc theo lĩnh vực
    if (options.linhVuc && options.linhVuc !== 'all') {
      if (p.linhVuc !== options.linhVuc) return false;
    }

    // 4. Lọc theo thời gian
    if (options.periodType === 'all') return true;

    const date = getProcedureDate(p);
    const procYear = date.getFullYear();

    // Nếu chọn năm cụ thể
    if (options.year && procYear !== options.year) {
      // Cho phép linh hoạt nếu dữ liệu không có năm khớp mà chọn all
      return false;
    }

    if (options.periodType === 'year') {
      return procYear === options.year;
    }

    if (options.periodType === 'quarter') {
      const procQuarter = getQuarterFromDate(date);
      return procQuarter === options.quarter;
    }

    if (options.periodType === 'month') {
      const procMonth = date.getMonth() + 1;
      return procMonth === options.month;
    }

    return true;
  });
}

/**
 * Thống kê tổng hợp số liệu biến động
 */
export interface BienDongStatsSummary {
  total: number;
  suaDoi: number;
  baiBo: number;
  banHanhMoi: number;
  hienHanh: number;
  tongBienDong: number;
  byLinhVuc: Record<string, {
    total: number;
    suaDoi: number;
    baiBo: number;
    banHanhMoi: number;
    hienHanh: number;
  }>;
  byCap: Record<string, {
    total: number;
    suaDoi: number;
    baiBo: number;
    banHanhMoi: number;
  }>;
}

export function computeBienDongStats(procedures: Procedure[]): BienDongStatsSummary {
  let suaDoi = 0;
  let baiBo = 0;
  let banHanhMoi = 0;
  let hienHanh = 0;

  const byLinhVuc: BienDongStatsSummary['byLinhVuc'] = {};
  const byCap: BienDongStatsSummary['byCap'] = {};

  procedures.forEach(p => {
    const status = getProcedureTrangThai(p);
    if (status === 'Sửa đổi, bổ sung') suaDoi++;
    else if (status === 'Bãi bỏ') baiBo++;
    else if (status === 'Ban hành mới') banHanhMoi++;
    else hienHanh++;

    // Group by lĩnh vực
    const lv = p.linhVuc || 'Chưa phân loại';
    if (!byLinhVuc[lv]) {
      byLinhVuc[lv] = { total: 0, suaDoi: 0, baiBo: 0, banHanhMoi: 0, hienHanh: 0 };
    }
    byLinhVuc[lv].total++;
    if (status === 'Sửa đổi, bổ sung') byLinhVuc[lv].suaDoi++;
    else if (status === 'Bãi bỏ') byLinhVuc[lv].baiBo++;
    else if (status === 'Ban hành mới') byLinhVuc[lv].banHanhMoi++;
    else byLinhVuc[lv].hienHanh++;

    // Group by cấp thực hiện
    const cap = p.capThucHien || 'Khác';
    if (!byCap[cap]) {
      byCap[cap] = { total: 0, suaDoi: 0, baiBo: 0, banHanhMoi: 0 };
    }
    byCap[cap].total++;
    if (status === 'Sửa đổi, bổ sung') byCap[cap].suaDoi++;
    else if (status === 'Bãi bỏ') byCap[cap].baiBo++;
    else if (status === 'Ban hành mới') byCap[cap].banHanhMoi++;
  });

  return {
    total: procedures.length,
    suaDoi,
    baiBo,
    banHanhMoi,
    hienHanh,
    tongBienDong: suaDoi + baiBo + banHanhMoi,
    byLinhVuc,
    byCap
  };
}

/**
 * Xuất file Excel Báo cáo tổng hợp biến động TTHC theo Tháng, Quý
 */
export async function exportBienDongExcelReport({
  procedures,
  filterOptions,
  agencyName = 'ỦY BAN NHÂN DÂN',
  reportTitle
}: {
  procedures: Procedure[];
  filterOptions: BienDongFilterOptions;
  agencyName?: string;
  reportTitle?: string;
}): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống Quản lý TTHC & DVC';
  workbook.created = new Date();

  // Xác định tiêu đề kỳ báo cáo
  let periodText = '';
  if (filterOptions.periodType === 'quarter') {
    periodText = `QUÝ ${filterOptions.quarter} NĂM ${filterOptions.year}`;
  } else if (filterOptions.periodType === 'month') {
    periodText = `THÁNG ${filterOptions.month} NĂM ${filterOptions.year}`;
  } else if (filterOptions.periodType === 'year') {
    periodText = `NĂM ${filterOptions.year}`;
  } else {
    periodText = `TOÀN THỜI KỲ (TÍNH ĐẾN ${new Date().toLocaleDateString('vi-VN')})`;
  }

  const defaultTitle = `BÁO CÁO TỔNG HỢP DANH MỤC THỦ TỤC HÀNH CHÍNH BAN HÀNH MỚI, SỬA ĐỔI, BỔ SUNG, BÃI BỎ`;
  const fullTitle = reportTitle || `${defaultTitle} ${periodText}`;

  // SHEET 1: BÁO CÁO TỔNG HỢP
  const ws = workbook.addWorksheet('TongHop_BienDong_TTHC');

  // Đặt chiều rộng các cột
  ws.columns = [
    { key: 'A', width: 8 },  // STT
    { key: 'B', width: 16 }, // Mã TTHC
    { key: 'C', width: 45 }, // Tên TTHC
    { key: 'D', width: 22 }, // Lĩnh vực
    { key: 'E', width: 16 }, // Cấp thực hiện
    { key: 'F', width: 20 }, // Hình thức biến động
    { key: 'G', width: 35 }, // Quyết định / Căn cứ pháp lý
    { key: 'H', width: 15 }, // Ngày hiệu lực
  ];

  // 1. Tiêu đề cơ quan & Quốc hiệu
  ws.mergeCells('A1:C1');
  const cellOrg = ws.getCell('A1');
  cellOrg.value = agencyName.toUpperCase();
  cellOrg.font = { name: 'Times New Roman', size: 11, bold: true };
  cellOrg.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('E1:H1');
  const cellQH = ws.getCell('E1');
  cellQH.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  cellQH.font = { name: 'Times New Roman', size: 11, bold: true };
  cellQH.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:C2');
  const cellSubOrg = ws.getCell('A2');
  cellSubOrg.value = 'BỘ PHẬN TIẾP NHẬN & TRẢ KẾT QUẢ';
  cellSubOrg.font = { name: 'Times New Roman', size: 10, italic: true };
  cellSubOrg.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('E2:H2');
  const cellTN = ws.getCell('E2');
  cellTN.value = 'Độc lập - Tự do - Hạnh phúc';
  cellTN.font = { name: 'Times New Roman', size: 11, bold: true, underline: true };
  cellTN.alignment = { horizontal: 'center', vertical: 'middle' };

  // Dòng 4: Tiêu đề Báo cáo
  ws.mergeCells('A4:H4');
  const cellTitle = ws.getCell('A4');
  cellTitle.value = fullTitle;
  cellTitle.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF990000' } };
  cellTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  // Dòng 5: Thời điểm kết xuất
  ws.mergeCells('A5:H5');
  const cellDate = ws.getCell('A5');
  cellDate.value = `(Kỳ báo cáo: ${periodText} - Thời điểm trích xuất dữ liệu: ${new Date().toLocaleDateString('vi-VN')})`;
  cellDate.font = { name: 'Times New Roman', size: 10, italic: true };
  cellDate.alignment = { horizontal: 'center', vertical: 'middle' };

  let curRow = 7;

  // PHẦN I: BẢNG TỔNG HỢP SỐ LIỆU THEO LĨNH VỰC
  ws.mergeCells(`A${curRow}:H${curRow}`);
  const part1Header = ws.getCell(`A${curRow}`);
  part1Header.value = 'I. TỔNG HỢP SỐ LIỆU BIẾN ĐỘNG THỦ TỤC HÀNH CHÍNH THEO LĨNH VỰC';
  part1Header.font = { name: 'Times New Roman', size: 12, bold: true };
  curRow += 1;

  // Header bảng phần 1
  const th1 = [
    'STT',
    'Lĩnh vực quản lý',
    'Tổng số TTHC',
    'Ban hành mới',
    'Sửa đổi, bổ sung',
    'Bãi bỏ',
    'Đang hiện hành',
    'Ghi chú'
  ];

  const headerRow1 = ws.getRow(curRow);
  th1.forEach((t, i) => {
    const colLetter = String.fromCharCode(65 + i);
    const c = ws.getCell(`${colLetter}${curRow}`);
    c.value = t;
    c.font = { name: 'Times New Roman', size: 11, bold: true };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };
    c.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  headerRow1.height = 28;
  curRow += 1;

  const stats = computeBienDongStats(procedures);
  const lvList = Object.keys(stats.byLinhVuc).sort();

  lvList.forEach((lvName, idx) => {
    const item = stats.byLinhVuc[lvName];
    const r = ws.getRow(curRow);
    r.values = [
      idx + 1,
      lvName,
      item.total,
      item.banHanhMoi || 0,
      item.suaDoi || 0,
      item.baiBo || 0,
      item.hienHanh || 0,
      ''
    ];
    for (let c = 1; c <= 8; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Times New Roman', size: 11 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      if (c === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      else if (c === 2) cell.alignment = { horizontal: 'left', vertical: 'middle' };
      else cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    curRow += 1;
  });

  // Dòng Tổng cộng phần 1
  const totalRow1 = ws.getRow(curRow);
  totalRow1.values = [
    '',
    'TỔNG CỘNG',
    stats.total,
    stats.banHanhMoi,
    stats.suaDoi,
    stats.baiBo,
    stats.hienHanh,
    ''
  ];
  for (let c = 1; c <= 8; c++) {
    const cell = totalRow1.getCell(c);
    cell.font = { name: 'Times New Roman', size: 11, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    if (c === 2) cell.alignment = { horizontal: 'center', vertical: 'middle' };
    else cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  curRow += 3;

  // PHẦN II: DANH MỤC CHI TIẾT TTHC BIẾN ĐỘNG
  ws.mergeCells(`A${curRow}:H${curRow}`);
  const part2Header = ws.getCell(`A${curRow}`);
  part2Header.value = 'II. DANH MỤC CHI TIẾT CÁC THỦ TỤC HÀNH CHÍNH BAN HÀNH MỚI, SỬA ĐỔI, BỔ SUNG, BÃI BỎ';
  part2Header.font = { name: 'Times New Roman', size: 12, bold: true };
  curRow += 1;

  const th2 = [
    'STT',
    'Mã TTHC',
    'Tên thủ tục hành chính',
    'Lĩnh vực',
    'Cấp thực hiện',
    'Hình thức biến động',
    'Quyết định / Căn cứ pháp lý',
    'Ngày hiệu lực'
  ];

  const headerRow2 = ws.getRow(curRow);
  th2.forEach((t, i) => {
    const colLetter = String.fromCharCode(65 + i);
    const c = ws.getCell(`${colLetter}${curRow}`);
    c.value = t;
    c.font = { name: 'Times New Roman', size: 11, bold: true };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8FAFC' }
    };
    c.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  headerRow2.height = 28;
  curRow += 1;

  // Chỉ lấy các thủ tục có biến động (Sửa đổi, bổ sung / Bãi bỏ / Ban hành mới) hoặc danh sách đang lọc
  const bienDongList = procedures.filter(p => {
    const st = getProcedureTrangThai(p);
    return st === 'Sửa đổi, bổ sung' || st === 'Bãi bỏ' || st === 'Ban hành mới';
  });

  const displayList = bienDongList.length > 0 ? bienDongList : procedures;

  displayList.forEach((p, idx) => {
    const r = ws.getRow(curRow);
    const st = getProcedureTrangThai(p);
    const pDate = getProcedureDate(p);
    const dateFormatted = pDate.toLocaleDateString('vi-VN');

    r.values = [
      idx + 1,
      p.maTthc,
      p.tenTthc,
      p.linhVuc,
      p.capThucHien,
      st,
      p.canCuPhapLy || 'Quy định hiện hành',
      dateFormatted
    ];

    for (let c = 1; c <= 8; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Times New Roman', size: 11 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      if (c === 1 || c === 2 || c === 5 || c === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (st === 'Bãi bỏ') {
          cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFB91C1C' } };
        } else if (st === 'Sửa đổi, bổ sung') {
          cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFB45309' } };
        } else if (st === 'Ban hành mới') {
          cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF047857' } };
        }
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
    }
    curRow += 1;
  });

  curRow += 2;

  // PHẦN CHỮ KÝ
  ws.mergeCells(`A${curRow}:C${curRow}`);
  const cellSign1 = ws.getCell(`A${curRow}`);
  cellSign1.value = 'NGƯỜI LẬP BIỂU';
  cellSign1.font = { name: 'Times New Roman', size: 11, bold: true };
  cellSign1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`E${curRow}:H${curRow}`);
  const cellSign2 = ws.getCell(`E${curRow}`);
  cellSign2.value = 'THỦ TRƯỞNG ĐƠN VỊ';
  cellSign2.font = { name: 'Times New Roman', size: 11, bold: true };
  cellSign2.alignment = { horizontal: 'center', vertical: 'middle' };

  curRow += 1;
  ws.mergeCells(`A${curRow}:C${curRow}`);
  const cellSignSub1 = ws.getCell(`A${curRow}`);
  cellSignSub1.value = '(Ký, ghi rõ họ tên)';
  cellSignSub1.font = { name: 'Times New Roman', size: 10, italic: true };
  cellSignSub1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`E${curRow}:H${curRow}`);
  const cellSignSub2 = ws.getCell(`E${curRow}`);
  cellSignSub2.value = '(Ký, đóng dấu, ghi rõ họ tên)';
  cellSignSub2.font = { name: 'Times New Roman', size: 10, italic: true };
  cellSignSub2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Xuất file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const cleanPeriod = periodText.toLowerCase().replace(/\s+/g, '_');
  const filename = `Bao_cao_tong_hop_bien_dong_TTHC_${cleanPeriod}.xlsx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
