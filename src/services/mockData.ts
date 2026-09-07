import {
  Extension,
  InboundRoute,
  OutboundRoute,
  IVRMenu,
  RingGroup,
  CDRRecord,
  Contact,
  ClusterNode,
  PushLog,
  VoicemailMessage,
  BusinessHoursConfig,
  CallQueue
} from '../types/pbx';

export const initialExtensions: Extension[] = [
  {
    id: 'ext-101',
    number: '101',
    name: 'Marco Rossi',
    email: 'm.rossi@azienda.it',
    department: 'Direzione & IT',
    secret: 'P@ssw0rd101!sip',
    webrtcEnabled: true,
    codecs: ['opus', 'alaw', 'ulaw', 'g722'],
    voicemailEnabled: true,
    voicemailPin: '1010',
    callerId: '"Marco Rossi" <101>',
    status: 'online',
    mobilePushEnabled: true,
    pushDeviceType: 'ios',
    pushToken: 'apns-voip-token-a982df4567eec4310098',
    context: 'internal-context',
    maxContacts: 3,
    callWaitingEnabled: true,
    forwardSettings: {
      always: { enabled: false, destinationType: 'external', target: '' },
      onBusy: { enabled: true, destinationType: 'voicemail', target: '101' },
      onNoAnswer: { enabled: true, ringTimeSeconds: 20, destinationType: 'voicemail', target: '101' }
    }
  },
  {
    id: 'ext-102',
    number: '102',
    name: 'Sara Bianchi',
    email: 's.bianchi@azienda.it',
    department: 'Commerciale',
    secret: 'S@raB2024!sip',
    webrtcEnabled: true,
    codecs: ['opus', 'alaw', 'g722'],
    voicemailEnabled: true,
    voicemailPin: '1020',
    callerId: '"Sara Bianchi" <102>',
    status: 'online',
    mobilePushEnabled: true,
    pushDeviceType: 'android',
    pushToken: 'fcm-token-c89b71f92e44d01aa8723901b',
    context: 'dlpn_commerciale',
    maxContacts: 2,
    callWaitingEnabled: true,
    forwardSettings: {
      always: { enabled: false, destinationType: 'external', target: '' },
      onBusy: { enabled: true, destinationType: 'voicemail', target: '102' },
      onNoAnswer: { enabled: true, ringTimeSeconds: 20, destinationType: 'voicemail', target: '102' }
    }
  },
  {
    id: 'ext-103',
    number: '103',
    name: 'Alessandro Verdi',
    email: 'a.verdi@azienda.it',
    department: 'Supporto Tecnico',
    secret: 'TechVerdi#99!',
    webrtcEnabled: true,
    codecs: ['opus', 'alaw'],
    voicemailEnabled: false,
    voicemailPin: '1030',
    callerId: '"Alessandro Verdi" <103>',
    status: 'busy',
    mobilePushEnabled: true,
    pushDeviceType: 'android',
    pushToken: 'fcm-token-fa92801123e4099bf7811',
    context: 'internal-context',
    maxContacts: 2
  },
  {
    id: 'ext-104',
    number: '104',
    name: 'Giulia Colombo',
    email: 'g.colombo@azienda.it',
    department: 'Amministrazione',
    secret: 'GiuliaC_Admin_77',
    webrtcEnabled: true,
    codecs: ['alaw', 'ulaw'],
    voicemailEnabled: true,
    voicemailPin: '1040',
    callerId: '"Giulia Colombo" <104>',
    status: 'online',
    mobilePushEnabled: false,
    context: 'internal-context',
    maxContacts: 1
  },
  {
    id: 'ext-105',
    number: '105',
    name: 'Supporto Helpdesk N1',
    email: 'supporto@azienda.it',
    department: 'Supporto Tecnico',
    secret: 'Helpdesk2024*Sip',
    webrtcEnabled: true,
    codecs: ['opus', 'alaw', 'g722'],
    voicemailEnabled: true,
    voicemailPin: '1050',
    callerId: '"Helpdesk Livello 1" <105>',
    status: 'dnd',
    mobilePushEnabled: true,
    pushDeviceType: 'ios',
    pushToken: 'apns-voip-token-bb71239845012fa',
    context: 'internal-context',
    maxContacts: 5
  },
  {
    id: 'ext-201',
    number: '201',
    name: 'Sala Riunioni Alpha',
    email: 'meeting-alpha@azienda.it',
    department: 'Sale Riunioni',
    secret: 'ConferenceSIP@201',
    webrtcEnabled: true,
    codecs: ['opus', 'g722'],
    voicemailEnabled: false,
    voicemailPin: '2010',
    callerId: '"Sala Riunioni Alpha" <201>',
    status: 'offline',
    mobilePushEnabled: false,
    context: 'internal-context',
    maxContacts: 1
  }
];

