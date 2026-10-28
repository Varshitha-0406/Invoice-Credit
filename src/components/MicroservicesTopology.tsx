import React, { useState } from 'react';
import {
  Layers,
  Server,
  Database,
  Radio,
  ShieldCheck,
  CheckCircle2,
  Workflow,
  Cpu,
  ArrowRight,
  ExternalLink,
  Lock,
  GitBranch,
} from 'lucide-react';
import { EUREKA_INSTANCES, GATEWAY_ROUTES } from '../mock/initialData';

export const MicroservicesTopology: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string>('OFFSET-SERVICE');

  const servicesInfo: Record<
    string,
    {
      name: string;
      port: number;
      roleDescription: string;
      database: string;
      dbTables: string[];
      kafkaRole: string;
      endpoints: string[];
      securityRules: string;
      technologies: string[];
    }
  > = {
    'API-GATEWAY': {
      name: 'Spring Cloud Gateway',
      port: 8080,
      roleDescription:
        'Single entry perimeter router. Performs JWT token parsing, RBAC validation (accountsClerk vs supplier), rate-limiting, and client CORS handling before forwarding to Eureka-discovered microservices.',
      database: 'Stateless (No JPA persistence)',
      dbTables: ['N/A (In-memory route predicates & Redis rate-limiter)'],
      kafkaRole: 'None (Perimeter API reverse-proxy)',
      endpoints: ['/api/invoices/**', '/api/credit-notes/**', '/api/offsets/**'],
      securityRules: 'JwtAuthenticationFilter intercepts Bearer headers; enforces 403 Forbidden for unauthorized roles.',
      technologies: ['Spring Cloud Gateway', 'Spring Security Reactive', 'Nimbus Jose JWT', 'Netty'],
    },
    'INVOICE-SERVICE': {
      name: 'Invoice Domain Service',
      port: 8081,
      roleDescription:
        'Owns invoice domain lifecycles, line-item valuations, and residual dues. Consumes CreditNoteApplied events from Kafka and recalculates open balances and payment statuses asynchronously.',
      database: 'invoice_db (Autonomous PostgreSQL / H2)',
      dbTables: ['invoices', 'invoice_lines', 'invoice_settlement_history'],
      kafkaRole: 'Consumer (Topic: soa.s08.t02.events, GroupId: invoice-service-consumer-group)',
      endpoints: ['GET /api/invoices', 'GET /api/invoices/{id}', 'POST /api/invoices (Clerk only)'],
      securityRules: 'Permits supplier read on matching supplierId; requires accountsClerk for import & edits.',
      technologies: ['Spring Boot 3.3', 'Spring Data JPA / Hibernate', 'Spring Kafka Listener', 'PostgreSQL'],
    },
    'CREDIT-NOTE-SERVICE': {
      name: 'Credit Note Domain Service',
      port: 8082,
      roleDescription:
        'Manages credit notes, reason codes (damaged goods, volume rebates), and credit line remaining amounts. Synchronizes unallocated pool balance upon offset execution.',
      database: 'creditnote_db (Autonomous PostgreSQL / H2)',
      dbTables: ['credit_notes', 'credit_lines', 'credit_audit_log'],
      kafkaRole: 'Producer / Consumer (Topic: soa.s08.t02.events)',
      endpoints: ['GET /api/credit-notes', 'GET /api/credit-notes/{id}', 'POST /api/credit-notes'],
      securityRules: 'Supplier can inspect issued notes; clerk can issue and authorize adjustments.',
      technologies: ['Spring Boot 3.3', 'Spring Data JPA', 'KafkaTemplate', 'Flyway Migrations'],
    },
    'OFFSET-SERVICE': {
      name: 'Offset & Settlement Engine',
      port: 8083,
      roleDescription:
        'Core transaction coordinator. Applies capping rule Math.min(creditRemaining, lineOpenBalance), records settlement entries in offset_db, and publishes the CreditNoteApplied event to Kafka topic soa.s08.t02.events.',
      database: 'offset_db (Autonomous PostgreSQL / H2)',
      dbTables: ['offset_settlement_ledger', 'offset_audit_events'],
      kafkaRole: 'Primary Producer (Topic: soa.s08.t02.events, Event: CreditNoteApplied)',
      endpoints: ['POST /api/offsets/apply (Strictly accountsClerk)', 'GET /api/offsets/ledger'],
      securityRules: 'Strictly restricted to accountsClerk. Any supplier invocation is rejected at Gateway with 403 Forbidden.',
      technologies: ['Spring Boot 3.3', 'Spring Data JPA', 'KafkaTemplate', 'AssertJ Domain Engine'],
    },
  };

  const activeServiceInfo = servicesInfo[selectedService] || servicesInfo['OFFSET-SERVICE'];

  return (
    <div className="space-y-8">
      {/* Topology Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Workflow className="w-5 h-5 text-indigo-400" />
            SOA-S08-T02 Microservices Architecture Topology
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Decoupled domain services, Eureka discovery, Spring Cloud Gateway, per-service JPA stores, and Apache Kafka choreography.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Eureka: 4 Instances UP
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
            <Radio className="w-3.5 h-3.5" />
            Kafka: 1 Partition Active
          </span>
        </div>
      </div>

      {/* Interactive Topology Graph Visualizer */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-3 text-[10px] font-mono text-slate-600">
          CLICK ANY SERVICE NODE TO INSPECT DETAILS
        </div>

        {/* Level 0: Client & Gateway */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 shadow">
              Web Client / Postman (JWT Bearer Token)
            </div>
          </div>

          <div className="text-slate-500 flex flex-col items-center">
            <div className="w-0.5 h-6 bg-slate-700"></div>
            <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />
          </div>

          {/* Spring Cloud Gateway & Eureka Server row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
            {/* Gateway Node */}
            <div
              onClick={() => setSelectedService('API-GATEWAY')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedService === 'API-GATEWAY'
                  ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  API-GATEWAY :8080
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  UP
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 font-medium">Spring Cloud Gateway</p>
              <p className="text-[11px] text-slate-400 mt-0.5">JWT Auth Filter • Rate Limiter • Dynamic Routing</p>
            </div>

            {/* Eureka Server Node */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1.5">
                  <Server className="w-4 h-4" />
                  EUREKA-SERVER :8761
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  UP
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 font-medium">Netflix Eureka Service Discovery</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Heartbeat lease renewals (30s) • Service Registry</p>
            </div>
          </div>

          {/* Connector down to domain services */}
          <div className="text-slate-500 flex flex-col items-center">
            <div className="w-0.5 h-6 bg-slate-700"></div>
            <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />
          </div>

          {/* Domain Microservices (B1 High Cohesion) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {/* Invoice Service */}
            <div
              onClick={() => setSelectedService('INVOICE-SERVICE')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedService === 'INVOICE-SERVICE'
                  ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  INVOICE-SERVICE :8081
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  CONSUMER
                </span>
              </div>
              <div className="text-xs text-slate-200 font-semibold mt-2">Invoice Lifecycle & Dues</div>
              <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center gap-1 bg-slate-950 p-1.5 rounded border border-slate-800">
                <Database className="w-3 h-3 text-blue-400 shrink-0" />
                <span>JPA Store: invoice_db</span>
              </div>
            </div>

            {/* Credit Note Service */}
            <div
              onClick={() => setSelectedService('CREDIT-NOTE-SERVICE')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedService === 'CREDIT-NOTE-SERVICE'
                  ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  CREDIT-NOTE-SERVICE :8082
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  PRODUCER
                </span>
              </div>
              <div className="text-xs text-slate-200 font-semibold mt-2">Credit Notes & Pools</div>
              <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center gap-1 bg-slate-950 p-1.5 rounded border border-slate-800">
                <Database className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>JPA Store: creditnote_db</span>
              </div>
            </div>

            {/* Offset Service */}
            <div
              onClick={() => setSelectedService('OFFSET-SERVICE')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedService === 'OFFSET-SERVICE'
                  ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  OFFSET-SERVICE :8083
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  PRODUCER
                </span>
              </div>
              <div className="text-xs text-slate-200 font-semibold mt-2">Matching & Capping Engine</div>
              <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center gap-1 bg-slate-950 p-1.5 rounded border border-slate-800">
                <Database className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>JPA Store: offset_db</span>
              </div>
            </div>
          </div>

          {/* Kafka Event Broker (Topic soa.s08.t02.events) */}
          <div className="w-full mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/70 border border-indigo-500/40 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Apache Kafka Message Broker</span>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      Topic: soa.s08.t02.events
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Choreography: <span className="font-semibold text-indigo-300">OFFSET-SERVICE</span> publishes{' '}
                    <code className="text-amber-300">CreditNoteApplied</code>; consumed asynchronously by{' '}
                    <span className="font-semibold text-blue-300">INVOICE-SERVICE</span> to update open balance.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-800/80">
                  Partitions: 1 (Key: invoiceId)
                </span>
                <span className="text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800/80">
                  ACKs: all (min.insync.replicas=2)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Microservice Deep-Dive Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">
              Service Inspection: <span className="text-blue-400 font-mono">{activeServiceInfo.name}</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">(:{activeServiceInfo.port})</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Registered in Eureka Service Registry</span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3">
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Single Responsibility & Scope:</span>
              <p className="text-slate-300 leading-relaxed">{activeServiceInfo.roleDescription}</p>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Autonomous JPA Database (B2):</span>
              <p className="text-emerald-300 font-mono">{activeServiceInfo.database}</p>
              <div className="flex gap-2 mt-1">
                {activeServiceInfo.dbTables.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded bg-slate-950 font-mono text-slate-400 border border-slate-800 text-[11px]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Kafka Ownership & Choreography (B3):</span>
              <p className="text-indigo-300 font-mono">{activeServiceInfo.kafkaRole}</p>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Security & Authorization Rules (B4 / CO2):</span>
              <p className="text-slate-300 leading-relaxed">{activeServiceInfo.securityRules}</p>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">Tech Stack:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {activeServiceInfo.technologies.map((tech) => (
                  <span key={tech} className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono text-[11px] border border-blue-900/60">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* B1 to B6 Compliance Matrix */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          SOA Principles & B1-B6 Guidelines Compliance Matrix
        </h3>
        <p className="text-xs text-slate-400">
          Strict adherence to the SOA Course guidelines for autonomous, decoupled, enterprise-grade architecture.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {[
            {
              code: 'B1',
              title: 'High Cohesion & Service Boundaries',
              desc: 'Invoice, CreditNote, and Offset services represent strictly isolated bounded contexts. No overlapping domain logic; single responsibility per service.',
              status: 'COMPLIANT',
            },
            {
              code: 'B2',
              title: 'Autonomous Persistence (Database-per-Service)',
              desc: 'Separate JPA stores: invoice_db, creditnote_db, offset_db. Absolutely no cross-database SQL joins or shared foreign keys.',
              status: 'COMPLIANT',
            },
            {
              code: 'B3',
              title: 'Asynchronous Event Choreography',
              desc: 'Offset Service produces CreditNoteApplied event to Kafka topic soa.s08.t02.events. Invoice Service asynchronously updates invoice balances.',
              status: 'COMPLIANT',
            },
            {
              code: 'B4',
              title: 'API Gateway Perimeter Security (JWT)',
              desc: 'Spring Cloud Gateway validates Bearer tokens. Role "accountsClerk" is authorized for offsets, while "supplier" is denied with 403 Forbidden.',
              status: 'COMPLIANT',
            },
            {
              code: 'B5',
              title: 'Dynamic Service Discovery (Eureka)',
              desc: 'Services register with Eureka Server at :8761 with 30s heartbeats. Gateway routes dynamically via lb://SERVICE-NAME without hardcoded IPs.',
              status: 'COMPLIANT',
            },
            {
              code: 'B6',
              title: 'Consumer-Driven Contract Testing',
              desc: 'Pact & Spring Cloud Contract test suites verify CreditNoteApplied message schema and REST API response contracts against consumer expectations.',
              status: 'COMPLIANT',
            },
          ].map((item) => (
            <div key={item.code} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/80 text-[11px]">
                  {item.code}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {item.status}
                </span>
              </div>
              <h4 className="font-bold text-white text-xs">{item.title}</h4>
              <p className="text-slate-400 text-[11px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
