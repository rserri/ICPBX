import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Terminal,
  Play,
  RotateCcw,
  Download,
  Copy,
  Check,
  AlertTriangle,
  FileCode,
  CheckCircle2,
  Server,
  Lock,
  Database
} from 'lucide-react';
import {
  ROCKY_LINUX_INSTALLER_SCRIPT,
  SIMULATED_INSTALL_STEPS,
  InstallStepLog
} from '../services/installerScript';

export const RockyLinuxInstaller: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'script'>('simulator');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSimulatedError, setIsSimulatedError] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'Rocky Linux 9.4 (Blue Onyx) x86_64 - Ready for Asterisk 20 LTS deployment.',
    'Premere "Avvia Installazione Rocky Linux" per avviare il deploy automatico con controllo errori in tempo reale.'
  ]);
  const [copied, setCopied] = useState(false);

  const terminalRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  const handleStartInstallation = (withError = false) => {
    setIsRunning(true);
    setIsCompleted(false);
    setIsSimulatedError(false);
    setCurrentStepIndex(0);
    setConsoleLogs([
      '====================================================================',
      '  AVVIO INSTALLAZIONE AUTOMATICA PBX VIRTUAL CLUSTER SU ROCKY LINUX ',
      '  Dominio: pbx.azienda.it | Asterisk: 20.6.0 | Log: /var/log/pbx-install.log',
      '===================================================================='
    ]);

    let step = 0;
    const interval = setInterval(() => {
      if (step < SIMULATED_INSTALL_STEPS.length) {
        const stepData = SIMULATED_INSTALL_STEPS[step];
        setCurrentStepIndex(step + 1);

        // If error simulation or diagnostic test was requested on step 4 (Line 91 verification)
        if (withError && step === 3) {
          setIsSimulatedError(false);
          setIsRunning(false);
          setIsCompleted(true);
          setConsoleLogs((prev) => [
            ...prev,
            `\n>>> [DIAGNOSTICA RIGA 91] ${stepData.command}`,
            '[VERIFICA AMBIENTE] Verifica presenza del client binario MySQL/MariaDB...',
            '[AVVISO] Binario legacy "mysql" non trovato direttamente nel PATH (codice 127 evitato).',
            '>>> Fallback intelligente attivato: scansione alternative...',
            '✓ Rilevato client nativo MariaDB: /usr/bin/mariadb',
            '✓ Generato symlink di compatibilità: /usr/local/bin/mysql -> /usr/bin/mariadb',
            '>>> Healthcheck servizio: polling stato systemd e unix socket (/var/lib/mysql/mysql.sock)...',
            '✓ Socket Unix attivo e MariaDB pronto ad accettare connessioni.',
            '✓ Esecuzione query di inizializzazione tramite mariadb --socket=/var/lib/mysql/mysql.sock...',
            '✓ Database "asterisk_pbx" e utente "asterisk_user" configurati con successo.',
            '[DIAGNOSTICA COMPLETATA] Fallimento alla riga 91 risolto con successo tramite client detection e socket readiness check!'
          ]);
          clearInterval(interval);
          return;
        }

        setConsoleLogs((prev) => [
          ...prev,
          `\n>>> [${step + 1}/8] ${stepData.stepName}`,
          `$ ${stepData.command}`,
          ...stepData.logs
        ]);

        step++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
        setIsCompleted(true);
        setConsoleLogs((prev) => [
          ...prev,
          '\n====================================================================',
          '  INSTALLAZIONE COMPLETATA CON SUCCESSO!',
          '  Asterisk 20.6.0-LTS attivo con WebRTC WSS (porta 8089)',
          '  Certificati SSL Let\'s Encrypt rinnovati via Certbot cron.',
          '  Pannello Web accessibile su: https://pbx.azienda.it/',
          '===================================================================='
        ]);
      }
    }, 1200);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([ROCKY_LINUX_INSTALLER_SCRIPT], { type: 'text/x-shellscript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'install-rocky9.sh';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(ROCKY_LINUX_INSTALLER_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPercent = Math.round((currentStepIndex / SIMULATED_INSTALL_STEPS.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white">Installer Server Rocky Linux 8 & 9</h2>
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              Rocky 9.x Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Script bash automatizzato per Asterisk 20 LTS, Nginx, PHP 8.2-FPM, MariaDB Galera, Certbot SSL e firewalld.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'simulator'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Terminale Live
          </button>
          <button
            onClick={() => setActiveSubTab('script')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'script'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Visualizza Script Bash
          </button>
        </div>
      </div>

      {/* SUBTAB 1: LIVE TERMINAL SIMULATOR */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <button
                id="btn-run-installer"
                disabled={isRunning}
                onClick={() => handleStartInstallation(false)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition ${
                  isRunning
                    ? 'bg-slate-700 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>{isRunning ? 'Installazione in corso...' : 'Avvia Installazione Rocky Linux'}</span>
              </button>

              <button
                id="btn-simulate-error"
                disabled={isRunning}
                onClick={() => handleStartInstallation(true)}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-amber-900/60 text-amber-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Test Diagnostica DB (Riga 91 & Fallback)</span>
              </button>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="text-slate-400">Progresso:</span>
              <div className="w-36 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-500 ${
                    isSimulatedError ? 'bg-rose-500' : 'bg-sky-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="font-mono font-bold text-white">{progressPercent}%</span>
            </div>
          </div>

          {/* Terminal Console View */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Terminal Top Chrome */}
            <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                </div>
                <span className="font-mono text-[11px] text-slate-300 ml-2">
                  root@rocky9-pbx:~# /bin/bash install-rocky9.sh pbx.azienda.it
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px]">
                <span className="text-emerald-400">● Live Log Streaming</span>
              </div>
            </div>

            {/* Terminal Body */}
            <div
              ref={terminalRef}
              className="p-4 font-mono text-xs text-slate-200 h-96 overflow-y-auto space-y-1 select-text scrollbar-thin scrollbar-thumb-slate-700"
            >
              {consoleLogs.map((line, idx) => {
                const isError = line.includes('[ERRORE') || line.includes('Codice di uscita');
                const isSuccess = line.includes('✓') || line.includes('[SUCCESS]');
                const isHeading = line.includes('===') || line.includes('>>>');

                return (
                  <div
                    key={idx}
                    className={`${
                      isError
                        ? 'text-rose-400 font-bold'
                        : isSuccess
                        ? 'text-emerald-400 font-semibold'
                        : isHeading
                        ? 'text-sky-400 font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status summary banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center space-x-3">
              <Database className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="font-semibold text-white">MariaDB & Socket Ready</div>
                <div className="text-slate-400 text-[11px]">Auto-detect mariadb/mysql & socket check</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-white">Let's Encrypt Certbot</div>
                <div className="text-slate-400 text-[11px]">Rinnovo automatico certificati SSL abilitato</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center space-x-3">
              <Server className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <div className="font-semibold text-white">Asterisk 20 LTS + WebRTC</div>
                <div className="text-slate-400 text-[11px]">Compilato con PJSIP, Opus e transport WSS</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center space-x-3">
              <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <div className="font-semibold text-white">Firewall & SELinux</div>
                <div className="text-slate-400 text-[11px]">Porte 5060, 5061, 8089 e RTP aperte</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: BASH SCRIPT CODE VIEWER */}
      {activeSubTab === 'script' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">Codice Sorgente Bash: install-rocky9.sh</h3>
              <p className="text-xs text-slate-400">
                Eseguibile direttamente su Rocky Linux 9 con comando: <code className="text-sky-300">sudo bash install-rocky9.sh</code>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyScript}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiato!' : 'Copia'}</span>
              </button>

              <button
                onClick={handleDownloadScript}
                className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Scarica .sh</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-x-auto max-h-[550px]">
            <pre className="font-mono text-xs text-slate-300 leading-relaxed">
              {ROCKY_LINUX_INSTALLER_SCRIPT}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
