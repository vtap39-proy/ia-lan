# Formatos de intercambio de IA-lan

Los archivos se intercambian entre Claude y IA-lan-Coach. Todos son JSON con un campo `tipo`.

## Flujo

1. **Evaluación nueva** → el PDF se sube a Claude → Claude entrega `ialan-evaluacion-AAAA-MM-DD.json` → se carga en Coach (**Cargar evaluación**).
2. **Revisión** → Coach descarga `ialan-export-AAAA-MM-DD.json` (**Exportar para revisión**) → se sube a Claude.
3. **Rutina nueva** → Claude entrega `ialan-rutina-vN.json` → se carga en Coach (**Cargar rutina**).

## `ialan-evaluacion`

```json
{
  "tipo": "ialan-evaluacion",
  "version": 1,
  "fecha": "AAAA-MM-DD",
  "fuente": "Clínica · nutriólogo · equipo",
  "diagnostico": "texto",
  "mediciones": {
    "peso_kg": 0, "estatura_m": 0, "imc": 0, "grasa_kg": 0, "grasa_pct": 0, "musculo_kg": 0,
    "grasa_visceral": 0, "cintura_cm": 0, "cadera_cm": 0, "icc": 0, "agua_corporal_L": 0,
    "proteina_kg": 0, "minerales_kg": 0, "tmb_kcal": 0, "puntuacion_inbody": 0,
    "presion_sis": 0, "presion_dia": 0,
    "segmental_magra": { "brazo_izq": 0, "brazo_der": 0, "tronco": 0, "pierna_izq": 0, "pierna_der": 0 },
    "segmental_grasa": { "brazo_izq": 0, "brazo_der": 0, "tronco": 0, "pierna_izq": 0, "pierna_der": 0 }
  },
  "plan": {
    "kcal": 0,
    "agua_L": 0,
    "columnas": [ { "id": "desayuno", "nombre": "Desayuno" }, { "id": "colacion1", "nombre": "Colación" },
                  { "id": "comida", "nombre": "Comida" }, { "id": "colacion2", "nombre": "Colación" },
                  { "id": "cena", "nombre": "Cena" } ],
    "opciones": [
      { "id": "desayuno-1", "columna": "desayuno", "titulo": "Nombre del platillo",
        "items": ["ingrediente y porción"], "dias": ["lun"] }
    ]
  },
  "recomendaciones": ["texto"]
}
```

Regla del plan: las opciones de una misma columna son **intercambiables y se pueden repetir**.

## `ialan-rutina`

```json
{
  "tipo": "ialan-rutina",
  "version": 2,
  "fecha": "AAAA-MM-DD",
  "nombre": "Nombre de la rutina",
  "notas": "texto",
  "dias": [
    {
      "key": "mar", "diaSemana": 2, "nombre": "Martes", "titulo": "UPPER A",
      "foco": "texto", "calentamiento": "texto", "corto": false,
      "ejercicios": [
        { "id": "banca", "nombre": "Press de banca con barra", "series": 4, "reps": "6-8",
          "rir": "2", "descanso_s": 150, "tipo": "peso", "tip": "texto",
          "links": [ { "t": "Técnica", "u": "https://..." } ] }
      ]
    }
  ]
}
```

- `diaSemana`: 1 = lunes … 7 = domingo.
- `tipo`: `peso` (se registra en lb) o `tiempo` (se registra en segundos).
- Conservar el mismo `id` de un ejercicio entre versiones permite comparar el progreso.

## `ialan-semana` (bloques de la semana tipo)

```json
{
  "tipo": "ialan-semana",
  "eval_fecha": "AAAA-MM-DD",
  "bloques": [
    { "dia": 1, "tipo": "comida", "columna": "desayuno", "ref": "desayuno-1", "inicio": "07:00", "duracion_min": 30 },
    { "dia": 2, "tipo": "entreno", "columna": "", "ref": "mar", "inicio": "21:00", "duracion_min": 90 }
  ]
}
```

## `ialan-export`

Lo genera Coach. Contiene configuración (sin el QR), rutina activa e historial de rutinas, evaluaciones completas, plan, semana, todas las series y el diario (comidas, agua, suplementos, pasos).

## Hojas del Google Sheet

| Hoja | Contenido |
|---|---|
| Config | Ajustes clave/valor (nombre, saludo, plan y rutina activos, QR) |
| Evaluaciones | Una fila por evaluación |
| PlanOpciones | Opciones del plan alimenticio por columna |
| PlanSemanal | Bloques de la semana tipo (comidas y entreno) |
| Rutinas | Historial de rutinas (JSON completo) |
| Rutina | Vista legible de la rutina activa |
| Series | Cada serie registrada (peso en lb, reps) |
| Diario | Por día: comidas hechas, agua, suplementos, pasos |

## API (Apps Script)

- `GET ?accion=ping` · `?accion=todo&dias=N` · `?accion=qr` · `?accion=exportar`
- `POST {accion: "sync", ops: [...]}` · `importarEvaluacion` · `guardarRutina` · `activarRutina` · `guardarSemana` · `guardarConfig` · `guardarQR`

Los POST se envían como `text/plain` para evitar el bloqueo CORS del navegador.
