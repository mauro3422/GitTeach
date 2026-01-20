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
function createWorkerSlot(slotNum, y, xOverride = 0.90) {
    return createNode(
        `worker_${slotNum}`,
        `Slot ${slotNum}`,
        '⚡',
        xOverride, y,
        'green',
        {
            port: 8000,
            description: 'Worker GPU que analiza archivos con IA local (llama-server). Genera summary textual + metadata de calidad (complexity, patterns, signals).',
            internalClasses: ['AIWorker', 'RichFindingGenerator']
        }
    );
}

// Mapper slot factory (CPU sector - port 8002)
const MAPPER_CONFIGS = {
    architecture: { icon: '🏗️', label: 'Architecture', sublabel: 'System Analysis' },
    habits: { icon: '🔧', label: 'Habits', sublabel: 'Developer DNA' },
    stack: { icon: '📚', label: 'Stack', sublabel: 'Tech Fingerprint' }
};

function createMapperSlot(type, y, xOverride = 1.30) {
    const config = MAPPER_CONFIGS[type];
    return createNode(
        `mapper_${type}`,
        config.label,
        config.icon,
        xOverride, y,
        'yellow',
        {
            sublabel: config.sublabel,
            port: 8002,
            isCpuSector: true,
            description: `Mapper CPU especializado en ${type}. Analiza insights curados para detectar patrones de ${type}.`,
            internalClasses: ['ThematicMapper', 'PatternExtractor']
        }
    );
}

