/**
 * LanguageTheme.js
 * Central registry for language-specific visual styles (colors, icons).
 * Used for colorizing file particles and dynamic file nodes.
 */

export const LANGUAGE_THEME = {
    'js': { color: '#f1e05a', icon: 'JS', label: 'Javascript' },
    'jsx': { color: '#61dafb', icon: 'JSX', label: 'React' },
    'ts': { color: '#3178c6', icon: 'TS', label: 'Typescript' },
    'tsx': { color: '#3178c6', icon: 'TSX', label: 'React TS' },
    'css': { color: '#563d7c', icon: 'CSS', label: 'CSS' },
    'html': { color: '#e34c26', icon: 'HTML', label: 'HTML' },
    'json': { color: '#fbc02d', icon: 'JSON', label: 'Data' },
    'md': { color: '#083fa1', icon: 'MD', label: 'Markdown' },
    'py': { color: '#3572A5', icon: 'PY', label: 'Python' },
    'cpp': { color: '#f34b7d', icon: 'C++', label: 'C++' },
    'java': { color: '#b07219', icon: 'JAVA', label: 'Java' },
    'sh': { color: '#89e051', icon: 'SH', label: 'Shell' },
    'default': { color: '#8b949e', icon: 'DOC', label: 'File' }
};

export const getColorForFile = (filePath) => {
    if (!filePath) return LANGUAGE_THEME.default.color;
    const ext = filePath.split('.').pop().toLowerCase();
    const config = LANGUAGE_THEME[ext] || LANGUAGE_THEME.default;
    return config.color;
};

export const getIconForFile = (filePath) => {
    if (!filePath) return LANGUAGE_THEME.default.icon;
    const ext = filePath.split('.').pop().toLowerCase();
    const config = LANGUAGE_THEME[ext] || LANGUAGE_THEME.default;
    return config.icon;
};
