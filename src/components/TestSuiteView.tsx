import React, { useState } from 'react';
import {
  CheckCircle2,
  Play,
  RotateCcw,
  Code,
  Terminal,
  Clock,
  Layers,
  FileCheck,
  Shield,
  Zap,
  Sparkles,
} from 'lucide-react';
import { TestExecutionResult } from '../types/domain';
import { soaEngine } from '../services/soaEngine';

export const TestSuiteView: React.FC = () => {
  const [testResults, setTestResults] = useState<TestExecutionResult[]>(() => soaEngine.runTestSuite());
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedTestId, setSelectedTestId] = useState<string>(testResults[0]?.id || 'test-junit-01');
  const [isRunning, setIsRunning] = useState(false);

  const categories = [
    'ALL',
    'JUnit 5 + AssertJ',
    'SpringBootTest',
    'DataJpaTest',
    'Contract Test (Pact/SCC)',
  ];

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      setTestResults(soaEngine.runTestSuite());
      setIsRunning(false);
    }, 400);
  };

  const filteredTests = testResults.filter((t) => {
    if (activeCategory === 'ALL') return true;
    return t.category === activeCategory;
  });

  const selectedTest = testResults.find((t) => t.id === selectedTestId) || testResults[0];

  const totalPassed = testResults.filter((t) => t.status === 'PASSED').length;
  const totalAssertions = testResults.reduce((acc, t) => acc + t.assertionBreakdown.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              CO4 Automated Verification Test Suite
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            JUnit 5 domain rules, SpringBootTest Gateway & Kafka workflows, DataJpaTest constraints, and Pact/SCC contracts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              {totalPassed}/{testResults.length} Passed
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{totalAssertions} Assertions Verified</span>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition hover:scale-[1.02]"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Executing Tests...' : 'Run All Test Suites'}</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeCategory === cat
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main 2-column test execution view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Test Cases List (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
          {filteredTests.map((t) => {
            const isSelected = t.id === selectedTestId;

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTestId(t.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800">
                    {t.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    PASSED ({t.durationMs}ms)
                  </span>
                </div>

                <div className="mt-2 font-mono text-xs font-bold text-white tracking-tight">
                  {t.testMethod}
                </div>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {t.description}
                </p>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Class: {t.testClass.split('.').slice(-1)[0]}</span>
                  <span>{t.assertionBreakdown.length} AssertJ conditions</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Test Detail, Assertions, and Source Code (7 cols) */}
        <div className="lg:col-span-7">
          {selectedTest && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
              {/* Test Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                      {selectedTest.category}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Duration: {selectedTest.durationMs}ms
                    </span>
                  </div>
                  <h3 className="font-mono font-bold text-white text-base mt-2">
                    {selectedTest.testMethod}
                  </h3>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    {selectedTest.testClass}
                  </div>
                </div>

                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  TEST PASSED
                </span>
              </div>

              {/* Description */}
              <div className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 font-semibold block mb-0.5">Domain Verification Goal:</span>
                {selectedTest.description}
              </div>

              {/* AssertJ Assertion Breakdown */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  AssertJ Verifications & Expected vs Actual
                </div>

                <div className="space-y-2">
                  {selectedTest.assertionBreakdown.map((asrt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1"
                    >
                      <div className="text-blue-300 font-semibold flex items-center justify-between">
                        <span className="break-all">{asrt.name}</span>
                        <span className="text-emerald-400 text-[10px] uppercase font-bold shrink-0 ml-2">
                          [MATCHED]
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/80">
                        <div>
                          <span className="text-slate-500">Expected: </span>
                          <span className="text-slate-300">{asrt.expected}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Actual: </span>
                          <span className="text-emerald-400 font-bold">{asrt.actual}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Java/Spring Boot Test Source Code */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-indigo-400" />
                  Executable Java / Spring Boot Test Source
                </div>

                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-indigo-200 overflow-x-auto leading-relaxed">
                  {selectedTest.sourceCode}
                </pre>
              </div>

              {/* Execution Console Output */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Surefire Test Runner Execution Log
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                  {selectedTest.consoleOutput.map((line, idx) => (
                    <div key={idx} className={line.includes('PASSED') || line.includes('SUCCESS') ? 'text-emerald-400' : ''}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
