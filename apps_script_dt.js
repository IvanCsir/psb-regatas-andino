/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: BOTONERA DT EN VIVO - REGATAS ANDINO B
 * Sincronización en tiempo real entre múltiples celulares con Google Sheets
 * 
 * INSTRUCCIONES DE INSTALACIÓN (Toma menos de 2 minutos):
 * 1. Abrí tu planilla: https://docs.google.com/spreadsheets/d/1EfZtExHcLrio49A3wmyZcUOCZYZ7jNnatFt-wsebPQg/edit
 * 2. En el menú superior hacé clic en: "Extensiones" > "Apps Script"
 * 3. Borrá cualquier código que haya en el editor y pegá TODO este archivo.
 * 4. Hacé clic en "Guardar" (icono de disquete 💾 o Ctrl + S).
 * 5. Arriba a la derecha hacé clic en el botón azul "Implementar" > "Nueva implementación".
 * 6. En el engranaje ⚙️ seleccioná "Aplicación web".
 * 7. Completá los campos:
 *    - Descripción: "Botonera DT Live"
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier usuario" (Anyone)  <--- ¡MUY IMPORTANTE!
 * 8. Hacé clic en "Implementar", autorizá los permisos de tu cuenta de Google.
 * 9. Copiá la "URL de la aplicación web" (termina en /exec) y pegala en la web
 *    tocando el botón "⚙️ Sheets" de la Botonera DT.
 * ============================================================================
 */

function doPost(e) {
  try {
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(contents);
    var action = payload.action;
    var round = payload.round || 'Fecha';
    var rival = (payload.rival || payload.rivalName || 'Rival').toUpperCase();
    var sheetName = payload.sheetName || (round + ' - ' + rival);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      buildMatchSheetHeader(sheet, payload);
    }

    if (action === 'log_incident') {
      appendIncidentRow(sheet, payload.event, payload.matchState);
      refreshSummaryGrid(sheet, payload.matchState);
      return createJsonResponse({ status: 'ok', eventId: payload.event.id });
    }

    if (action === 'undo_incident') {
      removeLastIncidentRow(sheet);
      refreshSummaryGrid(sheet, payload.matchState);
      return createJsonResponse({ status: 'ok', undone: true });
    }

    if (action === 'delete_incident') {
      deleteIncidentById(sheet, payload.eventId);
      refreshSummaryGrid(sheet, payload.matchState);
      return createJsonResponse({ status: 'ok', deleted: true });
    }

    if (action === 'reset_match') {
      sheet.clear();
      buildMatchSheetHeader(sheet, payload);
      return createJsonResponse({ status: 'ok', reset: true });
    }

    if (action === 'sync_full_match') {
      sheet.clear();
      buildMatchSheetHeader(sheet, payload);
      if (payload.matchState && payload.matchState.events) {
        payload.matchState.events.forEach(function(evt) {
          appendIncidentRow(sheet, evt, payload.matchState);
        });
      }
      refreshSummaryGrid(sheet, payload.matchState);
      return createJsonResponse({ status: 'ok', synced: true });
    }

    return createJsonResponse({ status: 'ok' });
  } catch (err) {
    return createJsonResponse({ status: 'error', error: err.toString() });
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var paramSheet = e && e.parameter ? e.parameter.sheet : null;

    if (paramSheet) {
      var sheet = ss.getSheetByName(paramSheet);
      if (!sheet) {
        return createJsonResponse({ status: 'empty', events: [] });
      }
      var events = fetchIncidentRows(sheet);
      return createJsonResponse({ status: 'ok', sheet: paramSheet, events: events });
    }

    var sheetNames = ss.getSheets().map(function(s) { return s.getName(); });
    return createJsonResponse({ status: 'ok', sheets: sheetNames });
  } catch (err) {
    return createJsonResponse({ status: 'error', error: err.toString() });
  }
}

// ============================================================================
// CONSTRUCCIÓN DEL FORMATO Y TABLAS DE CADA PARTIDO
// ============================================================================

