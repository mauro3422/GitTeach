/**
 * PipelineConstants.js
 * Configuration schemas for the Pipeline Visualizer.
 * Defines nodes, connections, and event mappings.
 */

export const PIPELINE_NODES = {
    file_queue: {
        id: 'file_queue',
        label: 'Files Queue',
        icon: '📂',
        x: 0.08, y: 0.3, // Relative positions (0-1)
        color: '#8b949e',
        activeColor: '#3fb950'
    },
    workers: {
        id: 'workers',
        label: 'Workers',
        sublabel: 'GPU:8000',
        icon: '🔄',
        x: 0.25, y: 0.3,
        color: '#3fb950',
        activeColor: '#56d364'
    },
    streaming: {
        id: 'streaming',
        label: 'Streaming',
        sublabel: 'Handler',
        icon: '📦',
        x: 0.42, y: 0.3,
        color: '#2f81f7',
        activeColor: '#58a6ff'
    },
    compaction: {
        id: 'compaction',
        label: 'Compaction',
        sublabel: 'CPU:8002',
        icon: '🗜️',
        x: 0.42, y: 0.6,
        color: '#a371f7',
        activeColor: '#bc8cff'
    },
    mappers: {
        id: 'mappers',
        label: 'Mappers',
        sublabel: 'Arch/Habits/Stack',
        icon: '🧠',
        x: 0.62, y: 0.3,
        color: '#f1e05a',
        activeColor: '#f8e96b'
    },
    metrics: {
        id: 'metrics',
        label: 'Metrics',
        sublabel: 'Refinery',
        icon: '📊',
        x: 0.55, y: 0.6,
        color: '#8b949e',
        activeColor: '#ff7b72'
    },
    dna_synth: {
        id: 'dna_synth',
        label: 'DNA Synth',
        sublabel: 'CPU:8002',
        icon: '🧬',
        x: 0.8, y: 0.35,
        color: '#3fb950',
        activeColor: '#56d364'
    },
    intelligence: {
        id: 'intelligence',
        label: 'Intelligence',
        sublabel: 'Persona Evolution',
        icon: '🧠',
        x: 0.85, y: 0.35,
        color: '#8b949e',
        activeColor: '#ab7df8'
    },
    persistence: {
        id: 'persistence',
        label: 'Persistence',
        sublabel: 'Evolution',
        icon: '💾',
        x: 0.92, y: 0.6,
        color: '#8b949e',
        activeColor: '#3fb950'
    }
};

export const CONNECTIONS = [
    { from: 'file_queue', to: 'workers' },
    { from: 'workers', to: 'streaming' },
    { from: 'streaming', to: 'compaction' },
    { from: 'streaming', to: 'mappers' },
    { from: 'compaction', to: 'mappers' },
    { from: 'mappers', to: 'dna_synth' },
    { from: 'metrics', to: 'dna_synth' },
    { from: 'dna_synth', to: 'intelligence' },
    { from: 'intelligence', to: 'persistence' }
];

export const EVENT_NODE_MAP = {
    'worker:': 'workers',
    'ai:gpu:': 'workers',
    'embedding:': 'metrics',
    'ai:cpu:': 'mappers',
    'mapper:': 'mappers',
    'compaction:': 'compaction',
    'dna:': 'dna_synth',
    'synthesis:': 'intelligence',
    'persist:': 'persistence',
    'profile:': 'intelligence',
    'file:': 'file_queue',
    'coordinator:': 'file_queue'
};
