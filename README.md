# IA-lan 2.0

Sistema personal de entrenamiento y alimentación.

| Pieza | Para qué | Carpeta |
|---|---|---|
| **IA_lan** | App del celular: entreno del día con registro de pesos, comidas, agua, pasos y QR del gimnasio. Funciona sin señal. | `app/` |
| **IA-lan-Coach** | Tablero en computadora: dashboard de progreso, carga de evaluaciones y rutinas, editor de rutina, semana de comidas en bloques y exportación para revisión. | `coach/` |
| **API** | Apps Script que conecta las apps con el Google Sheet (base de datos). | `apps-script/` |

## Privacidad

Este repositorio es **público**. Por eso **no contiene datos personales**:

- Los datos (pesos, evaluaciones, plan alimenticio, QR) viven solo en el Google Sheet y en el Drive del dueño.
- La dirección del Apps Script (URL `/exec`) **no** se guarda en el código: se captura una vez en la configuración de cada app y queda en el dispositivo.
- `apps-script/Datos.gs` (datos iniciales) **nunca** se sube al repositorio (está en `.gitignore`).

## Estado

- [x] Etapa 1 — Base: Google Sheet + API + datos iniciales
- [ ] Etapa 2 — App IA_lan
- [ ] Etapa 3 — IA-lan-Coach
- [ ] Etapa 4 — Instalación y prueba completa

## Formatos de intercambio

Ver [`docs/FORMATOS.md`](docs/FORMATOS.md).