export const initialInboundRoutes: InboundRoute[] = [
  {
    id: 'in-1',
    name: 'Numero Principale Sede Milano',
    didNumber: '+390287654321',
    destinationType: 'ivr',
    destinationId: 'ivr-1',
    description: 'Centralino principale con risponditore vocale orari 09:00-18:00',
    cidPrefix: '[MI-MAIN]'
  },
  {
    id: 'in-2',
    name: 'Numero Diretto Supporto H24',
    didNumber: '+390698765432',
    destinationType: 'ring_group',
    destinationId: 'rg-1',
    description: 'Linea prioritaria clienti per emergenze tecniche',
    cidPrefix: '[SUPPORTO]'
  },
  {
    id: 'in-3',
    name: 'Linea Commerciale & Partnership',
    didNumber: '+390115544332',
    destinationType: 'ring_group',
    destinationId: 'rg-2',
    description: 'Inoltro al team commerciale vendite',
    cidPrefix: '[VENDITE]'
  }
];

export const initialOutboundRoutes: OutboundRoute[] = [
  {
    id: 'out-1',
    name: 'Uscita Chiamate Nazionali Fissi & VoIP',
    dialPattern: '0/.',
    trunk: 'SIP-TRUNK-TIM-PRIMARIO',
    stripDigits: 0,
    prependDigits: '',
    failoverTrunk: 'SIP-TRUNK-FASTWEB-BACKUP',
    priority: 1
  },
  {
    id: 'out-2',
    name: 'Uscita Cellulari Italia',
    dialPattern: '3/.',
    trunk: 'SIP-TRUNK-FASTWEB-BACKUP',
    stripDigits: 0,
    prependDigits: '',
    failoverTrunk: 'SIP-TRUNK-TIM-PRIMARIO',
    priority: 2
  },
  {
    id: 'out-3',
    name: 'Emergenze Uniche (112, 113, 118)',
    dialPattern: '11[238]',
    trunk: 'SIP-TRUNK-TIM-PRIMARIO',
    stripDigits: 0,
    prependDigits: '',
    priority: 0
  }
];

export const initialIVRMenus: IVRMenu[] = [
  {
    id: 'ivr-1',
    name: 'IVR Principale Aziendale',
    greetingPrompt: 'prompt_benvenuto_italiano.wav',
    timeout: 8,
    invalidRetries: 3,
    options: [
      { digit: '1', destinationType: 'ring_group', destinationId: 'rg-2', description: 'Reparto Commerciale' },
      { digit: '2', destinationType: 'ring_group', destinationId: 'rg-1', description: 'Assistenza Tecnica e Helpdesk' },
      { digit: '3', destinationType: 'extension', destinationId: 'ext-104', description: 'Amministrazione e Contabilità' },
      { digit: '0', destinationType: 'extension', destinationId: 'ext-101', description: 'Centralino / Operatore' }
    ]
  }
];

export const initialRingGroups: RingGroup[] = [
  {
    id: 'rg-1',
    number: '600',
    name: 'Gruppo Helpdesk Tecnico',
    strategy: 'ringall',
    ringTime: 25,
    members: ['103', '105'],
    destinationOnNoAnswer: {
      type: 'voicemail',
      id: 'ext-105'
    }
  },
  {
    id: 'rg-2',
    number: '601',
    name: 'Gruppo Commerciale Italia',
    strategy: 'hunt',
    ringTime: 20,
    members: ['102', '101'],
    destinationOnNoAnswer: {
      type: 'extension',
      id: 'ext-102'
    }
  }
];

