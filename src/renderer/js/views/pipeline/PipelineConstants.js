/**
 * PipelineConstants.js
 * Configuration schemas for the Pipeline Visualizer.
 * Uses factory pattern to reduce repetition in node definitions.
 */

import { UI_COLORS } from './colors.js';

// =============================================
//   NODE COLOR PRESETS
// =============================================
const COLORS = {
    neutral: { color: UI_COLORS.NEUTRAL, activeColor: UI_COLORS.NEUTRAL_ACTIVE },
    green: { color: UI_COLORS.GREEN, activeColor: UI_COLORS.GREEN_ACTIVE },
    blue: { color: UI_COLORS.BLUE, activeColor: UI_COLORS.BLUE_ACTIVE },
    yellow: { color: UI_COLORS.YELLOW, activeColor: UI_COLORS.YELLOW_ACTIVE },
    purple: { color: UI_COLORS.PURPLE, activeColor: UI_COLORS.PURPLE_ACTIVE },
    red: { color: UI_COLORS.RED, activeColor: UI_COLORS.RED_ACTIVE }
};

// =============================================
//   NODE FACTORY
// =============================================
function createNode(id, label, icon, x, y, colorPreset, extras = {}) {
    return {
        id,
        label,
        icon,
        x, y,
        ...COLORS[colorPreset],
        ...extras
    };
}

// Worker slot factory (common pattern)
function createWorkerSlot(slotNum, y) {
    return createNode(
        `worker_${slotNum}`,
        `Slot ${slotNum}`,
        '⚡',
        0.78, y,
        'green',
        {
            port: 8000,
            description: 'Worker GPU que analiza archivos con IA local (llama-server). Genera summary textual + metadata de calidad (complexity, patterns, signals).'
        }
    );
}

// =============================================
//   PIPELINE NODES
// =============================================
export const PIPELINE_NODES = {
    // Input Stage
    data_source: createNode('data_source', 'GitHub', '🐙', -0.02, 0.50, 'neutral', {
        description: 'Detecta los repositorios del usuario en GitHub. Punto de entrada del pipeline donde se identifican todos los repos públicos para análisis.'
    }),
    api_fetch: createNode('api_fetch', 'API Fetch', '🌐', 0.08, 0.50, 'neutral', {
        description: 'Descarga el árbol de archivos (tree) de cada repositorio usando la API de GitHub. Obtiene metadata como paths, tamaños y SHAs.'
    }),
    cache: createNode('cache', 'Cache Store', '💾', 0.32, 0.50, 'neutral', {
        sublabel: 'Repo Scanner',
        activeColor: UI_COLORS.GREEN,
        isRepoContainer: true,
        description: 'Almacena localmente los archivos descargados. Evita re-descargas innecesarias usando checksums (SHA). Cada repo se muestra como una tarjeta dentro del contenedor.'
    }),

    // Classification Stage
    classifier: createNode('classifier', 'Classifier', '🔍', 0.58, 0.50, 'neutral', {
        activeColor: UI_COLORS.YELLOW,
        port: 8001,
        description: 'Filtra archivos relevantes para análisis. Acepta código fuente (*.js, *.py, *.ts), documentación (*.md) y configs. Rechaza node_modules, .git, binarios e imágenes.'
    }),
    discard_bin: createNode('discard_bin', 'Discarded', '🗑️', 0.58, 0.72, 'red', {
        sublabel: 'Filtered Out',
        description: 'Archivos que no pasaron el filtro del Classifier. Incluye: node_modules, .git, imágenes, videos, binarios y archivos de configuración irrelevantes.'
    }),

    // Worker Stage
    workers_hub: createNode('workers_hub', 'Worker Hub', '🔄', 0.68, 0.50, 'green', {
        sublabel: 'Queue Manager',
        port: 8000,
        description: 'Cola FIFO que distribuye archivos a los Worker Slots disponibles. Balancea la carga entre los 3 slots de procesamiento paralelo.'
    }),
    worker_1: createWorkerSlot(1, 0.35),
    worker_2: createWorkerSlot(2, 0.50),
    worker_3: createWorkerSlot(3, 0.65),

    // Processing Stage - Triangle layout for the loop
    streaming: createNode('streaming', 'Streaming', '📦', 0.88, 0.42, 'blue', {
        sublabel: 'Buffer Handler',
        description: 'Acumula findings de Workers en un buffer. Cada 3 archivos dispara procesamiento parcial (streaming). Permite actualizar la UI en tiempo real sin esperar repo completo.'
    }),
    mappers: createNode('mappers', 'Mappers', '🧠', 0.98, 0.42, 'yellow', {
        sublabel: 'Thematic Analysis',
        port: 8002,
        description: 'Análisis temático paralelo por 3 mappers especializados: ArchitectureMapper (patrones), HabitsMapper (hábitos de código), StackMapper (tecnologías detectadas).'
    }),
    compaction: createNode('compaction', 'Compaction', '🗜️', 0.93, 0.58, 'purple', {
        sublabel: 'Loop cada 10 files',
        port: 8002,
        description: 'Condensa findings cada 10 archivos. Genera síntesis curada (goldenKnowledge) eliminando ruido y redundancia. Forma un LOOP: Streaming→Compaction→Mappers.'
    }),

    // Synthesis Stage - Linear flow
    dna_synth: createNode('dna_synth', 'DNA Synth', '🧬', 1.08, 0.42, 'green', {
        sublabel: 'Profile Builder',
        port: 8002,
        description: 'Sintetiza el perfil técnico (DNA) del desarrollador. Combina thematicAnalyses + healthReport → traits, bio, code_health y verdict final.'
    }),
    intelligence: createNode('intelligence', 'Intelligence', '🧠', 1.18, 0.42, 'neutral', {
        sublabel: 'Persona Engine',
        activeColor: UI_COLORS.PURPLE_ACTIVE,
        port: 8002,
        description: 'Evoluciona el DNA a una identidad técnica final: título profesional, bio narrativa, core_languages, domain expertise y evolution_snapshot temporal.'
    }),
    persistence: createNode('persistence', 'Persistence', '💾', 0.93, 0.75, 'neutral', {
        sublabel: 'LevelDB',
        activeColor: UI_COLORS.GREEN,
        description: 'Almacenamiento persistente en LevelDB. Guarda: raw_findings.jsonl, curated_memory.json, blueprint.json, golden_knowledge.json y technical_identity.json.'
    })
};

