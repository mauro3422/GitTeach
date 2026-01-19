/**
 * PipelineConstants.js
 * Configuration schemas for the Pipeline Visualizer.
 * Defines nodes, connections, and event mappings.
 */

export const PIPELINE_NODES = {
    data_source: {
        id: 'data_source',
        label: 'GitHub',
        icon: '🐙',
        x: -0.05, y: 0.25,
        color: '#8b949e',
        activeColor: '#58a6ff'
    },
    api_fetch: {
        id: 'api_fetch',
        label: 'API Fetch',
        icon: '🌐',
        x: 0.05, y: 0.25,
        color: '#8b949e',
        activeColor: '#58a6ff'
    },
    cache: {
        id: 'cache',
        label: 'Cache Store',
        icon: '💾',
        x: 0.15, y: 0.25,
        color: '#8b949e',
        activeColor: '#3fb950'
    },
    classifier: {
        id: 'classifier',
        label: 'Classifier',
        icon: '🔍',
        x: 0.25, y: 0.25,
        color: '#8b949e',
        activeColor: '#f1e05a',
        port: 8001
    },
    workers_hub: {
        id: 'workers_hub',
        label: 'Worker Hub',
        icon: '🔄',
        x: 0.35, y: 0.25,
        color: '#3fb950',
        activeColor: '#56d364',
        port: 8000
    },
    worker_1: {
        id: 'worker_1',
        label: 'Slot 1',
        icon: '⚡',
        x: 0.45, y: 0.10,
        color: '#3fb950',
        activeColor: '#56d364',
        port: 8000
    },
    worker_2: {
        id: 'worker_2',
        label: 'Slot 2',
        icon: '⚡',
        x: 0.45, y: 0.25,
        color: '#3fb950',
        activeColor: '#56d364',
        port: 8000
    },
    worker_3: {
        id: 'worker_3',
        label: 'Slot 3',
        icon: '⚡',
        x: 0.45, y: 0.40,
        color: '#3fb950',
        activeColor: '#56d364',
        port: 8000
    },
    streaming: {
        id: 'streaming',
        label: 'Streaming',
        sublabel: 'Handler',
        icon: '📦',
        x: 0.6, y: 0.25,
        color: '#2f81f7',
        activeColor: '#58a6ff'
    },
    compaction: {
        id: 'compaction',
        label: 'Compaction',
        sublabel: 'CPU:8002',
        icon: '🗜️',
        x: 0.6, y: 0.5,
        color: '#a371f7',
        activeColor: '#bc8cff',
        port: 8002
    },
    mappers: {
        id: 'mappers',
        label: 'Mappers',
        sublabel: 'CPU:8002',
        icon: '🧠',
        x: 0.75, y: 0.25,
        color: '#f1e05a',
        activeColor: '#f8e96b',
        port: 8002
    },
    dna_synth: {
        id: 'dna_synth',
        label: 'DNA Synth',
        sublabel: 'CPU:8002',
        icon: '🧬',
        x: 0.88, y: 0.25,
        color: '#3fb950',
        activeColor: '#56d364',
        port: 8002
    },
    intelligence: {
        id: 'intelligence',
        label: 'Intelligence',
        sublabel: 'Persona',
        icon: '🧠',
        x: 0.95, y: 0.25,
        color: '#8b949e',
        activeColor: '#ab7df8',
        port: 8002
    },
    persistence: {
        id: 'persistence',
        label: 'Persistence',
        sublabel: 'LevelDB',
        icon: '💾',
        x: 0.95, y: 0.5,
        color: '#8b949e',
        activeColor: '#3fb950'
    }
};

export const CONNECTIONS = [
    { from: 'data_source', to: 'api_fetch' },
    { from: 'api_fetch', to: 'cache' },
    { from: 'cache', to: 'classifier' },
    { from: 'classifier', to: 'workers_hub' },
    { from: 'workers_hub', to: 'worker_1' },
    { from: 'workers_hub', to: 'worker_2' },
    { from: 'workers_hub', to: 'worker_3' },
    { from: 'worker_1', to: 'streaming' },
    { from: 'worker_2', to: 'streaming' },
    { from: 'worker_3', to: 'streaming' },
    { from: 'streaming', to: 'compaction' },
    { from: 'streaming', to: 'mappers' },
    { from: 'compaction', to: 'mappers' },
    { from: 'mappers', to: 'dna_synth' },
    { from: 'dna_synth', to: 'intelligence' },
    { from: 'intelligence', to: 'persistence' }
];

export const EVENT_NODE_MAP = {
    'api:fetch': 'api_fetch',
    'cache:store': 'cache',
    'file:classified': 'classifier',
    'file:queued': 'workers_hub',
    'worker:slot:1': 'worker_1',
    'worker:slot:2': 'worker_2',
    'worker:slot:3': 'worker_3',
    'ai:cpu:': 'mappers',
    'mapper:': 'mappers',
    'compaction:': 'compaction',
    'dna:': 'dna_synth',
    'synthesis:': 'intelligence',
    'persist:': 'persistence',
    'profile:': 'intelligence',
    'file:analyzed': 'streaming',
    'streaming:': 'streaming',
    'repo:batch': 'workers_hub'
};
