import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Pause,
  Play,
  Mic,
  MicOff,
  ArrowRightLeft,
  Users,
  Search,
  Star,
  Plus,
  Clock,
  Voicemail,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  UserCheck,
  UserX,
  Radio,
  BookOpen,
  Headphones,
  Check,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  BellOff,
  Activity,
  Sun,
  Moon,
  Contrast,
  Laptop,
  Headset,
  LogIn,
  LogOut,
  SlidersHorizontal,
  Layers,
  Info,
  Shield,
  PhoneForwarded
} from 'lucide-react';
import { Extension, Contact, VoicemailMessage, CDRRecord, DashboardTheme, CallQueue, QueuePriority } from '../types/pbx';
import { audioService } from '../services/audioService';

interface UserWebClientProps {
  extensions: Extension[];
  contacts: Contact[];
  voicemails: VoicemailMessage[];
  cdrRecords: CDRRecord[];
  onAddContact: (contact: Contact) => void;
  onDeleteVoicemail: (id: string) => void;
  onToggleVoicemailRead: (id: string) => void;
  onAddVoicemail: (vm: VoicemailMessage) => void;
  onCallFinished: (record: Partial<CDRRecord>) => void;
  userStatus: 'online' | 'away' | 'dnd' | 'meeting';
  setUserStatus: (status: 'online' | 'away' | 'dnd' | 'meeting') => void;
  theme?: DashboardTheme;
  setTheme?: (theme: DashboardTheme) => void;
  activeExtension?: Extension;
  onSwitchExtension?: () => void;
  callQueues?: CallQueue[];
  onUpdateCallQueues?: (queues: CallQueue[] | ((prev: CallQueue[]) => CallQueue[])) => void;
}

interface CallParticipant {
  number: string;
  name: string;
  department?: string;
  isInternal: boolean;
}

