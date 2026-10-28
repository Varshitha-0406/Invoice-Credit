import React, { useState } from 'react';
import {
  FileText,
  CreditCard,
  ArrowRightLeft,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Plus,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  ShieldAlert,
  Send,
  Zap,
  Tag,
  Info,
} from 'lucide-react';
import {
  Invoice,
  CreditNote,
  InvoiceLine,
  CreditLine,
  JwtRole,
  OffsetRecord,
  KafkaMessage,
} from '../types/domain';
import { soaEngine } from '../services/soaEngine';

interface FinanceDeskProps {
  invoices: Invoice[];
  creditNotes: CreditNote[];
  offsets: OffsetRecord[];
  currentRole: JwtRole;
  onNavigateToKafka: () => void;
  onNavigateToEureka: () => void;
}

export const FinanceDesk: React.FC<FinanceDeskProps> = ({
  invoices,
  creditNotes,
  offsets,
  currentRole,
  onNavigateToKafka,
  onNavigateToEureka,
}) => {
  // UI states
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>('INV-2026-101');
  const [expandedCreditNoteId, setExpandedCreditNoteId] = useState<string | null>('CN-2026-409');
  
  // Matching drawer / modal state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceLine, setSelectedInvoiceLine] = useState<InvoiceLine | null>(null);
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);
  const [selectedCreditLine, setSelectedCreditLine] = useState<CreditLine | null>(null);
  const [requestedAmount, setRequestedAmount] = useState<number>(450);
  const [reasonNotes, setReasonNotes] = useState<string>('Offset applied against damaged casing inspection #IR-992');
  
  // Feedback banners
  const [lastActionFeedback, setLastActionFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    kafkaEventId?: string;
    statusCode?: number;
  } | null>(null);

  // New Invoice modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [newInvSupplier, setNewInvSupplier] = useState('Apex Industrial Supply Ltd.');
  const [newInvCustomer, setNewInvCustomer] = useState('Nova Global Logistics Corp.');
  const [newLineDesc, setNewLineDesc] = useState('Precision Servo Motors - 24V');
  const [newLineQty, setNewLineQty] = useState(3);
  const [newLinePrice, setNewLinePrice] = useState(400);

  // Calculate high-level financial summary (Requirement 4: Report residual dues)
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalResidualDues = invoices.reduce((sum, inv) => sum + inv.openBalance, 0);
  const totalCreditAvailable = creditNotes.reduce((sum, cn) => sum + cn.unallocatedAmount, 0);
  const totalOffsetsCommitted = offsets.reduce((sum, off) => sum + off.offsetAmount, 0);

  // Helper to open match modal pre-populated
  const openMatchModal = (inv: Invoice, line: InvoiceLine, cn?: CreditNote, cline?: CreditLine) => {
    setSelectedInvoice(inv);
    setSelectedInvoiceLine(line);

    const targetCreditNote = cn || creditNotes.find((c) => c.unallocatedAmount > 0) || creditNotes[0];
    setSelectedCreditNote(targetCreditNote);

    const targetCreditLine =
      cline ||
      targetCreditNote?.lines.find((cl) => cl.remainingAmount > 0) ||
      targetCreditNote?.lines[0];
    setSelectedCreditLine(targetCreditLine || null);

    // Initial safe default amount: min of both
    if (targetCreditLine && line) {
      const safeAmount = Math.min(line.openBalance, targetCreditLine.remainingAmount);
      setRequestedAmount(safeAmount > 0 ? safeAmount : 0);
    }
  };

  const handleApplyOffset = () => {
    if (!selectedInvoice || !selectedInvoiceLine || !selectedCreditNote || !selectedCreditLine) {
      return;
    }

    const res = soaEngine.applyCreditOffset({
      invoiceId: selectedInvoice.id,
      invoiceLineId: selectedInvoiceLine.id,
      creditNoteId: selectedCreditNote.id,
      creditLineId: selectedCreditLine.id,
      requestedAmount,
      reasonNotes,
    });

    if (res.success && res.offsetRecord && res.kafkaEvent) {
      setLastActionFeedback({
        type: 'success',
        statusCode: res.statusCode,
        title: `Offset ${res.offsetRecord.id} Successfully Committed via Spring Cloud Gateway!`,
        message: `Applied $${res.offsetRecord.offsetAmount.toFixed(
          2
        )} against ${selectedInvoice.id} (${selectedInvoiceLine.description}). Invoice residual open balance is now $${res.offsetRecord.residualInvoiceBalance.toFixed(
          2
        )}. Downstream update persisted in invoice_db.`,
        kafkaEventId: res.kafkaEvent.eventId,
      });
      setSelectedInvoice(null);
    } else {
      setLastActionFeedback({
        type: 'error',
        statusCode: res.statusCode,
        title: `Gateway Request Rejected (HTTP ${res.statusCode})`,
        message: res.error || 'Unknown error occurred during offset allocation.',
      });
    }
  };

  const handleImportNewInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const created = soaEngine.importInvoice({
      invoiceNumber: `INV-2026-${Date.now().toString().slice(-4)}`,
      supplierId: 'SUPP-8821',
      supplierName: newInvSupplier,
      customerId: 'CUST-4402',
      customerName: newInvCustomer,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      currency: 'USD',
      lines: [
        {
          id: '',
          lineNumber: 1,
          sku: 'SRV-24V-99',
          description: newLineDesc,
          quantity: newLineQty,
          unitPrice: newLinePrice,
          lineTotal: newLineQty * newLinePrice,
          openBalance: newLineQty * newLinePrice,
          status: 'OPEN',
        },
      ],
    });

    setShowImportModal(false);
    setLastActionFeedback({
      type: 'success',
      statusCode: 201,
      title: `Invoice ${created.id} Imported & Persisted in invoice_db`,
      message: `Total amount $${created.totalAmount.toFixed(2)} with 1 line item registered.`,
    });
  };

  // Compute live capping metrics for matching modal
  const maxAllowable =
    selectedInvoiceLine && selectedCreditLine
      ? Math.min(selectedInvoiceLine.openBalance, selectedCreditLine.remainingAmount)
      : 0;

  const isExceedingCap = requestedAmount > maxAllowable;

  return (
    <div className="space-y-6">
      {/* Top Notification / Action Feedback */}
      {lastActionFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between shadow-lg transition-all animate-fadeIn ${
            lastActionFeedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {lastActionFeedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">
                  {lastActionFeedback.title}
                </span>
                {lastActionFeedback.statusCode && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      lastActionFeedback.statusCode === 200 || lastActionFeedback.statusCode === 201
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    HTTP {lastActionFeedback.statusCode}
                  </span>
                )}
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">{lastActionFeedback.message}</p>
              {lastActionFeedback.kafkaEventId && (
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[11px] font-mono text-emerald-400">
                    Kafka Event: <span className="underline">{lastActionFeedback.kafkaEventId}</span>
                  </span>
                  <button
                    onClick={onNavigateToKafka}
                    className="text-[11px] underline text-blue-400 hover:text-blue-300"
                  >
                    Inspect in Kafka Event Bus →
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setLastActionFeedback(null)}
            className="text-xs text-slate-400 hover:text-white ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards (Minimum req 4: Report residual dues) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Invoiced</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            ${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>Across {invoices.length} active supplier invoices</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Residual Dues Open</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
            ${totalResidualDues.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {((totalResidualDues / (totalBilled || 1)) * 100).toFixed(1)}% outstanding balance
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Credit Pool Available</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">
            ${totalCreditAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {creditNotes.length} credit notes ready for matching
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Offsets Committed</span>
            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300 mt-1">
            ${totalOffsetsCommitted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {offsets.length} matching events posted to Kafka
          </div>
        </div>
      </div>

      {/* Main Workspace: 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Invoices & Residual Dues (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                1. Invoices & Residual Dues Ledger
              </h2>
              <p className="text-xs text-slate-400">
                Owned by <span className="font-mono text-blue-300">INVOICE-SERVICE</span> (Port 8081, store: invoice_db)
              </p>
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-medium shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Import Invoice
            </button>
          </div>

          <div className="space-y-3">
            {invoices.map((inv) => {
              const isExpanded = expandedInvoiceId === inv.id;
              const percentPaid = Math.round(((inv.totalAmount - inv.openBalance) / inv.totalAmount) * 100);

              return (
                <div
                  key={inv.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition"
                >
                  {/* Invoice Header Card */}
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">{inv.invoiceNumber}</span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {inv.status}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            JPA ver: {inv.version}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Supplier: <span className="text-slate-300">{inv.supplierName}</span> • Customer: <span className="text-slate-300">{inv.customerName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial summary numbers */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Residual Open Due</div>
                        <div className="text-sm font-bold font-mono text-amber-400">
                          ${inv.openBalance.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Total Billed</div>
                        <div className="text-sm font-mono text-slate-300">
                          ${inv.totalAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="px-4 pb-2">
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>{percentPaid}% Cleared by credits/payments</span>
                      <span>Due Date: {inv.dueDate}</span>
                    </div>
                  </div>

                  {/* Expandable Line Items (Minimum req 2 & 3: Map lines and cap offsets) */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-950/60 p-4">
                      <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                        <span>Invoice Line Breakdown & Open Balances:</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          Offsets must be capped against line-item open balances
                        </span>
                      </div>

                      <div className="space-y-2">
                        {inv.lines.map((line) => (
                          <div
                            key={line.id}
                            className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[11px]">
                                {line.id.split('-').slice(-1)[0]}
                              </span>
                              <div>
                                <div className="font-medium text-slate-200">{line.description}</div>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  SKU: {line.sku} • Qty: {line.quantity} × ${line.unitPrice.toFixed(2)} = ${line.lineTotal.toFixed(2)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-[10px] text-slate-500">Line Open Balance</div>
                                <div className="font-mono font-bold text-amber-300">
                                  ${line.openBalance.toFixed(2)}
                                </div>
                              </div>

                              <button
                                onClick={() => openMatchModal(inv, line)}
                                disabled={line.openBalance <= 0}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                  line.openBalance <= 0
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                                }`}
                                title={line.openBalance <= 0 ? 'Line fully settled' : 'Match and offset against credit note'}
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span>{line.openBalance <= 0 ? 'Settled' : 'Match Credit'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Credit Notes Pool & Matching Engine (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              2. Credit Notes Pool
            </h2>
            <p className="text-xs text-slate-400">
              Owned by <span className="font-mono text-emerald-300">CREDIT-NOTE-SERVICE</span> (Port 8082, store: creditnote_db)
            </p>
          </div>

          <div className="space-y-3">
            {creditNotes.map((cn) => {
              const isExpanded = expandedCreditNoteId === cn.id;

              return (
                <div
                  key={cn.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition"
                >
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setExpandedCreditNoteId(isExpanded ? null : cn.id)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">{cn.creditNoteNumber}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                            {cn.reasonCode}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Issued: {cn.issueDate} • Supplier: {cn.supplierName.split(' ')[0]}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-500">Unallocated Credit</div>
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        ${cn.unallocatedAmount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">Total: ${cn.totalCredit.toFixed(2)}</div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-950/60 p-4 space-y-2">
                      <div className="text-xs font-semibold text-slate-300 mb-1">Credit Lines Available:</div>
                      {cn.lines.map((cline) => (
                        <div
                          key={cline.id}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-medium text-slate-200">{cline.description}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              ID: {cline.id.split('-').slice(-1)[0]} • Initial: ${cline.creditAmount.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">Remaining</span>
                            <span className="font-mono font-bold text-emerald-400">
                              ${cline.remainingAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Info Box about B1-B6 Capping Rule */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/50 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Zap className="w-4 h-4" />
              <span>SOA Capping Rule Enforcement (AssertJ Tested)</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              When applying a credit line against an invoice line, the system guarantees:
              <br />
              <code className="text-amber-300 font-mono text-[11px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 block my-1">
                offsetAmount &lt;= Math.min(creditLine.remaining, invoiceLine.openBalance)
              </code>
              Over-allocation is capped at the domain layer, verified via JUnit 5, and checked at the JPA layer with
              database constraints!
            </p>
          </div>
        </div>
      </div>

      {/* Matching & Capping Drawer/Modal (Minimum req 3: Cap offsets by open balances) */}
      {selectedInvoice && selectedInvoiceLine && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Execute Invoice Credit-Note Matching</h3>
                  <p className="text-xs text-slate-400">
                    Dispatched through Spring Cloud Gateway to <span className="font-mono text-indigo-300">OFFSET-SERVICE</span> (:8083)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Matching Configuration */}
            <div className="mt-5 space-y-5">
              {/* Target Invoice Line Info */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  Target Invoice & Line Item
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold text-white">{selectedInvoice.invoiceNumber}</div>
                    <div className="text-xs text-slate-300 mt-0.5">{selectedInvoiceLine.description}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1">
                      Line ID: {selectedInvoiceLine.id} • SKU: {selectedInvoiceLine.sku}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Current Open Balance</div>
                    <div className="text-base font-mono font-bold text-amber-400">
                      ${selectedInvoiceLine.openBalance.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500">Total: ${selectedInvoiceLine.lineTotal.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Source Credit Note Selection */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  Source Credit Note & Line Item
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Select Credit Note</label>
                    <select
                      value={selectedCreditNote?.id}
                      onChange={(e) => {
                        const cn = creditNotes.find((c) => c.id === e.target.value);
                        if (cn) {
                          setSelectedCreditNote(cn);
                          const firstLine = cn.lines.find((cl) => cl.remainingAmount > 0) || cn.lines[0];
                          setSelectedCreditLine(firstLine || null);
                          if (firstLine && selectedInvoiceLine) {
                            setRequestedAmount(Math.min(selectedInvoiceLine.openBalance, firstLine.remainingAmount));
                          }
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {creditNotes.map((cn) => (
                        <option key={cn.id} value={cn.id}>
                          {cn.creditNoteNumber} - {cn.reasonCode} (${cn.unallocatedAmount.toFixed(2)} avail)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Select Credit Line</label>
                    <select
                      value={selectedCreditLine?.id}
                      onChange={(e) => {
                        const cl = selectedCreditNote?.lines.find((line) => line.id === e.target.value);
                        if (cl) {
                          setSelectedCreditLine(cl);
                          if (selectedInvoiceLine) {
                            setRequestedAmount(Math.min(selectedInvoiceLine.openBalance, cl.remainingAmount));
                          }
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {selectedCreditNote?.lines.map((cl) => (
                        <option key={cl.id} value={cl.id}>
                          {cl.description.slice(0, 35)}... (${cl.remainingAmount.toFixed(2)} rem)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedCreditLine && (
                  <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 p-2 rounded border border-emerald-900/50 flex justify-between">
                    <span>Credit Line ID: {selectedCreditLine.id}</span>
                    <span>Remaining Unallocated: ${selectedCreditLine.remainingAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Offset Amount with Capping Assertion */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                    Offset Allocation Amount
                  </label>
                  <div className="text-xs font-mono">
                    <span className="text-slate-500">Capped Maximum Allowable: </span>
                    <span className="font-bold text-emerald-400">${maxAllowable.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={requestedAmount}
                      onChange={(e) => setRequestedAmount(parseFloat(e.target.value) || 0)}
                      className={`w-full bg-slate-900 border rounded-lg pl-7 pr-3 py-2 text-sm font-mono text-white focus:outline-none ${
                        isExceedingCap ? 'border-rose-500 text-rose-300' : 'border-slate-700 focus:border-indigo-500'
                      }`}
                    />
                  </div>

                  <button
                    onClick={() => setRequestedAmount(maxAllowable)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                  >
                    Set Max (${maxAllowable.toFixed(2)})
                  </button>

                  <button
                    onClick={() => setRequestedAmount(Math.round((maxAllowable * 0.5) * 100) / 100)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                  >
                    50% Partial
                  </button>
                </div>

                {/* Live balance projection */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 rounded-lg bg-slate-900 text-xs border border-slate-800">
                    <div className="text-slate-500 text-[10px]">Projected Invoice Line Balance</div>
                    <div className="font-mono font-bold text-amber-300 mt-0.5">
                      ${Math.max(0, (selectedInvoiceLine.openBalance - requestedAmount)).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 text-xs border border-slate-800">
                    <div className="text-slate-500 text-[10px]">Projected Credit Line Balance</div>
                    <div className="font-mono font-bold text-emerald-300 mt-0.5">
                      ${Math.max(0, ((selectedCreditLine?.remainingAmount || 0) - requestedAmount)).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Over-cap warning */}
                {isExceedingCap && (
                  <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-rose-300">Capping Rule Violation:</span>
                      <p className="mt-0.5">
                        Requested ${requestedAmount.toFixed(2)} exceeds allowable limit of ${maxAllowable.toFixed(2)}.
                        Domain service will cap and reject requests violating the open balance ceiling.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Reason / Audit Trail Reference</label>
                <input
                  type="text"
                  value={reasonNotes}
                  onChange={(e) => setReasonNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Gateway JWT Role Indicator */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-400" />
                  Active Calling Identity:
                </span>
                <span
                  className={`font-mono font-semibold px-2 py-0.5 rounded ${
                    currentRole === 'accountsClerk'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {currentRole} {currentRole === 'supplier' && '(Will be denied with 403 Forbidden)'}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyOffset}
                disabled={requestedAmount <= 0}
                className={`px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition ${
                  isExceedingCap
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isExceedingCap ? 'Test Cap Rejection (422)' : 'Dispatch POST /api/offsets'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Invoice Modal (Minimum req 1) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Import New Invoice (B1 Invoice Service)</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportNewInvoice} className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Supplier Organization</label>
                <input
                  type="text"
                  value={newInvSupplier}
                  onChange={(e) => setNewInvSupplier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Customer / Entity</label>
                <input
                  type="text"
                  value={newInvCustomer}
                  onChange={(e) => setNewInvCustomer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-300">Invoice Line Item #1</div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Description</label>
                  <input
                    type="text"
                    value={newLineDesc}
                    onChange={(e) => setNewLineDesc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={newLineQty}
                      onChange={(e) => setNewLineQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={newLinePrice}
                      onChange={(e) => setNewLinePrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>
                </div>
                <div className="text-xs text-right font-mono text-emerald-400 pt-1">
                  Line Total: ${(newLineQty * newLinePrice).toFixed(2)}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  Import & Persist in invoice_db
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
