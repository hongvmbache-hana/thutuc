import React, { useState } from 'react';
import { SearchFilters } from '../types';
import { Search, RotateCcw, Filter, ChevronDown, ChevronUp, Check, Info } from 'lucide-react';

interface AdvancedSearchProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  linhVucPresets: string[];
  soNganhPresets: string[];
  capThucHienPresets: string[];
}

export default function AdvancedSearch({
  filters,
  onFilterChange,
  linhVucPresets,
  soNganhPresets,
  capThucHienPresets
}: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, keyword: e.target.value });
  };

  const handleSelectChange = (key: keyof SearchFilters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onFilterChange({
      keyword: '',
      linhVuc: '',
      soNganh: '',
      capThucHien: '',
      bcciTiepNhan: 'all',
      bcciTraKetQua: 'all',
      dvcttLoai: 'all',
      motCua: 'all',
      dungChung: 'all',
      trangThai: 'all'
    });
  };

  const activeFiltersCount = Object.entries(filters).reduce((acc, [key, val]) => {
    if (key === 'keyword' && val !== '') return acc + 1;
    if (['linhVuc', 'soNganh', 'capThucHien'].includes(key) && val !== '') return acc + 1;
    if (['bcciTiepNhan', 'bcciTraKetQua', 'dvcttLoai', 'motCua', 'dungChung', 'trangThai'].includes(key) && val !== 'all') return acc + 1;
    return acc;
  }, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-3 items-center">
        
        {/* Core Name & Code Search input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
            placeholder="Tìm theo Mã TTHC, Tên thủ tục, Căn cứ pháp lý..."
            value={filters.keyword}
            onChange={handleTextChange}
            id="procedure-search-input"
          />
        </div>

        {/* Action Controls */}
        <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
              isOpen || activeFiltersCount > 0
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            id="toggle-advanced-filter"
          >
            <Filter className="w-4 h-4" />
            <span>Bộ lọc nâng cao</span>
            {activeFiltersCount > 0 && (
              <span className="bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full text-[10px] ml-0.5">
                {activeFiltersCount}
              </span>
            )}
            {isOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            id="reset-filter"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* Advanced Drawer Panel */}
      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-100 animate-slideDown">
          
          {/* Lĩnh vực Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Lĩnh vực</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
              value={filters.linhVuc}
              onChange={(e) => handleSelectChange('linhVuc', e.target.value)}
              id="filter-linh-vuc"
            >
              <option value="">-- Tất cả Lĩnh vực --</option>
              {linhVucPresets.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Sở, ngành quản lý Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Bộ, ngành quản lý</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
              value={filters.soNganh}
              onChange={(e) => handleSelectChange('soNganh', e.target.value)}
              id="filter-so-nganh"
            >
              <option value="">-- Tất cả Bộ, ngành --</option>
              {soNganhPresets.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Cấp thực hiện Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Cấp thực hiện</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
              value={filters.capThucHien}
              onChange={(e) => handleSelectChange('capThucHien', e.target.value)}
              id="filter-cap-thuc-hien"
            >
              <option value="">-- Tất cả Cấp thực hiện --</option>
              {capThucHienPresets.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Trạng thái biến động TTHC Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Trạng thái biến động TTHC</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
              value={filters.trangThai || 'all'}
              onChange={(e) => handleSelectChange('trangThai', e.target.value)}
              id="filter-trang-thai"
            >
              <option value="all">-- Tất cả trạng thái --</option>
              <option value="Sửa đổi, bổ sung">Sửa đổi, bổ sung</option>
              <option value="Bãi bỏ">Bãi bỏ / Hủy bỏ</option>
              <option value="Ban hành mới">Ban hành mới</option>
              <option value="Hiện hành">Đang hiện hành</option>
            </select>
          </div>

          {/* Dịch vụ công trực tuyến */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Dịch vụ trực tuyến (DVCTT)</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
              value={filters.dvcttLoai}
              onChange={(e) => handleSelectChange('dvcttLoai', e.target.value)}
              id="filter-dvctt"
            >
              <option value="all">Tất cả loại hình</option>
              <option value="Toàn trình">DVCTT Toàn trình</option>
              <option value="Một phần">DVCTT Một phần</option>
              <option value="Không">Không số hóa trực tuyến</option>
            </select>
          </div>

          {/* Một cửa */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Tiếp nhận Tại bộ phận một cửa</label>
            <div className="flex gap-2">
              {['all', 'yes', 'no'].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => handleSelectChange('motCua', val)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    filters.motCua === val
                      ? 'bg-red-600 border-red-600 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                  id={`filter-mot-cua-${val}`}
                >
                  {val === 'all' ? 'Tất cả' : val === 'yes' ? 'Thực hiện' : 'Không'}
                </button>
              ))}
            </div>
          </div>

          {/* Thẩm quyền dùng chung */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Thẩm quyền Dùng chung</label>
            <div className="flex gap-2">
              {['all', 'yes', 'no'].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => handleSelectChange('dungChung', val)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    filters.dungChung === val
                      ? 'bg-red-600 border-red-600 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                  id={`filter-dung-chung-${val}`}
                >
                  {val === 'all' ? 'Tất cả' : val === 'yes' ? 'Dùng chung' : 'Bản quyền riêng'}
                </button>
              ))}
            </div>
          </div>

          {/* BCCI Tiếp nhận & Trả kết quả */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3 bg-red-50/50 p-2.5 rounded-lg border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 text-xs mt-1">
            <div className="flex items-center gap-1.5 font-medium">
              <Info className="w-4 h-4 text-red-700 shrink-0" />
              <span>Lọc nhanh theo dịch vụ Bưu chính công ích (BCCI):</span>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 accent-red-700"
                  checked={filters.bcciTiepNhan === 'yes'}
                  onChange={(e) => handleSelectChange('bcciTiepNhan', e.target.checked ? 'yes' : 'all')}
                  id="filter-bcci-tiep-nhan"
                />
                Có BCCI Tiếp nhận
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 accent-red-700"
                  checked={filters.bcciTraKetQua === 'yes'}
                  onChange={(e) => handleSelectChange('bcciTraKetQua', e.target.checked ? 'yes' : 'all')}
                  id="filter-bcci-tra-ket-qua"
                />
                Có BCCI Trả kết quả
              </label>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
