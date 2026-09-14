import re

# Read SVG
with open("public/logo-hcc.svg", "r") as f:
    content = f.read()

print(f"SVG length: {len(content)} bytes")
