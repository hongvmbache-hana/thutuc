import React, { useState } from 'react';
import { 
  Monitor, 
  Layout, 
  Save, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Clock, 
  Phone, 
  Eye, 
  Sliders, 
  CheckCircle2,
  FileText,
  Volume2,
  Layers,
  Palette,
  MapPin
} from 'lucide-react';
import { AppSettings, Procedure } from '../types';
import HanhChinhCongLogo from './HanhChinhCongLogo';
import { QUANG_NINH_54_UNITS, getAgencyPresetOptions, QuangNinhUnit } from '../data/quangNinhUnits';

interface KioskManagementTabProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onShowToast: (message: string, type: 'success' | 'info' | 'error') => void;
  procedures?: Procedure[];
}

export default function KioskManagementTab({
  settings,
  onSaveSettings,
  onShowToast,
  procedures = []
}: KioskManagementTabProps) {
  // Banner states
  const [bannerTitle, setBannerTitle] = useState(settings.kioskBannerTitle || 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH');
  const [bannerSubtitle, setBannerSubtitle] = useState(settings.kioskBannerSubtitle || 'TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG XÃ BA CHẼ');
  const [bannerSlogan, setBannerSlogan] = useState(settings.kioskBannerSlogan || 'Chuyên nghiệp - Minh bạch - Kịp thời - Hiệu quả');
  const [bannerBgColor, setBannerBgColor] = useState<'white' | 'red' | 'blue' | 'slate'>(
    settings.kioskBannerBgColor || 'white'
  );
  const [selectedQnUnitId, setSelectedQnUnitId] = useState<string>('x_ba_che');
  const [filterUnitType, setFilterUnitType] = useState<'all' | 'phuong' | 'xa' | 'dackhu'>('all');
  const [showStatsOnClock, setShowStatsOnClock] = useState<boolean>(
    settings.kioskShowStatsOnClock !== undefined ? settings.kioskShowStatsOnClock : true
  );

  // Footer states
  const [footerText, setFooterText] = useState(
    settings.kioskFooterText || 'Dùng Camera điện thoại hoặc Zalo quét mã QR trên từng thẻ để tra cứu toàn văn và nộp hồ sơ trực tuyến.'
  );
  const [footerShowMarquee, setFooterShowMarquee] = useState<boolean>(
    settings.kioskFooterShowMarquee !== undefined ? settings.kioskFooterShowMarquee : true
  );
  const [footerMarquee, setFooterMarquee] = useState(
    settings.kioskFooterMarquee || 'Chào mừng Quý công dân và Doanh nghiệp đến giao dịch tại Bộ phận Tiếp nhận và Trả kết quả!'
  );
  const [footerHotline, setFooterHotline] = useState(
    settings.kioskFooterHotline || '0203.3888.222 / 1900.9095'
  );

  // Quick stats calculation
  const mockCapTinh = procedures.filter(p => (p.capThucHien || '').toLowerCase().includes('tỉnh')).length || 18;
  const mockCapXa = procedures.filter(p => (p.capThucHien || '').toLowerCase().includes('xã')).length || 105;
  const mockLienThong = procedures.filter(p => (p.capThucHien || '').toLowerCase().includes('liên thông') || (p.soNganh && p.soNganh.toLowerCase().includes('liên thông'))).length || 14;
  const mockToanTrinh = procedures.filter(p => p.dvcttLoai === 'Toàn trình').length || 72;
  const mockMotPhan = procedures.filter(p => p.dvcttLoai === 'Một phần').length || 51;

  // Handle Save
  const handleSave = () => {
    const updated: AppSettings = {
      ...settings,
      kioskBannerTitle: bannerTitle.trim() || 'BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH',
      kioskBannerSubtitle: bannerSubtitle.trim() || 'TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG XÃ BA CHẼ',
      kioskBannerSlogan: bannerSlogan.trim(),
      kioskBannerBgColor: bannerBgColor,
      kioskShowStatsOnClock: showStatsOnClock,
      kioskFooterText: footerText.trim(),
      kioskFooterShowMarquee: footerShowMarquee,
      kioskFooterMarquee: footerMarquee.trim(),
      kioskFooterHotline: footerHotline.trim()
    };

    onSaveSettings(updated);
    onShowToast('Đã lưu cấu hình Banner & Footer Kiosk thành công! Giao diện Kiosk sẽ hiển thị ngay.', 'success');
  };

  // Reset to default
  const handleResetDefault = () => {
    setBannerTitle('BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH');
    setBannerSubtitle('TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG XÃ BA CHẼ');
    setBannerSlogan('Chuyên nghiệp - Minh bạch - Kịp thời - Hiệu quả');
    setBannerBgColor('white');
    setShowStatsOnClock(true);
    setFooterText('Dùng Camera điện thoại hoặc Zalo quét mã QR trên từng thẻ để tra cứu toàn văn và nộp hồ sơ trực tuyến.');
    setFooterShowMarquee(true);
    setFooterMarquee('Chào mừng Quý công dân và Doanh nghiệp đến giao dịch tại Bộ phận Tiếp nhận và Trả kết quả!');
    setFooterHotline('0203.3888.222 / 1900.9095');
    onShowToast('Đã khôi phục các giá trị chuẩn mặc định của Kiosk.', 'info');
  };

  return (
    <div className="space-y-6" id="kiosk-management-tab">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-600/30 text-amber-300 rounded-lg border border-red-500/30">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base uppercase tracking-wide">
                Quản lý Banner & Footer Hệ thống Kiosk
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Tùy chỉnh nội dung tiêu đề, đơn vị, màu sắc Banner và số liệu thống kê cạnh trên đồng hồ, cùng dòng chữ chạy thông báo, thông tin hotline ở Footer Kiosk.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mặc định</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-[#c51f24] hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
              id="btn-save-kiosk-config"
            >
              <Save className="w-4 h-4" />
              <span>Lưu cấu hình Kiosk</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= LIVE PREVIEW BOX ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#c51f24]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Xem trước trực tiếp (Live Preview Kiosk)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Tự động cập nhật theo các thay đổi bên dưới
          </span>
        </div>

        {/* Mock Kiosk Container */}
        <div className="p-4 bg-slate-200/60 space-y-4">
          {/* Mock Header */}
          <div className={`rounded-xl border-b-4 border-amber-400 p-3.5 shadow-sm transition-colors ${
            bannerBgColor === 'red'
              ? 'bg-[#b91c1c] text-white'
              : bannerBgColor === 'blue'
                ? 'bg-[#1e3a8a] text-white'
                : bannerBgColor === 'slate'
                  ? 'bg-[#0f172a] text-white'
                  : 'bg-white text-slate-800'
          }`}>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              {/* Left Logo and titles */}
              <div className="flex items-center gap-3">
                <HanhChinhCongLogo size={46} className="shrink-0" />
                <div>
                  <h4 
                    className={`font-bold text-base uppercase leading-tight font-times ${
                      bannerBgColor !== 'white' ? 'text-white' : 'text-[#c51f24]'
                    }`}
                    style={{ fontFamily: '"Times New Roman", Times, "Tinos", serif' }}
                  >
                    {bannerTitle}
                  </h4>
                  <p 
                    className={`text-xs font-bold uppercase mt-0.5 font-times ${
                      bannerBgColor !== 'white' ? 'text-amber-300' : 'text-slate-800'
                    }`}
                    style={{ fontFamily: '"Times New Roman", Times, "Tinos", serif' }}
                  >
                    {bannerSubtitle}
                  </p>
                  {bannerSlogan && (
                    <p className={`text-[10.5px] italic mt-0.5 ${
                      bannerBgColor !== 'white' ? 'text-slate-200' : 'text-slate-500'
                    }`}>
                      {bannerSlogan}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Stats & Clock */}
              <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
                {showStatsOnClock && (
                  <div className="flex items-center flex-wrap gap-1 text-[10px] font-bold">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 rounded border border-blue-200">
                      Cấp tỉnh: <strong className="font-mono text-blue-950">{mockCapTinh}</strong>
                    </span>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 rounded border border-emerald-200">
                      Cấp xã: <strong className="font-mono text-emerald-950">{mockCapXa}</strong>
                    </span>
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-200">
                      Liên thông: <strong className="font-mono text-amber-950">{mockLienThong}</strong>
                    </span>
                    <span className="px-1.5 py-0.5 bg-teal-100 text-teal-900 rounded border border-teal-200">
                      Toàn trình: <strong className="font-mono text-teal-950">{mockToanTrinh}</strong> / Một phần: <strong className="font-mono text-sky-950">{mockMotPhan}</strong>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-red-50 border border-red-200 rounded-lg text-xs font-mono font-bold text-[#c51f24]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>10:30:15</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-400 text-slate-900 font-bold rounded">
                    Cấu hình
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mock Center Content placeholder */}
          <div className="bg-white/80 rounded-xl p-6 text-center border border-slate-300/80">
            <p className="text-xs text-slate-500 font-medium">
              [Vùng hiển thị danh mục Thẻ Niêm yết hoặc Bảng chi tiết thủ tục hành chính]
            </p>
          </div>

          {/* Mock Footer */}
          <div className="bg-slate-900 text-slate-300 rounded-xl border-t-2 border-amber-500 p-2.5 text-[11px] flex flex-col md:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center">
                i
              </span>
              <span className="font-medium">{footerText}</span>
            </div>

            {footerShowMarquee && (
              <div className="text-amber-300 text-[10.5px] truncate max-w-sm font-medium">
                {footerMarquee}
              </div>
            )}

            {footerHotline && (
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-amber-300 font-bold text-[10.5px]">
                <Phone className="w-3 h-3" />
                <span>Hotline:</span>
                <span className="font-mono text-white">{footerHotline}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= EDIT FORMS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Banner Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layout className="w-4 h-4 text-[#c51f24]" />
            <h4 className="font-bold text-slate-900 text-sm uppercase">1. Cấu hình Banner Kiosk</h4>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider block">
                Tiêu đề chính Banner
              </label>
              <input
                type="text"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                placeholder="BẢNG NIÊM YẾT THỦ TỤC HÀNH CHÍNH"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="space-y-2.5 bg-red-50/40 p-3.5 rounded-xl border border-red-200/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-700" />
                  <span>Tên Cơ quan / Đơn vị niêm yết (Tiêu đề phụ Banner)</span>
                </label>
                <span className="text-[10.5px] font-bold text-red-700 bg-red-100/70 px-2 py-0.5 rounded-full border border-red-200 self-start sm:self-auto">
                  54 Xã, Phường & Đặc khu Quảng Ninh
                </span>
              </div>

              {/* Quang Ninh 54 Units Fast Selection Dropdown */}
              <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-600">
                    Chọn nhanh từ 54 đơn vị hành chính Quảng Ninh:
                  </span>
                  {/* Quick filter tabs */}
                  <div className="flex items-center gap-1 text-[10px]">
                    {[
                      { id: 'all', label: 'Tất cả (54)' },
                      { id: 'phuong', label: '30 Phường' },
                      { id: 'xa', label: '22 Xã' },
                      { id: 'dackhu', label: '2 Đặc khu' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFilterUnitType(tab.id as any)}
                        className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                          filterUnitType === tab.id
                            ? 'bg-red-700 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <select
                      value={selectedQnUnitId}
                      onChange={(e) => {
                        const unitId = e.target.value;
                        setSelectedQnUnitId(unitId);
                        const found = QUANG_NINH_54_UNITS.find(u => u.id === unitId);
                        if (found) {
                          setBannerSubtitle(found.agencyName);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-red-600 cursor-pointer"
                    >
                      {QUANG_NINH_54_UNITS
                        .filter(u => filterUnitType === 'all' || u.type === filterUnitType)
                        .map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.type === 'phuong' ? 'Phường' : unit.type === 'xa' ? 'Xã' : 'Đặc khu'})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Preset formatting options for currently selected unit */}
                  {(() => {
                    const currentUnit = QUANG_NINH_54_UNITS.find(u => u.id === selectedQnUnitId);
                    if (!currentUnit) return null;
                    const presets = getAgencyPresetOptions(currentUnit);
                    return (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setBannerSubtitle(e.target.value);
                          }
                        }}
                        defaultValue=""
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-red-600 cursor-pointer"
                      >
                        <option value="" disabled>-- Mẫu định dạng tên cơ quan --</option>
                        {presets.map((preset, idx) => (
                          <option key={idx} value={preset}>
                            {preset}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              </div>

              {/* Direct text input for full customizability */}
              <div>
                <span className="text-[11px] text-slate-500 font-medium block mb-1">
                  Giá trị áp dụng thực tế trên Banner (người dùng có thể sửa đổi tùy ý):
                </span>
                <input
                  type="text"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG XÃ BA CHẼ"
                  className="w-full px-3 py-2 bg-white border border-red-300 focus:border-red-600 rounded-lg font-bold text-slate-900 focus:outline-none shadow-2xs text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider block">
                Khẩu hiệu / Slogan thông điệp
              </label>
              <input
                type="text"
                value={bannerSlogan}
                onChange={(e) => setBannerSlogan(e.target.value)}
                placeholder="Chuyên nghiệp - Minh bạch - Kịp thời - Hiệu quả"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-red-600"
              />
            </div>

            {/* Banner Background Color Choice */}
            <div className="space-y-1.5 pt-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider block">
                Màu nền Banner
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setBannerBgColor('white')}
                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                    bannerBgColor === 'white'
                      ? 'bg-red-50 border-red-500 ring-2 ring-red-200 text-red-900 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <div className="w-5 h-5 mx-auto rounded-full bg-white border border-slate-300 shadow-xs mb-1"></div>
                  <span>Trắng tinh tế</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBannerBgColor('red')}
                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                    bannerBgColor === 'red'
                      ? 'bg-red-50 border-red-500 ring-2 ring-red-200 text-red-900 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <div className="w-5 h-5 mx-auto rounded-full bg-red-700 shadow-xs mb-1"></div>
                  <span>Đỏ cờ truyền thống</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBannerBgColor('blue')}
                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                    bannerBgColor === 'blue'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200 text-blue-900 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <div className="w-5 h-5 mx-auto rounded-full bg-blue-900 shadow-xs mb-1"></div>
                  <span>Xanh dương hiện đại</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBannerBgColor('slate')}
                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                    bannerBgColor === 'slate'
                      ? 'bg-slate-100 border-slate-600 ring-2 ring-slate-300 text-slate-950 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <div className="w-5 h-5 mx-auto rounded-full bg-slate-900 shadow-xs mb-1"></div>
                  <span>Xám than tối giản</span>
                </button>
              </div>
            </div>

            {/* Toggle stats above clock */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStatsOnClock}
                  onChange={(e) => setShowStatsOnClock(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900 text-xs block">
                    Hiện số thủ tục cấp tỉnh, xã, liên thông, toàn trình/một phần cạnh trên đồng hồ
                  </span>
                  <span className="text-[11px] text-slate-500 leading-normal block mt-0.5">
                    Tự động thống kê số liệu động từ cơ sở dữ liệu TTHC đang có trên hệ thống để người dân nắm rõ quy mô niêm yết.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Card 2: Footer Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h4 className="font-bold text-slate-900 text-sm uppercase">2. Cấu hình Footer Kiosk</h4>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider block">
                Dòng hướng dẫn tra cứu tại chân màn hình
              </label>
              <textarea
                rows={3}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Dùng Camera điện thoại hoặc Zalo quét mã QR trên từng thẻ để tra cứu toàn văn và nộp hồ sơ trực tuyến."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-red-600 leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Dòng chữ chạy thông báo (Marquee)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={footerShowMarquee}
                    onChange={(e) => setFooterShowMarquee(e.target.checked)}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-slate-600">Bật chạy chữ</span>
                </label>
              </div>
              <input
                type="text"
                disabled={!footerShowMarquee}
                value={footerMarquee}
                onChange={(e) => setFooterMarquee(e.target.value)}
                placeholder="Chào mừng Quý công dân và Doanh nghiệp đến giao dịch tại Bộ phận Tiếp nhận và Trả kết quả!"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-red-600 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider block">
                Số Hotline đường dây nóng hỗ trợ Kiosk
              </label>
              <input
                type="text"
                value={footerHotline}
                onChange={(e) => setFooterHotline(e.target.value)}
                placeholder="0203.3888.222 / 1900.9095"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-red-600"
              />
              <span className="text-[10.5px] text-slate-400">
                Hiển thị số điện thoại công khai để người dân gọi ngay khi gặp khó khăn khi thao tác tại Kiosk.
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Lưu cấu hình chân trang Kiosk</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
