import ExcelJS from 'exceljs';
import { Procedure } from '../types';

export interface ColumnMapping {
  stt?: number;
  maTthc?: number;
  tenTthc?: number;
  linhVuc?: number;
  soNganh?: number;
  capThucHien?: number;
  canCuPhapLy?: number;
  ghiChu?: number;
  bcciTiepNhan?: number;
  bcciTraKetQua?: number;
  motCua?: number;
  dvcttLoai?: number;
  dungChung?: number;
}

export interface ParseResult {
  procedures: Procedure[];
  warnings: string[];
  totalParsed: number;
  discoveredLinhVuc: string[];
  discoveredSoNganh: string[];
}

/**
 * An toàn trích xuất chuỗi từ ô Excel (xử lý RichText, Formula, Hyperlink, Date, Number, Boolean)
 */
export function getCellString(cell: ExcelJS.Cell | any): string {
  if (!cell) return '';
  if (cell.value === null || cell.value === undefined) return '';

  const val = cell.value;

  // Xử lý object phức tạp
  if (typeof val === 'object') {
    if (val.text !== undefined) return String(val.text).trim();
    if (val.richText && Array.isArray(val.richText)) {
      return val.richText.map((t: any) => t.text || '').join('').trim();
    }
    if (val.result !== undefined) return String(val.result).trim();
    if (val.hyperlink && val.text) return String(val.text).trim();
    if (val.hyperlink) return String(val.hyperlink).trim();
    return JSON.stringify(val);
  }

  // Xử lý kiểu số (ví dụ mã TTHC số hoặc dạng 1.000234)
  if (typeof val === 'number') {
    return String(val).trim();
  }

  return String(val).trim();
}

/**
 * Chuẩn hóa Cấp thực hiện
 */
export function normalizeCapThucHien(raw: string, fallback: string = 'Cấp xã'): string {
  if (!raw || !raw.trim()) return fallback;
  const s = raw.trim().toLowerCase();
  if (
    (s.includes('xã') || s.includes('xa')) &&
    (s.includes('tỉnh') || s.includes('tinh') || s.includes('thành phố') || s.includes('thanh pho') || s.includes('tp'))
  ) {
    return 'Cấp xã, Thành phố';
  }
  if (s.includes('liên thông') || s.includes('lien thong')) {
    return 'TTHC liên thông';
  }
  if (s.includes('xã') || s.includes('xa') || s.includes('phường') || s.includes('thị trấn')) {
    return 'Cấp xã';
  }
  if (s.includes('thành phố') || s.includes('thanh pho') || s.includes('tỉnh') || s.includes('tinh') || s.includes('tp') || s.includes('cấp tỉnh')) {
    return 'Thành phố';
  }
  if (s.includes('huyện') || s.includes('huyen') || s.includes('quận') || s.includes('thị xã')) {
    return 'Cấp huyện';
  }
  return raw.trim();
}

/**
 * Chuẩn hóa hình thức Dịch vụ công trực tuyến
 */
export function normalizeDvctt(raw: any): 'Toàn trình' | 'Một phần' | 'Không' {
  if (!raw) return 'Không';
  const s = String(raw).trim().toLowerCase();
  if (s.includes('toàn trình') || s.includes('toan trinh') || s === 'tt' || s === 'toàn' || s === 'dvctt toàn trình') {
    return 'Toàn trình';
  }
  if (s.includes('một phần') || s.includes('mot phan') || s === 'mp' || s === 'phần' || s === 'dvctt một phần') {
    return 'Một phần';
  }
  if (s.includes('không') || s.includes('khong') || s === 'k' || s === 'offline') {
    return 'Không';
  }
  return 'Không';
}

/**
 * Chuẩn hóa giá trị Có/Không (Boolean)
 */
export function normalizeBoolean(raw: any): boolean {
  if (!raw) return false;
  const s = String(raw).trim().toLowerCase();
  return (
    s === 'x' ||
    s === 'v' ||
    s === '1' ||
    s === 'true' ||
    s === 'có' ||
    s === 'co' ||
    s === 'yes' ||
    s === 'đúng' ||
    s === 'dung' ||
    s === 'áp dụng' ||
    s.includes('tiếp nhận') ||
    s.includes('trả')
  );
}

/**
 * Chuẩn hóa tên Lĩnh vực: Loại bỏ tiền tố rác, viết hoa chữ cái đầu
 */