export const initialCDRRecords: CDRRecord[] = [
  {
    id: 'cdr-1001',
    callDate: '2026-09-04 10:42:15',
    clid: '"Mario Rossi - Studio Legale" <+393481234567>',
    src: '+393481234567',
    dst: '101',
    dcontext: 'from-trunk-tim',
    channel: 'PJSIP/tim-trunk-000001fa',
    dstchannel: 'PJSIP/101-000001fb',
    lastapp: 'Dial',
    duration: 320,
    billsec: 305,
    disposition: 'ANSWERED',
    hasRecording: true,
    recordingFile: 'rec-20260904-1042-101.wav',
    mosScore: 4.38,
    codec: 'opus (48kHz)'
  },
  {
    id: 'cdr-1002',
    callDate: '2026-09-04 10:15:30',
    clid: '"Sara Bianchi" <102>',
    src: '102',
    dst: '+390234567890',
    dcontext: 'dlpn_commerciale',
    channel: 'PJSIP/102-000001fc',
    dstchannel: 'PJSIP/fastweb-trunk-000001fd',
    lastapp: 'Dial',
    duration: 184,
    billsec: 172,
    disposition: 'ANSWERED',
    hasRecording: true,
    recordingFile: 'rec-20260904-1015-102.wav',
    mosScore: 4.41,
    codec: 'g722 (16kHz)'
  },
  {
    id: 'cdr-1003',
    callDate: '2026-09-04 09:50:11',
    clid: '"Cliente Esterno Milano" <+390299887766>',
    src: '+390299887766',
    dst: '600',
    dcontext: 'from-trunk-tim',
    channel: 'PJSIP/tim-trunk-000001fe',
    dstchannel: 'PJSIP/103-000001ff',
    lastapp: 'Queue',
    duration: 45,
    billsec: 0,
    disposition: 'NO ANSWER',
    hasRecording: false,
    mosScore: 4.12,
    codec: 'alaw (8kHz)'
  },
  {
    id: 'cdr-1004',
    callDate: '2026-09-04 09:30:02',
    clid: '"Alessandro Verdi" <103>',
    src: '103',
    dst: '101',
    dcontext: 'internal-context',
    channel: 'PJSIP/103-00000200',
    dstchannel: 'PJSIP/101-00000201',
    lastapp: 'Dial',
    duration: 412,
    billsec: 401,
    disposition: 'ANSWERED',
    hasRecording: true,
    recordingFile: 'rec-20260904-0930-internal.wav',
    mosScore: 4.48,
    codec: 'opus (48kHz)'
  },
  {
    id: 'cdr-1005',
    callDate: '2026-09-04 09:12:44',
    clid: '"Fornitore Ferramenta" <+390114433221>',
    src: '+390114433221',
    dst: '104',
    dcontext: 'from-trunk-tim',
    channel: 'PJSIP/tim-trunk-00000202',
    dstchannel: 'PJSIP/104-00000203',
    lastapp: 'Dial',
    duration: 12,
    billsec: 0,
    disposition: 'BUSY',
    hasRecording: false,
    mosScore: 4.25,
    codec: 'alaw (8kHz)'
  },
  {
    id: 'cdr-1006',
    callDate: '2026-09-04 08:45:19',
    clid: '"Marco Rossi" <101>',
    src: '101',
    dst: '+393359876543',
    dcontext: 'internal-context',
    channel: 'PJSIP/101-00000204',
    dstchannel: 'PJSIP/fastweb-trunk-00000205',
    lastapp: 'Dial',
    duration: 540,
    billsec: 531,
    disposition: 'ANSWERED',
    hasRecording: true,
    recordingFile: 'rec-20260904-0845-101.wav',
    mosScore: 4.39,
    codec: 'opus (48kHz)'
  },
  {
    id: 'cdr-1007',
    callDate: '2026-09-03 17:35:10',
    clid: '"Gianluca Neri" <+393478899001>',
    src: '+393478899001',
    dst: '601',
    dcontext: 'from-trunk-tim',
    channel: 'PJSIP/tim-trunk-000001e0',
    dstchannel: 'PJSIP/102-000001e1',
    lastapp: 'Dial',
    duration: 260,
    billsec: 248,
    disposition: 'ANSWERED',
    hasRecording: true,
    recordingFile: 'rec-20260903-1735-601.wav',
    mosScore: 4.42,
    codec: 'g722 (16kHz)'
  },
  {
    id: 'cdr-1008',
    callDate: '2026-09-03 16:20:41',
    clid: '"Numero Anonimo" <anonymous>',
    src: 'anonymous',
    dst: '101',
    dcontext: 'from-trunk-tim',
    channel: 'PJSIP/tim-trunk-000001e2',
    dstchannel: '',
    lastapp: 'Hangup',
    duration: 5,
    billsec: 0,
    disposition: 'FAILED',
    hasRecording: false,
    mosScore: 3.80,
    codec: 'alaw (8kHz)'
  }
];

