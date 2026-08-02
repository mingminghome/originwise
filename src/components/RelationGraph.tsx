import type { CheckResult } from '../core/types';
import type { TFunction } from '../core/i18n';

/**
 * Lightweight SVG force-ish layout for company relation graph (no deps).
 */
export function RelationGraph({
  graph,
  t,
}: {
  graph: NonNullable<CheckResult['graph']>;
  t: TFunction;
}) {
  const nodes = graph.nodes.slice(0, 12);
  const edges = graph.edges.slice(0, 20);
  if (!nodes.length) return null;

  const w = 320;
  const h = 200;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.32;

  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    pos.set(n.id, {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  });
  // Center first node slightly
  if (nodes[0]) {
    pos.set(nodes[0].id, { x: cx, y: cy });
  }

  return (
    <div className="relation-graph">
      <h3 className="result-section-title">{t('check.graphTitle')}</h3>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        role="img"
        aria-label={t('check.graphTitle')}
      >
        {edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.from}-${e.to}-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={
                e.chinaRelated
                  ? 'graph-edge graph-edge--cn'
                  : 'graph-edge'
              }
            />
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          return (
            <g key={n.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={18}
                className={
                  n.chinaRelated
                    ? 'graph-node graph-node--cn'
                    : 'graph-node'
                }
              />
              <text
                x={p.x}
                y={p.y + 32}
                textAnchor="middle"
                className="graph-label"
              >
                {(n.label || n.id).slice(0, 14)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
