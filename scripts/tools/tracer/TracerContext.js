import path from 'path';
import { fileURLToPath } from 'url';

/**
 * TracerContext - Single Source of Truth for Tracer state
 * 
 * Responsabilidad: Definir rutas base, IDs de sesión y constantes compartidas
 * de forma que sean accesibles por todos los módulos del Tracer Engine.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Since we are in scripts/tools/tracer/, ROOT is 3 levels up
export const ROOT = path.join(__dirname, '../../../');

export const APP_DATA = process.env.APPDATA ||
    (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');

export const SESSION_ID = `SESSION_${new Date().toISOString().replace(/[:.]/g, '-')}`;

export const SESSION_PATH = path.join(ROOT, 'logs/sessions', SESSION_ID);

export const MOCK_PERSISTENCE_PATH = path.join(SESSION_PATH, 'mock_persistence');

export const TOKEN_PATH = path.join(APP_DATA, 'giteach', 'token.json');

export const PID_FILE = path.join(ROOT, 'tracer.pid');
