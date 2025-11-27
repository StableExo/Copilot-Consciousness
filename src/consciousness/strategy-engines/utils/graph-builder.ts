/**
 * Graph Builder Utility
 *
 * Utilities for building and manipulating graphs from problem spaces.
 */

import { Node, Transition, ProblemSpace } from '../types/problem-space';

/**
 * Graph edge representation
 */
export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  data?: Transition;
}

/**
 * Graph representation
 */
export interface Graph {
  nodes: Map<string, Node>;
  adjacencyList: Map<string, GraphEdge[]>;
  edgeCount: number;
}

/**
 * Build graph from problem space
 */
export function buildGraph(space: ProblemSpace): Graph {
  const graph: Graph = {
    nodes: new Map(),
    adjacencyList: new Map(),
    edgeCount: 0,
  };

  // Add nodes
  for (const node of space.nodes) {
    graph.nodes.set(node.id, node);
    graph.adjacencyList.set(node.id, []);
  }

  // Add edges from transitions
  if (space.transitions) {
    for (const transition of space.transitions) {
      addEdge(graph, transition.from, transition.to, transition.cost, transition);
    }
  }

  // Add edges from node connections
  for (const node of space.nodes) {
    if (node.connections) {
      for (const targetId of node.connections) {
        if (graph.nodes.has(targetId)) {
          addEdge(graph, node.id, targetId, 1.0);
        }
      }
    }
  }

  return graph;
}

/**
 * Add edge to graph
 */
export function addEdge(
  graph: Graph,
  from: string,
  to: string,
  weight: number,
  data?: Transition
): void {
  if (!graph.adjacencyList.has(from)) {
    graph.adjacencyList.set(from, []);
  }

  const edges = graph.adjacencyList.get(from)!;

  // Check if edge already exists
  const existingEdge = edges.find((e) => e.to === to);
  if (existingEdge) {
    existingEdge.weight = weight;
    if (data) existingEdge.data = data;
  } else {
    edges.push({ from, to, weight, data });
    graph.edgeCount++;
  }
}

/**
 * Get neighbors of a node
 */
export function getNeighbors(graph: Graph, nodeId: string): Node[] {
  const edges = graph.adjacencyList.get(nodeId) || [];
  return edges.map((edge) => graph.nodes.get(edge.to)!).filter((n) => n);
}

/**
 * Get outgoing edges from a node
 */
export function getOutgoingEdges(graph: Graph, nodeId: string): GraphEdge[] {
  return graph.adjacencyList.get(nodeId) || [];
}

/**
 * Check if there's a path between two nodes (BFS)
 */
export function hasPath(graph: Graph, from: string, to: string): boolean {
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) {
    return false;
  }

  const visited = new Set<string>();
  const queue: string[] = [from];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (current === to) return true;
    if (visited.has(current)) continue;

    visited.add(current);

    const edges = graph.adjacencyList.get(current) || [];
    for (const edge of edges) {
      if (!visited.has(edge.to)) {
        queue.push(edge.to);
      }
    }
  }

  return false;
}

/**
 * Find shortest path using Dijkstra's algorithm
 */
export function findShortestPath(
  graph: Graph,
  from: string,
  to: string
): { path: string[]; distance: number } | null {
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) {
    return null;
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set(graph.nodes.keys());

  // Initialize distances
  for (const nodeId of graph.nodes.keys()) {
    distances.set(nodeId, nodeId === from ? 0 : Infinity);
    previous.set(nodeId, null);
  }

  while (unvisited.size > 0) {
    // Find unvisited node with minimum distance
    let current: string | null = null;
    let minDist = Infinity;

    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId)!;
      if (dist < minDist) {
        minDist = dist;
        current = nodeId;
      }
    }

    if (current === null || minDist === Infinity) break;

    unvisited.delete(current);

    if (current === to) break;

    // Update distances to neighbors
    const edges = graph.adjacencyList.get(current) || [];
    for (const edge of edges) {
      if (!unvisited.has(edge.to)) continue;

      const alt = distances.get(current)! + edge.weight;
      if (alt < distances.get(edge.to)!) {
        distances.set(edge.to, alt);
        previous.set(edge.to, current);
      }
    }
  }

  // Reconstruct path
  if (distances.get(to) === Infinity) {
    return null;
  }

  const path: string[] = [];
  let current: string | null = to;

  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) || null;
  }

  return {
    path,
    distance: distances.get(to)!,
  };
}

/**
 * Detect cycles in graph using DFS
 */
export function detectCycle(graph: Graph): string[] | null {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string | undefined): boolean {
    if (!nodeId) return false;
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const edges = graph.adjacencyList.get(nodeId) || [];
    for (const edge of edges) {
      if (!visited.has(edge.to)) {
        if (dfs(edge.to)) return true;
      } else if (recStack.has(edge.to)) {
        // Found a cycle
        const cycleStart = path.indexOf(edge.to);
        return true;
      }
    }

    recStack.delete(nodeId);
    path.pop();
    return false;
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) {
        return path;
      }
    }
  }

  return null;
}

/**
 * Calculate graph connectivity (ratio of connected nodes)
 */
export function calculateConnectivity(graph: Graph): number {
  if (graph.nodes.size === 0) return 0;

  const visited = new Set<string>();
  const startNode = graph.nodes.keys().next().value;

  function dfs(nodeId: string | undefined) {
    if (!nodeId) return;
    visited.add(nodeId);
    const edges = graph.adjacencyList.get(nodeId) || [];
    for (const edge of edges) {
      if (!visited.has(edge.to)) {
        dfs(edge.to);
      }
    }
  }

  dfs(startNode);

  return visited.size / graph.nodes.size;
}
