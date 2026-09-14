import React from 'react';

interface HanhChinhCongLogoProps {
  className?: string;
  size?: number;
  variant?: 'full' | 'badge' | 'white';
}

/**
 * Official Vietnam Public Administration Center / One-Stop-Shop Logo
 * (Biểu trưng Trung tâm Phục vụ Hành chính công & Bộ phận Một cửa các cấp)
 * theo Quyết định / Công văn 2319/VPCP-KSTT của Văn phòng Chính phủ.
 * 
 * Hình tượng: 5 bàn tay màu đỏ đan vào nhau thành vòng tròn đoàn kết,
 * ở giữa là ngôi sao 5 cánh (khoảng âm/sao trắng) tượng trưng cho Tổ quốc,
 * nếp gập cổ tay có ánh vàng cách điệu phục vụ tận tụy.
 */
export default function HanhChinhCongLogo({
  className = '',
  size = 48,
  variant = 'full'
}: HanhChinhCongLogoProps) {
  // Variant "badge": logo đặt trong huy hiệu hình tròn nền trắng trang trọng
  if (variant === 'badge') {
    return (
      <div 
        className={`rounded-full bg-white shadow-xs border border-white/80 flex items-center justify-center p-0.5 shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <HanhChinhCongLogo size={Math.max(14, size - 4)} variant="full" />
      </div>
    );
  }

  // Variant "white": đơn sắc trắng (dành cho nền đỏ hoặc tương phản cao)
  if (variant === 'white') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="Logo Hành chính công"
      >
        <defs>
          <g id="hcc-hand-white">
            {/* Vạt gập cổ tay (màu trắng mờ) */}
            <path
              d="M 64 246 C 72 230 84 216 102 210 C 90 226 78 238 64 246 Z"
              fill="currentColor"
              fillOpacity="0.75"
            />
            {/* Thân bàn tay 4 ngón trắng */}
            <path
              d="
                M 64 246
                C 46 220 28 175 40 130
                C 48 94 76 76 112 76
                L 185 76
                C 190 76 192 79 192 83
                L 192 90
                C 192 94 190 96 185 96
                L 108 96
                C 102 96 99 99 99 102
                C 99 105 102 108 108 108
                L 175 108
                C 180 108 182 111 182 115
                L 182 122
                C 182 126 180 128 175 128
                L 108 128
                C 102 128 99 131 99 134
                C 99 137 102 140 108 140
                L 162 140
                C 167 140 169 143 169 147
                L 169 154
                C 169 158 167 160 162 160
                L 108 160
                C 102 160 99 163 99 166
                C 99 169 102 172 108 172
                L 148 172
                C 153 172 155 175 155 179
                L 155 186
                C 155 190 153 192 148 192
                L 116 192
                C 106 192 98 200 102 210
                C 86 222 74 236 64 246
                Z
              "
              fill="currentColor"
            />
          </g>
        </defs>

        {/* 5 bàn tay quay 72 độ tạo ngôi sao ở giữa */}
        <use href="#hcc-hand-white" />
        <use href="#hcc-hand-white" transform="rotate(72 200 200)" />
        <use href="#hcc-hand-white" transform="rotate(144 200 200)" />
        <use href="#hcc-hand-white" transform="rotate(216 200 200)" />
        <use href="#hcc-hand-white" transform="rotate(288 200 200)" />
      </svg>
    );
  }

  // Full color chuẩn Logo HCC 3: Màu đỏ cờ (#B81C24), ánh vàng viền gấp (#F5CF63)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-xs select-none ${className}`}
      aria-label="Biểu trưng Hành chính công"
    >
      <defs>
        {/* Đơn vị 1 bàn tay gồm vạt vàng và 4 ngón tay đỏ */}
        <g id="hcc-hand-master">
          {/* Vạt gấp cổ tay ánh vàng */}
          <path
            d="M 64 246 C 72 230 84 216 102 210 C 90 226 78 238 64 246 Z"
            fill="#F5CF63"
          />

          {/* Thân bàn tay và 4 ngón màu đỏ truyền thống */}
          <path
            d="
              M 64 246
              C 46 220 28 175 40 130
              C 48 94 76 76 112 76
              L 185 76
              C 190 76 192 79 192 83
              L 192 90
              C 192 94 190 96 185 96
              L 108 96
              C 102 96 99 99 99 102
              C 99 105 102 108 108 108
              L 175 108
              C 180 108 182 111 182 115
              L 182 122
              C 182 126 180 128 175 128
              L 108 128
              C 102 128 99 131 99 134
              C 99 137 102 140 108 140
              L 162 140
              C 167 140 169 143 169 147
              L 169 154
              C 169 158 167 160 162 160
              L 108 160
              C 102 160 99 163 99 166
              C 99 169 102 172 108 172
              L 148 172
              C 153 172 155 175 155 179
              L 155 186
              C 155 190 153 192 148 192
              L 116 192
              C 106 192 98 200 102 210
              C 86 222 74 236 64 246
              Z
            "
            fill="#B81C24"
          />
        </g>
      </defs>

      {/* 5 bàn tay xoay tròn 72 độ tạo thành ngôi sao năm cánh tuyệt đẹp ở trung tâm */}
      <use href="#hcc-hand-master" />
      <use href="#hcc-hand-master" transform="rotate(72 200 200)" />
      <use href="#hcc-hand-master" transform="rotate(144 200 200)" />
      <use href="#hcc-hand-master" transform="rotate(216 200 200)" />
      <use href="#hcc-hand-master" transform="rotate(288 200 200)" />
    </svg>
  );
}
