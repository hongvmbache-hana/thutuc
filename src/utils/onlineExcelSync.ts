import ExcelJS from 'exceljs';
import { Procedure, OnlineExcelSyncResult } from '../types';
import { parseWorkbookToProcedures, loadWorkbookFromBuffer } from './excelParserHelper';

export interface FormattedUrlInfo {
  originalUrl: string;
  formattedXlsxUrl: string;
  fallbackCsvUrl?: string;
  extraUrls?: Array<{ url: string; isCsv: boolean }>;
  isGoogleSheet: boolean;
  isGoogleDrive?: boolean;
  sheetId?: string;
  gid?: string;
}

/**
 * Normalizes online spreadsheet URLs (Google Sheets, Google Drive Excel files, OneDrive, Dropbox, direct link).
 */
export function formatOnlineExcelUrl(rawUrl: string): FormattedUrlInfo {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      originalUrl: '',
      formattedXlsxUrl: '',
      isGoogleSheet: false
    };
  }

  // 1a. Google Sheets Published to Web (/d/e/2PACX-...)
  if (trimmed.includes('docs.google.com/spreadsheets') && trimmed.includes('/d/e/')) {
    const pubIdMatch = trimmed.match(/(https?:\/\/docs\.google\.com\/spreadsheets(?:\/u\/\d+)?\/d\/e\/[a-zA-Z0-9_-]+)/);
    const baseUrl = pubIdMatch ? pubIdMatch[1] : trimmed.split('/pub')[0];
    const gidMatch = trimmed.match(/[?#&]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : undefined;
    const gidQuery = gid ? `&gid=${gid}` : '';

    return {
      originalUrl: trimmed,
      formattedXlsxUrl: `${baseUrl}/pub?output=xlsx${gidQuery}`,
      fallbackCsvUrl: `${baseUrl}/pub?output=csv${gidQuery}`,
      extraUrls: [
        { url: `${baseUrl}/pub?output=csv${gid ? `&gid=${gid}&single=true` : ''}`, isCsv: true }
      ],
      isGoogleSheet: true,
      gid
    };
  }

  // 1b. Standard Google Sheets (/d/{ID}/ or /u/0/d/{ID}/)
  if (trimmed.includes('docs.google.com/spreadsheets')) {
    const idMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1] && idMatch[1] !== 'e') {
      const sheetId = idMatch[1];
      const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : undefined;
      const gidQuery = gid ? `&gid=${gid}` : '';

      return {
        originalUrl: trimmed,
        formattedXlsxUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx${gidQuery}`,
        fallbackCsvUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidQuery}`,
        extraUrls: [
          { url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidQuery}`, isCsv: true }
        ],
        isGoogleSheet: true,
        sheetId,
        gid
      };
    }
  }

  // 1c. Google Drive shared file link (drive.google.com/file/d/{ID}/... or drive.google.com/open?id={ID} or drive.google.com/uc?id={ID})
  if (trimmed.includes('drive.google.com') || trimmed.includes('drive.usercontent.google.com')) {
    const fileIdMatch =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      return {
        originalUrl: trimmed,
        formattedXlsxUrl: `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
        extraUrls: [
          { url: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`, isCsv: false },
          { url: `https://drive.google.com/uc?export=download&id=${fileId}`, isCsv: false },
          { url: `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`, isCsv: false },
          { url: `https://docs.google.com/spreadsheets/d/${fileId}/gviz/tq?tqx=out:csv`, isCsv: true }
        ],
        isGoogleSheet: false,
        isGoogleDrive: true,
        sheetId: fileId
      };
    }
  }

  // 2. Dropbox link: replace ?dl=0 with ?dl=1
  if (trimmed.includes('dropbox.com')) {
    let dlUrl = trimmed.replace(/[?&]dl=0/, '');
    dlUrl += (dlUrl.includes('?') ? '&' : '?') + 'dl=1';
    return {
      originalUrl: trimmed,
      formattedXlsxUrl: dlUrl,
      isGoogleSheet: false
    };
  }

  // 3. OneDrive / SharePoint link
  if (trimmed.includes('onedrive.live.com') || trimmed.includes('sharepoint.com')) {
    let dlUrl = trimmed;
    if (dlUrl.includes('download=1')) {
      return { originalUrl: trimmed, formattedXlsxUrl: dlUrl, isGoogleSheet: false };
    }
    dlUrl += (dlUrl.includes('?') ? '&' : '?') + 'download=1';
    return {
      originalUrl: trimmed,
      formattedXlsxUrl: dlUrl,
      isGoogleSheet: false
    };
  }

  // 4. Default / Direct URL
  return {
    originalUrl: trimmed,
    formattedXlsxUrl: trimmed,
    isGoogleSheet: false
  };
}

/**
 * Downloads the online Excel or Google Sheet file buffer.
 */
export async function fetchOnlineSpreadsheet(rawUrl: string): Promise<{ buffer: ArrayBuffer; isCsv: boolean; sourceUrl: string }> {
  const urlInfo = formatOnlineExcelUrl(rawUrl);
  if (!urlInfo.formattedXlsxUrl) {
    throw new Error('Vui lòng nhập đường dẫn biểu mẫu Excel, Google Drive hoặc Google Sheets hợp lệ.');
  }

  const candidateTargets: Array<{ url: string; isCsv: boolean }> = [
    { url: urlInfo.formattedXlsxUrl, isCsv: false }
  ];
  if (urlInfo.fallbackCsvUrl) {
    candidateTargets.push({ url: urlInfo.fallbackCsvUrl, isCsv: true });
  }
  if (urlInfo.extraUrls && urlInfo.extraUrls.length > 0) {
    candidateTargets.push(...urlInfo.extraUrls);
  }

  const urlsToTry: Array<{ url: string; isCsv: boolean }> = [];

  // 1. Server proxy first (avoids CORS completely)
  for (const target of candidateTargets) {
    urlsToTry.push({ url: `/api/fetch-online-excel?url=${encodeURIComponent(target.url)}`, isCsv: target.isCsv });
  }

  // 2. Direct fetch (works if CORS is allowed)
  for (const target of candidateTargets) {
    urlsToTry.push({ url: target.url, isCsv: target.isCsv });
  }

  // 3. Public CORS proxies as resilience fallback
  urlsToTry.push({ url: `https://corsproxy.io/?url=${encodeURIComponent(urlInfo.formattedXlsxUrl)}`, isCsv: false });
  if (urlInfo.fallbackCsvUrl) {
    urlsToTry.push({ url: `https://corsproxy.io/?url=${encodeURIComponent(urlInfo.fallbackCsvUrl)}`, isCsv: true });
  }

  let lastErrorMsg = '';
  let sawHtmlPage = false;

  for (const item of urlsToTry) {
    try {
      const response = await fetch(item.url, {
        headers: {
          'Accept': '*/*'
        }
      });

      if (!response.ok) {
        continue;
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const arrayBuffer = await response.arrayBuffer();

      if (!arrayBuffer || arrayBuffer.byteLength < 30) {
        continue;
      }

      const firstBytes = new Uint8Array(arrayBuffer.slice(0, 512));
      const textSample = new TextDecoder('utf-8', { fatal: false }).decode(firstBytes).toLowerCase();
      if (
        contentType.includes('text/html') ||
        textSample.includes('<!doctype html') ||
        textSample.includes('<html') ||
        textSample.includes('accounts.google.com')
      ) {
        sawHtmlPage = true;
        continue;
      }

      const isZipXlsx = firstBytes.length >= 2 && firstBytes[0] === 0x50 && firstBytes[1] === 0x4b; // 'PK'
      const isCsvDetected = !isZipXlsx && (item.isCsv || contentType.includes('text/csv') || contentType.includes('text/plain'));

      if (!isZipXlsx && !isCsvDetected) {
        continue;
      }

      return {
        buffer: arrayBuffer,
        isCsv: isCsvDetected,
        sourceUrl: urlInfo.originalUrl
      };
    } catch (err: any) {
      if (typeof err?.message === 'string') {
        lastErrorMsg = err.message;
      }
    }
  }

  if (sawHtmlPage) {
    throw new Error(
      'Tệp Google Sheets / Google Drive chưa được chia sẻ công khai ("Bất kỳ ai có đường liên kết" / "Người xem"). Vui lòng kiểm tra lại quyền chia sẻ của tệp.'
    );
  }

  throw new Error(
    lastErrorMsg ||
    'Không thể tải dữ liệu từ đường dẫn Google Drive / Google Sheets. Hãy đảm bảo tệp đã bật quyền "Bất kỳ ai có đường liên kết đều có thể xem".'
  );
}

// Helpers for cell value extraction
function getCellString(cell: ExcelJS.Cell): string {
  if (cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object') {
    const val: any = cell.value;
    if (val.text) return String(val.text).trim();
    if (val.richText && Array.isArray(val.richText)) {
      return val.richText.map((t: any) => t.text || '').join('').trim();
    }
    if (val.result !== undefined) return String(val.result).trim();
    if (val.hyperlink && val.text) return String(val.text).trim();
    if (val.hyperlink) return String(val.hyperlink).trim();
    return JSON.stringify(val);
  }
  return String(cell.value).trim();
}

function normalizeCapThucHien(raw: string, fallback: string = 'Cấp xã'): string {
  if (!raw || !raw.trim()) return fallback;
  const s = raw.trim().toLowerCase();
  if ((s.includes('xã') || s.includes('xa')) && (s.includes('tỉnh') || s.includes('tinh') || s.includes('thành phố') || s.includes('thanh pho') || s.includes('tp'))) {
    return 'Cấp xã, Thành phố';
  }
  if (s.includes('liên thông') || s.includes('lien thong')) {
    return 'TTHC liên thông';
  }
  if (s.includes('xã') || s.includes('xa')) {
    return 'Cấp xã';
  }
  if (s.includes('thành phố') || s.includes('thanh pho') || s.includes('tỉnh') || s.includes('tinh') || s.includes('tp')) {
    return 'Thành phố';
  }
  if (s.includes('huyện') || s.includes('huyen')) {
    return 'Cấp huyện';
  }
  return raw.trim();
}

function normalizeDvctt(raw: string): 'Toàn trình' | 'Một phần' | 'Không' {
  if (!raw || !raw.trim()) return 'Không';
  const s = raw.trim().toLowerCase();
  if (s.includes('toàn trình') || s.includes('toan trinh') || s === 'tt' || s === 'toàn') {
    return 'Toàn trình';
  }
  if (s.includes('một phần') || s.includes('mot phan') || s === 'mp' || s === 'phần') {
    return 'Một phần';
  }
  if (s.includes('không') || s.includes('khong') || s === 'k' || s === 'offline') {
    return 'Không';
  }
  return 'Không';
}

function normalizeBoolean(raw: string): boolean {
  if (!raw) return false;
  const s = raw.trim().toLowerCase();
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
    s.includes('áp dụng') ||
    s.includes('tiếp nhận') ||
    s.includes('trả')
  );
}

/**
 * Parses an ArrayBuffer containing an XLSX or CSV spreadsheet into Procedure[] objects.
 */
export async function parseSpreadsheetBuffer(buffer: ArrayBuffer, isCsv: boolean, sourceUrl: string): Promise<OnlineExcelSyncResult> {
  const workbook = await loadWorkbookFromBuffer(buffer, isCsv);

  // Use smart universal parser
  const parseResult = parseWorkbookToProcedures(workbook);

  if (parseResult.procedures.length === 0) {
    throw new Error('Không tìm thấy bản ghi thủ tục hành chính nào trong tệp online đã nạp. Vui lòng kiểm tra lại cấu trúc hàng và cột của bảng.');
  }

  return {
    ...parseResult,
    sourceUrl
  };
}

