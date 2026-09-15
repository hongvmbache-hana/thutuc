import { UserAccount, UserRole } from '../types';

const STORAGE_KEY = 'tthc_user_accounts';

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr-hongvm',
    username: 'hongvm',
    fullName: 'Vũ Ngọc Hân (Hongvm)',
    email: 'hongvm.bache@gmail.com',
    phone: '0988.xxx.xxx',
    role: 'admin',
    password: 'Vungochan@2015',
    isActive: true,
    createdAt: '2025-01-01T08:00:00.000Z',
    lastLogin: '2026-09-14T19:00:00.000Z'
  },
  {
    id: 'usr-admin',
    username: 'admin',
    fullName: 'Quản trị viên Hệ thống',
    email: 'admin@bacha.gov.vn',
    phone: '0203.3888.222',
    role: 'admin',
    password: 'Vungochan@2015',
    isActive: true,
    createdAt: '2025-01-01T08:00:00.000Z',
    lastLogin: '2026-09-14T18:00:00.000Z'
  },
  {
    id: 'usr-motcua',
    username: 'canbomotcua',
    fullName: 'Cán bộ Tiếp nhận Một cửa',
    email: 'motcua@bacha.gov.vn',
    phone: '0203.3888.111',
    role: 'editor',
    password: 'Motcua@2026',
    isActive: true,
    createdAt: '2025-01-15T08:00:00.000Z'
  },
  {
    id: 'usr-nguyenvana',
    username: 'nguyenvana',
    fullName: 'Nguyễn Văn A (Cán bộ Tra cứu)',
    email: 'nguyenvana@bacha.gov.vn',
    phone: '0912.345.678',
    role: 'viewer',
    password: 'nguyenvana@2026',
    isActive: true,
    createdAt: '2025-02-01T08:00:00.000Z'
  }
];

// Load user accounts from localStorage or fallback to defaults
export const getStoredUsers = (): UserAccount[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Lỗi khi đọc danh sách người dùng từ localStorage:', e);
  }
  // Initialize storage with defaults
  saveStoredUsers(DEFAULT_USERS);
  return DEFAULT_USERS;
};

// Persist users to localStorage
export const saveStoredUsers = (users: UserAccount[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Lỗi khi lưu danh sách người dùng vào localStorage:', e);
  }
};

// Authenticate username and password
export const authenticateUser = (
  usernameInput: string,
  passwordInput: string
): { success: boolean; user?: UserAccount; error?: string } => {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' };
  }

  const users = getStoredUsers();
  const found = users.find(
    u => u.username.toLowerCase() === cleanUser || (u.email && u.email.toLowerCase() === cleanUser)
  );

  if (!found) {
    return { success: false, error: 'Tài khoản không tồn tại trên hệ thống.' };
  }

  if (!found.isActive) {
    return { success: false, error: 'Tài khoản này hiện đang bị khóa. Vui lòng liên hệ quản trị viên.' };
  }

  // Check password (support case sensitivity or standard match)
  if (found.password !== cleanPass) {
    return { success: false, error: 'Mật khẩu không chính xác. Vui lòng thử lại.' };
  }

  // Update last login
  found.lastLogin = new Date().toISOString();
  saveStoredUsers(users);

  return { success: true, user: found };
};

// Generate random secure password
export const generateRandomPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const specials = '@#$%!';
  let pass = 'TTHC@';
  for (let i = 0; i < 4; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  pass += specials.charAt(Math.floor(Math.random() * specials.length));
  pass += Math.floor(100 + Math.random() * 900);
  return pass;
};

// Create a new user
export const createUser = (data: {
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: UserRole;
  password?: string;
  isActive?: boolean;
}): { success: boolean; user?: UserAccount; error?: string } => {
  const cleanUsername = data.username.trim().toLowerCase();
  if (!cleanUsername) {
    return { success: false, error: 'Tên đăng nhập không được để trống.' };
  }

  if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
    return {
      success: false,
      error: 'Tên đăng nhập phải từ 3-30 ký tự, chỉ chứa chữ cái, số, dấu gạch dưới hoặc gạch ngang.'
    };
  }

  const users = getStoredUsers();
  if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: `Tên đăng nhập "${cleanUsername}" đã tồn tại. Vui lòng chọn tên khác.` };
  }

  const newUser: UserAccount = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    username: cleanUsername,
    fullName: data.fullName.trim() || cleanUsername,
    email: data.email?.trim() || undefined,
    phone: data.phone?.trim() || undefined,
    role: data.role || 'editor',
    password: data.password?.trim() || 'Vungochan@2015',
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveStoredUsers(users);
  return { success: true, user: newUser };
};

// Update existing user info
export const updateUser = (
  id: string,
  updates: Partial<Omit<UserAccount, 'id' | 'createdAt'>>
): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return { success: false, error: 'Không tìm thấy người dùng cần cập nhật.' };
  }

  // If role is being changed from admin or isActive being set to false, check if there is at least one active admin remaining
  if (
    (updates.role && updates.role !== 'admin' && users[index].role === 'admin') ||
    (updates.isActive === false && users[index].role === 'admin')
  ) {
    const remainingActiveAdmins = users.filter(
      u => u.id !== id && u.role === 'admin' && u.isActive
    );
    if (remainingActiveAdmins.length === 0) {
      return {
        success: false,
        error: 'Hệ thống phải duy trì ít nhất 01 Quản trị viên (Admin) đang hoạt động.'
      };
    }
  }

  users[index] = {
    ...users[index],
    ...updates,
    fullName: updates.fullName !== undefined ? updates.fullName.trim() : users[index].fullName,
    email: updates.email !== undefined ? updates.email.trim() || undefined : users[index].email,
    phone: updates.phone !== undefined ? updates.phone.trim() || undefined : users[index].phone
  };

  saveStoredUsers(users);
  return { success: true };
};

// Reset or change password
export const resetUserPassword = (
  id: string,
  newPassword: string
): { success: boolean; error?: string } => {
  const cleanPass = newPassword.trim();
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'Mật khẩu mới phải có độ dài tối thiểu từ 6 ký tự trở lên.' };
  }

  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return { success: false, error: 'Không tìm thấy người dùng.' };
  }

  users[index].password = cleanPass;
  saveStoredUsers(users);
  return { success: true };
};

// Delete user with safeguard
export const deleteUser = (id: string): { success: boolean; error?: string } => {
  const users = getStoredUsers();
  const target = users.find(u => u.id === id);
  if (!target) {
    return { success: false, error: 'Không tìm thấy người dùng cần xóa.' };
  }

  if (target.role === 'admin') {
    const remainingAdmins = users.filter(u => u.id !== id && u.role === 'admin');
    if (remainingAdmins.length === 0) {
      return {
        success: false,
        error: 'Không thể xóa Quản trị viên duy nhất của hệ thống.'
      };
    }
  }

  const filtered = users.filter(u => u.id !== id);
  saveStoredUsers(filtered);
  return { success: true };
};

// Role display configuration helper
export const getRoleBadge = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return {
        label: 'Quản trị viên',
        bg: 'bg-red-50 text-red-700 border-red-200',
        desc: 'Toàn quyền Thêm, Sửa, Xóa TTHC, Quản lý tài khoản, Cài đặt hệ thống'
      };
    case 'editor':
      return {
        label: 'Cán bộ Một cửa',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        desc: 'Quyền Thêm, Sửa, Xóa, Cập nhật danh mục TTHC'
      };
    case 'viewer':
      return {
        label: 'Cán bộ Tra cứu',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        desc: 'Chỉ xem và tra cứu danh mục TTHC'
      };
  }
};
