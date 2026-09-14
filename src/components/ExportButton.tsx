import React, { useState } from 'react';
import { Procedure, AppSettings } from '../types';
import { FileSpreadsheet, Printer, Loader2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import ExcelJS from 'exceljs';

interface ExportButtonProps {
  procedures: Procedure[];
  activeTableName?: string;
  settings?: AppSettings;
}

export default function ExportButton({ procedures, activeTableName = "Danh sách Thủ tục", settings }: ExportButtonProps) {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Helper to generate QR code data URL (PNG) from procedure.ghiChu or fallback URL
  const generateQrDataUrl = async (procedure: Procedure): Promise<string> => {
    // 1. Ưu tiên cao nhất: Nội dung / URL trong ghiChu (cột nội dung mã QR)
    let qrPayload = (procedure.ghiChu && procedure.ghiChu.trim()) ? procedure.ghiChu.trim() : '';

    // 2. Nếu ghiChu trống nhưng trong canCuPhapLy lại chứa URL (do import hoặc dữ liệu cũ gán nhầm link vào canCu)
    if (!qrPayload && procedure.canCuPhapLy && (/https?:\/\/|www\.|dichvucong\.gov\.vn/i.test(procedure.canCuPhapLy) || procedure.canCuPhapLy.includes('://'))) {
      qrPayload = procedure.canCuPhapLy.trim();
    }

    // 3. Nếu trong tenTthc có chứa link URL
    if (!qrPayload && procedure.tenTthc) {
      const match = procedure.tenTthc.match(/(https?:\/\/[^\s\)]+|www\.[^\s\)]+)/i);
      if (match) {
        qrPayload = match[1].trim();
      }
    }

    // 4. Mặc định: Link tra cứu chính thức trên Cổng Dịch vụ công Quốc gia
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
  const sanitizeSheetName = (name: string, usedNames: Set<string>): string => {
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

  // Helper to format clean procedure name for Excel and PDF export
  // TUYỆT ĐỐI không hiển thị link URL, mã QR, hoặc nội dung link trong cột tên thủ tục hành chính
  const getCleanProcedureTitle = (p: Procedure): string => {
    let title = (p.tenTthc || '').trim();

    // 1. Loại bỏ triệt để tất cả các link URL hoặc link trong ngoặc đơn khỏi Tên thủ tục
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

    // 2. Xử lý Căn cứ pháp lý:
    // TUYỆT ĐỐI KHÔNG thêm vào nếu căn cứ pháp lý là link/URL, hoặc là nội dung QR (ghiChu),
    // hoặc là chữ mặc định "Quy định pháp luật hiện hành"
    const canCu = (p.canCuPhapLy || '').trim();
    const isUrl = /https?:\/\/|www\.|dichvucong\.gov\.vn/i.test(canCu) || canCu.includes('://');
    const isQrPayload = Boolean(p.ghiChu && canCu.toLowerCase() === p.ghiChu.toLowerCase().trim());
    const isDefaultPlaceholder = canCu.toLowerCase() === 'quy định pháp luật hiện hành';
    const alreadyInTitle = canCu && title.toLowerCase().includes(canCu.toLowerCase());

    // Chỉ bổ sung nếu là văn bản pháp lý hợp lệ thực sự (Quyết định, Nghị định, Thông tư, Luật...)
    // và TUYỆT ĐỐI không chứa link hay URL nào
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

  // Helper to determine the Department Header Name
  const getDepartmentHeader = (procs: Procedure[]): string => {
    if (procs.length > 0 && procs[0].soNganh) {
      const dept = procs[0].soNganh.toUpperCase();
      const cap = procs[0].capThucHien ? procs[0].capThucHien.toUpperCase() : 'CẤP XÃ';
      return `${dept} THỦ TỤC HÀNH CHÍNH ${cap}`;
    }
    return `THỦ TỤC HÀNH CHÍNH CẤP XÃ`;
  };

  // 1. EXPORT TO EXCEL (.XLSX) WITH REAL QR CODE IMAGES & SHEETS BY LĨNH VỰC
  const handleExportExcel = async () => {
    if (procedures.length === 0) {
      alert("Không có dữ liệu để xuất file!");
      return;
    }

    setIsExportingExcel(true);

    try {
      // 1. Pre-generate all QR codes asynchronously
      const qrCodeMap: { [id: string]: string } = {};
      for (const p of procedures) {
        qrCodeMap[p.id] = await generateQrDataUrl(p);
      }

      // 2. Group procedures by Lĩnh vực (Field of administration)
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

      // Function to build a standardized worksheet matching image format
      const createStandardSheet = (sheetTabName: string, sheetTitle: string, categoryTitle: string, procs: Procedure[]) => {
        const worksheet = workbook.addWorksheet(sheetTabName, {
          views: [{ showGridLines: true }],
          pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true }
        });

        // Set column widths matching sample image
        worksheet.getColumn(1).width = 8;   // STT
        worksheet.getColumn(2).width = 20;  // MÃ TTHC (sau cột thứ tự)
        worksheet.getColumn(3).width = 72;  // TÊN THỦ TỤC HÀNH CHÍNH
        worksheet.getColumn(4).width = 24;  // MÃ QRCODE

        // Row 1: Top spacing
        worksheet.getRow(1).height = 12;

        // Row 2: Top Title Header (Centered, bold, uppercase: e.g. "SỞ NỘI VỤ THỦ TỤC HÀNH CHÍNH CẤP XÃ")
        worksheet.mergeCells('A2:D2');
        const titleCell = worksheet.getCell('A2');
        titleCell.value = sheetTitle.toUpperCase();
        titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF000000' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(2).height = 32;

        // Row 3: Spacer
        worksheet.getRow(3).height = 8;

        // Row 4: Table Header Columns (STT, MÃ TTHC, TÊN THỦ TỤC HÀNH CHÍNH, MÃ QRCODE)
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
        });

        let currentRowIndex = 5;

        // If category title is present, add category header row (e.g. "LĨNH VỰC HOÀ GIẢI CƠ SỞ")
        if (categoryTitle) {
          worksheet.mergeCells(`A${currentRowIndex}:D${currentRowIndex}`);
          const catCell = worksheet.getCell(`A${currentRowIndex}`);
          catCell.value = categoryTitle.toUpperCase();
          catCell.font = { name: 'Times New Roman', size: 11, bold: true };
          catCell.alignment = { horizontal: 'center', vertical: 'middle' };
          catCell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          worksheet.getRow(currentRowIndex).height = 24;
          currentRowIndex++;
        }

        // Add each procedure row
        procs.forEach((p, idx) => {
          const row = worksheet.getRow(currentRowIndex);
          row.height = 95; // Ample height for square QR code

          // Cell A: STT
          const cellA = worksheet.getCell(`A${currentRowIndex}`);
          cellA.value = idx + 1;
          cellA.font = { name: 'Times New Roman', size: 11 };
          cellA.alignment = { horizontal: 'center', vertical: 'middle' };
          cellA.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };

          // Cell B: MÃ TTHC (sau cột thứ tự)
          const cellB = worksheet.getCell(`B${currentRowIndex}`);
          cellB.value = p.maTthc || '';
          cellB.font = { name: 'Times New Roman', size: 11, bold: true };
          cellB.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cellB.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };

          // Cell C: Tên TTHC (đã làm sạch, không hiển thị link/URL của mã QR)
          const cellC = worksheet.getCell(`C${currentRowIndex}`);
          cellC.value = getCleanProcedureTitle(p);
          cellC.font = { name: 'Times New Roman', size: 11 };
          cellC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          cellC.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };

          // Cell D: MÃ QRCODE container
          const cellD = worksheet.getCell(`D${currentRowIndex}`);
          cellD.value = '';
          cellD.alignment = { horizontal: 'center', vertical: 'middle' };
          cellD.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };

          // Insert QR code image into cell D
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

      // 4. If multiple fields exist, create individual sheets for each Lĩnh Vực (like in image: "nuôi con nuôi", "bồi thường nhà nước", "hoà giải cơ sở"...)
      const sortedFieldKeys = Object.keys(fieldGroups).sort();

      // Create individual sheets for each field
      sortedFieldKeys.forEach(lv => {
        const procsInField = fieldGroups[lv];
        const tabName = sanitizeSheetName(lv, usedSheetNames);
        const deptTitle = getDepartmentHeader(procsInField);
        createStandardSheet(tabName, deptTitle, `LĨNH VỰC ${lv}`, procsInField);
      });

      // Also create a "tổng hợp" sheet if there is more than 1 field
      if (sortedFieldKeys.length > 1) {
        const tabName = sanitizeSheetName('tổng hợp', usedSheetNames);
        const generalTitle = settings?.siteTitle ? `${settings.siteTitle} - THỦ TỤC HÀNH CHÍNH CẤP XÃ` : 'THỦ TỤC HÀNH CHÍNH CẤP XÃ';
        createStandardSheet(tabName, generalTitle, 'TỔNG HỢP TẤT CẢ LĨNH VỰC', procedures);
      }

      // 5. Generate and download native .xlsx file
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
    } catch (error) {
      console.error('Lỗi khi xuất file Excel:', error);
      alert('Có lỗi xảy ra khi tạo tệp Excel. Vui lòng thử lại!');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // 2. EXPORT / PRINT PDF MATCHING THE EXACT 3-COLUMN TABLE WITH QR CODE IMAGES
  const handlePrintPDF = async () => {
    if (procedures.length === 0) {
      alert("Không có thủ tục nào để xuất báo cáo!");
      return;
    }

    setIsExportingPdf(true);

    try {
      // 1. Generate all QR codes asynchronously
      const qrCodeMap: { [id: string]: string } = {};
      for (const p of procedures) {
        qrCodeMap[p.id] = await generateQrDataUrl(p);
      }

      // 2. Group procedures by Lĩnh vực (Field)
      const fieldGroups: { [linhVuc: string]: Procedure[] } = {};
      procedures.forEach(p => {
        const lv = p.linhVuc || 'Khác';
        if (!fieldGroups[lv]) {
          fieldGroups[lv] = [];
        }
        fieldGroups[lv].push(p);
      });

      const today = new Date();
      const curDay = String(today.getDate()).padStart(2, '0');
      const curMonth = String(today.getMonth() + 1).padStart(2, '0');
      const curYear = today.getFullYear();

      // Open printable popup window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("Trình duyệt chặn cửa sổ bật lên. Vui lòng cấp quyền cho phép Popup để in báo cáo!");
        setIsExportingPdf(false);
        return;
      }

      // Title header
      const mainHeaderTitle = getDepartmentHeader(procedures);

      // Build grouped rows
      let tableRowsHtml = '';
      let globalIndex = 1;

      Object.keys(fieldGroups).sort().forEach(linhVucName => {
        const fieldProcs = fieldGroups[linhVucName];
        
        // Category Subheader Row (e.g. LĨNH VỰC HOÀ GIẢI CƠ SỞ)
        tableRowsHtml += `
          <tr class="category-header-row">
            <td colspan="3" class="category-title">LĨNH VỰC ${linhVucName.toUpperCase()}</td>
          </tr>
        `;

        // Procedure items
        fieldProcs.forEach(p => {
          const qrSrc = qrCodeMap[p.id] || '';
          const fullTitle = getCleanProcedureTitle(p);

          tableRowsHtml += `
            <tr class="data-row">
              <td class="col-stt">${globalIndex++}</td>
              <td class="col-name">${fullTitle}</td>
              <td class="col-qrcode">
                ${qrSrc ? `<img src="${qrSrc}" alt="QR ${p.maTthc}" class="qr-image" />` : ''}
              </td>
            </tr>
          `;
        });
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${mainHeaderTitle}</title>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
            
            * {
              box-sizing: border-box;
            }

            body {
              font-family: 'Times New Roman', Times, serif;
              color: #000;
              margin: 0;
              padding: 24px 32px;
              background-color: #fff;
            }

            .sheet-title {
              text-align: center;
              font-size: 16pt;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 20px;
              letter-spacing: 0.5px;
            }

            .procedure-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }

            .procedure-table th, .procedure-table td {
              border: 1.5px solid #000;
              padding: 10px 12px;
              vertical-align: middle;
            }

            .table-header th {
              font-size: 11.5pt;
              font-weight: bold;
              text-align: center;
              text-transform: uppercase;
              background-color: #f8fafc;
              padding: 10px 8px;
            }

            .category-header-row td {
              font-size: 11.5pt;
              font-weight: bold;
              text-align: center;
              text-transform: uppercase;
              background-color: #fff;
              padding: 8px 12px;
              letter-spacing: 0.5px;
            }

            .col-stt {
              width: 8%;
              text-align: center;
              font-size: 11pt;
              font-weight: 500;
            }

            .col-name {
              width: 68%;
              text-align: left;
              font-size: 11pt;
              line-height: 1.45;
            }

            .col-qrcode {
              width: 24%;
              text-align: center;
              padding: 8px !important;
            }

            .qr-image {
              width: 96px;
              height: 96px;
              display: block;
              margin: 0 auto;
              object-fit: contain;
            }

            .data-row {
              page-break-inside: avoid;
            }

            .signature-section {
              width: 100%;
              margin-top: 30px;
              page-break-inside: avoid;
            }

            .signature-table {
              width: 100%;
              border: none;
              border-collapse: collapse;
            }

            .signature-table td {
              border: none;
              width: 50%;
              text-align: center;
              vertical-align: top;
            }

            .place-date {
              font-style: italic;
              font-size: 11pt;
              margin-bottom: 6px;
            }

            .sign-role {
              font-weight: bold;
              text-transform: uppercase;
              font-size: 11.5pt;
            }

            .sign-sub {
              font-style: italic;
              font-size: 10pt;
              color: #444;
              margin-bottom: 65px;
            }

            .sign-name {
              font-weight: bold;
              font-size: 11.5pt;
            }

            @media print {
              body {
                padding: 0;
              }
              @page {
                size: A4 portrait;
                margin: 1.2cm 1.2cm 1.2cm 1.2cm;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet-title">${mainHeaderTitle}</div>

          <table class="procedure-table">
            <thead>
              <tr class="table-header">
                <th style="width: 8%;">STT</th>
                <th style="width: 68%;">TÊN THỦ TỤC HÀNH CHÍNH</th>
                <th style="width: 24%;">MÃ QRCODE</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="signature-section">
            <table class="signature-table">
              <tr>
                <td>
                  <div style="height: 20px;"></div>
                  <div class="sign-role">NGƯỜI LẬP BẢNG</div>
                  <div class="sign-sub">(Ký và ghi rõ họ tên)</div>
                  <div class="sign-name">Bộ phận Một cửa</div>
                </td>
                <td>
                  <div class="place-date">Ngày ${curDay} tháng ${curMonth} năm ${curYear}</div>
                  <div class="sign-role">THỦ TRƯỞNG ĐƠN VỊ</div>
                  <div class="sign-sub">(Ký, ghi rõ họ tên và đóng dấu)</div>
                  <div class="sign-name">LÃNH ĐẠO ĐƠN VỊ</div>
                </td>
              </tr>
            </table>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (error) {
      console.error('Lỗi khi in PDF:', error);
      alert('Có lỗi xảy ra khi tạo báo cáo PDF. Vui lòng thử lại!');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Excel (.xlsx) Download with QR Codes and Field Sheets */}
      <button
        type="button"
        onClick={handleExportExcel}
        disabled={isExportingExcel || procedures.length === 0}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
        id="export-excel-button"
        title="Xuất file Excel (.xlsx) định dạng bảng kèm Mã QR Code và chia Sheet theo Lĩnh vực"
      >
        {isExportingExcel ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang tạo Excel & QR...</span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel (Kèm QR)</span>
          </>
        )}
      </button>

      {/* PDF Print / Export with QR Codes */}
      <button
        type="button"
        onClick={handlePrintPDF}
        disabled={isExportingPdf || procedures.length === 0}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
        id="export-pdf-button"
        title="In hoặc lưu file PDF mẫu 3 cột chuẩn kèm mã QR Code tra cứu"
      >
        {isExportingPdf ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang tạo bản in...</span>
          </>
        ) : (
          <>
            <Printer className="w-4 h-4" />
            <span>In / Xuất PDF (Kèm QR)</span>
          </>
        )}
      </button>
    </div>
  );
}