export function cleanLinhVuc(raw: string): string {
  if (!raw || !raw.trim()) return '';

  let cleaned = raw.trim();

  // Bỏ tiền tố số La Mã hoặc số thứ tự ở đầu (ví dụ: "I. Lĩnh vực...", "1. Lĩnh vực...")
  cleaned = cleaned.replace(/^(Phần|Mục)?\s*([I|V|X|0-9]+|[A-Z])[\.\:\s\-]+/i, '').trim();

  // Bỏ từ "Lĩnh vực" / "Chuyên ngành" / "Ngành" ở đầu
  cleaned = cleaned.replace(/^(Lĩnh\s*vực|Linh\s*vuc|Chuyên\s*ngành|Chuyen\s*nganh|Ngành|Nganh)[\s\:\-]+/i, '').trim();

  // Bỏ các ký tự thừa ở cuối như dấu ngoặc số thủ tục (ví dụ: "(12 thủ tục)")
  cleaned = cleaned.replace(/\s*\(\d+\s*thủ\s*tục\)$/i, '').trim();

  if (!cleaned) return raw.trim();

  // Chuẩn hóa viết hoa chữ cái đầu, giữ nguyên dấu tiếng Việt
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Kiểm tra xem một dòng có phải là dòng phân nhóm Lĩnh vực (Section Subheader) hay không
 * Ví dụ: "I. LĨNH VỰC HỘ TỊCH", "LĨNH VỰC ĐẤT ĐAI", "Phần I: Lĩnh vực Chứng thực"
 */
export function detectSectionLinhVuc(fullRowLine: string, firstCell: string, secondCell: string): string | null {
  const line = fullRowLine.trim();
  const upper = line.toUpperCase();

  // Mẫu 1: Dòng bắt đầu bằng hoặc chứa "LĨNH VỰC" với độ dài ngắn (thường là tiêu đề nhóm)
  const linhVucRegex = /(?:^|\s)(?:Phần|Mục)?\s*(?:[I|V|X|0-9]+|[A-Z])?[\.\:\s\-]*(?:LĨNH VỰC|LINH VUC)[\s\:\-]+([^;,\n]+)/i;
  const match = line.match(linhVucRegex);
  if (match && match[1]) {
    const candidate = cleanLinhVuc(match[1]);
    if (candidate.length > 1 && candidate.length < 80) {
      return candidate;
    }
  }

  // Mẫu 2: Toàn bộ dòng chỉ có "LĨNH VỰC ..."
  if (upper.startsWith('LĨNH VỰC') || upper.startsWith('LINH VUC')) {
    const candidate = cleanLinhVuc(line);
    if (candidate.length > 1 && candidate.length < 80) {
      return candidate;
    }
  }

  // Mẫu 3: Ô 1 là số La Mã (I, II, III, IV, V...) hoặc chữ cái (A, B, C...) và ô 2 là tên chuyên ngành
  const firstUpper = firstCell.trim().toUpperCase();
  const secondUpper = secondCell.trim().toUpperCase();
  const romanPattern = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|[A-E])[\.\:]?$/;

  if (romanPattern.test(firstUpper) && secondUpper.length >= 3 && secondUpper.length < 50) {
    // Kiểm tra ô 2 có chứa chữ "LĨNH VỰC" hoặc là tên một ngành hành chính
    if (
      secondUpper.includes('LĨNH VỰC') ||
      secondUpper.includes('HỘ TỊCH') ||
      secondUpper.includes('CHỨNG THỰC') ||
      secondUpper.includes('ĐẤT ĐAI') ||
      secondUpper.includes('MÔI TRƯỜNG') ||
      secondUpper.includes('XÂY DỰNG') ||
      secondUpper.includes('TƯ PHÁP') ||
      secondUpper.includes('NỘI VỤ') ||
      secondUpper.includes('LAO ĐỘNG') ||
      secondUpper.includes('BẢO TRỢ') ||
      secondUpper.includes('VĂN HÓA') ||
      secondUpper.includes('GIÁO DỤC') ||
      secondUpper.includes('Y TẾ') ||
      secondUpper.includes('CÔNG THƯƠNG') ||
      secondUpper.includes('GIAO THÔNG')
    ) {
      return cleanLinhVuc(secondCell);
    }
  }

  return null;
}

/**
 * Kiểm tra xem một dòng có phải là dòng rác cần bỏ qua hay không
 * (Ví dụ: dòng đánh số cột (1), (2), (3), dòng chữ ký TM. UBND, dòng tổng số)
 */
