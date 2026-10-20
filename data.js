// Datos de la Citación - Club Regatas Andino
// Sincronizado automáticamente con Google Sheets
const SPREADSHEET_ID = "1S0g4BpD6m6Ih9_DQRrdLlnUsruUKrZmlKBAKiWL3XbU";

const DEFAULT_MATCH_DATA = {
  clubName: "CLUB REGATAS ANDINO",
  spreadsheetId: SPREADSHEET_ID,
  rival: "Murialdo B",
  rivalLogo: "https://cdn.scorefy.app/teams/shield/fxwodbgmjantrezt49558ttbj.png", // Murialdo B (se actualiza automáticamente desde Google Sheets)
  tournament: "Torneo Clausura",
  fixtureRound: "Fecha 10",
  dateDisplay: "Sábado 24 de Octubre",
  location: "Regatas Andino",
  motto: "Juntas somos más",

  // 1ra División (Datos base sincronizados con hoja 'primera')
  primera: {
    name: "1ra División",
    badge: "1RA",
    callTime: "15.30 hs",
    matchTime: "16.35 hs",
    players: []
  },

  // Intermedia (Datos base sincronizados con hoja 'intermedia')
  intermedia: {
    name: "Intermedia",
    badge: "INTER",
    callTime: "14.15 hs",
    matchTime: "15.15 hs",
    players: []
  }
};

