import { useId, useMemo, useState } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import type { CheckResult } from '../core/types';
import type { TFunction } from '../core/i18n';

type Graph = NonNullable<CheckResult['graph']>;
type GNode = Graph['nodes'][number];
type GEdge = Graph['edges'][number];

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 1.75;
const ZOOM_STEP = 0.25;

/**
 * Hierarchical SVG relation graph: product → company → parents / places.
 * Expand + zoom so labels/edges stay readable on small screens.
 */
export function RelationGraph({
  graph,
  t,
}: {
  graph: Graph;
  t: TFunction;
}) {
  const uid = useId().replace(/:/g, '');
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);

  const nodes = useMemo(() => graph.nodes.slice(0, 12), [graph.nodes]);
  const edges = useMemo(() => graph.edges.slice(0, 20), [graph.edges]);

  const { w, h } = useMemo(
    () => graphCanvasSize(nodes.length, expanded),
    [nodes.length, expanded]
  );
  const pos = useMemo(
    () => (nodes.length ? layoutNodes(nodes, w, h) : new Map()),
    [nodes, w, h]
  );

  const edgeRows = useMemo(() => {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    return edges
      .map((e) => {
        const from = nodeById.get(e.from);
        const to = nodeById.get(e.to);
        if (!from || !to) return null;
        return { e, from, to };
      })
      .filter((x): x is { e: GEdge; from: GNode; to: GNode } => Boolean(x));
  }, [nodes, edges]);

  const displayH = Math.round(h * zoom);
  const markerNormal = `graph-arrow-${uid}`;
  const markerCn = `graph-arrow-cn-${uid}`;

  const zoomIn = () =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  const zoomOut = () =>
    setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  const toggleExpand = () => {
    setExpanded((e) => {
      const next = !e;
      // Expanding often needs a bit more zoom; collapsing resets
      if (next) setZoom((z) => Math.max(z, 1.1));
      else setZoom(1);
      return next;
    });
  };

  if (!nodes.length) return null;

  return (
    <div
      className={
        expanded
          ? 'relation-graph relation-graph--expanded'
          : 'relation-graph'
      }
    >
      <div className="relation-graph-head">
        <div>
          <h3 className="result-section-title">{t('check.graphTitle')}</h3>
          <p className="muted relation-graph-hint">{t('check.graphHint')}</p>
        </div>
        <div className="relation-graph-toolbar" role="toolbar" aria-label={t('check.graphControls')}>
          <button
            type="button"
            className="graph-tool-btn"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            aria-label={t('check.graphZoomOut')}
            title={t('check.graphZoomOut')}
          >
            <ZoomOut size={16} />
          </button>
          <span className="graph-zoom-label muted" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="graph-tool-btn"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            aria-label={t('check.graphZoomIn')}
            title={t('check.graphZoomIn')}
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            className="graph-tool-btn graph-tool-btn--expand"
            onClick={toggleExpand}
            aria-pressed={expanded}
            aria-label={
              expanded ? t('check.graphCollapse') : t('check.graphExpand')
            }
            title={
              expanded ? t('check.graphCollapse') : t('check.graphExpand')
            }
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span className="graph-tool-btn-text">
              {expanded ? t('check.graphCollapse') : t('check.graphExpand')}
            </span>
          </button>
        </div>
      </div>

      <div className="relation-graph-viewport">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height={displayH}
          role="img"
          aria-label={t('check.graphTitle')}
          className="relation-graph-svg"
        >
          <defs>
            <marker
              id={markerNormal}
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
              id={markerCn}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path
                d="M0,0 L6,3 L0,6 Z"
                className="graph-arrow-head graph-arrow-head--cn"
              />
            </marker>
          </defs>

          {edgeRows.map(({ e, from, to }, i) => {
            const a = pos.get(from.id)!;
            const b = pos.get(to.id)!;
            const { x1, y1, x2, y2 } = shortenLine(a.x, a.y, b.x, b.y, 24, 24);
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const label = edgeLabel(e, t);
            const cn = Boolean(e.chinaRelated);
            const labelW = Math.min(120, Math.max(36, label.length * 6.2));
            return (
              <g key={`${e.from}-${e.to}-${i}`} className="graph-edge-group">
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={cn ? 'graph-edge graph-edge--cn' : 'graph-edge'}
                  markerEnd={
                    cn ? `url(#${markerCn})` : `url(#${markerNormal})`
                  }
                />
                {label ? (
                  <g transform={`translate(${mx}, ${my})`}>
                    <rect
                      x={-labelW / 2 - 4}
                      y={-10}
                      width={labelW + 8}
                      height={18}
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
                      {label.slice(0, 24)}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          {nodes.map((n) => {
            const p = pos.get(n.id)!;
            const label = (n.label || n.id).slice(0, expanded ? 28 : 20);
            const cn = Boolean(n.chinaRelated);
            return (
              <g key={n.id} className="graph-node-group">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={expanded ? 22 : 20}
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
                  y={p.y + (expanded ? 38 : 36)}
                  textAnchor="middle"
                  className="graph-label"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

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

function graphCanvasSize(
  nodeCount: number,
  expanded: boolean
): { w: number; h: number } {
  const n = Math.max(1, nodeCount);
  if (expanded) {
    return {
      w: Math.max(420, 360 + n * 18),
      h: Math.max(320, 120 + n * 52),
    };
  }
  return {
    w: Math.max(380, 320 + n * 12),
    h: Math.max(260, 100 + n * 44),
  };
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
  // Keep parents and places on separate rows when both exist (less crowding)
  if (parents.length) layers.push(parents);
  if (places.length) layers.push(places);
  if (!layers.length) layers.push(nodes);

  const padX = 56;
  const padY = 52;
  const used = new Set<string>();
  layers.forEach((layer, li) => {
    const y =
      layers.length === 1
        ? h / 2
        : padY + (li * (h - padY * 2)) / Math.max(layers.length - 1, 1);
    layer.forEach((n, i) => {
      const x =
        layer.length === 1
          ? w / 2
          : padX + (i * (w - padX * 2)) / Math.max(layer.length - 1, 1);
      pos.set(n.id, { x, y });
      used.add(n.id);
    });
  });
  nodes.forEach((n, i) => {
    if (used.has(n.id)) return;
    pos.set(n.id, {
      x: padX + ((i % 3) * (w - padX * 2)) / 2,
      y: h - padY,
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
