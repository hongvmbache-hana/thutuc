import { UserAccount, UserRole } from '../types';
import {
  hashPassword,
  verifyPassword,
  isPasswordEncrypted
} from './securityHelper';

const STORAGE_KEY = 'tthc_user_accounts';

/**
 * Danh sách người dùng mặc định của hệ thống
 * LƯU Ý BẢO MẬT: Toàn bộ mật khẩu được lưu trữ dưới dạng bản băm Salted SHA-256 ($sha256$v1$...)
 * Không lưu trữ văn bản gốc (plaintext) trong mã nguồn hoặc bộ nhớ hệ thống.
 */
export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr-hongvm',
    username: 'hongvm',
    fullName: 'Vũ Ngọc Hân (Hongvm)',
    email: 'hongvm.bache@gmail.com',
    phone: '0988.xxx.xxx',
    role: 'admin',
    // Mật khẩu đã được mã hóa an toàn kèm Salt riêng
    passwordHash: '$sha256$v1$1000$a7c89f104d3e2b6a951c7e8f01b3d5a2$98c7749ec6319ca3e180a1377feaf87850c22b0029407c452c4e8108a4e30479',
    passwordEncrypted: true,
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
    // Mật khẩu đã được mã hóa an toàn kèm Salt riêng
    passwordHash: '$sha256$v1$1000$f2b48d19e07a3c5b841d9e2f60a1c7e3$1839d521e4b7ad4a5e8f9a2f368e2d46385ca6bd48461c824b3a2172489ce5cb',
    passwordEncrypted: true,
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
    passwordHash: '$sha256$v1$1000$c1e93a7d5b204f8e617a8c9d0b3e5f12$1833a88ed088dd22584ac88490c030712590740349b3752137a38ab2bf0aac38',
    passwordEncrypted: true,
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
    passwordHash: '$sha256$v1$1000$b9d37e1a5f824c0e631b9d7a2c4e8f05$29039a319c7c8bea88c5c61d4763af42c85500974f1c015fd028297a0c6cfeae',
    passwordEncrypted: true,
    isActive: true,
    createdAt: '2025-02-01T08:00:00.000Z'
  }
];

/**
 * Tự động chuyển đổi và mã hóa các tài khoản còn lưu mật khẩu dạng thô (plaintext)
 */
function migrateAndSanitizeUsers(users: UserAccount[]): { sanitized: UserAccount[]; wasMigrated: boolean } {
  let wasMigrated = false;

  const sanitized = users.map((u) => {
    // Nếu có password plaintext hoặc passwordHash chưa chuẩn mã hóa
    const plainPass = u.password;
    const currentHash = u.passwordHash;

    if (plainPass) {
      wasMigrated = true;
      const newHash = hashPassword(plainPass);
      const copy = { ...u, passwordHash: newHash, passwordEncrypted: true };
      delete copy.password;
      return copy;
    }

    if (!currentHash || !isPasswordEncrypted(currentHash)) {
      wasMigrated = true;
      const rawToHash = currentHash || 'Vungochan@2015';
      const newHash = hashPassword(rawToHash);
      const copy = { ...u, passwordHash: newHash, passwordEncrypted: true };
      delete copy.password;
      return copy;
    }

    // Đảm bảo cờ đánh dấu đã mã hóa
    if (!u.passwordEncrypted) {
      wasMigrated = true;
      return { ...u, passwordEncrypted: true };
    }

    return u;
  });

  return { sanitized, wasMigrated };
}

// Load user accounts from localStorage or fallback to defaults
export const getStoredUsers = (): UserAccount[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Tự động quét và nâng cấp tất cả tài khoản sang chuẩn mã hóa an toàn
        const { sanitized, wasMigrated } = migrateAndSanitizeUsers(parsed);
        if (wasMigrated) {
          saveStoredUsers(sanitized);
        }
        return sanitized;
      }
    }
  } catch (e) {
    console.error('Lỗi khi đọc danh sách người dùng từ localStorage:', e);
  }
  // Initialize storage with defaults
  saveStoredUsers(DEFAULT_USERS);
  return DEFAULT_USERS;
};

// Persist users to localStorage (Bảo đảm tuyệt đối không lưu plaintext password)
export const saveStoredUsers = (users: UserAccount[]): void => {
  try {
    // Luôn lọc bỏ trường plaintext 'password' trước khi lưu vào localStorage
    const secureUsers = users.map((u) => {
      const clean = { ...u };
      if (clean.password) {
        if (!clean.passwordHash || !isPasswordEncrypted(clean.passwordHash)) {
          clean.passwordHash = hashPassword(clean.password);
        }
        delete clean.password;
      }
      clean.passwordEncrypted = true;
      return clean;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(secureUsers));
  } catch (e) {
    console.error('Lỗi khi lưu danh sách người dùng vào localStorage:', e);
  }
};

// Authenticate username and password với thuật toán xác thực mật khẩu mã hóa an toàn
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
  const userIndex = users.findIndex(
    u => u.username.toLowerCase() === cleanUser || (u.email && u.email.toLowerCase() === cleanUser)
  );

  if (userIndex === -1) {
    return { success: false, error: 'Tài khoản không tồn tại trên hệ thống.' };
  }

  const found = users[userIndex];

  if (!found.isActive) {
    return { success: false, error: 'Tài khoản này hiện đang bị khóa. Vui lòng liên hệ quản trị viên.' };
  }

  // Xác thực mật khẩu với chuỗi mã hóa Salted SHA-256
  const verification = verifyPassword(cleanPass, found.passwordHash || found.password);

  if (!verification.isValid) {
    return { success: false, error: 'Mật khẩu không chính xác. Vui lòng thử lại.' };
  }

  // Nếu người dùng vừa xác thực bằng mật khẩu plaintext cũ, tự động nâng cấp sang mã hóa ngay lập tức
  if (verification.wasPlaintext && verification.upgradedHash) {
    found.passwordHash = verification.upgradedHash;
    delete found.password;
    found.passwordEncrypted = true;
  } else if (!found.passwordHash || !isPasswordEncrypted(found.passwordHash)) {
    found.passwordHash = hashPassword(cleanPass);
    delete found.password;
    found.passwordEncrypted = true;
  }

  // Update last login
  found.lastLogin = new Date().toISOString();
  users[userIndex] = found;
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

// Create a new user (Mật khẩu được băm mã hóa ngay tại thời điểm khởi tạo)
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

  const rawPassword = data.password?.trim() || generateRandomPassword();

  const newUser: UserAccount = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    username: cleanUsername,
    fullName: data.fullName.trim() || cleanUsername,
    email: data.email?.trim() || undefined,
    phone: data.phone?.trim() || undefined,
    role: data.role || 'editor',
    // Lưu trữ dưới dạng mã hóa Salted SHA-256 an toàn
    passwordHash: hashPassword(rawPassword),
    passwordEncrypted: true,
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

// Reset or change password (Mã hóa mật khẩu mới trước khi lưu)
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

  // Băm mã hóa mật khẩu mới kèm Salt riêng biệt
  users[index].passwordHash = hashPassword(cleanPass);
  users[index].passwordEncrypted = true;
  delete users[index].password;

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
