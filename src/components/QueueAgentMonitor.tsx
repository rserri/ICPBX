import React, { useState, useEffect } from 'react';
import {
  Headphones,
  PhoneCall,
  PhoneOff,
  Clock,
  UserCheck,
  UserX,
  Volume2,
  Ear,
  Radio,
  PauseCircle,
  PlayCircle,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Shield,
  Activity,
  ArrowRight,
  Sparkles,
  PhoneIncoming,
  Users
} from 'lucide-react';
import { CallQueue, Extension, QueueAgentLiveState, AgentQueueStatus } from '../types/pbx';

interface QueueAgentMonitorProps {
  queues: CallQueue[];
  extensions: Extension[];
  onDialNumber: (number: string) => void;
}

export const QueueAgentMonitor: React.FC<QueueAgentMonitorProps> = ({
  queues,
  extensions,
  onDialNumber
}) => {
  const [selectedQueueId, setSelectedQueueId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [activeSpySession, setActiveSpySession] = useState<{ agentName: string; ext: string } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Initialize realistic live agent state based on queues and extensions
  const [agentStates, setAgentStates] = useState<QueueAgentLiveState[]>(() => {
    // Generate initial live agent states for members across queues
    const initialStates: QueueAgentLiveState[] = [];

    queues.forEach((q) => {
      q.members.forEach((extNum, idx) => {
        const ext = extensions.find((e) => e.number === extNum);
        const name = ext?.name || `Operatore ${extNum}`;
        const department = ext?.department || 'Supporto';

        // Stagger some busy agents with realistic current talk times
        let status: AgentQueueStatus = 'ready';
        let currentTalkTime = 0;
        let callerNumber: string | undefined;
        let callerName: string | undefined;
        let idleSince = 145 + idx * 60;
        let pausedReason: string | undefined;

        if (q.number === '700' && extNum === '103') {
          // Agent 103 is busy on a call
          status = 'busy';
          currentTalkTime = 142; // 2m 22s
          callerNumber = '+39 02 8712 3456';
          callerName = 'Studio Legale Rossi & Partners';
        } else if (q.number === '701' && extNum === '102') {
          // Agent 102 is busy on a call
          status = 'busy';
          currentTalkTime = 285; // 4m 45s
          callerNumber = '+39 348 9988112';
          callerName = 'Dr.ssa Valeria Conti (Milano)';
        } else if (q.number === '700' && extNum === '105') {
          status = ext?.status === 'dnd' ? 'paused' : 'ready';
          pausedReason = ext?.status === 'dnd' ? 'Pausa Post-Chiamata (Wrap-up)' : undefined;
        } else if (ext?.status === 'offline') {
          status = 'offline';
        }

        initialStates.push({
          extensionNumber: extNum,
          name,
          department,
          queueNumber: q.number,
          queueName: q.name,
          status,
          currentTalkTimeSeconds: currentTalkTime,
          callStartTime: status === 'busy' ? Date.now() - currentTalkTime * 1000 : undefined,
          callerNumber,
          callerName,
          callsAnsweredToday: 12 + idx * 5 + (status === 'busy' ? 1 : 0),
          lastCallTimestamp: '10:42:10',
          idleSinceSeconds: idleSince,
          pausedReason
        });
      });
    });

    return initialStates;
  });

  // REAL-TIME LIVE TIMER ENGINE: Ticks every 1000ms to increment talk time for all busy agents!
  useEffect(() => {
    const timer = setInterval(() => {
      setAgentStates((prevStates) =>
        prevStates.map((agent) => {
          if (agent.status === 'busy') {
            const newTalkTime = (agent.currentTalkTimeSeconds || 0) + 1;
            return {
              ...agent,
              currentTalkTimeSeconds: newTalkTime
            };
          } else if (agent.status === 'ready') {
            return {
              ...agent,
              idleSinceSeconds: (agent.idleSinceSeconds || 0) + 1
            };
          }
          return agent;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format seconds into MM:SS or HH:MM:SS
  const formatDuration = (seconds: number = 0) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle agent status between Ready and Busy (Live simulation)
  const handleToggleAgentCall = (agent: QueueAgentLiveState) => {
    setAgentStates((prev) =>
      prev.map((a) => {
        if (a.extensionNumber === agent.extensionNumber && a.queueNumber === agent.queueNumber) {
          if (a.status === 'busy') {
            // End call -> go to ready
            setActionNotice(`Chiamata terminata su Int. ${a.extensionNumber} (${a.name}). Durata finale: ${formatDuration(a.currentTalkTimeSeconds)}.`);
            setTimeout(() => setActionNotice(null), 4000);
            return {
              ...a,
              status: 'ready',
              currentTalkTimeSeconds: 0,
              callStartTime: undefined,
              callerNumber: undefined,
              callerName: undefined,
              idleSinceSeconds: 0,
              lastCallTimestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
          } else {
            // Start call -> go to busy
            setActionNotice(`Nuova chiamata collegata ad operatore Int. ${a.extensionNumber} (${a.name}) dalla coda ${a.queueNumber}!`);
            setTimeout(() => setActionNotice(null), 4000);
            const mockCallers = [
              { num: '+39 06 6982 1100', name: 'Studio Notarile Bianchi & Co.' },
              { num: '+39 335 1289456', name: 'Ing. Roberto Moretti' },
              { num: '+39 02 4455 6677', name: 'Fornitore Server Cloud Italia' },
              { num: '+39 011 778899', name: 'Cliente Enterprise Torino' }
            ];
            const caller = mockCallers[Math.floor(Math.random() * mockCallers.length)];

            return {
              ...a,
              status: 'busy',
              currentTalkTimeSeconds: 1,
              callStartTime: Date.now(),
              callerNumber: caller.num,
              callerName: caller.name,
              callsAnsweredToday: a.callsAnsweredToday + 1
            };
          }
        }
        return a;
      })
    );
  };

  // Toggle Pause/Resume for agent (Asterisk QueuePause)
  const handleTogglePause = (agent: QueueAgentLiveState) => {
    setAgentStates((prev) =>
      prev.map((a) => {
        if (a.extensionNumber === agent.extensionNumber && a.queueNumber === agent.queueNumber) {
          const isNowPaused = a.status !== 'paused';
          setActionNotice(
            isNowPaused
              ? `Operatore Int. ${a.extensionNumber} (${a.name}) impostato in PAUSA (QueuePause).`
              : `Operatore Int. ${a.extensionNumber} (${a.name}) ripristinato in stato PRONTO.`
          );
          setTimeout(() => setActionNotice(null), 3500);

          return {
            ...a,
            status: isNowPaused ? 'paused' : 'ready',
            pausedReason: isNowPaused ? 'Pausa Operatore (Backoffice)' : undefined,
            idleSinceSeconds: 0
          };
        }
        return a;
      })
    );
  };

  // ChanSpy Supervisor Whisper Simulation
  const handleChanSpy = (agent: QueueAgentLiveState) => {
    setActiveSpySession({ agentName: agent.name, ext: agent.extensionNumber });
    setActionNotice(`Attivata sessione ChanSpy (Ascolto Supervisore) sul canale PJSIP/${agent.extensionNumber}.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Filtered agents
  const filteredAgents = agentStates.filter((agent) => {
    const matchesQueue = selectedQueueId === 'all' || agent.queueNumber === selectedQueueId;
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    const matchesSearch =
      agent.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      agent.extensionNumber.includes(searchFilter) ||
      agent.department.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (agent.callerName && agent.callerName.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (agent.callerNumber && agent.callerNumber.includes(searchFilter));

    return matchesQueue && matchesStatus && matchesSearch;
  });

  // Calculate live statistics for selected scope
  const targetScopeAgents = agentStates.filter(
    (a) => selectedQueueId === 'all' || a.queueNumber === selectedQueueId
  );
  const countReady = targetScopeAgents.filter((a) => a.status === 'ready').length;
  const countBusy = targetScopeAgents.filter((a) => a.status === 'busy').length;
  const countPaused = targetScopeAgents.filter((a) => a.status === 'paused').length;
  const countOffline = targetScopeAgents.filter((a) => a.status === 'offline').length;
  const totalAgents = targetScopeAgents.length;
  const occupancyRate = totalAgents > 0 ? Math.round((countBusy / totalAgents) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5" id="queue-agent-realtime-monitor">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Pannello di Monitoraggio Agenti in Tempo Reale
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live AMI Stream
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Stato attivo degli operatori (Pronto/Occupato), tempo di conversazione corrente in secondi e supervisione chiamate.
            </p>
          </div>
        </div>

        {/* Action Notice feedback */}
        {actionNotice && (
          <div className="p-2 px-3 bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* ChanSpy Active Modal Toast */}
        {activeSpySession && (
          <div className="flex items-center gap-2 bg-purple-950/60 border border-purple-600/70 p-2 px-3 rounded-xl text-xs text-purple-200">
            <Ear className="w-4 h-4 text-purple-400 animate-bounce" />
            <span>
              Ascolto ChanSpy attivo su <strong>{activeSpySession.agentName}</strong> ({activeSpySession.ext})
            </span>
            <button
              onClick={() => setActiveSpySession(null)}
              className="ml-2 text-[10px] bg-purple-900 hover:bg-purple-800 text-white px-2 py-0.5 rounded-md"
            >
              Termina
            </button>
          </div>
        )}
      </div>

      {/* Queue Scope Selector & Filter Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5 text-sky-400" />
            <span>Coda:</span>
          </span>

          <button
            onClick={() => setSelectedQueueId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedQueueId === 'all'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Tutte le Code
          </button>

          {queues.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelectedQueueId(q.number)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedQueueId === q.number
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="font-mono text-sky-300 font-bold">{q.number}</span>
              <span className="truncate max-w-[120px]">{q.name.split(' ')[1] || q.name}</span>
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Cerca operatore..."
              className="bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-36 sm:w-44"
            />
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 text-xs">
            {[
              { id: 'all', label: 'Tutti' },
              { id: 'ready', label: 'Pronti' },
              { id: 'busy', label: 'Occupati' },
              { id: 'paused', label: 'Pausa' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  statusFilter === st.id
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live State Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
          <div className="text-[11px] text-slate-400">Totale Operatori</div>
          <div className="text-xl font-bold text-white mt-0.5">{totalAgents}</div>
          <div className="text-[10px] text-slate-500">Membri configurati</div>
        </div>

        <div className="bg-slate-950/70 border border-emerald-900/30 rounded-2xl p-3">
          <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Pronti (Ready)</span>
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-0.5">{countReady}</div>
          <div className="text-[10px] text-slate-500">Disponibili a rispondere</div>
        </div>

        <div className="bg-slate-950/70 border border-rose-900/30 rounded-2xl p-3">
          <div className="text-[11px] text-rose-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Occupati (Busy)</span>
          </div>
          <div className="text-xl font-bold text-rose-400 mt-0.5">{countBusy}</div>
          <div className="text-[10px] text-slate-500">In conversazione ora</div>
        </div>

        <div className="bg-slate-950/70 border border-amber-900/30 rounded-2xl p-3">
          <div className="text-[11px] text-amber-400">In Pausa / DND</div>
          <div className="text-xl font-bold text-amber-400 mt-0.5">{countPaused}</div>
          <div className="text-[10px] text-slate-500">Non disponibili temporanei</div>
        </div>

        <div className="bg-slate-950/70 border border-purple-900/30 rounded-2xl p-3 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-purple-400">Tasso Occupazione</div>
          <div className="text-xl font-bold text-purple-400 mt-0.5">{occupancyRate}%</div>
          <div className="text-[10px] text-slate-500">Agenti impegnati</div>
        </div>
      </div>

      {/* Agents Live Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.length === 0 ? (
          <div className="col-span-full bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            Nessun operatore corrisponde ai filtri selezionati per questa coda.
          </div>
        ) : (
          filteredAgents.map((agent) => {
            const isBusy = agent.status === 'busy';
            const isReady = agent.status === 'ready';
            const isPaused = agent.status === 'paused';
            const talkTimeSec = agent.currentTalkTimeSeconds || 0;

            // Talk time alert levels: normal (<3m), warning (3-7m), alert (>7m)
            const talkTimeColor =
              talkTimeSec > 420
                ? 'text-rose-400 bg-rose-950/40 border-rose-600/50'
                : talkTimeSec > 180
                ? 'text-amber-400 bg-amber-950/40 border-amber-600/50'
                : 'text-emerald-400 bg-emerald-950/40 border-emerald-600/50';

            const queue = queues.find((q) => q.number === agent.queueNumber);

            return (
              <div
                key={`${agent.queueNumber}-${agent.extensionNumber}`}
                className={`bg-slate-950 border rounded-2xl p-4 transition shadow-sm flex flex-col justify-between space-y-3.5 ${
                  isBusy
                    ? 'border-rose-600/40 ring-1 ring-rose-500/20'
                    : isReady
                    ? 'border-emerald-600/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl font-mono font-bold flex items-center justify-center text-xs border ${
                        isBusy
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : isReady
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {agent.extensionNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          {agent.name}
                        </h4>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <span>{agent.department}</span>
                        <span>•</span>
                        <span className="text-sky-400 font-mono font-semibold">
                          Coda {agent.queueNumber}
                        </span>
                        {queue?.priority === 'high' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Prio Alta (W10)
                          </span>
                        ) : queue?.priority === 'low' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            Prio Bassa (W1)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Prio Media (W5)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                      isBusy
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : isReady
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : isPaused
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isBusy
                          ? 'bg-rose-400 animate-ping'
                          : isReady
                          ? 'bg-emerald-400'
                          : isPaused
                          ? 'bg-amber-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span>
                      {isBusy
                        ? 'OCCUPATO'
                        : isReady
                        ? 'PRONTO'
                        : isPaused
                        ? 'IN PAUSA'
                        : 'OFFLINE'}
                    </span>
                  </span>
                </div>

                {/* CURRENT TALK TIME BOX (If Active / Busy) */}
                {isBusy && (
                  <div className={`p-3 rounded-xl border space-y-2 ${talkTimeColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin text-rose-400" />
                        <span className="text-xs font-bold text-slate-200">
                          Tempo di Conversazione:
                        </span>
                      </div>
                      <div className="font-mono text-base font-extrabold tracking-wider">
                        {formatDuration(talkTimeSec)}
                      </div>
                    </div>

                    {/* Caller Info */}
                    <div className="pt-1.5 border-t border-slate-800/80 space-y-0.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[10px]">Chiamante:</span>
                        <span className="font-mono font-bold text-white">
                          {agent.callerNumber}
                        </span>
                      </div>
                      {agent.callerName && (
                        <div className="text-[11px] text-slate-300 font-medium truncate">
                          {agent.callerName}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* IDLE TIME BOX (If Ready) */}
                {isReady && (
                  <div className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>In attesa di chiamata:</span>
                    </div>
                    <span className="font-mono font-semibold text-emerald-400">
                      {formatDuration(agent.idleSinceSeconds || 0)}
                    </span>
                  </div>
                )}

                {/* PAUSED REASON BOX (If Paused) */}
                {isPaused && (
                  <div className="p-2.5 bg-amber-950/20 border border-amber-900/30 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300 text-[11px]">
                      <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>{agent.pausedReason || 'In Pausa Operatore'}</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold">QueuePause</span>
                  </div>
                )}

                {/* Statistics Footer (Calls taken today, last call) */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                  <span>
                    Chiamate oggi: <strong className="text-white">{agent.callsAnsweredToday}</strong>
                  </span>
                  <span>
                    Ultimo contatto: <strong className="text-slate-300">{agent.lastCallTimestamp || '-'}</strong>
                  </span>
                </div>

                {/* Interactive Supervisor Controls */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  {/* ChanSpy Whisper (if busy) */}
                  {isBusy ? (
                    <button
                      onClick={() => handleChanSpy(agent)}
                      title="Ascolto e suggerimento supervisore (Asterisk ChanSpy Whisper)"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 rounded-xl text-[11px] font-semibold border border-purple-800/50 transition"
                    >
                      <Ear className="w-3 h-3 text-purple-400" />
                      <span>ChanSpy</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onDialNumber(agent.extensionNumber)}
                      title={`Chiama interno ${agent.extensionNumber}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[11px] font-semibold border border-slate-800 transition"
                    >
                      <PhoneCall className="w-3 h-3 text-sky-400" />
                      <span>Interfono</span>
                    </button>
                  )}

                  {/* Toggle Pause button */}
                  <button
                    onClick={() => handleTogglePause(agent)}
                    title={isPaused ? 'Rendi disponibile operatore' : 'Metti operatore in pausa'}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition ${
                      isPaused
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/50'
                        : 'bg-slate-900 text-amber-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {isPaused ? (
                      <>
                        <PlayCircle className="w-3 h-3 text-emerald-400" />
                        <span>Riprendi</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle className="w-3 h-3 text-amber-400" />
                        <span>Pausa</span>
                      </>
                    )}
                  </button>

                  {/* Simulate call start/stop */}
                  <button
                    onClick={() => handleToggleAgentCall(agent)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
                      isBusy
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-sky-600 hover:bg-sky-500 text-white'
                    }`}
                  >
                    {isBusy ? (
                      <>
                        <PhoneOff className="w-3 h-3" />
                        <span>Chiudi</span>
                      </>
                    ) : (
                      <>
                        <PhoneCall className="w-3 h-3" />
                        <span>Simula</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
