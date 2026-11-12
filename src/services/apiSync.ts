import { Procedure, AppSettings, UserAccount } from '../types';

export interface ServerSyncPayload {
  procedures: Procedure[];
  linhVucPresets: string[];
  soNganhPresets: string[];
  settings: AppSettings;
  users?: UserAccount[];
  updatedBy?: string;
}

export interface ServerSyncResponse {
  success: boolean;
  message?: string;
  procedures?: Procedure[];
  linhVucPresets?: string[];
  soNganhPresets?: string[];
  settings?: AppSettings;
  users?: UserAccount[];
  lastUpdated?: string;
  count?: number;
}

/**
 * Fetches shared data from central server API
 */
export async function fetchServerData(): Promise<ServerSyncResponse | null> {
  try {
    const res = await fetch(`/api/tthc/data?t=${Date.now()}`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!res.ok) {
      console.warn(`Máy chủ phản hồi mã ${res.status} khi nạp dữ liệu.`);
      return null;
    }

    const data = await res.json();
    if (data && data.success) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('Không thể kết nối đến máy chủ trung tâm:', err);
    return null;
  }
}

/**
 * Pushes full data payload to central server
 */
export async function syncDataToServer(payload: ServerSyncPayload): Promise<ServerSyncResponse> {
  try {
    const res = await fetch('/api/tthc/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        ...payload,
        updatedAt: new Date().toISOString()
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Lỗi máy chủ (${res.status})`);
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error('Lỗi khi gửi dữ liệu lên máy chủ:', err);
    throw err;
  }
}

/**
 * Pushes system and unit configuration directly to central server
 */
export async function syncSettingsToServer(settings: AppSettings, updatedBy?: string): Promise<ServerSyncResponse> {
  try {
    const res = await fetch('/api/tthc/sync-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        settings,
        updatedBy: updatedBy || 'Quản trị viên'
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Lỗi lưu cấu hình (${res.status})`);
    }

    return await res.json();
  } catch (err: any) {
    console.error('Lỗi khi gửi cấu hình lên máy chủ:', err);
    throw err;
  }
}

/**
 * Pushes user accounts directly to central server
 */
export async function syncUsersToServer(users: UserAccount[], updatedBy?: string): Promise<ServerSyncResponse> {
  try {
    const res = await fetch('/api/tthc/sync-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        users,
        updatedBy: updatedBy || 'Quản trị viên'
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Lỗi lưu người dùng (${res.status})`);
    }

    return await res.json();
  } catch (err: any) {
    console.error('Lỗi khi gửi danh sách người dùng lên máy chủ:', err);
    throw err;
  }
}

/**
 * Resets central database to system initial presets
 */
export async function resetServerData(): Promise<ServerSyncResponse> {
  try {
    const res = await fetch('/api/tthc/reset', {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Lỗi máy chủ (${res.status})`);
    }

    return await res.json();
  } catch (err: any) {
    console.error('Lỗi khôi phục máy chủ:', err);
    throw err;
  }
}

/**
 * Cấu hình đường link Google Sheets / Excel Online trực tiếp và đồng bộ ngay lên máy chủ trung tâm
 */
export async function configureOnlineSheet(
  url: string, 
  mode: 'replace_all' | 'merge' | 'add_only' | 'replace' = 'replace_all', 
  autoSync: boolean = true
): Promise<ServerSyncResponse> {
  try {
    const res = await fetch('/api/tthc/configure-online-sheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ url: url.trim(), mode, autoSync })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
    }

    return data;
  } catch (err: any) {
    console.error('Lỗi cấu hình Google Sheets lên máy chủ:', err);
    throw err;
  }
}

/**
 * Kích hoạt đồng bộ thủ công ngay từ Google Sheet đã lưu trên máy chủ
 */
export async function syncOnlineSheet(
  url?: string, 
  mode?: 'replace_all' | 'merge' | 'add_only' | 'replace'
): Promise<ServerSyncResponse> {
  try {
    const res = await fetch('/api/tthc/sync-online-sheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ url: url?.trim(), mode })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Lỗi đồng bộ Google Sheets (${res.status})`);
    }

    return data;
  } catch (err: any) {
    console.error('Lỗi đồng bộ Google Sheets:', err);
    throw err;
  }
}

/**
 * Ngắt kết nối Google Sheet khỏi hệ thống
 */
export async function disconnectOnlineSheet(): Promise<ServerSyncResponse> {
  try {
    const res = await fetch('/api/tthc/disconnect-online-sheet', {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Lỗi ngắt kết nối (${res.status})`);
    }

    return data;
  } catch (err: any) {
    console.error('Lỗi ngắt kết nối Google Sheet:', err);
    throw err;
  }
}

