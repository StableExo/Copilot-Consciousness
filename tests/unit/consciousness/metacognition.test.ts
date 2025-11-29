// tests/unit/consciousness/metacognition.test.ts

import * as fs from 'fs';
import * as path from 'path';

const METACOGNITION_LOG_PATH = path.join(process.cwd(), '.memory/metacognition_log.json');

describe('Metacognition', () => {
    let Metacognition: any;

    beforeAll(async () => {
        const module = await import('../../../consciousness/metacognition');
        Metacognition = module.Metacognition;
    });

    beforeEach(() => {
        if (fs.existsSync(METACOGNITION_LOG_PATH)) {
            fs.unlinkSync(METACOGNITION_LOG_PATH);
        }
    });

    it('should create a new metacognition log file', () => {
        new Metacognition();
        expect(fs.existsSync(METACOGNITION_LOG_PATH)).toBe(true);
    });

    it('should log a failed approach', () => {
        const metacognition = new Metacognition();
        metacognition.log_failed_approach('test description', 'test reason');
        const log = JSON.parse(fs.readFileSync(METACOGNITION_LOG_PATH, 'utf-8'));
        expect(log).toHaveLength(1);
        expect(log[0].type).toBe('failed_approach');
        expect(log[0].data.description).toBe('test description');
    });

    it('should log a collaborator preference', () => {
        const metacognition = new Metacognition();
        metacognition.log_collaborator_preference('test preference', 'test context');
        const log = JSON.parse(fs.readFileSync(METACOGNITION_LOG_PATH, 'utf-8'));
        expect(log).toHaveLength(1);
        expect(log[0].type).toBe('collaborator_preference');
        expect(log[0].data.preference).toBe('test preference');
    });

    it('should log an architectural decision', () => {
        const metacognition = new Metacognition();
        metacognition.log_architectural_decision('test decision', 'test rationale');
        const log = JSON.parse(fs.readFileSync(METACOGNITION_LOG_PATH, 'utf-8'));
        expect(log).toHaveLength(1);
        expect(log[0].type).toBe('architectural_decision');
        expect(log[0].data.decision).toBe('test decision');
    });

    it('should log a question for the future', () => {
        const metacognition = new Metacognition();
        metacognition.log_question_for_future('test question');
        const log = JSON.parse(fs.readFileSync(METACOGNITION_LOG_PATH, 'utf-8'));
        expect(log).toHaveLength(1);
        expect(log[0].type).toBe('question_for_future');
        expect(log[0].data.question).toBe('test question');
    });
});
