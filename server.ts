import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_PROCEDURES, LINH_VUC_PRESETS, SO_NGANH_PRESETS, DEFAULT_APP_SETTINGS } from './src/mockData';
import { Procedure, AppSettings, UserAccount } from './src/types';
import { DEFAULT_USERS } from './src/utils/userManagement';
import { formatOnlineExcelUrl } from './src/utils/onlineExcelSync';
import { parseWorkbookToProcedures, loadWorkbookFromBuffer } from './src/utils/excelParserHelper';

interface DatabaseSchema {
  procedures: Procedure[];
  linhVucPresets: string[];
  soNganhPresets: string[];
  settings: AppSettings;
  users?: UserAccount[];
  lastUpdated: string;
  version: number;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'tthc_db.json');

// Ensure database directory and file exist with initial defaults
function ensureDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = {
        procedures: INITIAL_PROCEDURES,
        linhVucPresets: LINH_VUC_PRESETS,
        soNganhPresets: SO_NGANH_PRESETS,
        settings: DEFAULT_APP_SETTINGS,
        users: DEFAULT_USERS,
        lastUpdated: new Date().toISOString(),
        version: 1
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      console.log('✅ Khởi tạo cơ sở dữ liệu dùng chung tthc_db.json thành công!');
      return initialDb;
    }

    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
      parsed.users = DEFAULT_USERS;
    }
    return parsed;
  } catch (err) {
    console.error('Lỗi khi đọc/ghi cơ sở dữ liệu:', err);
    return {
      procedures: INITIAL_PROCEDURES,
      linhVucPresets: LINH_VUC_PRESETS,
      soNganhPresets: SO_NGANH_PRESETS,
      settings: DEFAULT_APP_SETTINGS,
      users: DEFAULT_USERS,
      lastUpdated: new Date().toISOString(),
      version: 1
    };
  }
}

const loadDatabase = ensureDatabase;

function saveDatabase(data: DatabaseSchema): boolean {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('Lỗi lưu cơ sở dữ liệu:', err);
    return false;
  }
}

/**
 * Tải file dữ liệu Google Sheets / Excel Online trực tiếp từ máy chủ Node.js
 */
async function fetchOnlineSpreadsheetBuffer(rawUrl: string): Promise<{ buffer: Buffer; isCsv: boolean; sourceUrl: string }> {
  const urlInfo = formatOnlineExcelUrl(rawUrl);
  if (!urlInfo.formattedXlsxUrl) {
    throw new Error('Vui lòng nhập đường dẫn Google Sheets hoặc Excel Online hợp lệ.');
  }

  const urlsToTry: Array<{ url: string; isCsv: boolean }> = [];
  urlsToTry.push({ url: urlInfo.formattedXlsxUrl, isCsv: false });
  if (urlInfo.fallbackCsvUrl) {
    urlsToTry.push({ url: urlInfo.fallbackCsvUrl, isCsv: true });
  }
  if (urlInfo.isGoogleSheet && urlInfo.sheetId) {
    const gidQuery = urlInfo.gid ? `&gid=${urlInfo.gid}` : '';
    urlsToTry.push({
      url: `https://docs.google.com/spreadsheets/d/${urlInfo.sheetId}/export?format=csv${gidQuery}`,
      isCsv: true
    });
  }

  let lastError: any = null;
  for (const item of urlsToTry) {
    try {
      const response = await fetch(item.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength < 50) {
        continue;
      }

      const firstBytes = new Uint8Array(arrayBuffer.slice(0, 100));
      const textSample = String.fromCharCode(...firstBytes).toLowerCase();
      if (textSample.includes('<!doctype html') || textSample.includes('<html') || textSample.includes('accounts.google.com')) {
        throw new Error('Tệp Google Sheets chưa được cấp quyền công khai. Vui lòng mở Google Sheets -> Nhấn nút "Chia sẻ" ở góc trên bên phải -> Mục "Quyền truy cập chung" chọn: "Bất kỳ ai có đường liên kết" (Quyền: Người xem).');
      }

      const isCsv = item.isCsv || contentType.includes('text/csv') || contentType.includes('text/plain');
      return {
        buffer: Buffer.from(arrayBuffer),
        isCsv,
        sourceUrl: urlInfo.originalUrl
      };
    } catch (err: any) {
      lastError = err;
      if (err.message && err.message.includes('chưa được cấp quyền công khai')) {
        throw err;
      }
    }
  }

  throw new Error(lastError?.message || 'Không thể kết nối đến tệp Google Sheets. Vui lòng kiểm tra lại đường link và quyền chia sẻ công khai.');
}

