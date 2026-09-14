import math

# Center of canvas
CX, CY = 200, 200

# Star parameters:
# Outer tip radius R_out, inner notch radius R_in
R_out = 68.0
R_in = R_out * 0.381966  # exact pentagram proportion = 25.97

# The star tips are at angles: -90 + i*72 degrees
# or rotated. Let's check angle offset:
# In Logo HCC 3.png, look at the star in the center:
# The star has one point pointing roughly towards top-left, one top-right, etc.
# Actually, let's look at the horizontal hand at left:
# Finger 1 is horizontal at y ≈ CY - 35
# That means the star tip at left is around angle 162° or 198°
