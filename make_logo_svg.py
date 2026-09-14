import math

CX, CY = 200, 200

# Let's define the single hand shape in SVG path:
# We will create an accurate vector representation of the hand in Logo HCC 3.png.
# Color constants:
RED = "#B81C24"
YELLOW = "#F4CD5D"
DARK_RED = "#981219"

# Let us generate the full SVG
svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <!-- Filter for subtle crisp drop shadow if needed -->
    <filter id="hcc-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity="0.18" />
    </filter>

    <!-- Single hand definition -->
    <g id="hcc-hand">
      <!-- Yellow inner wrist/cuff accent -->
      <path
        d="M 68 250 C 72 232 82 220 102 215 C 88 232 78 245 68 250 Z"
        fill="{YELLOW}"
      />

      <!-- Main red hand body with 4 fingers and wrist curve -->
      <path
        d="
          M 68 250
          C 50 225 32 180 42 135
          C 50 100 80 82 115 82
          L 182 82
          C 187 82 189 85 189 89
          L 189 95
          C 189 99 187 101 182 101
          L 105 101
          C 98 101 95 104 95 107
          C 95 110 98 113 105 113
          L 172 113
          C 177 113 179 116 179 120
          L 179 126
          C 179 130 177 132 172 132
          L 105 132
          C 98 132 95 135 95 138
          C 95 141 98 144 105 144
          L 160 144
          C 165 144 167 147 167 151
          L 167 157
          C 167 161 165 163 160 163
          L 105 163
          C 98 163 95 166 95 169
          C 95 172 98 175 105 175
          L 146 175
          C 151 175 153 178 153 182
          L 153 188
          C 153 192 151 194 146 194
          L 115 194
          C 105 194 98 202 102 215
          C 86 226 76 240 68 250
          Z
        "
        fill="{RED}"
      />
    </g>
  </defs>

  <!-- 5 hands rotated by 72 deg around center (200, 200) -->
  <g id="hcc-emblem">
    <use href="#hcc-hand" />
    <use href="#hcc-hand" transform="rotate(72 200 200)" />
    <use href="#hcc-hand" transform="rotate(144 200 200)" />
    <use href="#hcc-hand" transform="rotate(216 200 200)" />
    <use href="#hcc-hand" transform="rotate(288 200 200)" />
  </g>
</svg>
"""

with open("public/logo-hcc.svg", "w") as f:
    f.write(svg_content)

print("SVG created successfully at public/logo-hcc.svg")
