# Siju

Plataforma para entrenadores online: clientes, planes de entrenamiento, dietas,
check-ins, progreso, chat y cobros.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build
npm test           # pruebas de reglas de negocio (vitest)
```

Mientras no hay backend, la app usa datos de ejemplo (`src/lib/data/mock`).
En desarrollo, la barra superior tiene un selector **"Ver como"** para cambiar
entre coach propietario, coach ayudante y cliente, y **"Reiniciar datos"** para
volver a los datos de ejemplo.

El modo sin conexión (service worker) solo se activa en producción:
`npm run build && npm start`.

## Estructura

```
src/
  app/
    (auth)/      login, registro de coach, aceptar invitación
    (coach)/     panel web del coach  → /coach/...
    (client)/    PWA del cliente (móvil) → /app/...
  components/
    ui/          componentes base (botón, tabla, formulario, badge, panel)
    coach/       piezas del panel del coach
    client/      piezas de la app del cliente
  i18n/          textos (es). Añadir idioma = nuevo archivo con el tipo Messages
  lib/
    types.ts     tipos de dominio (reflejan el esquema de BD)
    domain/      reglas de negocio puras (riesgo, límites de plan…)
    data/        capa de datos; hoy mock, luego Supabase con las mismas firmas
```

## Fases del frontend

| Fase | Contenido | Estado |
|------|-----------|--------|
| F1 | Base: diseño, layouts por rol, panel, lista y ficha de clientes, auth (UI) | ✅ |
| F2 | Constructor de entrenamientos: biblioteca, plantillas, asignación por semanas | ✅ |
| F3 | Dietas: objetivos de macros, equivalentes, biblioteca de platos | ✅ |
| F4 | App cliente: entreno del día, registro de series, peso recomendado, offline, dieta del día | ✅ |
| F5 | Check-ins: formulario configurable, envío y revisión | |
| F6 | Progreso: gráficas y comparador de fotos | |
| F7 | Chat con adjuntos y audio | |
| F8 | Cobros, pasos, ajustes, planes de la plataforma, admin, RGPD | |

Después: backend (Supabase + RLS, Stripe, Resend, push).