export const initialContacts: Contact[] = [
  {
    id: 'cnt-1',
    name: 'Ing. Roberto Ferrari',
    company: 'NextGen Cloud Solutions',
    department: 'Direzione Tecnica',
    email: 'r.ferrari@nextgencloud.it',
    phone: '+39 02 76543210',
    mobile: '+39 348 1122334',
    extension: '101',
    notes: 'Contatto di riferimento per infrastruttura cluster e datacenter',
    isFavorite: true
  },
  {
    id: 'cnt-2',
    name: 'Dott.ssa Elena Conti',
    company: 'Studio Fiscale Associati',
    department: 'Commercialista',
    email: 'elena.conti@studiofiscale.it',
    phone: '+39 02 44556677',
    mobile: '+39 335 4433221',
    notes: 'Orari reperibilità: Lun-Ven 09:00 - 13:00',
    isFavorite: true
  },
  {
    id: 'cnt-3',
    name: 'Fabio De Angelis',
    company: 'VoIP Voice Italia Provider',
    department: 'NOC & Carrier Services',
    email: 'support@voipvoice.it',
    phone: '+39 0571 123456',
    mobile: '+39 340 9876543',
    notes: 'Account manager SIP Trunk TIM & Fastweb interconnect',
    isFavorite: true
  },
  {
    id: 'cnt-4',
    name: 'Martina Galli',
    company: 'Logistica Lombarda Srl',
    department: 'Spedizioni e Magazzino',
    email: 'm.galli@logisticalombarda.it',
    phone: '+39 039 998877',
    mobile: '+39 349 5566778',
    notes: 'Consegne hardware VoIP e apparati PBX',
    isFavorite: false
  },
  {
    id: 'cnt-5',
    name: 'Claudio Moretti',
    company: 'Security Systems SpA',
    department: 'Reti & Firewall',
    email: 'c.moretti@secsys.it',
    phone: '+39 06 88776655',
    mobile: '+39 338 7788990',
    notes: 'Configurazione porte SIP 5060, WSS 8089 e RTP UDP 10000-20000',
    isFavorite: false
  }
];

export const initialClusterNodes: ClusterNode[] = [
  {
    id: 'node-01',
    name: 'pbx-master-01.local',
    role: 'primary',
    ip: '192.168.10.101',
    status: 'active',
    vipAssigned: true,
    asteriskVersion: 'Asterisk 20.6.0-LTS (certbot SSL)',
    activeChannels: 14,
    sipPeersRegistered: 48,
    cpuUsage: 28,
    ramUsage: 42,
    galeraStatus: 'Synced',
    replicationLagMs: 1.2,
    pingLatencyMs: 0.8,
    uptime: '42 giorni, 18 ore'
  },
  {
    id: 'node-02',
    name: 'pbx-standby-02.local',
    role: 'secondary',
    ip: '192.168.10.102',
    status: 'standby',
    vipAssigned: false,
    asteriskVersion: 'Asterisk 20.6.0-LTS (hot-standby)',
    activeChannels: 0,
    sipPeersRegistered: 48,
    cpuUsage: 9,
    ramUsage: 36,
    galeraStatus: 'Synced',
    replicationLagMs: 1.4,
    pingLatencyMs: 0.9,
    uptime: '42 giorni, 18 ore'
  },
  {
    id: 'node-03',
    name: 'rtp-edge-webrtc-01.local',
    role: 'media_gateway',
    ip: '192.168.10.103',
    status: 'active',
    vipAssigned: false,
    asteriskVersion: 'Kamailio 5.7 + Coturn WebRTC STUN/TURN',
    activeChannels: 24,
    sipPeersRegistered: 120,
    cpuUsage: 19,
    ramUsage: 27,
    galeraStatus: 'Synced',
    replicationLagMs: 0.0,
    pingLatencyMs: 1.1,
    uptime: '68 giorni, 04 ore'
  }
];

