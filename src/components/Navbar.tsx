import React, { useState } from 'react';
import {
  Shield,
  UserCheck,
  RotateCcw,
  Play,
  Key,
  ExternalLink,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { JwtRole } from '../types/domain';
import { soaEngine, getJwtToken, parseJwtPayload } from '../services/soaEngine';

interface NavbarProps {
  currentRole: JwtRole;
  onRoleChange: (role: JwtRole) => void;
  onStartGuidedDemo: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onStartGuidedDemo,
  activeTab,
  setActiveTab,
}) => {
  const [showTokenModal, setShowTokenModal] = useState(false);
  const currentToken = getJwtToken(currentRole);
  const tokenPayload = parseJwtPayload(currentToken);

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-50 backdrop-blur-md">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('finance')}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-mono font-bold text-base tracking-wider">
              IC
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Invoice Credit</h1>
            </div>
          </div>

          {/* Quick Guided Demo & Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={onStartGuidedDemo}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02]"
              title="Step-by-step walkthrough of evaluation demo points"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Expected Demo Walkthrough</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Reset all records to initial representative seed data?')) {
                  soaEngine.resetToSeed();
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition"
              title="Reset databases to clean seed state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Reset Seed</span>
            </button>

            {/* JWT Role Switcher */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
              <span className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1">
                <Shield className="w-3 h-3 text-indigo-400" />
                <span className="hidden md:inline">JWT Role:</span>
              </span>
              <button
                onClick={() => onRoleChange('accountsClerk')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  currentRole === 'accountsClerk'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                accountsClerk
              </button>
              <button
                onClick={() => onRoleChange('supplier')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  currentRole === 'supplier'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switches to supplier token (demonstrates 403 Forbidden denied request)"
              >
                supplier
              </button>
              <button
                onClick={() => setShowTokenModal(true)}
                className="ml-1 p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                title="Inspect active JWT token & claims"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto border-t border-slate-800/80 pt-1 -mb-px">
          {[
            { id: 'finance', label: 'Finance Operations Desk', icon: Layers },
            { id: 'topology', label: 'Microservices & B1-B6', icon: Activity },
            { id: 'kafka', label: 'Kafka Bus (soa.s08.t02.events)', icon: ExternalLink },
            { id: 'eureka-gateway', label: 'Eureka & Gateway (8080)', icon: Shield },
            { id: 'jpa-stores', label: 'Per-Service JPA Stores', icon: UserCheck },
            { id: 'tests', label: 'CO4 Automated Test Suite', icon: CheckCircle2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* JWT Claims Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-5 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">Active JWT Token Claims (CO2)</h3>
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-mono mb-1">Header & Signature Algorithm:</div>
                <div className="text-xs font-mono text-emerald-400">{`{"alg": "HS256", "typ": "JWT"}`}</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-mono mb-1">Decoded Payload Claims:</div>
                <pre className="text-xs font-mono text-blue-300 overflow-x-auto">
                  {JSON.stringify(tokenPayload, null, 2)}
                </pre>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-mono mb-1">Raw Authorization Header:</div>
                <p className="text-[11px] font-mono text-slate-400 break-all bg-slate-900 p-2 rounded border border-slate-800">
                  Bearer {currentToken}
                </p>
              </div>

              <div className="text-xs text-slate-400 bg-blue-950/40 border border-blue-900/60 p-3 rounded-lg flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-blue-300">Access Control Enforcement:</span>
                  <p className="mt-0.5">
                    {currentRole === 'accountsClerk'
                      ? 'Role "accountsClerk" has full privileges to import invoices, approve credit notes, and execute offset balance allocations via POST /api/offsets.'
                      : 'Role "supplier" has READ-ONLY privileges for their own records. Any attempt to mutate offsets via POST /api/offsets is rejected by Spring Cloud Gateway with 403 Forbidden.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
