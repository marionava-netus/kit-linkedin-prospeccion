#!/usr/bin/env bash
# Login asistido para el agente web.
# Abre el navegador HEADED con un perfil dedicado persistido para que el usuario inicie sesión.
# La sesión queda guardada en el perfil (gitignored) y las tareas posteriores la reutilizan.
# Uso:  bash .claude/skills/playwright-web/scripts/login.sh [url] [sesion]
#   url    : página donde iniciar sesión (default: about:blank)
#   sesion : nombre de sesión de la CLI (default: web; para LinkedIn usa "linkedin")
set -euo pipefail

# Ir a la raíz del repo (este script vive en .claude/skills/playwright-web/scripts/)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

URL="${1:-about:blank}"
SESSION="${2:-web}"
# Perfil por sesión: la sesión "linkedin" usa su propio perfil aislado.
if [ "$SESSION" = "linkedin" ]; then
  PROFILE=".auth/pw-linkedin"
else
  PROFILE=".auth/pw-profile"
fi
mkdir -p "$PROFILE"

echo "→ Abriendo navegador HEADED (sesión '$SESSION', perfil '$PROFILE')."
echo "  Inicia sesión en los sitios que necesites; la sesión se guardará en el perfil."
npx playwright-cli -s="$SESSION" open "$URL" --headed --persistent --profile="$PROFILE"

echo ""
echo "✓ Navegador abierto. Cuando termines de iniciar sesión, cierra con:"
echo "    npx playwright-cli -s=$SESSION close"
echo "  Después, las tareas que usen  -s=$SESSION ... --persistent --profile=$PROFILE  reutilizarán tu sesión."
