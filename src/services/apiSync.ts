import { Procedure, AppSettings } from '../types';

export interface ServerSyncPayload {
  procedures: Procedure[];
  linhVucPresets: string[];
  soNganhPresets: string[];
  settings: AppSettings;
  updatedBy?: string;
}

export interface ServerSyncResponse {
  success: boolean;
  message?: string;
  procedures?: Procedure[];
  linhVucPresets?: string[];
  soNganhPresets?: string[];
  settings?: AppSettings;
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
