import QRCode from 'qrcode';
import ExcelJS from 'exceljs';
import { Procedure, AppSettings } from '../types';

// Helper to generate QR code data URL (PNG) from procedure.ghiChu or fallback URL
export const generateQrDataUrl = async (procedure: Procedure): Promise<string> => {
  let qrPayload = (procedure.ghiChu && procedure.ghiChu.trim()) ? procedure.ghiChu.trim() : '';

  if (!qrPayload && procedure.canCuPhapLy && (/https?:\/\/|www\.|dichvucong\.gov\.vn/i.test(procedure.canCuPhapLy) || procedure.canCuPhapLy.includes('://'))) {
    qrPayload = procedure.canCuPhapLy.trim();
  }

  if (!qrPayload && procedure.tenTthc) {
    const match = procedure.tenTthc.match(/(https?:\/\/[^\s\)]+|www\.[^\s\)]+)/i);
    if (match) {
      qrPayload = match[1].trim();
    }
  }

  if (!qrPayload) {
    qrPayload = `https://dichvucong.gov.vn/p/home/dvc-tthc-thu-tuc-hanh-chinh-chi-tiet.html?ma_tthc=${encodeURIComponent(procedure.maTthc)}`;
  }

  try {
    return await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: qrPayload.length > 150 ? 'L' : 'M',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating QR code for', procedure.maTthc, err);
    return '';
  }
};

// Build clean sheet title for Excel (max 31 chars, no forbidden chars)
export const sanitizeSheetName = (name: string, usedNames: Set<string>): string => {
  let clean = name.replace(/[:\\/?*\[\]]/g, '').trim().toLowerCase();
  if (!clean) clean = 'thủ tục';
  if (clean.length > 28) {
    clean = clean.substring(0, 28);
  }
  let finalName = clean;
  let counter = 1;
  while (usedNames.has(finalName)) {
    const suffix = ` ${counter}`;
    const base = clean.substring(0, 31 - suffix.length);
    finalName = `${base}${suffix}`;
    counter++;
  }
  usedNames.add(finalName);
  return finalName;
};

// Helper to format clean procedure name for Excel
export const getCleanProcedureTitle = (p: Procedure): string => {
  let title = (p.tenTthc || '').trim();

  title = title
    .replace(/\s*\(\s*https?:\/\/[^\)]+\)/gi, '')
    .replace(/\s*\(\s*www\.[^\)]+\)/gi, '')
    .replace(/\s*\(?(?:https?:\/\/)?(?:www\.)?dichvucong\.gov\.vn[^\s\)]*\)?/gi, '')
    .replace(/\s*https?:\/\/[^\s\)]+/gi, '')
    .replace(/\s*www\.[^\s\)]+/gi, '')
    .replace(/\s*\((?:Link|Mã QR|QR Code|QR|Đường dẫn|Nội dung QR|Nội dung|Ghi chú)[\s\:\-]+[^\)]*\)/gi, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const canCu = (p.canCuPhapLy || '').trim();
  const isUrl = /https?:\/\/|www\.|dichvucong\.gov\.vn/i.test(canCu) || canCu.includes('://');
  const isQrPayload = Boolean(p.ghiChu && canCu.toLowerCase() === p.ghiChu.toLowerCase().trim());
  const isDefaultPlaceholder = canCu.toLowerCase() === 'quy định pháp luật hiện hành';
  const alreadyInTitle = canCu && title.toLowerCase().includes(canCu.toLowerCase());

  const isLegalDecision = /^(Quyết định|QĐ|Nghị định|NĐ|Thông tư|TT|Luật|Pháp lệnh|Chỉ thị|Kế hoạch|Văn bản)/i.test(canCu) ||
    /\b(số\s*\d+[\/\w\.\-]+)/i.test(canCu);

  if (canCu && !isUrl && !isQrPayload && !isDefaultPlaceholder && !alreadyInTitle && isLegalDecision) {
    const cleanCanCu = canCu
      .replace(/https?:\/\/[^\s\)]+/gi, '')
      .replace(/\(\s*\)/g, '')
      .trim();
    if (cleanCanCu && cleanCanCu.length > 3) {
      return `${title} (${cleanCanCu})`;
    }
  }

  return title;
};

// Helper to determine Department Header Name
export const getDepartmentHeader = (procs: Procedure[]): string => {
  if (procs.length > 0 && procs[0].soNganh) {
    const dept = procs[0].soNganh.toUpperCase();
    const cap = procs[0].capThucHien ? procs[0].capThucHien.toUpperCase() : 'CẤP XÃ';
    return `${dept} THỦ TỤC HÀNH CHÍNH ${cap}`;
  }
  return `THỦ TỤC HÀNH CHÍNH CẤP XÃ`;
};

