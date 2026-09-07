import React, { useState } from 'react';
import {
  Activity,
  PhoneIncoming,
  PhoneOutgoing,
  GitFork,
  Users,
  Plus,
  Trash2,
  Code,
  Check,
  Copy,
  ChevronRight,
  ArrowRight,
  Volume2
} from 'lucide-react';
import { InboundRoute, OutboundRoute, IVRMenu, RingGroup, Extension } from '../types/pbx';

interface DialplanManagerProps {
  inboundRoutes: InboundRoute[];
  outboundRoutes: OutboundRoute[];
  ivrMenus: IVRMenu[];
  ringGroups: RingGroup[];
  extensions: Extension[];
  onAddInbound: (route: InboundRoute) => void;
  onDeleteInbound: (id: string) => void;
  onAddOutbound: (route: OutboundRoute) => void;
  onDeleteOutbound: (id: string) => void;
}

export const DialplanManager: React.FC<DialplanManagerProps> = ({
  inboundRoutes,
  outboundRoutes,
  ivrMenus,
  ringGroups,
  extensions,
  onAddInbound,
  onDeleteInbound,
  onAddOutbound,
  onDeleteOutbound
}) => {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound' | 'ivr' | 'ringgroups'>('inbound');
  const [isDialplanModalOpen, setIsDialplanModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Inbound modal state
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
  const [newInbound, setNewInbound] = useState<Partial<InboundRoute>>({
    name: '',
    didNumber: '',
    destinationType: 'ivr',
    destinationId: 'ivr-1',
    description: '',
    cidPrefix: ''
  });

  const handleCreateInbound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInbound.name || !newInbound.didNumber) {
      alert('Specificare nome rotta e numero DID');
      return;
    }
    onAddInbound({
      ...newInbound,
      id: `in-${Date.now()}`
    } as InboundRoute);
    setIsInboundModalOpen(false);
  };

  const generateFullExtensionsConf = () => {
    return `; =========================================================
; Asterisk Dialplan (extensions.conf) generato automaticamente
; Data esportazione: ${new Date().toISOString()}
; =========================================================

[general]
static=yes
writeprotect=no

[globals]
TRUNK_TIM=PJSIP/tim-trunk
TRUNK_FASTWEB=PJSIP/fastweb-trunk

; --- ROTTE DI ENTRATA (INBOUND ROUTES) ---
[from-trunk-tim]
${inboundRoutes
  .map(
    (inb) => `exten => ${inb.didNumber},1,NoOp(Inbound DID ${inb.didNumber} - ${inb.name})
 same => n,Set(CALLERID(name)=${inb.cidPrefix || ''}\${CALLERID(name)})
 same => n,Goto(${
   inb.destinationType === 'ivr'
     ? 'ivr-principale,s,1'
     : inb.destinationType === 'ring_group'
     ? 'internal-context,600,1'
     : `internal-context,${inb.destinationId},1`
 })`
  )
  .join('\n\n')}

; --- MENU RISPONDITORE VOCALE (IVR AZIENDALE) ---
[ivr-principale]
exten => s,1,Answer()
 same => n,Wait(1)
 same => n,Background(custom/prompt_benvenuto_italiano)
 same => n,WaitExten(8)
${ivrMenus[0]?.options
  .map(
    (opt) => `exten => ${opt.digit},1,NoOp(Selezione ${opt.digit} - ${opt.description})
 same => n,Goto(internal-context,${opt.destinationId.replace('rg-', '60').replace('ext-', '')},1)`
  )
  .join('\n')}
exten => t,1,Goto(internal-context,101,1)
exten => i,1,Playback(invalid)
 same => n,Goto(s,1)

; --- GRUPPI DI RISPOSTA (RING GROUPS) ---
${ringGroups
  .map(
    (rg) => `exten => ${rg.number},1,NoOp(Gruppo ${rg.name})
 same => n,Dial(${rg.members.map((m) => `PJSIP/${m}`).join('&')},${rg.ringTime},m(default))
 same => n,VoiceMail(${rg.destinationOnNoAnswer.id.replace('ext-', '')}@default,u)
 same => n,Hangup()`
  )
  .join('\n\n')}

; --- ROTTE DI USCITA (OUTBOUND ROUTES) ---
[outbound-dialer]
${outboundRoutes
  .map(
    (out) => `exten => _${out.dialPattern},1,NoOp(Uscita su ${out.trunk})
 same => n,Dial(${out.trunk}/\${EXTEN:${out.stripDigits}},60,T)
 ${out.failoverTrunk ? `same => n,GotoIf($["\${DIALSTATUS}" = "CONGESTION"]?failover:hangup)\nsame => n(failover),Dial(${out.failoverTrunk}/\${EXTEN:${out.stripDigits}},60,T)` : ''}
 same => n(hangup),Hangup()`
  )
  .join('\n\n')}
`;
  };

  const copyDialplan = () => {
    navigator.clipboard.writeText(generateFullExtensionsConf());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Dialplan Exporter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-sky-400" />
            <span>Dialplan, Routing & IVR Flow</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestione rotte in entrata DID, rotte di uscita verso Trunk SIP, risponderia IVR e gruppi di suoneria.
          </p>
        </div>

        <button
          id="btn-export-dialplan"
          onClick={() => setIsDialplanModalOpen(true)}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow transition"
        >
          <Code className="w-4 h-4" />
          <span>Esporta extensions.conf</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs">
        <button
          id="tab-inbound"
          onClick={() => setActiveTab('inbound')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-semibold transition ${
            activeTab === 'inbound'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <PhoneIncoming className="w-4 h-4" />
          <span>Rotte di Entrata ({inboundRoutes.length})</span>
        </button>

        <button
          id="tab-outbound"
          onClick={() => setActiveTab('outbound')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-semibold transition ${
            activeTab === 'outbound'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <PhoneOutgoing className="w-4 h-4" />
          <span>Rotte di Uscita ({outboundRoutes.length})</span>
        </button>

        <button
          id="tab-ivr"
          onClick={() => setActiveTab('ivr')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-semibold transition ${
            activeTab === 'ivr'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <GitFork className="w-4 h-4" />
          <span>Visual IVR Designer</span>
        </button>

        <button
          id="tab-ringgroups"
          onClick={() => setActiveTab('ringgroups')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-semibold transition ${
            activeTab === 'ringgroups'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gruppi di Risposta ({ringGroups.length})</span>
        </button>
      </div>

      {/* TAB 1: INBOUND ROUTES */}
      {activeTab === 'inbound' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Instradamento Numeri Geografici DID</h3>
            <button
              onClick={() => setIsInboundModalOpen(true)}
              className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi Regola DID</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inboundRoutes.map((route) => (
              <div
                key={route.id}
                className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm hover:border-slate-700 transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{route.name}</div>
                    <div className="font-mono text-xs text-sky-400 font-semibold">{route.didNumber}</div>
                  </div>
                  <button
                    onClick={() => onDeleteInbound(route.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400">Destinazione Flusso:</div>
                  <div className="font-semibold text-emerald-400 flex items-center space-x-1">
                    <ArrowRight className="w-3 h-3" />
                    <span className="uppercase">{route.destinationType}</span>
                    <span className="text-slate-300">({route.destinationId})</span>
                  </div>
                  {route.cidPrefix && (
                    <div className="text-[11px] text-slate-400">
                      Prefisso CallerID: <span className="text-amber-300 font-mono">{route.cidPrefix}</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">{route.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: OUTBOUND ROUTES */}
      {activeTab === 'outbound' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Priorità</th>
                <th className="py-3 px-4">Nome Rotta</th>
                <th className="py-3 px-4">Pattern Asterisk</th>
                <th className="py-3 px-4">Trunk Primario</th>
                <th className="py-3 px-4">Trunk Failover</th>
                <th className="py-3 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {outboundRoutes.map((route) => (
                <tr key={route.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-sky-400">#{route.priority}</td>
                  <td className="py-3 px-4 font-semibold text-white">{route.name}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400">{route.dialPattern}</td>
                  <td className="py-3 px-4 font-mono text-xs">{route.trunk}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-400">
                    {route.failoverTrunk || 'Nessuno'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onDeleteOutbound(route.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: VISUAL IVR DESIGNER */}
      {activeTab === 'ivr' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <GitFork className="w-5 h-5 text-sky-400" />
                <span>IVR Risponditore Automatico: {ivrMenus[0]?.name}</span>
              </h3>
              <p className="text-xs text-slate-400">
                Audio di benvenuto: <span className="font-mono text-sky-300">{ivrMenus[0]?.greetingPrompt}</span> • Timeout: {ivrMenus[0]?.timeout}s
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-emerald-950 text-emerald-300 px-3 py-1 rounded-lg border border-emerald-800">
                Stato: Attivo in Produzione
              </span>
            </div>
          </div>

          {/* Interactive Flow Tree Diagram */}
          <div className="space-y-4">
            {/* Root Node */}
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-r from-sky-900/80 to-indigo-900/80 border-2 border-sky-500/80 rounded-2xl p-4 max-w-md w-full text-center shadow-lg">
                <div className="flex items-center justify-center space-x-2 text-sky-300 text-xs font-bold mb-1">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>MESSAGGIO DI BENVENUTO AZIENDALE</span>
                </div>
                <p className="text-xs text-slate-200">
                  "Grazie per aver chiamato. Per il commerciale prema 1, per l'assistenza prema 2, per l'amministrazione prema 3..."
                </p>
              </div>

              {/* Connecting line */}
              <div className="w-0.5 h-8 bg-sky-500/50"></div>
            </div>

            {/* Options Branches */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {ivrMenus[0]?.options.map((opt) => (
                <div
                  key={opt.digit}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm hover:border-sky-500 transition"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="w-8 h-8 rounded-lg bg-sky-600 text-white font-mono font-bold text-base flex items-center justify-center shadow">
                      {opt.digit}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">Tasto {opt.digit}</div>
                      <div className="text-[11px] text-slate-400">{opt.description}</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
                    <div className="text-slate-400">Destinazione Chiamata:</div>
                    <div className="font-semibold text-emerald-400 font-mono">
                      {opt.destinationType.toUpperCase()} → {opt.destinationId}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Timeout Fallback */}
            <div className="mt-4 p-3 bg-slate-800/40 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>Azione su Timeout (nessun tasto premuto entro 8 sec):</span>
              <span className="font-semibold text-sky-400">Inoltro ad Operatore (Int. 101)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RING GROUPS */}
      {activeTab === 'ringgroups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ringGroups.map((rg) => (
            <div
              key={rg.id}
              className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold bg-slate-800 px-2.5 py-0.5 rounded text-sky-400 border border-slate-700">
                    Gruppo {rg.number}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{rg.name}</h3>
                </div>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase">
                  Strategia: {rg.strategy}
                </span>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1.5">Membri del gruppo di risposta:</div>
                <div className="flex flex-wrap gap-1.5">
                  {rg.members.map((m) => {
                    const extInfo = extensions.find((e) => e.number === m);
                    return (
                      <span
                        key={m}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-mono text-slate-200 border border-slate-700"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>
                          {m} ({extInfo ? extInfo.name : 'SIP'})
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
                <span>Tempo suoneria: {rg.ringTime} secondi</span>
                <span>Fallimento: Voicemail {rg.destinationOnNoAnswer.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export extensions.conf Modal */}
      {isDialplanModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white">Asterisk extensions.conf Esportato</h3>
              </div>
              <button
                onClick={() => setIsDialplanModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="relative mb-4">
              <pre className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800 max-h-96">
                {generateFullExtensionsConf()}
              </pre>
              <button
                onClick={copyDialplan}
                className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiato!' : 'Copia File'}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsDialplanModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Inbound Route Modal */}
      {isInboundModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white">Nuova Rotta di Entrata (DID)</h3>
              <button
                onClick={() => setIsInboundModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInbound} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nome Identificativo *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Sede Roma Linea 2"
                  value={newInbound.name || ''}
                  onChange={(e) => setNewInbound({ ...newInbound, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Numero DID (Formato E.164) *</label>
                <input
                  type="text"
                  required
                  placeholder="es. +39061234567"
                  value={newInbound.didNumber || ''}
                  onChange={(e) => setNewInbound({ ...newInbound, didNumber: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Destinazione</label>
                <select
                  value={newInbound.destinationType || 'ivr'}
                  onChange={(e) =>
                    setNewInbound({
                      ...newInbound,
                      destinationType: e.target.value as any,
                      destinationId: e.target.value === 'ivr' ? 'ivr-1' : e.target.value === 'ring_group' ? 'rg-1' : 'ext-101'
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="ivr">IVR Risponditore Automatico</option>
                  <option value="ring_group">Gruppo di Risposta</option>
                  <option value="extension">Interno Diretto</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Prefisso CallerID (Opzionale)</label>
                <input
                  type="text"
                  placeholder="es. [ROMA]"
                  value={newInbound.cidPrefix || ''}
                  onChange={(e) => setNewInbound({ ...newInbound, cidPrefix: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInboundModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg"
                >
                  Salva Rotta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
