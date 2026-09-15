import React, { useState } from 'react';
import { Lock, Shield, KeyRound, User, X, Check, AlertCircle, Sparkles, LogIn, Eye, EyeOff } from 'lucide-react';
import { authenticateUser } from '../utils/userManagement';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (displayName: string) => void;
  actionTitle?: string;
  onShowToast: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function AdminLoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  actionTitle,
  onShowToast
}: AdminLoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    // Check with centralized user authentication
    const authResult = authenticateUser(cleanUser, cleanPass);

    if (authResult.success && authResult.user) {
      const user = authResult.user;
      const roleLabel = user.role === 'admin' ? 'Quản trị viên' : (user.role === 'editor' ? 'Cán bộ Một cửa' : 'Người xem');
      const displayName = `${user.fullName} (${roleLabel})`;
      localStorage.setItem('tthc_is_admin_logged_in', 'true');
      localStorage.setItem('tthc_admin_username', user.username);
      localStorage.setItem('tthc_admin_fullname', user.fullName);
      localStorage.setItem('tthc_admin_role', user.role);
      setError(null);
      onLoginSuccess(displayName);
      onShowToast(`Đăng nhập thành công! Quyền ${roleLabel} đã được kích hoạt (${user.fullName}).`, 'success');
      onClose();
      return;
    }

    // Fallback legacy test credentials
    const isHongvm = (cleanUser.toLowerCase() === 'hongvm' || cleanUser.toLowerCase() === 'hongvm.bache@gmail.com') && 
                     (cleanPass === 'Vungochan@2015' || cleanPass === 'vungochan@2015');
    const isAdmin = cleanUser.toLowerCase() === 'admin' && 
                    (cleanPass === 'Vungochan@2015' || cleanPass === 'vungochan@2015' || cleanPass === 'admin@2026' || cleanPass === '123456');

    if (isHongvm || isAdmin) {
      const displayName = isHongvm ? 'Hongvm (Quản trị viên)' : 'Admin Quản trị';
      localStorage.setItem('tthc_is_admin_logged_in', 'true');
      localStorage.setItem('tthc_admin_username', isHongvm ? 'hongvm' : 'admin');
      localStorage.setItem('tthc_admin_fullname', displayName);
      localStorage.setItem('tthc_admin_role', 'admin');
      setError(null);
      onLoginSuccess(displayName);
      onShowToast(`Đăng nhập thành công! Quyền quản trị viên đã kích hoạt (${displayName}).`, 'success');
      onClose();
    } else {
      setError(authResult.error || 'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!');
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  const handleInstantLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
    const authResult = authenticateUser(user, pass);
    const displayName = (authResult.user && `${authResult.user.fullName} (${authResult.user.role === 'admin' ? 'Quản trị viên' : 'Cán bộ'})`) || 
      (user.toLowerCase() === 'hongvm' ? 'Hongvm (Quản trị viên)' : 'Admin Quản trị');
    localStorage.setItem('tthc_is_admin_logged_in', 'true');
    localStorage.setItem('tthc_admin_username', user);
    localStorage.setItem('tthc_admin_fullname', displayName);
    localStorage.setItem('tthc_admin_role', authResult.user?.role || 'admin');
    onLoginSuccess(displayName);
    onShowToast(`Đăng nhập thành công với tài khoản ${displayName}!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn"
        id="admin-login-modal"
      >
        {/* Header with Administrative Gradient */}
        <div className="bg-gradient-to-r from-red-800 via-red-700 to-[#b81d22] text-white px-6 py-5 relative select-none">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white rounded-full p-1 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl border border-white/20 shadow-inner">
              <Shield className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide uppercase text-white">
                Xác thực quyền Quản trị viên
              </h2>
              <p className="text-xs text-red-100 font-medium mt-0.5">
                Đăng nhập để có quyền Thêm mới, Sửa đổi, Xóa dữ liệu
              </p>
            </div>
          </div>
        </div>

        {/* Action context badge if triggered by an action */}
        {actionTitle && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-amber-900">
            <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Thao tác yêu cầu quyền Quản trị: <span className="text-red-700 font-bold underline">{actionTitle}</span></span>
          </div>
        )}

        <div className="p-6 space-y-4.5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-800 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Đăng nhập không thành công</p>
                <p className="text-slate-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Nhập Hongvm hoặc admin..."
                  className="w-full pl-9.5 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-100 transition-all"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Nhập mật khẩu quản trị..."
                  className="w-full pl-9.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-100 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#c51f24] hover:bg-[#a5171b] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập Quản trị viên</span>
              </button>
            </div>
          </form>

          {/* Quick-login shortcuts for convenience */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Đăng nhập nhanh
              </span>
              <span className="text-[10px] text-slate-400">1-click xác thực</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleInstantLogin('Hongvm', 'Vungochan@2015')}
                className="p-2.5 bg-red-50/70 hover:bg-red-100 border border-red-200/80 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-950 group-hover:text-red-700">Hongvm</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-200/60 text-red-900 font-mono rounded">Admin</span>
                </div>
                <span className="text-[10.5px] text-red-700 font-mono block mt-0.5">Vungochan@2015</span>
              </button>

              <button
                type="button"
                onClick={() => handleInstantLogin('admin', 'Vungochan@2015')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900">admin</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-700 font-mono rounded">Root</span>
                </div>
                <span className="text-[10.5px] text-slate-600 font-mono block mt-0.5">Vungochan@2015</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center text-[11px] text-slate-500">
          Chỉ Quản trị viên đã đăng nhập mới có quyền thêm, sửa đổi, xóa TTHC và cấu hình hệ thống.
        </div>
      </div>
    </div>
  );
}
