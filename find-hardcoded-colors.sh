#!/bin/bash
# Crystal Forge — Find all hardcoded dark colors for parchment theme fix
# Run from project root: bash find-hardcoded-colors.sh

echo "========================================"
echo "  CRYSTAL FORGE — HARDCODED COLOR AUDIT"
echo "========================================"

# File extensions to search
EXTS="--include=*.vue --include=*.css --include=*.scss --include=*.sass --include=*.js --include=*.ts --include=*.html"

echo ""
echo "--- Known dark hex colors ---"
grep -rn $EXTS \
  -e "#131b2e" \
  -e "#1b2440" \
  -e "#0c1322" \
  -e "#131c30" \
  -e "#0d1426" \
  -e "#07101e" \
  -e "#0f172a" \
  -e "#0a1628" \
  -e "#0e1828" \
  -e "#0b1525" \
  src/

echo ""
echo "--- rgba with all channels below 50 (dark) ---"
grep -rn $EXTS \
  -e "rgba([0-3][0-9]," \
  -e "rgba(0," \
  -e "rgba(1[0-9]," \
  -e "rgba(2[0-9]," \
  src/ | grep -v "rgba(0, 0, 0, 0)" | grep -v "rgba(0,0,0,0)"

echo ""
echo "--- Specific hardcoded panel/button rgba values ---"
grep -rn $EXTS \
  -e "rgba(30, 42, 66" \
  -e "rgba(30,42,66" \
  -e "rgba(12, 18, 30" \
  -e "rgba(12,18,30" \
  -e "rgba(10, 12, 19" \
  -e "rgba(10,12,19" \
  -e "rgba(18, 17, 28" \
  -e "rgba(18,17,28" \
  -e "rgba(5, 10, 18" \
  -e "rgba(5,10,18" \
  -e "rgba(14, 20, 36" \
  -e "rgba(14,20,36" \
  src/

echo ""
echo "--- background-image gradients with dark stops ---"
grep -rn $EXTS \
  -e "linear-gradient.*#[0-1][0-9a-f]\{5\}" \
  -e "radial-gradient.*#[0-1][0-9a-f]\{5\}" \
  -e "linear-gradient.*rgba([0-2][0-9]," \
  src/

echo ""
echo "--- Vue inline :style bindings with background ---"
grep -rn $EXTS \
  -e ":style.*background" \
  -e "style.*background.*#[0-1]" \
  -e "style.*rgba([0-3][0-9]," \
  src/

echo ""
echo "--- CSS background shorthand with dark values ---"
grep -rn $EXTS \
  -e "background: #[0-1][0-9a-f]\{5\}" \
  -e "background-color: #[0-1][0-9a-f]\{5\}" \
  -e "background:#[0-1][0-9a-f]\{5\}" \
  src/

echo ""
echo "--- top-nav specific backgrounds ---"
grep -rn $EXTS \
  -e "top-nav" \
  src/ | grep -i "background"

echo ""
echo "--- empowerment slot backgrounds ---"
grep -rn $EXTS \
  -e "empowerment" \
  src/ | grep -i "background"

echo ""
echo "--- empty state / no-buildings backgrounds ---"
grep -rn $EXTS \
  -e "empty-state\|no-buildings\|empty-panel\|stream-empty\|workspace-empty" \
  src/ | grep -i "background"

echo ""
echo "========================================"
echo "  Replace all findings with CSS vars:"
echo "  #131b2e / rgba(19,27,46)  -> var(--bg-0)"
echo "  #1b2440 / rgba(27,36,64)  -> var(--bg-1)"
echo "  #0c1322 / rgba(12,19,34)  -> var(--bg-2)"
echo "  rgba(30,42,66,0.92)       -> var(--panel)"
echo "  Any other dark panel rgba -> var(--panel)"
echo "========================================"
