import React, { useState } from 'react';
import {
  Radio,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  Copy,
  Check,
  RotateCcw,
  Tag,
  CheckCircle2,
  FileCode,
  Zap,
} from 'lucide-react';
import { KafkaMessage } from '../types/domain';

interface KafkaEventInspectorProps {
  messages: KafkaMessage[];
}

export const KafkaEventInspector: React.FC<KafkaEventInspectorProps> = ({ messages }) => {
  const [selectedMessageId, setSelectedMessageId] = useState<string>(
    messages[0]?.eventId || 'evt_init_seed_001'
  );
  const [copied, setCopied] = useState(false);

  const selectedMessage =
    messages.find((m) => m.eventId === selectedMessageId) || messages[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Apache Kafka Event Stream Inspector
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Active Broker Cluster • Partition 0 • Topic:{' '}
            <span className="font-mono text-emerald-400 font-semibold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
              soa.s08.t02.events
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
            Total Messages: <span className="text-white font-bold">{messages.length}</span>
          </span>
          <span className="font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-900/60">
            Consumer Group: <span className="font-bold">invoice-service-consumer-group</span>
          </span>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Event Stream Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Message Log (Latest First)</span>
            <span className="text-[10px] text-slate-500 font-mono">Offset Ordering</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {messages.map((msg) => {
              const isSelected = msg.eventId === selectedMessageId;

              return (
                <div
                  key={msg.eventId}
                  onClick={() => setSelectedMessageId(msg.eventId)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/50 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        msg.eventType === 'CreditNoteApplied'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : msg.eventType === 'InvoiceImported'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {msg.eventType}
                    </span>

                    <span className="text-[11px] font-mono text-slate-400">
                      Offset: #{msg.offset}
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-mono text-slate-300 flex items-center justify-between">
                    <span className="truncate">Key: {msg.key}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                    <span>
                      <span className="text-slate-500">From: </span>
                      <span className="text-indigo-400 font-mono">{msg.producerService}</span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-mono">
                      <CheckCircle2 className="w-3 h-3" />
                      ACKed by {msg.consumerService}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Message Details & CloudEvent Schema (7 cols) */}
        <div className="lg:col-span-7">
          {selectedMessage ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
              {/* Message Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base font-mono">
                      {selectedMessage.eventType}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      ID: {selectedMessage.eventId}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Timestamp: {selectedMessage.timestamp} • Partition: {selectedMessage.partition} • Key: {selectedMessage.key}
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(JSON.stringify(selectedMessage, null, 2))}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied JSON' : 'Copy Record'}</span>
                </button>
              </div>

              {/* Kafka Record Headers */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  Kafka Record Headers (CloudEvents / W3C TraceContext)
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5">
                  {Object.entries(selectedMessage.headers).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center text-[11px]">
                      <span className="text-indigo-400">{k}:</span>
                      <span className="text-slate-300">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800">
                    <span className="text-indigo-400">traceparent (W3C):</span>
                    <span className="text-emerald-400">00-{selectedMessage.traceId}-01</span>
                  </div>
                </div>
              </div>

              {/* Payload JSON */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  Serialized Event Payload (JSON Schema Validated)
                </div>
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  {JSON.stringify(selectedMessage.payload, null, 2)}
                </pre>
              </div>

              {/* Consumer Workflow Verification */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-slate-950 border border-blue-900/60 text-xs space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-semibold">
                  <Zap className="w-4 h-4" />
                  <span>Asynchronous Consumer Workflow (CO1 / B3):</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  When this <code className="text-amber-300 font-mono">{selectedMessage.eventType}</code> message was published by{' '}
                  <span className="font-semibold text-indigo-300">{selectedMessage.producerService}</span>, the consumer{' '}
                  <span className="font-semibold text-blue-300">{selectedMessage.consumerService}</span> received it via{' '}
                  <code className="text-slate-400 font-mono">@KafkaListener</code> and updated the JPA entity open balance in{' '}
                  <code className="text-emerald-400 font-mono">invoice_db</code>.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Consumer Persistence Status: Confirmed & Committed in DB</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">No event selected.</div>
          )}
        </div>
      </div>
    </div>
  );
};