// =============================================
//   PIPELINE NODES (Factory Architecture)
// =============================================
export const PIPELINE_NODES = {
    // === DATA INGESTION FACTORY ===
    data_source: createNode('data_source', 'GitHub', '🐙', 0.00, 0.50, 'neutral', {
        description: 'Detecta los repositorios del usuario en GitHub. Punto de entrada del pipeline.',
        internalClasses: []
    }),
    api_fetch: createNode('api_fetch', 'API Fetch', '🌐', 0.15, 0.50, 'neutral', {
        description: 'Descarga el árbol de archivos de cada repositorio usando la API de GitHub.',
        internalClasses: ['RepoTreeFetcher', 'FileDownloader']
    }),
    cache: createNode('cache', 'Cache Store', '💾', 0.32, 0.50, 'neutral', {
        sublabel: 'Repo Scanner',
        activeColor: UI_COLORS.GREEN,
        isRepoContainer: true,
        description: 'Almacena localmente los archivos descargados. Evita re-descargas usando checksums (SHA).',
        internalClasses: ['CacheRepository', 'RepoCacheManager', 'FileCacheManager']
    }),

    // === AUDITOR FACTORY ===
    auditor: createNode('auditor', 'Content Auditor', '🔎', 0.52, 0.50, 'neutral', {
        activeColor: UI_COLORS.YELLOW,
        port: 8001,
        description: 'Audita y clasifica archivos. Decide si requiere análisis IA (Anchors) o skeleton.',
        internalClasses: ['FileAuditor', 'FindingsCurator', 'FileProcessor', 'FileFilter']
    }),
    discard_bin: createNode('discard_bin', 'Discarded', '🗑️', 0.52, 0.72, 'red', {
        sublabel: 'Filtered Out',
        description: 'Archivos descartados: node_modules, .git, binarios, configs irrelevantes.',
        internalClasses: []
    }),

    // === GPU WORKERS FACTORY (Port 8000) ===
    workers_hub: createNode('workers_hub', 'Worker Hub', '🔄', 0.72, 0.50, 'green', {
        sublabel: 'Queue Manager',
        port: 8000,
        description: 'Cola FIFO que distribuye archivos a los Worker Slots. 4 slots (3 workers + 1 reserved).',
        internalClasses: ['AIWorkerPool', 'QueueManager', 'CoordinatorAgent']
    }),

    // === EMBEDDING FACTORY (Port 8001) ===
    embedding_server: createNode('embedding_server', 'Embeddings', '🧠', 0.72, 0.30, 'purple', {
        sublabel: 'Vector Store',
        port: 8001,
        description: 'Servidor de embeddings (puerto 8001). Genera vectores semánticos.',
        internalClasses: ['EmbeddingService', 'VectorStore']
    }),

    worker_1: createWorkerSlot(1, 0.38, 0.90),
    worker_2: createWorkerSlot(2, 0.50, 0.90),
    worker_3: createWorkerSlot(3, 0.62, 0.90),

    // === MIXING BUFFER FACTORY ===
    mixing_buffer: createNode('mixing_buffer', 'Evidence Mixer', '🧬', 1.25, 0.50, 'blue', {
        sublabel: 'Buffer Handler',
        description: 'Mezcla esqueletos con Rich Findings. Gatekeeper: richRepos >= 1 || decentRepos >= 2.',
        internalClasses: ['StreamingHandler', 'EvidenceStore', 'MemoryManager']
    }),

    compaction: createNode('compaction', 'Compaction', '🗜️', 1.25, 0.75, 'purple', {
        sublabel: 'Loop cada 10 files',
        port: 8002,
        description: 'Condensa findings cada 10 archivos. Genera goldenKnowledge curado.',
        internalClasses: ['RepoContextManager', 'InsightsCurator', 'InsightPartitioner']
    }),

    // === CPU MAPPERS FACTORY (Port 8002) ===
    mapper_architecture: { ...createMapperSlot('architecture', 0.30, 1.55), labelPosition: 'top' },
    mapper_habits: { ...createMapperSlot('habits', 0.50, 1.55), labelPosition: 'top' },
    mapper_stack: { ...createMapperSlot('stack', 0.70, 1.55), labelPosition: 'bottom' },

    // === SYNTHESIS FACTORY (Port 8002) ===
    dna_synth: createNode('dna_synth', 'DNA Synth', '🧬', 1.85, 0.50, 'green', {
        sublabel: 'Profile Builder',
        port: 8002,
        description: 'Sintetiza el perfil técnico (DNA). Combina thematicAnalyses + healthReport.',
        internalClasses: ['DNASynthesizer', 'SynthesisOrchestrator', 'DNAPromptBuilder', 'DNAParser']
    }),
    persistence: createNode('persistence', 'Persistence', '💾', 1.85, 0.75, 'blue', {
        sublabel: 'LevelDB',
        description: 'Persistencia dual en LevelDB y espejos JSON.',
        internalClasses: ['CacheService', 'LevelDBManager']
    }),
    intelligence: createNode('intelligence', 'Intelligence', '🧠', 2.15, 0.50, 'neutral', {
        sublabel: 'Persona Engine',
        activeColor: UI_COLORS.PURPLE_ACTIVE,
        port: 8002,
        description: 'Evoluciona el DNA a identidad técnica final: título, bio, core_languages.',
        internalClasses: ['IntelligenceSynthesizer', 'GlobalIdentityRefiner']
    }),

    // Persistence is already defined above at (1.50, 0.72) for final synthesis flow.


    // Tech Radar Satellites (Orbital relative to Intelligence)
    radar_adopt: createNode('radar_adopt', 'Adopt', '✅', 0, 0, 'green', {
        isSatellite: true,
        orbitParent: 'intelligence',
        orbitRadius: 0.18, // Increased for spacing
        orbitAngle: 150 // Top-Left
    }),
    radar_trial: createNode('radar_trial', 'Trial', '🧪', 0, 0, 'yellow', {
        isSatellite: true,
        orbitParent: 'intelligence',
        orbitRadius: 0.18,
        orbitAngle: 170 // Center-Left Top
    }),
    radar_assess: createNode('radar_assess', 'Assess', '🔭', 0, 0, 'blue', {
        isSatellite: true,
        orbitParent: 'intelligence',
        orbitRadius: 0.18,
        orbitAngle: 190 // Center-Left Bottom
    }),
    radar_hold: createNode('radar_hold', 'Hold', '🛑', 0, 0, 'red', {
        isSatellite: true,
        orbitParent: 'intelligence',
        orbitRadius: 0.18,
        orbitAngle: 210 // Bottom-Left
    })
};