export function isNoiseRow(rowText: string, firstCell: string, secondCell: string): boolean {
  const upper = rowText.toUpperCase().trim();
  if (!upper) return true;

  // Dòng đánh số thứ tự cột theo thể thức văn bản: (1) (2) (3) (4)...
  const parenColNumPattern = /^\(?\s*1\s*\)?\s*[\t|,\s]+\(?\s*2\s*\)?\s*[\t|,\s]+\(?\s*3\s*\)?/i;
  if (parenColNumPattern.test(rowText.trim())) return true;

  // Kiểm tra nếu các ô đầu chỉ là (1), (2), (3)...
  if (/^\(?\s*[1-9]\s*\)?$/.test(firstCell.trim()) && /^\(?\s*[2-9]\s*\)?$/.test(secondCell.trim())) {
    return true;
  }

  // Dòng tiêu đề lặp lại hoặc chữ ký kết thúc văn bản
  if (
    upper.startsWith('TM. ') ||
    upper.startsWith('TM.') ||
    upper.startsWith('KT. ') ||
    upper.startsWith('KT.') ||
    upper.startsWith('CHỦ TỊCH') ||
    upper.startsWith('PHÓ CHỦ TỊCH') ||
    upper.startsWith('GIÁM ĐỐC') ||
    upper.startsWith('NƠI NHẬN:') ||
    upper.startsWith('NOI NHAN:') ||
    upper.startsWith('TỔNG CỘNG:') ||
    upper.startsWith('TONG CONG:') ||
    upper.startsWith('TỔNG SỐ:') ||
    upper.startsWith('TONG SO:') ||
    upper.startsWith('DANH MỤC THỦ TỤC HÀNH CHÍNH') ||
    upper.startsWith('DANH SACH THU TUC') ||
    upper.startsWith('CỘNG HÒA XÃ HỘI CHỦ NGHĨA') ||
    upper.startsWith('ỦY BAN NHÂN DÂN') ||
    upper.startsWith('UY BAN NHAN DAN')
  ) {
    return true;
  }

  return false;
}

/**
 * Bóc tách và chuẩn hóa thông minh Mã TTHC và Tên TTHC
 * - Phát hiện và tự động hoán đổi nếu cột Mã và Tên bị đảo ngược
 * - Tách Mã TTHC nếu nằm lẫn bên trong chuỗi Tên TTHC
 * - Tách Căn cứ pháp lý (Quyết định số...) nếu nằm bên trong ngoặc đơn của Tên
 */