export const initialPushLogs: PushLog[] = [
  {
    id: 'plog-1',
    timestamp: '2026-09-04 10:42:15',
    deviceType: 'ios',
    recipient: 'Marco Rossi (Ext 101 - iPhone 15 Pro)',
    caller: '+39 348 1234567',
    status: 'delivered',
    latencyMs: 142,
    payloadJson: '{"aps":{"alert":{"title":"Chiamata VoIP in arrivo","body":"+39 348 1234567"},"badge":1,"sound":"ringtone.caf","content-available":1},"call_uuid":"uuid-4902-ff","sip_caller_id":"101"}'
  },
  {
    id: 'plog-2',
    timestamp: '2026-09-04 10:15:30',
    deviceType: 'android',
    recipient: 'Sara Bianchi (Ext 102 - Samsung Galaxy S24)',
    caller: 'Commerciale Esterno <+390234567890>',
    status: 'delivered',
    latencyMs: 98,
    payloadJson: '{"priority":"high","data":{"action":"INCOMING_CALL","caller_number":"+390234567890","caller_name":"Commerciale Esterno","uuid":"call-8812","channel":"webrtc"}}'
  },
  {
    id: 'plog-3',
    timestamp: '2026-09-04 09:50:11',
    deviceType: 'android',
    recipient: 'Alessandro Verdi (Ext 103 - Google Pixel 8)',
    caller: 'Helpdesk Queue <600>',
    status: 'delivered',
    latencyMs: 115,
    payloadJson: '{"priority":"high","data":{"action":"INCOMING_CALL","caller_number":"600","caller_name":"Helpdesk Queue","uuid":"call-9912"}}'
  }
];

export const initialVoicemailMessages: VoicemailMessage[] = [
  {
    id: 'vm-001',
    mailbox: '101',
    callerNumber: '+39 348 9876543',
    callerName: 'Ing. Brambilla (Milano)',
    timestamp: '2026-09-04 11:15',
    durationSeconds: 38,
    isNew: true,
    reason: 'busy',
    transcription: 'Buongiorno Marco, sono l\'ingegner Brambilla. Ti ho cercato sul fisso ma eri occupato in altra conversazione. Ti contatto per approvare il preventivo del cluster PBX Rocky Linux, per favore richiamami appena puoi al 348 9876543.',
    fileSize: '608 KB'
  },
  {
    id: 'vm-002',
    mailbox: '101',
    callerNumber: '+39 02 87654321',
    callerName: 'Studio Tecnico Alpha',
    timestamp: '2026-09-04 09:30',
    durationSeconds: 24,
    isNew: true,
    reason: 'no_answer',
    transcription: 'Salve, abbiamo provato a contattarvi sul centralino per l\'aggiornamento dei trunk SIP e certificati TLS. Lasciamo questo messaggio in segreteria. A presto.',
    fileSize: '384 KB'
  },
  {
    id: 'vm-003',
    mailbox: 'general',
    callerNumber: '+39 06 44332211',
    callerName: 'Consulenze Aziendali Roma',
    timestamp: '2026-09-03 20:45',
    durationSeconds: 42,
    isNew: false,
    reason: 'out_of_hours',
    transcription: 'Buonasera, abbiamo chiamato fuori orario d\'ufficio dal menu notturno. Volevamo fissare un appuntamento per l\'audit telefonico. Vi ricontatteremo domani mattina all\'apertura dalle 08:30. Grazie e buona serata.',
    fileSize: '672 KB'
  },
  {
    id: 'vm-004',
    mailbox: '102',
    callerNumber: '+39 335 1234890',
    callerName: 'Mario Fontana (Cliente)',
    timestamp: '2026-09-04 10:05',
    durationSeconds: 19,
    isNew: true,
    reason: 'no_answer',
    transcription: 'Ciao Sara, sono Mario Fontana. Ti ho cercata per il rinnovo delle licenze dei telefoni IP. Mi puoi ricontattare sul cellulare appena rientri alla scrivania?',
    fileSize: '304 KB'
  }
];

