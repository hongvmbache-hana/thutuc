import React, { useState, useEffect } from 'react';
import { Procedure, SearchFilters } from '../types';
import { X, Save, HelpCircle, RefreshCw, Layers, QrCode } from 'lucide-react';

interface ProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (procedure: Procedure) => void;
  procedureToEdit: Procedure | null;
  linhVucPresets: string[];
  soNganhPresets: string[];
  capThucHienPresets: string[];
}

export default function ProcedureModal({
  isOpen,
  onClose,
  onSave,
  procedureToEdit,
  linhVucPresets,
  soNganhPresets,
  capThucHienPresets
}: ProcedureModalProps) {
  
  const [formData, setFormData] = useState<Partial<Procedure>>({
    maTthc: '',
    tenTthc: '',
    linhVuc: '',
    soNganh: '',
    capThucHien: 'Cấp xã',
    bcciTiepNhan: false,
    bcciTraKetQua: false,
    dvcttLoai: 'Toàn trình',
    motCua: true,
    canCuPhapLy: '',
    dungChung: true,
    ghiChu: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Custom input toggles
  const [customLinhVuc, setCustomLinhVuc] = useState(false);
  const [customSoNganh, setCustomSoNganh] = useState(false);
  const [customLinhVucVal, setCustomLinhVucVal] = useState('');
  const [customSoNganhVal, setCustomSoNganhVal] = useState('');

  useEffect(() => {
    if (procedureToEdit) {
      setFormData({ ...procedureToEdit });
      
      // If the field is not in presets, toggle custom input
      if (procedureToEdit.linhVuc && !linhVucPresets.includes(procedureToEdit.linhVuc)) {
        setCustomLinhVuc(true);
        setCustomLinhVucVal(procedureToEdit.linhVuc);
      } else {
        setCustomLinhVuc(false);
        setCustomLinhVucVal('');
      }

      if (procedureToEdit.soNganh && !soNganhPresets.includes(procedureToEdit.soNganh)) {
        setCustomSoNganh(true);
        setCustomSoNganhVal(procedureToEdit.soNganh);
      } else {
        setCustomSoNganh(false);
        setCustomSoNganhVal('');
      }
    } else {
      // Reset values for new form
      setFormData({
        maTthc: '',
        tenTthc: '',
        linhVuc: linhVucPresets[0] || '',
        soNganh: soNganhPresets[0] || '',
        capThucHien: 'Cấp xã',
        bcciTiepNhan: false,
        bcciTraKetQua: false,
        dvcttLoai: 'Toàn trình',
        motCua: true,
        canCuPhapLy: '',
        dungChung: true,
        ghiChu: '',
        trangThai: 'Hiện hành',
        ngayBanHanh: '',
        soQuyetDinh: ''
      });
      setCustomLinhVuc(false);
      setCustomSoNganh(false);
      setCustomLinhVucVal('');
      setCustomSoNganhVal('');
    }
    setErrors({});
  }, [procedureToEdit, isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const tempErrors: Record<string, string> = {};
    if (!formData.maTthc?.trim()) {
      tempErrors.maTthc = 'Mã thủ tục hành chính không được để trống';
    } else if (!/^[0-9A-Za-z\._-]+$/.test(formData.maTthc)) {
      tempErrors.maTthc = 'Mã thủ tục không hợp lệ (chỉ chứa số, chữ, dấu chấm, dấu gạch)';
    }

    if (!formData.tenTthc?.trim()) {
      tempErrors.tenTthc = 'Tên thủ tục hành chính không được để trống';
    } else if (formData.tenTthc.length < 10) {
      tempErrors.tenTthc = 'Tên thủ tục quá ngắn (tối thiểu 10 ký tự)';
    }

    const finalLinhVuc = customLinhVuc ? customLinhVucVal.trim() : formData.linhVuc;
    if (!finalLinhVuc) {
      tempErrors.linhVuc = 'Vui lòng chọn hoặc nhập lĩnh vực thủ tục';
    }

    const finalSoNganh = customSoNganh ? customSoNganhVal.trim() : formData.soNganh;
    if (!finalSoNganh) {
      tempErrors.soNganh = 'Vui lòng chọn hoặc nhập bộ, ngành chịu trách nhiệm';
    }

    if (!formData.canCuPhapLy?.trim()) {
      tempErrors.canCuPhapLy = 'Vui lòng nhập căn cứ pháp lý cốt lõi';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const finalLinhVuc = customLinhVuc ? customLinhVucVal.trim() : formData.linhVuc;
    const finalSoNganh = customSoNganh ? customSoNganhVal.trim() : formData.soNganh;

    const finalData: Procedure = {
      id: procedureToEdit?.id || `tthc-${Date.now()}`,
      maTthc: formData.maTthc!.trim(),
      tenTthc: formData.tenTthc!.trim(),
      linhVuc: finalLinhVuc!,
      soNganh: finalSoNganh!,
      capThucHien: formData.capThucHien!,
      bcciTiepNhan: !!formData.bcciTiepNhan,
      bcciTraKetQua: !!formData.bcciTraKetQua,
      dvcttLoai: formData.dvcttLoai!,
      motCua: !!formData.motCua,
      canCuPhapLy: formData.canCuPhapLy!.trim(),
      dungChung: !!formData.dungChung,
      ghiChu: formData.ghiChu?.trim() || '',
      ngayTao: procedureToEdit?.ngayTao || new Date().toISOString(),
      ngayCapNhat: new Date().toISOString()
    };

    onSave(finalData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn"
        id="procedure-modal-container"
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-red-100 text-red-800 rounded-lg">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-800" id="modal-title">
              {procedureToEdit ? 'CẬP NHẬT THỦ TỤC HÀNH CHÍNH' : 'THÊM THỦ TỤC HÀNH CHÍNH MỚI'}
            </h2>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 rounded-full p-1 bg-white hover:bg-slate-100 transition-all border border-slate-200"
            onClick={onClose}
            id="close-modal-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4" id="procedure-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Mã TTHC */}
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Mã TTHC <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 1.014312"
                className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:bg-white text-slate-800 tracking-wider font-mono ${
                  errors.maTthc ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-red-600'
                }`}
                value={formData.maTthc}
                onChange={(e) => setFormData({ ...formData, maTthc: e.target.value })}
                id="form-maTthc"
              />
              {errors.maTthc && <p className="text-red-600 text-[10px] font-semibold">{errors.maTthc}</p>}
            </div>

            {/* Cấp thực hiện */}
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Cấp thực hiện <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:bg-white"
                value={formData.capThucHien}
                onChange={(e) => setFormData({ ...formData, capThucHien: e.target.value })}
                id="form-capThucHien"
              >
                {capThucHienPresets.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {(formData.capThucHien === 'Cấp xã, Thành phố' || formData.capThucHien === 'Cấp xã, cấp tỉnh' || formData.capThucHien === 'Cấp xã, Cấp tỉnh') && (
                <p className="text-[11px] text-teal-700 font-semibold bg-teal-50 border border-teal-200/80 px-2 py-1 rounded">
                  ⚡ Thủ tục này sẽ tự động áp dụng và hiển thị cho cả <strong>Cấp xã</strong> và <strong>Thành phố</strong> khi tra cứu, lọc hoặc thống kê.
                </p>
              )}
            </div>

            {/* Tên TTHC */}
            <div className="col-span-1 sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Tên thủ tục hành chính <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Nhập tên thủ tục hành chính chi tiết..."
                className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:bg-white text-slate-800 leading-relaxed ${
                  errors.tenTthc ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-red-600'
                }`}
                value={formData.tenTthc}
                onChange={(e) => setFormData({ ...formData, tenTthc: e.target.value })}
                id="form-tenTthc"
              />
              {errors.tenTthc && <p className="text-red-600 text-[10px] font-semibold">{errors.tenTthc}</p>}
            </div>

            {/* Lĩnh vực */}
            <div className="col-span-1 space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Lĩnh vực <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setCustomLinhVuc(!customLinhVuc)}
                  className="text-[10px] text-red-700 font-bold hover:underline"
                >
                  {customLinhVuc ? 'Chọn từ danh sách' : 'Tùy chỉnh nhập'}
                </button>
              </div>
              
              {customLinhVuc ? (
                <input
                  type="text"
                  placeholder="Nhập lĩnh vực thủ tục..."
                  className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:bg-white text-slate-800 ${
                    errors.linhVuc ? 'border-red-500' : 'border-slate-200 focus:border-red-600'
                  }`}
                  value={customLinhVucVal}
                  onChange={(e) => setCustomLinhVucVal(e.target.value)}
                  id="form-linhVuc-custom"
                />
              ) : (
                <select
                  className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:bg-white text-slate-800 ${
                    errors.linhVuc ? 'border-red-500' : 'border-slate-200'
                  }`}
                  value={formData.linhVuc}
                  onChange={(e) => setFormData({ ...formData, linhVuc: e.target.value })}
                  id="form-linhVuc-select"
                >
                  {linhVucPresets.map((preset) => (
                    <option key={preset} value={preset}>{preset}</option>
                  ))}
                </select>
              )}
              {errors.linhVuc && <p className="text-red-600 text-[10px] font-semibold">{errors.linhVuc}</p>}
            </div>

            {/* Sở, ngành */}
            <div className="col-span-1 space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Bộ, ngành quản lý <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setCustomSoNganh(!customSoNganh)}
                  className="text-[10px] text-red-700 font-bold hover:underline"
                >
                  {customSoNganh ? 'Chọn từ danh sách' : 'Tùy chỉnh nhập'}
                </button>
              </div>

              {customSoNganh ? (
                <input
                  type="text"
                  placeholder="Nhập tên Bộ hoặc ngành..."
                  className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:bg-white text-slate-800 ${
                    errors.soNganh ? 'border-red-500' : 'border-slate-200 focus:border-red-600'
                  }`}
                  value={customSoNganhVal}
                  onChange={(e) => setCustomSoNganhVal(e.target.value)}
                  id="form-soNganh-custom"
                />
              ) : (
                <select
                  className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:bg-white text-slate-800 ${
                    errors.soNganh ? 'border-red-500' : 'border-slate-200'
                  }`}
                  value={formData.soNganh}
                  onChange={(e) => setFormData({ ...formData, soNganh: e.target.value })}
                  id="form-soNganh-select"
                >
                  {soNganhPresets.map((preset) => (
                    <option key={preset} value={preset}>{preset}</option>
                  ))}
                </select>
              )}
              {errors.soNganh && <p className="text-red-600 text-[10px] font-semibold">{errors.soNganh}</p>}
            </div>

            {/* Dịch vụ công trực tuyến (DVCTT) */}
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Loại hình dịch vụ trực tuyến
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:bg-white"
                value={formData.dvcttLoai}
                onChange={(e) => setFormData({ ...formData, dvcttLoai: e.target.value as any })}
                id="form-dvcttLoai"
              >
                <option value="Toàn trình">Toàn trình (Có trực tuyến 100%)</option>
                <option value="Một phần">Một phần (Nộp hồ sơ trực tuyến)</option>
                <option value="Không">Không hỗ trợ (Giao dịch trực tiếp)</option>
              </select>
            </div>

            {/* Thực hiện tại một cửa & dùng chung */}
            <div className="grid grid-cols-2 gap-2 col-span-1 items-end py-1">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg border border-slate-200 transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4.5 h-4.5 accent-red-700"
                  checked={formData.motCua}
                  onChange={(e) => setFormData({ ...formData, motCua: e.target.checked })}
                  id="form-motCua"
                />
                <span className="text-xs font-bold text-slate-700">Bộ phận một cửa</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg border border-slate-200 transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4.5 h-4.5 accent-red-700"
                  checked={formData.dungChung}
                  onChange={(e) => setFormData({ ...formData, dungChung: e.target.checked })}
                  id="form-dungChung"
                />
                <span className="text-xs font-bold text-slate-700">Thẩm quyền dùng chung</span>
              </label>
            </div>

            {/* BCCI Tiếp nhận & Trả kết quả */}
            <div className="col-span-1 sm:col-span-2 space-y-1.5 bg-slate-50/50 p-3 rounded-lg border border-slate-200">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Hỗ trợ Bưu chính công ích (BCCI)
              </label>
              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4.5 h-4.5 accent-red-700"
                    checked={formData.bcciTiepNhan}
                    onChange={(e) => setFormData({ ...formData, bcciTiepNhan: e.target.checked })}
                    id="form-bcciTiepNhan"
                  />
                  <span className="text-xs font-semibold text-slate-700">Có Tiếp nhận hồ sơ qua bưu chính</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4.5 h-4.5 accent-red-700"
                    checked={formData.bcciTraKetQua}
                    onChange={(e) => setFormData({ ...formData, bcciTraKetQua: e.target.checked })}
                    id="form-bcciTraKetQua"
                  />
                  <span className="text-xs font-semibold text-slate-700">Có Trả kết quả qua bưu chính</span>
                </label>
              </div>
            </div>

            {/* Trạng thái biến động & Quyết định/Ngày áp dụng */}
            <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/50 p-3 rounded-lg border border-amber-200">
              <div className="space-y-1">
                <label className="text-xs font-bold text-amber-900 uppercase tracking-wide block">
                  Trạng thái TTHC
                </label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-600"
                  value={formData.trangThai || 'Hiện hành'}
                  onChange={(e) => setFormData({ ...formData, trangThai: e.target.value as any })}
                  id="form-trangThai"
                >
                  <option value="Hiện hành">Đang hiện hành</option>
                  <option value="Sửa đổi, bổ sung">Sửa đổi, bổ sung</option>
                  <option value="Bãi bỏ">Bãi bỏ / Hủy bỏ</option>
                  <option value="Ban hành mới">Ban hành mới</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Số Quyết định
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 752/QĐ-UBND"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-amber-600 text-slate-800 font-mono"
                  value={formData.soQuyetDinh || ''}
                  onChange={(e) => setFormData({ ...formData, soQuyetDinh: e.target.value })}
                  id="form-soQuyetDinh"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Ngày quyết định / áp dụng
                </label>
                <input
                  type="date"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-amber-600 text-slate-800 font-mono"
                  value={formData.ngayBanHanh || ''}
                  onChange={(e) => setFormData({ ...formData, ngayBanHanh: e.target.value })}
                  id="form-ngayBanHanh"
                />
              </div>
            </div>

            {/* Căn cứ pháp lý */}
            <div className="col-span-1 sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Căn cứ pháp lý <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Quyết định số 752/QĐ-TTPVHCC ngày... hoặc Nghị định số 01/2021/NĐ-CP"
                className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:bg-white text-slate-800 ${
                  errors.canCuPhapLy ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-red-600'
                }`}
                value={formData.canCuPhapLy}
                onChange={(e) => setFormData({ ...formData, canCuPhapLy: e.target.value })}
                id="form-canCuPhapLy"
              />
              {errors.canCuPhapLy && <p className="text-red-600 text-[10px] font-semibold">{errors.canCuPhapLy}</p>}
            </div>

            {/* Nội dung văn bản cho mã QR Code */}
            <div className="col-span-1 sm:col-span-2 space-y-1.5 bg-red-50/40 p-3 rounded-lg border border-red-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-red-900 uppercase tracking-wide flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-red-600" />
                  Nội dung văn bản cho mã QR Code
                </label>
                <span className="text-[11px] text-slate-500 font-normal italic">
                  (Dùng để tạo mã QR Code khi xuất file Excel & PDF)
                </span>
              </div>
              <textarea
                rows={2}
                placeholder="Nhập đường link trực tiếp (URL) hoặc nội dung văn bản để mã hóa vào mã QR Code (nếu để trống sẽ tự động lấy link tra cứu theo mã TTHC trên Cổng DVCQG)..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-red-600 focus:bg-white text-slate-800 resize-y placeholder:text-slate-400"
                value={formData.ghiChu || ''}
                onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                id="form-ghiChu"
              />
              <p className="text-[11px] text-slate-600">
                Khi xuất ra Excel hoặc PDF, mã QR code sẽ chứa chính xác nội dung/đường link này để người dân quét và đọc được ngay.
              </p>
            </div>

          </div>
        </form>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-500 bg-white hover:bg-slate-50 transition-colors"
            onClick={onClose}
            id="cancel-modal"
          >
            Hủy bỏ
          </button>
          
          <button
            type="submit"
            form="procedure-form"
            className="flex items-center gap-1.5 px-4.5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg shadow-md transition-colors"
            id="save-procedure-button"
          >
            <Save className="w-4 h-4" />
            <span>Lưu thông tin</span>
          </button>
        </div>

      </div>
    </div>
  );
}