// ============================================================================
// DATOS OFICIALES DEL TORNEO - ASOCIACIÓN MENDOCINA DE HOCKEY (AMH)
// Torneo: Clausura Damas B 2026 (ID 97)
// Primera: Selección división PRIMERA (ID 1)
// Intermedia: Selección división SEGUNDA (ID 2)
// Club: REGATAS ANDINO (ID 3)
// ============================================================================
const DEFAULT_TOURNAMENT_DATA = {
  tournamentName: "Clausura Damas B 2026",
  association: "Asociación Mendocina de Hockey Sobre Césped",
  torneoId: "97",
  lastUpdated: new Date().toLocaleDateString('es-AR'),

  // 1RA DIVISIÓN (División 1 en AMH)
  primera: {
    divisionTitle: "1ra División",
    amhDivisionName: "PRIMERA",
    divisionId: "1",
    officialUrl: "http://15.235.75.172:8080/ords/r/amh/torneos/5?p5_torneos_f=97&p5_jug_cod_division_f=1",
    officialMatchesUrl: "http://15.235.75.172:8080/ords/r/amh/torneos/6?p6_torneos_p=97&p6_club_p=3&p6_jug_cod_division_p=1",
    standings: [
      { pos: 1, zona: "A", team: "MARISTA - B", pj: 11, pg: 10, pe: 1, pp: 0, gf: 25, ge: 8, dif: 17, bonus: 0, pts: 31 },
      { pos: 2, zona: "A", team: "RIVADAVIA - A", pj: 11, pg: 9, pe: 0, pp: 2, gf: 44, ge: 21, dif: 23, bonus: 0, pts: 27 },
      { pos: 3, zona: "A", team: "SAN RAFAEL TENIS CLUB - A", pj: 11, pg: 7, pe: 2, pp: 2, gf: 26, ge: 10, dif: 16, bonus: 1, pts: 24 },
      { pos: 4, zona: "A", team: "SAN JORGE S.R. - A", pj: 11, pg: 7, pe: 2, pp: 2, gf: 28, ge: 18, dif: 10, bonus: 0, pts: 23 },
      { pos: 5, zona: "A", team: "OBRAS MENDOZA - A", pj: 11, pg: 6, pe: 3, pp: 2, gf: 33, ge: 15, dif: 18, bonus: 1, pts: 22 },
      { pos: 6, zona: "A", team: "PUMAI RUGBY CLUB - A", pj: 11, pg: 6, pe: 3, pp: 2, gf: 21, ge: 16, dif: 5, bonus: 1, pts: 22 },
      { pos: 7, zona: "A", team: "TEQÜE RUGBY CLUB - B", pj: 12, pg: 5, pe: 3, pp: 4, gf: 21, ge: 15, dif: 6, bonus: 3, pts: 21 },
      { pos: 8, zona: "A", team: "LOS TORDOS - B", pj: 11, pg: 5, pe: 3, pp: 3, gf: 9, ge: 7, dif: 2, bonus: 2, pts: 20 },
      { pos: 9, zona: "A", team: "ALEMAN - B", pj: 12, pg: 4, pe: 2, pp: 6, gf: 16, ge: 28, dif: -12, bonus: 1, pts: 15 },
      { pos: 10, zona: "A", team: "LICEO - B", pj: 10, pg: 4, pe: 1, pp: 5, gf: 12, ge: 12, dif: 0, bonus: 1, pts: 14 },
      { pos: 11, zona: "A", team: "LOS TORDOS - C", pj: 11, pg: 2, pe: 2, pp: 7, gf: 9, ge: 17, dif: -8, bonus: 1, pts: 9 },
      { pos: 12, zona: "A", team: "MURIALDO - B", pj: 11, pg: 2, pe: 2, pp: 7, gf: 18, ge: 34, dif: -16, bonus: 1, pts: 9 },
      { pos: 13, zona: "A", team: "CABNA - A", pj: 11, pg: 1, pe: 3, pp: 7, gf: 7, ge: 26, dif: -19, bonus: 3, pts: 9 },
      { pos: 14, zona: "A", team: "MARISTA - C", pj: 10, pg: 2, pe: 2, pp: 6, gf: 10, ge: 20, dif: -10, bonus: 0, pts: 8 },
      { pos: 15, zona: "A", team: "BCO MZA - C", pj: 11, pg: 1, pe: 2, pp: 8, gf: 8, ge: 21, dif: -13, bonus: 0, pts: 5 },
      { pos: 16, zona: "A", team: "REGATAS ANDINO - B", pj: 11, pg: 1, pe: 1, pp: 9, gf: 12, ge: 31, dif: -19, bonus: 0, pts: 4 }
    ],
    scorers: [
      { club: "RIVADAVIA", player: "ROSALES, VALERIA", goals: 17 },
      { club: "OBRAS MENDOZA", player: "ROSATO MA ANTONELLA", goals: 8 },
      { club: "PUMAI RUGBY CLUB", player: "ARIAS TATIANA CANDELA", goals: 7 },
      { club: "MARISTA", player: "MOM SUAREZ LAGO, MILAGROS MARIA", goals: 7 },
      { club: "RIVADAVIA", player: "CACACE AMELIA", goals: 6 },
      { club: "SAN RAFAEL TENIS CLUB", player: "LAZARO ANA PAULA", goals: 6 },
      { club: "TEQÜE RUGBY CLUB", player: "GUARNIERI MARIA LUCIANA", goals: 6 },
      { club: "OBRAS MENDOZA", player: "RAMIREZ BERRA MAMILAGROS", goals: 5 },
      { club: "PUMAI RUGBY CLUB", player: "NARDIN PEREZ BRUNELLA FAB", goals: 5 },
      { club: "SAN JORGE S.R.", player: "MOYANO PRISCILA", goals: 5 }
    ],
    matches: [
      { round: "Fecha 1", fecha: "25/07/2026", rival: "BCO MZA", homeAway: "Local", score: "2 - 0", result: "win", status: "Jugado" },
      { round: "Fecha 2", fecha: "01/08/2026", rival: "MARISTA", homeAway: "Visitante", score: "1 - 2", result: "loss", status: "Jugado" },
      { round: "Fecha 3", fecha: "04/08/2026", rival: "OBRAS MENDOZA", homeAway: "Local", score: "0 - 9", result: "loss", status: "Jugado" },
      { round: "Fecha 4", fecha: "15/08/2026", rival: "RIVADAVIA", homeAway: "Visitante", score: "2 - 5", result: "loss", status: "Jugado" },
      { round: "Fecha 5", fecha: "22/08/2026", rival: "PUMAI RUGBY CLUB", homeAway: "Local", score: "0 - 2", result: "loss", status: "Jugado" },
      { round: "Fecha 6", fecha: "29/08/2026", rival: "CABNA", homeAway: "Local", score: "2 - 2", result: "draw", status: "Jugado" },
      { round: "Fecha 7", fecha: "12/09/2026", rival: "MARISTA", homeAway: "Visitante", score: "1 - 3", result: "loss", status: "Jugado" },
      { round: "Fecha 8", fecha: "26/09/2026", rival: "TEQÜE RUGBY CLUB", homeAway: "Local", score: "1 - 2", result: "loss", status: "Jugado" },
      { round: "Fecha 9", fecha: "03/10/2026", rival: "LOS TORDOS", homeAway: "Visitante", score: "2 - 3", result: "loss", status: "Jugado" },
      { round: "Fecha 10", fecha: "10/10/2026", rival: "SAN RAFAEL TENIS CLUB", homeAway: "Local", score: "0 - 1", result: "loss", status: "Jugado" },
      { round: "Fecha 11", fecha: "12/10/2026", rival: "SAN JORGE S.R.", homeAway: "Visitante", score: "1 - 2", result: "loss", status: "Jugado" }
    ],
    nextMatch: {
      round: "Fecha 12",
      fecha: "24/10/2026",
      rival: "MURIALDO B",
      homeAway: "Local",
      status: "Pendiente"
    },
    pendingMatches: [
      { round: "Fecha 12", fecha: "24/10/2026", rival: "MURIALDO B", homeAway: "Local", status: "Pendiente" },
      { round: "Fecha 13", fecha: "25/10/2026", rival: "LICEO", homeAway: "Visitante", status: "Pendiente" },
      { round: "Fecha 14", fecha: "07/11/2026", rival: "ALEMAN", homeAway: "Local", status: "Pendiente" },
      { round: "Fecha 15", fecha: "14/11/2026", rival: "LOS TORDOS", homeAway: "Visitante", status: "Pendiente" }
    ]
  },

  // INTERMEDIA (División 2 en AMH)
  intermedia: {
    divisionTitle: "Intermedia",
    amhDivisionName: "SEGUNDA",
    divisionId: "2",
    officialUrl: "http://15.235.75.172:8080/ords/r/amh/torneos/5?p5_torneos_f=97&p5_jug_cod_division_f=2",
    officialMatchesUrl: "http://15.235.75.172:8080/ords/r/amh/torneos/6?p6_torneos_p=97&p6_club_p=3&p6_jug_cod_division_p=2",
    standings: [
      { pos: 1, zona: "A", team: "OBRAS MENDOZA - A", pj: 11, pg: 11, pe: 0, pp: 0, gf: 35, ge: 2, dif: 33, bonus: 0, pts: 33 },
      { pos: 2, zona: "A", team: "MARISTA - B", pj: 11, pg: 10, pe: 0, pp: 1, gf: 25, ge: 3, dif: 22, bonus: 0, pts: 30 },
      { pos: 3, zona: "A", team: "LOS TORDOS - B", pj: 11, pg: 8, pe: 2, pp: 1, gf: 32, ge: 10, dif: 22, bonus: 0, pts: 26 },
      { pos: 4, zona: "A", team: "SAN RAFAEL TENIS CLUB - A", pj: 11, pg: 8, pe: 2, pp: 1, gf: 23, ge: 4, dif: 19, bonus: 0, pts: 26 },
      { pos: 5, zona: "A", team: "ALEMAN - B", pj: 12, pg: 8, pe: 1, pp: 3, gf: 19, ge: 11, dif: 8, bonus: 0, pts: 25 },
      { pos: 6, zona: "A", team: "RIVADAVIA - A", pj: 11, pg: 8, pe: 0, pp: 3, gf: 33, ge: 12, dif: 21, bonus: 0, pts: 24 },
      { pos: 7, zona: "A", team: "LICEO - B", pj: 10, pg: 5, pe: 1, pp: 4, gf: 15, ge: 11, dif: 4, bonus: 0, pts: 16 },
      { pos: 8, zona: "A", team: "REGATAS ANDINO - B", pj: 11, pg: 5, pe: 1, pp: 5, gf: 13, ge: 16, dif: -3, bonus: 0, pts: 16 },
      { pos: 9, zona: "A", team: "SAN JORGE S.R. - A", pj: 11, pg: 4, pe: 1, pp: 6, gf: 15, ge: 19, dif: -4, bonus: 0, pts: 13 },
      { pos: 10, zona: "A", team: "BCO MZA - C", pj: 11, pg: 3, pe: 2, pp: 6, gf: 7, ge: 12, dif: -5, bonus: 0, pts: 11 },
      { pos: 11, zona: "A", team: "CABNA - A", pj: 11, pg: 2, pe: 2, pp: 7, gf: 9, ge: 21, dif: -12, bonus: 0, pts: 8 },
      { pos: 12, zona: "A", team: "MARISTA - C", pj: 10, pg: 1, pe: 3, pp: 6, gf: 6, ge: 18, dif: -12, bonus: 0, pts: 6 },
      { pos: 13, zona: "A", team: "PUMAI RUGBY CLUB - A", pj: 11, pg: 1, pe: 3, pp: 7, gf: 5, ge: 28, dif: -23, bonus: 0, pts: 6 },
      { pos: 14, zona: "A", team: "MURIALDO - B", pj: 11, pg: 1, pe: 2, pp: 8, gf: 7, ge: 21, dif: -14, bonus: 0, pts: 5 },
      { pos: 15, zona: "A", team: "LOS TORDOS - C", pj: 11, pg: 1, pe: 1, pp: 9, gf: 5, ge: 32, dif: -27, bonus: 0, pts: 4 },
      { pos: 16, zona: "A", team: "TEQÜE RUGBY CLUB - B", pj: 12, pg: 0, pe: 3, pp: 9, gf: 4, ge: 33, dif: -29, bonus: 0, pts: 3 }
    ],
    scorers: [
      { club: "OBRAS MENDOZA", player: "MESCHINI LOURDES", goals: 8 },
      { club: "RIVADAVIA", player: "SANTARELLI LAGGINI , JULIET", goals: 7 },
      { club: "OBRAS MENDOZA", player: "TELLO , VALENTINA", goals: 6 },
      { club: "SAN JORGE S.R.", player: "LOPEZ, KAREN ESTEFANIA", goals: 5 },
      { club: "SAN RAFAEL TENIS CLUB", player: "CERBONI, ABRIL", goals: 5 },
      { club: "RIVADAVIA", player: "CACACE AMELIA", goals: 5 },
      { club: "OBRAS MENDOZA", player: "RODRIGUEZ ISABEL MONSERRA", goals: 4 },
      { club: "LOS TORDOS", player: "VACCA MARIA EMILIA", goals: 4 },
      { club: "CABNA", player: "ALDERETE AGUIRRE, YASMIN ORIANA", goals: 4 },
      { club: "RIVADAVIA", player: "OCAMPO, ANA LAURA", goals: 4 }
    ],
    matches: [
      { round: "Fecha 1", fecha: "25/07/2026", rival: "BCO MZA", homeAway: "Local", score: "0 - 1", result: "loss", status: "Jugado" },
      { round: "Fecha 2", fecha: "01/08/2026", rival: "MARISTA", homeAway: "Visitante", score: "0 - 0", result: "draw", status: "Jugado" },
      { round: "Fecha 3", fecha: "04/08/2026", rival: "OBRAS MENDOZA", homeAway: "Local", score: "0 - 3", result: "loss", status: "Jugado" },
      { round: "Fecha 4", fecha: "15/08/2026", rival: "RIVADAVIA", homeAway: "Visitante", score: "0 - 2", result: "loss", status: "Jugado" },
      { round: "Fecha 5", fecha: "22/08/2026", rival: "PUMAI RUGBY CLUB", homeAway: "Local", score: "2 - 1", result: "win", status: "Jugado" },
      { round: "Fecha 6", fecha: "29/08/2026", rival: "CABNA", homeAway: "Local", score: "2 - 1", result: "win", status: "Jugado" },
      { round: "Fecha 7", fecha: "12/09/2026", rival: "MARISTA", homeAway: "Visitante", score: "0 - 2", result: "loss", status: "Jugado" },
      { round: "Fecha 8", fecha: "26/09/2026", rival: "TEQÜE RUGBY CLUB", homeAway: "Local", score: "3 - 1", result: "win", status: "Jugado" },
      { round: "Fecha 9", fecha: "03/10/2026", rival: "LOS TORDOS", homeAway: "Visitante", score: "3 - 1", result: "win", status: "Jugado" },
      { round: "Fecha 10", fecha: "10/10/2026", rival: "SAN RAFAEL TENIS CLUB", homeAway: "Local", score: "0 - 2", result: "loss", status: "Jugado" },
      { round: "Fecha 11", fecha: "12/10/2026", rival: "SAN JORGE S.R.", homeAway: "Visitante", score: "3 - 2", result: "win", status: "Jugado" }
    ],
    nextMatch: {
      round: "Fecha 12",
      fecha: "24/10/2026",
      rival: "MURIALDO",
      homeAway: "Local",
      status: "Pendiente"
    },
    pendingMatches: [
      { round: "Fecha 12", fecha: "24/10/2026", rival: "MURIALDO", homeAway: "Local", status: "Pendiente" },
      { round: "Fecha 13", fecha: "25/10/2026", rival: "LICEO", homeAway: "Visitante", status: "Pendiente" },
      { round: "Fecha 14", fecha: "07/11/2026", rival: "ALEMAN", homeAway: "Local", status: "Pendiente" },
      { round: "Fecha 15", fecha: "14/11/2026", rival: "LOS TORDOS", homeAway: "Visitante", status: "Pendiente" }
    ]
  }
};

if (typeof window !== 'undefined') {
  window.DEFAULT_MATCH_DATA = DEFAULT_MATCH_DATA;
  window.DEFAULT_TOURNAMENT_DATA = DEFAULT_TOURNAMENT_DATA;
}
if (typeof global !== 'undefined') {
  global.DEFAULT_MATCH_DATA = DEFAULT_MATCH_DATA;
  global.DEFAULT_TOURNAMENT_DATA = DEFAULT_TOURNAMENT_DATA;
}

