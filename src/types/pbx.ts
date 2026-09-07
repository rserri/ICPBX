export type ExtensionStatus = 'online' | 'offline' | 'busy' | 'ringing' | 'dnd';

export interface CallForwardSettings {
  always: {
    enabled: boolean;
    destinationType: 'extension' | 'external' | 'voicemail';
    target: string;
  };
  onBusy: {
    enabled: boolean;
    destinationType: 'extension' | 'voicemail';
    target: string;
  };
  onNoAnswer: {
    enabled: boolean;
    ringTimeSeconds: number;
    destinationType: 'extension' | 'voicemail';
    target: string;
  };
}

export interface Extension {
  id: string;
  number: string;
  name: string;
  email: string;
  department: string;
  secret: string;
  webrtcEnabled: boolean;
  codecs: string[];
  voicemailEnabled: boolean;
  voicemailPin: string;
  callerId: string;
  status: ExtensionStatus;
  mobilePushEnabled: boolean;
  pushDeviceType?: 'ios' | 'android';
  pushToken?: string;
  context: string;
  maxContacts: number;
  callWaitingEnabled?: boolean;
  forwardSettings?: CallForwardSettings;
}

export interface VoicemailMessage {
  id: string;
  mailbox: string; // Extension number or 'general'
  callerNumber: string;
  callerName: string;
  timestamp: string;
  durationSeconds: number;
  isNew: boolean;
  reason: 'no_answer' | 'busy' | 'out_of_hours' | 'direct';
  transcription: string;
  audioBlobUrl?: string;
  fileSize: string;
}

export interface DaySchedule {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  label: string;
  enabled: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
}

export interface HolidayItem {
  id: string;
  date: string;
  name: string;
}

export interface BusinessHoursConfig {
  id: string;
  name: string;
  timezone: string;
  schedule: DaySchedule[];
  holidays: HolidayItem[];
  overrideMode: 'auto' | 'force_open' | 'force_closed';
  inHoursDestination: {
    type: 'ivr' | 'ring_group' | 'extension';
    id: string;
    name: string;
  };
  outOfHoursDestination: {
    type: 'ivr' | 'voicemail' | 'announcement' | 'extension';
    id: string;
    name: string;
  };
  outOfHoursIvr: IVRMenu;
}

export interface InboundRoute {
  id: string;
  name: string;
  didNumber: string;
  destinationType: 'extension' | 'ring_group' | 'ivr' | 'voicemail';
  destinationId: string;
  timeCondition?: string;
  description: string;
  cidPrefix?: string;
}

export interface OutboundRoute {
  id: string;
  name: string;
  dialPattern: string; // e.g. "0/." or "3/."
  trunk: string;
  stripDigits: number;
  prependDigits: string;
  failoverTrunk?: string;
  priority: number;
}

export interface IVROption {
  digit: string;
  destinationType: 'extension' | 'ring_group' | 'ivr' | 'voicemail' | 'hangup';
  destinationId: string;
  description: string;
}

export interface IVRMenu {
  id: string;
  name: string;
  greetingPrompt: string;
  timeout: number;
  invalidRetries: number;
  options: IVROption[];
}

export interface RingGroup {
  id: string;
  number: string;
  name: string;
  strategy: 'ringall' | 'hunt' | 'memoryhunt';
  ringTime: number;
  members: string[]; // extension numbers
  destinationOnNoAnswer: {
    type: 'extension' | 'voicemail' | 'ivr' | 'hangup';
    id: string;
  };
}

export type CallDisposition = 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED';

export interface CDRRecord {
  id: string;
  callDate: string;
  clid: string;
  src: string;
  dst: string;
  dcontext: string;
  channel: string;
  dstchannel: string;
  lastapp: string;
  duration: number; // total seconds
  billsec: number; // billed seconds
  disposition: CallDisposition;
  hasRecording: boolean;
  recordingFile?: string;
  mosScore: number; // Mean Opinion Score 1-5
  codec: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  department: string;
  email: string;
  phone: string;
  mobile: string;
  extension?: string;
  notes?: string;
  isFavorite: boolean;
}

