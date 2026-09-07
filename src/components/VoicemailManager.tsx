import React, { useState, useRef, useEffect } from 'react';
import {
  Voicemail,
  Play,
  Pause,
  Download,
  Trash2,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  Clock,
  User,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Volume2,
  RefreshCw,
  Plus,
  Search,
  Code,
  Check,
  Copy
} from 'lucide-react';
import { VoicemailMessage, Extension } from '../types/pbx';
import { audioService } from '../services/audioService';

interface VoicemailManagerProps {
  voicemails: VoicemailMessage[];
  extensions: Extension[];
  onDeleteVoicemail: (id: string) => void;
  onToggleRead: (id: string) => void;
  onAddVoicemail: (message: VoicemailMessage) => void;
  onDialNumber: (number: string) => void;
}

export const VoicemailManager: React.FC<VoicemailManagerProps> = ({
  voicemails,
  extensions,
  onDeleteVoicemail,
  onToggleRead,
  onAddVoicemail,
  onDialNumber
}) => {
  const [selectedMailbox, setSelectedMailbox] = useState<string>('all');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'messages' | 'config' | 'dialplan'>('messages');
  const [copiedConf, setCopiedConf] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const progressIntervalRef = useRef<any>(null);

  // Stop playback when unmounting
  useEffect(() => {
    return () => {
      audioService.stopSpeech();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const filteredMessages = voicemails.filter((vm) => {
    const matchMailbox = selectedMailbox === 'all' || vm.mailbox === selectedMailbox;
    const matchReason = filterReason === 'all' || vm.reason === filterReason;
    const matchSearch =
      vm.callerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vm.callerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vm.transcription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMailbox && matchReason && matchSearch;
  });

  const unreadCount = voicemails.filter((vm) => vm.isNew).length;

  const handlePlayMessage = (vm: VoicemailMessage) => {
    if (playingId === vm.id) {
      // Pause/Stop
      audioService.stopSpeech();
      setPlayingId(null);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setPlaybackProgress(0);
      return;
    }

    // Mark as read
    if (vm.isNew) {
      onToggleRead(vm.id);
    }

    audioService.stopSpeech();
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    setPlayingId(vm.id);
    setPlaybackProgress(0);

    const stepMs = (vm.durationSeconds * 1000) / 100;
    progressIntervalRef.current = setInterval(() => {
      setPlaybackProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current);
          setPlayingId(null);
          return 0;
        }
        return prev + 1;
      });
    }, stepMs);

    // Speak Italian voicemail transcription
    audioService.speakPrompt(vm.transcription, () => {
      setPlayingId(null);
      setPlaybackProgress(0);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    });
  };

  const handleDownloadWav = (vm: VoicemailMessage) => {
    // Generate synthetic RIFF/WAVE header and silence/beep audio blob
    const sampleRate = 8000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate * Math.min(vm.durationSeconds, 10);
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Synthesize simple audio waveform for sample
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 440 * t) * 0.2 * 32767;
      view.setInt16(44 + i * 2, sample, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voicemail_${vm.mailbox}_${vm.callerNumber.replace(/[^0-9]/g, '')}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSimulateNewVoicemail = (reason: 'no_answer' | 'busy' | 'out_of_hours') => {
    setIsSimulating(true);

    const sampleCallers = [
      { name: 'Studio Legale Brambilla', number: '+39 02 44556677', mailbox: '101', text: 'Buongiorno, ho provato a chiamare per concordare i dettagli del contratto SIP. Vi prego di richiamarmi appena possibile.' },
      { name: 'Logistica Trasporti Nord', number: '+39 349 9988776', mailbox: '102', text: 'Ciao Sara, sono della logistica. Il corriere per i telefoni Yealink è in consegna oggi alle 15. Confermate presenza.' },
      { name: 'Centrale Energetica', number: '+39 06 99112233', mailbox: 'general', text: 'Messaggio per la segreteria generale. Abbiamo una comunicazione urgente relativa alla fornitura di rete.' }
    ];

    const pick = sampleCallers[Math.floor(Math.random() * sampleCallers.length)];

    // Play voicemail prompt & beep
    audioService.playVoicemailBeep();

    setTimeout(() => {
      const newMsg: VoicemailMessage = {
        id: `vm-${Date.now()}`,
        mailbox: pick.mailbox,
        callerNumber: pick.number,
        callerName: pick.name,
        timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + ' Oggi',
        durationSeconds: Math.floor(Math.random() * 25) + 15,
        isNew: true,
        reason: reason,
        transcription: pick.text,
        fileSize: `${Math.floor(Math.random() * 300 + 200)} KB`
      };

      onAddVoicemail(newMsg);
      setIsSimulating(false);
    }, 1200);
  };

  const generateVoicemailConf = () => {
    return `; =========================================================
; Asterisk Voicemail Configuration (voicemail.conf)
; Asterisk 20 LTS - PBX Rocky Linux Cluster
; =========================================================

[general]
format=wav49|wav|gsm
serveremail=asterisk-pbx@azienda.it
attach=yes
maxsilence=5
silencethreshold=128
maxmessage=300
minmessage=3
maxgreet=60
skipms=3000
maxlogins=3
emaildateformat=%A, %d %B %Y at %H:%M:%S
mailcmd=/usr/sbin/sendmail -t
charset=UTF-8

[zonemessages]
italy=Europe/Rome|'vm-received' q 'digits/at' kM 'hours'

[default]
${extensions
  .map(
    (ext) =>
      `${ext.number} => ${ext.voicemailPin || '1234'},${ext.name},${ext.email},,attach=yes|saycid=yes|envelope=yes|tz=italy`
  )
  .join('\n')}
general => 0000,Segreteria Generale Fuori Orario,segreteria@azienda.it,,attach=yes|saycid=yes|tz=italy
`;
  };

  const copyVoicemailConf = () => {
    navigator.clipboard.writeText(generateVoicemailConf());
    setCopiedConf(true);
    setTimeout(() => setCopiedConf(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats & Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Voicemail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Segreterie Telefoniche & Messaggi Vocali</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                      {unreadCount} {unreadCount === 1 ? 'Nuovo' : 'Nuovi'}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  Archivio registrazioni su mancata risposta, interno occupato e chiamate fuori orario • Caselle vocali PJSIP
                </p>
              </div>
            </div>
          </div>

          {/* Quick Simulation & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSimulateNewVoicemail('no_answer')}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
              title="Simula una chiamata non risposta inoltrata a segreteria"
            >
              <PhoneOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Simula Non Risposta</span>
            </button>

            <button
              onClick={() => handleSimulateNewVoicemail('busy')}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
              title="Simula un interno occupato con deposito messaggio in segreteria"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Simula Su Occupato</span>
            </button>

            <button
              onClick={() => onDialNumber('*97')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition shadow-sm"
              title="Chiama la segreteria dal WebPhone (*97)"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Ascolta da Phone (*97)</span>
            </button>
          </div>
        </div>

        {/* Quick Nav Tabs */}
        <div className="flex items-center gap-2 mt-5 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${
              activeTab === 'messages'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Messaggi Vocali ({voicemails.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${
              activeTab === 'config'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Configurazione Caselle PJSIP
          </button>
          <button
            onClick={() => setActiveTab('dialplan')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${
              activeTab === 'dialplan'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            voicemail.conf (Asterisk)
          </button>
        </div>
      </div>

      {/* TAB 1: MESSAGES LIST */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Mailbox filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Casella:</span>
                <select
                  value={selectedMailbox}
                  onChange={(e) => setSelectedMailbox(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="all">Tutte le Caselle</option>
                  <option value="general">Generale Fuori Orario</option>
                  {extensions.map((ext) => (
                    <option key={ext.id} value={ext.number}>
                      Int. {ext.number} - {ext.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Motivo:</span>
                <select
                  value={filterReason}
                  onChange={(e) => setFilterReason(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="all">Tutti i Motivi</option>
                  <option value="no_answer">Mancata Risposta</option>
                  <option value="busy">Interno Occupato</option>
                  <option value="out_of_hours">Fuori Orario</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cerca numero o testo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Messages Grid / Table */}
          {filteredMessages.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 space-y-3">
              <Voicemail className="w-10 h-10 mx-auto text-slate-600" />
              <div className="text-sm font-medium text-slate-400">Nessun messaggio vocale trovato</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Non sono presenti registrazioni corrispondenti ai filtri impostati. Clicca sui pulsanti di simulazione per testare un deposito messaggio.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((vm) => {
                const isPlaying = playingId === vm.id;
                const reasonLabels = {
                  no_answer: { label: 'Non Risposto', color: 'text-amber-400 bg-amber-950/40 border-amber-800/60' },
                  busy: { label: 'Su Occupato', color: 'text-rose-400 bg-rose-950/40 border-rose-800/60' },
                  out_of_hours: { label: 'Fuori Orario', color: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/60' },
                  direct: { label: 'Diretto', color: 'text-sky-400 bg-sky-950/40 border-sky-800/60' }
                };

                return (
                  <div
                    key={vm.id}
                    className={`bg-slate-900 border rounded-xl p-4 transition shadow-sm ${
                      vm.isNew
                        ? 'border-sky-500/50 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Caller Info & Status */}
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handlePlayMessage(vm)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition shadow-sm ${
                            isPlaying
                              ? 'bg-sky-500 text-slate-950 animate-pulse'
                              : vm.isNew
                              ? 'bg-sky-600 hover:bg-sky-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                          title={isPlaying ? 'Pausa / Stop' : 'Ascolta Messaggio Vocale'}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">{vm.callerName}</span>
                            <span className="font-mono text-xs text-sky-400">{vm.callerNumber}</span>
                            {vm.isNew && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500 text-slate-950 rounded-full">
                                NUOVO
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1 font-mono text-slate-400">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {vm.timestamp}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-slate-300">{vm.durationSeconds}s ({vm.fileSize})</span>
                            <span>•</span>
                            <span className="font-mono text-xs text-slate-300">
                              Casella: <strong className="text-white">{vm.mailbox === 'general' ? 'Generale (0)' : `Int. ${vm.mailbox}`}</strong>
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] rounded border font-medium ${
                                reasonLabels[vm.reason]?.color || ''
                              }`}
                            >
                              {reasonLabels[vm.reason]?.label || vm.reason}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => onDialNumber(vm.callerNumber)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold border border-slate-700 transition"
                          title="Richiama numero chiamante dal Web Client"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Richiama</span>
                        </button>

                        <button
                          onClick={() => handleDownloadWav(vm)}
                          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                          title="Scarica file audio WAV per archivio"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onToggleRead(vm.id)}
                          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                          title={vm.isNew ? 'Segna come già ascoltato' : 'Segna come non letto'}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${vm.isNew ? 'text-slate-400' : 'text-emerald-400'}`} />
                        </button>

                        <button
                          onClick={() => onDeleteVoicemail(vm.id)}
                          className="p-1.5 rounded-md bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                          title="Elimina messaggio vocale"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Transcription preview & Progress bar if playing */}
                    <div className="mt-3 bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                      <div className="text-xs text-slate-300 italic">
                        "{vm.transcription}"
                      </div>

                      {isPlaying && (
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>Riproduzione audio vocale in corso...</span>
                            <span>{Math.round((playbackProgress / 100) * vm.durationSeconds)}s / {vm.durationSeconds}s</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-sky-400 h-full transition-all duration-200"
                              style={{ width: `${playbackProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXTENSIONS MAILBOX CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-2">Impostazioni Caselle Vocali per Interno</h3>
            <p className="text-xs text-slate-400 mb-4">
              Ciascun interno PJSIP dispone di una segreteria telefonica dedicata, protetta da PIN per ascolto da remoto (*97) e con invio automatico del file .wav alla casella di posta elettronica.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
                    <th className="py-2.5 px-3">Interno</th>
                    <th className="py-2.5 px-3">Nome Assegnatario</th>
                    <th className="py-2.5 px-3">Stato Segreteria</th>
                    <th className="py-2.5 px-3">PIN Asterisk (*97)</th>
                    <th className="py-2.5 px-3">Notifica Email Audio WAV</th>
                    <th className="py-2.5 px-3">Inoltro su Mancata Risposta</th>
                    <th className="py-2.5 px-3">Inoltro su Occupato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {extensions.map((ext) => (
                    <tr key={ext.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-sky-400">{ext.number}</td>
                      <td className="py-3 px-3 font-medium text-white">{ext.name}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ext.voicemailEnabled
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {ext.voicemailEnabled ? 'Attiva' : 'Disattivata'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{ext.voicemailPin || '1234'}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{ext.email}</td>
                      <td className="py-3 px-3 text-slate-300">
                        Dopo {ext.forwardSettings?.onNoAnswer?.ringTimeSeconds || 20}s ➔ Segreteria
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {ext.callWaitingEnabled ? 'Avviso Chiamata + Segr.' : 'Segreteria Immediata'}
                      </td>
                    </tr>
                  ))}
                  {/* General mailbox */}
                  <tr className="bg-slate-800/30">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-400">general</td>
                    <td className="py-3 px-3 font-medium text-white">Segreteria Generale Fuori Orario</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        Attiva H24
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">0000</td>
                    <td className="py-3 px-3 font-mono text-slate-400">segreteria@azienda.it</td>
                    <td className="py-3 px-3 text-slate-300">Orari Chiusura Azienda</td>
                    <td className="py-3 px-3 text-slate-300">IVR Fuori Orario Tasto 2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ASTERISK VOICEMAIL.CONF */}
      {activeTab === 'dialplan' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-sky-400" />
                <span>/etc/asterisk/voicemail.conf</span>
              </h3>
              <p className="text-xs text-slate-400">
                Configurazione compilata per il demone Asterisk su Rocky Linux 9
              </p>
            </div>
            <button
              onClick={copyVoicemailConf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
            >
              {copiedConf ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedConf ? 'Copiato!' : 'Copia Config'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800 max-h-96">
            {generateVoicemailConf()}
          </pre>
        </div>
      )}
    </div>
  );
};
