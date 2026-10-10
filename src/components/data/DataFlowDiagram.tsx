// ── Auto mode data-flow diagram ────────────────────────────────────────────
// Static server-rendered SVG (no JS, no CLS): UI → /api/sparql → auto
// orchestrator → Wikidata core (QLever failover) + enrichment sources →
// merge with provenance → profile tabs.
//
// Layout rules: 4px grid, orthogonal connectors with 8px elbows, arrows drawn
// before the node masks, coral reserved for the two focal nodes (auto and
// merge). Colors come from the app theme tokens so both themes work.

export interface DataFlowDiagramLabels {
  ui: string
  uiSub: string
  apiSub: string
  autoSub: string
  coreSub: string
  enrich: string
  enrichSub: string
  merge: string
  mergeSub: string
  tabs: string
  tabsSub: string
}

interface DataFlowDiagramProps {
  /** Accessible name; rendered as the SVG <title>. */
  title: string
  /** Accessible description; rendered as the SVG <desc>. */
  desc: string
  labels: DataFlowDiagramLabels
}

interface NodeSpec {
  x: number
  y: number
  w: number
  tag: string
  tagWidth: number
  name: string
  sub?: string
  variant?: "default" | "focal"
}

const NODE_H = 56

export function DataFlowDiagram({ title, desc, labels }: DataFlowDiagramProps) {
  const nodes: NodeSpec[] = [
    {
      x: 220,
      y: 16,
      w: 280,
      tag: "UI",
      tagWidth: 28,
      name: labels.ui,
      sub: labels.uiSub,
    },
    {
      x: 180,
      y: 96,
      w: 360,
      tag: "API",
      tagWidth: 28,
      name: "POST /api/sparql",
      sub: labels.apiSub,
    },
    {
      x: 220,
      y: 176,
      w: 280,
      tag: "AUTO",
      tagWidth: 36,
      name: "Auto",
      sub: labels.autoSub,
      variant: "focal",
    },
    {
      x: 48,
      y: 256,
      w: 280,
      tag: "CORE",
      tagWidth: 36,
      name: "Wikidata",
      sub: labels.coreSub,
    },
    {
      x: 372,
      y: 256,
      w: 300,
      tag: "REST",
      tagWidth: 28,
      name: labels.enrich,
      sub: labels.enrichSub,
    },
    {
      x: 180,
      y: 336,
      w: 360,
      tag: "MERGE",
      tagWidth: 44,
      name: labels.merge,
      sub: labels.mergeSub,
      variant: "focal",
    },
    {
      x: 180,
      y: 416,
      w: 360,
      tag: "UI",
      tagWidth: 28,
      name: labels.tabs,
      sub: labels.tabsSub,
    },
  ]

  return (
    <svg
      role='img'
      aria-labelledby='data-flow-title data-flow-desc'
      viewBox='0 0 720 488'
      className='h-auto w-full min-w-[640px] font-sans'
    >
      <title id='data-flow-title'>{title}</title>
      <desc id='data-flow-desc'>{desc}</desc>
      <defs>
        <marker
          id='data-flow-arrow'
          markerWidth='8'
          markerHeight='6'
          refX='7'
          refY='3'
          orient='auto'
        >
          <polygon points='0 0, 8 3, 0 6' className='fill-muted' />
        </marker>
      </defs>

      {/* Connectors first, so the node masks cover the joints. */}
      <g className='fill-none stroke-muted' strokeWidth={1}>
        <path markerEnd='url(#data-flow-arrow)' d='M360 72 V96' />
        <path markerEnd='url(#data-flow-arrow)' d='M360 152 V176' />
        <path
          markerEnd='url(#data-flow-arrow)'
          d='M300 232 V236 Q300 244 292 244 H196 Q188 244 188 252 V256'
        />
        <path
          markerEnd='url(#data-flow-arrow)'
          d='M420 232 V236 Q420 244 428 244 H514 Q522 244 522 252 V256'
        />
        <path
          markerEnd='url(#data-flow-arrow)'
          d='M188 312 V316 Q188 324 196 324 H292 Q300 324 300 332 V336'
        />
        <path
          markerEnd='url(#data-flow-arrow)'
          d='M522 312 V316 Q522 324 514 324 H428 Q420 324 420 332 V336'
        />
        <path markerEnd='url(#data-flow-arrow)' d='M360 392 V416' />
      </g>

      {nodes.map((node) => {
        const isFocal = node.variant === "focal"
        const centerX = node.x + node.w / 2
        const boxClass = isFocal
          ? "fill-accent-soft stroke-accent"
          : "fill-surface stroke-border"
        const tagBoxClass = isFocal
          ? "fill-none stroke-accent/60"
          : "fill-none stroke-border"
        const tagTextClass = isFocal ? "fill-accent" : "fill-muted"

        return (
          <g key={`${node.tag}-${node.y}`}>
            {/* Opaque mask: keeps connectors from bleeding through. */}
            <rect
              x={node.x}
              y={node.y}
              width={node.w}
              height={NODE_H}
              rx={6}
              className='fill-surface'
            />
            <rect
              x={node.x}
              y={node.y}
              width={node.w}
              height={NODE_H}
              rx={6}
              strokeWidth={1}
              className={boxClass}
            />
            <rect
              x={node.x + 8}
              y={node.y + 6}
              width={node.tagWidth}
              height={12}
              rx={2}
              strokeWidth={0.8}
              className={tagBoxClass}
            />
            <text
              x={node.x + 8 + node.tagWidth / 2}
              y={node.y + 15}
              textAnchor='middle'
              className={`${tagTextClass} text-[7px] tracking-[0.08em]`}
            >
              {node.tag}
            </text>
            <text
              x={centerX}
              y={node.y + 36}
              textAnchor='middle'
              className='fill-foreground text-[12px] font-bold'
            >
              {node.name}
            </text>
            {node.sub ? (
              <text
                x={centerX}
                y={node.y + 48}
                textAnchor='middle'
                className='fill-muted text-[9px]'
              >
                {node.sub}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
