/**
 * Web Citaciones y Evaluaciones Físicas - Club Regatas Andino
 * Manejo de Citaciones (Primera e Intermedia) y Rendimiento Físico
 * Sincronización en Vivo con Google Sheets (Citaciones y Físico)
 */

// ============================================================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ============================================================================

let matchData = null;
let currentCategory = 'primera'; // 'primera' | 'intermedia'

// Torneo AMH (Clausura Damas B 2026)
const TOURNAMENT_STORAGE_KEY = 'regatas_andino_torneo_v4';
let tournamentData = null;
let currentTournamentDivision = 'primera'; // 'primera' | 'intermedia'
let currentMatchesTab = 'played'; // 'played' | 'pending'

// Evaluaciones Físicas
const PHYSICAL_SPREADSHEET_ID = "1dAoeA0_F4RGLDEjJ0taIJiPA3WlMWl5e";
const PHYSICAL_STORAGE_KEY = "regatas_andino_fisico_v1";
let physicalPlayers = [];
let selectedPlayerId = null;
let currentPhysFilter = "all"; // 'all' | 'PS-B' | 'PS-C' | '5ta'

const STORAGE_KEY = 'regatas_andino_citaciones_v6';

// Sesión y Seguridad de Cuerpo Técnico (Expiración de 12hs validada por /api/auth)
const CT_AUTH_STORAGE_KEY = 'regatas_ct_session_v4';
const DT_SPREADSHEET_ID = '1EfZtExHcLrio49A3wmyZcUOCZYZ7jNnatFt-wsebPQg';
const DT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1EfZtExHcLrio49A3wmyZcUOCZYZ7jNnatFt-wsebPQg/edit';