export function extractMaAndTenTthc(
  rawMa: string,
  rawTen: string,
  fallbackIndex: number = 1
): { maTthc: string; tenTthc: string; canCuExtra?: string; qrLinkExtra?: string } {
  let ma = (rawMa || '').trim();
  let ten = (rawTen || '').trim();
  let canCuExtra: string | undefined = undefined;
  let qrLinkExtra: string | undefined = undefined;

  // 1. KIỂM TRA ĐẢO CỘT (Column Inversion Detection)
  // Nếu ô "ma" thực chất là tên thủ tục dài (tiếng Việt có dấu cách > 35 ký tự hoặc > 4 từ)
  // và ô "ten" thực chất là mã ngắn (< 30 ký tự, có dạng số hoặc mã ký hiệu không dấu cách)
  const isMaActuallyName = ma.length > 35 || (ma.includes(' ') && ma.split(' ').length >= 5);
  const isTenActuallyCode = ten.length > 0 && ten.length <= 30 && !ten.includes(' ') && /[0-9\.\-_]/.test(ten);

  if (isMaActuallyName && isTenActuallyCode) {
    const temp = ma;
    ma = ten;
    ten = temp;
  }

  // 2. NẾU MÃ BỊ TRỐNG HOẶC CHỈ LÀ SỐ THỨ TỰ THÔ THIỂN (1, 2, 3...)
  // Hãy thử tìm Mã TTHC nằm lẫn bên trong Tên thủ tục
  const isMaInvalid = !ma || /^\d{1,3}$/.test(ma);

  // Các mẫu mã TTHC thường gặp trong tên:
  // - [1.000234] Đăng ký khai sinh...
  // - 1.000234.000.00.00.H42 - Đăng ký khai sinh...
  // - 1.000234: Đăng ký khai sinh...
  // - Đăng ký khai sinh (Mã: 1.000234) hoặc (Mã TTHC: 1.000234)
  const bracketCodeRegex = /^\[([0-9a-zA-Z\.\-_]{4,30})\]\s*(.*)$/;
  const prefixCodeRegex = /^([0-9a-zA-Z\.\-_]{5,35})\s*[\-:\.]\s+(.+)$/;
  const suffixCodeRegex = /^(.*?)\s*\(Mã\s*(?:TTHC|số)?[\s\:\.]+([0-9a-zA-Z\.\-_]{4,30})\)$/i;

  if (bracketCodeRegex.test(ten)) {
    const m = ten.match(bracketCodeRegex);
    if (m) {
      if (isMaInvalid) ma = m[1].trim();
      ten = m[2].trim();
    }
  } else if (prefixCodeRegex.test(ten)) {
    const m = ten.match(prefixCodeRegex);
    if (m) {
      // Chỉ nhận nếu phần đầu thực sự trông giống mã (chứa số và dấu chấm hoặc gạch)
      if (/[0-9]/.test(m[1]) && /[\.\-_]/.test(m[1])) {
        if (isMaInvalid) ma = m[1].trim();
        ten = m[2].trim();
      }
    }
  } else if (suffixCodeRegex.test(ten)) {
    const m = ten.match(suffixCodeRegex);
    if (m) {
      if (isMaInvalid) ma = m[2].trim();
      ten = m[1].trim();
    }
  }

  // 3. TÁCH CĂN CỨ PHÁP LÝ (Quyết định số...) NẰM Ở ĐUÔI TÊN THỦ TỤC
  const decisionRegex = /\((Quyết định[^)]+|Nghị định[^)]+|Luật[^)]+|Thông tư[^)]+)\)$/i;
  const decMatch = ten.match(decisionRegex);
  if (decMatch && decMatch[1]) {
    canCuExtra = decMatch[1].trim();
    ten = ten.replace(decisionRegex, '').trim();
  }

  // 3b. TÁCH LINK URL HOẶC NỘI DUNG MÃ QR NẰM LẪN TRONG TÊN THỦ TỤC
  const urlInTenRegex = /\s*\(?(https?:\/\/[^\s\)]+|www\.[^\s\)]+|(?:https?:\/\/)?(?:www\.)?dichvucong\.gov\.vn[^\s\)]*)\)?/i;
  const urlMatch = ten.match(urlInTenRegex);
  if (urlMatch && urlMatch[1]) {
    qrLinkExtra = urlMatch[1].trim();
    ten = ten.replace(urlInTenRegex, '').trim();
  }

  // Loại bỏ các nhãn link thừa trong tên thủ tục
  ten = ten
    .replace(/\s*\((?:Link|Mã QR|QR Code|QR|Đường dẫn|Nội dung QR|Ghi chú)[\s\:\-]+[^\)]*\)/gi, '')
    .replace(/\s*\(\s*https?:\/\/[^\)]+\)/gi, '')
    .replace(/\s*https?:\/\/[^\s\)]+/gi, '')
    .trim();

  // 4. LÀM SẠCH VÀ CHUẨN HÓA MÃ TTHC
  // Xóa tiền tố "Mã:", "Mã TTHC:" nếu còn sót
  ma = ma.replace(/^(Mã\s*TTHC|Mã\s*số|Mã)[\s\:\-]+/i, '').trim();

  // Nếu vẫn không có mã hợp lệ: Sinh mã chuẩn theo timestamp
  if (!ma || ma === 'null' || ma === 'undefined') {
    ma = `TTHC.${Date.now().toString().slice(-4)}.${String(fallbackIndex).padStart(3, '0')}`;
  }

  // 5. LÀM SẠCH VÀ CHUẨN HÓA TÊN THỦ TỤC
  ten = ten.replace(/^[\-:\.\s]+/, '').trim();
  if (!ten) {
    ten = `Thủ tục hành chính ${ma}`;
  }

  return { maTthc: ma, tenTthc: ten, canCuExtra, qrLinkExtra };
}

/**
 * Nhận diện dòng Header và ánh xạ các cột (Column Mapping)
 */