function buildMatchSheetHeader(sheet, payload) {
  var round = payload.round || 'Fecha 12';
  var rival = (payload.rival || payload.rivalName || 'Rival').toUpperCase();
  var fecha = payload.fecha || new Date().toLocaleDateString('es-AR');
  var homeAway = payload.homeAway || 'Local';

  // 1. Título Principal
  sheet.getRange('A1:G1').merge();
  var titleCell = sheet.getRange('A1');
  titleCell.setValue('🏑 REGATAS ANDINO B vs ' + rival + ' • ' + round.toUpperCase() + ' (1RA DIVISIÓN)');
  titleCell.setBackground('#030d2d');
  titleCell.setFontColor('#00a2ff');
  titleCell.setFontWeight('bold');
  titleCell.setFontSize(14);
  titleCell.setHorizontalAlignment('center');

  // 2. Metadatos del Partido
  sheet.getRange('A2:G2').merge();
  var metaCell = sheet.getRange('A2');
  metaCell.setValue('Fecha: ' + fecha + '  |  Condición: ' + homeAway + '  |  Torneo Clausura Damas B 2026  |  Sincronizado en vivo');
  metaCell.setBackground('#071747');
  metaCell.setFontColor('#9bb1d6');
  metaCell.setFontSize(10);
  metaCell.setHorizontalAlignment('center');

  // 3. Marcador Destacado
  sheet.getRange('A3:G3').merge();
  var scoreCell = sheet.getRange('A3');
  scoreCell.setValue('MARCADOR: REGATAS 0 - 0 ' + rival);
  scoreCell.setBackground('#030d2d');
  scoreCell.setFontColor('#ffffff');
  scoreCell.setFontWeight('bold');
  scoreCell.setFontSize(15);
  scoreCell.setHorizontalAlignment('center');

  // 4. Encabezados de la Tabla Resumen
  var summaryHeaders = [
    ['MÉTRICA TÁCTICA', '1° CUARTO', '2° CUARTO', '3° CUARTO', '4° CUARTO', 'TOTAL REGATAS', 'TOTAL ' + rival]
  ];
  sheet.getRange('A5:G5').setValues(summaryHeaders);
  sheet.getRange('A5:G5').setBackground('#0a215c');
  sheet.getRange('A5:G5').setFontColor('#38bdf8');
  sheet.getRange('A5:G5').setFontWeight('bold');
  sheet.getRange('A5:G5').setHorizontalAlignment('center');
  sheet.getRange('A5').setHorizontalAlignment('left');

  var metricLabels = [
    ['⚽ Goles'],
    ['📥 Ingresos al Área'],
    ['🏑 Córners Cortos Obtenidos'],
    ['🥅 Goles de Córner Corto'],
    ['🎯 Efectividad Córner Corto'],
    ['🎯 Penales Obtenidos (Goles)'],
    ['⚽ Goles de Jugada'],
    ['🟨 Tarjetas (🟩 / 🟨 / 🟥)']
  ];
  sheet.getRange('A6:A13').setValues(metricLabels);
  sheet.getRange('A6:A13').setFontWeight('bold');
  sheet.getRange('A6:A13').setBackground('#071747');
  sheet.getRange('A6:A13').setFontColor('#ffffff');

  // Valores iniciales en ceros
  var initialValues = [
    ['0 - 0', '0 - 0', '0 - 0', '0 - 0', '0', '0'],
    ['0 vs 0', '0 vs 0', '0 vs 0', '0 vs 0', '0', '0'],
    ['0 vs 0', '0 vs 0', '0 vs 0', '0 vs 0', '0', '0'],
    ['0 vs 0', '0 vs 0', '0 vs 0', '0 vs 0', '0', '0'],
    ['0%', '0%', '0%', '0%', '0%', '0%'],
    ['0(0) vs 0(0)', '0(0) vs 0(0)', '0(0) vs 0(0)', '0(0) vs 0(0)', '0 (0)', '0 (0)'],
    ['0 vs 0', '0 vs 0', '0 vs 0', '0 vs 0', '0', '0'],
    ['0/0/0', '0/0/0', '0/0/0', '0/0/0', '0 / 0 / 0', '0 / 0 / 0']
  ];
  sheet.getRange('B6:G13').setValues(initialValues);
  sheet.getRange('B6:G13').setHorizontalAlignment('center');

  // 5. Encabezado del Feed Cronológico
  sheet.getRange('A15:H15').merge();
  var feedTitle = sheet.getRange('A15');
  feedTitle.setValue('📋 REGISTRO CRONOLÓGICO DE INCIDENCIAS EN VIVO (AMBOS CELULARES)');
  feedTitle.setBackground('#0a215c');
  feedTitle.setFontColor('#fbbf24');
  feedTitle.setFontWeight('bold');
  feedTitle.setHorizontalAlignment('center');

  var feedHeaders = [
    ['ID', 'HORA', 'CUARTO', 'RELOJ', 'EQUIPO', 'INCIDENCIA', 'DETALLE / JUGADORA', 'TERMINÓ EN GOL']
  ];
  sheet.getRange('A16:H16').setValues(feedHeaders);
  sheet.getRange('A16:H16').setBackground('#071747');
  sheet.getRange('A16:H16').setFontColor('#38bdf8');
  sheet.getRange('A16:H16').setFontWeight('bold');
  sheet.getRange('A16:H16').setHorizontalAlignment('center');

  // Ajuste de ancho de columnas para lectura óptima
  sheet.setColumnWidth(1, 160); // ID
  sheet.setColumnWidth(2, 90);  // Hora
  sheet.setColumnWidth(3, 80);  // Cuarto
  sheet.setColumnWidth(4, 80);  // Reloj
  sheet.setColumnWidth(5, 120); // Equipo
  sheet.setColumnWidth(6, 260); // Incidencia
  sheet.setColumnWidth(7, 180); // Jugadora
  sheet.setColumnWidth(8, 130); // Gol
}

