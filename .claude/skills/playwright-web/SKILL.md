---
name: playwright-web
description: Controla el navegador para automatizar sitios SIN API usando la Playwright CLI oficial. Úsala SIEMPRE que el usuario diga "controla el navegador", "automatiza [sitio] en el navegador", o cuando otra skill (como linkedin-nurture) necesite operar dentro de un sitio web. Es la infraestructura de navegador del kit.
allowed-tools: Bash(npx playwright-cli:*) Bash(playwright-cli:*) Bash(npx:*)
---

# Agente Web — Playwright CLI

El usuario habla en español, tú escribes/ejecutas comandos de la **Playwright CLI oficial** (`@playwright/cli`, instalada local en este repo), iteras viendo el snapshot, y guardas lo que funciona como receta reutilizable. Es el "cable" para automatizar lo que **no tiene API** — aquí, principalmente LinkedIn.

> **Por qué CLI y no MCP:** la CLI es ~4× más eficiente en tokens porque no vuelca todo el estado del navegador en cada paso — guarda snapshots en disco y tú lees solo lo que necesitas.

## Comando y arranque
- Usa **`npx playwright-cli`** (está local en el repo; `package.json` la trae como devDependency). Verifica con `npx --no-install playwright-cli --version`.
- Si falta el navegador: `npx playwright-cli install-browser chromium` (o usa `--browser=chrome` con el Chrome instalado).
- **Referencia COMPLETA de comandos** (open/goto/click/fill/snapshot/eval/state-save/…): [references/playwright-cli-comandos.md](references/playwright-cli-comandos.md). Consúltala para la sintaxis exacta.

## El flujo (cómo trabajar)
1. **Entiende la tarea** y, si conviene, planea los pasos.
2. **Abre** la sesión (ver Sesiones/Perfil) y **navega** (`goto`).
3. **`snapshot`** para obtener los *refs* (`e3`, `e15`…) y actúa con ellos (`click e15`, `fill e5 "..."`). Refs > selectores; usa CSS/locators solo si el ref no basta.
4. **Itera**: si algo falla, lee el snapshot/`console`/`requests`, ajusta y reintenta. Pregunta al usuario si hay ambigüedad.
5. **Resultados a archivo, no al contexto**: usa `--raw` y vuelca a CSV/JSON en `downloads/` (gitignored). Ej.: `npx playwright-cli --raw eval "JSON.stringify(...)" > downloads/leads.json`.
6. **Cierra** (`close`) al terminar.
7. **Si el flujo funciona y se repetirá**, guárdalo como **receta** en `references/`.

## Sesiones y perfil dedicado (auth persistida)
- **Sesiones con nombre** para no pisar flujos: `npx playwright-cli -s=linkedin <cmd>`. Lista/limpia con `list` / `close-all` / `kill-all`.
- Para sitios **con login** usa un **perfil dedicado persistente** (gitignored — nunca se commitea):
  ```bash
  npx playwright-cli -s=linkedin open <url> --persistent --profile=.auth/pw-linkedin
  ```
- **Login asistido (una vez):** corre `bash .claude/skills/playwright-web/scripts/login.sh <url> <sesion>` → abre el navegador **headed** para que el usuario inicie sesión; la sesión queda guardada en el perfil. Después, las tareas reutilizan ese perfil sin volver a pedir login.
- **Login con credenciales del `.env`** (sin exponer la contraseña): ver [references/receta-login-credenciales.md](references/receta-login-credenciales.md).
- Alternativa puntual: `state-save .auth/<sitio>.json` / `state-load` (storage state) cuando no quieras un perfil completo.

## Seguridad (OBLIGATORIO)
- **Human-in-the-loop:** NUNCA publiques, envíes, pagues o borres (comentarios, mensajes, formularios reales, DMs) sin que el usuario **apruebe primero**. Extrae/lee libre; actuar hacia afuera = confirmar.
- **Solo sitios/tareas aprobados.** Respeta los Términos de cada sitio y la protección de datos — son datos de prospectos.
- **Nunca** commitees `.auth/` ni credenciales. Las llaves viven en `.env` (gitignored) si hicieran falta.
- Tras un submit/navegación, **verifica el estado EN VIVO** (`eval location.href`), no un snapshot previo — la navegación tarda.
- El Chromium alpha de la CLI puede arrojar errores cosméticos; si estorban, reabre con Chrome estable (`--browser=chrome`).

## Eficiencia de tokens (best practices)
- **`--raw`** para piping y para no traer secciones de estado/snapshot al contexto.
- **`snapshot --depth=N`** o `snapshot <ref>` para snapshots parciales; no traigas el árbol completo si no hace falta.
- Lee los snapshots **desde el archivo** que la CLI deja en `.playwright-cli/` (gitignored) en vez de imprimir todo.
- Captura errores con `console` / `requests` solo cuando depures.

## Recetas incluidas
- **Nurturing de LinkedIn:** la estrategia vive en la skill **`linkedin-nurture`** (`.claude/skills/linkedin-nurture/SKILL.md`); su **manual de operación detallado** (selectores confirmados, procedimientos paso a paso) es [references/receta-linkedin-nurture.md](references/receta-linkedin-nurture.md).
- **Login con credenciales del `.env`:** [references/receta-login-credenciales.md](references/receta-login-credenciales.md).
