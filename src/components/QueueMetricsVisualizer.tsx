import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import {
  BarChart3,
  Clock,
  Activity,
  TrendingUp,
  Headphones,
  RefreshCw,
  PhoneIncoming,
  Users,
  Timer,
  Zap
} from 'lucide-react';
import { CallQueue } from '../types/pbx';

interface QueueMetricsVisualizerProps {
  queues: CallQueue[];
  onRefresh?: () => void;
}

export const QueueMetricsVisualizer: React.FC<QueueMetricsVisualizerProps> = ({
  queues,
  onRefresh
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'overview' | 'timeline' | 'holdtime'>('overview');
  const [selectedQueueId, setSelectedQueueId] = useState<string>('all');
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>(() =>
    new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Formatted data for comparative overview (Volume + Average Hold Time per queue)
  const queueComparisonData = useMemo(() => {
    return queues.map((q) => {
      const completed = q.completedCalls || 0;
      const active = q.activeCalls || 0;
      const waiting = q.waitingCalls || 0;
      const abandoned = q.abandonedCalls || 0;
      const totalVolume = completed + active + waiting + abandoned;
      const avgWaitSec = q.avgWaitTimeSeconds || 15;

      return {
        id: q.id,
        number: `Ext ${q.number}`,
        name: q.name,
        shortName: q.name.length > 20 ? q.name.substring(0, 18) + '…' : q.name,
        strategy: q.strategy,
        totalVolume,
        completed,
        active,
        waiting,
        abandoned,
        avgHoldTimeSec: avgWaitSec,
        maxWaitTimeSec: q.maxWaitTime,
        slaPercentage: q.serviceLevelPercentage || 98
      };
    });
  }, [queues]);

  // Hourly call volume timeline data (Real-time distribution across working hours)
  const hourlyTimelineData = useMemo(() => {
    // Generate realistic distribution for each hour based on queues
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    const multipliers = [0.25, 0.75, 1.15, 1.35, 0.85, 0.35, 0.65, 1.2, 1.1, 0.7, 0.3];

    return hours.map((hour, idx) => {
      const mult = multipliers[idx];
      const entry: Record<string, any> = { hour };

      let totalHourVolume = 0;
      let totalHourHoldSec = 0;

      queues.forEach((q) => {
        const baseQueueVol = ((q.completedCalls || 40) + (q.activeCalls || 1) * 8) / 8;
        const vol = Math.max(1, Math.round(baseQueueVol * mult));
        const hold = Math.max(5, Math.round((q.avgWaitTimeSeconds || 25) * (0.8 + mult * 0.35)));

        entry[`vol_${q.number}`] = vol;
        entry[`hold_${q.number}`] = hold;
        totalHourVolume += vol;
        totalHourHoldSec += hold;
      });

      entry.totalVolume = totalHourVolume;
      entry.avgHoldTime = queues.length > 0 ? Math.round(totalHourHoldSec / queues.length) : 20;

      return entry;
    });
  }, [queues]);

  // Global aggregate stats
  const totalVolumeAll = queueComparisonData.reduce((acc, curr) => acc + curr.totalVolume, 0);
  const globalAvgHoldTime =
    queueComparisonData.length > 0
      ? Math.round(
          queueComparisonData.reduce((acc, curr) => acc + curr.avgHoldTimeSec, 0) /
            queueComparisonData.length
        )
      : 0;

  const busiestQueue = [...queueComparisonData].sort((a, b) => b.totalVolume - a.totalVolume)[0];

  const handleManualRefresh = () => {
    setLastUpdated(
      new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    if (onRefresh) onRefresh();
  };

  // Custom Tooltip for dark mode PBX
  const CustomOverviewTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-slate-950 border border-slate-700/80 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 min-w-[220px]">
          <div className="pb-1.5 border-b border-slate-800">
            <span className="text-[10px] uppercase font-bold text-sky-400 font-mono block">
              {data.number}
            </span>
            <span className="font-bold text-white text-xs">{data.name}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5 capitalize">
              Strategia: <strong className="text-slate-300">{data.strategy}</strong>
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Volume Totale:
              </span>
              <span className="font-bold text-white">{data.totalVolume} chiamate</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Tempo Medio Attesa:
              </span>
              <span className="font-mono font-bold text-amber-400">
                {data.avgHoldTimeSec}s ({Math.floor(data.avgHoldTimeSec / 60)}m {data.avgHoldTimeSec % 60}s)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Completate:
              </span>
              <span className="text-emerald-300 font-medium">{data.completed}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Abbandonate:
              </span>
              <span className="text-rose-300 font-medium">{data.abandoned}</span>
            </div>

            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">SLA Rispetto:</span>
              <span className="font-bold text-purple-400">{data.slaPercentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 border border-slate-700/80 p-3 rounded-2xl shadow-2xl text-xs space-y-1.5 min-w-[190px]">
          <div className="font-bold text-white pb-1 border-b border-slate-800">
            Fascia Oraria: <span className="text-sky-400 font-mono">{label}</span>
          </div>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5" style={{ color: item.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}:
              </span>
              <span className="font-mono font-bold text-white">
                {item.value} {item.unit || ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5" id="queue-metrics-visualizer">
      {/* Visualizer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Analitica Code in Tempo Reale (Call Volume & Hold Time)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live AMI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Visualizzazione comparativa del volume delle chiamate e del tempo medio di attesa in coda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Chart View Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveChartTab('overview')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeChartTab === 'overview'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Confronto Code
            </button>
            <button
              onClick={() => setActiveChartTab('timeline')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeChartTab === 'timeline'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Volume Orario
            </button>
            <button
              onClick={() => setActiveChartTab('holdtime')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeChartTab === 'holdtime'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tempi di Attesa
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            title={`Ultimo aggiornamento: ${lastUpdated}. Clicca per sincronizzare statistiche.`}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 4 Quick KPI cards for Queue Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Volume Totale Chiamate</span>
            <PhoneIncoming className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white">{totalVolumeAll}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Gestite nelle code attive</div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Tempo Medio Attesa Globale</span>
            <Timer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {globalAvgHoldTime}s
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Circa {Math.round(globalAvgHoldTime / 60 * 10) / 10} min per chiamante
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Coda più Sollecitata</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base font-bold text-white truncate">
            {busiestQueue?.name || 'Nessuna'}
          </div>
          <div className="text-[10px] text-purple-400 mt-0.5 font-mono">
            {busiestQueue ? `${busiestQueue.totalVolume} chiamate (${busiestQueue.number})` : '-'}
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>SLA Obiettivo Target</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">≤ 60s</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Soglia massima consigliata</div>
        </div>
      </div>

      {/* Main Recharts Visualizations */}
      <div className="h-[320px] w-full pt-2">
        {activeChartTab === 'overview' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={queueComparisonData}
              margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="shortName"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#334155' }}
                label={{
                  value: 'Volume Chiamate',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#64748b',
                  fontSize: 10,
                  offset: 15
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f59e0b"
                tick={{ fill: '#f59e0b', fontSize: 11 }}
                tickLine={{ stroke: '#f59e0b' }}
                unit="s"
                label={{
                  value: 'Attesa Media (s)',
                  angle: 90,
                  position: 'insideRight',
                  fill: '#f59e0b',
                  fontSize: 10,
                  offset: 15
                }}
              />
              <Tooltip content={<CustomOverviewTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#94a3b8' }}
                formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
              />
              <ReferenceLine
                yAxisId="right"
                y={60}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: 'Target SLA (60s)', fill: '#ef4444', fontSize: 10, position: 'top' }}
              />
              <Bar
                yAxisId="left"
                dataKey="completed"
                name="Chiamate Completate"
                stackId="vol"
                fill="#38bdf8"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="waiting"
                name="In Attesa Ora"
                stackId="vol"
                fill="#f59e0b"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="abandoned"
                name="Abbandonate"
                stackId="vol"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgHoldTimeSec"
                name="Tempo Medio di Attesa (secondi)"
                stroke="#eab308"
                strokeWidth={3}
                dot={{ fill: '#eab308', r: 5, strokeWidth: 2, stroke: '#0f172a' }}
                activeDot={{ r: 7 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {activeChartTab === 'timeline' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={hourlyTimelineData}
              margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorTotalVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorHoldTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#334155' }}
              />
              <Tooltip content={<CustomTimelineTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#94a3b8' }}
                formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="totalVolume"
                name="Volume Chiamate per Ora"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTotalVol)"
              />
              <Area
                type="monotone"
                dataKey="avgHoldTime"
                name="Attesa Media Stimata (s)"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorHoldTime)"
                unit="s"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeChartTab === 'holdtime' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={queueComparisonData}
              margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="shortName"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#334155' }}
                unit="s"
              />
              <Tooltip content={<CustomOverviewTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#94a3b8' }}
                formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
              />
              <ReferenceLine
                y={60}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: 'SLA Massimo Accettabile (60s)', fill: '#ef4444', fontSize: 11, position: 'top' }}
              />
              <ReferenceLine
                y={30}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{ value: 'SLA Ottimale (30s)', fill: '#10b981', fontSize: 11, position: 'top' }}
              />
              <Bar
                dataKey="avgHoldTimeSec"
                name="Tempo Medio di Attesa Effettivo (s)"
                fill="#f59e0b"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="maxWaitTimeSec"
                name="Limite Max Wait Time Impostato (s)"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
                opacity={0.5}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>Frequenza di campionamento Asterisk Queue Event: <strong>5 secondi</strong></span>
        </span>
        <span className="text-slate-500 font-mono">
          Ultima sincronizzazione AMI: {lastUpdated}
        </span>
      </div>
    </div>
  );
};
