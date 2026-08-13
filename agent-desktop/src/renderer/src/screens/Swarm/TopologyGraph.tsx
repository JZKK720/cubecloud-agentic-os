import { useState, useEffect, useRef, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────

interface TopologyNode {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "failed" | "terminated";
  isMain?: boolean;
}

interface TopologyEdge {
  from: string;
  to: string;
  active?: boolean;
}

interface TopologyGraphProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

// ── Status colors (matching existing Cubecloud palette) ───

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--warning)",
  running: "var(--accent-text)",
  done: "var(--success)",
  failed: "var(--error)",
  terminated: "var(--text-muted)",
};

const STATUS_RADIUS: Record<string, number> = {
  pending: 16,
  running: 20,
  done: 16,
  failed: 18,
  terminated: 14,
};

// ── Layout: ring layout (main at center, subagents in a ring) ─

interface PositionedNode extends TopologyNode {
  x: number;
  y: number;
}

function layoutNodes(
  nodes: TopologyNode[],
  width: number,
  height: number,
): PositionedNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const mainNode = nodes.find((n) => n.isMain);
  const subNodes = nodes.filter((n) => !n.isMain);

  const positioned: PositionedNode[] = [];

  if (mainNode) {
    positioned.push({ ...mainNode, x: cx, y: cy });
  }

  const ringRadius = Math.min(width, height) * 0.32;
  const angleStep = (2 * Math.PI) / Math.max(subNodes.length, 1);

  subNodes.forEach((node, i) => {
    const angle = angleStep * i - Math.PI / 2; // start from top
    positioned.push({
      ...node,
      x: cx + ringRadius * Math.cos(angle),
      y: cy + ringRadius * Math.sin(angle),
    });
  });

  return positioned;
}

// ── Component ─────────────────────────────────────────────

function TopologyGraph({
  nodes,
  edges,
}: TopologyGraphProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Animate edge flow for active connections
  useEffect(() => {
    const hasActive = edges.some((e) => e.active);
    if (!hasActive) return;
    const interval = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(interval);
  }, [edges]);

  const width = 400;
  const height = 300;

  const positionedNodes = useMemo(
    () => layoutNodes(nodes, width, height),
    [nodes],
  );

  const nodeMap = useMemo(
    () => new Map(positionedNodes.map((n) => [n.id, n])),
    [positionedNodes],
  );

  if (nodes.length === 0) {
    return (
      <div className="swarm-topology-empty">
        <svg width={width} height={height} className="swarm-topology-svg">
          <circle
            cx={width / 2}
            cy={height / 2}
            r={24}
            fill="none"
            stroke="var(--border-bright)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <text
            x={width / 2}
            y={height / 2 + 4}
            textAnchor="middle"
            fontSize={11}
            fill="var(--text-muted)"
          >
            Main
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className="swarm-topology-container">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="swarm-topology-svg"
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;

          const isHighlighted =
            hoveredNode === edge.from || hoveredNode === edge.to;

          return (
            <line
              key={`edge-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={edge.active ? "var(--accent)" : "var(--border-bright)"}
              strokeWidth={isHighlighted ? 2 : 1}
              strokeDasharray={edge.active ? "6 4" : undefined}
              strokeDashoffset={edge.active ? -(tick * 2) : undefined}
              opacity={
                hoveredNode && !isHighlighted ? 0.15 : isHighlighted ? 1 : 0.5
              }
              style={{
                transition:
                  "opacity 150ms ease-out, stroke-width 150ms ease-out",
              }}
            />
          );
        })}

        {/* Nodes */}
        {positionedNodes.map((node) => {
          const color = STATUS_COLORS[node.status] ?? "var(--text-muted)";
          const radius = STATUS_RADIUS[node.status] ?? 16;
          const isHovered = hoveredNode === node.id;
          const isDimmed = hoveredNode && !isHovered;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{
                cursor: "pointer",
                transition: "opacity 150ms ease-out",
                opacity: isDimmed ? 0.4 : 1,
              }}
            >
              {/* Pulse ring for running status */}
              {node.status === "running" && (
                <circle
                  r={radius + 6}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={0.4}
                  style={{
                    animation: "swarm-node-pulse 2s ease-in-out infinite",
                  }}
                />
              )}

              {/* Main node: larger with accent border */}
              {node.isMain && (
                <circle
                  r={radius + 3}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1}
                  opacity={0.3}
                />
              )}

              {/* Node circle */}
              <circle
                r={radius}
                fill={node.isMain ? "var(--accent)" : "var(--bg-elevated)"}
                stroke={color}
                strokeWidth={2}
                style={{
                  transition: "r 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              />

              {/* Status dot */}
              <circle r={4} cx={radius * 0.7} cy={-radius * 0.7} fill={color} />

              {/* Label */}
              <text
                y={radius + 14}
                textAnchor="middle"
                fontSize={10}
                fill="var(--text-secondary)"
                fontWeight={node.isMain ? 600 : 400}
              >
                {node.isMain
                  ? "Main"
                  : node.label.length > 12
                    ? node.label.slice(0, 10) + "…"
                    : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default TopologyGraph;
export type { TopologyNode, TopologyEdge, TopologyGraphProps };