export interface ClusterNode {
  id: string;
  name: string;
  role: 'primary' | 'secondary' | 'media_gateway';
  ip: string;
  status: 'active' | 'standby' | 'syncing' | 'offline';
  vipAssigned: boolean;
  asteriskVersion: string;
  activeChannels: number;
  sipPeersRegistered: number;
  cpuUsage: number;
  ramUsage: number;
  galeraStatus: 'Synced' | 'Donor' | 'Joining' | 'Disconnected';
  replicationLagMs: number;
  pingLatencyMs: number;
  uptime: string;
}

export interface PushNotificationPayload {
  deviceType: 'ios' | 'android';
  targetToken: string;
  callerNumber: string;
  callerName: string;
  callUuid: string;
  sipAccount: string;
  timestamp: number;
}

export interface PushLog {
  id: string;
  timestamp: string;
  deviceType: 'ios' | 'android';
  recipient: string;
  caller: string;
  status: 'sent' | 'delivered' | 'failed';
  latencyMs: number;
  payloadJson: string;
}

export type DashboardTheme = 'dark' | 'light' | 'high-contrast';

export type QueueStrategy = 'ringall' | 'roundrobin' | 'leastrecent' | 'fewestcalls' | 'random' | 'rrmemory';

export type QueuePriority = 'high' | 'medium' | 'low';

export interface CallQueue {
  id: string;
  number: string;
  name: string;
  description?: string;
  strategy: QueueStrategy;
  priority?: QueuePriority; // 'high' | 'medium' | 'low' - Influences Asterisk weight and inbound routing priority
  maxWaitTime: number; // in seconds (e.g. 180, 300, 600, or 0 for unlimited)
  memberTimeout: number; // seconds each agent rings (e.g. 15)
  retryTimeout: number; // seconds before trying again (e.g. 5)
  wrapUpTime: number; // seconds after a call before agent receives another (e.g. 15)
  musicOnHold: string; // 'default' | 'ambient' | 'jazz' | 'classic'
  announcePosition: boolean;
  announceHoldTime: boolean;
  maxCallers: number; // 0 = unlimited
  members: string[]; // extension numbers assigned to queue (e.g. ['101', '103'])
  timeoutDestination: {
    type: 'extension' | 'voicemail' | 'ivr' | 'hangup';
    id: string;
    label?: string;
  };
  waitingCalls?: number;
  activeCalls?: number;
  completedCalls?: number;
  abandonedCalls?: number;
  avgWaitTimeSeconds?: number;
  serviceLevelPercentage?: number;
}

export type AgentQueueStatus = 'ready' | 'busy' | 'paused' | 'offline';

export interface QueueAgentLiveState {
  extensionNumber: string;
  name: string;
  department: string;
  queueNumber: string;
  queueName: string;
  status: AgentQueueStatus; // ready | busy | paused | offline
  currentTalkTimeSeconds?: number;
  callStartTime?: number;
  callerNumber?: string;
  callerName?: string;
  callsAnsweredToday: number;
  lastCallTimestamp?: string;
  idleSinceSeconds?: number;
  pausedReason?: string;
}

export interface QueueWaitingCaller {
  id: string;
  queueId: string;
  queueNumber: string;
  queueName: string;
  callerNumber: string;
  callerName: string;
  position: number;
  enteredAt: number;
  currentWaitSeconds: number;
  maxWaitTime: number;
  hasAlerted?: boolean;
  priority?: QueuePriority;
}

export interface QueueWaitTimeAlert {
  id: string;
  callerId: string;
  queueId: string;
  queueNumber: string;
  queueName: string;
  callerNumber: string;
  callerName: string;
  currentWaitSeconds: number;
  maxWaitTime: number;
  exceededBySeconds: number;
  priority?: QueuePriority;
  timeoutDestination?: {
    type: 'extension' | 'voicemail' | 'ivr' | 'hangup';
    id: string;
    label?: string;
  };
  status: 'active' | 'dismissed' | 'forwarded' | 'answered';
  timestamp: number;
}
