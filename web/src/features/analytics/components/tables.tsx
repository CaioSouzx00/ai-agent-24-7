import type { ReactNode } from 'react'
import type { ConversationRow, TicketRow } from '../schemas/analytics-schemas'
import { C, OUTCOME_COLORS, OUTCOME_LABELS, REASON_LABELS, fmtDateTime, fmtDuration } from '../lib/format'

const STATUS_COLOR: Record<string, string> = { open: C.warn, claimed: C.cyan, resolved: C.accent }

function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th
      className={`sticky top-0 z-10 border-b border-[#1C1C24] bg-[#0A0A0E] px-2 py-1.5 font-mono text-[9px] font-normal uppercase tracking-[0.16em] text-[#6B6B7C] ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function Td({ children, right, mono = true, title }: { children: ReactNode; right?: boolean; mono?: boolean; title?: string }) {
  return (
    <td
      title={title}
      className={`whitespace-nowrap border-b border-[#121218] px-2 py-1.5 text-[11px] text-[#F4F4F8] ${mono ? 'font-mono' : ''} ${
        right ? 'text-right tabular-nums' : ''
      }`}
    >
      {children}
    </td>
  )
}

function Tag({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase" style={{ color }}>
      <span className="h-1.5 w-1.5" style={{ background: color }} />
      {children}
    </span>
  )
}

/** Wait time colored by SLA buckets (≤2m ok, ≤10m warn, >10m breach). */
function WaitCell({ seconds }: { seconds: number | null }) {
  const color = seconds === null ? C.muted : seconds > 600 ? C.error : seconds > 120 ? C.warn : C.text
  return <span style={{ color }}>{fmtDuration(seconds)}</span>
}

export function TicketsTable({ rows, reasonFilter }: { rows: TicketRow[]; reasonFilter: string | null }) {
  const items = reasonFilter ? rows.filter((r) => r.reason === reasonFilter) : rows
  return (
    <div className="max-h-[300px] overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>STATUS</Th>
            <Th>CANAL</Th>
            <Th>MOTIVO</Th>
            <Th>CRIADO</Th>
            <Th right>ESPERA</Th>
            <Th right>RESOLUÇÃO</Th>
            <Th>OPERADOR</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className="hover:bg-[#121218]">
              <Td title={t.session_id}>{t.id}</Td>
              <Td>
                <Tag color={STATUS_COLOR[t.status] ?? C.muted}>{t.status}</Tag>
              </Td>
              <Td>{t.channel}</Td>
              <Td title={t.reason_text}>{REASON_LABELS[t.reason] ?? t.reason}</Td>
              <Td>{fmtDateTime(t.created_at)}</Td>
              <Td right>
                <WaitCell seconds={t.wait_seconds} />
              </Td>
              <Td right>{fmtDuration(t.resolution_seconds)}</Td>
              <Td>{t.assignee ?? '—'}</Td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={8} className="py-8 text-center font-mono text-[10px] tracking-widest text-[#6B6B7C]">
                // NENHUM TICKET {reasonFilter ? `COM MOTIVO ${REASON_LABELS[reasonFilter] ?? reasonFilter}` : ''}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function ConversationsTable({
  rows,
  reasonFilter,
  onToolClick,
}: {
  rows: ConversationRow[]
  reasonFilter: string | null
  onToolClick: (tool: string) => void
}) {
  const items = reasonFilter ? rows.filter((r) => r.handoff_reason === reasonFilter) : rows
  return (
    <div className="max-h-[360px] overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>SESSÃO</Th>
            <Th>CANAL</Th>
            <Th>TENANT</Th>
            <Th right>TURNOS</Th>
            <Th right>DURAÇÃO</Th>
            <Th>TOOLS</Th>
            <Th>OUTCOME</Th>
            <Th>MOTIVO</Th>
            <Th>ÚLTIMA ATIVIDADE</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="hover:bg-[#121218]">
              <Td title={c.id}>
                {c.active && <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse bg-[#D4FF00]" />}
                {c.session_id.length > 18 ? `${c.session_id.slice(0, 18)}…` : c.session_id}
              </Td>
              <Td>{c.channel}</Td>
              <Td>{c.tenant_id}</Td>
              <Td right>{c.turns}</Td>
              <Td right>{fmtDuration(c.duration_seconds)}</Td>
              <Td>
                <span className="flex gap-1">
                  {c.tools_used.slice(0, 3).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onToolClick(t)}
                      className="border border-[#1C1C24] px-1 text-[9px] text-[#9E9EB2] hover:border-[#D4FF00] hover:text-[#D4FF00]"
                    >
                      {t}
                    </button>
                  ))}
                  {c.tools_used.length > 3 && <span className="text-[9px] text-[#6B6B7C]">+{c.tools_used.length - 3}</span>}
                  {!c.tools_used.length && <span className="text-[#32323E]">—</span>}
                </span>
              </Td>
              <Td>
                <Tag color={OUTCOME_COLORS[c.outcome] ?? C.muted}>{OUTCOME_LABELS[c.outcome] ?? c.outcome}</Tag>
              </Td>
              <Td>{c.handoff_reason ? (REASON_LABELS[c.handoff_reason] ?? c.handoff_reason) : '—'}</Td>
              <Td>{fmtDateTime(c.last_at)}</Td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={9} className="py-8 text-center font-mono text-[10px] tracking-widest text-[#6B6B7C]">
                // NENHUMA CONVERSA PARA OS FILTROS ATUAIS
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

