#!/bin/bash
echo "=== Installation Design Premium GSE ==="

# 1. Créer le dossier styles
mkdir -p styles

# 2. Écrire le fichier CSS premium
cat > styles/premium-gse.css << 'CSSEOF'
:root {
  --vert: #0a2e1a;
  --or: #d4a920;
  --gris-bord: #e8e6e0;
  --texte-doux: #6b6b65;
}

/* SÉLECTION */
::selection { background: var(--or); color: var(--vert); }

/* SCROLLBAR */
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: var(--gris-bord); }
::-webkit-scrollbar-thumb:hover { background: var(--or); }

/* SECTION LABELS */
.section-label, [class*="section-label"] {
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.16em !important;
  text-transform: uppercase !important;
  color: var(--or) !important;
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-label::before, [class*="section-label"]::before {
  content: '';
  display: block;
  width: 20px;
  height: 0.5px;
  background: var(--or);
  flex-shrink: 0;
}

/* LISTE PREMIUM — tiret or au lieu de cercles verts */
.check-item, [class*="check-item"] {
  display: flex !important;
  align-items: flex-start !important;
  gap: 12px !important;
  padding: 9px 0 !important;
  border-bottom: 0.5px solid var(--gris-bord) !important;
}
.check-item:last-child, [class*="check-item"]:last-child {
  border-bottom: none !important;
}
.check-item svg, [class*="check-item"] svg { display: none !important; }
.check-item::before, [class*="check-item"]::before {
  content: '—';
  color: var(--or);
  font-size: 11px;
  font-weight: 300;
  flex-shrink: 0;
  margin-top: 3px;
  letter-spacing: -0.05em;
}

/* TÉMOIGNAGES — guillemets typographiques */
.gse-stars { display: none; }
.testimonial-accent { width: 24px; height: 1px; background: var(--or); margin: 10px 0; }

/* URGENCY DOT — carré or discret */
.urgency-dot, .blink-dot {
  width: 4px !important; height: 4px !important;
  border-radius: 0 !important;
  background: var(--or) !important;
  animation: none !important;
}
CSSEOF

echo "✓ styles/premium-gse.css créé"

# 3. Trouver le layout principal et injecter le CSS
LAYOUT=""
for f in app/layout.tsx app/layout.jsx app/layout.js; do
  if [ -f "$f" ]; then LAYOUT="$f"; break; fi
done

if [ -n "$LAYOUT" ]; then
  # Vérifier si déjà importé
  if grep -q "premium-gse" "$LAYOUT"; then
    echo "✓ CSS déjà importé dans $LAYOUT"
  else
    # Ajouter l'import après le premier import existant
    sed -i "1s|^|import '@/styles/premium-gse.css'\n|" "$LAYOUT"
    echo "✓ Import ajouté dans $LAYOUT"
  fi
else
  echo "⚠ Layout non trouvé — voir instruction manuelle ci-dessous"
fi

echo ""
echo "=== INSTALLATION TERMINÉE ==="
echo ""
echo "Si l'import n'a pas été ajouté automatiquement, ajoutez cette ligne"
echo "en haut de votre fichier app/layout.tsx ou app/layout.js :"
echo ""
echo "  import '@/styles/premium-gse.css'"
echo ""