function refreshSummaryGrid(sheet, matchState) {
  if (!matchState) return;

  var rival = (matchState.rivalName || 'Rival').toUpperCase();
  var qStats = matchState.quarters || {};

  var tot = {
    home: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 },
    away: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 }
  };

  var qMatrix = {};
  [1, 2, 3, 4].forEach(function(q) {
    var cur = qStats[q] || {
      home: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 },
      away: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 }
    };
    qMatrix[q] = cur;

    ['home', 'away'].forEach(function(tm) {
      tot[tm].entries += cur[tm].entries || 0;
      tot[tm].corners += cur[tm].corners || 0;
      tot[tm].cornerGoals += cur[tm].cornerGoals || 0;
      tot[tm].strokes += cur[tm].strokes || 0;
      tot[tm].strokeGoals += cur[tm].strokeGoals || 0;
      tot[tm].fieldGoals += cur[tm].fieldGoals || 0;
      tot[tm].green += cur[tm].green || 0;
      tot[tm].yellow += cur[tm].yellow || 0;
      tot[tm].red += cur[tm].red || 0;
      tot[tm].goals += cur[tm].goals || 0;
    });
  });

  // Marcador en A3
  var scoreText = 'MARCADOR: REGATAS ' + tot.home.goals + ' - ' + tot.away.goals + ' ' + rival;
  sheet.getRange('A3').setValue(scoreText);

  var calcEff = function(g, t) { return t > 0 ? Math.round((g / t) * 100) + '%' : '0%'; };

  var row6 = [
    (qMatrix[1].home.goals || 0) + ' - ' + (qMatrix[1].away.goals || 0),
    (qMatrix[2].home.goals || 0) + ' - ' + (qMatrix[2].away.goals || 0),
    (qMatrix[3].home.goals || 0) + ' - ' + (qMatrix[3].away.goals || 0),
    (qMatrix[4].home.goals || 0) + ' - ' + (qMatrix[4].away.goals || 0),
    tot.home.goals,
    tot.away.goals
  ];

  var row7 = [
    (qMatrix[1].home.entries || 0) + ' vs ' + (qMatrix[1].away.entries || 0),
    (qMatrix[2].home.entries || 0) + ' vs ' + (qMatrix[2].away.entries || 0),
    (qMatrix[3].home.entries || 0) + ' vs ' + (qMatrix[3].away.entries || 0),
    (qMatrix[4].home.entries || 0) + ' vs ' + (qMatrix[4].away.entries || 0),
    tot.home.entries,
    tot.away.entries
  ];

  var row8 = [
    (qMatrix[1].home.corners || 0) + ' vs ' + (qMatrix[1].away.corners || 0),
    (qMatrix[2].home.corners || 0) + ' vs ' + (qMatrix[2].away.corners || 0),
    (qMatrix[3].home.corners || 0) + ' vs ' + (qMatrix[3].away.corners || 0),
    (qMatrix[4].home.corners || 0) + ' vs ' + (qMatrix[4].away.corners || 0),
    tot.home.corners,
    tot.away.corners
  ];

  var row9 = [
    (qMatrix[1].home.cornerGoals || 0) + ' vs ' + (qMatrix[1].away.cornerGoals || 0),
    (qMatrix[2].home.cornerGoals || 0) + ' vs ' + (qMatrix[2].away.cornerGoals || 0),
    (qMatrix[3].home.cornerGoals || 0) + ' vs ' + (qMatrix[3].away.cornerGoals || 0),
    (qMatrix[4].home.cornerGoals || 0) + ' vs ' + (qMatrix[4].away.cornerGoals || 0),
    tot.home.cornerGoals,
    tot.away.cornerGoals
  ];

  var row10 = [
    calcEff(qMatrix[1].home.cornerGoals, qMatrix[1].home.corners) + ' vs ' + calcEff(qMatrix[1].away.cornerGoals, qMatrix[1].away.corners),
    calcEff(qMatrix[2].home.cornerGoals, qMatrix[2].home.corners) + ' vs ' + calcEff(qMatrix[2].away.cornerGoals, qMatrix[2].away.corners),
    calcEff(qMatrix[3].home.cornerGoals, qMatrix[3].home.corners) + ' vs ' + calcEff(qMatrix[3].away.cornerGoals, qMatrix[3].away.corners),
    calcEff(qMatrix[4].home.cornerGoals, qMatrix[4].home.corners) + ' vs ' + calcEff(qMatrix[4].away.cornerGoals, qMatrix[4].away.corners),
    calcEff(tot.home.cornerGoals, tot.home.corners),
    calcEff(tot.away.cornerGoals, tot.away.corners)
  ];

  var row11 = [
    (qMatrix[1].home.strokes || 0) + '(' + (qMatrix[1].home.strokeGoals || 0) + ') vs ' + (qMatrix[1].away.strokes || 0) + '(' + (qMatrix[1].away.strokeGoals || 0) + ')',
    (qMatrix[2].home.strokes || 0) + '(' + (qMatrix[2].home.strokeGoals || 0) + ') vs ' + (qMatrix[2].away.strokes || 0) + '(' + (qMatrix[2].away.strokeGoals || 0) + ')',
    (qMatrix[3].home.strokes || 0) + '(' + (qMatrix[3].home.strokeGoals || 0) + ') vs ' + (qMatrix[3].away.strokes || 0) + '(' + (qMatrix[3].away.strokeGoals || 0) + ')',
    (qMatrix[4].home.strokes || 0) + '(' + (qMatrix[4].home.strokeGoals || 0) + ') vs ' + (qMatrix[4].away.strokes || 0) + '(' + (qMatrix[4].away.strokeGoals || 0) + ')',
    tot.home.strokes + ' (' + tot.home.strokeGoals + ')',
    tot.away.strokes + ' (' + tot.away.strokeGoals + ')'
  ];

  var row12 = [
    (qMatrix[1].home.fieldGoals || 0) + ' vs ' + (qMatrix[1].away.fieldGoals || 0),
    (qMatrix[2].home.fieldGoals || 0) + ' vs ' + (qMatrix[2].away.fieldGoals || 0),
    (qMatrix[3].home.fieldGoals || 0) + ' vs ' + (qMatrix[3].away.fieldGoals || 0),
    (qMatrix[4].home.fieldGoals || 0) + ' vs ' + (qMatrix[4].away.fieldGoals || 0),
    tot.home.fieldGoals,
    tot.away.fieldGoals
  ];

  var row13 = [
    qMatrix[1].home.green + '/' + qMatrix[1].home.yellow + '/' + qMatrix[1].home.red + ' vs ' + qMatrix[1].away.green + '/' + qMatrix[1].away.yellow + '/' + qMatrix[1].away.red,
    qMatrix[2].home.green + '/' + qMatrix[2].home.yellow + '/' + qMatrix[2].home.red + ' vs ' + qMatrix[2].away.green + '/' + qMatrix[2].away.yellow + '/' + qMatrix[2].away.red,
    qMatrix[3].home.green + '/' + qMatrix[3].home.yellow + '/' + qMatrix[3].home.red + ' vs ' + qMatrix[3].away.green + '/' + qMatrix[3].away.yellow + '/' + qMatrix[3].away.red,
    qMatrix[4].home.green + '/' + qMatrix[4].home.yellow + '/' + qMatrix[4].home.red + ' vs ' + qMatrix[4].away.green + '/' + qMatrix[4].away.yellow + '/' + qMatrix[4].away.red,
    tot.home.green + ' / ' + tot.home.yellow + ' / ' + tot.home.red,
    tot.away.green + ' / ' + tot.away.yellow + ' / ' + tot.away.red
  ];

  sheet.getRange('B6:G13').setValues([row6, row7, row8, row9, row10, row11, row12, row13]);
}

