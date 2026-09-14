import React from 'react';
import { Procedure } from '../types';
import { ClipboardList, Globe, Layers, FileBarChart2 } from 'lucide-react';
import { getProcedureTrangThai } from '../utils/bienDongHelper';

interface StatsDashboardProps {
  procedures: Procedure[];
  onOpenReportModal?: () => void;
}

export default function StatsDashboard({ procedures, onOpenReportModal }: StatsDashboardProps) {
  const total = procedures.length;
  
  const fullOnline = procedures.filter(p => p.dvcttLoai === 'Toàn trình').length;
  const partialOnline = procedures.filter(p => p.dvcttLoai === 'Một phần').length;
  
  const isCommune = (p: Procedure) => 
    p.capThucHien === 'Cấp xã' || 
    p.capThucHien === 'Cấp xã, Thành phố' || 
    p.capThucHien === 'Cấp xã, cấp tỉnh' || 
    p.capThucHien === 'Cấp xã, Cấp tỉnh' || 
    p.capThucHien.toLowerCase().includes('xã');

  const isCity = (p: Procedure) => 
    p.capThucHien === 'Thành phố' || 
    p.capThucHien === 'Cấp tỉnh' || 
    p.capThucHien === 'Cấp xã, Thành phố' || 
    p.capThucHien === 'Cấp xã, cấp tỉnh' || 
    p.capThucHien === 'Cấp xã, Cấp tỉnh' || 
    p.capThucHien.toLowerCase().includes('thành phố') || 
    p.capThucHien.toLowerCase().includes('tỉnh');

  const isDualLevel = (p: Procedure) => 
    p.capThucHien === 'Cấp xã, Thành phố' || 
    p.capThucHien === 'Cấp xã, cấp tỉnh' || 
    p.capThucHien === 'Cấp xã, Cấp tỉnh' || 
    (p.capThucHien.toLowerCase().includes('xã') && (p.capThucHien.toLowerCase().includes('thành phố') || p.capThucHien.toLowerCase().includes('tỉnh')));

  const capXa = procedures.filter(isCommune).length;
  const capThanhPho = procedures.filter(isCity).length;
  const capXaThanhPho = procedures.filter(isDualLevel).length;
  const capLienThong = procedures.filter(p => p.capThucHien === 'TTHC liên thông').length;
  
  // Thống kê sửa đổi bổ sung, bãi bỏ, ban hành mới
  const suaDoiCount = procedures.filter(p => getProcedureTrangThai(p) === 'Sửa đổi, bổ sung').length;
  const baiBoCount = procedures.filter(p => getProcedureTrangThai(p) === 'Bãi bỏ').length;
  const banHanhMoiCount = procedures.filter(p => getProcedureTrangThai(p) === 'Ban hành mới').length;
  const tongBienDong = suaDoiCount + baiBoCount;

  const onlineRatio = total > 0 ? Math.round(((fullOnline + partialOnline) / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* CARD 1: Tổng quan số lượng */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Tổng số thủ tục</p>
          <p className="text-3xl font-extrabold text-slate-800 font-mono">{total}</p>
          <div className="text-xs text-slate-500 font-medium">
            Phân bổ: <span className="font-semibold text-emerald-700">{capXa} Cấp xã</span> và <span className="font-semibold text-blue-700">{capThanhPho} Thành phố</span>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-600 p-2.5 rounded-lg">
          <ClipboardList className="w-5.5 h-5.5" />
        </div>
      </div>

      {/* CARD 2: Dịch vụ công trực tuyến */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Dịch vụ công trực tuyến</p>
          <p className="text-3xl font-extrabold text-teal-600 font-mono">{fullOnline + partialOnline}</p>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <span className="font-semibold text-teal-600">{onlineRatio}%</span> tỷ lệ số hóa ({fullOnline} Toàn trình)
          </div>
        </div>
        <div className="bg-teal-50 text-teal-600 p-2.5 rounded-lg">
          <Globe className="w-5.5 h-5.5" />
        </div>
      </div>

      {/* CARD 3: Cấp thực hiện */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Phân cấp thực hiện</p>
          <div className="flex gap-3 items-baseline mt-1 flex-wrap">
            <span className="text-lg font-bold text-emerald-700 font-mono" title="Số thủ tục có thẩm quyền Cấp xã">{capXa}<span className="text-xs font-normal text-slate-500 ml-0.5">Xã</span></span>
            <span className="text-lg font-bold text-blue-700 font-mono" title="Số thủ tục có thẩm quyền Thành phố">{capThanhPho}<span className="text-xs font-normal text-slate-500 ml-0.5">TP</span></span>
            {capXaThanhPho > 0 && (
              <span className="text-lg font-bold text-teal-700 font-mono" title="Thủ tục áp dụng đồng thời cho Cả Xã và Thành phố">{capXaThanhPho}<span className="text-xs font-normal text-slate-500 ml-0.5">Xã+TP</span></span>
            )}
            <span className="text-lg font-bold text-purple-700 font-mono" title="TTHC liên thông">{capLienThong}<span className="text-xs font-normal text-slate-500 ml-0.5">LT</span></span>
          </div>
          <div className="text-xs text-slate-500 font-medium pt-1">
            {capXaThanhPho > 0 ? (
              <span><strong className="text-teal-700">{capXaThanhPho}</strong> thủ tục dùng chung Xã & Thành phố</span>
            ) : (
              <span><strong className="text-purple-700">{capLienThong}</strong> quy trình liên thông</span>
            )}
          </div>
        </div>
        <div className="bg-amber-50 text-amber-600 p-2.5 rounded-lg">
          <Layers className="w-5.5 h-5.5" />
        </div>
      </div>

      {/* CARD 4: Tổng hợp Sửa đổi, Bổ sung & Bãi bỏ (Thay thế mục Tiện ích hỗ trợ BCCI/Dùng chung) */}
      <div 
        onClick={onOpenReportModal}
        className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between group"
        id="bien-dong-stats-card"
        title="Nhấn để xem Báo cáo tổng hợp Sửa đổi, Bổ sung, Bãi bỏ theo Tháng, Quý"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Tổng hợp Sửa đổi, Bãi bỏ</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-amber-700 font-mono">{tongBienDong}</p>
              <span className="text-xs font-semibold text-slate-400 font-mono">
                {banHanhMoiCount > 0 ? `(+${banHanhMoiCount} mới)` : ''}
              </span>
            </div>
          </div>
          <div className="bg-amber-50 text-amber-700 p-2.5 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <FileBarChart2 className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-xs">
          <div className="text-slate-600 font-medium">
            <span className="font-bold text-amber-700">{suaDoiCount}</span> sửa đổi, bổ sung | <span className="font-bold text-rose-700">{baiBoCount}</span> bãi bỏ
          </div>
          <button 
            type="button"
            className="text-[11px] font-bold text-amber-700 group-hover:text-amber-900 group-hover:underline flex items-center gap-0.5 cursor-pointer ml-1 whitespace-nowrap"
          >
            Báo cáo Tháng/Quý →
          </button>
        </div>
      </div>

    </div>
  );
}
