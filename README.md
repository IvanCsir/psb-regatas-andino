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
   - Cada vez que una jugadora o vos abren la página web (en Netlify o en el celular), **los datos se actualizan solos en tiempo real**.
   - **¡Ya no tenés que volver a subir la web a Netlify cada fin de semana!**

---

## 🔒 Acceso para Editar
- **Contraseña:** `ctandinob`

---

## 🚀 Despliegue en Netlify
Para actualizar tu sitio con esta nueva versión conectada a Google Sheets:
1. Entrá a [Netlify Drop](https://app.netlify.com/drop).
2. Arrastrá la carpeta `Web Citaciones`.
3. ¡Listo! A partir de ahora, todo se gestiona desde tu planilla de Google Sheets.
