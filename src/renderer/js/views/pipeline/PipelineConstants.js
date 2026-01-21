/**
 * PipelineConstants.js
 * Configuration schemas for the Pipeline Visualizer.
 * Uses factory pattern to reduce repetition in node definitions.
 */

import { UI_COLORS } from './colors.js';

// =============================================
//   INTERNAL COMPONENT DESCRIPTIONS
// =============================================
export const INTERNAL_COMPONENT_DESCRIPTIONS = {
    // API Fetch
    'RepoTreeFetcher': 'Busca y descarga la estructura de archivos de un repositorio.',
    'FileDownloader': 'Gestiona la descarga asíncrona de archivos individuales.',

    // Cache Store
    'CacheRepository': 'Clase principal para persistencia de datos en repositorios locales.',
    'RepoCacheManager': 'Orquesta la sincronización entre el servidor y la cache local.',
    'FileCacheManager': 'Gestiona el ciclo de vida y versionado de archivos en la cache.',
    'fs/temp_store': 'Directorio temporal para archivos en procesamiento intermedio.',
    'lib/buffer_cache': 'Capa de abstracción en memoria para acceso rápido a archivos frecuentes.',
    'sys/integrity_check': 'Módulo de validación de checksums para garantizar datos íntegros.',

    // Auditor
    'FileAuditor': 'Analiza el contenido de los archivos para determinar su relevancia forense.',
    'FindingsCurator': 'Filtra y agrupa hallazgos técnicos para evitar redundancias.',
    'FileProcessor': 'Aplica transformaciones y extracciones básicas a nivel de archivo.',
    'FileFilter': 'Configuración de exclusión basándose en patrones de nombre y tipo.',

    // Worker Hub
    'AIWorkerPool': 'Gestiona el conjunto de workers de IA y su estado de carga.',
    'QueueManager': 'Administra la prioridad y el orden de los archivos en la cola de análisis.',
    'CoordinatorAgent': 'Supervisa la distribución de tareas entre GPU y CPU.',

    // Embedding
    'EmbeddingService': 'Interfaz con el modelo de IA para generar vectores semánticos.',
    'VectorStore': 'Base de datos temporal para almacenar y buscar vectores de similitud.',

    // Mixing Buffer
    'StreamingHandler': 'Maneja el flujo de datos en tiempo real hacia los mappers.',
    'EvidenceStore': 'Almacén centralizado de evidencias recolectadas por los workers.',
    'MemoryManager': 'Optimiza el uso de RAM durante el mezclado de grandes volúmenes de datos.',

    // Compaction
    'RepoContextManager': 'Mantiene el contexto global del repositorio durante la compactación.',
    'InsightsCurator': 'Refina los hallazgos para extraer patrones de alto nivel.',
    'InsightPartitioner': 'Divide los hallazgos en categorías lógicas para su análisis.',

    // DNA Synth
    'DNASynthesizer': 'Generador del perfil técnico principal basándose en evidencias.',
    'SynthesisOrchestrator': 'Coordina los diferentes motores de síntesis técnica.',
    'DNAPromptBuilder': 'Construye prompts dinámicos para los modelos de síntesis.',
    'DNAParser': 'Interpreta y estructura la salida XML/JSON de los modelos de DNA.',

    // Persistence
    'CacheService': 'Servicio principal de acceso a datos persistidos.',
    'LevelDBManager': 'Gestor de bajo nivel para la base de datos key-value.',

    // Intelligence
    'IntelligenceSynthesizer': 'Capa final que genera la identidad humana y profesional.',
    'GlobalIdentityRefiner': 'Pulimenta el perfil final asegurando coherencia semántica.'
};

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
        internalClasses: [
            'CacheRepository',
            'RepoCacheManager',
            'FileCacheManager',
            'fs/temp_store',
            'lib/buffer_cache',
            'sys/integrity_check'
        ]
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
    mixing_buffer: createNode('mixing_buffer', 'Mixing Buffer', '🌪️', 0.72, 0.50, 'neutral', {
        activeColor: UI_COLORS.PURPLE,
        description: 'Mezcla y organiza evidencias parciales antes de la síntesis final.',
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
    { from: 'data_source', to: 'api_fetch', type: 'DATA_INGESTION' },
    { from: 'api_fetch', to: 'cache', type: 'DATA_INGESTION' },
    { from: 'cache', to: 'auditor', type: 'DATA_INGESTION' },

    // Classification / Audit
    { from: 'auditor', to: 'workers_hub', type: 'WORKER_FLOW' },
    { from: 'auditor', to: 'discard_bin', type: 'MAINTENANCE' },
    { from: 'auditor', to: 'embedding_server', type: 'HEAVY_PROCESS' },
    { from: 'auditor', to: 'mixing_buffer', type: 'DATA_FLOW' },

    // Worker distribution
    { from: 'workers_hub', to: 'worker_1', type: 'WORKER_FLOW' },
    { from: 'workers_hub', to: 'worker_2', type: 'WORKER_FLOW' },
    { from: 'workers_hub', to: 'worker_3', type: 'WORKER_FLOW' },

    // Persistence of Raw Findings (from Workers)
    { from: 'worker_1', to: 'persistence', type: 'STORAGE' },
    { from: 'worker_2', to: 'persistence', type: 'STORAGE' },
    { from: 'worker_3', to: 'persistence', type: 'STORAGE' },

    // Evidence Collection (Union Point)
    { from: 'worker_1', to: 'mixing_buffer', type: 'DATA_FLOW' },
    { from: 'worker_2', to: 'mixing_buffer', type: 'DATA_FLOW' },
    { from: 'worker_3', to: 'mixing_buffer', type: 'DATA_FLOW' },

    // Processing & Loop (CPU Sector - 3 Parallel Mappers)
    { from: 'mixing_buffer', to: 'compaction', type: 'HEAVY_PROCESS' },
    { from: 'mixing_buffer', to: 'mapper_architecture', type: 'HEAVY_PROCESS' },
    { from: 'mixing_buffer', to: 'mapper_habits', type: 'HEAVY_PROCESS' },
    { from: 'mixing_buffer', to: 'mapper_stack', type: 'HEAVY_PROCESS' },
    { from: 'compaction', to: 'mapper_architecture', type: 'HEAVY_PROCESS' },
    { from: 'compaction', to: 'mapper_habits', type: 'HEAVY_PROCESS' },
    { from: 'compaction', to: 'mapper_stack', type: 'HEAVY_PROCESS' },

    // Persistent Storage of Results
    { from: 'mixing_buffer', to: 'persistence', type: 'STORAGE' },
    { from: 'mapper_architecture', to: 'persistence', type: 'STORAGE' },
    { from: 'mapper_habits', to: 'persistence', type: 'STORAGE' },
    { from: 'mapper_stack', to: 'persistence', type: 'STORAGE' },

    // Synthesis & Radar (all 3 mappers feed DNA Synth)
    { from: 'mapper_architecture', to: 'dna_synth', type: 'SYNTHESIS' },
    { from: 'mapper_habits', to: 'dna_synth', type: 'SYNTHESIS' },
    { from: 'mapper_stack', to: 'dna_synth', type: 'SYNTHESIS' },
    { from: 'dna_synth', to: 'intelligence', type: 'SYNTHESIS' },
    { from: 'intelligence', to: 'persistence', type: 'STORAGE' },
    { from: 'intelligence', to: 'radar_adopt', type: 'SYNTHESIS' },
    { from: 'intelligence', to: 'radar_trial', type: 'SYNTHESIS' },
    { from: 'intelligence', to: 'radar_assess', type: 'SYNTHESIS' },
    { from: 'intelligence', to: 'radar_hold', type: 'SYNTHESIS' },

    // Forensic Bridge: Evidence back to Cache for long-term audit
    { from: 'persistence', to: 'cache', type: 'FEEDBACK_LOOP' },

    // FEEDBACK LOOP: Final Identity back to Data Ingestion context
    { from: 'intelligence', to: 'api_fetch', type: 'FEEDBACK_LOOP' },

    // Life Signals: Ingestion status directly to Intelligence Persona Engine
    { from: 'data_source', to: 'intelligence', type: 'FEEDBACK_LOOP' },
    { from: 'api_fetch', to: 'intelligence', type: 'FEEDBACK_LOOP' }
];

// =============================================
//   FORENSIC PACKAGE TYPES
// =============================================
/**
 * Defines the nature of the data traveling on the highway.
 */
export const PACKAGE_TYPES = {
    RAW_FILE: { icon: '📄', label: 'Raw File', color: UI_COLORS.NEUTRAL },
    METADATA: { icon: '📊', label: 'Classification', color: UI_COLORS.BLUE },
    FRAGMENT: { icon: '🧬', label: 'Rich Finding', color: UI_COLORS.GREEN },
    INSIGHT: { icon: '💡', label: 'Thematic Insight', color: UI_COLORS.YELLOW },
    DNA_SIGNAL: { icon: '✨', label: 'Identity DNA', color: UI_COLORS.PURPLE_ACTIVE },
    BLUEPRINT: { icon: '🗺️', label: 'Repo Blueprint', color: UI_COLORS.BLUE_ACTIVE },
    CONTEXT_DNA: { icon: '🔄', label: 'Context Injection', color: UI_COLORS.PURPLE_ACTIVE },
    SECURE_STORE: { icon: '🔒', label: 'Persistence', color: UI_COLORS.BLUE_ACTIVE }
};

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