/**
 * Phân tích và đồng bộ trực tiếp dữ liệu từ Google Sheets vào cơ sở dữ liệu dùng chung tthc_db.json
 */
async function syncDatabaseFromOnlineSheet(
  rawUrl: string, 
  mode: 'replace_all' | 'merge' | 'add_only' | 'replace' = 'replace_all'
) {
  const { buffer, isCsv } = await fetchOnlineSpreadsheetBuffer(rawUrl);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const workbook = await loadWorkbookFromBuffer(arrayBuffer, isCsv);
  const parseResult = parseWorkbookToProcedures(workbook);

  if (parseResult.procedures.length === 0) {
    throw new Error('Không tìm thấy bản ghi thủ tục hành chính nào trong tệp Google Sheets. Vui lòng kiểm tra tiêu đề các cột.');
  }

  const db = ensureDatabase();
  let updatedList: Procedure[] = [];
  if (mode === 'replace' || mode === 'replace_all') {
    updatedList = parseResult.procedures;
  } else if (mode === 'add_only') {
    const existingCodeSet = new Set(db.procedures.map(p => p.maTthc.toLowerCase().trim()));
    const newItems = parseResult.procedures.filter(p => !existingCodeSet.has(p.maTthc.toLowerCase().trim()));
    updatedList = [...newItems, ...db.procedures];
  } else {
    const map = new Map<string, Procedure>();
    db.procedures.forEach(p => map.set(p.maTthc.toLowerCase().trim(), p));
    parseResult.procedures.forEach(p => map.set(p.maTthc.toLowerCase().trim(), p));
    updatedList = Array.from(map.values());
  }

  const newLinhVuc = Array.from(new Set([...(db.linhVucPresets || []), ...updatedList.map(p => p.linhVuc).filter(Boolean)]));
  const newSoNganh = Array.from(new Set([...(db.soNganhPresets || []), ...updatedList.map(p => p.soNganh).filter(Boolean)]));

  const normalizedSyncMode: 'replace_all' | 'merge' | 'add_only' = 
    mode === 'replace' ? 'replace_all' : mode;

  db.procedures = updatedList;
  db.linhVucPresets = newLinhVuc;
  db.soNganhPresets = newSoNganh;
  db.settings = {
    ...db.settings,
    onlineExcelUrl: rawUrl,
    onlineExcelAutoSync: db.settings.onlineExcelAutoSync ?? true,
    onlineExcelSyncMode: normalizedSyncMode,
    lastOnlineSyncDate: new Date().toISOString(),
    lastOnlineSyncCount: updatedList.length
  };
  db.lastUpdated = new Date().toISOString();
  db.version = (db.version || 1) + 1;
  saveDatabase(db);

  console.log(`[ĐỒNG BỘ GOOGLE SHEETS] Máy chủ đã nạp và lưu thành công ${updatedList.length} thủ tục từ: ${rawUrl}`);

  return {
    success: true,
    count: updatedList.length,
    procedures: updatedList,
    linhVucPresets: newLinhVuc,
    soNganhPresets: newSoNganh,
    settings: db.settings,
    lastUpdated: db.lastUpdated,
    warnings: parseResult.warnings
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB on boot
  ensureDatabase();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- API ROUTES FIRST ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get full shared dataset
  app.get('/api/tthc/data', (req, res) => {
    try {
      const db = ensureDatabase();
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({
        success: true,
        procedures: db.procedures || [],
        linhVucPresets: db.linhVucPresets || LINH_VUC_PRESETS,
        soNganhPresets: db.soNganhPresets || SO_NGANH_PRESETS,
        settings: db.settings || DEFAULT_APP_SETTINGS,
        users: db.users || DEFAULT_USERS,
        lastUpdated: db.lastUpdated,
        count: db.procedures ? db.procedures.length : 0
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi đọc dữ liệu máy chủ' });
    }
  });

  // Sync / Save dataset from Admin
  app.post('/api/tthc/sync', (req, res) => {
    try {
      const { procedures, linhVucPresets, soNganhPresets, settings, users, updatedBy } = req.body;

      if (!Array.isArray(procedures)) {
        return res.status(400).json({ success: false, error: 'Danh sách thủ tục không hợp lệ (cần mảng dữ liệu)' });
      }

      const currentDb = ensureDatabase();
      const updatedDb: DatabaseSchema = {
        procedures,
        linhVucPresets: Array.isArray(linhVucPresets) && linhVucPresets.length > 0 ? linhVucPresets : currentDb.linhVucPresets,
        soNganhPresets: Array.isArray(soNganhPresets) && soNganhPresets.length > 0 ? soNganhPresets : currentDb.soNganhPresets,
        settings: settings ? { ...currentDb.settings, ...settings, isCustomized: true } : currentDb.settings,
        users: Array.isArray(users) && users.length > 0 ? users : (currentDb.users || DEFAULT_USERS),
        lastUpdated: new Date().toISOString(),
        version: (currentDb.version || 1) + 1
      };

      const ok = saveDatabase(updatedDb);
      if (!ok) {
        return res.status(500).json({ success: false, error: 'Không thể ghi file cơ sở dữ liệu trên máy chủ' });
      }

      console.log(`[ĐỒNG BỘ THÀNH CÔNG] Đã lưu ${procedures.length} thủ tục lên máy chủ chung lúc ${updatedDb.lastUpdated} bởi ${updatedBy || 'Quản trị viên'}`);

      res.json({
        success: true,
        message: 'Đã lưu trữ dữ liệu tập trung lên máy chủ thành công',
        count: procedures.length,
        settings: updatedDb.settings,
        users: updatedDb.users,
        lastUpdated: updatedDb.lastUpdated
      });
    } catch (err: any) {
      console.error('Lỗi API /api/tthc/sync:', err);
      res.status(500).json({ success: false, error: err.message || 'Lỗi xử lý đồng bộ' });
    }
  });

  // Sync / Save System & Kiosk Settings directly
  app.post('/api/tthc/sync-settings', (req, res) => {
    try {
      const { settings, updatedBy } = req.body;
      if (!settings) {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu cấu hình' });
      }
      const currentDb = ensureDatabase();
      const updatedDb: DatabaseSchema = {
        ...currentDb,
        settings: {
          ...currentDb.settings,
          ...settings,
          isCustomized: true
        },
        lastUpdated: new Date().toISOString(),
        version: (currentDb.version || 1) + 1
      };
      const ok = saveDatabase(updatedDb);
      if (!ok) {
        return res.status(500).json({ success: false, error: 'Không thể lưu cấu hình trên máy chủ' });
      }
      console.log(`[CẤU HÌNH ĐƠN VỊ] Đã lưu cấu hình cơ quan/niêm yết: ${settings.agencyName || settings.kioskBannerSubtitle} bởi ${updatedBy || 'Quản trị viên'}`);
      res.json({
        success: true,
        message: 'Đã lưu cấu hình đơn vị lên máy chủ thành công',
        settings: updatedDb.settings,
        lastUpdated: updatedDb.lastUpdated
      });
    } catch (err: any) {
      console.error('Lỗi API /api/tthc/sync-settings:', err);
      res.status(500).json({ success: false, error: err.message || 'Lỗi lưu cấu hình' });
    }
  });

  // Sync / Save User Accounts directly
  app.post('/api/tthc/sync-users', (req, res) => {
    try {
      const { users, updatedBy } = req.body;
      if (!Array.isArray(users)) {
        return res.status(400).json({ success: false, error: 'Danh sách người dùng không hợp lệ' });
      }
      const currentDb = ensureDatabase();
      const updatedDb: DatabaseSchema = {
        ...currentDb,
        users,
        lastUpdated: new Date().toISOString(),
        version: (currentDb.version || 1) + 1
      };
      const ok = saveDatabase(updatedDb);
      if (!ok) {
        return res.status(500).json({ success: false, error: 'Không thể lưu danh sách người dùng trên máy chủ' });
      }
      console.log(`[NGƯỜI DÙNG] Đã lưu ${users.length} tài khoản người dùng bởi ${updatedBy || 'Quản trị viên'}`);
      res.json({
        success: true,
        message: 'Đã lưu danh sách người dùng lên máy chủ thành công',
        count: users.length,
        lastUpdated: updatedDb.lastUpdated
      });
    } catch (err: any) {
      console.error('Lỗi API /api/tthc/sync-users:', err);
      res.status(500).json({ success: false, error: err.message || 'Lỗi lưu người dùng' });
    }
  });

  // Reset dataset to initial defaults
  app.post('/api/tthc/reset', (req, res) => {
    try {
      const initialDb: DatabaseSchema = {
        procedures: INITIAL_PROCEDURES,
        linhVucPresets: LINH_VUC_PRESETS,
        soNganhPresets: SO_NGANH_PRESETS,
        settings: DEFAULT_APP_SETTINGS,
        lastUpdated: new Date().toISOString(),
        version: 1
      };
      saveDatabase(initialDb);

      res.json({
        success: true,
        message: 'Đã khôi phục cơ sở dữ liệu máy chủ về mặc định ban đầu',
        procedures: initialDb.procedures,
        linhVucPresets: initialDb.linhVucPresets,
        soNganhPresets: initialDb.soNganhPresets,
        settings: initialDb.settings,
        lastUpdated: initialDb.lastUpdated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Lỗi khôi phục máy chủ' });
    }
  });

  // Helper to escape CSV fields
  const escapeCsv = (val: any): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Real-time live online spreadsheet CSV endpoint (can be linked to Google Sheets or Excel Web)
  app.get('/api/tthc/sheet.csv', (req, res) => {
    try {
      const db = loadDatabase();
      const lines: string[] = [
        'BIỂU MẪU NHẬP DỮ LIỆU THỦ TỤC HÀNH CHÍNH (ĐỒNG BỘ MÃ QR VÀ CÁC CỘT),,,,,,,,,,,,',
        '"Lưu ý: Không đổi tên các cột ở Hàng 3. Cột ""Nội dung đưa vào mã QR"" có thể điền link URL hoặc nội dung văn bản để quét QR.",,,,,,,,,,,,',
        'STT,Mã TTHC (*),Tên Thủ tục Hành chính (*),Lĩnh vực (*),"Bộ, ngành quản lý (*)",Cấp thực hiện / Thẩm quyền (*),Căn cứ pháp lý / Quyết định,Nội dung đưa vào mã QR (URL / Văn bản),BCCI Tiếp nhận (Có/Không),BCCI Trả kết quả (Có/Không),Bộ phận Một cửa (Có/Không),Dịch vụ công trực tuyến (Toàn trình/Một phần/Không),Dùng chung (Có/Không)'
      ];

      db.procedures.forEach((p, index) => {
        const row = [
          escapeCsv(index + 1),
          escapeCsv(p.maTthc || ''),
          escapeCsv(p.tenTthc || ''),
          escapeCsv(p.linhVuc || ''),
          escapeCsv(p.soNganh || ''),
          escapeCsv(p.capThucHien || 'Cấp xã'),
          escapeCsv(p.canCuPhapLy || ''),
          escapeCsv(p.ghiChu || ''),
          escapeCsv(p.bcciTiepNhan ? 'Có' : 'Không'),
          escapeCsv(p.bcciTraKetQua ? 'Có' : 'Không'),
          escapeCsv(p.motCua ? 'Có' : 'Không'),
          escapeCsv(p.dvcttLoai || 'Không'),
          escapeCsv(p.dungChung ? 'Có' : 'Không')
        ];
        lines.push(row.join(','));
      });

      const csvOutput = lines.join('\r\n');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline; filename="bieu_mau_tthc_online.csv"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      // Include UTF-8 BOM so Excel opens with proper Vietnamese diacritics
      res.send('\uFEFF' + csvOutput);
    } catch (err: any) {
      res.status(500).send('Lỗi tạo dữ liệu bảng tính trực tuyến: ' + (err?.message || 'Lỗi'));
    }
  });

  // Import CSV text endpoint for bi-directional synchronization
  app.post('/api/tthc/import-csv', (req, res) => {
    try {
      const { csvText, mode = 'replace' } = req.body || {};
      if (!csvText || typeof csvText !== 'string') {
        return res.status(400).json({ success: false, error: 'Thiếu nội dung csvText' });
      }

      // Simple CSV line parser
      const parseCSVLine = (text: string) => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
      let headerIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Mã TTHC') && lines[i].includes('Tên Thủ tục')) {
          headerIndex = i;
          break;
        }
      }

      if (headerIndex === -1) {
        return res.status(400).json({ success: false, error: 'Không tìm thấy dòng tiêu đề chuẩn của mẫu biểu (Mã TTHC, Tên Thủ tục...)' });
      }

      const parsedProcedures: Procedure[] = [];
      const now = new Date().toISOString();

      for (let i = headerIndex + 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length < 3 || !row[1] || !row[2]) continue;

        let maTthc = (row[1] || '').trim().replace(/^"|"$/g, '').replace(/,/g, '.');
        const tenTthc = (row[2] || '').trim().replace(/^"|"$/g, '');
        const linhVuc = (row[3] || 'Khác').trim().replace(/^"|"$/g, '');
        const soNganh = (row[4] || 'UBND cấp xã').trim().replace(/^"|"$/g, '');
        const capThucHien = (row[5] || 'Cấp xã').trim().replace(/^"|"$/g, '');
        const canCuPhapLy = (row[6] || '').trim().replace(/^"|"$/g, '');
        const qrContent = (row[7] || '').trim().replace(/^"|"$/g, '');

        const bcciTiepNhan = /có|co|yes|true|1/i.test(row[8] || '');
        const bcciTraKetQua = /có|co|yes|true|1/i.test(row[9] || '');
        const motCua = /có|co|yes|true|1/i.test(row[10] || '');

        let dvcttLoai: 'Toàn trình' | 'Một phần' | 'Không' = 'Một phần';
        const dvcRaw = (row[11] || '').toLowerCase();
        if (dvcRaw.includes('toàn trình') || dvcRaw.includes('toan trinh')) {
          dvcttLoai = 'Toàn trình';
        } else if (dvcRaw.includes('không') || dvcRaw.includes('khong') || dvcRaw === '') {
          dvcttLoai = 'Không';
        }

        const dungChung = /có|co|yes|true|1/i.test(row[12] || '');

        parsedProcedures.push({
          id: `tthc_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          maTthc,
          tenTthc,
          linhVuc,
          soNganh,
          capThucHien,
          canCuPhapLy: canCuPhapLy || 'Quy định pháp luật hiện hành',
          bcciTiepNhan,
          bcciTraKetQua,
          motCua,
          dvcttLoai,
          dungChung,
          ngayTao: now,
          ngayCapNhat: now,
          ghiChu: qrContent
        });
      }

      if (parsedProcedures.length === 0) {
        return res.status(400).json({ success: false, error: 'Không trích xuất được dòng dữ liệu hợp lệ nào từ CSV' });
      }

      const db = loadDatabase();
      let updatedList: Procedure[] = [];

      if (mode === 'replace') {
        updatedList = parsedProcedures;
      } else {
        // Merge mode by maTthc
        const existingMap = new Map<string, Procedure>();
        db.procedures.forEach(p => existingMap.set(p.maTthc, p));
        parsedProcedures.forEach(p => existingMap.set(p.maTthc, p));
        updatedList = Array.from(existingMap.values());
      }

      // Collect new categories
      const newLinhVuc = Array.from(new Set([...db.linhVucPresets, ...updatedList.map(p => p.linhVuc).filter(Boolean)]));
      const newSoNganh = Array.from(new Set([...db.soNganhPresets, ...updatedList.map(p => p.soNganh).filter(Boolean)]));

      db.procedures = updatedList;
      db.linhVucPresets = newLinhVuc;
      db.soNganhPresets = newSoNganh;
      db.lastUpdated = new Date().toISOString();

      saveDatabase(db);

      res.json({
        success: true,
        message: `Đã cập nhật thành công ${updatedList.length} thủ tục hành chính từ biểu mẫu trực tuyến`,
        count: updatedList.length,
        procedures: updatedList,
        lastUpdated: db.lastUpdated
      });
    } catch (err: any) {
      console.error('Lỗi import CSV:', err);
      res.status(500).json({ success: false, error: err?.message || 'Lỗi xử lý file CSV' });
    }
  });

  // Proxy endpoint for downloading online Excel / Google Sheet files (CORS bypass)
  app.get('/api/fetch-online-excel', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        res.status(400).json({ error: 'Thiếu tham số url' });
        return;
      }
      const fetchRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        },
        redirect: 'follow'
      });
      if (!fetchRes.ok) {
        res.status(fetchRes.status).json({ error: `Lỗi máy chủ nguồn: ${fetchRes.status} ${fetchRes.statusText}` });
        return;
      }
      const buf = await fetchRes.arrayBuffer();
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'application/octet-stream');
      res.send(Buffer.from(buf));
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Không thể tải file từ đường dẫn trực tuyến' });
    }
  });

  // Cấu hình liên kết Google Sheet / Excel Online trực tiếp và đồng bộ ngay
  app.post('/api/tthc/configure-online-sheet', async (req, res) => {
    try {
      const { url, mode = 'replace', autoSync = true } = req.body || {};
      if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp đường link Google Sheets hoặc Excel Online' });
      }

      const syncResult = await syncDatabaseFromOnlineSheet(url.trim(), mode);
      const db = ensureDatabase();
      db.settings = {
        ...db.settings,
        onlineExcelUrl: url.trim(),
        onlineExcelAutoSync: autoSync,
        onlineExcelSyncMode: mode
      };
      saveDatabase(db);

      res.json({
        success: true,
        message: `Đã kết nối và đồng bộ thành công ${syncResult.count} thủ tục từ Google Sheet!`,
        count: syncResult.count,
        procedures: syncResult.procedures,
        settings: db.settings,
        lastUpdated: syncResult.lastUpdated,
        warnings: syncResult.warnings
      });
    } catch (err: any) {
      console.error('Lỗi cấu hình Google Sheet:', err);
      res.status(500).json({ 
        success: false, 
        error: err?.message || 'Lỗi kết nối hoặc xử lý dữ liệu từ đường link Google Sheet' 
      });
    }
  });

  // Đồng bộ thủ công ngay từ Google Sheet đã lưu
  app.post('/api/tthc/sync-online-sheet', async (req, res) => {
    try {
      const db = ensureDatabase();
      const targetUrl = req.body?.url || db.settings?.onlineExcelUrl;
      const targetMode = req.body?.mode || db.settings?.onlineExcelSyncMode || 'replace';

      if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.trim()) {
        return res.status(400).json({ 
          success: false, 
          error: 'Chưa cấu hình đường link Google Sheets trong hệ thống. Vui lòng dán link Google Sheets của bạn trước.' 
        });
      }

      const syncResult = await syncDatabaseFromOnlineSheet(targetUrl.trim(), targetMode);
      res.json({
        success: true,
        message: `Đã đồng bộ thành công ${syncResult.count} thủ tục từ Google Sheet!`,
        count: syncResult.count,
        procedures: syncResult.procedures,
        settings: syncResult.settings,
        lastUpdated: syncResult.lastUpdated,
        warnings: syncResult.warnings
      });
    } catch (err: any) {
      console.error('Lỗi đồng bộ Google Sheet:', err);
      res.status(500).json({ 
        success: false, 
        error: err?.message || 'Không thể đồng bộ dữ liệu từ Google Sheet' 
      });
    }
  });

  // Hủy liên kết Google Sheet
  app.post('/api/tthc/disconnect-online-sheet', (req, res) => {
    try {
      const db = ensureDatabase();
      db.settings = {
        ...db.settings,
        onlineExcelUrl: '',
        onlineExcelAutoSync: false
      };
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);

      res.json({
        success: true,
        message: 'Đã hủy liên kết Google Sheets thành công.',
        settings: db.settings,
        lastUpdated: db.lastUpdated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Lỗi hủy liên kết' });
    }
  });

  // Thiết lập vòng lặp chạy nền định kỳ trên máy chủ để tự động cập nhật từ Google Sheet
  let isBackgroundSyncRunning = false;
  setInterval(async () => {
    try {
      const db = ensureDatabase();
      if (db.settings?.onlineExcelUrl && db.settings?.onlineExcelAutoSync !== false && !isBackgroundSyncRunning) {
        isBackgroundSyncRunning = true;
        await syncDatabaseFromOnlineSheet(db.settings.onlineExcelUrl, db.settings.onlineExcelSyncMode || 'replace_all');
      }
    } catch (err: any) {
      // Bỏ qua lỗi mạng nền tạm thời để không spam log
    } finally {
      isBackgroundSyncRunning = false;
    }
  }, 45000); // 45 giây kiểm tra 1 lần


  // Vite middleware for development or static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Máy chủ TTHC đang hoạt động tại http://0.0.0.0:${PORT}`);
  });
}

startServer();
