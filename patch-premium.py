import re, sys

with open(sys.argv[1], 'r') as f:
    content = f.read()

# 1. Remplacer l'icône emoji (ligne 88) par un trait or + numéro de service
old_ico = '<div style={{ fontSize: "36px", marginBottom: "16px" }}>{s.ico}</div>'
new_ico = '<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}><div style={{ width: "28px", height: "1px", backgroundColor: "#d4a920" }} /><span style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.15em", color: "#d4a920", textTransform: "uppercase" }}>0{i + 1}</span></div>'
content = content.replace(old_ico, new_ico)

# 2. Remplacer le cercle vert checkmark par un tiret or élégant
old_span = '<span style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#0a2e1a", color: "#d4a920", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px", fontWeight: "700" }}>✓</span>'
new_span = '<span style={{ width: "10px", height: "1px", backgroundColor: "#d4a920", display: "inline-block", flexShrink: 0, marginTop: "8px" }} />'
content = content.replace(old_span, new_span)

with open(sys.argv[1], 'w') as f:
    f.write(content)

print("Patché:", sys.argv[1])
