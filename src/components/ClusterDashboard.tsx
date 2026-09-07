import React, { useState } from 'react';
import {
  Server,
  Activity,
  ShieldCheck,
  Zap,
  RefreshCw,
  AlertTriangle,
  Cpu,
  Database,
  Radio,
  Clock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { ClusterNode } from '../types/pbx';

interface ClusterDashboardProps {
  clusterNodes: ClusterNode[];
  onTriggerFailover: () => void;
  isFailoverSimulated: boolean;
}

export const ClusterDashboard: React.FC<ClusterDashboardProps> = ({
  clusterNodes,
  onTriggerFailover,
  isFailoverSimulated
}) => {
  const [eventLogs, setEventLogs] = useState<string[]>([
    '[10:40:12] Corosync: Totem ring operational (nodes: 3, quorum: OK)',
    '[10:41:05] MariaDB Galera: wsrep_local_state_comment=Synced (view: 3 nodi)',
    '[10:42:19] Keepalived: VRRP Instance VI_PBX state=MASTER su 192.168.10.101 (VIP 192.168.10.100 attiva)',
    '[10:43:00] Kamailio Dispatcher: 2 nodi PBX attivi in pool bilanciamento (Round-Robin)'
  ]);

  const handleSimulateFailover = () => {
    onTriggerFailover();
    const ts = new Date().toLocaleTimeString();
    if (!isFailoverSimulated) {
      setEventLogs((prev) => [
        `[${ts}] [ATTENZIONE] Simulazione disconnessione heartbeat su Master (Node 1)...`,
        `[${ts}] Keepalived: Pacemaker segnala fallimento check_asterisk su Node 1`,
        `[${ts}] Keepalived: Transizione VRRP -> Node 2 assume lo stato MASTER!`,
        `[${ts}] [SUCCESS] Virtual IP 192.168.10.100 assegnato a Node 2 in 420ms. Zero chiamate perse!`,
        ...prev
      ]);
    } else {
      setEventLogs((prev) => [
        `[${ts}] [INFO] Ripristino nodo primario Node 1...`,
        `[${ts}] Galera wsrep sincronizzato (IST delta applicato).`,
        `[${ts}] Keepalived: Ritorno VIP a Node 1 in modalità preemption controllata.`,
        ...prev
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Failover Action */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Server className="w-5 h-5 text-sky-400" />
            <span>Dashboard Monitoraggio Nodi Cluster PBX</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Alta Affidabilità (HA) con Virtual IP Corosync/Keepalived, Galera Multi-Master e Kamailio WebRTC Dispatcher.
          </p>
        </div>

        <button
          id="btn-trigger-failover"
          onClick={handleSimulateFailover}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition ${
            isFailoverSimulated
              ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>{isFailoverSimulated ? 'Ripristina Nodo Master' : 'Simula Failover Cluster'}</span>
        </button>
      </div>

      {/* Cluster Status Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Virtual IP (VIP Galleggiante)</span>
          <div className="text-lg font-mono font-bold text-white flex items-center space-x-2">
            <span>192.168.10.100</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">
            Assegnato a: {isFailoverSimulated ? 'pbx-standby-02 (Node 2)' : 'pbx-master-01 (Node 1)'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Quorum Corosync & Pacemaker</span>
          <div className="text-lg font-bold text-emerald-400 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5" />
            <span>Quorum Raggiunto (3/3)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Heartbeat attivo ogni 500ms</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Database Galera Multi-Master</span>
          <div className="text-lg font-bold text-white font-mono flex items-center space-x-2">
            <Database className="w-5 h-5 text-sky-400" />
            <span>WSREP Synced</span>
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Replica sincrona (lag: 1.2ms)</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Kamailio WebRTC Edge</span>
          <div className="text-lg font-bold text-indigo-400 font-mono">24 Sessioni WSS</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Porta 8089 TLS Certbot</span>
        </div>
      </div>

      {/* Nodes Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {clusterNodes.map((node) => {
          const isVipOwner = isFailoverSimulated ? node.role === 'secondary' : node.role === 'primary';

          return (
            <div
              key={node.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4 transition ${
                isVipOwner
                  ? 'border-sky-500/80 ring-1 ring-sky-500/30'
                  : 'border-slate-800'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-white text-base">{node.name}</h3>
                    {isVipOwner && (
                      <span className="bg-sky-950 text-sky-300 border border-sky-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                        VIP MASTER
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-sky-400 mt-0.5">{node.ip}</div>
                </div>

                <span
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    node.status === 'active'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      node.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  ></span>
                  <span className="capitalize">{node.status}</span>
                </span>
              </div>

              {/* Version & Role */}
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="text-slate-400">Ruolo Nodo:</div>
                <div className="font-semibold text-white uppercase text-[11px]">
                  {node.role.replace('_', ' ')}
                </div>
                <div className="text-[11px] text-slate-400 truncate">{node.asteriskVersion}</div>
              </div>

              {/* Live Gauges */}
              <div className="space-y-3 text-xs">
                {/* CPU */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center space-x-1">
                      <Cpu className="w-3.5 h-3.5 text-sky-400" />
                      <span>Utilizzo CPU</span>
                    </span>
                    <span className="font-mono text-white font-semibold">{node.cpuUsage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${node.cpuUsage}%` }}
                    ></div>
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center space-x-1">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Utilizzo RAM</span>
                    </span>
                    <span className="font-mono text-white font-semibold">{node.ramUsage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${node.ramUsage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Status details */}
              <div className="pt-3 border-t border-slate-800 text-xs space-y-2 text-slate-400">
                <div className="flex justify-between">
                  <span>Canali SIP Attivi:</span>
                  <span className="font-mono text-emerald-400 font-bold">{node.activeChannels}</span>
                </div>
                <div className="flex justify-between">
                  <span>Peer SIP Registrati:</span>
                  <span className="font-mono text-white">{node.sipPeersRegistered}</span>
                </div>
                <div className="flex justify-between">
                  <span>Latenza Ping:</span>
                  <span className="font-mono text-emerald-400">{node.pingLatencyMs} ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Galera State:</span>
                  <span className="font-mono text-emerald-400">{node.galeraStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime Sistema:</span>
                  <span className="font-mono text-slate-300">{node.uptime}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Cluster Failover Event Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Eventi Cluster & Corosync Live Log</span>
          </div>
          <span className="text-[11px] text-slate-400">Aggiornato in tempo reale</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs space-y-1.5 text-slate-300 max-h-48 overflow-y-auto border border-slate-800">
          {eventLogs.map((log, i) => (
            <div
              key={i}
              className={`${
                log.includes('[SUCCESS]')
                  ? 'text-emerald-400 font-semibold'
                  : log.includes('[ATTENZIONE]')
                  ? 'text-amber-400 font-semibold'
                  : 'text-slate-300'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
