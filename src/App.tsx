/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { FinanceDesk } from './components/FinanceDesk';
import { MicroservicesTopology } from './components/MicroservicesTopology';
import { KafkaEventInspector } from './components/KafkaEventInspector';
import { EurekaGatewayExplorer } from './components/EurekaGatewayExplorer';
import { JpaStoreExplorer } from './components/JpaStoreExplorer';
import { TestSuiteView } from './components/TestSuiteView';
import { GuidedDemoModal } from './components/GuidedDemoModal';
import { soaEngine } from './services/soaEngine';
import { JwtRole } from './types/domain';

export default function App() {
  const [currentRole, setCurrentRole] = useState<JwtRole>(() => soaEngine.getCurrentRole());
  const [invoices, setInvoices] = useState(() => soaEngine.getInvoices());
  const [creditNotes, setCreditNotes] = useState(() => soaEngine.getCreditNotes());
  const [offsets, setOffsets] = useState(() => soaEngine.getOffsets());
  const [kafkaMessages, setKafkaMessages] = useState(() => soaEngine.getKafkaMessages());
  const [sqlLogs, setSqlLogs] = useState(() => soaEngine.getSqlLogs());
  const [activeTab, setActiveTab] = useState<string>('finance');
  const [showGuidedDemo, setShowGuidedDemo] = useState(false);

  useEffect(() => {
    const unsubscribe = soaEngine.subscribe(() => {
      setCurrentRole(soaEngine.getCurrentRole());
      setInvoices([...soaEngine.getInvoices()]);
      setCreditNotes([...soaEngine.getCreditNotes()]);
      setOffsets([...soaEngine.getOffsets()]);
      setKafkaMessages([...soaEngine.getKafkaMessages()]);
      setSqlLogs([...soaEngine.getSqlLogs()]);
    });
    return unsubscribe;
  }, []);

  const handleRoleChange = (newRole: JwtRole) => {
    soaEngine.setRole(newRole);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        onStartGuidedDemo={() => setShowGuidedDemo(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'finance' && (
          <FinanceDesk
            invoices={invoices}
            creditNotes={creditNotes}
            offsets={offsets}
            currentRole={currentRole}
            onNavigateToKafka={() => setActiveTab('kafka')}
            onNavigateToEureka={() => setActiveTab('eureka-gateway')}
          />
        )}

        {activeTab === 'topology' && <MicroservicesTopology />}

        {activeTab === 'kafka' && <KafkaEventInspector messages={kafkaMessages} />}

        {activeTab === 'eureka-gateway' && (
          <EurekaGatewayExplorer
            currentRole={currentRole}
            onSetRole={handleRoleChange}
          />
        )}

        {activeTab === 'jpa-stores' && (
          <JpaStoreExplorer
            invoices={invoices}
            creditNotes={creditNotes}
            offsets={offsets}
            sqlLogs={sqlLogs}
          />
        )}

        {activeTab === 'tests' && <TestSuiteView />}
      </main>

      {/* Evaluation Guided Demo Modal */}
      <GuidedDemoModal
        isOpen={showGuidedDemo}
        onClose={() => setShowGuidedDemo(false)}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setShowGuidedDemo(false);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-400">Sec8 / Team 2 / SOA-S08-T02 / Core</span>
          <span>•</span>
          <span>Invoice Credit-Note Matching & Settlement Engine</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Spring Cloud Gateway :8080</span>
          <span>•</span>
          <span>Netflix Eureka :8761</span>
          <span>•</span>
          <span>Kafka: soa.s08.t02.events</span>
          <span>•</span>
          <span>JPA: PostgreSQL / H2</span>
        </div>
      </footer>
    </div>
  );
}
