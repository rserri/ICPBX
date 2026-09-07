import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Clock,
  PhoneForwarded,
  UserCheck,
  X,
  Volume2,
  VolumeX,
  Headphones,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Info
} from 'lucide-react';
import { QueueWaitTimeAlert } from '../types/pbx';

interface QueueWaitTimeToastSystemProps {
  alerts: QueueWaitTimeAlert[];
  onDismissAlert: (alertId: string) => void;
  onForwardTimeout: (alert: QueueWaitTimeAlert) => void;
  onAssignToFreeAgent: (alert: QueueWaitTimeAlert) => void;
  onClearAllAlerts: () => void;
}

export const QueueWaitTimeToastSystem: React.FC<QueueWaitTimeToastSystemProps> = ({
  alerts,
  onDismissAlert,
  onForwardTimeout,
  onAssignToFreeAgent,
  onClearAllAlerts
}) => {
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const playedAlertIdsRef = useRef<Set<string>>(new Set());

  // Web Audio chime generator
  const playAlertChime = () => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Two-tone warning chime (880Hz then 587Hz)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(587, now + 0.2);

      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.45);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  // Trigger chime when a new alert arrives
  useEffect(() => {
    alerts.forEach((a) => {
      if (a.status === 'active' && !playedAlertIdsRef.current.has(a.id)) {
        playedAlertIdsRef.current.add(a.id);
        playAlertChime();
      }
    });
  }, [alerts, audioEnabled]);

  // Format seconds into mm:ss
  const formatSeconds = (sec: number = 0) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const activeAlerts = alerts.filter((a) => a.status === 'active');

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div
      id="queue-wait-time-toast-container"
      className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none transition-all duration-300"
    >
      {/* Mini Top Control Bar if multiple alerts */}
      {activeAlerts.length > 1 && (
        <div className="pointer-events-auto flex items-center justify-between bg-rose-950/90 border border-rose-700/80 px-3.5 py-1.5 rounded-xl shadow-lg text-xs text-rose-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="font-bold">{activeAlerts.length} Chiamanti oltre il Max Wait Time!</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              title={audioEnabled ? 'Disattiva avviso sonoro' : 'Attiva avviso sonoro'}
              className="p-1 hover:bg-rose-900/60 rounded text-rose-300 hover:text-white transition"
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClearAllAlerts}
              className="text-[11px] underline hover:text-white font-medium ml-1"
            >
              Chiudi Tutti
            </button>
          </div>
        </div>
      )}

      {/* List of active toasts */}
      {activeAlerts.map((alert) => {
        const exceededSec = Math.max(0, alert.currentWaitSeconds - alert.maxWaitTime);
        const fallbackDestinationLabel =
          alert.timeoutDestination?.label ||
          (alert.timeoutDestination?.type === 'voicemail'
            ? 'Segreteria Telefonica'
            : alert.timeoutDestination?.type === 'extension'
            ? `Interno ${alert.timeoutDestination.id}`
            : alert.timeoutDestination?.type === 'ivr'
            ? 'Menu IVR Fallback'
            : 'Chiusura Chiamata');

        return (
          <div
            key={alert.id}
            id={`toast-sla-alert-${alert.id}`}
            className="pointer-events-auto bg-slate-950/95 border-2 border-rose-500/90 rounded-2xl p-4 shadow-2xl shadow-rose-950/80 backdrop-blur-md transition-all duration-200 space-y-3 ring-1 ring-rose-500/40 animate-slideInRight"
          >
            {/* Header Badge & Action Icons */}
            <div className="flex items-start justify-between gap-2 border-b border-rose-900/40 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full">
                      Violazione SLA Coda
                    </span>
                    {alert.priority === 'high' ? (
                      <span className="text-[10px] font-extrabold uppercase bg-rose-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                        Priorità Alta
                      </span>
                    ) : alert.priority === 'low' ? (
                      <span className="text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded-full">
                        Priorità Bassa
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                        Priorità Media
                      </span>
                    )}
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  </div>
                  <h4 className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
                    <span>Tempo Massimo Superato</span>
                    <span className="text-slate-400 font-normal">in</span>
                    <span className="text-sky-400 font-mono font-bold">
                      Coda {alert.queueNumber} ({alert.queueName})
                    </span>
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  title={audioEnabled ? 'Disattiva suono' : 'Attiva suono'}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-rose-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                </button>
                <button
                  onClick={() => onDismissAlert(alert.id)}
                  title="Riconosci e chiudi avviso"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Caller & Timing Details */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Chiamante in Coda:</span>
                <span className="font-mono font-bold text-white tracking-wide">
                  {alert.callerNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Anagrafica / Azienda:</span>
                <span className="text-slate-200 font-medium truncate max-w-[200px]">
                  {alert.callerName}
                </span>
              </div>

              {/* Wait Time Comparison Bar */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <Clock className="w-3.5 h-3.5 animate-spin text-rose-400" />
                    <span>Attesa: {formatSeconds(alert.currentWaitSeconds)} ({alert.currentWaitSeconds}s)</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Max consentito: <strong className="text-slate-200">{formatSeconds(alert.maxWaitTime)} ({alert.maxWaitTime}s)</strong>
                  </div>
                </div>

                {/* Visual Bar Indicator */}
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden relative">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-300"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-rose-300 font-semibold pt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    Superato di +{exceededSec} secondi!
                  </span>
                  <span className="text-slate-400">
                    Destinazione prevista: {fallbackDestinationLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Administrator Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onForwardTimeout(alert)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                title={`Inoltra subito alla destinazione di timeout: ${fallbackDestinationLabel}`}
              >
                <PhoneForwarded className="w-3.5 h-3.5" />
                <span>Forza Timeout</span>
              </button>

              <button
                onClick={() => onAssignToFreeAgent(alert)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                title="Assegna subito al primo agente libero o forza squillo"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assegna ad Agente</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
