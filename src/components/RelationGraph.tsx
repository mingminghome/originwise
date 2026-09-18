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
 * Hierarchical SVG relation graph: product → parts → company → parents / places.
 * Pill nodes, curved edges, expand + zoom for small screens.
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

  const nodes = useMemo(() => graph.nodes.slice(0, 24), [graph.nodes]);
  const edges = useMemo(() => graph.edges.slice(0, 36), [graph.edges]);

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
            const fromBox = nodeBox(from, a, expanded);
            const toBox = nodeBox(to, b, expanded);
            const { x1, y1, x2, y2 } = boxConnect(fromBox, toBox);
            const curve = curvedPath(x1, y1, x2, y2, i);
            const label = edgeLabel(e, t);
            const cn = Boolean(e.chinaRelated);
            const labelW = Math.min(130, Math.max(40, label.length * 6.4));
            return (
              <g key={`${e.from}-${e.to}-${i}`} className="graph-edge-group">
                <path
                  d={curve.d}
                  fill="none"
                  className={cn ? 'graph-edge graph-edge--cn' : 'graph-edge'}
                  markerEnd={
                    cn ? `url(#${markerCn})` : `url(#${markerNormal})`
                  }
                />
                {label ? (
                  <g transform={`translate(${curve.mx}, ${curve.my})`}>
                    <rect
                      x={-labelW / 2 - 4}
                      y={-9}
                      width={labelW + 8}
                      height={18}
                      rx={9}
                      className={
                        cn
                          ? 'graph-edge-label-bg graph-edge-label-bg--cn'
                          : 'graph-edge-label-bg'
                      }
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      y={0.5}
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
            const box = nodeBox(n, p, expanded);
            const cn = Boolean(n.chinaRelated);
            const kind = kindCaption(n.kind, t);
            const label = (n.label || n.id).slice(0, expanded ? 32 : 22);
            return (
              <g key={n.id} className="graph-node-group">
                <title>{`${n.label || n.id}${kind ? ` (${kind})` : ''}`}</title>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.w}
                  height={box.h}
                  rx={10}
                  className={
                    cn
                      ? `graph-node graph-node--cn graph-node--${nodeKindClass(n.kind)}`
                      : `graph-node graph-node--${nodeKindClass(n.kind)}`
                  }
                />
                <text
                  x={p.x}
                  y={p.y - 7}
                  textAnchor="middle"
                  className="graph-node-kind"
                >
                  {kind}
                </text>
                <text
                  x={p.x}
                  y={p.y + 9}
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
      w: Math.max(520, 400 + n * 22),
      h: Math.max(360, 140 + n * 56),
    };
  }
  return {
    w: Math.max(440, 360 + n * 16),
    h: Math.max(280, 120 + n * 48),
  };
}

function nodeKindClass(kind?: string): string {
  const k = (kind || '').toLowerCase();
  if (
    k === 'product' ||
    k === 'company' ||
    k === 'parent' ||
    k === 'place' ||
    k === 'region' ||
    k === 'part' ||
    k === 'spare' ||
    k === 'ingredient' ||
    k === 'component'
  ) {
    return k === 'region' ? 'place' : k;
  }
  return 'other';
}

function kindCaption(kind: string | undefined, t: TFunction): string {
  const k = (kind || '').toLowerCase();
  if (k === 'product') return t('check.productFacts');
  if (k === 'company') return t('check.companyFacts');
  if (k === 'parent') return t('check.parents');
  if (k === 'place' || k === 'region') return t('check.origin');
  if (k === 'part' || k === 'spare' || k === 'ingredient' || k === 'component') {
    return t(`check.partKind.${k}`);
  }
  return '';
}

type NodeBox = { x: number; y: number; w: number; h: number; cx: number; cy: number };

function nodeWidth(label: string, expanded: boolean): number {
  const cap = expanded ? 32 : 22;
  const shown = (label || '').slice(0, cap);
  return Math.min(expanded ? 168 : 148, Math.max(88, shown.length * 7.1 + 20));
}

function nodeBox(
  n: GNode,
  p: { x: number; y: number },
  expanded: boolean
): NodeBox {
  const w = nodeWidth(n.label || n.id, expanded);
  const h = expanded ? 44 : 40;
  return { x: p.x - w / 2, y: p.y - h / 2, w, h, cx: p.x, cy: p.y };
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
  const parts = nodes.filter((n) =>
    ['part', 'spare', 'ingredient', 'component'].includes(
      (n.kind || '').toLowerCase()
    )
  );
  const places = [...byKind('place'), ...byKind('region')];
  const known = new Set(
    [...products, ...companies, ...parents, ...parts, ...places].map((n) => n.id)
  );
  const other = nodes.filter((n) => !known.has(n.id));

  const layers: GNode[][] = [];
  if (products.length) layers.push(products);
  if (parts.length) layers.push(parts);
  if (companies.length) layers.push(companies);
  if (parents.length) layers.push(parents);
  if (places.length) layers.push(places);
  if (other.length) layers.push(other);
  if (!layers.length) layers.push(nodes);

  const padX = 72;
  const padY = 48;
  const used = new Set<string>();
  layers.forEach((layer, li) => {
    const y =
      layers.length === 1
        ? h / 2
        : padY + (li * (h - padY * 2)) / Math.max(layers.length - 1, 1);
    const gap = layer.length === 1 ? 0 : (w - padX * 2) / Math.max(layer.length - 1, 1);
    layer.forEach((n, i) => {
      const x = layer.length === 1 ? w / 2 : padX + i * gap;
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

/** Connect box bottoms/tops (or sides) so arrows meet the node, not the center. */
function boxConnect(
  from: NodeBox,
  to: NodeBox
): { x1: number; y1: number; x2: number; y2: number } {
  const down = to.cy >= from.cy;
  return {
    x1: from.cx,
    y1: down ? from.y + from.h : from.y,
    x2: to.cx,
    y2: down ? to.y : to.y + to.h,
  };
}

function curvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  index: number
): { d: string; mx: number; my: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bulge = ((index % 5) - 2) * 14;
  const cx = (x1 + x2) / 2 + nx * bulge;
  const cy = (y1 + y2) / 2 + ny * bulge;
  return {
    d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
    mx: (x1 + 2 * cx + x2) / 4,
    my: (y1 + 2 * cy + y2) / 4,
  };
}
