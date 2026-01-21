
const fs = require('fs');
const path = require('path');

const baseDir = 'c:\\Users\\mauro\\OneDrive\\Escritorio\\Giteach\\src\\renderer\\js';

const checks = [
    { file: 'views/pipeline/designer/RoutingDesignerStateLoader.js', import: '../../../utils/ContainerBoxManager.js' },
    { file: 'views/pipeline/designer/modules/NodeManager.js', import: '../../../../utils/ContainerBoxManager.js' },
    { file: 'views/pipeline/designer/renderers/ContainerRenderer.js', import: '../../../../utils/ContainerBoxManager.js' },
    { file: 'views/pipeline/SectorRenderer.js', import: '../../utils/ContainerBoxManager.js' },
    { file: 'views/pipeline/PipelineRenderer.js', import: '../../utils/ContainerBoxManager.js' },
    { file: 'utils/initializeContainers.js', import: './ContainerBoxManager.js' }
];

checks.forEach(check => {
    const fullSourcePath = path.join(baseDir, check.file);
    const resolvedPath = path.resolve(path.dirname(fullSourcePath), check.import);
    const exists = fs.existsSync(resolvedPath);
    console.log(`From: ${check.file}\nImport: ${check.import}\nResolved: ${resolvedPath}\nExists: ${exists}\n`);
});
