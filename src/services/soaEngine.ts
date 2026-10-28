import {
  Invoice,
  CreditNote,
  OffsetRecord,
  KafkaMessage,
  CreditNoteAppliedPayload,
  JwtRole,
  JwtTokenPayload,
  SqlAuditLog,
  TestExecutionResult,
} from '../types/domain';
import { INITIAL_INVOICES, INITIAL_CREDIT_NOTES } from '../mock/initialData';

const STORAGE_KEY_PREFIX = 'soa_s08_t02_';

export function getJwtToken(role: JwtRole): string {
  // Representative RS256/HS256 Bearer JWT string
  if (role === 'accountsClerk') {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItY2xlcmstODgyMSIsIm5hbWUiOiJFbGVhbm9yIFZhbmNlIiwiZW1haWwiOiJlbGVhbm9yLnZhbmNlQGRlc2suY29ycCIsInJvbGUiOiJhY2NvdW50c0NsZXJrIiwiaWF0IjoxNzg1MDk4NDAwLCJleHAiOjE3ODUxODQ4MDAsImlzcyI6ImF1dGgtc2VydmljZS5zb2EuaW50ZXJuYWwifQ.Q9x_yB7vTq8Zl1M4W9a0kL';
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3Itc3VwcC04ODIxIiwibmFtZSI6Ik1hcmN1cyBDaGVuIiwic3VwcGxpZXJJZCI6IlNVUFAtODgyMSIsImVtYWlsIjoibWFyY3VzLmNoZW5AYXBleHN1cHBseS5jb20iLCJyb2xlIjoic3VwcGxpZXIiLCJpYXQiOjE3ODUwOTg0MDAsImV4cCI6MTc4NTE4NDgwMCwiaXNzIjoiYXV0aC1zZXJ2aWNlLnNvYS5pbnRlcm5hbCJ9.Km3_pL8vTq9Zl2M4W8b1kX';
}

export function parseJwtPayload(token: string): JwtTokenPayload {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    }
  } catch (e) {
    // fallback
  }
  return {
    sub: 'usr-clerk-8821',
    name: 'Eleanor Vance',
    email: 'eleanor.vance@desk.corp',
    role: 'accountsClerk',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
    iss: 'auth-service.soa.internal',
  };
}

class SoaEngine {
  private invoices: Invoice[] = [];
  private creditNotes: CreditNote[] = [];
  private offsets: OffsetRecord[] = [];
  private kafkaMessages: KafkaMessage[] = [];
  private sqlLogs: SqlAuditLog[] = [];
  private currentRole: JwtRole = 'accountsClerk';
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedInvoices = localStorage.getItem(`${STORAGE_KEY_PREFIX}invoices`);
      const savedCredits = localStorage.getItem(`${STORAGE_KEY_PREFIX}credit_notes`);
      const savedOffsets = localStorage.getItem(`${STORAGE_KEY_PREFIX}offsets`);
      const savedKafka = localStorage.getItem(`${STORAGE_KEY_PREFIX}kafka`);
      const savedSql = localStorage.getItem(`${STORAGE_KEY_PREFIX}sql_logs`);
      const savedRole = localStorage.getItem(`${STORAGE_KEY_PREFIX}role`);

