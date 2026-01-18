import { BaseMapper } from './BaseMapper.js';
import { ThematicPrompts } from '../../../prompts/curator/ThematicPrompts.js';

export class StackMapper extends BaseMapper {
    constructor() {
        super('Stack');
    }

    getPrompt(username, healthReport) {
        return ThematicPrompts.STACK_PROMPT(username, healthReport);
    }

    getSchema() {
        return ThematicPrompts.STACK_SCHEMA;
    }
}
