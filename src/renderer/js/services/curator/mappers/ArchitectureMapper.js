import { BaseMapper } from './BaseMapper.js';
import { ThematicPrompts } from '../../../prompts/curator/ThematicPrompts.js';

export class ArchitectureMapper extends BaseMapper {
    constructor() {
        super('Architecture');
    }

    getPrompt(username, healthReport) {
        return ThematicPrompts.ARCHITECTURE_PROMPT(username, healthReport);
    }

    getSchema() {
        return ThematicPrompts.ARCHITECTURE_SCHEMA;
    }
}
