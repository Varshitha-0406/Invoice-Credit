export type JwtRole = 'accountsClerk' | 'supplier';

export interface JwtTokenPayload {
  sub: string;
  name: string;
  email: string;
  role: JwtRole;
  supplierId?: string;
  iat: number;
  exp: number;
  iss: string;
}

export type InvoiceStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type InvoiceLineStatus = 'OPEN' | 'PARTIALLY_SETTLED' | 'SETTLED';

export interface InvoiceLine {
  id: string; // e.g. "INV-2026-101-L1"
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  openBalance: number;
  status: InvoiceLineStatus;
  sku: string;
}

export interface Invoice {
  id: string; // e.g. "INV-2026-101"
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  openBalance: number;
  currency: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  createdAt: string;
  updatedAt: string;
  version: number; // JPA @Version for optimistic locking
}

export type CreditNoteStatus = 'ISSUED' | 'PARTIALLY_APPLIED' | 'FULLY_APPLIED' | 'VOID';
export type CreditLineStatus = 'OPEN' | 'PARTIALLY_ALLOCATED' | 'EXHAUSTED';

export type ReasonCode =
  | 'DAMAGED_GOODS'
  | 'PRICE_CORRECTION'
  | 'VOLUME_REBATE'
  | 'RETURNED_MERCHANDISE'
  | 'DISCOUNT_ADJUSTMENT';

export interface CreditLine {
  id: string; // e.g. "CN-2026-409-CL1"
  lineNumber: number;
  description: string;
  creditAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  status: CreditLineStatus;
}

export interface CreditNote {
  id: string; // e.g. "CN-2026-409"
  creditNoteNumber: string;
  supplierId: string;
  supplierName: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  reasonCode: ReasonCode;
  totalCredit: number;
  unallocatedAmount: number;
  currency: string;
  status: CreditNoteStatus;
  lines: CreditLine[];
  createdAt: string;
  version: number;
}

export interface OffsetRecord {
  id: string; // e.g. "OFFSET-701"
  timestamp: string;
  creditNoteId: string;
  creditLineId: string;
  invoiceId: string;
  invoiceLineId: string;
  offsetAmount: number;
  previousInvoiceBalance: number;
  residualInvoiceBalance: number;
  previousCreditBalance: number;
  residualCreditBalance: number;
  appliedBy: string;
  role: JwtRole;
  status: 'COMMITTED';
  kafkaEventId: string;
  traceId: string;
  reasonNotes?: string;
}

export interface KafkaMessage<T = any> {
  eventId: string;
  eventType: 'CreditNoteApplied' | 'InvoiceImported' | 'CreditNoteIssued' | 'ResidualDuesRecalculated';
  topic: 'soa.s08.t02.events';
  partition: number;
  offset: number;
  key: string;
  timestamp: string;
  traceId: string;
  producerService: 'OFFSET-SERVICE' | 'INVOICE-SERVICE' | 'CREDIT-NOTE-SERVICE';
  consumerService: 'INVOICE-SERVICE' | 'SETTLEMENT-LEDGER';
  consumerPersisted: boolean;
  headers: {
    'content-type': string;
    'x-correlation-id': string;
    'x-origin-service': string;
    'x-schema-version': string;
    'x-auth-subject': string;
  };
  payload: T;
}

export interface CreditNoteAppliedPayload {
  offsetId: string;
  creditNoteId: string;
  creditLineId: string;
  invoiceId: string;
  invoiceLineId: string;
  offsetAmount: number;
  previousInvoiceBalance: number;
  residualInvoiceBalance: number;
  previousCreditBalance: number;
  residualCreditBalance: number;
  appliedBy: string;
  role: JwtRole;
}

export interface GatewayRoute {
  id: string;
  pathPattern: string;
  targetUri: string;
  targetService: string;
  requiredRole: JwtRole | 'ANY';
  allowedMethods: string[];
  description: string;
}

export interface EurekaServiceInstance {
  app: string;
  instanceId: string;
  ipAddr: string;
  port: number;
  status: 'UP' | 'STARTING' | 'OUT_OF_SERVICE';
  lastHeartbeat: string;
  metadata: {
    jpaStore: string;
    kafkaRole: 'PRODUCER' | 'CONSUMER' | 'PRODUCER_CONSUMER' | 'NONE';
    version: string;
  };
}

export interface SqlAuditLog {
  id: string;
  timestamp: string;
  database: 'invoice_db' | 'creditnote_db' | 'offset_db';
  service: string;
  query: string;
  parameters: Record<string, any>;
  durationMs: number;
  rowsAffected: number;
}

export interface TestExecutionResult {
  id: string;
  category: 'JUnit 5 + AssertJ' | 'SpringBootTest' | 'DataJpaTest' | 'Contract Test (Pact/SCC)';
  testClass: string;
  testMethod: string;
  description: string;
  status: 'PASSED' | 'FAILED' | 'RUNNING' | 'PENDING';
  durationMs: number;
  assertionBreakdown: {
    name: string;
    expected: string;
    actual: string;
    passed: boolean;
  }[];
  consoleOutput: string[];
  sourceCode: string;
}
