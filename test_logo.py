import math

# Center
CX, CY = 200, 200

# Let's define the single hand pointing right (at angle 0 or rotated)
# In Logo HCC 3.png, one hand has 4 horizontal fingers pointing right (+X)
# Outer radius is approx 170. Inner star radius is approx 55.

# Let's generate an SVG with 5 rotated hands
def rotate_pt(x, y, angle_deg, cx=CX, cy=CY):
    rad = math.radians(angle_deg)
    dx = x - cx
    dy = y - cy
    rx = dx * math.cos(rad) - dy * math.sin(rad)
    ry = dx * math.sin(rad) + dy * math.cos(rad)
    return cx + rx, cy + ry

# Hand definition:
# The hand at left (wrist at bottom-left, fingers pointing right)
# Red body path:
# Starts from outer wrist, goes around back, into 4 fingers, then bottom palm, then back to wrist.
# Yellow patch:
# Sits in the crook of the wrist.

print("Test generator ready")
