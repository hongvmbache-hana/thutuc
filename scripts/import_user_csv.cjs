const fs = require('fs');
const path = require('path');

function parseCSVLine(text) {
  const result = [];
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
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  // Find header line with STT, Mã TTHC
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Mã TTHC') && lines[i].includes('Tên Thủ tục')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Header not found in CSV');
  }

  const procedures = [];
  const now = new Date().toISOString();

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 3 || !row[1] || !row[2]) continue;

    const stt = row[0] || `${i - headerIndex}`;
    let maTthc = (row[1] || '').trim().replace(/^"|"$/g, '').replace(/,/g, '.');
    const tenTthc = (row[2] || '').trim().replace(/^"|"$/g, '');
    const linhVuc = (row[3] || 'Khác').trim().replace(/^"|"$/g, '');
    const soNganh = (row[4] || 'UBND cấp xã').trim().replace(/^"|"$/g, '');
    const capThucHien = (row[5] || 'Cấp xã').trim().replace(/^"|"$/g, '');
    const canCuPhapLy = (row[6] || '').trim().replace(/^"|"$/g, '');
    const qrContent = (row[7] || '').trim().replace(/^"|"$/g, '');
    
    // Booleans
    const bcciTiepNhan = /có|co|yes|true|1/i.test(row[8] || '');
    const bcciTraKetQua = /có|co|yes|true|1/i.test(row[9] || '');
    const motCua = /có|co|yes|true|1/i.test(row[10] || '');
    
    // DVCTT
    let dvcttLoai = 'Một phần';
    const dvcRaw = (row[11] || '').toLowerCase();
    if (dvcRaw.includes('toàn trình') || dvcRaw.includes('toan trinh')) {
      dvcttLoai = 'Toàn trình';
    } else if (dvcRaw.includes('không') || dvcRaw.includes('khong') || dvcRaw === '') {
      dvcttLoai = 'Không';
    } else if (dvcRaw.includes('một phần') || dvcRaw.includes('mot phan')) {
      dvcttLoai = 'Một phần';
    }

    const dungChung = /có|co|yes|true|1/i.test(row[12] || '');

    const id = `tthc_${Date.now()}_${i - headerIndex}_${Math.random().toString(36).substring(2, 7)}`;

    procedures.push({
      id,
      maTthc,
      tenTthc,
      linhVuc: linhVuc || 'Khác',
      soNganh: soNganh || 'UBND cấp xã',
      capThucHien: capThucHien || 'Cấp xã',
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

  return procedures;
}

const csvPath = path.join(__dirname, '../data/mau_bieu_online_goc.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const procedures = parseCSV(csvContent);
console.log(`Parsed ${procedures.length} procedures from CSV.`);

// Read existing DB to keep presets and settings
const dbPath = path.join(__dirname, '../data/tthc_db.json');
let db = {};
if (fs.existsSync(dbPath)) {
  db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

// Extract unique linh vuc and so nganh
const linhVucSet = new Set(db.linhVucPresets || []);
const soNganhSet = new Set(db.soNganhPresets || []);
procedures.forEach(p => {
  if (p.linhVuc) linhVucSet.add(p.linhVuc);
  if (p.soNganh) soNganhSet.add(p.soNganh);
});

db.procedures = procedures;
db.linhVucPresets = Array.from(linhVucSet);
db.soNganhPresets = Array.from(soNganhSet);
db.lastUpdated = new Date().toISOString();
db.version = (db.version || 1) + 1;

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
console.log(`Updated ${dbPath} with ${procedures.length} procedures.`);