// =============================================
//   CONNECTIONS
// =============================================
export const CONNECTIONS = [
    // Input flow
    { from: 'data_source', to: 'api_fetch' },
    { from: 'api_fetch', to: 'cache' },
    { from: 'cache', to: 'classifier' },

    // Classification
    { from: 'classifier', to: 'workers_hub' },
    { from: 'classifier', to: 'discard_bin' },

    // Worker distribution
    { from: 'workers_hub', to: 'worker_1' },
    { from: 'workers_hub', to: 'worker_2' },
    { from: 'workers_hub', to: 'worker_3' },

    // Persistence of Raw Findings (from Workers)
    { from: 'worker_1', to: 'persistence' },
    { from: 'worker_2', to: 'persistence' },
    { from: 'worker_3', to: 'persistence' },

    // Streaming
    { from: 'worker_1', to: 'streaming' },
    { from: 'worker_2', to: 'streaming' },
    { from: 'worker_3', to: 'streaming' },

    // Processing & Loop
    { from: 'streaming', to: 'compaction' },
    { from: 'streaming', to: 'mappers' },
    { from: 'compaction', to: 'mappers' },

    // Persistent Storage of Results
    { from: 'streaming', to: 'persistence' },
    { from: 'mappers', to: 'persistence' },

    // Synthesis
    { from: 'mappers', to: 'dna_synth' },
    { from: 'dna_synth', to: 'intelligence' },
    { from: 'intelligence', to: 'persistence' }
];

// =============================================
//   EVENT → NODE MAPPING
// =============================================
export const EVENT_NODE_MAP = {
    // API events
    'api:fetch': 'api_fetch',
    'cache:store': 'cache',

    // Classification events
    'file:classified': 'classifier',
    'file:discarded': 'discard_bin',
    'file:queued': 'workers_hub',

    // Worker events
    'worker:slot:1': 'worker_1',
    'worker:slot:2': 'worker_2',
    'worker:slot:3': 'worker_3',

    // Processing events
    'ai:cpu:': 'mappers',
    'mapper:': 'mappers',
    'compaction:': 'compaction',
    'file:analyzed': 'streaming',
    'streaming:': 'streaming',

    // Synthesis events
    'dna:': 'dna_synth',
    'synthesis:': 'intelligence',
    'persist:': 'persistence',
    'profile:': 'intelligence',

    // Repo events
    'repo:batch': 'workers_hub',
    'repo:detected': 'cache',
    'repo:tree:fetched': 'cache',
    'repo:files:extracting': 'classifier',
    'repo:complete': 'cache'
};
