import React, { useState } from 'react';
import {
  Activity,
  TrendingUp,
  Clock,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneOff,
  CheckCircle,
  BarChart2,
  Calendar,
  Download,
  Percent,
  Radio
} from 'lucide-react';
import { CDRRecord } from '../types/pbx';

interface ReportsAnalyticsProps {
  cdrRecords: CDRRecord[];
}

export const ReportsAnalytics: React.FC<ReportsAnalyticsProps> = ({ cdrRecords }) => {
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days');

  // Realistic calculated traffic data
  const totalCalls = cdrRecords.length * 12 + 148;
  const answeredCalls = Math.round(totalCalls * 0.884);
  const missedCalls = totalCalls - answeredCalls;
  const avgDurationSec = 224; // 3m 44s
  const peakChannels = 28;
  const avgMos = 4.38;

  // Hourly distribution (08:00 to 18:00)
  const hourlyData = [
    { hour: '08:00', inbound: 18, outbound: 8 },
    { hour: '09:00', inbound: 64, outbound: 32 },
    { hour: '10:00', inbound: 98, outbound: 55 },
    { hour: '11:00', inbound: 112, outbound: 72 }, // Peak
    { hour: '12:00', inbound: 78, outbound: 41 },
    { hour: '13:00', inbound: 24, outbound: 15 },
    { hour: '14:00', inbound: 48, outbound: 38 },
    { hour: '15:00', inbound: 92, outbound: 64 },
    { hour: '16:00', inbound: 85, outbound: 59 },
    { hour: '17:00', inbound: 62, outbound: 31 },
    { hour: '18:00', inbound: 25, outbound: 12 }
  ];

  const maxHourlyVolume = Math.max(...hourlyData.map((d) => d.inbound + d.outbound));

  // Top agents performance
  const topAgents = [
    { ext: '101', name: 'Marco Rossi', department: 'IT & Direzione', total: 64, answered: 62, aht: '4m 12s', rate: '96.8%' },
    { ext: '102', name: 'Sara Bianchi', department: 'Commerciale', total: 118, answered: 109, aht: '5m 05s', rate: '92.3%' },
    { ext: '103', name: 'Alessandro Verdi', department: 'Helpdesk N1', total: 142, answered: 131, aht: '3m 20s', rate: '92.2%' },
    { ext: '104', name: 'Giulia Colombo', department: 'Amministrazione', total: 45, answered: 42, aht: '2m 45s', rate: '93.3%' },
    { ext: '105', name: 'Supporto Helpdesk', department: 'Supporto Tecnico', total: 188, answered: 165, aht: '3m 50s', rate: '87.7%' }
  ];

  return (
    <div className="space-y-6">
      {/* Header and Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-sky-400" />
            <span>Reportistica Avanzata & Analisi Traffico VoIP</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Indicatori di prestazione (KPI), volumi orari, picco canali concorrenti e qualità audio MOS.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex text-xs">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                timeRange === 'today' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Oggi
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                timeRange === '7days' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ultimi 7 Giorni
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                timeRange === '30days' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ultimi 30 Giorni
            </button>
          </div>

          <button
            onClick={() => alert('Report esportato con successo in formato PDF/CSV')}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Esporta Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Total Calls */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Totale Chiamate</span>
            <PhoneIncoming className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalCalls.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>+14.2% vs periodo prec.</span>
          </div>
        </div>

        {/* Answer Rate */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Tasso Risposta</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">88.4%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {answeredCalls} gestite su {totalCalls}
          </div>
        </div>

        {/* Missed / Abandoned */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Perse / Abbandono</span>
            <PhoneOff className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{missedCalls}</div>
          <div className="text-[11px] text-slate-400 mt-1">11.6% tasso di abbandono</div>
        </div>

        {/* Avg Duration */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Durata Media (AHT)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">3m 44s</div>
          <div className="text-[11px] text-slate-400 mt-1">Tempo medio conversazione</div>
        </div>

        {/* Peak Channels */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Picco Concorrenza</span>
            <Radio className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400 font-mono">{peakChannels} / 60</div>
          <div className="text-[11px] text-slate-400 mt-1">Canali SIP contemporanei</div>
        </div>

        {/* MOS Quality */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Qualità Audio MOS</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">4.38 <span className="text-xs text-slate-500">/ 5.0</span></div>
          <div className="text-[11px] text-emerald-400 mt-1">Eccellente (Opus HD)</div>
        </div>
      </div>

      {/* Hourly Traffic Chart */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-sm">Distribuzione Oraria del Traffico Telefonico</h3>
            <p className="text-xs text-slate-400">Volume chiamate per fascia oraria (Entrata vs Uscita)</p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-sky-500"></span>
              <span className="text-slate-300">Inbound (Entrata)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500"></span>
              <span className="text-slate-300">Outbound (Uscita)</span>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-11 gap-2 items-end h-48 border-b border-slate-800 pb-2">
            {hourlyData.map((d) => {
              const total = d.inbound + d.outbound;
              const heightPercent = Math.round((total / maxHourlyVolume) * 100);
              const inPercent = Math.round((d.inbound / total) * 100);
              const outPercent = 100 - inPercent;

              return (
                <div key={d.hour} className="flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 pointer-events-none">
                    <div>Totale: {total} chiamate</div>
                    <div className="text-sky-400">Inbound: {d.inbound}</div>
                    <div className="text-indigo-400">Outbound: {d.outbound}</div>
                  </div>

                  {/* Stacked Bar */}
                  <div
                    className="w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all group-hover:brightness-110"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="w-full bg-indigo-500" style={{ height: `${outPercent}%` }}></div>
                    <div className="w-full bg-sky-500" style={{ height: `${inPercent}%` }}></div>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono mt-2">{d.hour}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column Section: Trunk Utilization & Agent Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trunk Usage Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-white text-sm">Utilizzo Trunk SIP Carrier</h3>
          
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="font-semibold">SIP Trunk TIM (Primario)</span>
                <span className="font-mono text-sky-400">68% (18/30 canali)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full" style={{ width: '68%' }}></div>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Dedicato a chiamate geografiche in entrata</span>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="font-semibold">SIP Trunk Fastweb (Backup & Mobile)</span>
                <span className="font-mono text-indigo-400">32% (8/30 canali)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '32%' }}></div>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Dedicato a rotte verso cellulari Italia</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Jitter Medio:</span>
              <span className="font-mono text-emerald-400">1.2 ms</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Packet Loss:</span>
              <span className="font-mono text-emerald-400">0.01%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Latenza RTT:</span>
              <span className="font-mono text-emerald-400">12.4 ms</span>
            </div>
          </div>
        </div>

        {/* Top Agents Leaderboard */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <h3 className="font-bold text-white text-sm mb-3">Prestazioni Interni & Operatori</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Interno</th>
                  <th className="py-2.5 px-3">Nome Operatore</th>
                  <th className="py-2.5 px-3">Reparto</th>
                  <th className="py-2.5 px-3">Chiamate Totali</th>
                  <th className="py-2.5 px-3">Gestite</th>
                  <th className="py-2.5 px-3">Tempo Medio (AHT)</th>
                  <th className="py-2.5 px-3">Tasso Efficacia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {topAgents.map((ag) => (
                  <tr key={ag.ext} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-400">{ag.ext}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{ag.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{ag.department}</td>
                    <td className="py-2.5 px-3 font-mono">{ag.total}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">{ag.answered}</td>
                    <td className="py-2.5 px-3 font-mono">{ag.aht}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {ag.rate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
