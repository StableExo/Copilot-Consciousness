"""
Codex Manager - LlamaIndex-based Documentation System

Integrated from AxionCitadel for AI learning and context management.
This script manages the knowledge base for the arbitrage bot, enabling
AI-powered documentation search and learning.

Features:
- Document indexing with LlamaIndex
- Semantic search over codebase
- Context extraction for AI learning
- Documentation generation

Note: This is a placeholder implementation. Full LlamaIndex integration
requires additional dependencies (llama-index, langchain).
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Optional
import sys


class CodexManager:
    """Manages documentation and knowledge base for AI learning"""
    
    def __init__(self, project_root: Optional[Path] = None):
        """
        Initialize the CodexManager
        
        Args:
            project_root: Root directory of the project
        """
        if project_root is None:
            project_root = Path(__file__).parent.parent
        
        self.project_root = Path(project_root)
        self.docs_dir = self.project_root / "docs"
        self.src_dir = self.project_root / "src"
        self.index_file = self.project_root / ".memory" / "codex_index.json"
        
        # Ensure directories exist
        self.docs_dir.mkdir(exist_ok=True)
        (self.project_root / ".memory").mkdir(exist_ok=True)
        
        # Initialize index
        self.index = self._load_index()
    
    def _load_index(self) -> Dict:
        """Load the documentation index"""
        if self.index_file.exists():
            with open(self.index_file, 'r') as f:
                return json.load(f)
        return {"documents": [], "metadata": {}}
    
    def _save_index(self):
        """Save the documentation index"""
        with open(self.index_file, 'w') as f:
            json.dump(self.index, f, indent=2)
    
    def index_documents(self, paths: Optional[List[Path]] = None):
        """
        Index documentation files for search
        
        Args:
            paths: List of paths to index. If None, indexes all docs
        """
        if paths is None:
            paths = list(self.docs_dir.glob("**/*.md"))
        
        print(f"Indexing {len(paths)} documents...")
        
        for path in paths:
            if not path.exists():
                continue
            
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Create document entry
            doc_entry = {
                "path": str(path.relative_to(self.project_root)),
                "title": path.stem,
                "size": len(content),
                "lines": len(content.split('\n'))
            }
            
            # Update or add document
            existing = next(
                (i for i, d in enumerate(self.index["documents"]) 
                 if d["path"] == doc_entry["path"]),
                None
            )
            
            if existing is not None:
                self.index["documents"][existing] = doc_entry
            else:
                self.index["documents"].append(doc_entry)
        
        self._save_index()
        print(f"Indexed {len(self.index['documents'])} documents")
    
    def search_documentation(self, query: str) -> List[Dict]:
        """
        Search documentation for relevant content
        
        Args:
            query: Search query
            
        Returns:
            List of matching documents
        """
        # Simple keyword search (real implementation would use semantic search)
        query_lower = query.lower()
        results = []
        
        for doc in self.index["documents"]:
            doc_path = self.project_root / doc["path"]
            if not doc_path.exists():
                continue
            
            with open(doc_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if query_lower in content.lower():
                results.append({
                    "path": doc["path"],
                    "title": doc["title"],
                    "relevance": content.lower().count(query_lower)
                })
        
        # Sort by relevance
        results.sort(key=lambda x: x["relevance"], reverse=True)
        return results
    
    def extract_context(self, topic: str, max_chars: int = 5000) -> str:
        """
        Extract context about a specific topic from the knowledge base
        
        Args:
            topic: Topic to extract context for
            max_chars: Maximum characters to return
            
        Returns:
            Extracted context as string
        """
        results = self.search_documentation(topic)
        
        if not results:
            return f"No documentation found for topic: {topic}"
        
        context_parts = []
        total_chars = 0
        
        for result in results[:3]:  # Top 3 results
            doc_path = self.project_root / result["path"]
            with open(doc_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add document header
            header = f"\n## From {result['title']}\n\n"
            context_parts.append(header)
            total_chars += len(header)
            
            # Add relevant snippet
            remaining = max_chars - total_chars
            if remaining > 0:
                snippet = content[:remaining]
                context_parts.append(snippet)
                total_chars += len(snippet)
            
            if total_chars >= max_chars:
                break
        
        return "".join(context_parts)
    
    def generate_summary(self) -> Dict:
        """
        Generate a summary of the knowledge base
        
        Returns:
            Summary statistics
        """
        total_docs = len(self.index["documents"])
        total_size = sum(d["size"] for d in self.index["documents"])
        total_lines = sum(d["lines"] for d in self.index["documents"])
        
        return {
            "total_documents": total_docs,
            "total_size_bytes": total_size,
            "total_lines": total_lines,
            "documents": self.index["documents"]
        }
    
    def list_topics(self) -> List[str]:
        """
        List all available topics in the knowledge base
        
        Returns:
            List of topic titles
        """
        return [doc["title"] for doc in self.index["documents"]]


def main():
    """CLI interface for CodexManager"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Codex Manager - Documentation and Knowledge Base Management"
    )
    parser.add_argument(
        "command",
        choices=["index", "search", "summary", "topics"],
        help="Command to execute"
    )
    parser.add_argument(
        "--query",
        help="Search query (for search command)"
    )
    parser.add_argument(
        "--path",
        help="Path to project root",
        default=None
    )
    
    args = parser.parse_args()
    
    # Initialize manager
    codex = CodexManager(project_root=args.path)
    
    if args.command == "index":
        print("Indexing documentation...")
        codex.index_documents()
        print("Indexing complete!")
    
    elif args.command == "search":
        if not args.query:
            print("Error: --query required for search command")
            sys.exit(1)
        
        print(f"Searching for: {args.query}")
        results = codex.search_documentation(args.query)
        
        if results:
            print(f"\nFound {len(results)} results:\n")
            for i, result in enumerate(results[:10], 1):
                print(f"{i}. {result['title']} ({result['path']})")
                print(f"   Relevance: {result['relevance']} matches\n")
        else:
            print("No results found.")
    
    elif args.command == "summary":
        summary = codex.generate_summary()
        print("\nKnowledge Base Summary:")
        print(f"  Total Documents: {summary['total_documents']}")
        print(f"  Total Size: {summary['total_size_bytes']:,} bytes")
        print(f"  Total Lines: {summary['total_lines']:,}")
    
    elif args.command == "topics":
        topics = codex.list_topics()
        print("\nAvailable Topics:")
        for topic in topics:
            print(f"  - {topic}")


if __name__ == "__main__":
    main()