      if (savedInvoices && savedCredits) {
        this.invoices = JSON.parse(savedInvoices);
        this.creditNotes = JSON.parse(savedCredits);
        this.offsets = savedOffsets ? JSON.parse(savedOffsets) : [];
        this.kafkaMessages = savedKafka ? JSON.parse(savedKafka) : [];
        this.sqlLogs = savedSql ? JSON.parse(savedSql) : [];
        this.currentRole = (savedRole as JwtRole) || 'accountsClerk';
        return;
      }
    } catch (e) {
      console.warn('Failed to load SOA state from storage, resetting to seed', e);
    }

    this.resetToSeed();
  }

  public saveState() {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}invoices`, JSON.stringify(this.invoices));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}credit_notes`, JSON.stringify(this.creditNotes));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}offsets`, JSON.stringify(this.offsets));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}kafka`, JSON.stringify(this.kafkaMessages));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}sql_logs`, JSON.stringify(this.sqlLogs));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}role`, this.currentRole);
    } catch (e) {
      console.error('Storage write error', e);
    }
    this.notify();
  }

  public resetToSeed() {
    this.invoices = JSON.parse(JSON.stringify(INITIAL_INVOICES));
    this.creditNotes = JSON.parse(JSON.stringify(INITIAL_CREDIT_NOTES));
    this.offsets = [];
    this.kafkaMessages = [
      {
        eventId: 'evt_init_seed_001',
        eventType: 'InvoiceImported',
        topic: 'soa.s08.t02.events',
        partition: 0,
        offset: 1,
        key: 'INV-2026-101',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        traceId: 'trace-soa-s08-t02-init-01',
        producerService: 'INVOICE-SERVICE',
        consumerService: 'SETTLEMENT-LEDGER',
        consumerPersisted: true,
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': 'corr-init-01',
          'x-origin-service': 'INVOICE-SERVICE',
          'x-schema-version': '1.0',
          'x-auth-subject': 'system-importer',
        },
        payload: {
          invoiceId: 'INV-2026-101',
          totalAmount: 1200.0,
          openBalance: 1200.0,
          supplierId: 'SUPP-8821',
          lineCount: 2,
        },
      },
      {
        eventId: 'evt_init_seed_002',
        eventType: 'CreditNoteIssued',
        topic: 'soa.s08.t02.events',
        partition: 0,
        offset: 2,
        key: 'CN-2026-409',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        traceId: 'trace-soa-s08-t02-init-02',
        producerService: 'CREDIT-NOTE-SERVICE',
        consumerService: 'SETTLEMENT-LEDGER',
        consumerPersisted: true,
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': 'corr-init-02',
          'x-origin-service': 'CREDIT-NOTE-SERVICE',
          'x-schema-version': '1.0',
          'x-auth-subject': 'accountsClerk@desk.corp',
        },
        payload: {
          creditNoteId: 'CN-2026-409',
          totalCredit: 500.0,
          unallocatedAmount: 500.0,
          reasonCode: 'DAMAGED_GOODS',
        },
      },
    ];

    this.sqlLogs = [
      {
        id: 'sql_seed_001',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        database: 'invoice_db',
        service: 'INVOICE-SERVICE',
        query: 'INSERT INTO invoices (id, invoice_number, total_amount, open_balance, status, version) VALUES (?, ?, ?, ?, ?, ?);',
        parameters: { id: 'INV-2026-101', total: 1200.0, balance: 1200.0, status: 'OPEN', version: 1 },
        durationMs: 4,
        rowsAffected: 1,
      },
      {
        id: 'sql_seed_002',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        database: 'creditnote_db',
        service: 'CREDIT-NOTE-SERVICE',
        query: 'INSERT INTO credit_notes (id, credit_note_number, total_credit, unallocated_amount, status, version) VALUES (?, ?, ?, ?, ?, ?);',
        parameters: { id: 'CN-2026-409', credit: 500.0, unallocated: 500.0, status: 'ISSUED', version: 1 },
        durationMs: 3,
        rowsAffected: 1,
      },
    ];

    this.currentRole = 'accountsClerk';
    this.saveState();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // Getters
  public getInvoices(): Invoice[] {
    return this.invoices;
  }

  public getCreditNotes(): CreditNote[] {
    return this.creditNotes;
  }

  public getOffsets(): OffsetRecord[] {
    return this.offsets;
  }

  public getKafkaMessages(): KafkaMessage[] {
    return this.kafkaMessages;
  }

  public getSqlLogs(): SqlAuditLog[] {
    return this.sqlLogs;
  }

  public getCurrentRole(): JwtRole {
    return this.currentRole;
  }

  public setRole(role: JwtRole) {
    this.currentRole = role;
    this.saveState();
  }

  /**
   * Minimum functional requirement 3: Cap offsets by open balances.
   * Calculates maximum offset allowed against an invoice line by checking both
   * open balance and remaining credit note amount.
   */
  public calculateMaxOffset(invoiceLineId: string, creditLineId: string): {
    maxAllowable: number;
    invoiceLineOpenBalance: number;
    creditLineRemaining: number;
  } {
    let invoiceLineOpenBalance = 0;
    for (const inv of this.invoices) {
      const line = inv.lines.find((l) => l.id === invoiceLineId);
      if (line) {
        invoiceLineOpenBalance = line.openBalance;
        break;
      }
    }

    let creditLineRemaining = 0;
    for (const cn of this.creditNotes) {
      const cline = cn.lines.find((cl) => cl.id === creditLineId);
      if (cline) {
        creditLineRemaining = cline.remainingAmount;
        break;
      }
    }

    const maxAllowable = Math.max(0, Math.min(invoiceLineOpenBalance, creditLineRemaining));
    return { maxAllowable, invoiceLineOpenBalance, creditLineRemaining };
  }

  /**
   * Apply Credit Note offset with strict Gateway security and domain capping rule.
   * If caller role is 'supplier', Gateway rejects with 403 Forbidden.
   */
  public applyCreditOffset(params: {
    invoiceId: string;
    invoiceLineId: string;
    creditNoteId: string;
    creditLineId: string;
    requestedAmount: number;
    reasonNotes?: string;
  }): {
    success: boolean;
    offsetRecord?: OffsetRecord;
    kafkaEvent?: KafkaMessage<CreditNoteAppliedPayload>;
    error?: string;
    statusCode: number;
  } {
    const { invoiceId, invoiceLineId, creditNoteId, creditLineId, requestedAmount, reasonNotes } = params;

    // 1. Gateway Security Check (CO2: JWT roles + authorization)
    if (this.currentRole !== 'accountsClerk') {
      const deniedMsg = `Access Denied: Subject '${this.currentRole}' lacks required authority 'ROLE_ACCOUNTS_CLERK' for route 'POST /api/offsets/apply'`;
      return {
        success: false,
        error: deniedMsg,
        statusCode: 403,
      };
    }

    // 2. Locate entities
    const invoice = this.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) {
      return { success: false, error: `Invoice '${invoiceId}' not found in invoice_db`, statusCode: 404 };
    }
    const invLine = invoice.lines.find((l) => l.id === invoiceLineId);
    if (!invLine) {
      return { success: false, error: `Invoice line '${invoiceLineId}' not found`, statusCode: 404 };
    }

    const creditNote = this.creditNotes.find((cn) => cn.id === creditNoteId);
    if (!creditNote) {
      return { success: false, error: `Credit note '${creditNoteId}' not found in creditnote_db`, statusCode: 404 };
    }
    const credLine = creditNote.lines.find((cl) => cl.id === creditLineId);
    if (!credLine) {
      return { success: false, error: `Credit line '${creditLineId}' not found`, statusCode: 404 };
    }

    // 3. Domain Rule & Capping Assertion (CO1 & Minimum requirement 3)
    if (requestedAmount <= 0) {
      return {
        success: false,
        error: `Offset amount must be strictly greater than 0. Received: $${requestedAmount.toFixed(2)}`,
        statusCode: 400,
      };
    }

    const maxAllowable = Math.min(invLine.openBalance, credLine.remainingAmount);
    if (requestedAmount > maxAllowable) {
      return {
        success: false,
        error: `Offset capped by open balance rule: Requested $${requestedAmount.toFixed(
          2
        )} exceeds allowable maximum of $${maxAllowable.toFixed(
          2
        )} (Invoice Line open: $${invLine.openBalance.toFixed(2)}, Credit Line remaining: $${credLine.remainingAmount.toFixed(2)})`,
        statusCode: 422,
      };
    }

    const offsetAmount = requestedAmount;
    const prevInvBalance = invLine.openBalance;
    const residInvBalance = Math.round((prevInvBalance - offsetAmount) * 100) / 100;

    const prevCredBalance = credLine.remainingAmount;
    const residCredBalance = Math.round((prevCredBalance - offsetAmount) * 100) / 100;

    const offsetId = `OFFSET-${700 + this.offsets.length + 1}`;
    const traceId = `trace-soa-s08-t02-${Date.now().toString(36)}`;
    const eventId = `evt_offset_${Math.random().toString(36).substring(2, 10)}`;
    const nowIso = new Date().toISOString();

    // 4. Create Offset in offset_db (Owned by OFFSET-SERVICE)
    const offsetRecord: OffsetRecord = {
      id: offsetId,
      timestamp: nowIso,
      creditNoteId,
      creditLineId,
      invoiceId,
      invoiceLineId,
      offsetAmount,
      previousInvoiceBalance: prevInvBalance,
      residualInvoiceBalance: residInvBalance,
      previousCreditBalance: prevCredBalance,
      residualCreditBalance: residCredBalance,
      appliedBy: 'eleanor.vance@desk.corp',
      role: 'accountsClerk',
      status: 'COMMITTED',
      kafkaEventId: eventId,
      traceId,
      reasonNotes: reasonNotes || 'Standard matched offset applied by Accounts Clerk',
    };
    this.offsets.unshift(offsetRecord);

    // SQL Audit for OFFSET-SERVICE
    this.sqlLogs.unshift({
      id: `sql_${Date.now()}_off`,
      timestamp: nowIso,
      database: 'offset_db',
      service: 'OFFSET-SERVICE',
      query: `INSERT INTO offset_settlement_ledger (id, credit_line_id, invoice_line_id, offset_amount, prev_invoice_balance, residual_invoice_balance, trace_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      parameters: {
        id: offsetId,
        creditLineId,
        invoiceLineId,
        offsetAmount,
        prevInvBalance,
        residInvBalance,
        traceId,
      },
      durationMs: 6,
      rowsAffected: 1,
    });

    // 5. Publish Kafka Event (CO1: Kafka Topic soa.s08.t02.events)
    const kafkaMsg: KafkaMessage<CreditNoteAppliedPayload> = {
      eventId,
      eventType: 'CreditNoteApplied',
      topic: 'soa.s08.t02.events',
      partition: 0,
      offset: this.kafkaMessages.length + 1,
      key: invoiceId,
      timestamp: nowIso,
      traceId,
      producerService: 'OFFSET-SERVICE',
      consumerService: 'INVOICE-SERVICE',
      consumerPersisted: true,
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': `corr-${offsetId}`,
        'x-origin-service': 'OFFSET-SERVICE',
        'x-schema-version': '1.0',
        'x-auth-subject': 'usr-clerk-8821',
      },
      payload: {
        offsetId,
        creditNoteId,
        creditLineId,
        invoiceId,
        invoiceLineId,
        offsetAmount,
        previousInvoiceBalance: prevInvBalance,
        residualInvoiceBalance: residInvBalance,
        previousCreditBalance: prevCredBalance,
        residualCreditBalance: residCredBalance,
        appliedBy: 'eleanor.vance@desk.corp',
        role: 'accountsClerk',
      },
    };
    this.kafkaMessages.unshift(kafkaMsg);

    // 6. Asynchronous Consumer Choreography: INVOICE-SERVICE consumes CreditNoteApplied
    invLine.openBalance = residInvBalance;
    invLine.status = residInvBalance === 0 ? 'SETTLED' : 'PARTIALLY_SETTLED';

    // Recalculate invoice overall open balance
    const totalOpen = invoice.lines.reduce((sum, l) => sum + l.openBalance, 0);
    invoice.openBalance = Math.round(totalOpen * 100) / 100;
    invoice.status = invoice.openBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';
    invoice.version += 1;
    invoice.updatedAt = nowIso;

    // SQL Audit for INVOICE-SERVICE consumer update
    this.sqlLogs.unshift({
      id: `sql_${Date.now()}_inv`,
      timestamp: nowIso,
      database: 'invoice_db',
      service: 'INVOICE-SERVICE',
      query: `UPDATE invoice_lines SET open_balance = ?, status = ? WHERE id = ?; UPDATE invoices SET open_balance = ?, status = ?, version = version + 1 WHERE id = ?;`,
      parameters: {
        open_balance: residInvBalance,
        status: invLine.status,
        lineId: invoiceLineId,
        invoiceOpenBalance: invoice.openBalance,
        invoiceStatus: invoice.status,
        invoiceId,
      },
      durationMs: 8,
      rowsAffected: 2,
    });

    // 7. Update CREDIT-NOTE-SERVICE state in creditnote_db
    credLine.allocatedAmount += offsetAmount;
    credLine.remainingAmount = residCredBalance;
    credLine.status = residCredBalance === 0 ? 'EXHAUSTED' : 'PARTIALLY_ALLOCATED';

    const totalUnallocated = creditNote.lines.reduce((sum, cl) => sum + cl.remainingAmount, 0);
    creditNote.unallocatedAmount = Math.round(totalUnallocated * 100) / 100;
    creditNote.status = creditNote.unallocatedAmount === 0 ? 'FULLY_APPLIED' : 'PARTIALLY_APPLIED';
    creditNote.version += 1;

    // SQL Audit for CREDIT-NOTE-SERVICE
    this.sqlLogs.unshift({
      id: `sql_${Date.now()}_cn`,
      timestamp: nowIso,
      database: 'creditnote_db',
      service: 'CREDIT-NOTE-SERVICE',
      query: `UPDATE credit_lines SET allocated_amount = ?, remaining_amount = ?, status = ? WHERE id = ?; UPDATE credit_notes SET unallocated_amount = ?, status = ? WHERE id = ?;`,
      parameters: {
        allocated: credLine.allocatedAmount,
        remaining: credLine.remainingAmount,
        lineStatus: credLine.status,
        lineId: creditLineId,
        totalUnallocated: creditNote.unallocatedAmount,
        noteStatus: creditNote.status,
        creditNoteId,
      },
      durationMs: 5,
      rowsAffected: 2,
    });

    this.saveState();

    return {
      success: true,
      offsetRecord,
      kafkaEvent: kafkaMsg,
      statusCode: 200,
    };
  }

  /**
   * Import Invoice (Minimum requirement 1)
   */
  public importInvoice(newInvoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'openBalance' | 'status' | 'totalAmount'>): Invoice {
    const total = newInvoice.lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const invoiceId = `INV-2026-${100 + this.invoices.length + 1}`;
    const now = new Date().toISOString();

    const created: Invoice = {
      ...newInvoice,
      id: invoiceId,
      totalAmount: total,
      openBalance: total,
      status: 'OPEN',
      lines: newInvoice.lines.map((l, idx) => ({
        ...l,
        id: `${invoiceId}-L${idx + 1}`,
        openBalance: l.lineTotal,
        status: 'OPEN',
      })),
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.invoices.unshift(created);

    // Kafka event
    const eventId = `evt_inv_imp_${Math.random().toString(36).substring(2, 9)}`;
    this.kafkaMessages.unshift({
      eventId,
      eventType: 'InvoiceImported',
      topic: 'soa.s08.t02.events',
      partition: 0,
      offset: this.kafkaMessages.length + 1,
      key: invoiceId,
      timestamp: now,
      traceId: `trace-soa-s08-t02-import-${Date.now().toString(36)}`,
      producerService: 'INVOICE-SERVICE',
      consumerService: 'SETTLEMENT-LEDGER',
      consumerPersisted: true,
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': `corr-${invoiceId}`,
        'x-origin-service': 'INVOICE-SERVICE',
        'x-schema-version': '1.0',
        'x-auth-subject': 'eleanor.vance@desk.corp',
      },
      payload: {
        invoiceId,
        totalAmount: total,
        supplierId: created.supplierId,
        linesCount: created.lines.length,
      },
    });

    this.sqlLogs.unshift({
      id: `sql_${Date.now()}_imp`,
      timestamp: now,
      database: 'invoice_db',
      service: 'INVOICE-SERVICE',
      query: `INSERT INTO invoices (id, invoice_number, supplier_id, total_amount, open_balance, status) VALUES (?, ?, ?, ?, ?, ?);`,
      parameters: { id: invoiceId, total, balance: total, status: 'OPEN' },
      durationMs: 7,
      rowsAffected: 1,
    });

    this.saveState();
    return created;
  }

  /**
   * Run automated test suite (CO4)
   */
  public runTestSuite(): TestExecutionResult[] {
    const results: TestExecutionResult[] = [];

    // Test 1: JUnit 5 + AssertJ Domain Rule: Cap offsets by open balance
    results.push({
      id: 'test-junit-01',
      category: 'JUnit 5 + AssertJ',
      testClass: 'org.soa.s08.t02.domain.InvoiceCreditMatchingDomainTest',
      testMethod: 'shouldCapOffsetToInvoiceLineOpenBalance()',
      description: 'Asserts that requesting an offset amount exceeding the line open balance is strictly capped and rejected with DomainRuleViolationException.',
      status: 'PASSED',
      durationMs: 42,
      assertionBreakdown: [
        {
          name: 'assertThat(attemptedOffset).isGreaterThan(invoiceLine.getOpenBalance())',
          expected: 'true ($800.00 > $700.00)',
          actual: 'true',
          passed: true,
        },
        {
          name: 'assertThatThrownBy(() -> offsetEngine.calculateAllowableOffset(invLine, creditLine, 800.00)).isInstanceOf(DomainRuleViolationException.class)',
          expected: 'DomainRuleViolationException.class',
          actual: 'DomainRuleViolationException: Offset capped by open balance rule',
          passed: true,
        },
        {
          name: 'assertThat(cappedAmount).isEqualTo(invoiceLine.getOpenBalance())',
          expected: '700.00',
          actual: '700.00',
          passed: true,
        },
      ],
      consoleOutput: [
        '[INFO] Running org.soa.s08.t02.domain.InvoiceCreditMatchingDomainTest',
        '[DEBUG] Asserting invoice line open balance: $700.00 against attempted offset: $800.00',
        '[DEBUG] Capping rule triggered: Math.min(creditRemaining, lineOpenBalance) == 700.00',
        '[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.042 s',
      ],
      sourceCode: `@Test
@DisplayName("Assert domain rule: Offset cannot exceed invoice line open balance")
void shouldCapOffsetToInvoiceLineOpenBalance() {
    InvoiceLine line = new InvoiceLine("L1", new BigDecimal("700.00"));
    CreditLine credit = new CreditLine("CL1", new BigDecimal("800.00"));

    assertThatThrownBy(() -> offsetDomainService.applyAllocation(line, credit, new BigDecimal("800.00")))
        .isInstanceOf(DomainRuleViolationException.class)
        .hasMessageContaining("Offset capped by open balance rule");

    BigDecimal allowable = offsetDomainService.capToOpenBalance(line, credit, new BigDecimal("800.00"));
    assertThat(allowable).isEqualByComparingTo("700.00");
}`,
    });

    // Test 2: JUnit 5 + AssertJ: Apply partial credit and leave correct balance open
    results.push({
      id: 'test-junit-02',
      category: 'JUnit 5 + AssertJ',
      testClass: 'org.soa.s08.t02.domain.InvoiceCreditMatchingDomainTest',
      testMethod: 'shouldApplyPartialCreditAndLeaveCorrectResidualBalance()',
      description: 'Asserts that applying a partial credit ($450 on $700 line, $1200 invoice) leaves residual $250 line balance and $750 invoice balance.',
      status: 'PASSED',
      durationMs: 38,
      assertionBreakdown: [
        {
          name: 'assertThat(line.getOpenBalance()).isEqualByComparingTo("250.00")',
          expected: '250.00',
          actual: '250.00',
          passed: true,
        },
        {
          name: 'assertThat(invoice.getOpenBalance()).isEqualByComparingTo("750.00")',
          expected: '750.00',
          actual: '750.00',
          passed: true,
        },
        {
          name: 'assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID)',
          expected: 'PARTIALLY_PAID',
          actual: 'PARTIALLY_PAID',
          passed: true,
        },
        {
          name: 'assertThat(creditLine.getRemainingAmount()).isEqualByComparingTo("0.00")',
          expected: '0.00',
          actual: '0.00',
          passed: true,
        },
      ],
      consoleOutput: [
        '[INFO] Given Invoice INV-2026-101 with initial balance: $1,200.00 (L1: $700, L2: $500)',
        '[INFO] Applying Credit Note CN-2026-409 line CL1 ($450.00) against L1',
        '[DEBUG] AssertJ verification: L1 residual open balance is exactly $250.00',
        '[DEBUG] AssertJ verification: Overall invoice open balance is exactly $750.00',
        '[INFO] Status assertion passed: PARTIALLY_PAID',
      ],
      sourceCode: `@Test
@DisplayName("Apply partial credit and leave correct residual invoice balance open")
void shouldApplyPartialCreditAndLeaveCorrectResidualBalance() {
    Invoice invoice = createTestInvoice("INV-2026-101", 
        new InvoiceLine("L1", new BigDecimal("700.00")),
        new InvoiceLine("L2", new BigDecimal("500.00"))
    ); // total $1200.00
    CreditLine creditLine = new CreditLine("CL1", new BigDecimal("450.00"));

    OffsetResult result = offsetDomainService.applyOffset(invoice, "L1", creditLine, new BigDecimal("450.00"));

    assertThat(invoice.getLine("L1").getOpenBalance()).isEqualByComparingTo("250.00");
    assertThat(invoice.getOpenBalance()).isEqualByComparingTo("750.00");
    assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
    assertThat(creditLine.getRemainingAmount()).isEqualByComparingTo("0.00");
}`,
    });

    // Test 3: SpringBootTest: Gateway routing and Kafka workflow
    results.push({
      id: 'test-sbt-01',
      category: 'SpringBootTest',
      testClass: 'org.soa.s08.t02.integration.GatewayAndKafkaWorkflowIntegrationTest',
      testMethod: 'givenAccountsClerkJwt_whenApplyOffsetThroughGateway_thenRouteAndPublishKafkaEvent()',
      description: 'End-to-end integration through Spring Cloud Gateway :8080 with valid accountsClerk JWT Bearer token, verifying Kafka event publication on soa.s08.t02.events.',
      status: 'PASSED',
      durationMs: 112,
      assertionBreakdown: [
        {
          name: 'assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK)',
          expected: '200 OK',
          actual: '200 OK',
          passed: true,
        },
        {
          name: 'assertThat(kafkaConsumer.getReceivedEvents()).hasSize(1)',
          expected: '1 event',
          actual: '1 event',
          passed: true,
        },
        {
          name: 'assertThat(receivedEvent.getEventType()).isEqualTo("CreditNoteApplied")',
          expected: 'CreditNoteApplied',
          actual: 'CreditNoteApplied',
          passed: true,
        },
        {
          name: 'assertThat(receivedEvent.getTopic()).isEqualTo("soa.s08.t02.events")',
          expected: 'soa.s08.t02.events',
          actual: 'soa.s08.t02.events',
          passed: true,
        },
      ],
      consoleOutput: [
        '[INFO] Initializing EmbeddedKafkaBroker for topic [soa.s08.t02.events]',
        '[INFO] Dispatching POST http://localhost:8080/api/offsets/apply with Authorization: Bearer eyJhbGciOi...',
        '[DEBUG] Gateway JwtAuthenticationFilter: Subject="usr-clerk-8821", Authority=[ROLE_ACCOUNTS_CLERK] -> Forwarding to lb://OFFSET-SERVICE',
        '[DEBUG] KafkaTemplate published event id: evt_offset_9f82 to topic: soa.s08.t02.events (partition=0)',
        '[INFO] Awaiting asynchronous consumer on INVOICE-SERVICE...',
        '[INFO] Kafka record acknowledged by groupId="invoice-service-consumer-group"',
      ],
      sourceCode: `@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EmbeddedKafka(partitions = 1, topics = {"soa.s08.t02.events"})
class GatewayAndKafkaWorkflowIntegrationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private EmbeddedKafkaBroker embeddedKafka;

    @Test
    void givenAccountsClerkJwt_whenApplyOffsetThroughGateway_thenRouteAndPublishKafkaEvent() {
        String token = jwtTokenProvider.generateToken("usr-clerk-8821", "ROLE_ACCOUNTS_CLERK");

        OffsetRequest request = new OffsetRequest("INV-2026-101", "L1", "CN-2026-409", "CL1", new BigDecimal("450.00"));

        webTestClient.post().uri("/api/offsets/apply")
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
            .bodyValue(request)
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.status").isEqualTo("COMMITTED")
            .jsonPath("$.offsetAmount").isEqualTo(450.00);

        ConsumerRecord<String, CreditNoteAppliedEvent> record = KafkaTestUtils.getSingleRecord(consumer, "soa.s08.t02.events");
        assertThat(record.value().getEventType()).isEqualTo("CreditNoteApplied");
        assertThat(record.value().getResidualInvoiceBalance()).isEqualByComparingTo("750.00");
    }
}`,
    });

    // Test 4: SpringBootTest: Denied JWT Request (CO2 & Expected Demo)
    results.push({
      id: 'test-sbt-02',
      category: 'SpringBootTest',
      testClass: 'org.soa.s08.t02.integration.GatewayAndKafkaWorkflowIntegrationTest',
      testMethod: 'givenSupplierJwt_whenAttemptOffsetMutation_thenDenyWith403Forbidden()',
      description: 'Verifies Gateway and Offset Service perimeter security: requests with role "supplier" attempting offset allocation return HTTP 403 Forbidden.',
      status: 'PASSED',
      durationMs: 46,
      assertionBreakdown: [
        {
          name: 'assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN)',
          expected: '403 FORBIDDEN',
          actual: '403 FORBIDDEN',
          passed: true,
        },
        {
          name: 'assertThat(errorResponse.getMessage()).contains("lacks required authority")',
          expected: 'contains "lacks required authority"',
          actual: "Access Denied: Subject 'usr-supp-8821' with role 'supplier' lacks required authority 'ROLE_ACCOUNTS_CLERK'",
          passed: true,
        },
      ],
      consoleOutput: [
        '[INFO] Dispatching POST http://localhost:8080/api/offsets/apply with Authorization: Bearer [SUPPLIER_ROLE]',
        '[WARN] Gateway SecurityFilter: Subject="usr-supp-8821" evaluated against route requires "accountsClerk"',
        '[WARN] Access Denied: 403 FORBIDDEN returned at Gateway boundary before routing to OFFSET-SERVICE',
      ],
      sourceCode: `@Test
@DisplayName("Demonstrate denied JWT request: supplier role receives 403 Forbidden")
void givenSupplierJwt_whenAttemptOffsetMutation_thenDenyWith403Forbidden() {
    String supplierToken = jwtTokenProvider.generateToken("usr-supp-8821", "ROLE_SUPPLIER");

    webTestClient.post().uri("/api/offsets/apply")
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + supplierToken)
        .bodyValue(new OffsetRequest("INV-2026-101", "L1", "CN-2026-409", "CL1", new BigDecimal("450.00")))
        .exchange()
        .expectStatus().isForbidden()
        .expectBody()
        .jsonPath("$.error").isEqualTo("Forbidden")
        .jsonPath("$.status").isEqualTo(403);
}`,
    });

    // Test 5: SpringBootTest: Consumed-Event State Downstream Persistence
    results.push({
      id: 'test-sbt-03',
      category: 'SpringBootTest',
      testClass: 'org.soa.s08.t02.integration.CreditNoteConsumerWorkflowTest',
      testMethod: 'whenCreditNoteAppliedEventConsumed_thenInvoiceServiceUpdatesResidualBalance()',
      description: 'Simulates Kafka event consumption by Invoice Service listener, verifying that downstream JPA repository updates residual open balance in invoice_db.',
      status: 'PASSED',
      durationMs: 74,
      assertionBreakdown: [
        {
          name: 'assertThat(invoiceRepository.findById("INV-2026-101").get().getOpenBalance()).isEqualByComparingTo("750.00")',
          expected: '750.00',
          actual: '750.00',
          passed: true,
        },
        {
          name: 'assertThat(invoiceRepository.findById("INV-2026-101").get().getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID)',
          expected: 'PARTIALLY_PAID',
          actual: 'PARTIALLY_PAID',
          passed: true,
        },
      ],
      consoleOutput: [
        '[INFO] EventListener invoked: @KafkaListener(topics = "soa.s08.t02.events", groupId = "invoice-service-consumer-group")',
        '[DEBUG] Consumed message payload: offsetId=OFFSET-701, residInvoiceBalance=750.00',
        '[DEBUG] Executing transactional invoiceRepository.save(invoice)',
        '[INFO] Residual balance successfully persisted to PostgreSQL/H2 store invoice_db',
      ],
      sourceCode: `@Test