function appendIncidentRow(sheet, evt, matchState) {
  if (!evt) return;

  var teamLabel = evt.team === 'home' ? 'Regatas' : ((matchState && matchState.rivalName) ? matchState.rivalName : 'Rival');
  var goalLabel = evt.endedInGoal ? 'SÍ (GOL ⚽)' : 'No';

  var row = [
    evt.id || ('evt_' + Date.now()),
    evt.timeDisplay || new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    (evt.quarter || 1) + '° C',
    evt.clockTime || '',
    teamLabel,
    evt.label || evt.type,
    evt.player || '',
    goalLabel
  ];

  var lastRow = Math.max(sheet.getLastRow(), 16);
  var targetRow = lastRow + 1;
  sheet.getRange(targetRow, 1, 1, 8).setValues([row]);

  // Estilo condicional sutil para la fila insertada
  var rowRange = sheet.getRange(targetRow, 1, 1, 8);
  rowRange.setFontSize(9);
  if (evt.team === 'home') {
    rowRange.setBackground('#0d214d');
    rowRange.setFontColor('#e2e8f0');
  } else {
    rowRange.setBackground('#2b141d');
    rowRange.setFontColor('#fed7aa');
  }

  if (evt.endedInGoal) {
    rowRange.setFontWeight('bold');
    sheet.getRange(targetRow, 8).setBackground('#065f46').setFontColor('#34d399');
  }
}

function removeLastIncidentRow(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 16) {
    sheet.deleteRow(lastRow);
  }
}

function deleteIncidentById(sheet, eventId) {
  if (!eventId) return;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 16) return;

  var ids = sheet.getRange(17, 1, lastRow - 16, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === eventId) {
      sheet.deleteRow(17 + i);
      break;
    }
  }
}

function fetchIncidentRows(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 16) return [];

  var data = sheet.getRange(17, 1, lastRow - 16, 8).getValues();
  return data.map(function(row) {
    var isHome = (row[4] || '').toString().toLowerCase().indexOf('regatas') !== -1;
    var isGoal = (row[7] || '').toString().toLowerCase().indexOf('sí') !== -1 || (row[7] || '').toString().toLowerCase().indexOf('si') !== -1;
    var qNum = parseInt((row[2] || '1').toString().replace(/[^0-9]/g, ''), 10) || 1;

    return {
      id: row[0],
      timeDisplay: row[1],
      quarter: qNum,
      clockTime: row[3],
      team: isHome ? 'home' : 'away',
      label: row[5],
      player: row[6],
      endedInGoal: isGoal
    };
  });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
