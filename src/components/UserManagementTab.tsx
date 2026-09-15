import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  KeyRound, 
  Shield, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Lock, 
  Unlock, 
  Search, 
  Check, 
  X, 
  AlertTriangle, 
  Sparkles, 
  Copy, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  UserCheck, 
  Phone, 
  Mail, 
  Calendar,
  RefreshCw
} from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { 
  getStoredUsers, 
  saveStoredUsers, 
  createUser, 
  updateUser, 
  resetUserPassword, 
  deleteUser, 
  generateRandomPassword, 
  getRoleBadge 
} from '../utils/userManagement';

interface UserManagementTabProps {
  onShowToast: (message: string, type: 'success' | 'info' | 'error') => void;
  currentUsername?: string;
}

export default function UserManagementTab({ onShowToast, currentUsername }: UserManagementTabProps) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToActOn, setUserToActOn] = useState<UserAccount | null>(null);

  // Form states - Create User
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('editor');
  const [newPassword, setNewPassword] = useState('');
  const [newIsActive, setNewIsActive] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form states - Reset Password
  const [resetNewPass, setResetNewPass] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Form states - Edit User
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('editor');
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete Confirm
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserAccount | null>(null);

  // Load users
  const reloadUsers = () => {
    setUsers(getStoredUsers());
  };

  useEffect(() => {
    reloadUsers();
  }, []);

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(searchQuery));
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setNewUsername('');
    setNewFullName('');
    setNewEmail('');
    setNewPhone('');
    setNewRole('editor');
    setNewPassword(generateRandomPassword());
    setNewIsActive(true);
    setShowNewPassword(true);
    setIsCreateModalOpen(true);
  };

  // Submit Create User
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createUser({
      username: newUsername,
      fullName: newFullName,
      email: newEmail,
      phone: newPhone,
      role: newRole,
      password: newPassword,
      isActive: newIsActive
    });

    if (res.success && res.user) {
      onShowToast(`Đã tạo thành công người dùng "${res.user.username}" với vai trò ${getRoleBadge(res.user.role).label}!`, 'success');
      reloadUsers();
      setIsCreateModalOpen(false);
    } else {
      onShowToast(res.error || 'Có lỗi xảy ra khi tạo người dùng.', 'error');
    }
  };

  // Open Reset Password Modal
  const handleOpenResetPassword = (user: UserAccount) => {
    setUserToActOn(user);
    setResetNewPass(generateRandomPassword());
    setShowResetPass(true);
    setCopiedPassword(false);
    setIsResetPasswordModalOpen(true);
  };

  // Submit Reset Password
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToActOn) return;

    const res = resetUserPassword(userToActOn.id, resetNewPass);
    if (res.success) {
      onShowToast(`Đã cấp lại mật khẩu mới thành công cho tài khoản "${userToActOn.username}"!`, 'success');
      reloadUsers();
      setIsResetPasswordModalOpen(false);
    } else {
      onShowToast(res.error || 'Không thể đổi mật khẩu.', 'error');
    }
  };

  // Copy password helper
  const handleCopyPassword = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPassword(true);
    onShowToast('Đã sao chép mật khẩu vào bộ nhớ tạm!', 'info');
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  // Open Edit User Modal
  const handleOpenEditModal = (user: UserAccount) => {
    setUserToActOn(user);
    setEditFullName(user.fullName);
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setIsEditModalOpen(true);
  };

  // Submit Edit User
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToActOn) return;

    const res = updateUser(userToActOn.id, {
      fullName: editFullName,
      email: editEmail,
      phone: editPhone,
      role: editRole,
      isActive: editIsActive
    });

    if (res.success) {
      onShowToast(`Đã cập nhật thông tin và phân quyền cho tài khoản "${userToActOn.username}" thành công!`, 'success');
      reloadUsers();
      setIsEditModalOpen(false);
    } else {
      onShowToast(res.error || 'Lỗi cập nhật người dùng.', 'error');
    }
  };

  // Toggle active status
  const handleToggleStatus = (user: UserAccount) => {
    const res = updateUser(user.id, { isActive: !user.isActive });
    if (res.success) {
      onShowToast(`Đã ${user.isActive ? 'khóa' : 'kích hoạt'} tài khoản "${user.username}".`, 'info');
      reloadUsers();
    } else {
      onShowToast(res.error || 'Không thể thay đổi trạng thái tài khoản.', 'error');
    }
  };

  // Delete User
  const handleDeleteUser = (user: UserAccount) => {
    const res = deleteUser(user.id);
    if (res.success) {
      onShowToast(`Đã xóa tài khoản "${user.username}" khỏi hệ thống.`, 'success');
      reloadUsers();
      setDeleteConfirmUser(null);
    } else {
      onShowToast(res.error || 'Không thể xóa tài khoản.', 'error');
    }
  };

  return (
    <div className="space-y-6" id="user-management-tab">
      {/* Top Banner / Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base uppercase tracking-wide">
                Quản lý Người dùng & Phân quyền Hệ thống
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Tạo tài khoản quản trị viên, cán bộ một cửa, phân quyền thao tác dữ liệu TTHC và cấp lại, đổi mật khẩu an toàn theo tiêu chuẩn bảo mật.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
            id="btn-create-new-user"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm người dùng mới</span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 block text-[11px]">Tổng số tài khoản</span>
            <span className="text-lg font-bold font-mono text-white">{users.length}</span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-red-400 block text-[11px]">Quản trị viên (Admin)</span>
            <span className="text-lg font-bold font-mono text-red-300">
              {users.filter(u => u.role === 'admin').length}
            </span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-emerald-400 block text-[11px]">Cán bộ Một cửa</span>
            <span className="text-lg font-bold font-mono text-emerald-300">
              {users.filter(u => u.role === 'editor').length}
            </span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-blue-400 block text-[11px]">Đang hoạt động</span>
            <span className="text-lg font-bold font-mono text-blue-300">
              {users.filter(u => u.isActive).length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, tài khoản, email, SĐT..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-red-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Lọc phân quyền:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-600 cursor-pointer"
          >
            <option value="all">Tất cả vai trò ({users.length})</option>
            <option value="admin">Quản trị viên ({users.filter(u => u.role === 'admin').length})</option>
            <option value="editor">Cán bộ Một cửa ({users.filter(u => u.role === 'editor').length})</option>
            <option value="viewer">Cán bộ Tra cứu ({users.filter(u => u.role === 'viewer').length})</option>
          </select>

          <button
            type="button"
            onClick={reloadUsers}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Tài khoản & Họ tên</th>
                <th className="py-3 px-4">Phân quyền vai trò</th>
                <th className="py-3 px-4">Liên hệ</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4">Đăng nhập gần nhất</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    Không tìm thấy người dùng nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  const isCurrent = currentUsername && user.username.toLowerCase() === currentUsername.toLowerCase();

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${!user.isActive ? 'opacity-60 bg-slate-50/50' : ''}`}
                    >
                      {/* Name and Username */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            user.role === 'admin' 
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : user.role === 'editor'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{user.fullName}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 font-semibold block">
                              @{user.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span 
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-bold ${roleBadge.bg}`}
                          title={roleBadge.desc}
                        >
                          {user.role === 'admin' && <Shield className="w-3 h-3 text-red-600" />}
                          {user.role === 'editor' && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                          {user.role === 'viewer' && <UserCheck className="w-3 h-3 text-blue-600" />}
                          <span>{roleBadge.label}</span>
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-slate-600">
                        {user.email && (
                          <div className="flex items-center gap-1 text-[11.5px] text-slate-600">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px]">{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        {!user.email && !user.phone && (
                          <span className="text-slate-400 italic text-[11px]">Chưa cập nhật</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer transition-all ${
                            user.isActive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          }`}
                          title={user.isActive ? 'Nhấn để khóa tài khoản' : 'Nhấn để mở khóa tài khoản'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          <span>{user.isActive ? 'Hoạt động' : 'Đã khóa'}</span>
                        </button>
                      </td>

                      {/* Last login */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {user.lastLogin ? (
                          new Date(user.lastLogin).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        ) : (
                          <span className="text-slate-400 italic">Chưa đăng nhập</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset / Change Password Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetPassword(user)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                            title="Cấp lại / Đổi mật khẩu cho người dùng này"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Information & Role Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin và phân quyền"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmUser(user)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition-colors cursor-pointer"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL 1: CREATE NEW USER ================= */}
      {isCreateModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#c51f24] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/15">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base uppercase">Thêm người dùng mới</h4>
                  <p className="text-xs text-red-100">Thiết lập tài khoản và phân quyền thao tác</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Tên đăng nhập (Username) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: canbo_huyen, lan.le"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium focus:bg-white focus:outline-none focus:border-red-600"
                  />
                  <span className="text-[10px] text-slate-400">Chữ cái, số, gạch dưới, không dấu</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Họ và tên cán bộ <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: Lê Thị Lan"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">Email công vụ</label>
                  <input
                    type="email"
                    placeholder="lan.le@quangninh.gov.vn"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    placeholder="0988.xxx.xxx"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Phân quyền vai trò <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label 
                    className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                      newRole === 'admin' 
                        ? 'bg-red-50 border-red-300 ring-2 ring-red-200' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="role" 
                      value="admin" 
                      checked={newRole === 'admin'} 
                      onChange={() => setNewRole('admin')} 
                      className="sr-only" 
                    />
                    <Shield className="w-4 h-4 mx-auto text-red-600 mb-1" />
                    <span className="font-bold text-red-900 block text-xs">Quản trị viên</span>
                    <span className="text-[10px] text-red-700 leading-tight block mt-0.5">Toàn quyền hệ thống</span>
                  </label>

                  <label 
                    className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                      newRole === 'editor' 
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="role" 
                      value="editor" 
                      checked={newRole === 'editor'} 
                      onChange={() => setNewRole('editor')} 
                      className="sr-only" 
                    />
                    <ShieldCheck className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                    <span className="font-bold text-emerald-900 block text-xs">Cán bộ Một cửa</span>
                    <span className="text-[10px] text-emerald-700 leading-tight block mt-0.5">Thêm, Sửa, Xóa TTHC</span>
                  </label>

                  <label 
                    className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                      newRole === 'viewer' 
                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="role" 
                      value="viewer" 
                      checked={newRole === 'viewer'} 
                      onChange={() => setNewRole('viewer')} 
                      className="sr-only" 
                    />
                    <UserCheck className="w-4 h-4 mx-auto text-blue-600 mb-1" />
                    <span className="font-bold text-blue-900 block text-xs">Cán bộ Tra cứu</span>
                    <span className="text-[10px] text-blue-700 leading-tight block mt-0.5">Chỉ xem dữ liệu</span>
                  </label>
                </div>
              </div>

              {/* Password Initial */}
              <div className="space-y-1 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-900 uppercase tracking-wider block text-[11px]">
                    Mật khẩu khởi tạo <span className="text-red-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Tạo ngẫu nhiên</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-mono font-bold text-xs text-amber-950 focus:outline-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(newPassword)}
                      className="p-1 hover:bg-amber-100 rounded text-amber-800 cursor-pointer"
                      title="Sao chép mật khẩu"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="p-1 hover:bg-amber-100 rounded text-amber-800 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10.5px] text-amber-800">
                  Hãy sao chép và gửi mật khẩu này cho cán bộ để đăng nhập lần đầu.
                </p>
              </div>

              {/* Active Switch */}
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-xs">Kích hoạt tài khoản ngay sau khi tạo</span>
              </label>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#c51f24] hover:bg-red-800 text-white font-bold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác nhận tạo tài khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: RESET PASSWORD ================= */}
      {isResetPasswordModalOpen && userToActOn && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsResetPasswordModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/15">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base uppercase">Cấp lại mật khẩu</h4>
                  <p className="text-xs text-amber-100">Đổi mật khẩu cho: {userToActOn.fullName}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
                <p><strong>Tài khoản:</strong> <span className="font-mono font-bold text-slate-900">{userToActOn.username}</span></p>
                <p><strong>Vai trò hiện tại:</strong> {getRoleBadge(userToActOn.role).label}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Mật khẩu mới <span className="text-red-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetNewPass(generateRandomPassword())}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Tạo ngẫu nhiên</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    required
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(resetNewPass)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                      title="Sao chép mật khẩu"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetPass(!showResetPass)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                    >
                      {showResetPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <span className="text-[10.5px] text-slate-500">Tối thiểu từ 6 ký tự trở lên</span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                Sau khi xác nhận, người dùng này sẽ đăng nhập bằng mật khẩu mới này. Vui lòng bấm biểu tượng sao chép để gửi mật khẩu cho cán bộ.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Xác nhận đổi mật khẩu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT USER & PERMISSIONS ================= */}
      {isEditModalOpen && userToActOn && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/15">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base uppercase">Sửa thông tin & Phân quyền</h4>
                  <p className="text-xs text-slate-300">Tài khoản: @{userToActOn.username}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Họ và tên cán bộ <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">Số điện thoại</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">Phân quyền vai trò</label>
                <div className="grid grid-cols-3 gap-2">
                  <label 
                    className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                      editRole === 'admin' 
                        ? 'bg-red-50 border-red-300 ring-2 ring-red-200' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="edit_role" 
                      value="admin" 
                      checked={editRole === 'admin'} 
                      onChange={() => setEditRole('admin')} 
                      className="sr-only" 
                    />
                    <Shield className="w-4 h-4 mx-auto text-red-600 mb-1" />
                    <span className="font-bold text-red-900 block text-xs">Quản trị viên</span>
                    <span className="text-[10px] text-red-700 leading-tight block mt-0.5">Toàn quyền</span>
                  </label>

                  <label 
                    className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                      editRole === 'editor' 
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="edit_role" 
                      value="editor" 
                      checked={editRole === 'editor'} 
                      onChange={() => setEditRole('editor')} 
                      className="sr-only" 
                    />
                    <ShieldCheck className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                    <span className="font-bold text-emerald-900 block text-xs">Cán bộ Một cửa</span>
                    <span className="text-[10px] text-emerald-700 leading-tight block mt-0.5">Thao tác TTHC</span>
                  </label>

                  <label 
                    className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                      editRole === 'viewer' 
                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="edit_role" 
                      value="viewer" 
                      checked={editRole === 'viewer'} 
                      onChange={() => setEditRole('viewer')} 
                      className="sr-only" 
                    />
                    <UserCheck className="w-4 h-4 mx-auto text-blue-600 mb-1" />
                    <span className="font-bold text-blue-900 block text-xs">Cán bộ Tra cứu</span>
                    <span className="text-[10px] text-blue-700 leading-tight block mt-0.5">Chỉ xem</span>
                  </label>
                </div>
              </div>

              {/* Status */}
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-800 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-xs">Tài khoản đang hoạt động (Bỏ tích để khóa đăng nhập)</span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: CONFIRM DELETE USER ================= */}
      {deleteConfirmUser && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setDeleteConfirmUser(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-scaleUp p-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Xác nhận xóa tài khoản?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Bạn có chắc chắn muốn xóa tài khoản <strong>@{deleteConfirmUser.username}</strong> ({deleteConfirmUser.fullName})? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deleteConfirmUser)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
