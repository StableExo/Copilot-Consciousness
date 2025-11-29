// consciousness/knowledge-base/knowledge-base.ts

import * as fs from 'fs';
import * as path from 'path';
const KB_DIR = path.join(__dirname, '../../.memory/knowledge_base');

export interface KnowledgeArticle {
    id: string;
    title: string;
    summary: string;
    content: string;
    tags: string[];
    related_memories: string[]; // Links to MetacognitionEntry timestamps or other identifiers
    created_at: string;
    updated_at: string;
}

export class KnowledgeBase {
    private articles: Map<string, KnowledgeArticle> = new Map();

    constructor() {
        console.log("Cognitive Module Initialized: KnowledgeBase");
        this.loadArticles();
    }

    private loadArticles() {
        if (!fs.existsSync(KB_DIR)) {
            fs.mkdirSync(KB_DIR, { recursive: true });
        }

        const files = fs.readdirSync(KB_DIR);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const rawData = fs.readFileSync(path.join(KB_DIR, file), 'utf-8');
                const article: KnowledgeArticle = JSON.parse(rawData);
                this.articles.set(article.id, article);
            }
        }
    }

    private saveArticle(article: KnowledgeArticle) {
        const filePath = path.join(KB_DIR, `${article.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(article, null, 2), 'utf-8');
    }

    public createArticle(title: string, summary: string, content: string, tags: string[] = [], related_memories: string[] = []): KnowledgeArticle {
        const id = this.generateId('kb');
        const now = new Date().toISOString();
        const article: KnowledgeArticle = {
            id,
            title,
            summary,
            content,
            tags,
            related_memories,
            created_at: now,
            updated_at: now,
        };

        this.articles.set(id, article);
        this.saveArticle(article);
        return article;
    }

    public getArticle(id: string): KnowledgeArticle | undefined {
        return this.articles.get(id);
    }

    public updateArticle(id: string, updates: Partial<KnowledgeArticle>): KnowledgeArticle | undefined {
        const article = this.articles.get(id);
        if (article) {
            const updatedArticle = { ...article, ...updates, updated_at: new Date().toISOString() };
            this.articles.set(id, updatedArticle);
            this.saveArticle(updatedArticle);
            return updatedArticle;
        }
        return undefined;
    }

    public searchByTag(tag: string): KnowledgeArticle[] {
        return Array.from(this.articles.values()).filter(article => article.tags.includes(tag));
    }

    public searchByKeyword(keyword: string): KnowledgeArticle[] {
        const lowerCaseKeyword = keyword.toLowerCase();
        return Array.from(this.articles.values()).filter(article =>
            article.title.toLowerCase().includes(lowerCaseKeyword) ||
            article.summary.toLowerCase().includes(lowerCaseKeyword) ||
            article.content.toLowerCase().includes(lowerCaseKeyword)
        );
    }

    private generateId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
