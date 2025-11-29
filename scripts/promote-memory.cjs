// scripts/promote-memory.js

const fs = require('fs');
const path = require('path');
const { KnowledgeBase } = require('../dist/consciousness/knowledge-base/knowledge-base');

const MEMORY_LOG_PATH = path.join(__dirname, '../.memory/log.md');

function parseMemoryLog(logContent) {
    const sessions = logContent.split('---').filter(s => s.trim() !== '');
    return sessions.map(sessionText => {
        const lines = sessionText.trim().split('\n');
        const titleLine = lines.find(line => line.startsWith('## Session:'));
        const title = titleLine ? titleLine.replace('## Session:', '').trim() : 'Untitled Session';
        return {
            title,
            content: sessionText.trim(),
        };
    });
}

async function promoteLatestMemory() {
    console.log('Promoting latest memory to Knowledge Base...');

    if (!fs.existsSync(MEMORY_LOG_PATH)) {
        console.error('Memory log not found!');
        return;
    }

    const logContent = fs.readFileSync(MEMORY_LOG_PATH, 'utf-8');
    const memories = parseMemoryLog(logContent);

    if (memories.length === 0) {
        console.log('No memories to promote.');
        return;
    }

    const latestMemory = memories[memories.length - 1];
    const kb = new KnowledgeBase();

    const article = kb.createArticle(
        latestMemory.title,
        `Summary of session: ${latestMemory.title}`,
        latestMemory.content,
        ['memory-promotion', 'session-log'],
        []
    );

    console.log(`Successfully promoted memory to article: ${article.id}`);
}

promoteLatestMemory();