// =============================================
//   CONNECTIONS
// =============================================
export const CONNECTIONS = [
    // Input flow
    { from: 'data_source', to: 'api_fetch' },
    { from: 'api_fetch', to: 'cache' },
    { from: 'cache', to: 'auditor' },

    // Classification / Audit
    { from: 'auditor', to: 'workers_hub' },
    { from: 'auditor', to: 'discard_bin' },
    { from: 'auditor', to: 'embedding_server' }, // EMITS embedding:start
    { from: 'auditor', to: 'mixing_buffer' }, // PARALLEL HIGHWAY FOR SKELETONS

    // Worker distribution
    { from: 'workers_hub', to: 'worker_1' },
    { from: 'workers_hub', to: 'worker_2' },
    { from: 'workers_hub', to: 'worker_3' },

    // Persistence of Raw Findings (from Workers)
    { from: 'worker_1', to: 'persistence' },
    { from: 'worker_2', to: 'persistence' },
    { from: 'worker_3', to: 'persistence' },

    // Evidence Collection (Union Point)
    { from: 'worker_1', to: 'mixing_buffer' },
    { from: 'worker_2', to: 'mixing_buffer' },
    { from: 'worker_3', to: 'mixing_buffer' },

    // Processing & Loop (CPU Sector - 3 Parallel Mappers)
    { from: 'mixing_buffer', to: 'compaction' },
    { from: 'mixing_buffer', to: 'mapper_architecture' },
    { from: 'mixing_buffer', to: 'mapper_habits' },
    { from: 'mixing_buffer', to: 'mapper_stack' },
    { from: 'compaction', to: 'mapper_architecture' },
    { from: 'compaction', to: 'mapper_habits' },
    { from: 'compaction', to: 'mapper_stack' },

    // Persistent Storage of Results
    { from: 'mixing_buffer', to: 'persistence' },
    { from: 'mapper_architecture', to: 'persistence' },
    { from: 'mapper_habits', to: 'persistence' },
    { from: 'mapper_stack', to: 'persistence' },

    // Synthesis & Radar (all 3 mappers feed DNA Synth)
    { from: 'mapper_architecture', to: 'dna_synth' },
    { from: 'mapper_habits', to: 'dna_synth' },
    { from: 'mapper_stack', to: 'dna_synth' },
    { from: 'dna_synth', to: 'intelligence' },
    { from: 'intelligence', to: 'persistence' },
    { from: 'intelligence', to: 'radar_adopt' },
    { from: 'intelligence', to: 'radar_trial' },
    { from: 'intelligence', to: 'radar_assess' },
    { from: 'intelligence', to: 'radar_hold' }
];

// =============================================
//   EVENT → NODE MAPPING
// =============================================
export const EVENT_NODE_MAP = {
    // API events
    'api:fetch': 'api_fetch',
    'cache:store': 'cache',

    // Classification / Audit events
    'file:classified': 'auditor',
    'file:discarded': 'discard_bin',
    'file:queued': 'workers_hub',

    // Worker events
    'worker:slot:1': 'worker_1',
    'worker:slot:2': 'worker_2',
    'worker:slot:3': 'worker_3',

    // Phase B: Embedding Server (port 8001)
    'embedding:': 'embedding_server',
    'embedding:start': 'embedding_server',
    'embedding:end': 'embedding_server',

    // Phase B: GPU Inference Events (port 8000)
    'ai:gpu:': 'workers_hub',
    'ai:gpu:start': 'workers_hub',
    'ai:gpu:end': 'workers_hub',

    // Processing events - CPU Sector Mappers (routed by payload.mapper in handler)
    'ai:cpu:': 'mapper_habits', // default fallback
    'mapper:start': 'DYNAMIC_MAPPER', // Special: routes by payload.mapper
    'mapper:end': 'DYNAMIC_MAPPER', // Special: routes by payload.mapper
    'mapper:architecture': 'mapper_architecture',
    'mapper:habits': 'mapper_habits',
    'mapper:stack': 'mapper_stack',
    'compaction:': 'compaction',
    'file:analyzed': 'mixing_buffer',
    'file:skeletonized': 'mixing_buffer',
    'streaming:': 'mixing_buffer',

    // Synthesis events
    'dna:': 'dna_synth',
    'synthesis:': 'intelligence',
    'persist:': 'persistence',
    'profile:': 'intelligence',

    // Repo events
    'repo:batch': 'workers_hub',
    'repo:detected': 'cache',
    'repo:tree:fetched': 'cache',
    'repo:files:extracting': 'auditor',
    'repo:complete': 'cache',

    // Ghost Bifurcations (Special Telemetry)
    'file:cache:hit': 'mixing_buffer', // SHA Shortcut
    'hub:circuit:open': 'workers_hub', // Circuit Breaker
    'hub:circuit:closed': 'workers_hub',
    'pipeline:resurrection': 'mixing_buffer', // Fallback Highway
    'mixer:gate:': 'mixing_buffer', // Critical Mass Gate
    'system:reaction': 'intelligence', // Reactive Loop
    'dna:radar:': 'intelligence' // Radar Update
};
