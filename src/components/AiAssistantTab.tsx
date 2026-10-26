import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Scale,
  Send,
  Copy,
  Check,
  MessageSquare,
} from 'lucide-react';
import { PgCase, UserRole } from '../types';
import { PRESET_CLAUSES } from '../data/mockData';
import {
  analyzeTenancyClause,
  askPgOllamaAssistant,
} from '../services/legalService';

interface AiAssistantTabProps {
  activeCase: PgCase;
  role?: UserRole;
  allCases?: PgCase[];
}

export const AiAssistantTab: React.FC<AiAssistantTabProps> = ({
  activeCase,
  role = 'resident',
  allCases = [activeCase],
}) => {
  const [mode, setMode] = useState<'copilot' | 'clause_scanner'>('copilot');
  const [question, setQuestion] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);

  const buildWelcomeMessage = (c: PgCase, r: UserRole) => {
    const totalDeductions = c.deductions.reduce((s, d) => s + d.amount, 0);
    const depositRemaining = Math.max(0, c.securityDeposit - totalDeductions);
    return r === 'owner'
      ? `Hello ${c.landlordName}! Ask any question about sending monthly rent emails, logging move-out damages, generating legal notices, or managing ${c.roomCode}.`
      : `Hello ${c.tenantName}! For ${c.roomNo} (${c.roomCode}), your Net Deposit Remaining is ₹${depositRemaining.toLocaleString('en-IN')}. Ask any question below.`;
  };

  const [chatHistory, setChatHistory] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >(() => [{ role: 'assistant', text: buildWelcomeMessage(activeCase, role) }]);

  useEffect(() => {
    setChatHistory([
      { role: 'assistant', text: buildWelcomeMessage(activeCase, role) },
    ]);
  }, [activeCase.id, role]);

  // Clause Checker State
  const [clauseText, setClauseText] = useState(
    'If the tenant damages any apartment appliance or furniture during their stay, the actual repair cost shall be deducted from the security deposit.'
  );
  const [disputeType, setDisputeType] = useState('appliance');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const residentPrompts = [
    'What is my deposit balance and damage breakdown?',
    'When is my monthly rent due and how do I pay?',
    'What is my notice period and electricity bill?',
    'Where can I see my rent email notices and receipts?',
  ];

  const ownerPrompts = [
    'How do I send a monthly rent notice to the tenant email?',
    'How do I generate a legal notice for move-out damage?',
    'How do I upload my QR code and verify UTR receipts?',
    'What is the deposit and damage summary for this unit?',
  ];

  const activePrompts = role === 'owner' ? ownerPrompts : residentPrompts;

  const handleAskCopilot = async (promptText: string) => {
    const cleanQ = promptText.trim();
    if (!cleanQ || copilotLoading) return;

    setChatHistory((prev) => [...prev, { role: 'user', text: cleanQ }]);
    setQuestion('');
    setCopilotLoading(true);

    try {
      const res = await askPgOllamaAssistant(
        cleanQ,
        role,
        activeCase,
        allCases
      );
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', text: res.reply },
      ]);
    } catch (_e) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Please check the relevant tab for your apartment rent, deposit, or receipt details.',
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleSelectPreset = (preset: (typeof PRESET_CLAUSES)[0]) => {
    setClauseText(preset.clause);
    setDisputeType('appliance');
  };

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clauseText.trim()) return;

    setLoading(true);
    setAnalysisResult(null);

    try {
      const res = await analyzeTenancyClause(clauseText, disputeType);
      setAnalysisResult(res.analysis);
    } catch (_err: any) {
      setAnalysisResult('Error running assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRebuttal = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Compact Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Smart Assistant ({activeCase.roomCode})
          </h2>
          <p className="text-xs text-slate-500">
            Ask any question for an instant, direct answer.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('copilot')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              mode === 'copilot'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ask Anything</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('clause_scanner')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              mode === 'clause_scanner'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
            <span>Clause Checker</span>
          </button>
        </div>
      </div>

      {/* MODE 1: ASK ANYTHING */}
      {mode === 'copilot' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          {/* Quick Prompts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {activePrompts.map((prompt, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleAskCopilot(prompt)}
                className="text-left px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-semibold text-slate-800 transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <span>{prompt}</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </button>
            ))}
          </div>

          {/* Conversation Thread */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl text-xs leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white ml-auto max-w-lg font-medium'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {copilotLoading && (
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                <span>Answering...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskCopilot(question);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask any question..."
              className="flex-1 text-xs px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-600 bg-slate-50 focus:bg-white"
            />
            <button
              type="submit"
              disabled={copilotLoading || !question.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      )}

      {/* MODE 2: CLAUSE CHECKER */}
      {mode === 'clause_scanner' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase">
              Sample Clauses
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {PRESET_CLAUSES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-xs text-slate-900 block">
                    {preset.title}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    &ldquo;{preset.clause}&rdquo;
                  </p>
                </button>
              ))}
            </div>

            <form onSubmit={handleRunAnalysis} className="space-y-3 pt-2">
              <textarea
                rows={3}
                required
                value={clauseText}
                onChange={(e) => setClauseText(e.target.value)}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-emerald-600 bg-slate-50"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={disputeType}
                  onChange={(e) => setDisputeType(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs"
                >
                  <option value="appliance">Appliance & Furniture</option>
                  <option value="structural">Glass & Structural</option>
                  <option value="painting">Wall & Paint</option>
                  <option value="notice">Notice Period</option>
                </select>

                <button
                  type="submit"
                  disabled={loading || !clauseText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{loading ? 'Checking...' : 'Check Clause'}</span>
                </button>
              </div>
            </form>
          </div>

          {analysisResult && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs uppercase">
                  Legal Assessment
                </h3>
                <button
                  onClick={handleCopyRebuttal}
                  className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-xs leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {analysisResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
