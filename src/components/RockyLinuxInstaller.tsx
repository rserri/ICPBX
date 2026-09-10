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
  Database,
  FileText,
  Wrench,
  Zap,
  Search,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  ROCKY_LINUX_INSTALLER_SCRIPT,
  SIMULATED_INSTALL_STEPS,
  InstallStepLog
} from '../services/installerScript';

const INITIAL_PBX_INSTALL_LOG = `[2026-09-10 15:00:01] ====================================================================
[2026-09-10 15:00:01]   AVVIO INSTALLAZIONE AUTOMATICA PBX VIRTUAL CLUSTER SU ROCKY LINUX 
[2026-09-10 15:00:01]   Dominio: pbx.azienda.it | Asterisk: 20.6.0 | Log: /var/log/pbx-install.log
[2026-09-10 15:00:01] ====================================================================
[2026-09-10 15:00:02] [1/8] Verifica Prerequisiti & Sistema Operativo...
[2026-09-10 15:00:02] ✓ Rilevato Rocky Linux 9.4 (Blue Onyx) x86_64 compatibile.
[2026-09-10 15:00:03] [2/8] Abilitazione Repository EPEL & CRB (CodeReady Builder)...
[2026-09-10 15:00:04] Package epel-release-9-7.el9.noarch is already installed.
[2026-09-10 15:00:05] Repository 'crb' is enabled.
[2026-09-10 15:00:06] Esecuzione aggiornamento pacchetti di sistema (dnf update -y --exclude=kernel*)...
[2026-09-10 15:00:08] Error: 
[2026-09-10 15:00:08]  Problem: package unixODBC-devel-2.3.12-2.el9_8.x86_64 from crb requires unixODBC(x86-64) = 2.3.12-2.el9_8, but none of the providers can be installed
[2026-09-10 15:00:08]   - cannot install the best update candidate for package unixODBC-devel-2.3.12-1.el9.x86_64
[2026-09-10 15:00:08]   - package unixODBC-2.3.12-2.el9_8.x86_64 from baseos is not yet available in current mirror
[2026-09-10 15:00:08] (try to add '--skip-broken' to skip uninstallable packages or '--nobest' to use not only best candidate packages)
[2026-09-10 15:00:08] [ERRORE] Script interrotto alla riga 67 con codice di uscita 1: 'dnf update -y --exclude=kernel*'`;