export const initialBusinessHoursConfig: BusinessHoursConfig = {
  id: 'bh-company',
  name: 'Orario Aziendale Principale (Sede Italia)',
  timezone: 'Europe/Rome (UTC+2)',
  schedule: [
    { day: 'mon', label: 'Lunedì', enabled: true, morningStart: '08:30', morningEnd: '12:30', afternoonStart: '14:00', afternoonEnd: '18:30' },
    { day: 'tue', label: 'Martedì', enabled: true, morningStart: '08:30', morningEnd: '12:30', afternoonStart: '14:00', afternoonEnd: '18:30' },
    { day: 'wed', label: 'Mercoledì', enabled: true, morningStart: '08:30', morningEnd: '12:30', afternoonStart: '14:00', afternoonEnd: '18:30' },
    { day: 'thu', label: 'Giovedì', enabled: true, morningStart: '08:30', morningEnd: '12:30', afternoonStart: '14:00', afternoonEnd: '18:30' },
    { day: 'fri', label: 'Venerdì', enabled: true, morningStart: '08:30', morningEnd: '12:30', afternoonStart: '14:00', afternoonEnd: '18:00' },
    { day: 'sat', label: 'Sabato', enabled: false, morningStart: '09:00', morningEnd: '12:30', afternoonStart: '00:00', afternoonEnd: '00:00' },
    { day: 'sun', label: 'Domenica', enabled: false, morningStart: '00:00', morningEnd: '00:00', afternoonStart: '00:00', afternoonEnd: '00:00' }
  ],
  holidays: [
    { id: 'h-1', date: '2026-01-01', name: 'Capodanno' },
    { id: 'h-2', date: '2026-01-06', name: 'Epifania' },
    { id: 'h-3', date: '2026-04-06', name: 'Lunedì dell\'Angelo (Pasquetta)' },
    { id: 'h-4', date: '2026-04-25', name: 'Festa della Liberazione' },
    { id: 'h-5', date: '2026-05-01', name: 'Festa dei Lavoratori' },
    { id: 'h-6', date: '2026-06-02', name: 'Festa della Repubblica' },
    { id: 'h-7', date: '2026-08-15', name: 'Ferragosto' },
    { id: 'h-8', date: '2026-11-01', name: 'Ognissanti' },
    { id: 'h-9', date: '2026-12-08', name: 'Immacolata Concezione' },
    { id: 'h-10', date: '2026-12-25', name: 'Santo Natale' },
    { id: 'h-11', date: '2026-12-26', name: 'Santo Stefano' }
  ],
  overrideMode: 'auto',
  inHoursDestination: {
    type: 'ivr',
    id: 'ivr-1',
    name: 'IVR Principale Diurno (Accoglienza)'
  },
  outOfHoursDestination: {
    type: 'ivr',
    id: 'ivr-fuori-orario',
    name: 'IVR Fuori Orario / Chiusura Uffici'
  },
  outOfHoursIvr: {
    id: 'ivr-fuori-orario',
    name: 'IVR Fuori Orario & Chiusura Aziendale',
    greetingPrompt: 'prompt_uffici_chiusi.wav',
    timeout: 10,
    invalidRetries: 3,
    options: [
      {
        digit: '1',
        destinationType: 'ring_group',
        destinationId: 'rg-1',
        description: 'Reperibilità Tecnica H24 (Emergenze Server & Rete)'
      },
      {
        digit: '2',
        destinationType: 'voicemail',
        destinationId: 'general',
        description: 'Lascia un Messaggio nella Segreteria Generale'
      },
      {
        digit: '3',
        destinationType: 'hangup',
        destinationId: 'hangup',
        description: 'Ascolta Orari Apertura & Indirizzo Sede'
      }
    ]
  }
};

