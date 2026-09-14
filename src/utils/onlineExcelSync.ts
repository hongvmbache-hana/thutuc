import ExcelJS from 'exceljs';
import { Procedure, OnlineExcelSyncResult } from '../types';
import { parseWorkbookToProcedures, loadWorkbookFromBuffer } from './excelParserHelper';

export interface FormattedUrlInfo {
  originalUrl: string;
  formattedXlsxUrl: string;
  fallbackCsvUrl?: string;
  isGoogleSheet: boolean;
  sheetId?: string;
  gid?: string;
}

/**
 * Normalizes online spreadsheet URLs (Google Sheets, OneDrive, Dropbox, direct link).
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

  // 1. Check if Google Sheets
  if (trimmed.includes('docs.google.com/spreadsheets')) {
    // Check if published to web (/pubhtml or /pub)
    if (trimmed.includes('/pubhtml') || trimmed.includes('/pub')) {
      const baseUrl = trimmed.split('/pub')[0];
      const gidMatch = trimmed.match(/[?&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : undefined;
      const gidQuery = gid ? `&gid=${gid}` : '';

      return {
        originalUrl: trimmed,
        formattedXlsxUrl: `${baseUrl}/pub?output=xlsx${gidQuery}`,
        fallbackCsvUrl: `${baseUrl}/pub?output=csv${gidQuery}`,
        isGoogleSheet: true,
        gid
      };
    }

    // Standard Google Sheet ID pattern: /d/{ID}/
    const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      const sheetId = idMatch[1];
      // Check for gid in fragment or query (#gid=123 or ?gid=123)
      const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : undefined;
      const gidQuery = gid ? `&gid=${gid}` : '';

      return {
        originalUrl: trimmed,
        formattedXlsxUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx${gidQuery}`,
        fallbackCsvUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidQuery}`,
        isGoogleSheet: true,
        sheetId,
        gid
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
    throw new Error('Vui lòng nhập đường dẫn biểu mẫu Excel hoặc Google Sheets hợp lệ.');
  }

  const urlsToTry: Array<{ url: string; isCsv: boolean }> = [];

  // If local Vite proxy is accessible, try it first
  urlsToTry.push({ url: `/api/fetch-online-excel?url=${encodeURIComponent(urlInfo.formattedXlsxUrl)}`, isCsv: false });
  if (urlInfo.fallbackCsvUrl) {
    urlsToTry.push({ url: `/api/fetch-online-excel?url=${encodeURIComponent(urlInfo.fallbackCsvUrl)}`, isCsv: true });
  }

  // Direct fetch (works if CORS is allowed)
  urlsToTry.push({ url: urlInfo.formattedXlsxUrl, isCsv: false });
  if (urlInfo.fallbackCsvUrl) {
    urlsToTry.push({ url: urlInfo.fallbackCsvUrl, isCsv: true });
  }

  // Public CORS proxies as resilience fallback
  urlsToTry.push({ url: `https://corsproxy.io/?url=${encodeURIComponent(urlInfo.formattedXlsxUrl)}`, isCsv: false });
  if (urlInfo.fallbackCsvUrl) {
    urlsToTry.push({ url: `https://corsproxy.io/?url=${encodeURIComponent(urlInfo.fallbackCsvUrl)}`, isCsv: true });
  }
  urlsToTry.push({ url: `https://api.allorigins.win/raw?url=${encodeURIComponent(urlInfo.formattedXlsxUrl)}`, isCsv: false });

  let lastError: any = null;

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

      const contentType = response.headers.get('content-type') || '';
      const arrayBuffer = await response.arrayBuffer();

      if (!arrayBuffer || arrayBuffer.byteLength < 50) {
        continue;
      }

      // Check if response is HTML error page (e.g. Google Login redirect or 404 page)
      const firstBytes = new Uint8Array(arrayBuffer.slice(0, 100));
      const textSample = String.fromCharCode(...firstBytes).toLowerCase();
      if (textSample.includes('<!doctype html') || textSample.includes('<html') || textSample.includes('accounts.google.com')) {
        throw new Error('Đường dẫn Google Sheets chưa được chia sẻ công khai ("Bất kỳ ai có liên kết" / "Anyone with the link"). Vui lòng kiểm tra lại quyền truy cập.');
      }

      const isCsvDetected = item.isCsv || contentType.includes('text/csv') || contentType.includes('text/plain');

      return {
        buffer: arrayBuffer,
        isCsv: isCsvDetected,
        sourceUrl: urlInfo.originalUrl
      };
    } catch (err: any) {
      lastError = err;
      if (err.message && err.message.includes('quyền truy cập')) {
        throw err;
      }
    }
  }

  throw new Error(
    lastError?.message || 
    'Không thể tải dữ liệu từ đường dẫn biểu mẫu online. Hãy đảm bảo rằng tệp Google Sheets đã được cấp quyền "Bất kỳ ai có đường liên kết đều có thể xem" (Anyone with the link can view).'
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

