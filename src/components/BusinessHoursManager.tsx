import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Sun,
  Moon,
  ToggleLeft,
  ToggleRight,
  PhoneForwarded,
  Volume2,
  Play,
  Square,
  AlertTriangle,
  CheckCircle2,
  Code,
  Copy,
  Check,
  Plus,
  Trash2,
  Settings,
  Sparkles,
  PhoneCall,
  Voicemail
} from 'lucide-react';
import { BusinessHoursConfig, IVRMenu, Extension, RingGroup, VoicemailMessage } from '../types/pbx';
import { audioService } from '../services/audioService';

interface BusinessHoursManagerProps {
  config: BusinessHoursConfig;
  onUpdateConfig: (config: BusinessHoursConfig) => void;
  extensions: Extension[];
  ringGroups: RingGroup[];
  ivrMenus: IVRMenu[];
  onAddVoicemail: (message: VoicemailMessage) => void;
}

export const BusinessHoursManager: React.FC<BusinessHoursManagerProps> = ({
  config,
  onUpdateConfig,
  extensions,
  ringGroups,
  ivrMenus,
  onAddVoicemail
}) => {
  const [schedule, setSchedule] = useState(config.schedule);
  const [overrideMode, setOverrideMode] = useState<'auto' | 'force_open' | 'force_closed'>(config.overrideMode);
  const [holidays, setHolidays] = useState(config.holidays);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [isSimulatingIvr, setIsSimulatingIvr] = useState(false);
  const [simStep, setSimStep] = useState<'prompt' | 'digit_pressed' | 'voicemail_recording' | 'finished'>('prompt');
  const [simSelectedDigit, setSimSelectedDigit] = useState<string | null>(null);
  const [copiedDialplan, setCopiedDialplan] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState(new Date().toLocaleTimeString('it-IT'));

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toLocaleTimeString('it-IT'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine whether company is currently open or closed
  const isCurrentlyOpen = (): boolean => {
    if (overrideMode === 'force_open') return true;
    if (overrideMode === 'force_closed') return false;

    const now = new Date();
    const daysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
    const currentDay = daysMap[now.getDay()];
    const todayStr = now.toISOString().split('T')[0];

    // Check if today is a holiday
    const isHoliday = holidays.some((h) => h.date === todayStr);
    if (isHoliday) return false;

    const daySchedule = schedule.find((s) => s.day === currentDay);
    if (!daySchedule || !daySchedule.enabled) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const parseMinutes = (timeStr?: string) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const mStart = parseMinutes(daySchedule.morningStart);
    const mEnd = parseMinutes(daySchedule.morningEnd);
    const aStart = parseMinutes(daySchedule.afternoonStart);
    const aEnd = parseMinutes(daySchedule.afternoonEnd);

    const inMorning = currentMinutes >= mStart && currentMinutes <= mEnd;
    const inAfternoon = aEnd > aStart && currentMinutes >= aStart && currentMinutes <= aEnd;

    return inMorning || inAfternoon;
  };

  const currentlyOpen = isCurrentlyOpen();

  const handleToggleDay = (index: number) => {
    const updated = [...schedule];
    updated[index].enabled = !updated[index].enabled;
    setSchedule(updated);
    onUpdateConfig({ ...config, schedule: updated });
  };

  const handleTimeChange = (
    index: number,
    field: 'morningStart' | 'morningEnd' | 'afternoonStart' | 'afternoonEnd',
    val: string
  ) => {
    const updated = [...schedule];
    updated[index][field] = val;
    setSchedule(updated);
    onUpdateConfig({ ...config, schedule: updated });
  };

  const handleOverride = (mode: 'auto' | 'force_open' | 'force_closed') => {
    setOverrideMode(mode);
    onUpdateConfig({ ...config, overrideMode: mode });
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName) return;
    const updated = [
      ...holidays,
      { id: `h-${Date.now()}`, date: newHolidayDate, name: newHolidayName }
    ].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(updated);
    onUpdateConfig({ ...config, holidays: updated });
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const handleDeleteHoliday = (id: string) => {
    const updated = holidays.filter((h) => h.id !== id);
    setHolidays(updated);
    onUpdateConfig({ ...config, holidays: updated });
  };

  // After Hours IVR Simulator
  const handleStartIvrSimulation = () => {
    setIsSimulatingIvr(true);
    setSimStep('prompt');
    setSimSelectedDigit(null);

    const promptText =
      'Gentile cliente, i nostri uffici sono attualmente chiusi. L\'orario di lavoro è dal Lunedì al Venerdì dalle 08:30 alle 12:30 e dalle 14:00 alle 18:30. Per emergenze tecniche premere 1, per lasciare un messaggio nella segreteria generale premere 2, per informazioni su orari e sede premere 3.';

    audioService.speakPrompt(promptText);
  };

  const handleIvrDigitPress = (digit: string) => {
    audioService.stopSpeech();
    audioService.playDTMF(digit);
    setSimSelectedDigit(digit);

    if (digit === '1') {
      setSimStep('digit_pressed');
      audioService.speakPrompt('Inoltro della chiamata al servizio reperibilità tecnica H24 in corso.');
    } else if (digit === '2') {
      setSimStep('voicemail_recording');
      audioService.speakPrompt(
        'Lasciare un messaggio per la segreteria generale dopo il segnale acustico.',
        () => {
          audioService.playVoicemailBeep();
        }
      );
    } else if (digit === '3') {
      setSimStep('digit_pressed');
      audioService.speakPrompt('Siamo in Via Dante 12 a Milano. Aperti dal lunedì al venerdì dalle 8:30 alle 18:30.');
    }
  };

  const handleCompleteVoicemailRecording = () => {
    audioService.playVoicemailBeep();
    const newMsg: VoicemailMessage = {
      id: `vm-${Date.now()}`,
      mailbox: 'general',
      callerNumber: '+39 02 88990011',
      callerName: 'Test IVR Fuori Orario',
      timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + ' Oggi',
      durationSeconds: 22,
      isNew: true,
      reason: 'out_of_hours',
      transcription: 'Messaggio di prova registrato tramite il menu IVR Chiamate Fuori Orario (Tasto 2).',
      fileSize: '352 KB'
    };

    onAddVoicemail(newMsg);
    setSimStep('finished');
  };

  const handleStopIvrSimulation = () => {
    audioService.stopSpeech();
    setIsSimulatingIvr(false);
  };

  const generateTimeConditionsDialplan = () => {
    return `; =========================================================
; Asterisk Dialplan: Orari di Lavoro e IVR Fuori Orario
; Generato per Asterisk 20 LTS su Rocky Linux
; =========================================================

[time-conditions]
; 1. Controllo Chiusure e Festività Nazionali
exten => s,1,NoOp(--- Verifica Condizioni Orarie Azienda ---)
 ${holidays
   .map((h) => {
     const parts = (h.date || '').split('-');
     const month = parts[1] || '1';
     const day = parts[2] || '1';
     return `same => n,GotoIfTime(*,*,${parseInt(day, 10)},${parseInt(month, 10)}?after-hours,s,1) ; ${h.name}`;
   })
   .join('\n ')}

; 2. Controllo Orari Settimanali Ufficio (Mattina & Pomeriggio)
${schedule
  .filter((s) => s.enabled)
  .map((s) => {
    return ` same => n,GotoIfTime(${s.morningStart}-${s.morningEnd},${s.day},*,*?office-hours,s,1)
 same => n,GotoIfTime(${s.afternoonStart}-${s.afternoonEnd},${s.day},*,*?office-hours,s,1)`;
  })
  .join('\n')}

; 3. Se non corrisponde a nessun orario valido -> Fuori Orario
 same => n,Goto(after-hours-ivr,s,1)

; --- IN ORARIO DI LAVORO ---
[office-hours]
exten => s,1,NoOp(Chiamata In Orario -> Inoltro a ${config.inHoursDestination.name})
 same => n,Goto(ivr-principale,s,1)

; --- FUORI ORARIO DI LAVORO ---
[after-hours-ivr]
exten => s,1,NoOp(Chiamata Fuori Orario -> Menu Notturno / Chiuso)
 same => n,Answer()
 same => n,Wait(1)
 same => n,Background(custom/prompt_uffici_chiusi)
 same => n,WaitExten(8)

; Tasto 1: Reperibilità Tecnica H24
exten => 1,1,NoOp(Reperibilità Tecnica H24)
 same => n,Dial(PJSIP/103&PJSIP/105,30,m)
 same => n,VoiceMail(general@default,u)
 same => n,Hangup()

; Tasto 2: Segreteria Generale Fuori Orario
exten => 2,1,NoOp(Registrazione Segreteria Generale)
 same => n,VoiceMail(general@default,u)
 same => n,Hangup()

; Tasto 3: Informazioni Orari e Sede
exten => 3,1,Playback(custom/info_orari_sede)
 same => n,Goto(s,1)

; Timeout o Selezione Invalida
exten => t,1,VoiceMail(general@default,u)
exten => i,1,Playback(invalid)
 same => n,Goto(s,1)
`;
  };

  const copyDialplan = () => {
    navigator.clipboard.writeText(generateTimeConditionsDialplan());
    setCopiedDialplan(true);
    setTimeout(() => setCopiedDialplan(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Real-time Status Card with Override Switches */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl border ${
                currentlyOpen
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
              }`}
            >
              {currentlyOpen ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {currentlyOpen ? 'UFFICI APERTI (In Orario di Lavoro)' : 'UFFICI CHIUSI (Fuori Orario / Notturno)'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    currentlyOpen
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-indigo-950 text-indigo-400 border-indigo-800'
                  }`}
                >
                  {overrideMode === 'auto' ? 'Automatico' : overrideMode === 'force_open' ? 'Forzato Aperto' : 'Forzato Chiuso'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ora di sistema: <span className="font-mono text-white font-semibold">{currentTimeStr}</span> (Europe/Rome) • Rotta attiva:{' '}
                <span className="text-sky-400 font-semibold">
                  {currentlyOpen ? config.inHoursDestination.name : config.outOfHoursDestination.name}
                </span>
              </p>
            </div>
          </div>

          {/* Override Mode Controls */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 self-start lg:self-center">
            <button
              onClick={() => handleOverride('auto')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                overrideMode === 'auto'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Auto (Orari)
            </button>
            <button
              onClick={() => handleOverride('force_open')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                overrideMode === 'force_open'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Forza Aperto
            </button>
            <button
              onClick={() => handleOverride('force_closed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                overrideMode === 'force_closed'
                  ? 'bg-indigo-950 text-indigo-400 border border-indigo-800 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Forza Chiuso
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Weekly Schedule + Destinations & Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Weekly Schedule Matrix */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Orari Settimanali Ricezione Chiamate</span>
              </h3>
              <p className="text-xs text-slate-400">
                Definisci le fasce orarie di apertura mattina e pomeriggio per l'instradamento automatico
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {schedule.map((item, idx) => (
              <div
                key={item.day}
                className={`p-3 rounded-lg border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.enabled ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-950/20 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 w-36">
                  <button
                    onClick={() => handleToggleDay(idx)}
                    className="text-slate-400 hover:text-white transition"
                  >
                    {item.enabled ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                  <span className={`text-sm font-semibold ${item.enabled ? 'text-white' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </div>

                {item.enabled ? (
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {/* Morning */}
                    <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                      <span className="text-slate-400 text-[11px]">Mattina:</span>
                      <input
                        type="time"
                        value={item.morningStart}
                        onChange={(e) => handleTimeChange(idx, 'morningStart', e.target.value)}
                        className="bg-slate-800 text-white font-mono text-xs rounded px-1.5 py-0.5 border border-slate-700"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="time"
                        value={item.morningEnd}
                        onChange={(e) => handleTimeChange(idx, 'morningEnd', e.target.value)}
                        className="bg-slate-800 text-white font-mono text-xs rounded px-1.5 py-0.5 border border-slate-700"
                      />
                    </div>

                    {/* Afternoon */}
                    <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                      <span className="text-slate-400 text-[11px]">Pomeriggio:</span>
                      <input
                        type="time"
                        value={item.afternoonStart}
                        onChange={(e) => handleTimeChange(idx, 'afternoonStart', e.target.value)}
                        className="bg-slate-800 text-white font-mono text-xs rounded px-1.5 py-0.5 border border-slate-700"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="time"
                        value={item.afternoonEnd}
                        onChange={(e) => handleTimeChange(idx, 'afternoonEnd', e.target.value)}
                        className="bg-slate-800 text-white font-mono text-xs rounded px-1.5 py-0.5 border border-slate-700"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 italic">Chiuso tutto il giorno</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Routing In/Out & Holidays */}
        <div className="space-y-6">
          {/* Routing Destinations Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PhoneForwarded className="w-4 h-4 text-emerald-400" />
              <span>Destinazioni di Inoltro Chiamate</span>
            </h3>

            {/* In-Hours */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" />
                <span>In Orario di Lavoro (Uffici Aperti)</span>
              </label>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200">
                <div className="font-semibold text-white">IVR Principale Aziendale</div>
                <div className="text-[11px] text-slate-400">Accoglienza telefonica con selezione 1-Commerciale, 2-Helpdesk, 3-Amministrazione, 0-Centralino</div>
              </div>
            </div>

            {/* Out-of-Hours */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-indigo-400 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5" />
                <span>Fuori Orario (Uffici Chiusi & Notte)</span>
              </label>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200">
                <div className="font-semibold text-white">IVR Fuori Orario & Segreteria</div>
                <div className="text-[11px] text-slate-400">Annuncio chiusura con selezione 1-Reperibilità H24 o 2-Registrazione Messaggio Segreteria</div>
              </div>
            </div>
          </div>

          {/* Holidays & Closures Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Festività e Chiusure Aziendali</span>
            </h3>

            {/* Add holiday form */}
            <form onSubmit={handleAddHoliday} className="flex gap-2">
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Nome chiusura..."
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
              >
                +
              </button>
            </form>

            <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 text-xs">
              {holidays.map((h) => (
                <div key={h.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sky-400 mr-2">{h.date}</span>
                    <span className="text-slate-200">{h.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: IVR Fuori Orario Interactive Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span>Simulatore Interattivo: IVR Chiamate Fuori Orario</span>
            </h3>
            <p className="text-xs text-slate-400">
              Ascolta il messaggio di benvenuto fuori orario in italiano, digita i tasti interattivi ed esegui la registrazione del messaggio vocale
            </p>
          </div>

          {!isSimulatingIvr ? (
            <button
              onClick={handleStartIvrSimulation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm self-start"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Avvia Test Fuori Orario</span>
            </button>
          ) : (
            <button
              onClick={handleStopIvrSimulation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm self-start"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Ferma Simulazione</span>
            </button>
          )}
        </div>

        {/* Simulator Box */}
        {isSimulatingIvr && (
          <div className="p-4 bg-slate-950 border border-indigo-500/30 rounded-lg space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                Chiamata Fuori Orario in Corso (DID Aziendale +39 02 12345678)
              </span>
              <span className="font-mono text-slate-400">Audio Synth: Italiano (it-IT)</span>
            </div>

            <div className="p-3 bg-slate-900/90 rounded border border-slate-800 text-xs text-slate-300 italic">
              "Gentile cliente, i nostri uffici sono attualmente chiusi. L'orario di lavoro è dal Lunedì al Venerdì dalle 08:30 alle 12:30 e dalle 14:00 alle 18:30. Per emergenze tecniche premere 1, per lasciare un messaggio nella segreteria generale premere 2, per informazioni su orari e sede premere 3."
            </div>

            {/* Interactive Keypad buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold">Tasti IVR Disponibili:</span>
              <button
                onClick={() => handleIvrDigitPress('1')}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-indigo-600 text-white text-xs font-bold border border-slate-700 transition"
              >
                1 - Reperibilità Tecnica H24
              </button>
              <button
                onClick={() => handleIvrDigitPress('2')}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-indigo-600 text-white text-xs font-bold border border-slate-700 transition"
              >
                2 - Lascia Messaggio Segreteria
              </button>
              <button
                onClick={() => handleIvrDigitPress('3')}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-indigo-600 text-white text-xs font-bold border border-slate-700 transition"
              >
                3 - Orari e Sede
              </button>
            </div>

            {/* If Voicemail selected */}
            {simStep === 'voicemail_recording' && (
              <div className="p-3 bg-rose-950/30 border border-rose-800/60 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-rose-300">
                  <Voicemail className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>Segnale acustico emesso [BEEP]. Registrazione messaggio vocale chiamante in corso...</span>
                </div>
                <button
                  onClick={handleCompleteVoicemailRecording}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm"
                >
                  Aggancia e Salva in Segreteria
                </button>
              </div>
            )}

            {simStep === 'finished' && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Messaggio registrato con successo e archiviato nella Segreteria Generale Fuori Orario!</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialplan Asterisk Export */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-sky-400" />
              <span>Asterisk Dialplan: GotoIfTime & Context Fuori Orario</span>
            </h3>
            <p className="text-xs text-slate-400">
              Regole extensions.conf per gestire automaticamente la chiusura e l'inoltro
            </p>
          </div>
          <button
            onClick={copyDialplan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
          >
            {copiedDialplan ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedDialplan ? 'Copiato!' : 'Copia Dialplan'}</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-950 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800 max-h-72">
          {generateTimeConditionsDialplan()}
        </pre>
      </div>
    </div>
  );
};
