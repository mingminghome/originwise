import type { CheckResult } from '../core/types';
import type { TFunction } from '../core/i18n';

type Graph = NonNullable<CheckResult['graph']>;
type GNode = Graph['nodes'][number];
type GEdge = Graph['edges'][number];

/**
 * Hierarchical SVG relation graph: product → company → parents / places.
 * Edges are labeled so relationships are readable (not only circles).
 */
export function RelationGraph({
  graph,
  t,
}: {
  graph: Graph;
  t: TFunction;
}) {
  const nodes = graph.nodes.slice(0, 12);
  const edges = graph.edges.slice(0, 20);
  if (!nodes.length) return null;

  const w = 360;
  const h = Math.max(220, 88 + nodes.length * 36);
  const pos = layoutNodes(nodes, w, h);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edgeRows = edges
    .map((e) => {
      const from = nodeById.get(e.from);
      const to = nodeById.get(e.to);
      if (!from || !to) return null;
      return { e, from, to };
    })
    .filter((x): x is { e: GEdge; from: GNode; to: GNode } => Boolean(x));

  return (
    <div className="relation-graph">
      <h3 className="result-section-title">{t('check.graphTitle')}</h3>
      <p className="muted relation-graph-hint">{t('check.graphHint')}</p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        role="img"
        aria-label={t('check.graphTitle')}
        className="relation-graph-svg"
      >
        <defs>
          <marker
            id="graph-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L6,3 L0,6 Z" className="graph-arrow-head" />
          </marker>
          <marker
            id="graph-arrow-cn"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L6,3 L0,6 Z" className="graph-arrow-head graph-arrow-head--cn" />
          </marker>
        </defs>

        {edgeRows.map(({ e, from, to }, i) => {
          const a = pos.get(from.id)!;
          const b = pos.get(to.id)!;
          // Shorten line so arrow tip sits on node rim
          const { x1, y1, x2, y2 } = shortenLine(a.x, a.y, b.x, b.y, 22, 22);
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const label = edgeLabel(e, t);
          const cn = Boolean(e.chinaRelated);
          return (
            <g key={`${e.from}-${e.to}-${i}`} className="graph-edge-group">
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={cn ? 'graph-edge graph-edge--cn' : 'graph-edge'}
                markerEnd={cn ? 'url(#graph-arrow-cn)' : 'url(#graph-arrow)'}
              />
              {label ? (
                <g transform={`translate(${mx}, ${my})`}>
                  <rect
                    x={-Math.min(56, label.length * 3.2) - 4}
                    y={-9}
                    width={Math.min(112, label.length * 6.4) + 8}
                    height={16}
                    rx={4}
                    className={
                      cn
                        ? 'graph-edge-label-bg graph-edge-label-bg--cn'
                        : 'graph-edge-label-bg'
                    }
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    y={0}
                    className={
                      cn
                        ? 'graph-edge-label graph-edge-label--cn'
                        : 'graph-edge-label'
                    }
                  >
                    {label.slice(0, 22)}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}

        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const label = (n.label || n.id).slice(0, 18);
          const cn = Boolean(n.chinaRelated);
          return (
            <g key={n.id} className="graph-node-group">
              <circle
                cx={p.x}
                cy={p.y}
                r={20}
                className={cn ? 'graph-node graph-node--cn' : 'graph-node'}
              />
              <text
                x={p.x}
                y={p.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="graph-node-kind"
              >
                {kindGlyph(n.kind)}
              </text>
              <text
                x={p.x}
                y={p.y + 34}
                textAnchor="middle"
                className="graph-label"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {edgeRows.length ? (
        <ul className="graph-rel-list" aria-label={t('check.graphRelations')}>
          {edgeRows.map(({ e, from, to }, i) => (
            <li key={`rel-${e.from}-${e.to}-${i}`}>
              <span className="graph-rel-from">{from.label || from.id}</span>
              <span className="graph-rel-arrow" aria-hidden>
                →
              </span>
              <span className="graph-rel-to">{to.label || to.id}</span>
              <span className="graph-rel-via muted">
                ({edgeLabel(e, t) || e.type || 'link'}
                {e.chinaRelated ? ` · ${t('check.graphChinaLinked')}` : ''})
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted graph-rel-empty">{t('check.graphNoEdges')}</p>
      )}

      <p className="muted graph-legend">
        <span className="graph-legend-swatch graph-legend-swatch--cn" />
        {t('check.graphLegendCn')}
        <span className="graph-legend-swatch" />
        {t('check.graphLegendOther')}
      </p>
    </div>
  );
}

function kindGlyph(kind?: string): string {
  const k = (kind || '').toLowerCase();
  if (k === 'product') return 'P';
  if (k === 'company') return 'C';
  if (k === 'parent') return '↑';
  if (k === 'place' || k === 'region') return '◎';
  return '·';
}

function edgeLabel(e: GEdge, t: TFunction): string {
  const raw = (e.label || e.type || '').trim();
  if (!raw) return t('check.graphLink');
  const key = `check.graphEdge.${raw.toLowerCase().replace(/[\s/]+/g, '_')}`;
  const localized = t(key);
  if (localized !== key) return localized;
  return raw;
}

/** Layered layout: product top → company → parents/places bottom. */
function layoutNodes(
  nodes: GNode[],
  w: number,
  h: number
): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const byKind = (k: string) =>
    nodes.filter((n) => (n.kind || '').toLowerCase() === k);
  const products = byKind('product');
  const companies = byKind('company');
  const parents = byKind('parent');
  const places = [
    ...byKind('place'),
    ...byKind('region'),
    ...nodes.filter(
      (n) =>
        !['product', 'company', 'parent', 'place', 'region'].includes(
          (n.kind || '').toLowerCase()
        )
    ),
  ];

  const layers: GNode[][] = [];
  if (products.length) layers.push(products);
  if (companies.length) layers.push(companies);
  const bottom = [...parents, ...places];
  if (bottom.length) layers.push(bottom);
  // Fallback: single row if kinds missing
  if (!layers.length) layers.push(nodes);

  const used = new Set<string>();
  layers.forEach((layer, li) => {
    const y = layers.length === 1 ? h / 2 : 48 + (li * (h - 80)) / Math.max(layers.length - 1, 1);
    layer.forEach((n, i) => {
      const x =
        layer.length === 1
          ? w / 2
          : 48 + (i * (w - 96)) / Math.max(layer.length - 1, 1);
      pos.set(n.id, { x, y });
      used.add(n.id);
    });
  });
  // Any leftover nodes
  nodes.forEach((n, i) => {
    if (used.has(n.id)) return;
    pos.set(n.id, {
      x: 48 + ((i % 3) * (w - 96)) / 2,
      y: h - 40,
    });
  });
  return pos;
}

function shortenLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  trimStart: number,
  trimEnd: number
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: x1 + ux * trimStart,
    y1: y1 + uy * trimStart,
    x2: x2 - ux * trimEnd,
    y2: y2 - uy * trimEnd,
  };
}
