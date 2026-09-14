import math

# Let us verify the exact geometry of one hand so that when rotated 5 times by 72 degrees:
# 1. The 5 hands fit together seamlessly without overlap or gaps.
# 2. The negative space in the center forms a crisp, regular 5-pointed star.
# 3. Each hand has 4 fingers with 3 slots.
# 4. Each hand has the yellow fold.

# Center
cx, cy = 200, 200

# Let us define the 5 star points (outer tips) and 5 inner notches:
R_tip = 68.0
R_notch = R_tip * 0.381966 # = 25.97

tips = []
notches = []
for i in range(5):
    # Angle for tips
    ang_tip = math.radians(-90 + i * 72)
    tips.append((cx + R_tip * math.cos(ang_tip), cy + R_tip * math.sin(ang_tip)))
    
    # Angle for notches (offset by 36 deg)
    ang_notch = math.radians(-90 + 36 + i * 72)
    notches.append((cx + R_notch * math.cos(ang_notch), cy + R_notch * math.sin(ang_notch)))

print("Tips and notches calculated:")
for i in range(5):
    print(f"Tip {i}: {tips[i][0]:.1f}, {tips[i][1]:.1f} | Notch {i}: {notches[i][0]:.1f}, {notches[i][1]:.1f}")
