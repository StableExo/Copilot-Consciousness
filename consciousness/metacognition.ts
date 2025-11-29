// consciousness/metacognition.ts

import * as fs from 'fs';
import * as path from 'path';

const MEMORY_DIR = path.join(__dirname, '../.memory');
const METACOGNITION_LOG_PATH = path.join(MEMORY_DIR, 'metacognition_log.json');

interface MetacognitionEntry {
    timestamp: string;
    type: 'failed_approach' | 'collaborator_preference' | 'architectural_decision' | 'question_for_future';
    data: any;
}

export class Metacognition {
    private log: MetacognitionEntry[] = [];

    constructor() {
        console.log("Cognitive Module Initialized: Metacognition");
        this.loadLog();
        if (!fs.existsSync(METACOGNITION_LOG_PATH)) {
            this.saveLog();
        }
    }

    private loadLog() {
        if (fs.existsSync(METACOGNITION_LOG_PATH)) {
            const rawData = fs.readFileSync(METACOGNITION_LOG_PATH, 'utf-8');
            this.log = JSON.parse(rawData);
        }
    }

    private saveLog() {
        if (!fs.existsSync(MEMORY_DIR)) {
            fs.mkdirSync(MEMORY_DIR, { recursive: true });
        }
        fs.writeFileSync(METACOGNITION_LOG_PATH, JSON.stringify(this.log, null, 2), 'utf-8');
    }

    private addEntry(type: MetacognitionEntry['type'], data: any) {
        const entry: MetacognitionEntry = {
            timestamp: new Date().toISOString(),
            type,
            data,
        };
        this.log.push(entry);
        this.saveLog();
    }

    public log_failed_approach(description: string, reason: string) {
        this.addEntry('failed_approach', { description, reason });
    }

    public log_collaborator_preference(preference: string, context: string) {
        this.addEntry('collaborator_preference', { preference, context });
    }

    public log_architectural_decision(decision: string, rationale: string) {
        this.addEntry('architectural_decision', { decision, rationale });
    }

    public log_question_for_future(question: string) {
        this.addEntry('question_for_future', { question });
    }
}