// Export procedures to Excel with real QR code images and columns: STT, MÃ TTHC, TÊN THỦ TỤC HÀNH CHÍNH, MÃ QRCODE
export async function exportProceduresToExcelWithQr(procedures: Procedure[], settings?: AppSettings): Promise<void> {
  if (procedures.length === 0) {
    throw new Error('Không có dữ liệu để xuất file!');
  }

  // 1. Pre-generate all QR codes asynchronously
  const qrCodeMap: { [id: string]: string } = {};
  for (const p of procedures) {
    qrCodeMap[p.id] = await generateQrDataUrl(p);
  }

  // 2. Group procedures by Lĩnh vực
  const fieldGroups: { [linhVuc: string]: Procedure[] } = {};
  procedures.forEach(p => {
    const lv = p.linhVuc || 'Khác';
    if (!fieldGroups[lv]) {
      fieldGroups[lv] = [];
    }
    fieldGroups[lv].push(p);
  });

  // 3. Initialize ExcelJS Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = settings?.siteTitle || 'Cổng Tra Cứu Thủ Tục Hành Chính';
  workbook.created = new Date();

  const usedSheetNames = new Set<string>();

  const createStandardSheet = (sheetTabName: string, sheetTitle: string, categoryTitle: string, procs: Procedure[]) => {
    const worksheet = workbook.addWorksheet(sheetTabName, {
      views: [{ showGridLines: true }],
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true }
    });

    worksheet.getColumn(1).width = 8;   // STT
    worksheet.getColumn(2).width = 20;  // MÃ TTHC (sau cột thứ tự)
    worksheet.getColumn(3).width = 72;  // TÊN THỦ TỤC HÀNH CHÍNH
    worksheet.getColumn(4).width = 24;  // MÃ QRCODE

    worksheet.getRow(1).height = 12;

    worksheet.mergeCells('A2:D2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = sheetTitle.toUpperCase();
    titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 32;

    worksheet.getRow(3).height = 8;

    const headerRow = worksheet.getRow(4);
    headerRow.height = 28;
    headerRow.values = ['STT', 'MÃ TTHC', 'TÊN THỦ TỤC HÀNH CHÍNH', 'MÃ QRCODE'];

    ['A4', 'B4', 'C4', 'D4'].forEach(ref => {
      const c = worksheet.getCell(ref);
      c.font = { name: 'Times New Roman', size: 11, bold: true };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    });

    worksheet.mergeCells('A5:D5');
    const catCell = worksheet.getCell('A5');
    catCell.value = categoryTitle.toUpperCase();
    catCell.font = { name: 'Times New Roman', size: 11, bold: true, italic: true };
    catCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(5).height = 24;

    ['A5', 'B5', 'C5', 'D5'].forEach(ref => {
      const c = worksheet.getCell(ref);
      c.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    });

    let currentRowIndex = 6;
    procs.forEach((p, idx) => {
      const row = worksheet.getRow(currentRowIndex);
      row.height = 95;

      const cellA = worksheet.getCell(`A${currentRowIndex}`);
      cellA.value = idx + 1;
      cellA.font = { name: 'Times New Roman', size: 12, bold: true };
      cellA.alignment = { horizontal: 'center', vertical: 'middle' };

      const cellB = worksheet.getCell(`B${currentRowIndex}`);
      cellB.value = p.maTthc || '';
      cellB.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF8B0000' } };
      cellB.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      const cellC = worksheet.getCell(`C${currentRowIndex}`);
      cellC.value = getCleanProcedureTitle(p);
      cellC.font = { name: 'Times New Roman', size: 11 };
      cellC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      const cellD = worksheet.getCell(`D${currentRowIndex}`);
      cellD.value = '';
      cellD.alignment = { horizontal: 'center', vertical: 'middle' };

      ['A', 'B', 'C', 'D'].forEach(col => {
        const c = worksheet.getCell(`${col}${currentRowIndex}`);
        c.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      const qrDataUrl = qrCodeMap[p.id];
      if (qrDataUrl) {
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const imageId = workbook.addImage({
          base64: base64Data,
          extension: 'png'
        });

        worksheet.addImage(imageId, {
          tl: { col: 3.15, row: currentRowIndex - 1 + 0.12 },
          ext: { width: 105, height: 105 },
          editAs: 'oneCell'
        });
      }

      currentRowIndex++;
    });
  };

  const sortedFieldKeys = Object.keys(fieldGroups).sort();

  sortedFieldKeys.forEach(lv => {
    const procsInField = fieldGroups[lv];
    const tabName = sanitizeSheetName(lv, usedSheetNames);
    const deptTitle = getDepartmentHeader(procsInField);
    createStandardSheet(tabName, deptTitle, `LĨNH VỰC ${lv}`, procsInField);
  });

  if (sortedFieldKeys.length > 1) {
    const tabName = sanitizeSheetName('tổng hợp', usedSheetNames);
    const generalTitle = settings?.siteTitle ? `${settings.siteTitle} - THỦ TỤC HÀNH CHÍNH CẤP XÃ` : 'THỦ TỤC HÀNH CHÍNH CẤP XÃ';
    createStandardSheet(tabName, generalTitle, 'TỔNG HỢP TẤT CẢ LĨNH VỰC', procedures);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const today = new Date().toISOString().substring(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `So_tay_TTHC_QRCode_${today}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
