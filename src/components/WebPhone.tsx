import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  Delete,
  Radio,
  Clock,
  User,
  Users,
  Disc,
  Grid,
  ChevronRight,
  Voicemail,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { Extension, CDRRecord, VoicemailMessage } from '../types/pbx';

interface WebPhoneProps {
  isOpen: boolean;
  onClose: () => void;
  extensions: Extension[];
  onCallFinished: (record: Partial<CDRRecord>) => void;
  externalNumberToDial?: string | null;
  onClearExternalDial?: () => void;
  onAddVoicemail?: (message: VoicemailMessage) => void;
  activeExtension?: Extension;
}

interface CallParticipant {
  number: string;
  name: string;
  department?: string;
  isInternal: boolean;
}

export const WebPhone: React.FC<WebPhoneProps> = ({
  isOpen,
  onClose,
  extensions,
  onCallFinished,
  externalNumberToDial,
  onClearExternalDial,
  onAddVoicemail,
  activeExtension
}) => {
  const myExt = activeExtension || extensions.find((e) => e.number === '101') || extensions[0];
  const myNumber = myExt?.number || '101';
  const myName = myExt?.name || 'Marco Rossi';
  const myCallerId = myExt?.callerId || `"${myName}" <${myNumber}>`;

  const [dialNumber, setDialNumber] = useState('');
  const [callState, setCallState] = useState<
    'idle' | 'calling' | 'ringing' | 'connected' | 'incoming' | 'voicemail_recording' | 'voicemail_ivr'
  >('idle');
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showInCallKeypad, setShowInCallKeypad] = useState(false);

  // Transfer state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferMode, setTransferMode] = useState<'blind' | 'attended'>('blind');
  const [transferTarget, setTransferTarget] = useState('');
  const [isAttendedTransferActive, setIsAttendedTransferActive] = useState(false);
  const [attendedTargetInfo, setAttendedTargetInfo] = useState<CallParticipant | null>(null);

  // Line 1 & Line 2 Call Waiting State
  const [currentCallInfo, setCurrentCallInfo] = useState<CallParticipant | null>(null);
  const [secondCallInfo, setSecondCallInfo] = useState<CallParticipant | null>(null);
  const [activeLine, setActiveLine] = useState<1 | 2>(1);
  const [secondCallState, setSecondCallState] = useState<'idle' | 'ringing' | 'connected' | 'held'>('idle');

  // Voicemail recording during no-answer or busy
  const [voicemailRecordingSeconds, setVoicemailRecordingSeconds] = useState(0);

  const [activeTab, setActiveTab] = useState<'dialpad' | 'extensions' | 'recents'>('dialpad');
  const [recentCalls, setRecentCalls] = useState<
    Array<{ number: string; name: string; time: string; type: 'in' | 'out' | 'missed' }>
  >([
    { number: '102', name: 'Sara Bianchi', time: '10:15', type: 'out' },
    { number: '+39 02 87654321', name: 'Milano Ufficio', time: '09:42', type: 'in' },
    { number: '103', name: 'Alessandro Verdi', time: 'Ieri', type: 'in' }
  ]);

  const timerRef = useRef<any>(null);
  const vmTimerRef = useRef<any>(null);
  const incomingTimeoutRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Trigger click-to-call
  useEffect(() => {
    if (externalNumberToDial) {
      setDialNumber(externalNumberToDial);
      if (onClearExternalDial) onClearExternalDial();
      handleStartCall(externalNumberToDial);
    }
  }, [externalNumberToDial]);

  // Main Call duration counter
  useEffect(() => {
    if (callState === 'connected') {
      setCallTimer(0);
      timerRef.current = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Audio wave visualizer during active call
  useEffect(() => {
    if (callState === 'connected' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barCount = 20;
        const barWidth = canvas.width / barCount;

        for (let i = 0; i < barCount; i++) {
          const height = isOnHold
            ? 4
            : isMuted
            ? 2
            : Math.max(6, Math.sin(Date.now() / 150 + i * 0.5) * 16 + 18);

          ctx.fillStyle = isOnHold ? '#f59e0b' : '#38bdf8';
          ctx.fillRect(i * barWidth + 2, (canvas.height - height) / 2, barWidth - 4, height);
        }

        animFrameRef.current = requestAnimationFrame(render);
      };

      render();
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [callState, isOnHold, isMuted]);

  const handleKeyPress = (digit: string) => {
    audioService.playDTMF(digit);
    if (callState === 'connected') {
      return;
    }
    setDialNumber((prev) => prev + digit);
  };

  // Dial out
  const handleStartCall = (targetNum?: string) => {
    const numToCall = targetNum || dialNumber;
    if (!numToCall.trim()) return;

    // Check if voicemail access *97 or *98
    if (numToCall === '*97' || numToCall === '*98') {
      setCallState('voicemail_ivr');
      audioService.speakPrompt(
        `Benvenuto nella segreteria telefonica Asterisk per l'interno ${myNumber}. Inserisci il tuo PIN seguito dal tasto cancelletto oppure premi 1 per ascoltare i messaggi.`
      );
      return;
    }

    // Resolve name and internal status
    const ext = extensions.find((e) => e.number === numToCall);
    const isInternal = !!ext;
    const targetName = ext
      ? ext.name
      : numToCall.startsWith('+')
      ? 'Numero Esterno'
      : `Destinazione ${numToCall}`;

    const participant: CallParticipant = {
      number: numToCall,
      name: targetName,
      department: ext?.department,
      isInternal
    };

    setCurrentCallInfo(participant);
    setCallState('calling');
    audioService.startRingback();

    // Internal vs External answer simulation
    setTimeout(() => {
      audioService.stopTones();
      setCallState('connected');

      // Speak internal greeting if calling another extension!
      if (isInternal && ext) {
        audioService.speakPrompt(
          `Pronto, qui ${ext.name} dal reparto ${ext.department}, ciao ${myName.split(' ')[0]}!`
        );
      }

      setRecentCalls((prev) => [
        { number: numToCall, name: targetName, time: 'Adesso', type: 'out' },
        ...prev
      ]);
    }, 2200);
  };

  const handleHangup = () => {
    audioService.playHangup();
    audioService.stopTones();

    if (currentCallInfo) {
      onCallFinished({
        callDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
        clid: myCallerId,
        src: myNumber,
        dst: currentCallInfo.number,
        duration: callTimer + 3,
        billsec: callTimer,
        disposition: callTimer > 0 ? 'ANSWERED' : 'NO ANSWER',
        hasRecording: isRecording,
        recordingFile: isRecording ? `rec-${Date.now()}-${myNumber}.wav` : undefined,
        mosScore: 4.42,
        codec: currentCallInfo.isInternal ? 'opus (48kHz internal)' : 'opus (48kHz)'
      });
    }

    if (incomingTimeoutRef.current) clearTimeout(incomingTimeoutRef.current);
    if (vmTimerRef.current) clearInterval(vmTimerRef.current);

    setCallState('idle');
    setCallTimer(0);
    setIsMuted(false);
    setIsOnHold(false);
    setIsRecording(false);
    setShowInCallKeypad(false);
    setShowTransferModal(false);
    setIsAttendedTransferActive(false);
    setAttendedTargetInfo(null);
    setCurrentCallInfo(null);
    setSecondCallInfo(null);
    setSecondCallState('idle');
    setActiveLine(1);
  };

  // Simulate Incoming Call
  const handleSimulateIncoming = () => {
    const callers: CallParticipant[] = [
      { name: 'Studio Legale Brambilla', number: '+39 02 87654321', isInternal: false },
      { name: 'Sara Bianchi', number: '102', department: 'Commerciale', isInternal: true },
      { name: 'Alessandro Verdi', number: '103', department: 'Supporto Tecnico', isInternal: true },
      { name: 'Logistica Trasporti Nord', number: '+39 348 1122334', isInternal: false }
    ];

    const picked = callers[Math.floor(Math.random() * callers.length)];

    // If already connected -> Trigger CALL WAITING (Attesa su interno occupato)
    if (callState === 'connected') {
      audioService.playCallWaitingBeep();
      setSecondCallInfo(picked);
      setSecondCallState('ringing');
      return;
    }

    setCurrentCallInfo(picked);
    setCallState('incoming');
    audioService.startIncomingRingtone();

    // Auto timeout after 18s -> Invia a Segreteria per mancata risposta!
    if (incomingTimeoutRef.current) clearTimeout(incomingTimeoutRef.current);
    incomingTimeoutRef.current = setTimeout(() => {
      handleNoAnswerVoicemail(picked);
    }, 18000);
  };

  const handleAnswerIncoming = () => {
    if (incomingTimeoutRef.current) clearTimeout(incomingTimeoutRef.current);
    audioService.stopTones();
    setCallState('connected');
    if (currentCallInfo) {
      setRecentCalls((prev) => [
        { number: currentCallInfo.number, name: currentCallInfo.name, time: 'Adesso', type: 'in' },
        ...prev
      ]);
    }
  };

  // When call is declined or not answered -> Inoltro su Segreteria con registrazione
  const handleDeclineIncoming = (goToVoicemail = true) => {
    if (incomingTimeoutRef.current) clearTimeout(incomingTimeoutRef.current);
    audioService.stopTones();

    if (goToVoicemail && currentCallInfo) {
      handleBusyVoicemail(currentCallInfo);
    } else {
      audioService.playHangup();
      if (currentCallInfo) {
        setRecentCalls((prev) => [
          { number: currentCallInfo.number, name: currentCallInfo.name, time: 'Adesso', type: 'missed' },
          ...prev
        ]);
      }
      setCallState('idle');
      setCurrentCallInfo(null);
    }
  };

  // Voicemail on Busy
  const handleBusyVoicemail = (participant: CallParticipant) => {
    setCallState('voicemail_recording');
    audioService.speakPrompt(
      `L'interno ${myNumber} è attualmente occupato in un'altra conversazione. Si prega di lasciare un messaggio vocale dopo il segnale acustico.`,
      () => {
        audioService.playVoicemailBeep();
        startRecordingVoicemail(participant, 'busy');
      }
    );
  };

  // Voicemail on No Answer
  const handleNoAnswerVoicemail = (participant: CallParticipant) => {
    audioService.stopTones();
    setCallState('voicemail_recording');
    audioService.speakPrompt(
      `L'interno ${myNumber} non è al momento disponibile. Si prega di lasciare un messaggio vocale dopo il segnale acustico.`,
      () => {
        audioService.playVoicemailBeep();
        startRecordingVoicemail(participant, 'no_answer');
      }
    );
  };

  const startRecordingVoicemail = (
    participant: CallParticipant,
    reason: 'no_answer' | 'busy' | 'out_of_hours'
  ) => {
    setVoicemailRecordingSeconds(0);
    if (vmTimerRef.current) clearInterval(vmTimerRef.current);

    vmTimerRef.current = setInterval(() => {
      setVoicemailRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // Auto save voicemail after 8 seconds of simulated message
    setTimeout(() => {
      finishVoicemailRecording(participant, reason, 28);
    }, 8000);
  };

  const finishVoicemailRecording = (
    participant: CallParticipant,
    reason: 'no_answer' | 'busy' | 'out_of_hours',
    duration = 24
  ) => {
    if (vmTimerRef.current) clearInterval(vmTimerRef.current);
    audioService.playHangup();

    if (onAddVoicemail) {
      const newMsg: VoicemailMessage = {
        id: `vm-${Date.now()}`,
        mailbox: myNumber,
        callerNumber: participant.number,
        callerName: participant.name,
        timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + ' Oggi',
        durationSeconds: duration,
        isNew: true,
        reason,
        transcription:
          reason === 'busy'
            ? `Messaggio registrato su interno occupato da ${participant.name}: Vi ho cercato ma la linea era occupata, richiamatemi al ${participant.number}.`
            : `Messaggio su mancata risposta da ${participant.name}: Ho provato a contattarvi sul fisso, vi prego di ricontattarmi appena rientrate.`,
        fileSize: `${Math.floor(Math.random() * 200 + 300)} KB`
      };
      onAddVoicemail(newMsg);
    }

    setCallState('idle');
    setCurrentCallInfo(null);
  };

  // CALL WAITING ACTIONS (Dual-Line)
  const handleHoldAndAnswerLine2 = () => {
    if (!secondCallInfo) return;
    // Put line 1 on hold
    setIsOnHold(true);
    setActiveLine(2);
    setSecondCallState('connected');
    audioService.speakPrompt(`Linea 2 attiva con ${secondCallInfo.name}. Linea 1 in attesa con musica.`);
  };

  const handleSwapLines = () => {
    if (!secondCallInfo) return;
    if (activeLine === 1) {
      setActiveLine(2);
      audioService.speakPrompt('Linea 2 attiva');
    } else {
      setActiveLine(1);
      audioService.speakPrompt('Linea 1 attiva');
    }
  };

  const handleDeclineSecondCallToVoicemail = () => {
    if (!secondCallInfo) return;
    const caller = secondCallInfo;
    setSecondCallInfo(null);
    setSecondCallState('idle');

    if (onAddVoicemail) {
      const newMsg: VoicemailMessage = {
        id: `vm-${Date.now()}`,
        mailbox: '101',
        callerNumber: caller.number,
        callerName: caller.name,
        timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + ' Oggi',
        durationSeconds: 18,
        isNew: true,
        reason: 'busy',
        transcription: `Chiamata in attesa rifiutata: Ho tentato di chiamarvi mentre eravate in linea. Richiamatemi al ${caller.number}.`,
        fileSize: '320 KB'
      };
      onAddVoicemail(newMsg);
    }
  };

  // CALL TRANSFER IMPLEMENTATION
  // 1. Blind Transfer
  const handleExecuteBlindTransfer = (targetNum: string) => {
    const ext = extensions.find((e) => e.number === targetNum);
    const targetName = ext ? ext.name : `Interno ${targetNum}`;

    audioService.speakPrompt(`Chiamata trasferita con successo a ${targetName}`);
    setShowTransferModal(false);
    handleHangup();
  };

  // 2. Attended Transfer (Trasferimento con offerta / annunciato)
  const handleStartAttendedTransfer = (targetNum: string) => {
    const ext = extensions.find((e) => e.number === targetNum);
    const targetName = ext ? ext.name : `Interno ${targetNum}`;

    // Put primary call on hold with MoH
    setIsOnHold(true);
    setIsAttendedTransferActive(true);
    setAttendedTargetInfo({
      number: targetNum,
      name: targetName,
      department: ext?.department,
      isInternal: true
    });
    setShowTransferModal(false);

    // Call second party
    audioService.startRingback();
    setTimeout(() => {
      audioService.stopTones();
      audioService.speakPrompt(
        `Pronto Marco, sono ${targetName}, dimmi chi hai in linea!`
      );
    }, 2000);
  };

  const handleCompleteAttendedTransfer = () => {
    if (!attendedTargetInfo || !currentCallInfo) return;
    audioService.speakPrompt(
      `Trasferimento completato: ${currentCallInfo.name} collegato con ${attendedTargetInfo.name}.`
    );
    handleHangup();
  };

  const handleCancelAttendedTransfer = () => {
    setIsAttendedTransferActive(false);
    setAttendedTargetInfo(null);
    setIsOnHold(false);
    audioService.speakPrompt('Trasferimento annullato. Chiamata principale ripristinata.');
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const dialpadButtons = [
    { digit: '1', sub: '' },
    { digit: '2', sub: 'ABC' },
    { digit: '3', sub: 'DEF' },
    { digit: '4', sub: 'GHI' },
    { digit: '5', sub: 'JKL' },
    { digit: '6', sub: 'MNO' },
    { digit: '7', sub: 'PQRS' },
    { digit: '8', sub: 'TUV' },
    { digit: '9', sub: 'WXYZ' },
    { digit: '*', sub: '' },
    { digit: '0', sub: '+' },
    { digit: '#', sub: '' }
  ];

  if (!isOpen) return null;

  return (
    <div
      id="webphone-container"
      className="fixed bottom-4 right-4 sm:right-6 w-96 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col text-slate-100"
      style={{ maxHeight: '720px' }}
    >
      {/* Top Bar */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <div>
            <div className="text-xs font-bold text-white flex items-center space-x-1.5">
              <span>Web Client ICPBX</span>
              <span className="text-[10px] bg-slate-800 text-sky-400 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                PJSIP Int. {myNumber}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">wss://pbx.azienda.it:8089/ws</div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Quick Call Waiting / Inbound Simulator button */}
          {callState === 'idle' && (
            <button
              id="btn-simulate-incoming"
              onClick={handleSimulateIncoming}
              title="Simula chiamata in arrivo"
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 px-2 py-1 rounded transition font-medium"
            >
              Simula Inbound
            </button>
          )}

          {callState === 'connected' && !secondCallInfo && (
            <button
              onClick={handleSimulateIncoming}
              title="Simula arrivo di una 2ª chiamata mentre sei occupato"
              className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800/80 px-2 py-1 rounded transition font-semibold flex items-center gap-1 animate-pulse"
            >
              <Layers className="w-3 h-3" />
              <span>Avviso 2ª Linea</span>
            </button>
          )}

          <button
            id="btn-close-webphone"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          >
            ✕
          </button>
        </div>
      </div>

      {/* SCREEN: VOICEMAIL RECORDING ON BUSY / NO-ANSWER */}
      {callState === 'voicemail_recording' && (
        <div className="p-6 flex flex-col items-center justify-center flex-1 bg-slate-950 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-950/60 border-2 border-rose-500 flex items-center justify-center animate-pulse">
            <Voicemail className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-1">
              Segreteria Telefonica Attiva
            </span>
            <h3 className="text-base font-bold text-white">
              Registrazione Chiamata in Entrata
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Interno {myNumber} non disponibile / occupato. Il chiamante sta registrando il messaggio vocale.
            </p>
          </div>

          <div className="font-mono text-xl text-rose-400 font-bold bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            00:{voicemailRecordingSeconds.toString().padStart(2, '0')}
          </div>

          <button
            onClick={() => currentCallInfo && finishVoicemailRecording(currentCallInfo, 'busy')}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md"
          >
            Termina e Archivia Messaggio
          </button>
        </div>
      )}

      {/* SCREEN: VOICEMAIL IVR SYSTEM (*97) */}
      {callState === 'voicemail_ivr' && (
        <div className="p-5 flex flex-col flex-1 bg-slate-900 space-y-3">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-500 mx-auto flex items-center justify-center mb-2">
              <Voicemail className="w-6 h-6 text-sky-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Casella Vocale Asterisk (*97)</h3>
            <p className="text-xs text-slate-400 font-mono">Mailbox: {myNumber} • {myName}</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 border border-slate-800 space-y-1">
            <div className="font-semibold text-sky-400">Comandi Guida Vocale:</div>
            <div>• Premi <strong>1</strong> per ascoltare i nuovi messaggi</div>
            <div>• Premi <strong>2</strong> per modificare il messaggio di benvenuto</div>
            <div>• Premi <strong>*</strong> per uscire</div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
              <button
                key={d}
                onClick={() => {
                  audioService.playDTMF(d);
                  if (d === '1') {
                    audioService.speakPrompt(
                      'Messaggio 1: ricevuto oggi alle 11:15 da Ing. Brambilla. Per salvare premi 9, per cancellare premi 7.'
                    );
                  }
                }}
                className="py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm font-bold rounded"
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={handleHangup}
            className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg mt-2"
          >
            Esci da Segreteria
          </button>
        </div>
      )}

      {/* SCREEN: INCOMING CALL */}
      {callState === 'incoming' && (
        <div className="p-6 flex flex-col items-center justify-center flex-1 bg-slate-950">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
            <User className="w-8 h-8 text-sky-400" />
          </div>
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1">
            {currentCallInfo?.isInternal ? 'Chiamata Interna PJSIP' : 'Chiamata In Ingresso'}
          </span>
          <h3 className="text-base font-bold text-white text-center">{currentCallInfo?.name}</h3>
          <p className="text-sm font-mono text-green-400 mb-2">{currentCallInfo?.number}</p>
          {currentCallInfo?.department && (
            <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 mb-6">
              Reparto: {currentCallInfo.department}
            </span>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-6">
            <button
              id="btn-decline-call"
              onClick={() => handleDeclineIncoming(true)}
              className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md transition"
              title="Rifiuta e invia a Segreteria"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
            <button
              id="btn-answer-call"
              onClick={handleAnswerIncoming}
              className="w-11 h-11 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center shadow-md transition animate-pulse"
              title="Rispondi"
            >
              <Phone className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => handleDeclineIncoming(true)}
            className="mt-6 text-xs text-slate-400 hover:text-sky-400 flex items-center gap-1"
          >
            <Voicemail className="w-3.5 h-3.5" />
            <span>Devia subito a Segreteria Vocale</span>
          </button>
        </div>
      )}

      {/* SCREEN: ACTIVE CALL OR CALLING OUT */}
      {(callState === 'calling' || callState === 'connected') && (
        <div className="p-5 flex flex-col flex-1 bg-slate-900">
          {/* CALL WAITING BANNER (Se c'è una seconda chiamata in arrivo mentre siamo occupati!) */}
          {secondCallInfo && (
            <div className="mb-3 p-3 bg-amber-950/80 border border-amber-500 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Avviso di Chiamata (Linea 2)</span>
                </div>
                <span className="text-[10px] bg-amber-900 text-amber-200 px-1.5 py-0.5 rounded font-mono">
                  {secondCallState === 'held' ? 'In Attesa' : 'In Arrivo...'}
                </span>
              </div>

              <div className="text-xs text-white">
                <strong>{secondCallInfo.name}</strong>{' '}
                <span className="font-mono text-amber-200">({secondCallInfo.number})</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {secondCallState === 'ringing' ? (
                  <>
                    <button
                      onClick={handleHoldAndAnswerLine2}
                      className="flex-1 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                    >
                      Hold L1 & Rispondi L2
                    </button>
                    <button
                      onClick={handleDeclineSecondCallToVoicemail}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px]"
                      title="Rifiuta e invia a segreteria"
                    >
                      A Segreteria
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSwapLines}
                    className="w-full py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Alterna Linee (Ora su L{activeLine})</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ATTENDED TRANSFER SUB-SCREEN */}
          {isAttendedTransferActive && attendedTargetInfo && (
            <div className="mb-3 p-3 bg-indigo-950/80 border border-indigo-500 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Trasferimento con Offerta in Corso</span>
                </span>
                <span className="text-[10px] bg-indigo-900 text-indigo-200 px-1.5 py-0.5 rounded">
                  Chiamante in MoH
                </span>
              </div>

              <div className="text-xs text-white">
                In linea con: <strong>{attendedTargetInfo.name}</strong> ({attendedTargetInfo.number})
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleCompleteAttendedTransfer}
                  className="flex-1 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                >
                  Completa Trasferimento
                </button>
                <button
                  onClick={handleCancelAttendedTransfer}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700"
                >
                  Annulla e Riprendi
                </button>
              </div>
            </div>
          )}

          {/* Header Call Info */}
          <div className="text-center mb-3">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 border border-slate-700 text-sky-400 mb-2">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>
                {callState === 'calling'
                  ? 'Composizione PJSIP...'
                  : currentCallInfo?.isInternal
                  ? 'Chiamata Interna Attiva'
                  : 'Chiamata WebRTC Attiva'}
              </span>
            </div>
            <h3 className="text-base font-bold text-white">{currentCallInfo?.name}</h3>
            <p className="text-xs text-slate-400 font-mono">{currentCallInfo?.number}</p>
            {currentCallInfo?.department && (
              <span className="text-[10px] text-sky-300 block">{currentCallInfo.department}</span>
            )}
            <div className="text-sm font-semibold font-mono text-emerald-400 mt-1">
              {formatSeconds(callTimer)}
            </div>
          </div>

          {/* Audio Waveform */}
          <div className="w-full h-12 bg-slate-950/80 rounded-lg p-1 mb-3 flex items-center justify-center border border-slate-800">
            <canvas ref={canvasRef} width={280} height={40} className="w-full h-full" />
          </div>

          {/* Badges */}
          <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-400 mb-3">
            <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Codec: Opus 48kHz</span>
            {isOnHold && (
              <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded animate-pulse">
                In Attesa (MoH)
              </span>
            )}
            {isRecording && (
              <span className="bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded flex items-center space-x-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>REC</span>
              </span>
            )}
          </div>

          {/* In-call keypad */}
          {showInCallKeypad && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {dialpadButtons.slice(0, 12).map((btn) => (
                <button
                  key={btn.digit}
                  onClick={() => handleKeyPress(btn.digit)}
                  className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold font-mono text-white text-center transition"
                >
                  {btn.digit}
                </button>
              ))}
            </div>
          )}

          {/* Action Grid Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {/* Mute */}
            <button
              id="btn-mute"
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl flex flex-col items-center justify-center text-xs transition ${
                isMuted
                  ? 'bg-rose-600/20 border border-rose-500 text-rose-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4 mb-1" /> : <Mic className="w-4 h-4 mb-1" />}
              <span>{isMuted ? 'Muto ON' : 'Muto'}</span>
            </button>

            {/* Hold (MoH) */}
            <button
              id="btn-hold"
              onClick={() => {
                setIsOnHold(!isOnHold);
                if (!isOnHold) audioService.startRingback();
                else audioService.stopTones();
              }}
              className={`p-2 rounded-xl flex flex-col items-center justify-center text-xs transition ${
                isOnHold
                  ? 'bg-amber-600/20 border border-amber-500 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isOnHold ? <Play className="w-4 h-4 mb-1" /> : <Pause className="w-4 h-4 mb-1" />}
              <span>{isOnHold ? 'Riprendi' : 'Attesa'}</span>
            </button>

            {/* Record */}
            <button
              id="btn-record"
              onClick={() => setIsRecording(!isRecording)}
              className={`p-2 rounded-xl flex flex-col items-center justify-center text-xs transition ${
                isRecording
                  ? 'bg-rose-600/20 border border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Disc className="w-4 h-4 mb-1" />
              <span>{isRecording ? 'Rec ON' : 'Registra'}</span>
            </button>

            {/* Keypad */}
            <button
              id="btn-keypad-toggle"
              onClick={() => setShowInCallKeypad(!showInCallKeypad)}
              className={`p-2 rounded-xl flex flex-col items-center justify-center text-xs transition ${
                showInCallKeypad
                  ? 'bg-sky-600/20 border border-sky-500 text-sky-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Grid className="w-4 h-4 mb-1" />
              <span>Tastierino</span>
            </button>

            {/* Transfer */}
            <button
              id="btn-transfer"
              onClick={() => setShowTransferModal(true)}
              className="p-2 rounded-xl flex flex-col items-center justify-center text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <RotateCcw className="w-4 h-4 mb-1 text-sky-400" />
              <span>Trasferisci</span>
            </button>

            {/* Headset / Volume */}
            <button
              id="btn-speaker"
              className="p-2 rounded-xl flex flex-col items-center justify-center text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Volume2 className="w-4 h-4 mb-1" />
              <span>Cuffie</span>
            </button>
          </div>

          {/* ADVANCED TRANSFER MODAL (Cieco vs Annunciato con Offerta) */}
          {showTransferModal && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-sky-500/40 mb-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Trasferimento Chiamata</span>
                </span>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Mode Switch: Cieco vs Con Offerta */}
              <div className="flex rounded bg-slate-900 p-0.5 text-[11px] font-semibold border border-slate-800">
                <button
                  onClick={() => setTransferMode('blind')}
                  className={`flex-1 py-1 rounded transition ${
                    transferMode === 'blind' ? 'bg-sky-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Trasferimento Cieco
                </button>
                <button
                  onClick={() => setTransferMode('attended')}
                  className={`flex-1 py-1 rounded transition ${
                    transferMode === 'attended' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Con Annuncio / Offerta
                </button>
              </div>

              {/* Input for custom number */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Numero interno (es. 102)"
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                />
                <button
                  onClick={() => {
                    if (!transferTarget) return;
                    if (transferMode === 'blind') handleExecuteBlindTransfer(transferTarget);
                    else handleStartAttendedTransfer(transferTarget);
                  }}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded text-xs font-bold"
                >
                  Invia
                </button>
              </div>

              {/* Quick Select Extension List */}
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                Seleziona Interno Rapido:
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
                {extensions
                  .filter((e) => e.number !== myNumber)
                  .map((ext) => (
                    <button
                      key={ext.id}
                      onClick={() => {
                        if (transferMode === 'blind') handleExecuteBlindTransfer(ext.number);
                        else handleStartAttendedTransfer(ext.number);
                      }}
                      className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white truncate">{ext.name}</div>
                        <div className="text-[10px] text-sky-400 font-mono">Int. {ext.number}</div>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Hangup button */}
          <button
            id="btn-hangup"
            onClick={handleHangup}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center space-x-2 shadow-lg transition"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Chiudi Chiamata</span>
          </button>
        </div>
      )}

      {/* IDLE VIEW: Dialpad, Extensions and Recents */}
      {callState === 'idle' && (
        <div className="flex flex-col flex-1">
          {/* Sub Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-900/60 text-xs">
            <button
              id="subtab-dialpad"
              onClick={() => setActiveTab('dialpad')}
              className={`flex-1 py-2 text-center font-medium transition ${
                activeTab === 'dialpad'
                  ? 'border-b-2 border-sky-500 text-sky-400 bg-slate-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tastiera
            </button>
            <button
              id="subtab-extensions"
              onClick={() => setActiveTab('extensions')}
              className={`flex-1 py-2 text-center font-medium transition ${
                activeTab === 'extensions'
                  ? 'border-b-2 border-sky-500 text-sky-400 bg-slate-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Interni BLF ({extensions.length})
            </button>
            <button
              id="subtab-recents"
              onClick={() => setActiveTab('recents')}
              className={`flex-1 py-2 text-center font-medium transition ${
                activeTab === 'recents'
                  ? 'border-b-2 border-sky-500 text-sky-400 bg-slate-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Recenti
            </button>
          </div>

          {/* TAB 1: DIALPAD */}
          {activeTab === 'dialpad' && (
            <div className="p-4 flex flex-col flex-1">
              {/* Dial number display */}
              <div className="relative mb-3">
                <input
                  id="input-dial-number"
                  type="text"
                  readOnly
                  placeholder="Numero o interno..."
                  value={dialNumber}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-lg font-mono text-center text-white tracking-widest focus:outline-none"
                />
                {dialNumber && (
                  <button
                    id="btn-backspace"
                    onClick={() => setDialNumber((prev) => prev.slice(0, -1))}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dialpad buttons */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {dialpadButtons.map((btn) => (
                  <button
                    key={btn.digit}
                    id={`dial-btn-${btn.digit}`}
                    onClick={() => handleKeyPress(btn.digit)}
                    className="h-11 bg-slate-800 hover:bg-slate-700 active:bg-sky-500 rounded flex flex-col items-center justify-center text-slate-100 transition shadow-sm border border-slate-700/60"
                  >
                    <span className="text-base font-bold leading-tight">{btn.digit}</span>
                    {btn.sub && (
                      <span className="text-[9px] text-slate-400 tracking-wider uppercase">
                        {btn.sub}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Action Buttons: Call and Voicemail *97 */}
              <div className="flex gap-2">
                <button
                  id="btn-start-call"
                  onClick={() => handleStartCall()}
                  disabled={!dialNumber.trim()}
                  className={`flex-1 py-2.5 rounded-md font-bold flex items-center justify-center space-x-2 transition shadow-sm ${
                    dialNumber.trim()
                      ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span>Chiama</span>
                </button>

                <button
                  onClick={() => handleStartCall('*97')}
                  className="px-3.5 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Accedi alla tua segreteria telefonica (*97)"
                >
                  <Voicemail className="w-4 h-4" />
                  <span>*97</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EXTENSIONS LIST (CHIAMATE TRA INTERNI) */}
          {activeTab === 'extensions' && (
            <div className="p-3 overflow-y-auto max-h-[420px] space-y-1.5">
              <div className="text-[10px] text-slate-400 font-semibold uppercase px-1 mb-1">
                Chiamate Dirette tra Interni PJSIP:
              </div>
              {extensions.map((ext) => (
                <div
                  key={ext.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800/80 transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-sky-400">
                      {ext.number}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{ext.name}</div>
                      <div className="text-[10px] text-slate-400">{ext.department}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        ext.status === 'online'
                          ? 'bg-emerald-500'
                          : ext.status === 'busy'
                          ? 'bg-amber-500'
                          : ext.status === 'dnd'
                          ? 'bg-rose-500'
                          : 'bg-slate-500'
                      }`}
                      title={ext.status}
                    ></span>
                    <button
                      onClick={() => handleStartCall(ext.number)}
                      className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition"
                      title={`Chiama interno ${ext.number}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: RECENT CALLS */}
          {activeTab === 'recents' && (
            <div className="p-3 overflow-y-auto max-h-[420px] space-y-1.5">
              {recentCalls.map((call, idx) => (
                <div
                  key={idx}
                  onClick={() => handleStartCall(call.number)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 cursor-pointer transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        call.type === 'missed'
                          ? 'bg-rose-900/40 text-rose-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{call.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{call.number}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400">{call.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