export function detectHeaderAndColumns(worksheet: ExcelJS.Worksheet): {
  headerRowIndex: number;
  colMap: ColumnMapping;
  departmentHint?: string;
  capHint?: string;
} {
  let headerRowIndex = -1;
  let bestColMap: ColumnMapping = {};
  let maxMatchedScore = 0;

  let departmentHint: string | undefined = undefined;
  let capHint: string | undefined = undefined;

  const maxScanRows = Math.min(20, worksheet.rowCount || 20);

  for (let r = 1; r <= maxScanRows; r++) {
    const row = worksheet.getRow(r);
    if (!row || !row.values) continue;

    const rowText = (Array.isArray(row.values)
      ? row.values.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(' ')
      : '').toUpperCase();

    // Thu thập gợi ý về Sở/Bộ quản lý từ phần đầu văn bản
    if (rowText.includes('THỦ TỤC HÀNH CHÍNH') && !rowText.includes('TÊN THỦ TỤC')) {
      if (rowText.includes('SỞ NỘI VỤ') || rowText.includes('BỘ NỘI VỤ')) departmentHint = 'Sở Nội vụ';
      else if (rowText.includes('SỞ TƯ PHÁP') || rowText.includes('BỘ TƯ PHÁP')) departmentHint = 'Sở Tư pháp';
      else if (rowText.includes('SỞ TÀI NGUYÊN') || rowText.includes('BỘ TÀI NGUYÊN')) departmentHint = 'Sở Tài nguyên và Môi trường';
      else if (rowText.includes('SỞ LAO ĐỘNG') || rowText.includes('BỘ LAO ĐỘNG')) departmentHint = 'Sở Lao động - Thương binh và Xã hội';
      else if (rowText.includes('SỞ VĂN HÓA') || rowText.includes('BỘ VĂN HÓA')) departmentHint = 'Sở Văn hóa, Thể thao và Du lịch';
      else if (rowText.includes('SỞ TÀI CHÍNH') || rowText.includes('BỘ TÀI CHÍNH')) departmentHint = 'Sở Tài chính';
      else if (rowText.includes('SỞ NÔNG NGHIỆP') || rowText.includes('BỘ NÔNG NGHIỆP')) departmentHint = 'Sở Nông nghiệp và PTNT';
      else if (rowText.includes('SỞ KẾ HOẠCH') || rowText.includes('BỘ KẾ HOẠCH')) departmentHint = 'Sở Kế hoạch và Đầu tư';
      else if (rowText.includes('SỞ XÂY DỰNG') || rowText.includes('BỘ XÂY DỰNG')) departmentHint = 'Sở Xây dựng';
      else if (rowText.includes('SỞ Y TẾ') || rowText.includes('BỘ Y TẾ')) departmentHint = 'Sở Y tế';

      if (rowText.includes('CẤP XÃ')) capHint = 'Cấp xã';
      else if (rowText.includes('CẤP HUYỆN')) capHint = 'Cấp huyện';
      else if (rowText.includes('THÀNH PHỐ') || rowText.includes('CẤP TỈNH')) capHint = 'Thành phố';
    }

    const currentMap: ColumnMapping = {};
    let currentScore = 0;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const raw = getCellString(cell).toLowerCase().trim();
      if (!raw) return;

      // 1. Cột STT
      if (raw === 'stt' || raw === 'tt' || raw === 'số tt' || raw === 'số thứ tự' || raw === 'no') {
        currentMap.stt = colNumber;
        currentScore += 1;
      }
      // 2. Cột TÊN THỦ TỤC (Ưu tiên kiểm tra trước để tránh nhầm với "Mã thủ tục")
      else if (
        raw.includes('tên thủ tục') ||
        raw.includes('tên tthc') ||
        raw.includes('tên dịch vụ') ||
        raw.includes('nội dung thủ tục') ||
        raw.includes('nội dung tthc') ||
        raw === 'tentthc' ||
        raw === 'ten_tthc' ||
        raw === 'thủ tục hành chính'
      ) {
        currentMap.tenTthc = colNumber;
        currentScore += 4;
      }
      // 3. Cột MÃ THỦ TỤC
      else if (
        raw.includes('mã tthc') ||
        raw.includes('mã thủ tục') ||
        raw.includes('mã số tthc') ||
        raw.includes('mã số thủ tục') ||
        raw.includes('mã số') ||
        raw.includes('mã dvc') ||
        raw.includes('mã dịch vụ') ||
        raw.includes('mã quy trình') ||
        raw === 'mã' ||
        raw === 'matthc' ||
        raw === 'ma_tthc' ||
        raw === 'code'
      ) {
        currentMap.maTthc = colNumber;
        currentScore += 4;
      }
      // 4. Cột LĨNH VỰC
      else if (
        raw.includes('lĩnh vực') ||
        raw.includes('chuyên ngành') ||
        raw === 'linhvuc' ||
        raw === 'linh_vuc' ||
        raw.includes('ngành / lĩnh vực')
      ) {
        currentMap.linhVuc = colNumber;
        currentScore += 3;
      }
      // 5. Cột SỞ, NGÀNH, CƠ QUAN
      else if (
        raw.includes('bộ, ngành') ||
        raw.includes('sở, ngành') ||
        raw.includes('cơ quan') ||
        raw.includes('đơn vị thực hiện') ||
        raw.includes('đơn vị quản lý')
      ) {
        currentMap.soNganh = colNumber;
        currentScore += 2;
      }
      // 6. Cột CẤP THỰC HIỆN
      else if (
        raw.includes('cấp thực hiện') ||
        raw.includes('thẩm quyền') ||
        raw.includes('cấp giải quyết') ||
        raw === 'cấp'
      ) {
        currentMap.capThucHien = colNumber;
        currentScore += 2;
      }
      // 7. Cột CĂN CỨ PHÁP LÝ
      else if (
        raw.includes('căn cứ') ||
        raw.includes('pháp lý') ||
        raw.includes('quyết định') ||
        raw.includes('văn bản')
      ) {
        currentMap.canCuPhapLy = colNumber;
        currentScore += 1;
      }
      // 8. Cột NỘI DUNG QR / LINK / GHI CHÚ
      else if (
        raw.includes('qr') ||
        raw.includes('qrcode') ||
        raw.includes('mã qr') ||
        raw.includes('link') ||
        raw.includes('đường dẫn') ||
        raw.includes('ghi chú')
      ) {
        currentMap.ghiChu = colNumber;
        currentScore += 1;
      }
      // 9. BCCI Tiếp nhận
      else if (raw.includes('tiếp nhận') || raw.includes('bcci tiếp nhận')) {
        currentMap.bcciTiepNhan = colNumber;
        currentScore += 1;
      }
      // 10. BCCI Trả kết quả
      else if (raw.includes('trả kết quả') || raw.includes('bcci trả')) {
        currentMap.bcciTraKetQua = colNumber;
        currentScore += 1;
      }
      // 11. Một cửa
      else if (raw.includes('một cửa') || raw.includes('mot cua')) {
        currentMap.motCua = colNumber;
        currentScore += 1;
      }
      // 12. DVCTT
      else if (raw.includes('dvctt') || raw.includes('trực tuyến') || raw.includes('toàn trình')) {
        currentMap.dvcttLoai = colNumber;
        currentScore += 1;
      }
      // 13. Dùng chung
      else if (raw.includes('dùng chung') || raw.includes('dung chung')) {
        currentMap.dungChung = colNumber;
        currentScore += 1;
      }
    });

    if (currentScore > maxMatchedScore) {
      maxMatchedScore = currentScore;
      bestColMap = currentMap;
      headerRowIndex = r;
    }

    // Nếu tìm thấy cả tên thủ tục và mã TTHC (score >= 8), đây chính là Header row!
    if (currentMap.tenTthc && currentMap.maTthc) {
      headerRowIndex = r;
      bestColMap = currentMap;
      break;
    }
  }

  // Nếu không tìm thấy header rõ ràng: Sử dụng bố cục chuẩn theo mẫu hệ thống
  if (headerRowIndex === -1 || maxMatchedScore < 3) {
    headerRowIndex = 1;
    bestColMap = {
      stt: 1,
      maTthc: 2,
      tenTthc: 3,
      linhVuc: 4,
      soNganh: 5,
      capThucHien: 6,
      canCuPhapLy: 7,
      ghiChu: 8,
      bcciTiepNhan: 9,
      bcciTraKetQua: 10,
      motCua: 11,
      dvcttLoai: 12,
      dungChung: 13
    };
  }

  return {
    headerRowIndex,
    colMap: bestColMap,
    departmentHint,
    capHint
  };
}

