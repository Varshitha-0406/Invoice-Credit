import React, { useState } from 'react';
import {
  Database,
  Table,
  CheckCircle2,
  Clock,
  Terminal,
  Layers,
  Shield,
  FileText,
  CreditCard,
  ArrowRightLeft,
  Search,
} from 'lucide-react';
import { Invoice, CreditNote, OffsetRecord, SqlAuditLog } from '../types/domain';

interface JpaStoreExplorerProps {
  invoices: Invoice[];
  creditNotes: CreditNote[];
  offsets: OffsetRecord[];
  sqlLogs: SqlAuditLog[];
}

export const JpaStoreExplorer: React.FC<JpaStoreExplorerProps> = ({
  invoices,
  creditNotes,
  offsets,
  sqlLogs,
}) => {
  const [activeDatabase, setActiveDatabase] = useState<'invoice_db' | 'creditnote_db' | 'offset_db'>('invoice_db');
  const [searchTerm, setSearchTerm] = useState('');

  const dbMetadata = {
    invoice_db: {
      owner: 'INVOICE-SERVICE',
      port: 8081,
      datasource: 'jdbc:postgresql://postgres-invoice:5432/invoice_db',
      driver: 'org.postgresql.Driver',
      schema: 'invoices, invoice_lines, invoice_settlement_history',
      isolation: 'READ_COMMITTED',
      constraints: ['CHK_INVOICE_OPEN_BALANCE_NON_NEG (open_balance >= 0)', '@Version optimistic_lock'],
    },
    creditnote_db: {
      owner: 'CREDIT-NOTE-SERVICE',
      port: 8082,
      datasource: 'jdbc:postgresql://postgres-creditnote:5432/creditnote_db',
      driver: 'org.postgresql.Driver',
      schema: 'credit_notes, credit_lines',
      isolation: 'READ_COMMITTED',
      constraints: ['CHK_CREDIT_REMAINING_NON_NEG (remaining_amount >= 0)', '@Version optimistic_lock'],
    },
    offset_db: {
      owner: 'OFFSET-SERVICE',
      port: 8083,
      datasource: 'jdbc:postgresql://postgres-offset:5432/offset_db',
      driver: 'org.postgresql.Driver',
      schema: 'offset_settlement_ledger, offset_audit_events',
      isolation: 'SERIALIZABLE',
      constraints: ['CHK_OFFSET_AMOUNT_POSITIVE (offset_amount > 0)', 'UK_OFFSET_LEDGER_ID (PRIMARY KEY)'],
    },
  };

  const currentMeta = dbMetadata[activeDatabase];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Autonomous JPA Stores Explorer (B2: Database-per-Service)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict physical schema isolation. Zero cross-service foreign keys. All cross-boundary sync handled via Kafka events.
          </p>
        </div>

        {/* Database Switcher Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {(['invoice_db', 'creditnote_db', 'offset_db'] as const).map((db) => (
            <button
              key={db}
              onClick={() => setActiveDatabase(db)}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition ${
                activeDatabase === db
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {db}
            </button>
          ))}
        </div>
      </div>

      {/* Database Connection Specs */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <span className="text-slate-500 font-mono text-[10px] uppercase block">Owning Microservice</span>
          <span className="font-mono font-bold text-white text-sm">{currentMeta.owner} (Port {currentMeta.port})</span>
        </div>
        <div>
          <span className="text-slate-500 font-mono text-[10px] uppercase block">Datasource JDBC URL</span>
          <span className="font-mono text-emerald-400 text-xs">{currentMeta.datasource}</span>
        </div>
        <div>
          <span className="text-slate-500 font-mono text-[10px] uppercase block">Hibernate Constraints</span>
          <span className="font-mono text-indigo-300 text-xs">{currentMeta.constraints.join(', ')}</span>
        </div>
      </div>

      {/* Main Database Tables Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Table className="w-4 h-4 text-indigo-400" />
            <span>Entities & Table Records in: <code className="text-emerald-400 font-mono">{activeDatabase}</code></span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            JPA Repository: Spring Data JPA 3.3
          </span>
        </div>

        <div className="p-4 overflow-x-auto">
          {activeDatabase === 'invoice_db' && (
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-950/60 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">id (PK)</th>
                  <th className="px-3 py-2.5">supplier_id</th>
                  <th className="px-3 py-2.5">total_amount</th>
                  <th className="px-3 py-2.5">open_balance (Residual)</th>
                  <th className="px-3 py-2.5">status</th>
                  <th className="px-3 py-2.5">version (@Version)</th>
                  <th className="px-3 py-2.5">lines_count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2.5 font-bold text-white">{inv.id}</td>
                    <td className="px-3 py-2.5 text-slate-400">{inv.supplierId}</td>
                    <td className="px-3 py-2.5">${inv.totalAmount.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-bold text-amber-400">${inv.openBalance.toFixed(2)}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-slate-200">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-emerald-400">{inv.version}</td>
                    <td className="px-3 py-2.5 text-slate-400">{inv.lines.length} lines</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeDatabase === 'creditnote_db' && (
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-950/60 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">id (PK)</th>
                  <th className="px-3 py-2.5">supplier_id</th>
                  <th className="px-3 py-2.5">reason_code</th>
                  <th className="px-3 py-2.5">total_credit</th>
                  <th className="px-3 py-2.5">unallocated_amount</th>
                  <th className="px-3 py-2.5">status</th>
                  <th className="px-3 py-2.5">version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {creditNotes.map((cn) => (
                  <tr key={cn.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2.5 font-bold text-white">{cn.id}</td>
                    <td className="px-3 py-2.5 text-slate-400">{cn.supplierId}</td>
                    <td className="px-3 py-2.5 text-emerald-400">{cn.reasonCode}</td>
                    <td className="px-3 py-2.5">${cn.totalCredit.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-300">${cn.unallocatedAmount.toFixed(2)}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-slate-200">
                        {cn.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{cn.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeDatabase === 'offset_db' && (
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-950/60 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">offset_id (PK)</th>
                  <th className="px-3 py-2.5">credit_line_id</th>
                  <th className="px-3 py-2.5">invoice_line_id</th>
                  <th className="px-3 py-2.5">offset_amount</th>
                  <th className="px-3 py-2.5">residual_invoice_bal</th>
                  <th className="px-3 py-2.5">kafka_event_id</th>
                  <th className="px-3 py-2.5">applied_by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {offsets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500 font-sans">
                      No offset allocations committed yet. Apply matching from the Finance Operations Desk.
                    </td>
                  </tr>
                ) : (
                  offsets.map((off) => (
                    <tr key={off.id} className="hover:bg-slate-800/30">
                      <td className="px-3 py-2.5 font-bold text-indigo-400">{off.id}</td>
                      <td className="px-3 py-2.5 text-emerald-300">{off.creditLineId}</td>
                      <td className="px-3 py-2.5 text-blue-300">{off.invoiceLineId}</td>
                      <td className="px-3 py-2.5 font-bold text-white">${off.offsetAmount.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-amber-400">${off.residualInvoiceBalance.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-slate-500">{off.kafkaEventId}</td>
                      <td className="px-3 py-2.5 text-slate-400">{off.appliedBy.split('@')[0]}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SQL Execution Audit Trail */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">
              Hibernate / JPA SQL Execution Log (Autonomous Transactions)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Filter: <span className="text-emerald-400">{activeDatabase}</span>
          </span>
        </div>

        <div className="space-y-2 font-mono text-xs max-h-72 overflow-y-auto pr-1">
          {sqlLogs
            .filter((log) => log.database === activeDatabase)
            .map((log) => (
              <div key={log.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="text-indigo-400 font-semibold">{log.service}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleTimeString()} • {log.durationMs}ms
                  </span>
                </div>
                <div className="text-emerald-300 text-xs break-all">{log.query}</div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                  Parameters: {JSON.stringify(log.parameters)} • Rows affected: {log.rowsAffected}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
