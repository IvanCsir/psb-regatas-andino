# 🏑 Web de Citaciones - Club Regatas Andino

Página web de citaciones oficial para el **Plantel Superior B (1ra e Intermedia)** de **Hockey Femenino de Regatas Andino**.

---

## 📊 Sincronización en Vivo con Google Sheets

La página web está conectada directamente con tu planilla de Google Sheets:
🔗 [Abrir Planilla de Google Sheets](https://docs.google.com/spreadsheets/d/1S0g4BpD6m6Ih9_DQRrdLlnUsruUKrZmlKBAKiWL3XbU/edit?usp=sharing)

### ¿Cómo funciona cada fin de semana?
1. **Jugadoras Citadas (Columna F)**:
   - Marcás con la casilla de verificación en la columna C y automáticamente la columna F filtra a las citadas.
   - La web lee la **Columna F** de la hoja `primera` y de la hoja `intermedia`.
2. **Datos del Partido (Columna I)**:
   - Al lado de cada etiqueta en la columna H, escribís en la columna I:
     - **Rival**: Nombre del rival (ej: *Vistalba*).
     - **Dia**: Día del partido (ej: *Sábado 17 de Octubre*).
     - **Horario citacion**: Hora de vestuario para cada categoría.
     - **Horario partido**: Hora de inicio de cada categoría.
     - **Cancha**: Lugar donde se juega.
3. **Actualización Automática**:
   - Cada vez que una jugadora o vos abren la página web, **los datos se actualizan solos en tiempo real**.

---

## 🛠️ Arquitectura Modular y Desarrollo

El código fuente del frontend está organizado en módulos claros dentro de la carpeta `src/`:
- **`src/js/`**: Módulos JavaScript (autenticación, citaciones, torneo AMH, evaluaciones físicas, live tracker DT, estadísticas y PWA).
- **`src/css/`**: Módulos CSS separados por funcionalidad y pantallas (colores del club, layouts, componentes, modo sol).
- **`api/`**: Funciones Serverless para Vercel (`/api/torneo` y `/api/torneo/matches`) para scraping y sincronización en vivo del torneo oficial AMH.

### Comandos de desarrollo:
```bash
# Compilar los módulos a app.js y styles.css
npm run build

# Modo observador (recompila automáticamente ante cualquier cambio en /src)
npm run dev

# Servidor de pruebas local
npm start
```

---

## 🌐 Publicación en Vercel
La aplicación se despliega automáticamente en Vercel con cada `git push` a la rama `main`:
🔗 **Dominio Oficial:** [https://psb-regatasandino.com](https://psb-regatasandino.com)