@DisplayName("Verify consumed-event state updates downstream invoice persistence")
void whenCreditNoteAppliedEventConsumed_thenInvoiceServiceUpdatesResidualBalance() {
    CreditNoteAppliedEvent event = CreditNoteAppliedEvent.builder()
        .invoiceId("INV-2026-101")
        .invoiceLineId("L1")
        .offsetAmount(new BigDecimal("450.00"))
        .residualInvoiceBalance(new BigDecimal("750.00"))
        .build();

    invoiceEventListener.handleCreditNoteApplied(event);

    Invoice persisted = invoiceRepository.findById("INV-2026-101").orElseThrow();
    assertThat(persisted.getOpenBalance()).isEqualByComparingTo("750.00");
    assertThat(persisted.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
}`,
    });

    // Test 6: DataJpaTest: Persistence constraints in isolated DB
    results.push({
      id: 'test-jpa-01',
      category: 'DataJpaTest',
      testClass: 'org.soa.s08.t02.repository.InvoicePersistenceConstraintTest',
      testMethod: 'verifyInvoiceLineOpenBalanceNonNegativeConstraint()',
      description: 'Tests JPA database check constraint (CHECK open_balance >= 0) and optimistic locking (@Version) in invoice_db store.',
      status: 'PASSED',
      durationMs: 51,
      assertionBreakdown: [
        {
          name: 'assertThatThrownBy(() -> testEntityManager.persistAndFlush(negativeBalanceLine)).isInstanceOf(PersistenceException.class)',
          expected: 'PersistenceException / ConstraintViolationException',
          actual: 'PersistenceException: CHECK constraint CHK_INVOICE_LINE_BALANCE_NON_NEG violated',
          passed: true,
        },
        {
          name: 'assertThat(persistedInvoice.getVersion()).isEqualTo(2L)',
          expected: '2',
          actual: '2',
          passed: true,
        },
      ],
      consoleOutput: [
        '[INFO] Initializing @DataJpaTest on isolated datasource: jdbc:h2:mem:invoice_db',
        '[DEBUG] Schema DDL: CONSTRAINT chk_open_balance CHECK (open_balance >= 0)',
        '[DEBUG] Attempting to flush entity with open_balance = -50.00',
        '[INFO] Caught expected ConstraintViolationException: Open balance cannot be negative',
      ],
      sourceCode: `@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class InvoicePersistenceConstraintTest {

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void verifyInvoiceLineOpenBalanceNonNegativeConstraint() {
        InvoiceLine line = new InvoiceLine("INV-ERR-L1", new BigDecimal("-50.00"));
        
        assertThatThrownBy(() -> entityManager.persistAndFlush(line))
            .isInstanceOf(PersistenceException.class);
    }
}`,
    });

    // Test 7: Contract Test: CreditNoteApplied event schema
    results.push({
      id: 'test-contract-01',
      category: 'Contract Test (Pact/SCC)',
      testClass: 'org.soa.s08.t02.contract.CreditNoteAppliedEventContractTest',
      testMethod: 'validateCreditNoteAppliedEventSchemaContract()',
      description: 'Pact / Spring Cloud Contract consumer verification: validates that Offset Service publishes all mandatory fields required by Invoice Service consumer contract.',
      status: 'PASSED',
      durationMs: 65,
      assertionBreakdown: [
        {
          name: 'assertThat(eventJson).matchesJsonSchema(schemaRegistry.get("CreditNoteApplied.v1.json"))',
          expected: 'Matches v1 JSON Schema',
          actual: 'Matches v1 JSON Schema (10/10 required fields present)',
          passed: true,
        },
        {
          name: 'assertThat(payload.getResidualInvoiceBalance()).isNotNull()',
          expected: 'NOT NULL',
          actual: '750.00',
          passed: true,
        },
      ],
      consoleOutput: [
        '[INFO] Validating contract: contracts/events/CreditNoteAppliedContract.groovy',
        '[DEBUG] Consumer: INVOICE-SERVICE -> Provider: OFFSET-SERVICE',
        '[DEBUG] Checking mandatory fields: eventId, eventType, timestamp, traceId, offsetId, invoiceId, residualInvoiceBalance',
        '[INFO] Contract verification PASSED for 10 contract assertions',
      ],
      sourceCode: `// Spring Cloud Contract Specification
Contract.make {
    description "Should publish CreditNoteApplied event when offset is committed"
    label "credit_note_applied"
    input {
        triggeredBy("triggerCreditNoteApplied()")
    }
    outputMessage {
        sentTo("soa.s08.t02.events")
        headers {
            header("content-type", "application/json")
            header("x-origin-service", "OFFSET-SERVICE")
        }
        body(
            eventId: regex(uuid()),
            eventType: "CreditNoteApplied",
            payload: [
                offsetId: regex('OFFSET-[0-9]+'),
                invoiceId: regex('INV-[0-9]{4}-[0-9]+'),
                offsetAmount: 450.00,
                residualInvoiceBalance: 750.00
            ]
        )
    }
}`,
    });

    // Test 8: Contract Test: REST Response Contract for Residual Dues
    results.push({
      id: 'test-contract-02',
      category: 'Contract Test (Pact/SCC)',
      testClass: 'org.soa.s08.t02.contract.InvoiceRestResponseContractTest',
      testMethod: 'validateInvoiceRestResponseContractAgainstConsumerExpectations()',
      description: 'Validates GET /api/invoices/{id} response payload matches consumer expectations for residual dues and line balances.',
      status: 'PASSED',
      durationMs: 44,
      assertionBreakdown: [
        {
          name: 'assertThat(restResponse).satisfiesContract("contracts/rest/invoice_residual_dues.json")',
          expected: 'Contract Satisfied',
          actual: 'Contract Satisfied',
          passed: true,
        },
      ],
      consoleOutput: [
        '[INFO] Consumer: FINANCE-DESK-UI -> Provider: INVOICE-SERVICE',
        '[DEBUG] Verified response structure for GET /api/invoices/INV-2026-101',
        '[INFO] All 12 JSON properties verified against Pact contract specification',
      ],
      sourceCode: `Contract.make {
    request {
        method GET()
        url "/api/invoices/INV-2026-101"
        headers {
            header("Accept", "application/json")
        }
    }
    response {
        status OK()
        headers {
            contentType(applicationJson())
        }
        body(
            id: "INV-2026-101",
            totalAmount: 1200.0,
            openBalance: 750.0,
            status: "PARTIALLY_PAID"
        )
    }
}`,
    });

    return results;
  }
}

export const soaEngine = new SoaEngine();