export const initialCallQueues: CallQueue[] = [
  {
    id: 'queue-700',
    number: '700',
    name: 'Coda Supporto Tecnico & Helpdesk',
    description: 'Smistamento ticket di assistenza e richieste supporto N1/N2.',
    strategy: 'leastrecent',
    priority: 'medium',
    maxWaitTime: 300, // 5 minuti di attesa massima
    memberTimeout: 20, // squillo per operatore
    retryTimeout: 5,
    wrapUpTime: 15, // pausa post-chiamata
    musicOnHold: 'ambient',
    announcePosition: true,
    announceHoldTime: true,
    maxCallers: 15,
    members: ['103', '105'],
    timeoutDestination: {
      type: 'voicemail',
      id: 'ext-105',
      label: 'Segreteria Helpdesk Tecnico (105)'
    },
    waitingCalls: 2,
    activeCalls: 1,
    completedCalls: 84,
    abandonedCalls: 3,
    avgWaitTimeSeconds: 42,
    serviceLevelPercentage: 96
  },
  {
    id: 'queue-701',
    number: '701',
    name: 'Coda Commerciale & Vendite Italia',
    description: 'Distribuzione bilanciata contatti inbound e lead da sito web.',
    strategy: 'roundrobin',
    priority: 'low',
    maxWaitTime: 180, // 3 minuti di attesa massima
    memberTimeout: 15,
    retryTimeout: 4,
    wrapUpTime: 10,
    musicOnHold: 'jazz',
    announcePosition: true,
    announceHoldTime: false,
    maxCallers: 20,
    members: ['101', '102'],
    timeoutDestination: {
      type: 'extension',
      id: 'ext-102',
      label: 'Interno 102 (Sara Bianchi)'
    },
    waitingCalls: 1,
    activeCalls: 2,
    completedCalls: 120,
    abandonedCalls: 2,
    avgWaitTimeSeconds: 26,
    serviceLevelPercentage: 98
  },
  {
    id: 'queue-702',
    number: '702',
    name: 'Coda Reperibilità & Clienti VIP',
    description: 'Squillo simultaneo immediato per emergenze e account contrattualizzati.',
    strategy: 'ringall',
    priority: 'high',
    maxWaitTime: 90, // 1.5 minuti
    memberTimeout: 25,
    retryTimeout: 3,
    wrapUpTime: 5,
    musicOnHold: 'classic',
    announcePosition: false,
    announceHoldTime: false,
    maxCallers: 8,
    members: ['101', '103', '104'],
    timeoutDestination: {
      type: 'voicemail',
      id: 'general',
      label: 'Segreteria Generale Aziendale'
    },
    waitingCalls: 0,
    activeCalls: 1,
    completedCalls: 35,
    abandonedCalls: 0,
    avgWaitTimeSeconds: 8,
    serviceLevelPercentage: 100
  }
];

export const MOCK_EXTENSIONS = initialExtensions;
export const MOCK_INBOUND_ROUTES = initialInboundRoutes;
export const MOCK_OUTBOUND_ROUTES = initialOutboundRoutes;
export const MOCK_IVR_MENUS = initialIVRMenus;
export const MOCK_RING_GROUPS = initialRingGroups;
export const MOCK_CDR_RECORDS = initialCDRRecords;
export const MOCK_CONTACTS = initialContacts;
export const MOCK_CLUSTER_NODES = initialClusterNodes;
export const MOCK_PUSH_LOGS = initialPushLogs;
export const MOCK_VOICEMAILS = initialVoicemailMessages;
export const MOCK_BUSINESS_HOURS = initialBusinessHoursConfig;
export const MOCK_CALL_QUEUES = initialCallQueues;

