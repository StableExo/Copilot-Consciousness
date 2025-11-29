// tests/unit/consciousness/knowledge-base.test.ts

import { KnowledgeBase } from '../../../consciousness/knowledge-base/knowledge-base';
import * as fs from 'fs';
import * as path from 'path';

const KB_DIR = path.join(__dirname, '../../../.memory/knowledge_base');

describe('KnowledgeBase', () => {
    beforeEach(() => {
        if (fs.existsSync(KB_DIR)) {
            fs.rmSync(KB_DIR, { recursive: true, force: true });
        }
    });

    it('should create a new knowledge base directory', () => {
        new KnowledgeBase();
        expect(fs.existsSync(KB_DIR)).toBe(true);
    });

    it('should create a new article', () => {
        const kb = new KnowledgeBase();
        const article = kb.createArticle('test title', 'test summary', 'test content');
        expect(article).toBeDefined();
        expect(article.title).toBe('test title');
        const articlePath = path.join(KB_DIR, `${article.id}.json`);
        expect(fs.existsSync(articlePath)).toBe(true);
    });

    it('should get an article', () => {
        const kb = new KnowledgeBase();
        const article = kb.createArticle('test title', 'test summary', 'test content');
        const retrievedArticle = kb.getArticle(article.id);
        expect(retrievedArticle).toEqual(article);
    });

    it('should update an article', () => {
        const kb = new KnowledgeBase();
        const article = kb.createArticle('test title', 'test summary', 'test content');
        const updatedArticle = kb.updateArticle(article.id, { title: 'new title' });
        expect(updatedArticle.title).toBe('new title');
        const retrievedArticle = kb.getArticle(article.id);
        expect(retrievedArticle.title).toBe('new title');
    });

    it('should search by tag', () => {
        const kb = new KnowledgeBase();
        kb.createArticle('test title 1', 'test summary 1', 'test content 1', ['tag1']);
        kb.createArticle('test title 2', 'test summary 2', 'test content 2', ['tag2']);
        kb.createArticle('test title 3', 'test summary 3', 'test content 3', ['tag1']);
        const results = kb.searchByTag('tag1');
        expect(results).toHaveLength(2);
    });

    it('should search by keyword', () => {
        const kb = new KnowledgeBase();
        kb.createArticle('test title 1', 'summary with keyword', 'test content 1');
        kb.createArticle('test title 2', 'test summary 2', 'test content 2');
        kb.createArticle('keyword in title', 'test summary 3', 'test content 3');
        const results = kb.searchByKeyword('keyword');
        expect(results).toHaveLength(2);
    });
});
