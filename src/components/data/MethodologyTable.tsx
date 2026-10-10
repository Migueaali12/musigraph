// ── Methodology table ──────────────────────────────────────────────────────
// Small presentational table shared by the Auto rules and API limits
// sections. Hairline borders, micro-label headers, horizontal scroll on
// narrow viewports (no CLS: the wrapper scrolls, the table keeps its width).

import type { ReactNode } from "react"

export interface MethodologyTableRow {
  key: string
  cells: ReactNode[]
}

interface MethodologyTableProps {
  /** Visually hidden description of the table for screen readers. */
  caption: string
  columns: string[]
  rows: MethodologyTableRow[]
}

const headerClass =
  "py-2.5 pr-5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted"

export function MethodologyTable({
  caption,
  columns,
  rows,
}: MethodologyTableProps) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[560px] border-collapse text-left text-[13px]'>
        <caption className='sr-only'>{caption}</caption>
        <thead>
          <tr className='border-b border-border'>
            {columns.map((column) => (
              <th key={column} scope='col' className={headerClass}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-border'>
          {rows.map((row) => (
            <tr key={row.key} className='align-top'>
              {row.cells.map((cell, index) => (
                <td key={index} className='py-3 pr-5 leading-relaxed text-muted'>
                  {index === 0 ? (
                    <span className='font-bold text-foreground'>{cell}</span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