/**
 * PARSER CHÍNH: Phân tích toàn bộ Workbook thành danh sách Thủ tục hành chính chuẩn xác
 */
export function parseWorkbookToProcedures(workbook: ExcelJS.Workbook): ParseResult {
  const warnings: string[] = [];
  const results: Procedure[] = [];
  const discoveredLinhVuc = new Set<string>();
  const discoveredSoNganh = new Set<string>();

  let sheetCount = 0;

  workbook.eachSheet((worksheet) => {
    sheetCount++;
    const sheetName = worksheet.name.trim();

    const { headerRowIndex, colMap, departmentHint, capHint } = detectHeaderAndColumns(worksheet);

    let activeLinhVuc = sheetName !== 'Tổng hợp' && sheetName !== 'Sheet1' && sheetName.length < 30 ? cleanLinhVuc(sheetName) : '';
    let inheritedVerticalLinhVuc = '';

    // Bắt đầu duyệt dữ liệu từ hàng sau Header
    for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      if (!row || !row.values) continue;

      // Chuỗi toàn bộ dòng để kiểm tra
      const rowValuesArr = Array.isArray(row.values) ? row.values : Object.values(row.values);
      const rowText = rowValuesArr
        .map(v => typeof v === 'object' ? JSON.stringify(v) : String(v))
        .join(' ')
        .trim();

      if (!rowText || rowText === 'null' || rowText === 'undefined') continue;

      const firstCell = getCellString(row.getCell(1));
      const secondCell = getCellString(row.getCell(2));

      // 1. Kiểm tra nếu dòng là DÒNG RÁC: bỏ qua ngay
      if (isNoiseRow(rowText, firstCell, secondCell)) {
        continue;
      }

      // 2. Kiểm tra nếu dòng là TIÊU ĐỀ PHÂN NHÓM LĨNH VỰC (Section Subheader)
      // Ví dụ: "I. LĨNH VỰC HỘ TỊCH", "LĨNH VỰC ĐẤT ĐAI"
      const detectedSectionLinhVuc = detectSectionLinhVuc(rowText, firstCell, secondCell);
      if (detectedSectionLinhVuc) {
        activeLinhVuc = detectedSectionLinhVuc;
        inheritedVerticalLinhVuc = detectedSectionLinhVuc;
        discoveredLinhVuc.add(detectedSectionLinhVuc);
        continue; // Bỏ qua dòng này, không tạo thủ tục
      }

      // 3. Đọc dữ liệu từ các cột theo colMap
      const rawMa = colMap.maTthc ? getCellString(row.getCell(colMap.maTthc)) : '';
      const rawTen = colMap.tenTthc ? getCellString(row.getCell(colMap.tenTthc)) : '';
      let rawLinhVuc = colMap.linhVuc ? getCellString(row.getCell(colMap.linhVuc)) : '';
      const rawSoNganh = colMap.soNganh ? getCellString(row.getCell(colMap.soNganh)) : '';
      const rawCapThucHien = colMap.capThucHien ? getCellString(row.getCell(colMap.capThucHien)) : '';
      let rawCanCuPhapLy = colMap.canCuPhapLy ? getCellString(row.getCell(colMap.canCuPhapLy)) : '';
      let rawGhiChu = colMap.ghiChu ? getCellString(row.getCell(colMap.ghiChu)) : '';

      // Trường hợp không có cả tên lẫn mã ở cột ánh xạ:
      // Kiểm tra xem ô thứ 2 hoặc thứ 3 có chứa nội dung không (hỗ trợ file bị xô lệch cột)
      let effectiveMa = rawMa;
      let effectiveTen = rawTen;

      if (!effectiveTen && !effectiveMa) {
        const c2 = getCellString(row.getCell(2));
        const c3 = getCellString(row.getCell(3));
        if (c2 && c2.length > 5) {
          effectiveTen = c2;
        } else if (c3 && c3.length > 5) {
          effectiveTen = c3;
        }
      }

      if (!effectiveTen && !effectiveMa) {
        continue; // Dòng trống không có nội dung thủ tục
      }

      // 4. Tách và làm sạch Mã TTHC và Tên TTHC thông minh (Tự động đảo nếu ngược, tách mã trong tên, tách link QR)
      const { maTthc: finalMaTthc, tenTthc: finalTenTthc, canCuExtra, qrLinkExtra } = extractMaAndTenTthc(
        effectiveMa,
        effectiveTen,
        results.length + 1
      );

      // Nếu rawCanCuPhapLy thực chất là một đường link URL (chứa http, https, www, dichvucong)
      // thì đây chính là nội dung / link của Mã QR Code, KHÔNG PHẢI căn cứ pháp lý!
      if (/https?:\/\/|www\.|dichvucong\.gov\.vn/i.test(rawCanCuPhapLy) || rawCanCuPhapLy.includes('://')) {
        if (!rawGhiChu) {
          rawGhiChu = rawCanCuPhapLy.trim();
        }
        rawCanCuPhapLy = '';
      }

      // Nếu trong tên thủ tục có chứa link/URL mã QR và rawGhiChu còn trống
      if (qrLinkExtra && !rawGhiChu) {
        rawGhiChu = qrLinkExtra;
      }

      // Nếu có căn cứ pháp lý phụ trích xuất từ tên mà cột căn cứ còn trống thì bổ sung
      if (canCuExtra && !rawCanCuPhapLy) {
        rawCanCuPhapLy = canCuExtra;
      }

      // 5. XỬ LÝ LĨNH VỰC THÔNG MINH (Kế thừa từ ô merge dọc hoặc phân nhóm trước đó)
      if (rawLinhVuc) {
        const cleaned = cleanLinhVuc(rawLinhVuc);
        inheritedVerticalLinhVuc = cleaned;
        rawLinhVuc = cleaned;
      } else {
        // Nếu ô lĩnh vực bị trống (do merged cell dọc trong Excel): Kế thừa giá trị ô trên
        rawLinhVuc = inheritedVerticalLinhVuc || activeLinhVuc || 'Khác';
      }

      const finalLinhVuc = cleanLinhVuc(rawLinhVuc) || 'Chưa phân loại';
      const finalSoNganh = rawSoNganh.trim() || departmentHint || 'Ủy ban nhân dân';
      const finalCapThucHien = normalizeCapThucHien(rawCapThucHien, capHint || 'Cấp xã');
      
      // Phòng ngừa trường hợp canCu vẫn dính URL: lọc bỏ hoàn toàn URL khỏi căn cứ pháp lý
      let cleanedCanCu = rawCanCuPhapLy.trim();
      if (/https?:\/\/|www\.|dichvucong\.gov\.vn/i.test(cleanedCanCu)) {
        if (!rawGhiChu) rawGhiChu = cleanedCanCu;
        cleanedCanCu = '';
      }
      const finalCanCu = cleanedCanCu || 'Quy định pháp luật hiện hành';

      // 6. Xử lý các cờ boolean & dịch vụ công
      const bcciTiepNhan = colMap.bcciTiepNhan ? normalizeBoolean(getCellString(row.getCell(colMap.bcciTiepNhan))) : false;
      const bcciTraKetQua = colMap.bcciTraKetQua ? normalizeBoolean(getCellString(row.getCell(colMap.bcciTraKetQua))) : false;
      const motCua = colMap.motCua ? normalizeBoolean(getCellString(row.getCell(colMap.motCua))) : true;
      const dvcttLoai = colMap.dvcttLoai ? normalizeDvctt(getCellString(row.getCell(colMap.dvcttLoai))) : 'Toàn trình';
      const dungChung = colMap.dungChung ? normalizeBoolean(getCellString(row.getCell(colMap.dungChung))) : true;

      // 7. Lưu lại các lĩnh vực và sở ngành phát hiện được
      if (finalLinhVuc && finalLinhVuc !== 'Chưa phân loại') {
        discoveredLinhVuc.add(finalLinhVuc);
      }
      if (finalSoNganh) {
        discoveredSoNganh.add(finalSoNganh);
      }

      const procedureItem: Procedure = {
        id: `tthc_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
        maTthc: finalMaTthc,
        tenTthc: finalTenTthc,
        linhVuc: finalLinhVuc,
        soNganh: finalSoNganh,
        capThucHien: finalCapThucHien,
        canCuPhapLy: finalCanCu,
        bcciTiepNhan,
        bcciTraKetQua,
        motCua,
        dvcttLoai,
        dungChung,
        ngayTao: new Date().toISOString(),
        ngayCapNhat: new Date().toISOString(),
        ghiChu: rawGhiChu.trim() || undefined
      };

      results.push(procedureItem);
    }
  });

  if (results.length === 0) {
    warnings.push('Không tìm thấy thủ tục hành chính hợp lệ nào trong tệp. Hãy kiểm tra lại hàng tiêu đề và các cột dữ liệu.');
  }

  return {
    procedures: results,
    warnings,
    totalParsed: results.length,
    discoveredLinhVuc: Array.from(discoveredLinhVuc),
    discoveredSoNganh: Array.from(discoveredSoNganh)
  };
}

/**
 * Phân tích tệp CSV hỗ trợ nháy kép, dấu phẩy, chấm phẩy, tab và ký tự xuống dòng
 */
export function parseCsvText(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const sample = text.slice(0, 1000);
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;

  let separator = ',';
  if (semicolonCount > commaCount && semicolonCount > tabCount) separator = ';';
  else if (tabCount > commaCount && tabCount > semicolonCount) separator = '\t';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell.trim());
      if (row.some(c => c.length > 0)) {
        lines.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some(c => c.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

/**
 * Nạp Workbook từ ArrayBuffer (tự động xử lý cả XLSX và CSV)
 */
export async function loadWorkbookFromBuffer(buffer: ArrayBuffer, isCsv: boolean = false): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  if (isCsv) {
    const decoder = new TextDecoder('utf-8');
    const csvText = decoder.decode(buffer);
    const rows = parseCsvText(csvText);
    if (rows.length === 0) {
      throw new Error('Tệp CSV không có dữ liệu.');
    }
    const sheet = workbook.addWorksheet('Dữ liệu');
    rows.forEach((r, idx) => {
      sheet.getRow(idx + 1).values = r;
    });
  } else {
    await workbook.xlsx.load(buffer);
  }
  return workbook;
}