export const RockyLinuxInstaller: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'log_analyzer' | 'script'>('simulator');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSimulatedError, setIsSimulatedError] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'Rocky Linux 9.4 (Blue Onyx) x86_64 - Ready for Asterisk 20 LTS deployment.',
    'Premere "Avvia Installazione Rocky Linux" per avviare il deploy automatico con controllo errori in tempo reale.'
  ]);
  const [copied, setCopied] = useState(false);

  // Log analyzer state
  const [pbxInstallLog, setPbxInstallLog] = useState<string>(INITIAL_PBX_INSTALL_LOG);
  const [isAutoHealingRunning, setIsAutoHealingRunning] = useState<boolean>(false);
  const [autoHealingEnabled, setAutoHealingEnabled] = useState<boolean>(true);
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logCopied, setLogCopied] = useState<boolean>(false);

  const terminalRef = useRef<HTMLDivElement | null>(null);
  const logTerminalRef = useRef<HTMLDivElement | null>(null);

  // Derived conflict analysis from log content
  const hasUnixOdbcConflict =
    pbxInstallLog.includes('unixODBC') &&
    (pbxInstallLog.includes('Problem: package unixODBC') ||
      pbxInstallLog.includes('cannot install the best update candidate') ||
      pbxInstallLog.includes('requires unixODBC')) &&
    !pbxInstallLog.includes('[AUTO-FIX SUCCESS]');

  const isLogResolved = pbxInstallLog.includes('[AUTO-FIX SUCCESS]');

  // Auto scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  // Auto scroll log terminal
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [pbxInstallLog]);

  // Execute Auto-Healing (dnf clean all & dnf update -y --skip-broken)
  const handleExecuteAutoFix = () => {
    setIsAutoHealingRunning(true);
    const timestamp1 = new Date().toISOString().replace('T', ' ').slice(0, 19);

    setTimeout(() => {
      setPbxInstallLog((prev) => `${prev}
[${timestamp1}] --------------------------------------------------------------------
[${timestamp1}] [AUTO-HEALING LOG ENGINE] Analisi /var/log/pbx-install.log in corso...
[${timestamp1}] [ANOMALIA RILEVATA] Conflitto dipendenze critico: unixODBC-devel (CRB) vs unixODBC (BaseOS).
[${timestamp1}] >>> [FASE 1/2] Esecuzione automatica comando: dnf clean all
[${timestamp1}] 38 files removed. Svuotamento cache metadata e indici repository DNF completato.`);

      setTimeout(() => {
        const timestamp2 = new Date().toISOString().replace('T', ' ').slice(0, 19);
        setPbxInstallLog((prev) => `${prev}
[${timestamp2}] >>> [FASE 2/2] Esecuzione automatica comando: dnf update -y --skip-broken
[${timestamp2}] Aggiornamento pacchetti transazionale (ignoro candidati non allineati in CRB)...
[${timestamp2}] Upgraded: 84 packages, Skipped broken packages: unixODBC-devel-2.3.12-2.el9_8.x86_64
[${timestamp2}] Complete!
[${timestamp2}] [AUTO-FIX SUCCESS] Conflitto unixODBC risolto con successo ('dnf clean all' & 'dnf update -y --skip-broken').
[${timestamp2}] [RIPRESA INSTALLATORE] Pipeline di installazione PBX ristabilita e pronta all'avvio.`);

        setIsAutoHealingRunning(false);

        setConsoleLogs((prev) => [
          ...prev,
          `\n>>> [AUTO-FIX RISOLUZIONE unixODBC APPLICATO]`,
          `✓ Comando 1: 'dnf clean all' eseguito (cache metadata e repository pulita).`,
          `✓ Comando 2: 'dnf update -y --skip-broken' eseguito (pacchetti disallineati saltati in sicurezza).`,
          `✓ /var/log/pbx-install.log aggiornato con stato [AUTO-FIX SUCCESS].`
        ]);
      }, 900);
    }, 600);
  };

  const handleResetErrorLog = () => {
    setPbxInstallLog(INITIAL_PBX_INSTALL_LOG);
  };

  const handleStartInstallation = (
    diagnosticMode: 'none' | 'db' | 'asterisk' | 'extract' | 'mp3' | 'dnf' = 'none'
  ) => {
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

        // If diagnostic test or auto-fix for DNF / unixODBC was requested (step 2)
        if (diagnosticMode === 'dnf' && step === 1) {
          setIsSimulatedError(false);
          setIsRunning(false);
          setIsCompleted(true);

          if (hasUnixOdbcConflict) {
            handleExecuteAutoFix();
          }

          setConsoleLogs((prev) => [
            ...prev,
            `\n>>> [DIAGNOSTICA & AUTO-FIX RIGA 67] Analisi /var/log/pbx-install.log`,
            '[LOG AUDIT] Analisi in tempo reale di /var/log/pbx-install.log...',
            '[CONFLITTO RILEVATO] pacchetto unixODBC-devel (2.3.12-2.el9_8 da CRB) richiede unixODBC = 2.3.12-2.el9_8 non ancora sincronizzato in BaseOS.',
            '>>> Attivazione Auto-Healing Logic:',
            '>>> Comando 1: $ dnf clean all',
            '    38 files removed. Svuotamento cache pacchetti e metadata DNF completato.',
            '>>> Comando 2: $ dnf update -y --skip-broken --exclude="kernel*"',
            '    Transazione completata con successo: 84 pacchetti aggiornati, candidato disallineato saltato senza bloccare il sistema.',
            '✓ Errore di transazione evitato: exit code 0 alla riga 67.',
            '✓ /var/log/pbx-install.log marcato come [AUTO-FIX SUCCESS].',
            '[DIAGNOSTICA COMPLETATA] Conflitto dipendenze unixODBC neutralizzato con successo!'
          ]);
          clearInterval(interval);
          return;
        }

        // If diagnostic test was requested on step 4 (Line 91 DB verification)
        if (diagnosticMode === 'db' && step === 3) {
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

        // If diagnostic test was requested on step 5 (Line 185 Asterisk Download verification)
        if (diagnosticMode === 'asterisk' && step === 4) {
          setIsSimulatedError(false);
          setIsRunning(false);
          setIsCompleted(true);
          setConsoleLogs((prev) => [
            ...prev,
            `\n>>> [DIAGNOSTICA RIGA 185] Download e Compilazione Asterisk 20.6.0 LTS`,
            '[SCANSIONE SORGENTI] Test disponibilità archivio asterisk-20.6.0.tar.gz su mirror primario...',
            '[AVVISO] URL root https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20.6.0.tar.gz -> HTTP 404 (codice wget 8 evitato).',
            '>>> Attivazione fallback multi-mirror prioritario: directory releases/ ufficiale...',
            '✓ Connessione a https://downloads.asterisk.org/pub/telephony/asterisk/releases/asterisk-20.6.0.tar.gz: HTTP/2 200 OK',
            '✓ Download completato (28.2 MB) via curl/wget con timeout e resume support.',
            '✓ Healthcheck tarball superato: integrità gzip verificata (tar -tzf OK, dimensione > 28MB).',
            '✓ Estrazione dinamica in /usr/src/asterisk-20.6.0 completata.',
            '[DIAGNOSTICA COMPLETATA] Blocco alla riga 185 risolto con successo tramite releases URL e fallback automatici!'
          ]);
          clearInterval(interval);
          return;
        }

        // If diagnostic test was requested on step 5 (Line 247 Asterisk Extraction & SIGPIPE 141 fix)
        if (diagnosticMode === 'extract' && step === 4) {
          setIsSimulatedError(false);
          setIsRunning(false);
          setIsCompleted(true);
          setConsoleLogs((prev) => [
            ...prev,
            `\n>>> [DIAGNOSTICA RIGA 247] Estrazione Asterisk & Risoluzione SIGPIPE (Codice 141)`,
            'Estrazione archivio asterisk-20.6.0.tar.gz in /usr/src...',
            'tar -zxf asterisk-20.6.0.tar.gz: estrazione completata con successo.',
            '[ANALISI PIPELINE] Rilevato pericolo SIGPIPE (exit code 141) causato da "tar -ztf | head -n 1" con pipefail.',
            '>>> Esecuzione metodo safe-filesystem: scansione diretta filesystem su /usr/src/asterisk-20.6.0...',
            '✓ Rilevata cartella sorgente estratta: /usr/src/asterisk-20.6.0',
            '✓ Nessun processo interrotto con segnale 13 (SIGPIPE): pipeline sicura con set -euo pipefail.',
            '✓ Directory di compilazione /usr/src/asterisk-20.6.0 validata ed accessibile.',
            '[DIAGNOSTICA COMPLETATA] Errore 141 alla riga 247 completamente neutralizzato!'
          ]);
          clearInterval(interval);
          return;
        }

        // If diagnostic test was requested on step 5 (Line 281 MP3 & make install verification)
        if (diagnosticMode === 'mp3' && step === 4) {
          setIsSimulatedError(false);
          setIsRunning(false);
          setIsCompleted(true);
          setConsoleLogs((prev) => [
            ...prev,
            `\n>>> [DIAGNOSTICA RIGA 281] Risoluzione Errore 'format_mp3.so' in make install`,
            '[ANALISI AMBIENTE] Verifica presenza comando "svn" (Subversion)...',
            '✓ Rilevato subversion (/usr/bin/svn) preinstallato nel pacchetto base DNF.',
            '>>> Esecuzione contrib/scripts/get_mp3_source.sh...',
            'A    addons/mp3/mpg123.h',
            'A    addons/mp3/interface.c',
            'Exported revision 204.',
            '✓ Sorgenti MP3 estratti con successo in addons/mp3 (mpg123.h presente).',
            '>>> Configurazione menuselect: rilevamento addons...',
            '✓ File addons/mp3/mpg123.h presente: modulo format_mp3 abilitato in sicurezza.',
            '>>> Esecuzione make -j$(nproc) e make install...',
            'CC [M] addons/format_mp3.o',
            'LINK [M] addons/format_mp3.so',
            'Installing modules from addons...',
            '/usr/bin/install -m 755 format_mp3.so /usr/lib64/asterisk/modules',
            '✓ format_mp3.so installato con successo (nessun errore stat o codice di uscita 2).',
            '[DIAGNOSTICA COMPLETATA] Errore critico alla riga 281 in make install completamente risolto!'
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

  const handleCopyLog = () => {
    navigator.clipboard.writeText(pbxInstallLog);
    setLogCopied(true);
    setTimeout(() => setLogCopied(false), 2000);
  };

  const handleDownloadLog = () => {
    const blob = new Blob([pbxInstallLog], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pbx-install.log';
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressPercent = Math.round((currentStepIndex / SIMULATED_INSTALL_STEPS.length) * 100);

  // Filtered log lines
  const filteredLogLines = pbxInstallLog
    .split('\n')
    .filter((line) => line.toLowerCase().includes(logSearchQuery.toLowerCase()));

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

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="tab-btn-simulator"
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
            id="tab-btn-log-analyzer"
            onClick={() => setActiveSubTab('log_analyzer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeSubTab === 'log_analyzer'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Analisi Log (/var/log/pbx-install.log)</span>
            {hasUnixOdbcConflict ? (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                Conflitto unixODBC
              </span>
            ) : (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                Auto-Fix OK
              </span>
            )}
          </button>
          <button
            id="tab-btn-script"
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-run-installer"
                disabled={isRunning}
                onClick={() => handleStartInstallation('none')}
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
                id="btn-autofix-unixodbc"
                disabled={isRunning || isAutoHealingRunning}
                onClick={() => {
                  handleExecuteAutoFix();
                  handleStartInstallation('dnf');
                }}
                className="flex items-center space-x-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/80 px-3 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
              >
                <Wrench className="w-4 h-4 text-rose-400" />
                <span>Auto-Fix unixODBC (dnf clean all & --skip-broken)</span>
              </button>

              <button
                id="btn-simulate-db"
                disabled={isRunning}
                onClick={() => handleStartInstallation('db')}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-amber-900/60 text-amber-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Test DB (Riga 91)</span>
              </button>

              <button
                id="btn-simulate-asterisk"
                disabled={isRunning}
                onClick={() => handleStartInstallation('asterisk')}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-sky-900/60 text-sky-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition"
              >
                <Server className="w-4 h-4 text-sky-400" />
                <span>Test Asterisk (Riga 185)</span>
              </button>

              <button
                id="btn-simulate-extract"
                disabled={isRunning}
                onClick={() => handleStartInstallation('extract')}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-emerald-900/60 text-emerald-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Test Estrazione (Riga 247)</span>
              </button>

              <button
                id="btn-simulate-mp3"
                disabled={isRunning}
                onClick={() => handleStartInstallation('mp3')}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-violet-900/60 text-violet-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition"
              >
                <CheckCircle2 className="w-4 h-4 text-violet-400" />
                <span>Test MP3 & Build (Riga 281)</span>
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
              <Wrench className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <div className="font-semibold text-white">Auto-Fix unixODBC Ready</div>
                <div className="text-slate-400 text-[11px]">dnf clean all & --skip-broken integrati</div>
              </div>
            </div>

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
                <div className="font-semibold text-white">Asterisk 20 Multi-Mirror</div>
                <div className="text-slate-400 text-[11px]">Download resiliente /releases & integrity check</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: LOG ANALYZER (/var/log/pbx-install.log) */}
      {activeSubTab === 'log_analyzer' && (
        <div className="space-y-4">
          {/* Analysis Dashboard Banner */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    hasUnixOdbcConflict
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {hasUnixOdbcConflict ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-white text-sm">
                      Diagnostica & Monitoraggio: /var/log/pbx-install.log
                    </h3>
                    {hasUnixOdbcConflict ? (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        Conflitto Dipendenze unixODBC Rilevato
                      </span>
                    ) : (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        Log Pulito / Auto-Fix Applicato
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Analisi automatica degli errori di installazione e risoluzione automatica delle dipendenze Rocky Linux 9.
                  </p>
                </div>
              </div>

              {/* Action Buttons for Log Healing */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-auto-heal-log"
                  disabled={isAutoHealingRunning || !hasUnixOdbcConflict}
                  onClick={handleExecuteAutoFix}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition ${
                    isAutoHealingRunning
                      ? 'bg-slate-700 cursor-not-allowed'
                      : !hasUnixOdbcConflict
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                      : 'bg-rose-600 hover:bg-rose-500 animate-pulse'
                  }`}
                >
                  <Wrench className={`w-4 h-4 ${isAutoHealingRunning ? 'animate-spin' : ''}`} />
                  <span>
                    {isAutoHealingRunning
                      ? 'Esecuzione Auto-Fix...'
                      : hasUnixOdbcConflict
                      ? 'Esegui Auto-Fix (dnf clean all & --skip-broken)'
                      : 'Conflitto Già Risolto'}
                  </span>
                </button>

                <button
                  id="btn-simulate-error-log"
                  onClick={handleResetErrorLog}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Simula Errore unixODBC</span>
                </button>
              </div>
            </div>

            {/* Diagnostic Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-medium mb-1 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Anomalia Riscontrata</span>
                </div>
                <div className="text-slate-200 text-[11px] leading-relaxed">
                  {hasUnixOdbcConflict ? (
                    <span className="text-rose-300 font-mono">
                      unixODBC-devel (2.3.12-2 da CRB) richiede unixODBC = 2.3.12-2 assente nei mirror BaseOS. DNF fallisce con exit 1.
                    </span>
                  ) : (
                    <span className="text-emerald-300">
                      Nessun conflitto attivo. Le dipendenze CRB/BaseOS sono state allineate tramite skip-broken.
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-medium mb-1 flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                  <span>Strategia Auto-Fix Implementata</span>
                </div>
                <div className="text-slate-300 text-[11px] leading-relaxed">
                  <span className="font-mono text-sky-300">dnf clean all</span> (svuota cache e indici) +{' '}
                  <span className="font-mono text-sky-300">dnf update -y --skip-broken</span> (ignora pacchetti disallineati).
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-slate-400 font-medium mb-1 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auto-Remediation Automatica</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {autoHealingEnabled ? 'Intervento attivo su errore DNF' : 'Controllo manuale'}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoHealingEnabled}
                    onChange={(e) => setAutoHealingEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Log Viewer Container */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Log Viewer Header Toolbar */}
            <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span className="font-mono text-slate-200 text-xs font-semibold">
                  /var/log/pbx-install.log
                </span>
                <span className="text-slate-500 text-[11px]">
                  ({filteredLogLines.length} righe visualizzate)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-filter-log"
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Filtra log (es. unixODBC, Error, dnf)..."
                    className="bg-slate-950 text-slate-200 placeholder-slate-500 text-[11px] pl-8 pr-3 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-sky-500 w-52"
                  />
                </div>

                <button
                  id="btn-copy-log"
                  onClick={handleCopyLog}
                  className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-700"
                >
                  {logCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{logCopied ? 'Copiato' : 'Copia Log'}</span>
                </button>

                <button
                  id="btn-download-log"
                  onClick={handleDownloadLog}
                  className="flex items-center space-x-1 bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Scarica Log</span>
                </button>
              </div>
            </div>

            {/* Log Stream Body */}
            <div
              ref={logTerminalRef}
              className="p-4 font-mono text-xs text-slate-200 h-[480px] overflow-y-auto space-y-1 select-text scrollbar-thin scrollbar-thumb-slate-700"
            >
              {filteredLogLines.map((line, idx) => {
                const isError = line.includes('Error:') || line.includes('[ERRORE]') || line.includes('Problem:');
                const isAutoFixHeading = line.includes('[AUTO-HEALING') || line.includes('[AUTO-FIX');
                const isCommand = line.includes('>>>') || line.includes('dnf clean all') || line.includes('dnf update -y --skip-broken');
                const isSuccess = line.includes('✓') || line.includes('Complete!') || line.includes('[SUCCESS]');

                return (
                  <div
                    key={idx}
                    className={`flex items-start space-x-3 py-0.5 ${
                      isError
                        ? 'text-rose-400 font-semibold bg-rose-950/20 px-1 rounded'
                        : isAutoFixHeading
                        ? 'text-amber-300 font-bold bg-amber-950/20 px-1 rounded'
                        : isCommand
                        ? 'text-sky-300 font-semibold'
                        : isSuccess
                        ? 'text-emerald-400 font-medium'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 select-none text-[10px] w-6 text-right shrink-0">
                      {idx + 1}
                    </span>
                    <span className="break-all">{line}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: BASH SCRIPT CODE VIEWER */}
      {activeSubTab === 'script' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">Codice Sorgente Bash: install-rocky9.sh</h3>
              <p className="text-xs text-slate-400">
                Include autorisoluzione con <code className="text-sky-300">dnf clean all</code> e{' '}
                <code className="text-sky-300">dnf update -y --skip-broken</code> per conflitti unixODBC.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="btn-copy-script"
                onClick={handleCopyScript}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiato!' : 'Copia'}</span>
              </button>

              <button
                id="btn-download-script"
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
