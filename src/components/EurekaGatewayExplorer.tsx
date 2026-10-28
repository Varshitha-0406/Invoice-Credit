import React, { useState } from 'react';
import {
  Server,
  Shield,
  Send,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ArrowRight,
  Lock,
  Radio,
  ExternalLink,
  Code,
} from 'lucide-react';
import { EUREKA_INSTANCES, GATEWAY_ROUTES } from '../mock/initialData';
import { JwtRole } from '../types/domain';
import { getJwtToken } from '../services/soaEngine';

interface EurekaGatewayExplorerProps {
  currentRole: JwtRole;
  onSetRole: (role: JwtRole) => void;
}

export const EurekaGatewayExplorer: React.FC<EurekaGatewayExplorerProps> = ({
  currentRole,
  onSetRole,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-offsets-apply');
  const [testMethod, setTestMethod] = useState<string>('POST');
  const [testPath, setTestPath] = useState<string>('/api/offsets/apply');
  const [simulatedRole, setSimulatedRole] = useState<JwtRole>('supplier'); // Default to supplier to quickly demo 403
  const [responseLog, setResponseLog] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    headers: Record<string, string>;
    body: Record<string, any>;
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleTestRoute = (roleToUse: JwtRole) => {
    setIsExecuting(true);
    const token = getJwtToken(roleToUse);

    setTimeout(() => {
      if (testPath.startsWith('/api/offsets') && testMethod === 'POST' && roleToUse !== 'accountsClerk') {
        // Denied 403 Forbidden
        setResponseLog({
          status: 403,
          statusText: 'Forbidden',
          durationMs: 8,
          headers: {
            'content-type': 'application/json',
            'x-gateway-trace': `trace-gw-denied-${Date.now().toString(36)}`,
            'www-authenticate': 'Bearer error="insufficient_scope", error_description="The token does not have required authority ROLE_ACCOUNTS_CLERK"',
          },
          body: {
            timestamp: new Date().toISOString(),
            status: 403,
            error: 'Forbidden',
            message: `Access Denied: Subject 'usr-supp-8821' with role '${roleToUse}' lacks required authority 'ROLE_ACCOUNTS_CLERK' for route '${testMethod} ${testPath}'`,
            path: testPath,
            traceId: `trace-soa-s08-t02-sec-denied-${Date.now().toString(36)}`,
          },
        });
      } else {
        // Allowed 200 OK
        setResponseLog({
          status: 200,
          statusText: 'OK',
          durationMs: 14,
          headers: {
            'content-type': 'application/json',
            'x-gateway-routed-to': 'lb://OFFSET-SERVICE',
            'x-gateway-trace': `trace-gw-ok-${Date.now().toString(36)}`,
          },
          body: {
            status: 'COMMITTED',
            message: `Gateway successfully authorized request with authority 'ROLE_ACCOUNTS_CLERK' and routed to OFFSET-SERVICE.`,
            authenticatedSubject: 'usr-clerk-8821',
            role: roleToUse,
            routedInstance: '10.0.2.22:8083',
          },
        });
      }
      setIsExecuting(false);
    }, 200);
  };

  return (
    <div className="space-y-8">
      {/* Eureka Discovery Server Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" />
              Netflix Eureka Service Registry (Port 8761)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Self-preservation mode: DISABLED • Renewal threshold: 85% • Heartbeat interval: 30s
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Eureka Server UP
            </span>
          </div>
        </div>

        {/* Eureka Instances Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Instance ID & Port</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Heartbeat</th>
                  <th className="px-4 py-3">JPA Store / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {EUREKA_INSTANCES.map((inst) => (
                  <tr key={inst.instanceId} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-bold text-white">{inst.app}</td>
                    <td className="px-4 py-3 text-slate-300">{inst.instanceId}</td>
                    <td className="px-4 py-3 text-slate-400">{inst.ipAddr}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-[10px]">
                        {inst.status} (1)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{inst.lastHeartbeat}</td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {inst.metadata.jpaStore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Spring Cloud Gateway Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Spring Cloud Gateway Route Table (Port 8080)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Reactive reverse proxy with JwtAuthenticationFilter and dynamic Eureka load balancing (lb://).
            </p>
          </div>
        </div>

        {/* Routes Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Route ID</th>
                  <th className="px-4 py-3">Path Predicate</th>
                  <th className="px-4 py-3">Target Service (Eureka)</th>
                  <th className="px-4 py-3">Methods</th>
                  <th className="px-4 py-3">Required Authority</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {GATEWAY_ROUTES.map((route) => (
                  <tr key={route.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-semibold text-indigo-300">{route.id}</td>
                    <td className="px-4 py-3 text-slate-200">{route.pathPattern}</td>
                    <td className="px-4 py-3 text-emerald-400">{route.targetUri}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {route.allowedMethods.map((m) => (
                          <span key={m} className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          route.requiredRole === 'accountsClerk'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {route.requiredRole}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-sans text-xs">{route.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Interactive Gateway Dispatcher & 403 Forbidden Demonstration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              Live Gateway Dispatcher & 403 Forbidden Security Test
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify CO2 JWT authorization: Demonstrate that a restricted endpoint (POST /api/offsets/apply) returns 403 Forbidden when invoked with a supplier token.
            </p>
          </div>

          {/* Quick 1-click test button for the expected demo */}
          <button
            onClick={() => {
              setSimulatedRole('supplier');
              handleTestRoute('supplier');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition hover:scale-[1.02]"
          >
            <Shield className="w-4 h-4" />
            <span>Demonstrate Denied Supplier Request (HTTP 403)</span>
          </button>
        </div>

        {/* Dispatcher Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Simulated JWT Caller Identity</label>
            <select
              value={simulatedRole}
              onChange={(e) => setSimulatedRole(e.target.value as JwtRole)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="supplier">supplier (Marcus Chen - Apex Supply - RESTRICTED)</option>
              <option value="accountsClerk">accountsClerk (Eleanor Vance - FinDesk - AUTHORIZED)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">HTTP Method & Path</label>
            <div className="flex gap-2">
              <select
                value={testMethod}
                onChange={(e) => setTestMethod(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono focus:outline-none"
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
              <input
                type="text"
                value={testPath}
                onChange={(e) => setTestPath(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => handleTestRoute(simulatedRole)}
              disabled={isExecuting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isExecuting ? 'Dispatching...' : 'Dispatch through Gateway :8080'}</span>
            </button>
          </div>
        </div>

        {/* Response Console */}
        {responseLog && (
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Response from Gateway:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    responseLog.status === 200
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  HTTP {responseLog.status} {responseLog.statusText}
                </span>
              </div>
              <span className="text-slate-500">{responseLog.durationMs}ms latency</span>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <span className="text-[11px] text-slate-500 font-mono block mb-1">Response Headers:</span>
                <pre className="text-[11px] font-mono text-slate-400 bg-slate-900/60 p-2.5 rounded border border-slate-800 overflow-x-auto">
                  {Object.entries(responseLog.headers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('\n')}
                </pre>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 font-mono block mb-1">Payload Body:</span>
                <pre
                  className={`text-xs font-mono p-3 rounded-lg overflow-x-auto border ${
                    responseLog.status === 200
                      ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                  }`}
                >
                  {JSON.stringify(responseLog.body, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