export const UserWebClient: React.FC<UserWebClientProps> = ({
  extensions,
  contacts,
  voicemails,
  cdrRecords,
  onAddContact,
  onDeleteVoicemail,
  onToggleVoicemailRead,
  onAddVoicemail,
  onCallFinished,
  userStatus,
  setUserStatus,
  theme = 'dark',
  setTheme,
  activeExtension,
  onSwitchExtension,
  callQueues,
  onUpdateCallQueues
}) => {
  // Current logged in user for this PC station
  const myExtension = activeExtension || extensions.find((e) => e.number === '101') || extensions[0];

  // Dashboard Sub-navigation Tabs
  const [activeView, setActiveView] = useState<'phone' | 'extensions' | 'history' | 'contacts' | 'voicemail' | 'queues'>('phone');

  // Softphone & Call State
  const [dialNumber, setDialNumber] = useState('');
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'incoming'>('idle');
  const [activeCall, setActiveCall] = useState<CallParticipant | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isOnHold, setIsOnHold] = useState(false);
  const [holdTimer, setHoldTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Call Waiting / 2nd Line state
  const [callWaitingActive, setCallWaitingActive] = useState(myExtension?.callWaitingEnabled ?? true);
  const [incomingWaitingCall, setIncomingWaitingCall] = useState<CallParticipant | null>(null);
  const [heldCall, setHeldCall] = useState<CallParticipant | null>(null);

  // Call Transfer State
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferType, setTransferType] = useState<'blind' | 'attended'>('blind');
  const [selectedTransferExt, setSelectedTransferExt] = useState('');
  const [isAttendedCalling, setIsAttendedCalling] = useState(false);
  const [attendedColleague, setAttendedColleague] = useState<Extension | null>(null);
  const [transferSuccessMessage, setTransferSuccessMessage] = useState<string | null>(null);
  const [statusFeedbackMessage, setStatusFeedbackMessage] = useState<string | null>(null);

  // Extension availability filter
  const [extSearchTerm, setExtSearchTerm] = useState('');
  const [extAvailabilityFilter, setExtAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  // Call History filter
  const [historyFilter, setHistoryFilter] = useState<'all' | 'answered' | 'missed' | 'received' | 'outgoing'>('all');
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Contacts Phonebook state
  const [contactSearch, setContactSearch] = useState('');
  const [onlyFavoriteContacts, setOnlyFavoriteContacts] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactData, setNewContactData] = useState<Partial<Contact>>({
    name: '',
    company: '',
    department: '',
    phone: '',
    mobile: '',
    email: '',
    isFavorite: false
  });

  // Voicemail state
  const [playingVmId, setPlayingVmId] = useState<string | null>(null);
  const [vmProgress, setVmProgress] = useState(0);

  // =========================================================================
  // CALL QUEUES & DYNAMIC AGENT ACD MEMBERSHIP STATE (Asterisk AddQueueMember)
  // =========================================================================
  const [internalQueues, setInternalQueues] = useState<CallQueue[]>(() => {
    if (callQueues && callQueues.length > 0) return callQueues;
    try {
      const saved = localStorage.getItem('pbx_call_queues');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    if (callQueues) {
      setInternalQueues(callQueues);
    }
  }, [callQueues]);

  const activeQueues = callQueues && callQueues.length > 0 ? callQueues : internalQueues;

  const updateQueuesState = (updated: CallQueue[]) => {
    setInternalQueues(updated);
    if (onUpdateCallQueues) {
      onUpdateCallQueues(updated);
    } else {
      localStorage.setItem('pbx_call_queues', JSON.stringify(updated));
    }
  };

  // Assigned queues for this extension (persisted per extension)
  const [assignedQueueNumbers, setAssignedQueueNumbers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`pbx_assigned_queues_${myExtension.number}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    const existing = (callQueues || internalQueues)
      .filter((q) => q.members.includes(myExtension.number))
      .map((q) => q.number);
    if (existing.length > 0) return existing;
    if (myExtension.number === '101') return ['701', '702'];
    if (myExtension.number === '102') return ['701'];
    if (myExtension.number === '103') return ['700', '702'];
    if (myExtension.number === '104') return ['702'];
    if (myExtension.number === '105') return ['700'];
    return (callQueues || internalQueues).slice(0, 2).map((q) => q.number);
  });

  // Re-sync assignedQueueNumbers when switching PC extension
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pbx_assigned_queues_${myExtension.number}`);
      if (saved) {
        setAssignedQueueNumbers(JSON.parse(saved));
        return;
      }
    } catch {}
    const existing = activeQueues
      .filter((q) => q.members.includes(myExtension.number))
      .map((q) => q.number);
    if (existing.length > 0) {
      setAssignedQueueNumbers(existing);
    } else {
      const defaults =
        myExtension.number === '101' ? ['701', '702'] :
        myExtension.number === '102' ? ['701'] :
        myExtension.number === '103' ? ['700', '702'] :
        myExtension.number === '104' ? ['702'] :
        myExtension.number === '105' ? ['700'] :
        activeQueues.slice(0, 2).map((q) => q.number);
      setAssignedQueueNumbers(defaults);
    }
  }, [myExtension.number]);

  // Persist assigned queues to localStorage
  useEffect(() => {
    localStorage.setItem(`pbx_assigned_queues_${myExtension.number}`, JSON.stringify(assignedQueueNumbers));
  }, [assignedQueueNumbers, myExtension.number]);

  const [showQueueModal, setShowQueueModal] = useState(false);

  // Queues where this extension is currently active as a dynamic member
  const joinedQueues = activeQueues.filter((q) => q.members.includes(myExtension.number));
  const assignedQueuesList = activeQueues.filter((q) => assignedQueueNumbers.includes(q.number));
  const isAgentLoggedIn = joinedQueues.length > 0;
  const isFullyLoggedIn =
    assignedQueuesList.length > 0 &&
    assignedQueuesList.every((q) => q.members.includes(myExtension.number));

  // Dynamic Agent Login / Logout toggle (Global across assigned call queues)
  const handleToggleAgentLogin = () => {
    if (isAgentLoggedIn) {
      // LOGOUT: Remove myExtension.number from all call queues (Asterisk RemoveQueueMember)
      const updated = activeQueues.map((q) => ({
        ...q,
        members: q.members.filter((m) => m !== myExtension.number)
      }));
      updateQueuesState(updated);
      audioService.playAgentLogoutSound();
      audioService.speakPrompt('Agente disconnesso dalle code');
      setStatusFeedbackMessage(
        `Agente Disconnesso: l'interno ${myExtension.number} (${myExtension.name}) è uscito dalle code di chiamata. (Asterisk RemoveQueueMember)`
      );
      setTimeout(() => setStatusFeedbackMessage(null), 5000);
    } else {
      // LOGIN: Add myExtension.number to assigned call queues (Asterisk AddQueueMember)
      const targetNumbers = assignedQueueNumbers.length > 0
        ? assignedQueueNumbers
        : activeQueues.map((q) => q.number);

      const updated = activeQueues.map((q) => {
        if (targetNumbers.includes(q.number) && !q.members.includes(myExtension.number)) {
          return {
            ...q,
            members: [...q.members, myExtension.number]
          };
        }
        return q;
      });
      updateQueuesState(updated);
      audioService.playAgentLoginSound();
      audioService.speakPrompt('Agente connesso alle code');
      setStatusFeedbackMessage(
        `Agente Connesso: l'interno ${myExtension.number} (${myExtension.name}) è attivo su ${targetNumbers.length} code di chiamata. (Asterisk AddQueueMember)`
      );
      setTimeout(() => setStatusFeedbackMessage(null), 5000);
    }
  };

  // Dynamically join or leave a specific individual queue
  const handleToggleQueueMember = (queueNumber: string) => {
    const queue = activeQueues.find((q) => q.number === queueNumber);
    if (!queue) return;

    const isMember = queue.members.includes(myExtension.number);
    const updated = activeQueues.map((q) => {
      if (q.number === queueNumber) {
        return {
          ...q,
          members: isMember
            ? q.members.filter((m) => m !== myExtension.number)
            : [...q.members, myExtension.number]
        };
      }
      return q;
    });
    updateQueuesState(updated);

    if (!isMember && !assignedQueueNumbers.includes(queueNumber)) {
      setAssignedQueueNumbers((prev) => [...prev, queueNumber]);
    }

    if (isMember) {
      audioService.playAgentLogoutSound();
      setStatusFeedbackMessage(
        `Uscito dalla coda "${queue.name}" (${queue.number}) • Asterisk RemoveQueueMember`
      );
    } else {
      audioService.playAgentLoginSound();
      setStatusFeedbackMessage(
        `Entrato nella coda "${queue.name}" (${queue.number}) • Asterisk AddQueueMember`
      );
    }
    setTimeout(() => setStatusFeedbackMessage(null), 4500);
  };

  // Toggle whether a queue is part of this agent's default assigned set
  const handleToggleQueueAssignment = (queueNumber: string) => {
    setAssignedQueueNumbers((prev) =>
      prev.includes(queueNumber) ? prev.filter((num) => num !== queueNumber) : [...prev, queueNumber]
    );
  };

  // Simulate an incoming call routed from an ACD call queue
  const handleSimulateQueueCall = (targetQueueNumber?: string) => {
    if (!isAgentLoggedIn) {
      setStatusFeedbackMessage(
        `Impossibile instradare chiamata: l'interno ${myExtension.number} è DISCONNESSO dalle code di chiamata. Esegui il Login Agente per rendersi disponibile.`
      );
      setTimeout(() => setStatusFeedbackMessage(null), 5000);
      return;
    }

    const queue =
      activeQueues.find((q) => q.number === targetQueueNumber && q.members.includes(myExtension.number)) ||
      joinedQueues[0] ||
      activeQueues[0];

    if (userStatus === 'dnd') {
      setStatusFeedbackMessage(
        `Chiamata di Coda ${queue.number} non recapitata: interno ${myExtension.number} ha lo stato DND attivo.`
      );
      setTimeout(() => setStatusFeedbackMessage(null), 4500);
      return;
    }

    const queueCaller: CallParticipant = {
      number: '+39 02 87654321',
      name: `[Coda ${queue.number}] Inbound Client VIP`,
      department: `${queue.name} (Priorità: ${queue.priority || 'medium'})`,
      isInternal: false
    };

    setActiveCall(queueCaller);
    setCallState('incoming');
    audioService.startRingtone();
  };

  // Timers
  const callTimerRef = useRef<any>(null);
  const holdTimerRef = useRef<any>(null);
  const vmAudioRef = useRef<any>(null);

  // Call Timer Effect
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callState]);

  // Hold Timer Effect & MoH
  useEffect(() => {
    if (isOnHold && callState === 'connected') {
      audioService.startHoldMusic();
      setHoldTimer(0);
      holdTimerRef.current = setInterval(() => {
        setHoldTimer((prev) => prev + 1);
      }, 1000);
    } else {
      audioService.stopHoldMusic();
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    }
    return () => {
      audioService.stopHoldMusic();
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, [isOnHold, callState]);

  // Formatting helpers
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dial an external number or internal extension
  const handleStartCall = (targetNumber: string, targetName?: string, department?: string) => {
    if (!targetNumber) return;
    const cleanNum = targetNumber.trim();

    // Asterisk ACD Feature Code *45: Toggle Agent Login / Logout
    if (cleanNum === '*45') {
      setCallState('calling');
      audioService.startRingback();
      setTimeout(() => {
        audioService.stopTones();
        handleToggleAgentLogin();
        setCallState('idle');
      }, 800);
      return;
    }

    // Asterisk ACD Feature Code *45<queue>: Toggle specific queue membership
    if (cleanNum.startsWith('*45') && cleanNum.length > 3) {
      const qNum = cleanNum.substring(3);
      setCallState('calling');
      audioService.startRingback();
      setTimeout(() => {
        audioService.stopTones();
        handleToggleQueueMember(qNum);
        setCallState('idle');
      }, 800);
      return;
    }

    const matchedExt = extensions.find((e) => e.number === cleanNum);
    const matchedContact = contacts.find((c) => c.phone.includes(cleanNum) || c.mobile.includes(cleanNum));

    const participant: CallParticipant = {
      number: cleanNum,
      name: targetName || matchedExt?.name || matchedContact?.name || `Numero ${cleanNum}`,
      department: department || matchedExt?.department || matchedContact?.company,
      isInternal: Boolean(matchedExt)
    };

    setActiveCall(participant);
    setCallState('calling');
    audioService.startRingback();

    // If calling an internal extension that is busy
    if (matchedExt && matchedExt.status === 'busy') {
      setTimeout(() => {
        audioService.stopTones();
        setCallState('connected'); // connected to busy handler or call waiting
      }, 2500);
      return;
    }

    // Normal internal or external call connects in 2.2s
    setTimeout(() => {
      audioService.stopTones();
      setCallState('connected');
      // Speak friendly welcome
      audioService.speakPrompt(`Connessione con ${participant.name}`);
    }, 2200);
  };

  // Hangup call
  const handleHangup = () => {
    audioService.playHangup();
    audioService.stopTones();
    audioService.stopHoldMusic();

    if (activeCall && callDuration > 0) {
      onCallFinished({
        src: myExtension.number,
        dst: activeCall.number,
        clid: `"${myExtension.name}" <${myExtension.number}>`,
        duration: callDuration + 3,
        billsec: callDuration,
        disposition: 'ANSWERED',
        channel: `PJSIP/${myExtension.number}-webclient`,
        dstchannel: `PJSIP/${activeCall.number}`,
        hasRecording: false
      });
    }

    setCallState('idle');
    setActiveCall(null);
    setIsOnHold(false);
    setIsMuted(false);
    setCallDuration(0);
    setHoldTimer(0);
    setShowTransferDialog(false);
    setIsAttendedCalling(false);
    setAttendedColleague(null);
    setIncomingWaitingCall(null);
    setHeldCall(null);
  };

  // Toggle Call Hold (Gestione Attesa)
  const handleToggleHold = () => {
    if (callState !== 'connected') return;
    setIsOnHold(!isOnHold);
  };

  // Simulate an incoming call (e.g. for testing call waiting, DND or receiving)
  const handleSimulateIncomingCall = (fromColleague?: boolean) => {
    const caller = fromColleague
      ? { number: '102', name: 'Sara Bianchi', department: 'Commerciale', isInternal: true }
      : { number: '+39 02 98765432', name: 'Studio Legale Colombo', department: 'Cliente Esterno', isInternal: false };

    // Check if operator has DND (Do Not Disturb) active
    if (userStatus === 'dnd') {
      setStatusFeedbackMessage(`Chiamata da ${caller.name} (${caller.number}) deviata direttamente in segreteria: Stato DND attivo.`);
      setTimeout(() => setStatusFeedbackMessage(null), 5000);
      onAddVoicemail({
        id: `vm-${Date.now()}`,
        mailbox: myExtension.number,
        callerNumber: caller.number,
        callerName: caller.name,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        durationSeconds: 16,
        isNew: true,
        reason: 'busy',
        transcription: `Messaggio da ${caller.name}: Tentativo di chiamata inoltrato a casella vocale per modalità Non Disturbare (DND) attiva.`,
        fileSize: '312 KB'
      });
      return;
    }

    if (callState === 'connected') {
      // If user is already on a call and Call Waiting is enabled
      if (callWaitingActive) {
        audioService.playCallWaitingBeep();
        setIncomingWaitingCall(caller);
      } else {
        // Devia a segreteria
        onAddVoicemail({
          id: `vm-${Date.now()}`,
          mailbox: myExtension.number,
          callerNumber: caller.number,
          callerName: caller.name,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          durationSeconds: 18,
          isNew: true,
          reason: 'busy',
          transcription: `Messaggio da ${caller.name}: linea occupata, richiamo a breve.`,
          fileSize: '312 KB'
        });
      }
    } else {
      setActiveCall(caller);
      setCallState('incoming');
      audioService.startIncomingRingtone();
    }
  };

  // Answer incoming call
  const handleAnswerIncoming = () => {
    audioService.stopTones();
    setCallState('connected');
  };

  // Answer 2nd call waiting line while holding line 1
  const handleAnswerWaitingCall = () => {
    if (!incomingWaitingCall) return;
    // Put current call on hold
    setHeldCall(activeCall);
    setActiveCall(incomingWaitingCall);
    setIncomingWaitingCall(null);
    setIsOnHold(false);
    audioService.stopTones();
  };

  // Swap lines between active and held call
  const handleSwapLines = () => {
    if (!heldCall || !activeCall) return;
    const temp = activeCall;
    setActiveCall(heldCall);
    setHeldCall(temp);
  };

  // Reject / send 2nd call to voicemail
  const handleRejectWaitingCall = () => {
    if (!incomingWaitingCall) return;
    onAddVoicemail({
      id: `vm-${Date.now()}`,
      mailbox: myExtension.number,
      callerNumber: incomingWaitingCall.number,
      callerName: incomingWaitingCall.name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      durationSeconds: 22,
      isNew: true,
      reason: 'busy',
      transcription: `Messaggio di segreteria lasciato da ${incomingWaitingCall.name}.`,
      fileSize: '348 KB'
    });
    setIncomingWaitingCall(null);
  };

  // Blind Transfer Execution
  const handleExecuteBlindTransfer = (targetExtNum: string) => {
    const target = extensions.find((e) => e.number === targetExtNum);
    const targetLabel = target ? `${target.name} (Int. ${target.number})` : `Interno ${targetExtNum}`;

    audioService.speakPrompt(`Trasferimento della chiamata verso ${targetLabel}`);

    setTransferSuccessMessage(`Chiamata trasferita con successo a ${targetLabel}`);
    setTimeout(() => setTransferSuccessMessage(null), 4000);

    // End caller connection on this client
    setTimeout(() => {
      handleHangup();
    }, 1200);
  };

  // Start Attended Transfer (Offerta / Annunciato)
  const handleStartAttendedTransfer = (targetExtNum: string) => {
    const target = extensions.find((e) => e.number === targetExtNum);
    if (!target) return;

    // Put primary caller on hold
    setIsOnHold(true);
    setAttendedColleague(target);
    setIsAttendedCalling(true);

    audioService.startRingback();
    setTimeout(() => {
      audioService.stopTones();
      audioService.speakPrompt(`In linea con il collega ${target.name}. Puoi annunciare la chiamata.`);
    }, 2000);
  };

  // Complete Attended Transfer
  const handleCompleteAttendedTransfer = () => {
    if (!attendedColleague) return;
    audioService.speakPrompt(`Chiamata passata a ${attendedColleague.name}`);
    setTransferSuccessMessage(`Chiamata passata con successo a ${attendedColleague.name} (${attendedColleague.number})`);
    setTimeout(() => setTransferSuccessMessage(null), 4000);
    handleHangup();
  };

  // Cancel Attended Transfer and resume primary caller
  const handleCancelAttendedTransfer = () => {
    setIsAttendedCalling(false);
    setAttendedColleague(null);
    setIsOnHold(false); // resume caller
    audioService.stopTones();
  };

  // Filter Extensions by Search & Availability
  const filteredExtensions = extensions.filter((ext) => {
    // Don't show myself or show with self tag
    const matchesSearch =
      ext.name.toLowerCase().includes(extSearchTerm.toLowerCase()) ||
      ext.number.includes(extSearchTerm) ||
      ext.department.toLowerCase().includes(extSearchTerm.toLowerCase());

    const isAvailable = ext.status === 'online';
    const isUnavailable = ext.status !== 'online';

    if (extAvailabilityFilter === 'available') return matchesSearch && isAvailable;
    if (extAvailabilityFilter === 'unavailable') return matchesSearch && isUnavailable;
    return matchesSearch;
  });

  const availableCount = extensions.filter((e) => e.status === 'online').length;
  const unavailableCount = extensions.filter((e) => e.status !== 'online').length;

  // Filter CDR Call History
  const filteredCdr = cdrRecords.filter((cdr) => {
    const matchesSearch =
      cdr.src.includes(historySearchTerm) ||
      cdr.dst.includes(historySearchTerm) ||
      cdr.clid.toLowerCase().includes(historySearchTerm.toLowerCase());

    const isIncoming = cdr.dst === myExtension.number || cdr.dst.length === 3;
    const isOutgoing = cdr.src === myExtension.number;
    const isAnswered = cdr.disposition === 'ANSWERED';
    const isMissed = cdr.disposition === 'NO ANSWER' || cdr.disposition === 'FAILED';

    if (historyFilter === 'answered') return matchesSearch && isAnswered;
    if (historyFilter === 'missed') return matchesSearch && isMissed;
    if (historyFilter === 'received') return matchesSearch && isIncoming;
    if (historyFilter === 'outgoing') return matchesSearch && isOutgoing;
    return matchesSearch;
  });

  const countAnswered = cdrRecords.filter((c) => c.disposition === 'ANSWERED').length;
  const countMissed = cdrRecords.filter((c) => c.disposition === 'NO ANSWER' || c.disposition === 'FAILED').length;
  const countReceived = cdrRecords.filter((c) => c.dst === myExtension.number || c.dst.length === 3).length;

  // Filter Contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.company.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone.includes(contactSearch) ||
      c.mobile.includes(contactSearch);

    const matchesFav = onlyFavoriteContacts ? c.isFavorite : true;
    return matchesSearch && matchesFav;
  });

  // Voicemail count
  const unreadVmCount = voicemails.filter((v) => v.isNew).length;

  // Real-time Widget summaries calculation
  const missedCallsList = cdrRecords.filter((c) => c.disposition === 'NO ANSWER' || c.disposition === 'FAILED');
  const latestMissedCall = missedCallsList.length > 0 ? missedCallsList[0] : null;

  const unreadVoicemailsList = voicemails.filter((v) => v.isNew);
  const latestVoicemail = unreadVoicemailsList.length > 0 ? unreadVoicemailsList[0] : (voicemails[0] || null);

  // Recent Contacts for Fast Access
  const recentContactIds = new Set<string>();
  const recentContacts: Contact[] = [];

  for (const cdr of cdrRecords) {
    const targetNum = cdr.src === myExtension.number ? cdr.dst : cdr.src;
    const matched = contacts.find((c) => c.phone.includes(targetNum) || c.mobile.includes(targetNum));
    if (matched && !recentContactIds.has(matched.id)) {
      recentContactIds.add(matched.id);
      recentContacts.push(matched);
      if (recentContacts.length >= 4) break;
    }
  }

  if (recentContacts.length < 3) {
    for (const c of contacts) {
      if (!recentContactIds.has(c.id)) {
        recentContactIds.add(c.id);
        recentContacts.push(c);
        if (recentContacts.length >= 3) break;
      }
    }
  }

  // Play Voicemail message
  const handlePlayVoicemail = (id: string, text: string) => {
    if (playingVmId === id) {
      setPlayingVmId(null);
      audioService.stopSpeech();
    } else {
      setPlayingVmId(id);
      setVmProgress(0);
      onToggleVoicemailRead(id);
      audioService.speakPrompt(text, () => {
        setPlayingVmId(null);
        setVmProgress(100);
      });

      // Progress animation
      const interval = setInterval(() => {
        setVmProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 600);
    }
  };

  // Add Contact handler
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactData.name || (!newContactData.phone && !newContactData.mobile)) return;

    const contact: Contact = {
      id: `cnt-${Date.now()}`,
      name: newContactData.name,
      company: newContactData.company || 'Azienda',
      department: newContactData.department || 'Generale',
      email: newContactData.email || '',
      phone: newContactData.phone || '',
      mobile: newContactData.mobile || '',
      isFavorite: newContactData.isFavorite || false
    };

    onAddContact(contact);
    setShowAddContactModal(false);
    setNewContactData({ name: '', company: '', department: '', phone: '', mobile: '', email: '', isFavorite: false });
  };

  // Handle presence status selection with synchronized feedback
  const handleSelectStatus = (newStatus: 'online' | 'away' | 'dnd') => {
    setUserStatus(newStatus);
    const label = newStatus === 'online' ? 'Online (Disponibile)' : newStatus === 'away' ? 'Away (Assente)' : 'DND (Non Disturbare)';
    setStatusFeedbackMessage(`Stato operatore impostato su "${label}" • Sincronizzato con centralino Asterisk, BLF colleghi e WebPhone.`);
    setTimeout(() => {
      setStatusFeedbackMessage(null);
    }, 4500);
  };

  // Handle dashboard theme selection with feedback
  const handleSelectTheme = (newTheme: DashboardTheme) => {
    if (setTheme) {
      setTheme(newTheme);
      const label = newTheme === 'dark' ? 'Dark (Predefinita)' : newTheme === 'light' ? 'Light (Chiaro)' : 'High-Contrast (Alto Contrasto)';
      setStatusFeedbackMessage(`Tema Dashboard impostato su "${label}" • Preferenza salvata in localStorage.`);
      setTimeout(() => {
        setStatusFeedbackMessage(null);
      }, 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: User Profile, Availability Status Selector & Real-Time Synchronized Indicator */}
      <div id="user-webclient-header" className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* User Profile Info with Live Presence Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-xl shadow-lg transition-all duration-300 ${
                  userStatus === 'online'
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-700 ring-2 ring-emerald-500/50 shadow-emerald-950/50'
                    : userStatus === 'away'
                    ? 'bg-gradient-to-br from-amber-600 to-yellow-700 ring-2 ring-amber-500/50 shadow-amber-950/50'
                    : 'bg-gradient-to-br from-rose-600 to-red-800 ring-2 ring-rose-500/50 shadow-rose-950/50'
                }`}
              >
                MR
              </div>
              {/* Pulsing Status Dot on Avatar */}
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    userStatus === 'online'
                      ? 'bg-emerald-400'
                      : userStatus === 'away'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-4 w-4 border-2 border-slate-900 ${
                    userStatus === 'online'
                      ? 'bg-emerald-500'
                      : userStatus === 'away'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                ></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight truncate">{myExtension.name}</h2>
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-sky-950 text-sky-400 border border-sky-800 rounded">
                  Interno {myExtension.number}
                </span>
                {onSwitchExtension && (
                  <button
                    id="btn-switch-computer-extension"
                    onClick={onSwitchExtension}
                    title="Cambia l'interno telefonico assegnato a questo computer"
                    className="px-2.5 py-0.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white border border-slate-700 rounded-lg flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Laptop className="w-3 h-3 text-sky-400" />
                    <span>Cambia Interno PC</span>
                  </button>
                )}
                {/* Live System Status Pill */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border transition-colors ${
                    userStatus === 'online'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : userStatus === 'away'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-rose-950/80 text-rose-300 border-rose-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      userStatus === 'online'
                        ? 'bg-emerald-400 animate-pulse'
                        : userStatus === 'away'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  ></span>
                  {userStatus === 'online' ? 'Online' : userStatus === 'away' ? 'Away' : 'DND'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                <span>{myExtension.department}</span>
                <span>•</span>
                <span className="text-slate-300">SIP PJSIP WebRTC</span>
                <span>•</span>
                <span className="text-emerald-400 font-mono text-[11px]">Registrato (Port 8089 WSS)</span>
              </p>
            </div>
          </div>

          {/* Interactive Presence Selector: ONLINE, AWAY, DND */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1.5 shadow-inner">
              {/* Online Button */}
              <button
                id="btn-status-online"
                onClick={() => handleSelectStatus('online')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  userStatus === 'online'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                <span>Online</span>
                {userStatus === 'online' && <Check className="w-3.5 h-3.5 ml-0.5 text-emerald-200" />}
              </button>

              {/* Away Button */}
              <button
                id="btn-status-away"
                onClick={() => handleSelectStatus('away')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  userStatus === 'away'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                <span>Away</span>
                {userStatus === 'away' && <Check className="w-3.5 h-3.5 ml-0.5 text-amber-200" />}
              </button>

              {/* DND Button */}
              <button
                id="btn-status-dnd"
                onClick={() => handleSelectStatus('dnd')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  userStatus === 'dnd'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40 ring-1 ring-rose-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                <span>DND</span>
                {userStatus === 'dnd' && <Check className="w-3.5 h-3.5 ml-0.5 text-rose-200" />}
              </button>
            </div>

            {/* AGENT LOGIN / LOGOUT TOGGLE BUTTON & DYNAMIC QUEUE ACD MEMBERSHIP */}
            <div
              id="user-dashboard-agent-acd-control"
              className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1.5 shadow-inner"
              title="Adesione dinamica code ACD Asterisk (Agent Login/Logout *45)"
            >
              <button
                id="btn-toggle-agent-login"
                onClick={handleToggleAgentLogin}
                title={
                  isAgentLoggedIn
                    ? `Agente Attivo in ${joinedQueues.length} code. Clicca per disconnetterti (Agent Logout / *45)`
                    : `Agente Disconnesso. Clicca per collegarti alle code assegnate (Agent Login / *45)`
                }
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                  isAgentLoggedIn
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white ring-1 ring-emerald-400/50 shadow-emerald-950/60'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Headset className={`w-4 h-4 ${isAgentLoggedIn ? 'text-white' : 'text-amber-400'}`} />
                  {isAgentLoggedIn ? (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                  ) : (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-slate-500"></span>
                  )}
                </div>

                <div className="text-left leading-none">
                  <span className="block text-[9px] uppercase font-bold tracking-wider opacity-75">
                    Stato Agente
                  </span>
                  <span className="block text-xs font-extrabold mt-0.5">
                    {isAgentLoggedIn ? 'Agent Login (Attivo)' : 'Agent Logout (Offline)'}
                  </span>
                </div>

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isAgentLoggedIn
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isAgentLoggedIn ? `${joinedQueues.length} ${joinedQueues.length === 1 ? 'Coda' : 'Code'}` : '0 Code'}
                </span>
              </button>

              {/* Configure/Toggle individual queues button */}
              <button
                id="btn-open-queue-manager-modal"
                onClick={() => setShowQueueModal(true)}
                title="Gestisci code di chiamata assegnate e adesione per singola coda"
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                  showQueueModal
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px]">Code</span>
              </button>
            </div>

            {/* Quick Actions (Call Waiting & Test Call) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Dashboard Theme Mode Switcher */}
              {setTheme && (
                <div
                  id="user-dashboard-theme-selector"
                  className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs shadow-inner"
                  title="Cambia tema visuale della dashboard (salvato nel localStorage)"
                >
                  <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden 2xl:inline">
                    Tema:
                  </span>
                  <button
                    id="btn-theme-mode-dark"
                    onClick={() => handleSelectTheme('dark')}
                    className={`px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                    title="Modalità Dark (Predefinita)"
                  >
                    <Moon className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Dark</span>
                  </button>
                  <button
                    id="btn-theme-mode-light"
                    onClick={() => handleSelectTheme('light')}
                    className={`px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                      theme === 'light'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                    title="Modalità Light (Sfondo chiaro)"
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Light</span>
                  </button>
                  <button
                    id="btn-theme-mode-contrast"
                    onClick={() => handleSelectTheme('high-contrast')}
                    className={`px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                      theme === 'high-contrast'
                        ? 'bg-yellow-400 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                    title="Modalità Alto Contrasto (Accessibilità visiva WCAG AAA)"
                  >
                    <Contrast className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Alto Contrasto</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs">
                <input
                  type="checkbox"
                  id="user-call-waiting"
                  checked={callWaitingActive}
                  onChange={(e) => setCallWaitingActive(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-700 border-slate-600"
                />
                <label htmlFor="user-call-waiting" className="text-slate-300 font-medium cursor-pointer select-none">
                  Avviso di Chiamata
                </label>
              </div>

              <button
                onClick={() => handleSimulateIncomingCall(false)}
                title="Simula una chiamata in arrivo per testare lo squillo o il blocco DND"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400" />
                <span>Test Chiamata</span>
              </button>
            </div>
          </div>
        </div>

        {/* System-wide Sync Indicator Bar */}
        <div
          className={`px-4 py-2.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
            userStatus === 'online'
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
              : userStatus === 'away'
              ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
              : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                userStatus === 'online'
                  ? 'bg-emerald-400 animate-ping'
                  : userStatus === 'away'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            ></span>
            <span className="font-medium">
              {userStatus === 'online' && (
                <>
                  <strong className="font-semibold text-white">Stato Online attivo:</strong> Tutte le chiamate in ingresso squillano su WebRTC e WebPhone.
                </>
              )}
              {userStatus === 'away' && (
                <>
                  <strong className="font-semibold text-white">Stato Away (Assente) attivo:</strong> I colleghi vedono lo stato "Assente" nel pannello presenze (BLF) e il centralino segnala l'assenza temporanea.
                </>
              )}
              {userStatus === 'dnd' && (
                <>
                  <strong className="font-semibold text-white">Stato DND (Non Disturbare) attivo:</strong> Le chiamate in ingresso vengono rifiutate automaticamente e inviate direttamente alla segreteria.
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <Headset className={`w-3.5 h-3.5 ${isAgentLoggedIn ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>
                Agente ACD:{' '}
                {isAgentLoggedIn ? (
                  <span className="text-emerald-400 font-bold">
                    Login Attivo ({joinedQueues.length} {joinedQueues.length === 1 ? 'coda' : 'code'})
                  </span>
                ) : (
                  <span className="text-slate-400">Logout (Nessuna coda)</span>
                )}
              </span>
            </div>
            <span className="hidden md:inline">•</span>
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Sincronizzato: Centralino • BLF • WebPhone</span>
            </div>
          </div>
        </div>

        {/* Status Change Toast / Feedback banner */}
        {statusFeedbackMessage && (
          <div className="px-4 py-2 bg-sky-950/80 border border-sky-700/80 rounded-xl text-xs text-sky-300 flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{statusFeedbackMessage}</span>
            </div>
            <button
              onClick={() => setStatusFeedbackMessage(null)}
              className="text-sky-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Transfer Success Notification Banner */}
      {transferSuccessMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-700/80 rounded-2xl flex items-center gap-3 text-emerald-300 text-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{transferSuccessMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WIDGETS DASHBOARD: RIEPILOGO IN TEMPO REALE A SCHEDE                       */}
      {/* (Chiamate Perse, Messaggi Segreteria Non Letti, Contatti Recenti)           */}
      {/* ========================================================================= */}
      <div id="user-dashboard-widgets" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WIDGET 1: Chiamate Perse */}
        <div
          id="widget-missed-calls"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    countMissed > 0
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <PhoneMissed className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Chiamate Perse
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold tracking-tight ${countMissed > 0 ? 'text-rose-400' : 'text-white'}`}>
                      {countMissed}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">in tempo reale</span>
                  </div>
                </div>
              </div>

              {countMissed > 0 ? (
                <span className="px-2.5 py-1 text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/80 rounded-full animate-pulse">
                  Da gestire
                </span>
              ) : (
                <span className="px-2.5 py-1 text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded-full">
                  Nessuna persa
                </span>
              )}
            </div>

            {/* Preview of latest missed call */}
            <div className="mt-3.5 pt-3 border-t border-slate-800/80 text-xs">
              {latestMissedCall ? (
                <div className="space-y-1.5 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-200 font-semibold">
                    <span className="truncate max-w-[170px]">
                      {latestMissedCall.clid ? latestMissedCall.clid.replace(/"/g, '') : `Numero ${latestMissedCall.src}`}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {latestMissedCall.callDate ? (latestMissedCall.callDate.split(' ')[1] || latestMissedCall.callDate) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Mittente: <span className="font-mono text-slate-300">{latestMissedCall.src}</span>
                    </span>
                    <span className="text-rose-400/90 font-medium">{latestMissedCall.disposition}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Nessuna chiamata senza risposta nelle ultime ore.</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
            {latestMissedCall ? (
              <button
                id="btn-recall-latest-missed"
                onClick={() => {
                  handleStartCall(latestMissedCall.src, latestMissedCall.clid);
                  setActiveView('phone');
                }}
                title={`Richiama subito ${latestMissedCall.src}`}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Richiama subito</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">Registro aggiornato</span>
            )}

            <button
              id="btn-view-all-missed"
              onClick={() => {
                setActiveView('history');
                setHistoryFilter('missed');
              }}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 ml-auto hover:underline"
            >
              <span>Vedi registro completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* WIDGET 2: Segreterie Vocali Non Lette */}
        <div
          id="widget-unread-voicemails"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    unreadVmCount > 0
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <Voicemail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Messaggi in Segreteria
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold tracking-tight ${unreadVmCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                      {unreadVmCount}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      non letti / {voicemails.length} totali
                    </span>
                  </div>
                </div>
              </div>

              {unreadVmCount > 0 ? (
                <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/80 rounded-full animate-pulse">
                  Nuovi messaggi
                </span>
              ) : (
                <span className="px-2.5 py-1 text-[10px] font-medium bg-slate-800 text-slate-400 rounded-full">
                  Nessun nuovo msg
                </span>
              )}
            </div>

            {/* Preview of latest voicemail */}
            <div className="mt-3.5 pt-3 border-t border-slate-800/80 text-xs">
              {latestVoicemail ? (
                <div className="space-y-1.5 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-200 font-semibold">
                    <span className="truncate max-w-[170px]">{latestVoicemail.callerName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
                      {Math.floor(latestVoicemail.duration / 60)}:{(latestVoicemail.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                    "{latestVoicemail.transcription}"
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Nessun messaggio vocale archiviato nella casella.</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
            {latestVoicemail ? (
              <button
                id="btn-play-latest-voicemail"
                onClick={() => handlePlayVoicemail(latestVoicemail.id, latestVoicemail.transcription)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  playingVmId === latestVoicemail.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {playingVmId === latestVoicemail.id ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>In riproduzione...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Ascolta rapido</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">Casella aggiornata</span>
            )}

            <button
              id="btn-open-voicemail-tab"
              onClick={() => setActiveView('voicemail')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 ml-auto hover:underline"
            >
              <span>Apri segreteria</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* WIDGET 3: Contatti Recenti & Accesso Rapido */}
        <div
          id="widget-recent-contacts"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Contatti Recenti
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-white">
                      {contacts.length}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">in rubrica</span>
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 text-[10px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/60 rounded-full">
                Accesso Rapido
              </span>
            </div>

            {/* Quick dial list */}
            <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-2">
              {recentContacts.length > 0 ? (
                recentContacts.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800/70 border border-slate-800/50 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-sky-400 border border-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-sky-300">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {c.company || c.department || c.phone || c.mobile}
                        </div>
                      </div>
                    </div>

                    <button
                      id={`btn-quick-call-${c.id}`}
                      onClick={() => {
                        handleStartCall(c.phone || c.mobile, c.name, c.company);
                        setActiveView('phone');
                      }}
                      title={`Chiama ${c.name} (${c.phone || c.mobile})`}
                      className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg border border-emerald-600/40 transition shrink-0"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 py-2">Nessun contatto recente in rubrica.</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">1-click per chiamare</span>
            <button
              id="btn-open-contacts-tab"
              onClick={() => setActiveView('contacts')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 hover:underline"
            >
              <span>Rubrica completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="tab-user-phone"
            onClick={() => setActiveView('phone')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeView === 'phone'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Telefono & Chiamata</span>
            {callState === 'connected' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            )}
          </button>

          <button
            id="tab-user-extensions"
            onClick={() => setActiveView('extensions')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeView === 'extensions'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Interni & Presenze</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-emerald-400 rounded-full font-mono">
              {availableCount} liberi
            </span>
          </button>

          <button
            id="tab-user-history"
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeView === 'history'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Registro Chiamate</span>
            {countMissed > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-rose-600 text-white rounded-full font-bold">
                {countMissed} perse
              </span>
            )}
          </button>

          <button
            id="tab-user-contacts"
            onClick={() => setActiveView('contacts')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeView === 'contacts'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Rubrica Contatti</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded-full font-mono">
              {contacts.length}
            </span>
          </button>

          <button
            id="tab-user-voicemail"
            onClick={() => setActiveView('voicemail')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeView === 'voicemail'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Voicemail className="w-4 h-4" />
            <span>Segreterie Vocali</span>
            {unreadVmCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white rounded-full font-bold animate-pulse">
                {unreadVmCount}
              </span>
            )}
          </button>

          <button
            id="tab-user-queues"
            onClick={() => setActiveView('queues')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeView === 'queues'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Headset className="w-4 h-4" />
            <span>Code & Agente ACD</span>
            <span
              className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                isAgentLoggedIn
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isAgentLoggedIn ? `${joinedQueues.length} attive` : 'Offline'}
            </span>
          </button>
        </div>

        {/* Quick dial shortcut */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">Linea PJSIP Attiva</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TELEFONO & CONSOLE DI CHIAMATA (Con gestione attesa e trasferimento) */}
      {/* ========================================================================= */}
      {activeView === 'phone' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Call Card / Softphone Box */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            {/* Header with state badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Postazione Telefonica Utente</span>
                <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-sky-400 font-mono rounded border border-slate-700">
                  PJSIP WebRTC
                </span>
              </div>

              <div>
                {callState === 'idle' && (
                  <span className="px-2.5 py-1 text-xs bg-slate-800 text-slate-400 rounded-full font-semibold">
                    In Attesa di Chiamata
                  </span>
                )}
                {callState === 'calling' && (
                  <span className="px-2.5 py-1 text-xs bg-amber-950 text-amber-300 rounded-full font-semibold animate-pulse">
                    Composizione in corso...
                  </span>
                )}
                {callState === 'connected' && (
                  <span className="px-2.5 py-1 text-xs bg-emerald-950 text-emerald-300 rounded-full font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    {isOnHold ? 'Chiamata in Pausa (Attesa)' : 'In Conversazione'}
                  </span>
                )}
                {callState === 'incoming' && (
                  <span className="px-2.5 py-1 text-xs bg-sky-950 text-sky-300 rounded-full font-semibold animate-bounce">
                    Chiamata in Arrivo!
                  </span>
                )}
              </div>
            </div>

            {/* CALL IN PROGRESS DISPLAY */}
            {callState === 'connected' && activeCall && (
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                {/* Active Caller Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                      {activeCall.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{activeCall.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <span>{activeCall.number}</span>
                        {activeCall.department && <span>• {activeCall.department}</span>}
                        {activeCall.isInternal && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-sky-900/60 text-sky-300 rounded border border-sky-800">
                            Interno PJSIP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-mono font-bold text-emerald-400">
                      {formatTime(callDuration)}
                    </span>
                    <span className="block text-[10px] text-slate-500 uppercase tracking-widest">
                      Durata Chiamata
                    </span>
                  </div>
                </div>

                {/* HOLD NOTIFICATION IF ON HOLD */}
                {isOnHold && (
                  <div className="p-3 bg-amber-950/70 border border-amber-800/80 rounded-xl flex items-center justify-between text-amber-200 text-xs animate-pulse">
                    <div className="flex items-center gap-2">
                      <Pause className="w-4 h-4 text-amber-400" />
                      <span>
                        <strong>Chiamata Messa in Attesa:</strong> L'interlocutore sta ascoltando la musica d'attesa (MoH).
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-300">
                      Attesa: {formatTime(holdTimer)}
                    </span>
                  </div>
                )}

                {/* 2ND CALL WAITING BANNER (Avviso di Chiamata) */}
                {incomingWaitingCall && (
                  <div className="p-3.5 bg-rose-950/80 border border-rose-700 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PhoneIncoming className="w-4 h-4 text-rose-400 animate-bounce" />
                        <span className="text-xs font-bold text-white">
                          Seconda Chiamata in Entrata: {incomingWaitingCall.name} ({incomingWaitingCall.number})
                        </span>
                      </div>
                      <span className="text-[10px] text-rose-400 font-mono font-bold">2ª Linea</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleAnswerWaitingCall}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Rispondi e Metti in Attesa Linea 1</span>
                      </button>
                      <button
                        onClick={handleRejectWaitingCall}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs font-medium transition"
                      >
                        A Segreteria
                      </button>
                    </div>
                  </div>
                )}

                {/* HELD CALL (If swapped) */}
                {heldCall && (
                  <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span>Linea 2 in Attesa: <strong>{heldCall.name}</strong> ({heldCall.number})</span>
                    </div>
                    <button
                      onClick={handleSwapLines}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-600 rounded text-[11px] font-semibold flex items-center gap-1"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>Alterna Linee (Swap)</span>
                    </button>
                  </div>
                )}

                {/* CALL CONTROLS: HOLD, TRANSFER, MUTE, HANGUP */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {/* HOLD / PAUSE BUTTON */}
                  <button
                    id="btn-toggle-hold"
                    onClick={handleToggleHold}
                    className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-semibold transition ${
                      isOnHold
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isOnHold ? <Play className="w-5 h-5 text-white" /> : <Pause className="w-5 h-5 text-amber-400" />}
                    <span>{isOnHold ? 'Riprendi' : 'In Attesa'}</span>
                  </button>

                  {/* TRANSFER BUTTON */}
                  <button
                    id="btn-toggle-transfer"
                    onClick={() => setShowTransferDialog(true)}
                    className="py-3 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-semibold transition"
                  >
                    <ArrowRightLeft className="w-5 h-5 text-sky-400" />
                    <span>Trasferisci</span>
                  </button>

                  {/* MUTE BUTTON */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-semibold transition ${
                      isMuted
                        ? 'bg-rose-900/60 text-rose-300 border border-rose-700'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5 text-rose-400" /> : <Mic className="w-5 h-5 text-slate-300" />}
                    <span>{isMuted ? 'Muto ON' : 'Muto'}</span>
                  </button>

                  {/* HANGUP BUTTON */}
                  <button
                    id="btn-hangup"
                    onClick={handleHangup}
                    className="py-3 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold transition shadow-lg shadow-rose-900/20"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>Chiudi</span>
                  </button>
                </div>
              </div>
            )}

            {/* INCOMING CALL BANNER (Idle State) */}
            {callState === 'incoming' && activeCall && (
              <div className="p-6 bg-slate-950 border border-emerald-500/50 rounded-2xl text-center space-y-4 animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
                  <PhoneIncoming className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{activeCall.name}</h3>
                  <p className="text-sm text-slate-400 font-mono mt-0.5">{activeCall.number}</p>
                  {activeCall.department && (
                    <p className="text-xs text-sky-400 mt-1">{activeCall.department}</p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleAnswerIncoming}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Rispondi</span>
                  </button>
                  <button
                    onClick={handleHangup}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-rose-900/40 transition"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Rifiuta</span>
                  </button>
                </div>
              </div>
            )}

            {/* DIALPAD & NUMBER INPUT (When not in call) */}
            {callState === 'idle' && (
              <div className="space-y-4">
                {/* Dial display */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
                  <input
                    type="text"
                    value={dialNumber}
                    onChange={(e) => setDialNumber(e.target.value)}
                    placeholder="Digita un numero o un interno (es. 102)..."
                    className="bg-transparent text-lg font-mono text-white placeholder-slate-600 outline-none w-full"
                  />
                  {dialNumber && (
                    <button
                      onClick={() => setDialNumber('')}
                      className="text-slate-500 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        audioService.playDTMF(key);
                        setDialNumber((prev) => prev + key);
                      }}
                      className="py-3 bg-slate-800/70 hover:bg-slate-800 active:bg-slate-700 text-white text-lg font-semibold rounded-xl border border-slate-700/60 transition shadow-sm"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                {/* Call Button */}
                <button
                  id="btn-start-call"
                  disabled={!dialNumber.trim()}
                  onClick={() => handleStartCall(dialNumber)}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition ${
                    dialNumber.trim()
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-900/30'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span>Avvia Chiamata</span>
                </button>
              </div>
            )}

            {/* Calling animation when ringing */}
            {callState === 'calling' && activeCall && (
              <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                <div className="w-16 h-16 rounded-full bg-sky-500/20 border border-sky-500 flex items-center justify-center mx-auto text-sky-400 animate-pulse">
                  <PhoneOutgoing className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{activeCall.name}</h3>
                  <p className="text-sm font-mono text-slate-400">{activeCall.number}</p>
                  <p className="text-xs text-amber-400 mt-1">Squillo in corso... (Asterisk PJSIP)</p>
                </div>
                <button
                  onClick={handleHangup}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
                >
                  Annulla Chiamata
                </button>
              </div>
            )}
          </div>

          {/* Quick Extensions & Presence on Right Column */}
          <div className="lg:col-span-6 space-y-5">
            {/* Quick Colleagues Presence (BLF) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-bold text-white">Chiamata Rapida Interni Colleghi</h3>
                </div>
                <button
                  onClick={() => setActiveView('extensions')}
                  className="text-xs text-sky-400 hover:underline font-medium"
                >
                  Vedi tutti ({extensions.length})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {extensions.filter((e) => e.number !== myExtension.number).map((ext) => (
                  <div
                    key={ext.id}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between hover:border-sky-500/60 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          ext.status === 'online'
                            ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50'
                            : ext.status === 'busy'
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                        }`}
                      ></span>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate group-hover:text-sky-300">
                          {ext.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Int. {ext.number} • {ext.department}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* If call is active: offer quick transfer button! */}
                      {callState === 'connected' ? (
                        <button
                          onClick={() => handleExecuteBlindTransfer(ext.number)}
                          title={`Trasferisci la chiamata a ${ext.name}`}
                          className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Passa</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartCall(ext.number, ext.name, ext.department)}
                          title={`Chiama interno ${ext.number}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded text-[11px] font-semibold transition"
                        >
                          Chiama
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Speed Dials */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white pb-2 border-b border-slate-800">
                Servizi Asterisk & Numeri Rapidi
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => handleStartCall('*97', 'Accesso Segreteria Personale')}
                  className="p-3 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center justify-between transition"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">Casella Vocale Personale</span>
                    <span className="text-[10px] text-slate-400">Codice servizio *97</span>
                  </div>
                  <Voicemail className="w-4 h-4 text-sky-400" />
                </button>

                <button
                  onClick={() => handleStartCall('600', 'Gruppo Commerciale Italia')}
                  className="p-3 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center justify-between transition"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">Ring Group Commerciale</span>
                    <span className="text-[10px] text-slate-400">Gruppo Interni 600</span>
                  </div>
                  <Users className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: LISTA INTERNI DISPONIBILI E INDISPONIBILI (Presenze BLF & Chiamate) */}
      {/* ========================================================================= */}
      {activeView === 'extensions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">Elenco Interni Aziendali & Presenze (BLF)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Stato in tempo reale degli interni telefonici PJSIP. Chiamata one-click o trasferimento diretto.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setExtAvailabilityFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  extAvailabilityFilter === 'all'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Tutti ({extensions.length})
              </button>

              <button
                onClick={() => setExtAvailabilityFilter('available')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  extAvailabilityFilter === 'available'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-emerald-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Disponibili ({availableCount})</span>
              </button>

              <button
                onClick={() => setExtAvailabilityFilter('unavailable')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  extAvailabilityFilter === 'unavailable'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-rose-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>Indisponibili / Occupati ({unavailableCount})</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC AGENT QUEUE MEMBERSHIP BANNER (Agent Login / Logout ACD) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                  isAgentLoggedIn
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-950/60'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Headset className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">
                    Postazione Agente Code Inbound (ACD Asterisk)
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      isAgentLoggedIn
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isAgentLoggedIn ? 'Login Attivo' : 'Logout / Offline'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-0.5">
                  Interno <strong className="text-white font-mono">{myExtension.number}</strong> ({myExtension.name}) •{' '}
                  {isAgentLoggedIn ? (
                    <span>
                      Attivo su{' '}
                      <strong className="text-emerald-300">{joinedQueues.length} code</strong> (
                      {joinedQueues.map((q) => q.name).join(', ')})
                    </span>
                  ) : (
                    <span>Non ricevi chiamate di coda. Esegui il Login per rendersi disponibile agli instradamenti.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                id="btn-extensions-agent-toggle"
                onClick={handleToggleAgentLogin}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                  isAgentLoggedIn
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                }`}
              >
                {isAgentLoggedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>{isAgentLoggedIn ? 'Agent Logout (Esci da tutte le code)' : 'Agent Login (Entra nelle code)'}</span>
              </button>

              <button
                onClick={() => setActiveView('queues')}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                title="Apri pannello dettagliato di tutte le code di chiamata"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dettagli Code</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={extSearchTerm}
              onChange={(e) => setExtSearchTerm(e.target.value)}
              placeholder="Cerca interno per nome, numero o reparto..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
            />
          </div>

          {/* Extensions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredExtensions.map((ext) => {
              const isSelf = ext.number === myExtension.number;
              const extQueues = activeQueues.filter((q) => q.members.includes(ext.number));
              return (
                <div
                  key={ext.id}
                  className={`p-4 rounded-2xl border transition ${
                    ext.status === 'online'
                      ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/60'
                      : 'bg-slate-950/40 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-sm">
                          {ext.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-slate-950 ${
                            ext.status === 'online'
                              ? 'bg-emerald-400'
                              : ext.status === 'busy'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                        ></span>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white">{ext.name}</h4>
                          {isSelf && (
                            <span className="text-[9px] bg-sky-950 text-sky-400 border border-sky-800 px-1.5 py-0.5 rounded font-bold">
                              Tu (Questo PC)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono">Int. {ext.number}</p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                        ext.status === 'online'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : ext.status === 'busy'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      {ext.status === 'online'
                        ? 'Disponibile'
                        : ext.status === 'busy'
                        ? 'In Chiamata'
                        : 'Non Disturbare'}
                    </span>
                  </div>

                  {/* Queues membership tags */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                    <div className="flex flex-wrap items-center gap-1 min-h-[22px]">
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Headset className="w-3 h-3 text-sky-400" />
                        Code ACD:
                      </span>
                      {extQueues.length === 0 ? (
                        <span className="text-[10px] text-slate-500 italic">Nessuna coda attiva</span>
                      ) : (
                        extQueues.map((q) => (
                          <span
                            key={q.id}
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold border ${
                              q.priority === 'high'
                                ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                                : q.priority === 'medium'
                                ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                                : 'bg-slate-900 text-slate-300 border-slate-800'
                            }`}
                            title={`Coda ${q.number} - ${q.name} (Priorità: ${q.priority || 'medium'})`}
                          >
                            {q.number}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">{ext.department}</span>

                    <div className="flex items-center gap-1.5">
                      {/* Self Agent Toggle Button */}
                      {isSelf && (
                        <button
                          id={`btn-ext-card-agent-toggle-${ext.number}`}
                          onClick={handleToggleAgentLogin}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm ${
                            isAgentLoggedIn
                              ? 'bg-rose-600/90 hover:bg-rose-500 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                          title="Commuta adesione dinamica alle code di chiamata (Agent Login/Logout *45)"
                        >
                          <Headset className="w-3 h-3" />
                          <span>{isAgentLoggedIn ? 'Logout Agente' : 'Login Agente'}</span>
                        </button>
                      )}

                      {/* If call is active: quick transfer */}
                      {callState === 'connected' && !isSelf && (
                        <button
                          onClick={() => handleExecuteBlindTransfer(ext.number)}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Trasferisci qui</span>
                        </button>
                      )}

                      {/* Direct Call Button */}
                      {!isSelf && (
                        <button
                          onClick={() => {
                            setActiveView('phone');
                            handleStartCall(ext.number, ext.name, ext.department);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Chiama</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: REGISTRO CHIAMATE (Ricevute, Risposte e Perse) */}
      {/* ========================================================================= */}
      {activeView === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          {/* Header with detailed filters */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">Registro Chiamate (Ricevute, Risposte e Perse)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Archivio storico telefonico dell'interno con evidenza delle chiamate perse da richiamare.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  historyFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tutte ({cdrRecords.length})
              </button>

              <button
                onClick={() => setHistoryFilter('answered')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                  historyFilter === 'answered' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Risposte ({countAnswered})</span>
              </button>

              <button
                onClick={() => setHistoryFilter('missed')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                  historyFilter === 'missed' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-white'
                }`}
              >
                <PhoneMissed className="w-3.5 h-3.5" />
                <span>Perse ({countMissed})</span>
              </button>

              <button
                onClick={() => setHistoryFilter('received')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                  historyFilter === 'received' ? 'bg-sky-600 text-white' : 'text-sky-400 hover:text-white'
                }`}
              >
                <PhoneIncoming className="w-3.5 h-3.5" />
                <span>Ricevute ({countReceived})</span>
              </button>

              <button
                onClick={() => setHistoryFilter('outgoing')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                  historyFilter === 'outgoing' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PhoneOutgoing className="w-3.5 h-3.5" />
                <span>Effettuate</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              placeholder="Filtra per numero, nome o data..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
            />
          </div>

          {/* Call Records List */}
          <div className="space-y-2">
            {filteredCdr.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nessuna chiamata trovata per i criteri selezionati.
              </div>
            ) : (
              filteredCdr.map((cdr) => {
                const isIncoming = cdr.dst === myExtension.number || cdr.dst.length === 3;
                const isMissed = cdr.disposition === 'NO ANSWER' || cdr.disposition === 'FAILED';
                const isAnswered = cdr.disposition === 'ANSWERED';
                const numberToCall = isIncoming ? cdr.src : cdr.dst;

                return (
                  <div
                    key={cdr.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                      isMissed
                        ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Status Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isMissed
                            ? 'bg-rose-900/50 text-rose-400'
                            : isAnswered
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : 'bg-blue-900/50 text-blue-400'
                        }`}
                      >
                        {isMissed ? (
                          <PhoneMissed className="w-5 h-5" />
                        ) : isIncoming ? (
                          <PhoneIncoming className="w-5 h-5" />
                        ) : (
                          <PhoneOutgoing className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{cdr.clid || cdr.src}</span>
                          {isMissed && (
                            <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-600 text-white rounded">
                              PERSA
                            </span>
                          )}
                          {isAnswered && (
                            <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                              RISPOSTA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="font-mono">{cdr.callDate}</span>
                          <span>•</span>
                          <span>{isMissed ? 'Nessuna Risposta' : `Durata: ${formatTime(cdr.billsec)}`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action: Call Back button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveView('phone');
                          handleStartCall(numberToCall);
                        }}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Richiama</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: RUBRICA CONTATTI */}
      {/* ========================================================================= */}
      {activeView === 'contacts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">Rubrica Contatti Aziendale</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Contatti telefonici e clienti con click-to-call su telefono fisso o cellulare.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOnlyFavoriteContacts(!onlyFavoriteContacts)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  onlyFavoriteContacts
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Preferiti</span>
              </button>

              <button
                onClick={() => setShowAddContactModal(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuovo Contatto</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Cerca per nome, azienda o numero di telefono..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
            />
          </div>

          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 hover:border-sky-500/50 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {contact.name}
                      {contact.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    </h4>
                    <p className="text-xs text-sky-400">{contact.company}</p>
                    <p className="text-[11px] text-slate-400">{contact.department}</p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                  {contact.phone && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 text-[11px]">Ufficio:</span>
                      <button
                        onClick={() => {
                          setActiveView('phone');
                          handleStartCall(contact.phone, contact.name, contact.company);
                        }}
                        className="font-mono text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {contact.phone}
                      </button>
                    </div>
                  )}

                  {contact.mobile && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 text-[11px]">Cellulare:</span>
                      <button
                        onClick={() => {
                          setActiveView('phone');
                          handleStartCall(contact.mobile, contact.name, contact.company);
                        }}
                        className="font-mono text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {contact.mobile}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 5: SEGRETERIE VOCALI (Messaggi Vocali dell'Interno) */}
      {/* ========================================================================= */}
      {activeView === 'voicemail' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">Casella Messaggi Vocali (Voicemail)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Messaggi registrati per mancata risposta, linea occupata o fuori orario su interno {myExtension.number}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-800 text-sky-400 border border-slate-700 rounded-xl text-xs font-mono">
                Accesso rapido da tastiera: *97
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {voicemails.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nessun messaggio vocale presente nella casella.
              </div>
            ) : (
              voicemails.map((vm) => {
                const isPlaying = playingVmId === vm.id;
                return (
                  <div
                    key={vm.id}
                    className={`p-4 rounded-2xl border transition ${
                      vm.isNew
                        ? 'bg-sky-950/20 border-sky-800/80 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-900/50 flex items-center justify-center text-sky-400">
                          <Voicemail className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{vm.callerName}</h4>
                            <span className="text-xs text-slate-400 font-mono">({vm.callerNumber})</span>
                            {vm.isNew && (
                              <span className="px-1.5 py-0.2 text-[9px] bg-rose-600 text-white font-bold rounded">
                                NUOVO
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {vm.timestamp} • Durata: {vm.durationSeconds}s • Causa:{' '}
                            {vm.reason === 'busy'
                              ? 'Linea Occupata'
                              : vm.reason === 'no_answer'
                              ? 'Nessuna Risposta'
                              : 'Fuori Orario'}
                          </p>
                        </div>
                      </div>

                      {/* Voicemail Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePlayVoicemail(vm.id, vm.transcription)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                            isPlaying
                              ? 'bg-amber-600 text-white animate-pulse'
                              : 'bg-sky-600 hover:bg-sky-500 text-white'
                          }`}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          <span>{isPlaying ? 'Ferma Ascolto' : 'Ascolta'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveView('phone');
                            handleStartCall(vm.callerNumber, vm.callerName);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Richiama</span>
                        </button>

                        <button
                          onClick={() => onDeleteVoicemail(vm.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                          title="Elimina messaggio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Transcription block */}
                    <div className="mt-3 p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 italic">
                      "{vm.transcription}"
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 6: CODE DI CHIAMATA & POSTAZIONE AGENTE ACD (Asterisk Queue Agent)    */}
      {/* ========================================================================= */}
      {activeView === 'queues' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Headset className="w-6 h-6 text-sky-400" />
                <h3 className="text-lg font-bold text-white">
                  Postazione Agente Code ACD (Call Queues Manager)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Adesione dinamica dell'interno <strong className="text-white font-mono">{myExtension.number}</strong> ({myExtension.name}) alle code di risposta automatica inbound di Asterisk PBX.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Asterisk Feature Code: <strong className="text-sky-400 font-bold">*45</strong>
              </span>
              <button
                onClick={() => handleSimulateQueueCall()}
                title="Simula una chiamata inbound proveniente dalla prima coda attiva"
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <PhoneIncoming className="w-3.5 h-3.5" />
                <span>Simula Inbound Coda</span>
              </button>
            </div>
          </div>

          {/* MASTER AGENT STATUS HERO BANNER */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isAgentLoggedIn
                ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/40 shadow-xl shadow-emerald-950/20'
                : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-slate-800'
            }`}
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isAgentLoggedIn
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-900/40'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700'
                  }`}
                >
                  <Headset className="w-9 h-9" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xl font-black text-white">
                      {isAgentLoggedIn ? 'Agente Attivo in Coda (Login Effettuato)' : 'Agente Disconnesso (Logout Effettuato)'}
                    </h4>
                    <span
                      className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isAgentLoggedIn
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                          : 'bg-amber-950 text-amber-300 border border-amber-500'
                      }`}
                    >
                      {isAgentLoggedIn ? 'Online / ACD Active' : 'Offline / Non Disponibile'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    {isAgentLoggedIn ? (
                      <>
                        L'interno <strong className="text-white font-mono">{myExtension.number}</strong> è attualmente registrato dinamicamente su{' '}
                        <strong className="text-emerald-300 font-bold">{joinedQueues.length} code di chiamata</strong>. Le chiamate in ingresso vengono distribuite a questo posto operatore WebRTC in base alle strategie di coda (round-robin, least-recent, ring-all) e ai pesi di priorità.
                      </>
                    ) : (
                      <>
                        L'interno <strong className="text-white font-mono">{myExtension.number}</strong> è attualmente disconnesso dalle code ACD. Nessuna chiamata da centralino o IVR verrà recapitata a questo interno finché non viene eseguito il login agente.
                      </>
                    )}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                    <span className="text-slate-400">
                      Code assegnate predefinite: <strong className="text-white font-mono">{assignedQueueNumbers.join(', ') || 'Nessuna'}</strong>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">
                      Code attive correnti: <strong className="text-emerald-400 font-mono">{joinedQueues.map((q) => q.number).join(', ') || 'Nessuna'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                <button
                  id="btn-queues-view-master-toggle"
                  onClick={handleToggleAgentLogin}
                  className={`px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-95 ${
                    isAgentLoggedIn
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60 ring-1 ring-rose-400/50'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 ring-1 ring-emerald-400/50'
                  }`}
                >
                  {isAgentLoggedIn ? (
                    <>
                      <LogOut className="w-5 h-5" />
                      <span>Logout da Tutte le Code (*45)</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Login nelle Code Assegnate (*45)</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-queues-view-modal-open"
                  onClick={() => setShowQueueModal(true)}
                  className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition border border-slate-700"
                >
                  <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                  <span>Configura Assegnazioni</span>
                </button>
              </div>
            </div>
          </div>

          {/* ALL QUEUES CARDS GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-white">
                  Tutte le Code di Chiamata del Centralino ({activeQueues.length})
                </h4>
                <p className="text-xs text-slate-400">
                  Unisciti o abbandona dinamicamente le singole code in tempo reale con l'applicazione Asterisk ACD.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeQueues.map((queue) => {
                const isMember = queue.members.includes(myExtension.number);
                const isAssigned = assignedQueueNumbers.includes(queue.number);

                return (
                  <div
                    key={queue.id}
                    className={`p-5 rounded-3xl border transition flex flex-col justify-between ${
                      isMember
                        ? 'bg-slate-950/90 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top bar: Number, Name, Priority */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 font-mono font-bold text-xs">
                              {queue.number}
                            </span>
                            <h5 className="text-sm font-bold text-white leading-tight">
                              {queue.name}
                            </h5>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {queue.description || 'Coda di smistamento automatico inbound'}
                          </p>
                        </div>

                        {/* Priority Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 border ${
                            queue.priority === 'high'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : queue.priority === 'low'
                              ? 'bg-slate-900 text-slate-400 border-slate-700'
                              : 'bg-sky-950 text-sky-300 border-sky-800'
                          }`}
                        >
                          {queue.priority === 'high'
                            ? 'Priorità ALTA'
                            : queue.priority === 'low'
                            ? 'Priorità BASSA'
                            : 'Priorità MEDIA'}
                        </span>
                      </div>

                      {/* ACD Queue Details & Strategy */}
                      <div className="py-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Strategia Distribuzione:</span>
                          <span className="font-mono text-slate-200 uppercase font-semibold">
                            {queue.strategy}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-400">
                          <span>Operatori Totali Assegnati:</span>
                          <span className="font-mono text-white font-bold">
                            {queue.members.length} {queue.members.length === 1 ? 'membro' : 'membri'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-400">
                          <span>Tempo Attesa Massimo:</span>
                          <span className="font-mono text-slate-200">
                            {queue.maxWaitTimeSeconds ? `${queue.maxWaitTimeSeconds}s` : 'Illimitato'}
                          </span>
                        </div>

                        {/* Real-time metrics bar */}
                        <div className="pt-2 grid grid-cols-3 gap-2 text-center bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-semibold">In Attesa</span>
                            <span className="text-xs font-bold font-mono text-amber-400">
                              {queue.waitingCalls ?? 0}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-semibold">In Corso</span>
                            <span className="text-xs font-bold font-mono text-sky-400">
                              {queue.activeCalls ?? 0}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-semibold">SLA %</span>
                            <span className="text-xs font-bold font-mono text-emerald-400">
                              {queue.serviceLevelPercentage ?? 98}%
                            </span>
                          </div>
                        </div>

                        {/* Current Member List Chips */}
                        <div className="pt-1">
                          <span className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                            Interni attivi in coda:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {queue.members.length === 0 ? (
                              <span className="text-[11px] text-slate-500 italic">Nessun agente attivo</span>
                            ) : (
                              queue.members.map((m) => {
                                const isMe = m === myExtension.number;
                                return (
                                  <span
                                    key={m}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                      isMe
                                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600 ring-1 ring-emerald-500/40'
                                        : 'bg-slate-900 text-slate-300 border-slate-800'
                                    }`}
                                  >
                                    {isMe ? `${m} (Tu)` : m}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions: Join/Leave Toggle & Test Inbound */}
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      {/* Checkbox for default set */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`queue-assign-${queue.number}`}
                          checked={isAssigned}
                          onChange={() => handleToggleQueueAssignment(queue.number)}
                          className="w-3.5 h-3.5 rounded text-sky-500 bg-slate-900 border-slate-700"
                        />
                        <label
                          htmlFor={`queue-assign-${queue.number}`}
                          className="text-[11px] text-slate-300 select-none cursor-pointer"
                        >
                          Includi nel set di login rapido (*45)
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Dynamic Toggle Button for this queue */}
                        <button
                          id={`btn-queue-toggle-${queue.number}`}
                          onClick={() => handleToggleQueueMember(queue.number)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
                            isMember
                              ? 'bg-rose-600/90 hover:bg-rose-500 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isMember ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                          <span>{isMember ? 'Esci dalla Coda' : 'Entra nella Coda'}</span>
                        </button>

                        {/* Test Call to this queue */}
                        <button
                          onClick={() => handleSimulateQueueCall(queue.number)}
                          title={`Simula una chiamata inbound specifica sulla coda ${queue.number}`}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition border border-slate-700"
                        >
                          <PhoneIncoming className="w-3.5 h-3.5 text-sky-400" />
                          <span>Test</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ASTERISK ACD CLI ARCHITECTURE & LOGS */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-white font-bold">Asterisk ACD Dynamic Agent CLI Monitor</span>
              </div>
              <span className="text-[11px] text-slate-500">Asterisk 20.6 / PJSIP Engine</span>
            </div>

            <div className="space-y-1 text-slate-300">
              <p className="text-emerald-400">
                Asterisk*CLI&gt; queue show
              </p>
              {activeQueues.map((q) => (
                <div key={q.id} className="pl-3 py-0.5 text-slate-400 border-l border-slate-800">
                  <span className="text-sky-300 font-bold">{q.number}</span> has {q.waitingCalls ?? 0} calls (max {q.maxWaitTimeSeconds || 'unlimited'}) in '{q.strategy}' strategy (priority={q.priority || 'medium'})
                  <div className="pl-3 text-[11px] text-slate-500">
                    Members: {q.members.map((m) => `PJSIP/${m} (dynamic)`).join(', ') || 'None'}
                  </div>
                </div>
              ))}
              <p className="text-slate-500 text-[11px] pt-1">
                -- Command dynamic executed: AddQueueMember() and RemoveQueueMember() bound to Extension {myExtension.number}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRASFERIMENTO DI CHIAMATA (Blind / Attended ad altri interni) */}
      {/* ========================================================================= */}
      {showTransferDialog && activeCall && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Trasferimento Chiamata</h3>
              </div>
              <button
                onClick={() => {
                  setShowTransferDialog(false);
                  setIsAttendedCalling(false);
                  setAttendedColleague(null);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 block">Chiamata attiva da trasferire:</span>
              <span className="font-bold text-white text-sm">
                {activeCall.name} ({activeCall.number})
              </span>
            </div>

            {/* Transfer Type Selection */}
            {!isAttendedCalling ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setTransferType('blind')}
                    className={`py-2 rounded-lg font-bold transition ${
                      transferType === 'blind' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Cieco / Diretto (Blind)
                  </button>
                  <button
                    onClick={() => setTransferType('attended')}
                    className={`py-2 rounded-lg font-bold transition ${
                      transferType === 'attended' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Con Offerta (Attended)
                  </button>
                </div>

                <div className="text-[11px] text-slate-400">
                  {transferType === 'blind'
                    ? 'La chiamata viene inoltrata istantaneamente al collega selezionato senza preavviso.'
                    : 'Mette in attesa il chiamante, chiama prima il collega per verificare la disponibilità e poi completa il passaggio.'}
                </div>

                {/* Colleagues list to choose from */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  <span className="text-xs font-bold text-slate-300 block">Seleziona l'interno destinatario:</span>
                  {extensions.filter((e) => e.number !== myExtension.number).map((ext) => (
                    <div
                      key={ext.id}
                      onClick={() => setSelectedTransferExt(ext.number)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                        selectedTransferExt === ext.number
                          ? 'bg-sky-950/60 border-sky-500'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            ext.status === 'online'
                              ? 'bg-emerald-400'
                              : ext.status === 'busy'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                        ></span>
                        <div>
                          <div className="text-xs font-bold text-white">{ext.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Int. {ext.number} • {ext.department}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          ext.status === 'online'
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {ext.status === 'online' ? 'Disponibile' : 'Occupato'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Confirm Button */}
                <div className="pt-2">
                  <button
                    disabled={!selectedTransferExt}
                    onClick={() => {
                      if (transferType === 'blind') {
                        handleExecuteBlindTransfer(selectedTransferExt);
                      } else {
                        handleStartAttendedTransfer(selectedTransferExt);
                      }
                    }}
                    className={`w-full py-3 rounded-xl font-bold text-xs transition ${
                      selectedTransferExt
                        ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-md'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {transferType === 'blind' ? 'Esegui Trasferimento Cieco' : 'Chiama Collega per Offerta'}
                  </button>
                </div>
              </div>
            ) : (
              /* ATTENDED TRANSFER IN PROGRESS DIALOG */
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 border border-amber-600/60 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Headphones className="w-4 h-4" />
                    <span>In Conversazione con: {attendedColleague?.name}</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Il chiamante iniziale ({activeCall.name}) è in attesa con musica (MoH). Puoi annunciare la chiamata al collega.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleCompleteAttendedTransfer}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completa Passaggio</span>
                  </button>

                  <button
                    onClick={handleCancelAttendedTransfer}
                    className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
                  >
                    Annulla e Torna al Chiamante
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GESTIONE RAPIDA CODE AGENTE ACD (Modal Popup)                      */}
      {/* ========================================================================= */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
                  <Headset className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Gestione Code Agente (Interno {myExtension.number})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Adesione dinamica Asterisk ACD (Agent Login / Logout)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQueueModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Master Toggle inside modal */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">
                  Stato Globale Agente
                </span>
                <span className="text-[11px] text-slate-400">
                  {isAgentLoggedIn
                    ? `Attivo in ${joinedQueues.length} code di chiamata`
                    : 'Disconnesso (Nessuna chiamata da code)'}
                </span>
              </div>

              <button
                onClick={handleToggleAgentLogin}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md ${
                  isAgentLoggedIn
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isAgentLoggedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>{isAgentLoggedIn ? 'Logout Agente (*45)' : 'Login Agente (*45)'}</span>
              </button>
            </div>

            {/* List of queues with individual switches */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">
                Code Disponibili & Assegnazione:
              </span>

              {activeQueues.map((q) => {
                const isMember = q.members.includes(myExtension.number);
                const isAssigned = assignedQueueNumbers.includes(q.number);

                return (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                      isMember
                        ? 'bg-slate-950 border-emerald-600/60'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 font-mono font-bold text-[11px]">
                          {q.number}
                        </span>
                        <h5 className="text-xs font-bold text-white truncate">{q.name}</h5>
                        {q.priority && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              q.priority === 'high'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : q.priority === 'low'
                                ? 'bg-slate-900 text-slate-400'
                                : 'bg-sky-950 text-sky-300'
                            }`}
                          >
                            {q.priority}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => handleToggleQueueAssignment(q.number)}
                            className="w-3 h-3 rounded text-sky-500 bg-slate-800 border-slate-700"
                          />
                          <span>Assegna per login rapido</span>
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleQueueMember(q.number)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                        isMember
                          ? 'bg-rose-600/90 hover:bg-rose-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isMember ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                      <span>{isMember ? 'Esci' : 'Entra'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Asterisk AddQueueMember / RemoveQueueMember
              </span>
              <button
                onClick={() => setShowQueueModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AGGIUNGI NUOVO CONTATTO RUBRICA */}
      {/* ========================================================================= */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Aggiungi Nuovo Contatto in Rubrica</h3>
              <button
                onClick={() => setShowAddContactModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome e Cognome *</label>
                <input
                  type="text"
                  required
                  value={newContactData.name}
                  onChange={(e) => setNewContactData({ ...newContactData, name: e.target.value })}
                  placeholder="Es. Mario Rossi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Azienda</label>
                  <input
                    type="text"
                    value={newContactData.company}
                    onChange={(e) => setNewContactData({ ...newContactData, company: e.target.value })}
                    placeholder="Es. Studio Tecnico Srl"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Reparto / Ruolo</label>
                  <input
                    type="text"
                    value={newContactData.department}
                    onChange={(e) => setNewContactData({ ...newContactData, department: e.target.value })}
                    placeholder="Es. Ufficio Acquisti"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Telefono Fisso</label>
                  <input
                    type="text"
                    value={newContactData.phone}
                    onChange={(e) => setNewContactData({ ...newContactData, phone: e.target.value })}
                    placeholder="Es. +39 02 123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Cellulare</label>
                  <input
                    type="text"
                    value={newContactData.mobile}
                    onChange={(e) => setNewContactData({ ...newContactData, mobile: e.target.value })}
                    placeholder="Es. +39 348 1234567"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={newContactData.email}
                  onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                  placeholder="Es. mario@azienda.it"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="contact-fav"
                  checked={newContactData.isFavorite}
                  onChange={(e) => setNewContactData({ ...newContactData, isFavorite: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="contact-fav" className="text-xs text-slate-300 select-none cursor-pointer">
                  Aggiungi ai Contatti Preferiti ⭐
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Salva Contatto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
