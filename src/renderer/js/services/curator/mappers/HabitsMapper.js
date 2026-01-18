import { BaseMapper } from './BaseMapper.js';
import { ThematicPrompts } from '../../../prompts/curator/ThematicPrompts.js';

export class HabitsMapper extends BaseMapper {
    constructor() {
        super('Habits');
    }

    getPrompt(username, healthReport) {
        return ThematicPrompts.HABITS_PROMPT(username, healthReport);
    }

    getSchema() {
        return ThematicPrompts.HABITS_SCHEMA;
    }
}
