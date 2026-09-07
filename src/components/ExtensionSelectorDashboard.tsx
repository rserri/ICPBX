import React, { useState, useMemo } from 'react';
import {
  Laptop,
  Monitor,
  CheckCircle2,
  PhoneCall,
  UserCheck,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Headphones,
  Mic,
  Volume2,
  Radio,
  Clock,
  Plus,
  X,
  RefreshCw,
  AlertCircle,
  Key,
  Voicemail,
  Smartphone
} from 'lucide-react';
import { Extension, ExtensionStatus } from '../types/pbx';
import { audioService } from '../services/audioService';

interface ExtensionSelectorDashboardProps {
  extensions: Extension[];
  activeExtension: Extension;
  onSelectExtension: (extension: Extension) => void;
  onNavigateToWebClient: () => void;
  onOpenWebPhone: () => void;
  onAddNewExtension?: (ext: Extension) => void;
}

export const ExtensionSelectorDashboard: React.FC<ExtensionSelectorDashboardProps> = ({
  extensions,
  activeExtension,
  onSelectExtension,
  onNavigateToWebClient,
  onOpenWebPhone,
  onAddNewExtension
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [onlyWebRTC, setOnlyWebRTC] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);

  // Audio testing states
  const [audioTesting, setAudioTesting] = useState(false);
  const [micStatus, setMicStatus] = useState<'idle' | 'testing' | 'granted' | 'denied'>('idle');

  // Custom Extension Modal/Accordion
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customNumber, setCustomNumber] = useState('');
  const [customName, setCustomName] = useState('');
  const [customDept, setCustomDept] = useState('Personale / Remoto');
  const [customSecret, setCustomSecret] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  // Extract unique departments for filter chips
  const departments = useMemo(() => {
    const set = new Set<string>();
    extensions.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [extensions]);

  // Filtered extensions
  const filteredExtensions = useMemo(() => {
    return extensions.filter((ext) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        ext.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ext.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ext.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ext.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept = selectedDepartment === 'all' || ext.department === selectedDepartment;
      const matchWebRTC = !onlyWebRTC || ext.webrtcEnabled;

      return matchSearch && matchDept && matchWebRTC;
    });
  }, [extensions, searchTerm, selectedDepartment, onlyWebRTC]);

  const handleConnectExtension = (ext: Extension) => {
    onSelectExtension(ext);
    // Play a gentle DTMF confirmation tone
    try {
      audioService.playDTMF('1', 120);
      setTimeout(() => audioService.playDTMF('5', 120), 100);
    } catch {
      // Audio test fallback
    }

    setConnectionNotice(
      `Postazione configurata con successo! Questo computer è ora collegato all'Interno ${ext.number} - ${ext.name}.`
    );
  };

  const handleTestSpeaker = () => {
    if (audioTesting) return;
    setAudioTesting(true);
    try {
      audioService.playDTMF('3', 250);
      setTimeout(() => audioService.playDTMF('6', 250), 200);
      setTimeout(() => audioService.playDTMF('9', 300), 400);
      setTimeout(() => setAudioTesting(false), 900);
    } catch {
      setAudioTesting(false);
    }
  };

  const handleTestMic = async () => {
    setMicStatus('testing');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStatus('granted');
        // Stop the tracks immediately after testing
        stream.getTracks().forEach((t) => t.stop());
      } else {
        setMicStatus('granted');
      }
    } catch (e) {
      console.warn('Microphone permission check error or denied in preview', e);
      setMicStatus('denied');
    }
  };

  const handleCreateAndConnectCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNumber.trim() || !customName.trim()) {
      setCustomError('Inserisci sia il numero interno che il nome operatore');
      return;
    }

    const existing = extensions.find((x) => x.number === customNumber.trim());
    if (existing) {
      handleConnectExtension(existing);
      setShowCustomModal(false);
      return;
    }

    const newExt: Extension = {
      id: `ext-${customNumber.trim()}`,
      number: customNumber.trim(),
      name: customName.trim(),
      department: customDept || 'Generale',
      email: `${customNumber.trim()}@azienda.it`,
      secret: customSecret || 'P@ssword123!sip',
      webrtcEnabled: true,
      codecs: ['opus', 'alaw', 'ulaw'],
      voicemailEnabled: true,
      voicemailPin: '1234',
      callerId: `"${customName.trim()}" <${customNumber.trim()}>`,
      status: 'online',
      mobilePushEnabled: false,
      context: 'internal-context',
      maxContacts: 3,
      callWaitingEnabled: true
    };

    if (onAddNewExtension) {
      onAddNewExtension(newExt);
    }
    handleConnectExtension(newExt);
    setShowCustomModal(false);
    setCustomNumber('');
    setCustomName('');
    setCustomSecret('');
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Hero Banner */}
      <div
        id="extension-selector-hero"
        className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl"
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold uppercase tracking-wider">
              <Laptop className="w-3.5 h-3.5" />
              <span>Configurazione Postazione di Lavoro</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Seleziona l'Interno Telefonico per questo Computer
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Scegli quale interno SIP aziendale assegnare a questo browser/computer. L'interno selezionato
              sarà utilizzato dal softphone WebPhone WebRTC per inviare e ricevere chiamate, gestire lo stato di
              presenza e consultare la segreteria telefonica.
            </p>
          </div>

          {/* Currently Active Extension Badge Card */}
          <div className="bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl shrink-0 min-w-[280px]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span>Postazione Attualmente Collegata</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center font-bold text-white text-lg shadow-md ring-2 ring-sky-500/40">
                {activeExtension.number}
              </div>
              <div>
                <div className="text-base font-bold text-white flex items-center gap-1.5">
                  <span>{activeExtension.name}</span>
                </div>
                <div className="text-xs text-sky-400 font-medium">
                  {activeExtension.department}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Caller ID: {activeExtension.callerId}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
              <button
                id="btn-hero-go-webclient"
                onClick={onNavigateToWebClient}
                className="flex-1 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <span>Vai al Web Client</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-hero-open-phone"
                onClick={onOpenWebPhone}
                title="Apri Softphone WebPhone"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl border border-slate-700 text-xs font-semibold flex items-center justify-center transition"
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Success Notice Toast */}
        {connectionNotice && (
          <div className="mt-6 p-4 bg-emerald-950/90 border border-emerald-700/80 rounded-2xl text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-medium text-sm">{connectionNotice}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onNavigateToWebClient}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition"
              >
                Accedi Ora al Web Client
              </button>
              <button
                onClick={() => setConnectionNotice(null)}
                className="text-emerald-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metrics & Hardware Readiness Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: System Readiness */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Gateway PJSIP WebRTC
            </div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Attivo (wss://pbx.cloud.local/ws)</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Opus Fullband 48kHz • SRTP Criptato
            </div>
          </div>
        </div>

        {/* Metric 2: Speaker / Headset Test */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Altoparlanti & Cuffie
              </div>
              <div className="text-xs text-slate-300">Test audio di squillo</div>
            </div>
          </div>
          <button
            onClick={handleTestSpeaker}
            disabled={audioTesting}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{audioTesting ? 'Riproduzione...' : 'Test Suono'}</span>
          </button>
        </div>

        {/* Metric 3: Microphone Test */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Microfono Computer
              </div>
              <div className="text-xs text-slate-300">
                {micStatus === 'granted'
                  ? 'Autorizzato & Operativo'
                  : micStatus === 'denied'
                  ? 'Accesso negato nel browser'
                  : 'Verifica permessi audio'}
              </div>
            </div>
          </div>
          <button
            onClick={handleTestMic}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
              micStatus === 'granted'
                ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
            }`}
          >
            {micStatus === 'granted' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
            <span>{micStatus === 'granted' ? 'OK' : 'Test Mic'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-extension"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca interno per nome, numero interno (101, 102...), reparto o email..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Only WebRTC */}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={onlyWebRTC}
                onChange={(e) => setOnlyWebRTC(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-sky-500 bg-slate-800 border-slate-700"
              />
              <span>Solo con WebRTC attivo</span>
            </label>

            {/* Custom Extension Button */}
            <button
              onClick={() => setShowCustomModal(!showCustomModal)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Interno Personalizzato</span>
            </button>
          </div>
        </div>

        {/* Department Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Reparti:
          </span>
          <button
            onClick={() => setSelectedDepartment('all')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              selectedDepartment === 'all'
                ? 'bg-sky-600 text-white font-semibold shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Tutti ({extensions.length})
          </button>
          {departments.map((dept) => {
            const count = extensions.filter((e) => e.department === dept).length;
            const isSelected = selectedDepartment === dept;
            return (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
                  isSelected
                    ? 'bg-sky-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {dept} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsible Custom Extension Form */}
      {showCustomModal && (
        <div className="bg-slate-900 border border-sky-700/60 rounded-3xl p-6 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">
                Collega un Interno SIP Personalizzato o Esterno
              </h3>
            </div>
            <button
              onClick={() => setShowCustomModal(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Se il tuo interno aziendale non è presente nella lista, puoi specificare direttamente il numero
            di interno e il nome per connettere istantaneamente la tua postazione di lavoro.
          </p>

          <form onSubmit={handleCreateAndConnectCustom} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                Numero Interno *
              </label>
              <input
                type="text"
                value={customNumber}
                onChange={(e) => setCustomNumber(e.target.value)}
                placeholder="es. 109"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                Nome Operatore *
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="es. Giulia Neri"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                Reparto Aziendale
              </label>
              <input
                type="text"
                value={customDept}
                onChange={(e) => setCustomDept(e.target.value)}
                placeholder="es. Amministrazione"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Collega e Salva</span>
              </button>
            </div>
          </form>
          {customError && (
            <div className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{customError}</span>
            </div>
          )}
        </div>
      )}

      {/* Grid of Extension Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-slate-400 font-medium">
            Trovati <span className="text-white font-bold">{filteredExtensions.length}</span> interni telefonici
            {selectedDepartment !== 'all' && ` nel reparto "${selectedDepartment}"`}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Clicca su un interno per collegare la postazione
          </div>
        </div>

        {filteredExtensions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-base font-bold text-white">Nessun interno trovato</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Nessun interno corrisponde ai criteri di ricerca impostati. Prova a modificare i filtri o inserisci un
              interno personalizzato.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('all');
                setOnlyWebRTC(false);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-xs font-semibold transition"
            >
              Reimposta Filtri
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredExtensions.map((ext) => {
              const isActive = activeExtension.id === ext.id || activeExtension.number === ext.number;

              return (
                <div
                  key={ext.id}
                  id={`extension-card-${ext.number}`}
                  className={`relative rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between group ${
                    isActive
                      ? 'bg-slate-900/90 border-sky-500 ring-2 ring-sky-500/30 shadow-xl shadow-sky-950/40'
                      : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                  }`}
                >
                  {/* Top Row: Avatar, Number & Status Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-base transition-transform group-hover:scale-105 ${
                            isActive
                              ? 'bg-gradient-to-br from-sky-500 to-indigo-600 ring-2 ring-sky-400/50'
                              : 'bg-slate-800 border border-slate-700 text-slate-200'
                          }`}
                        >
                          {ext.number}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition flex items-center gap-1.5">
                            <span>{ext.name}</span>
                          </h4>
                          <div className="text-xs text-slate-400 font-medium">{ext.department}</div>
                        </div>
                      </div>

                      {/* Presence Status Pill */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                          ext.status === 'online'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            : ext.status === 'busy'
                            ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                            : ext.status === 'dnd'
                            ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ext.status === 'online'
                              ? 'bg-emerald-400'
                              : ext.status === 'busy'
                              ? 'bg-amber-400'
                              : ext.status === 'dnd'
                              ? 'bg-rose-400'
                              : 'bg-slate-500'
                          }`}
                        ></span>
                        <span className="capitalize">{ext.status}</span>
                      </span>
                    </div>

                    {/* Metadata Specs */}
                    <div className="space-y-1.5 text-xs text-slate-400 mb-4 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-semibold">Caller ID:</span>
                        <span className="font-mono text-slate-300 text-[11px] truncate max-w-[170px]">
                          {ext.callerId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-semibold">Email:</span>
                        <span className="text-slate-300 text-[11px] truncate max-w-[170px]">
                          {ext.email}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-semibold">WebRTC / Codec:</span>
                        <span className="text-sky-400 text-[11px] font-mono">
                          {ext.webrtcEnabled ? 'Abilitato • Opus' : 'SIP Standard'}
                        </span>
                      </div>
                    </div>

                    {/* Features Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {ext.webrtcEnabled && (
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-sky-950/60 text-sky-300 border border-sky-800/50 rounded-md flex items-center gap-1">
                          <Laptop className="w-3 h-3" />
                          WebRTC
                        </span>
                      )}
                      {ext.voicemailEnabled && (
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md flex items-center gap-1">
                          <Voicemail className="w-3 h-3 text-purple-400" />
                          Mailbox
                        </span>
                      )}
                      {ext.mobilePushEnabled && (
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-emerald-400" />
                          Push {ext.pushDeviceType === 'ios' ? 'iOS' : 'Android'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Connect / Select Action Button */}
                  <div className="pt-3 border-t border-slate-800/80">
                    {isActive ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 py-2 px-3 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-xs text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Collegato a questo PC</span>
                        </div>
                        <button
                          onClick={onNavigateToWebClient}
                          title="Apri il Web Client per questo interno"
                          className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition shrink-0"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`btn-connect-ext-${ext.number}`}
                        onClick={() => handleConnectExtension(ext)}
                        className="w-full py-2 px-3 bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-700 hover:border-sky-500 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-sm"
                      >
                        <Laptop className="w-3.5 h-3.5 text-sky-400 group-hover:text-white" />
                        <span>Collega questo Computer (Int. {ext.number})</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helpful Instructions & Features Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 text-xs text-slate-400 space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>Come funziona l'assegnazione dell'interno al computer?</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-1">
            <span className="text-white font-semibold block">1. Registrazione SIP WebRTC</span>
            <p className="text-[11px] text-slate-400">
              Il browser stabilisce un canale WebSocket cifrato (WSS) autenticato con l'interno scelto sul cluster Asterisk LTS.
            </p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-1">
            <span className="text-white font-semibold block">2. Sincronizzazione Presenza BLF</span>
            <p className="text-[11px] text-slate-400">
              Il tuo stato operatore (Online, Assente, DND) viene sincronizzato con i telefoni fissi e gli altri Web Client dell'azienda.
            </p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-1">
            <span className="text-white font-semibold block">3. Cambio Postazione Immediato</span>
            <p className="text-[11px] text-slate-400">
              Puoi cambiare l'interno associato a questo computer in qualsiasi momento dal menu superiore senza riavviare l'applicazione.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
