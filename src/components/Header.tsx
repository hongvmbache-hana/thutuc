import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Database, FileText, Globe, RefreshCw } from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  totalCount: number;
  settings: AppSettings;
  isServerSyncing?: boolean;
  serverStatus?: 'synced' | 'pending' | 'offline';
  onRefreshServer?: () => void;
  lastSyncTime?: string | null;
}

export default function Header({ 
  totalCount, 
  settings, 
  isServerSyncing = false, 
  serverStatus = 'synced', 
  onRefreshServer 
}: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const day = days[date.getDay()];
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${day}, ${dd}/${mm}/${yyyy}`;
  };

  const formatTime = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  return (
    <header className="bg-gradient-to-r from-red-800 to-red-950 text-white shadow-md border-b-4 border-amber-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 sm:py-5 gap-4">
          
          {/* Logo & Portal Title */}
          <div className="flex items-center space-x-3.5">
            <div className="bg-amber-500 text-red-950 text-2.5xl p-2 h-12 w-12 rounded-full shadow-inner flex items-center justify-center animate-pulse select-none shrink-0 border border-amber-300">
              {settings.logoEmoji || '🏛️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-350 bg-red-900/90 px-2 py-0.5 rounded border border-red-700/80">
                  {settings.badgeLabel || 'Hệ thống nội bộ'}
                </span>
                <span className="text-xs text-amber-200 flex items-center gap-1 font-mono font-bold">
                  <Database className="w-3 h-3" /> {settings.systemVersion || 'v2.6.4'}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white mt-1 uppercase">
                {settings.siteTitle || 'QUẢN LÝ THỦ TỤC HÀNH CHÍNH'}
              </h1>
              <p className="text-xs text-red-100 font-medium leading-relaxed max-w-2xl">
                {settings.siteSubtitle || 'Cổng thông tin điện tử nâng cao chỉ số cải cách hành chính'}
              </p>
            </div>
          </div>

          {/* Time, Server Status & Quick Stats Dashboard */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 md:self-end">
            
            {/* Server Sync Status Badge */}
            <div className="bg-red-900/70 backdrop-blur-sm border border-red-700/60 rounded-lg px-3 py-1.5 flex items-center space-x-2 text-xs shadow-inner">
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isServerSyncing 
                    ? 'bg-amber-400 animate-ping' 
                    : serverStatus === 'offline' 
                      ? 'bg-rose-400' 
                      : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                }`} />
                <div className="flex flex-col leading-tight">
                  <span className="text-[9.5px] uppercase font-bold text-amber-200 tracking-wider flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5 text-emerald-300" />
                    Dữ liệu dùng chung
                  </span>
                  <span className="text-[11px] font-semibold text-white/95">
                    {isServerSyncing ? 'Đang đồng bộ...' : serverStatus === 'offline' ? 'Bộ nhớ cục bộ' : 'Đồng bộ đa thiết bị'}
                  </span>
                </div>
              </div>

              {onRefreshServer && (
                <button
                  type="button"
                  onClick={onRefreshServer}
                  disabled={isServerSyncing}
                  className="p-1 ml-1 rounded bg-red-800/80 hover:bg-amber-500 hover:text-red-950 text-amber-200 transition-colors cursor-pointer disabled:opacity-50"
                  title="Bấm để tải lại dữ liệu mới nhất từ máy chủ (cập nhật nếu có máy khác vừa sửa/nhập)"
                  id="header-refresh-server-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isServerSyncing ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {/* Clock Widget */}
            <div className="bg-red-900/60 backdrop-blur-sm border border-red-700/50 rounded-lg px-3.5 py-1.5 flex items-center space-x-3 text-xs shadow-inner">
              <div className="flex flex-col items-end">
                <span className="text-red-200 font-medium flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  {formatDate(time)}
                </span>
                <span className="text-amber-300 font-mono font-semibold tracking-wider text-xs mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(time)}
                </span>
              </div>
            </div>

            {/* Total Badge Counter */}
            <div className="bg-amber-500 text-red-950 px-3.5 py-1.5 rounded-lg flex items-center space-x-2 shadow-md border border-amber-400 font-semibold text-xs">
              <FileText className="w-4 h-4" />
              <div className="flex flex-col leading-none">
                <span className="text-[9px] uppercase font-bold text-red-900/85">Cơ sở dữ liệu</span>
                <span className="text-sm font-bold font-mono mt-0.5">{totalCount} TTHC</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
