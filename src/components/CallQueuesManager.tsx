import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Plus,
  Trash2,
  Edit2,
  Users,
  Clock,
  RotateCcw,
  Volume2,
  Check,
  PhoneCall,
  Search,
  Code,
  Copy,
  ChevronRight,
  Shield,
  PhoneIncoming,
  AlertCircle,
  Timer,
  Play,
  ArrowRight,
  CheckCircle2,
  X,
  BarChart3,
  Radio,
  AlertTriangle,
  BellRing,
  PhoneForwarded,
  UserCheck,
  ShieldAlert,
  Flame,
  ArrowDownRight,
  ArrowUpRight,
  Zap
} from 'lucide-react';
import {
  CallQueue,
  QueueStrategy,
  QueuePriority,
  Extension,
  QueueWaitingCaller,
  QueueWaitTimeAlert
} from '../types/pbx';
import { QueueMetricsVisualizer } from './QueueMetricsVisualizer';
import { QueueAgentMonitor } from './QueueAgentMonitor';
import { QueueWaitTimeToastSystem } from './QueueWaitTimeToastSystem';

interface CallQueuesManagerProps {
  queues: CallQueue[];
  extensions: Extension[];
  onAddQueue: (queue: CallQueue) => void;
  onUpdateQueue: (queue: CallQueue) => void;
  onDeleteQueue: (id: string) => void;
  onDialNumber: (number: string) => void;
}

export const CallQueuesManager: React.FC<CallQueuesManagerProps> = ({
  queues,
  extensions,
  onAddQueue,
  onUpdateQueue,
  onDeleteQueue,
  onDialNumber
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [showAgentMonitor, setShowAgentMonitor] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  // Active waiting callers in queues with real-time tracking
  const [waitingCallers, setWaitingCallers] = useState<QueueWaitingCaller[]>(() => [
    {
      id: 'wait-caller-1',
      queueId: '1',
      queueNumber: '700',
      queueName: 'Supporto Tecnico Helpdesk',
      callerNumber: '+39 02 8712 3456',
      callerName: 'Studio Legale Rossi & Partners',
      position: 1,
      enteredAt: Date.now() - 292 * 1000,
      currentWaitSeconds: 292,
      maxWaitTime: 300,
      priority: 'medium',
      hasAlerted: false
    }
  ]);

  // Queue Max Wait Time SLA alerts
  const [waitTimeAlerts, setWaitTimeAlerts] = useState<QueueWaitTimeAlert[]>([]);

  // Form state
  const [formData, setFormData] = useState<{
    number: string;
    name: string;
    description: string;
    strategy: QueueStrategy;
    priority: QueuePriority;
    maxWaitTime: number;
    memberTimeout: number;
    retryTimeout: number;
    wrapUpTime: number;
    musicOnHold: string;
    announcePosition: boolean;
    announceHoldTime: boolean;
    maxCallers: number;
    members: string[];
    timeoutDestType: 'extension' | 'voicemail' | 'ivr' | 'hangup';
    timeoutDestId: string;
  }>({
    number: '703',
    name: '',
    description: '',
    strategy: 'leastrecent',
    priority: 'medium',
    maxWaitTime: 300,
    memberTimeout: 20,
    retryTimeout: 5,
    wrapUpTime: 15,
    musicOnHold: 'ambient',
    announcePosition: true,
    announceHoldTime: true,
    maxCallers: 15,
    members: [],
    timeoutDestType: 'voicemail',
    timeoutDestId: 'general'
  });

  const handleOpenCreate = () => {
    // Generate next free queue number starting at 700
    const existingNumbers = queues.map((q) => parseInt(q.number, 10)).filter((n) => !isNaN(n));
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 700;

    setEditingQueueId(null);
    setFormData({
      number: String(nextNumber),
      name: '',
      description: '',
      strategy: 'leastrecent',
      priority: 'medium',
      maxWaitTime: 300,
      memberTimeout: 20,
      retryTimeout: 5,
      wrapUpTime: 15,
      musicOnHold: 'ambient',
      announcePosition: true,
      announceHoldTime: true,
      maxCallers: 15,
      members: extensions.slice(0, 2).map((e) => e.number),
      timeoutDestType: 'voicemail',
      timeoutDestId: 'general'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (queue: CallQueue) => {
    setEditingQueueId(queue.id);
    setFormData({
      number: queue.number,
      name: queue.name,
      description: queue.description || '',
      strategy: queue.strategy,
      priority: queue.priority || 'medium',
      maxWaitTime: queue.maxWaitTime,
      memberTimeout: queue.memberTimeout,
      retryTimeout: queue.retryTimeout,
      wrapUpTime: queue.wrapUpTime,
      musicOnHold: queue.musicOnHold || 'ambient',
      announcePosition: queue.announcePosition,
      announceHoldTime: queue.announceHoldTime,
      maxCallers: queue.maxCallers || 15,
      members: [...queue.members],
      timeoutDestType: queue.timeoutDestination.type,
      timeoutDestId: queue.timeoutDestination.id
    });
    setIsModalOpen(true);
  };

  const handleToggleMember = (extNumber: string) => {
    setFormData((prev) => {
      const exists = prev.members.includes(extNumber);
      return {
        ...prev,
        members: exists
          ? prev.members.filter((num) => num !== extNumber)
          : [...prev.members, extNumber]
      };
    });
  };

  const handleSelectAllMembers = () => {
    setFormData((prev) => ({
      ...prev,
      members: extensions.map((e) => e.number)
    }));
  };

  const handleDeselectAllMembers = () => {
    setFormData((prev) => ({
      ...prev,
      members: []
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.number.trim()) {
      alert('Specificare un nome e un numero per la coda di chiamata.');
      return;
    }

    if (formData.members.length === 0) {
      alert('Assegnare almeno un interno come membro operatore della coda.');
      return;
    }

    const queueData: CallQueue = {
      id: editingQueueId || `queue-${formData.number}-${Date.now()}`,
      number: formData.number.trim(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      strategy: formData.strategy,
      priority: formData.priority,
      maxWaitTime: Number(formData.maxWaitTime),
      memberTimeout: Number(formData.memberTimeout),
      retryTimeout: Number(formData.retryTimeout),
      wrapUpTime: Number(formData.wrapUpTime),
      musicOnHold: formData.musicOnHold,
      announcePosition: formData.announcePosition,
      announceHoldTime: formData.announceHoldTime,
      maxCallers: Number(formData.maxCallers),
      members: formData.members,
      timeoutDestination: {
        type: formData.timeoutDestType,
        id: formData.timeoutDestId,
        label:
          formData.timeoutDestType === 'voicemail'
            ? `Segreteria (${formData.timeoutDestId})`
            : formData.timeoutDestType === 'extension'
            ? `Interno ${formData.timeoutDestId}`
            : formData.timeoutDestType === 'ivr'
            ? 'Menu IVR Principale'
            : 'Riaggancio'
      },
      waitingCalls: editingQueueId
        ? queues.find((q) => q.id === editingQueueId)?.waitingCalls || 0
        : 0,
      activeCalls: editingQueueId
        ? queues.find((q) => q.id === editingQueueId)?.activeCalls || 0
        : 0,
      completedCalls: editingQueueId
        ? queues.find((q) => q.id === editingQueueId)?.completedCalls || 0
        : 0,
      abandonedCalls: editingQueueId
        ? queues.find((q) => q.id === editingQueueId)?.abandonedCalls || 0
        : 0,
      avgWaitTimeSeconds: editingQueueId
        ? queues.find((q) => q.id === editingQueueId)?.avgWaitTimeSeconds || 15
        : 15,
      serviceLevelPercentage: editingQueueId
        ? queues.find((q) => q.id === editingQueueId)?.serviceLevelPercentage || 100
        : 100
    };

    if (editingQueueId) {
      onUpdateQueue(queueData);
    } else {
      onAddQueue(queueData);
    }

    setIsModalOpen(false);
  };

  // REAL-TIME WAIT TIME & SLA BREACH MONITORING ENGINE
  // Updates current wait time for all waiting callers every 1000ms
  // Automatically alerts if a caller's wait time exceeds queue.maxWaitTime!
  useEffect(() => {
    const timer = setInterval(() => {
      setWaitingCallers((prevCallers) => {
        const updated = prevCallers.map((caller) => {
          const newWait = caller.currentWaitSeconds + 1;
          return {
            ...caller,
            currentWaitSeconds: newWait
          };
        });

        // Scan for callers that exceed maxWaitTime
        updated.forEach((caller) => {
          if (caller.currentWaitSeconds > caller.maxWaitTime) {
            const targetQueue = queues.find(
              (q) => q.number === caller.queueNumber || q.id === caller.queueId
            );
            const exceededSec = caller.currentWaitSeconds - caller.maxWaitTime;

            setWaitTimeAlerts((prevAlerts) => {
              const existingAlert = prevAlerts.find((a) => a.callerId === caller.id);

              if (existingAlert) {
                // If already active, keep wait time and exceeded seconds updated in real time!
                if (existingAlert.status === 'active') {
                  return prevAlerts.map((a) =>
                    a.id === existingAlert.id
                      ? {
                          ...a,
                          currentWaitSeconds: caller.currentWaitSeconds,
                          exceededBySeconds: exceededSec
                        }
                      : a
                  );
                }
                return prevAlerts;
              }

              // Fire brand-new SLA alert!
              const newAlert: QueueWaitTimeAlert = {
                id: `sla-alert-${caller.id}-${Date.now()}`,
                callerId: caller.id,
                queueId: caller.queueId,
                queueNumber: caller.queueNumber,
                queueName: caller.queueName,
                callerNumber: caller.callerNumber,
                callerName: caller.callerName,
                currentWaitSeconds: caller.currentWaitSeconds,
                maxWaitTime: caller.maxWaitTime,
                exceededBySeconds: exceededSec,
                timeoutDestination: targetQueue?.timeoutDestination,
                status: 'active',
                timestamp: Date.now()
              };

              return [newAlert, ...prevAlerts];
            });
          }
        });

        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [queues]);

  // Dismiss a single toast alert
  const handleDismissAlert = (alertId: string) => {
    setWaitTimeAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'dismissed' } : a))
    );
  };

  // Force forward caller to the queue's configured timeout destination (Voicemail, IVR, Extension)
  const handleForwardTimeout = (alert: QueueWaitTimeAlert) => {
    // Mark alert as forwarded
    setWaitTimeAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, status: 'forwarded' } : a))
    );

    // Remove from waiting callers
    setWaitingCallers((prev) => prev.filter((c) => c.id !== alert.callerId));

    // Decrement queue's waiting calls
    const targetQueue = queues.find(
      (q) => q.number === alert.queueNumber || q.id === alert.queueId
    );
    if (targetQueue) {
      onUpdateQueue({
        ...targetQueue,
        waitingCalls: Math.max(0, (targetQueue.waitingCalls || 1) - 1)
      });
    }

    const destLabel =
      alert.timeoutDestination?.label ||
      (alert.timeoutDestination?.type === 'voicemail'
        ? 'Segreteria Telefonica'
        : alert.timeoutDestination?.type === 'extension'
        ? `Interno ${alert.timeoutDestination.id}`
        : alert.timeoutDestination?.type === 'ivr'
        ? 'Menu IVR Fallback'
        : 'Chiusura Chiamata');

    setSimulationStatus(
      `Inoltro di Timeout Eseguito: Chiamata di ${alert.callerName} (${alert.callerNumber}) trasferita con successo a "${destLabel}".`
    );
    setTimeout(() => setSimulationStatus(null), 5000);
  };

  // Assign to available agent immediately
  const handleAssignToFreeAgent = (alert: QueueWaitTimeAlert) => {
    setWaitTimeAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, status: 'answered' } : a))
    );

    setWaitingCallers((prev) => prev.filter((c) => c.id !== alert.callerId));

    const targetQueue = queues.find(
      (q) => q.number === alert.queueNumber || q.id === alert.queueId
    );
    if (targetQueue) {
      onUpdateQueue({
        ...targetQueue,
        waitingCalls: Math.max(0, (targetQueue.waitingCalls || 1) - 1),
        activeCalls: (targetQueue.activeCalls || 0) + 1
      });
    }

    setSimulationStatus(
      `Chiamata di ${alert.callerName} assegnata con priorità assoluta al primo agente disponibile nella Coda ${alert.queueNumber}.`
    );
    setTimeout(() => setSimulationStatus(null), 5000);
  };

  // Clear / Dismiss all active alerts
  const handleClearAllAlerts = () => {
    setWaitTimeAlerts((prev) => prev.map((a) => ({ ...a, status: 'dismissed' })));
  };

  // Forward all active SLA breached calls in batch
  const handleForwardAllTimeouts = () => {
    const active = waitTimeAlerts.filter((a) => a.status === 'active');
    if (active.length === 0) return;

    active.forEach((alert) => {
      const queue = queues.find((q) => q.number === alert.queueNumber || q.id === alert.queueId);
      if (queue) {
        onUpdateQueue({
          ...queue,
          waitingCalls: Math.max(0, (queue.waitingCalls || 1) - 1)
        });
      }
    });

    setWaitTimeAlerts((prev) => prev.map((a) => ({ ...a, status: 'forwarded' })));
    setWaitingCallers([]);
    setSimulationStatus(
      `Inoltro di massa a timeout completato per tutte le ${active.length} chiamate che avevano superato il tempo massimo.`
    );
    setTimeout(() => setSimulationStatus(null), 5000);
  };

  // Simulate an SLA Max Wait Time breach (for Admin verification and testing)
  const handleTriggerSlaWaitBreach = (customQueue?: CallQueue) => {
    const targetQueue =
      customQueue ||
      queues[0] || {
        id: '1',
        number: '700',
        name: 'Supporto Tecnico Helpdesk',
        maxWaitTime: 300,
        timeoutDestination: { type: 'voicemail', id: 'support', label: 'Segreteria Supporto' }
      };

    const testId = `caller-sim-${Date.now()}`;
    const mockCallers = [
      { num: '+39 02 8712 3456', name: 'Studio Legale Rossi & Partners' },
      { num: '+39 06 6982 1100', name: 'Clinica San Raffaele (Uff. Acquisti)' },
      { num: '+39 348 9988112', name: 'Dr.ssa Valeria Conti (VIP Priority)' },
      { num: '+39 011 445566', name: 'Gruppo Logistico Nord-Ovest' }
    ];
    const pickedCaller = mockCallers[Math.floor(Math.random() * mockCallers.length)];

    const maxWait = targetQueue.maxWaitTime > 0 ? targetQueue.maxWaitTime : 180;
    const currentWait = maxWait + 14; // already 14s over the SLA threshold!

    const newWaitingCaller: QueueWaitingCaller = {
      id: testId,
      queueId: targetQueue.id,
      queueNumber: targetQueue.number,
      queueName: targetQueue.name,
      callerNumber: pickedCaller.num,
      callerName: pickedCaller.name,
      position: (targetQueue.waitingCalls || 0) + 1,
      enteredAt: Date.now() - currentWait * 1000,
      currentWaitSeconds: currentWait,
      maxWaitTime: maxWait,
      priority: targetQueue.priority || 'medium',
      hasAlerted: true
    };

    setWaitingCallers((prev) => [...prev, newWaitingCaller]);

    const newAlert: QueueWaitTimeAlert = {
      id: `alert-breach-${testId}`,
      callerId: testId,
      queueId: targetQueue.id,
      queueNumber: targetQueue.number,
      queueName: targetQueue.name,
      callerNumber: pickedCaller.num,
      callerName: pickedCaller.name,
      currentWaitSeconds: currentWait,
      maxWaitTime: maxWait,
      exceededBySeconds: 14,
      priority: targetQueue.priority || 'medium',
      timeoutDestination: targetQueue.timeoutDestination,
      status: 'active',
      timestamp: Date.now()
    };

    setWaitTimeAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)]);

    onUpdateQueue({
      ...targetQueue,
      waitingCalls: (targetQueue.waitingCalls || 0) + 1
    });

    setSimulationStatus(
      `Allarme SLA generato: ${pickedCaller.name} (${pickedCaller.num}) in Coda ${targetQueue.number} [Priorità ${(targetQueue.priority || 'medium').toUpperCase()}] ha superato il Max Wait Time (${currentWait}s / Max ${maxWait}s)!`
    );
    setTimeout(() => setSimulationStatus(null), 5000);
  };

  const handleSimulateQueueCall = (queue: CallQueue) => {
    const nextWaiting = (queue.waitingCalls || 0) + 1;
    onUpdateQueue({
      ...queue,
      waitingCalls: nextWaiting
    });

    const testId = `call-sim-${Date.now()}`;
    const callerNames = [
      { num: '+39 02 9988 1234', name: 'Alpha Finance SpA' },
      { num: '+39 333 4567890', name: 'Marco Ferri' },
      { num: '+39 051 223344', name: 'Consulenze Emiliane' }
    ];
    const picked = callerNames[Math.floor(Math.random() * callerNames.length)];

    // Add as a waiting caller starting at 20s
    setWaitingCallers((prev) => [
      ...prev,
      {
        id: testId,
        queueId: queue.id,
        queueNumber: queue.number,
        queueName: queue.name,
        callerNumber: picked.num,
        callerName: picked.name,
        position: nextWaiting,
        enteredAt: Date.now() - 20000,
        currentWaitSeconds: 20,
        maxWaitTime: queue.maxWaitTime > 0 ? queue.maxWaitTime : 300,
        priority: queue.priority || 'medium',
        hasAlerted: false
      }
    ]);

    const prioLabel = (queue.priority || 'medium').toUpperCase();
    const weightVal = queue.priority === 'high' ? 10 : queue.priority === 'low' ? 1 : 5;
    setSimulationStatus(
      `Chiamata di ${picked.name} accodata in Coda ${queue.number} (${queue.name}) con PRIORITÀ ${prioLabel}! Asterisk weight=${weightVal} (Instradamento Inbound prioritario su operatori condivisi).`
    );
    setTimeout(() => {
      setSimulationStatus(null);
    }, 4500);
  };

  // Filter queues
  const filteredQueues = queues.filter((q) => {
    const matchesSearch =
      q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.number.includes(searchQuery) ||
      (q.description && q.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      q.members.some((m) => m.includes(searchQuery));

    const matchesStrategy = strategyFilter === 'all' || q.strategy === strategyFilter;
    const matchesPriority = priorityFilter === 'all' || (q.priority || 'medium') === priorityFilter;

    return matchesSearch && matchesStrategy && matchesPriority;
  });

  // Calculate high-level summary KPIs
  const totalQueues = queues.length;
  const totalWaiting = queues.reduce((sum, q) => sum + (q.waitingCalls || 0), 0);
  const totalActive = queues.reduce((sum, q) => sum + (q.activeCalls || 0), 0);
  const highPriorityCount = queues.filter((q) => q.priority === 'high').length;
  const mediumPriorityCount = queues.filter((q) => (q.priority || 'medium') === 'medium').length;
  const lowPriorityCount = queues.filter((q) => q.priority === 'low').length;
  const avgSla =
    queues.length > 0
      ? Math.round(
          queues.reduce((sum, q) => sum + (q.serviceLevelPercentage || 95), 0) / queues.length
        )
      : 100;

  // Generate Asterisk queues.conf syntax
  const generateAsteriskQueuesConf = () => {
    return `; ========================================================
; Asterisk Call Queues Configuration (queues.conf)
; Generated automatically by ICPBX PBX Admin
; Strategy choices: ringall, roundrobin, leastrecent
; Priority Weight: High (10), Medium (5), Low (1)
; ========================================================

[general]
persistentmembers = yes
autofill = yes
monitor-type = MixMonitor
shared_lastcall = yes

${queues
  .map((q) => {
    const strategyName = q.strategy;
    const queuePrio = q.priority || 'medium';
    const weightVal = queuePrio === 'high' ? 10 : queuePrio === 'low' ? 1 : 5;
    return `[${q.number}]
fullname = ${q.name}
strategy = ${strategyName}
; Inbound Call Routing Priority (Weight: High=10, Medium=5, Low=1)
; Agents in multiple queues receive calls from higher-priority queues first
weight = ${weightVal}
timeout = ${q.memberTimeout}
retry = ${q.retryTimeout}
wrapuptime = ${q.wrapUpTime}
maxlen = ${q.maxCallers}
musicclass = ${q.musicOnHold || 'default'}
announce-position = ${q.announcePosition ? 'yes' : 'no'}
announce-holdtime = ${q.announceHoldTime ? 'yes' : 'no'}
periodic-announce-frequency = 45
joinempty = no
leavewhenempty = yes
${q.members
  .map((m) => {
    const ext = extensions.find((e) => e.number === m);
    return `member => PJSIP/${m},0,${ext ? ext.name : 'Interno ' + m}`;
  })
  .join('\n')}
`;
  })
  .join('\n')}
; --------------------------------------------------------
; extensions.conf Dialplan Route Example
; --------------------------------------------------------
[internal-queues]
${queues
  .map((q) => {
    const queuePrio = q.priority || 'medium';
    const weightVal = queuePrio === 'high' ? 10 : queuePrio === 'low' ? 1 : 5;
    return `exten => ${q.number},1,NoOp(Entering Call Queue ${q.number} - ${q.name} [Priority: ${queuePrio.toUpperCase()}])
 same => n,Answer()
 ; Set inbound call priority to influence routing before entering queue
 same => n,Set(QUEUE_PRIO=${weightVal})
 same => n,Queue(${q.number},t,,${q.maxWaitTime > 0 ? q.maxWaitTime : ''})
 ; Timeout or abandoned destination:
 ${
   q.timeoutDestination.type === 'voicemail'
     ? `same => n,VoiceMail(${q.timeoutDestination.id || 'general'}@default,u)`
     : q.timeoutDestination.type === 'extension'
     ? `same => n,Dial(PJSIP/${q.timeoutDestination.id},20)`
     : q.timeoutDestination.type === 'ivr'
     ? `same => n,Goto(ivr-principale,s,1)`
     : `same => n,Hangup()`
 }
 same => n,Hangup()`;
  })
  .join('\n\n')}`;
  };

  const copyQueuesConfig = () => {
    navigator.clipboard.writeText(generateAsteriskQueuesConf());
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const activeWaitTimeAlerts = waitTimeAlerts.filter((a) => a.status === 'active');

  return (
    <div className="space-y-6 relative" id="call-queues-dashboard">
      {/* Floating Visual Notification Toast System for Max Wait Time SLA Breaches */}
      <QueueWaitTimeToastSystem
        alerts={waitTimeAlerts}
        onDismissAlert={handleDismissAlert}
        onForwardTimeout={handleForwardTimeout}
        onAssignToFreeAgent={handleAssignToFreeAgent}
        onClearAllAlerts={handleClearAllAlerts}
      />

      {/* Top Header & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Code di Chiamata (Call Queues)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Asterisk app_queue
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Configura e gestisci le code di attesa per la distribuzione automatica delle chiamate (ACD).
              Definisci le strategie di squillo (<strong className="text-slate-300">ringall</strong>, <strong className="text-slate-300">roundrobin</strong>, <strong className="text-slate-300">leastrecent</strong>),
              i tempi massimi di attesa e assegna gli operatori interni.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* SLA Max Wait Time Test Trigger Button */}
          <button
            id="btn-simulate-sla-breach"
            onClick={() => handleTriggerSlaWaitBreach()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Simula un chiamante che supera il Max Wait Time per testare la notifica toast visiva"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Testa Allarme SLA</span>
          </button>

          <button
            id="btn-toggle-agent-monitor"
            onClick={() => setShowAgentMonitor(!showAgentMonitor)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
              showAgentMonitor
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Radio className={`w-4 h-4 ${showAgentMonitor ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{showAgentMonitor ? 'Nascondi Monitor Agenti' : 'Monitor Agenti Live'}</span>
          </button>

          <button
            id="btn-toggle-charts"
            onClick={() => setShowCharts(!showCharts)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
              showCharts
                ? 'bg-sky-600/20 text-sky-300 border-sky-500/40 hover:bg-sky-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <span>{showCharts ? 'Nascondi Grafici' : 'Grafici Analitica'}</span>
          </button>

          <button
            id="btn-view-queues-conf"
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 hover:border-slate-600 transition"
          >
            <Code className="w-4 h-4 text-sky-400" />
            <span>queues.conf</span>
          </button>

          <button
            id="btn-new-queue"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-sky-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuova Coda</span>
          </button>
        </div>
      </div>

      {/* Prominent SLA Wait Time Breach Warning Banner */}
      {activeWaitTimeAlerts.length > 0 && (
        <div
          id="sla-breach-warning-banner"
          className="p-4 sm:p-5 bg-rose-950/70 border-2 border-rose-600/80 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl shadow-rose-950/60 ring-1 ring-rose-500/30 animate-pulse"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm">
                  Allarme SLA Attivo
                </span>
                <span className="text-sm font-bold text-white">
                  {activeWaitTimeAlerts.length}{' '}
                  {activeWaitTimeAlerts.length > 1 ? 'chiamanti hanno' : 'chiamante ha'} superato il
                  tempo massimo di attesa (Max Wait Time)!
                </span>
              </div>
              <p className="text-xs text-rose-200/80 mt-1">
                {activeWaitTimeAlerts
                  .map(
                    (a) =>
                      `Coda ${a.queueNumber}: ${a.callerNumber} (${a.callerName}) • Attesa: ${a.currentWaitSeconds}s (Max: ${a.maxWaitTime}s, +${Math.max(0, a.currentWaitSeconds - a.maxWaitTime)}s oltre la soglia)`
                  )
                  .join(' | ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={handleForwardAllTimeouts}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <PhoneForwarded className="w-4 h-4" />
              <span>Forza Inoltro su Tutte</span>
            </button>
          </div>
        </div>
      )}

      {/* Simulation Feedback Alert if triggered */}
      {simulationStatus && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{simulationStatus}</span>
          </div>
          <button
            onClick={() => setSimulationStatus(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Code Attive</span>
            <Headphones className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalQueues}</div>
          <div className="text-[11px] text-slate-500 mt-1">Code PBX registrate</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Chiamanti in Attesa</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{totalWaiting}</div>
          <div className="text-[11px] text-slate-500 mt-1">In ascolto della musica</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Conversazioni in Corso</span>
            <PhoneIncoming className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{totalActive}</div>
          <div className="text-[11px] text-slate-500 mt-1">Con operatori assegnati</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Livello di Servizio (SLA)</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{avgSla}%</div>
          <div className="text-[11px] text-slate-500 mt-1">Risposte entro il timeout</div>
        </div>
      </div>

      {/* Real-time Agent Status & Talk Time Monitor */}
      {showAgentMonitor && (
        <QueueAgentMonitor
          queues={queues}
          extensions={extensions}
          onDialNumber={onDialNumber}
        />
      )}

      {/* Real-time Call Volume & Hold Time Visualization (Recharts) */}
      {showCharts && (
        <QueueMetricsVisualizer queues={queues} />
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome coda, numero interno (es. 700) o membro..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Strategy Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-slate-400 mr-1 hidden md:inline">Strategia:</span>
          {[
            { id: 'all', label: 'Tutte' },
            { id: 'ringall', label: 'Ringall' },
            { id: 'roundrobin', label: 'Roundrobin' },
            { id: 'leastrecent', label: 'Leastrecent' }
          ].map((strat) => (
            <button
              key={strat.id}
              onClick={() => setStrategyFilter(strat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                strategyFilter === strat.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {strat.label}
            </button>
          ))}
        </div>

        {/* Priority Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-[11px] text-slate-400 mr-1 hidden lg:inline">Priorità:</span>
          {[
            { id: 'all', label: 'Tutte', dot: null },
            { id: 'high', label: 'Alta (High)', dot: 'bg-rose-500' },
            { id: 'medium', label: 'Media (Med)', dot: 'bg-amber-500' },
            { id: 'low', label: 'Bassa (Low)', dot: 'bg-slate-400' }
          ].map((prio) => (
            <button
              key={prio.id}
              onClick={() => setPriorityFilter(prio.id as any)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                priorityFilter === prio.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {prio.dot && <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />}
              <span>{prio.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Queues List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredQueues.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
            <Headphones className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Nessuna coda di chiamata trovata</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Nessuna coda corrisponde ai criteri di ricerca impostati oppure non è ancora stata creata nessuna coda.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              <span>Crea la prima Coda</span>
            </button>
          </div>
        ) : (
          filteredQueues.map((queue) => {
            const strategyColor =
              queue.strategy === 'ringall'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                : queue.strategy === 'roundrobin'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

            const strategyLabel =
              queue.strategy === 'ringall'
                ? 'Squillo Simultaneo (ringall)'
                : queue.strategy === 'roundrobin'
                ? 'A Rotazione (roundrobin)'
                : queue.strategy === 'leastrecent'
                ? 'Meno Recente (leastrecent)'
                : queue.strategy;

            const thisQueueAlerts = activeWaitTimeAlerts.filter(
              (a) => a.queueNumber === queue.number || a.queueId === queue.id
            );
            const hasSlaBreach = thisQueueAlerts.length > 0;

            return (
              <div
                key={queue.id}
                className={`bg-slate-900 border rounded-3xl p-5 shadow-sm space-y-4 transition flex flex-col justify-between ${
                  hasSlaBreach
                    ? 'border-rose-500/80 ring-2 ring-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-900'
                    : 'border-slate-800 hover:border-slate-700/80'
                }`}
              >
                {/* Header card info */}
                <div className="space-y-3">
                  {/* SLA Breach Urgent Alert Banner on Queue Card */}
                  {hasSlaBreach && (
                    <div className="p-3 bg-rose-950/80 border border-rose-600/80 rounded-2xl flex items-center justify-between text-xs text-rose-200 animate-pulse">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <div>
                          <span className="font-bold text-rose-100">
                            Max Wait Time Superato!
                          </span>
                          <span className="text-[11px] text-rose-300 ml-1.5 font-mono">
                            ({thisQueueAlerts[0].currentWaitSeconds}s / Max {queue.maxWaitTime}s)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleForwardTimeout(thisQueueAlerts[0])}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer"
                      >
                        Inoltra Timeout
                      </button>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => onDialNumber(queue.number)}
                        title="Chiama questa coda con il Softphone"
                        className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/30 hover:border-sky-400 flex items-center justify-center text-sky-400 font-mono font-bold text-sm shrink-0 cursor-pointer shadow-sm group"
                      >
                        <span className="group-hover:hidden">{queue.number}</span>
                        <PhoneCall className="w-4 h-4 hidden group-hover:block text-sky-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white tracking-tight">
                            {queue.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {queue.description || 'Nessuna descrizione impostata.'}
                        </p>
                      </div>
                    </div>

                    {/* Quick action icons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onDialNumber(queue.number)}
                        title="Testa chiamata verso questa coda"
                        className="p-2 bg-slate-800/80 hover:bg-sky-600/20 text-slate-400 hover:text-sky-400 rounded-xl transition"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(queue)}
                        title="Modifica coda"
                        className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Eliminare la coda ${queue.name} (${queue.number})?`)) {
                            onDeleteQueue(queue.id);
                          }
                        }}
                        title="Elimina coda"
                        className="p-2 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Priority Badge */}
                    {queue.priority === 'high' ? (
                      <span
                        className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-rose-500/15 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-sm"
                        title="Priorità Alta: Peso Asterisk weight=10. Precedenza assoluta per instradamento chiamate in ingresso su agenti condivisi."
                      >
                        <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                        <span>Priorità Alta (Weight 10)</span>
                      </span>
                    ) : queue.priority === 'low' ? (
                      <span
                        className="px-2.5 py-1 rounded-lg font-medium text-[11px] bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5"
                        title="Priorità Bassa: Peso Asterisk weight=1. Servita quando le code ad alta priorità sono smaltite."
                      >
                        <ArrowDownRight className="w-3.5 h-3.5 text-slate-400" />
                        <span>Priorità Bassa (Weight 1)</span>
                      </span>
                    ) : (
                      <span
                        className="px-2.5 py-1 rounded-lg font-medium text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5"
                        title="Priorità Media: Peso Asterisk weight=5. Distribuzione standard bilanciata."
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                        <span>Priorità Media (Weight 5)</span>
                      </span>
                    )}

                    <span
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] border flex items-center gap-1.5 ${strategyColor}`}
                    >
                      {queue.strategy === 'ringall' ? (
                        <Users className="w-3.5 h-3.5" />
                      ) : queue.strategy === 'roundrobin' ? (
                        <RotateCcw className="w-3.5 h-3.5" />
                      ) : (
                        <Timer className="w-3.5 h-3.5" />
                      )}
                      <span>{strategyLabel}</span>
                    </span>

                    <span className="px-2.5 py-1 rounded-lg font-medium text-[11px] bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>
                        Max Attesa:{' '}
                        <strong className="text-white">
                          {queue.maxWaitTime > 0
                            ? `${queue.maxWaitTime}s (${Math.round(queue.maxWaitTime / 60)}m)`
                            : 'Illimitata'}
                        </strong>
                      </span>
                    </span>

                    <span className="px-2 py-1 rounded-lg text-[10px] bg-slate-950 text-slate-400 border border-slate-800 flex items-center gap-1">
                      <Volume2 className="w-3 h-3 text-slate-500" />
                      <span className="capitalize">{queue.musicOnHold || 'default'}</span>
                    </span>
                  </div>

                  {/* Routing influence details banner */}
                  <div className="text-[11px] px-3 py-1.5 bg-slate-950/50 border border-slate-800/80 rounded-xl flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="text-slate-400">Routing Inbound:</span>
                    </span>
                    <span className={`font-medium ${
                      queue.priority === 'high'
                        ? 'text-rose-300 font-bold'
                        : queue.priority === 'low'
                        ? 'text-slate-400'
                        : 'text-amber-300 font-semibold'
                    }`}>
                      {queue.priority === 'high'
                        ? 'Precedenza Max su Operatori Condivisi (Weight 10)'
                        : queue.priority === 'low'
                        ? 'Secondaria a Code Prioritarie (Weight 1)'
                        : 'Bilanciamento Ordinario Standard (Weight 5)'}
                    </span>
                  </div>

                  {/* Realtime Live Queue Stats Bar */}
                  <div className="grid grid-cols-4 gap-2 p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-center">
                    <div>
                      <div className="text-[10px] text-slate-500">In Attesa</div>
                      <div className="text-sm font-bold text-amber-400">
                        {queue.waitingCalls || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">In Corso</div>
                      <div className="text-sm font-bold text-emerald-400">
                        {queue.activeCalls || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Completate</div>
                      <div className="text-sm font-bold text-slate-300">
                        {queue.completedCalls || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">SLA %</div>
                      <div className="text-sm font-bold text-sky-400">
                        {queue.serviceLevelPercentage || 98}%
                      </div>
                    </div>
                  </div>

                  {/* Assigned Members Section */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-sky-400" />
                        <span>Operatori Assegnati ({queue.members.length})</span>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Squillo: {queue.memberTimeout}s • Pausa: {queue.wrapUpTime}s
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {queue.members.length === 0 ? (
                        <span className="text-xs text-rose-400 italic">
                          Nessun operatore assegnato a questa coda.
                        </span>
                      ) : (
                        queue.members.map((extNum) => {
                          const extObj = extensions.find((e) => e.number === extNum);
                          const isOnline = extObj?.status === 'online';
                          const isBusy = extObj?.status === 'busy';

                          return (
                            <div
                              key={extNum}
                              className="px-2.5 py-1.5 bg-slate-800/80 border border-slate-700/70 rounded-xl flex items-center gap-2 text-xs"
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isOnline
                                    ? 'bg-emerald-400'
                                    : isBusy
                                    ? 'bg-rose-500'
                                    : 'bg-slate-500'
                                }`}
                              />
                              <span className="font-mono font-bold text-white">{extNum}</span>
                              <span className="text-slate-300 text-[11px] truncate max-w-[100px]">
                                {extObj ? extObj.name : `Interno ${extNum}`}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer with timeout routing and simulate buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[200px]">
                    <span className="text-slate-500">A timeout:</span>
                    <span className="text-slate-300 font-medium truncate">
                      {queue.timeoutDestination.label || queue.timeoutDestination.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTriggerSlaWaitBreach(queue)}
                      title="Simula un chiamante che supera il Max Wait Time su questa coda"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-xl text-[11px] font-semibold transition cursor-pointer"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>Testa SLA</span>
                    </button>

                    <button
                      onClick={() => handleSimulateQueueCall(queue)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 rounded-xl text-[11px] font-semibold border border-slate-700 hover:border-slate-600 transition cursor-pointer"
                    >
                      <Play className="w-3 h-3 text-emerald-400" />
                      <span>Simula Chiamata</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Create / Edit Call Queue */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingQueueId ? 'Modifica Coda di Chiamata' : 'Crea Nuova Coda di Chiamata'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Definisci strategia ACD, tempo massimo di attesa e assegna gli interni.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Basic Queue Info: Name, Number, Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Numero Coda <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="es. 700"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-[10px] text-slate-500">Es. 700, 701, 702</span>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nome Coda <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="es. Coda Supporto Tecnico & Helpdesk"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-[10px] text-slate-500">Nome visualizzato sui telefoni degli operatori</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Descrizione Reparto</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione sintetica dello scopo di questa coda..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* STRATEGY SELECTION (ringall, roundrobin, leastrecent) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>Strategia di Smistamento Chiamate (Asterisk Queue Strategy)</span>
                  <span className="text-[11px] font-normal text-sky-400 font-mono">
                    strategy={formData.strategy}
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Strategy 1: ringall */}
                  <div
                    onClick={() => setFormData({ ...formData, strategy: 'ringall' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      formData.strategy === 'ringall'
                        ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>ringall</span>
                        </span>
                        {formData.strategy === 'ringall' && (
                          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-white">Squillo Simultaneo</div>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Fa squillare tutti i telefoni degli operatori contemporaneamente finché uno non risponde.
                      </p>
                    </div>
                  </div>

                  {/* Strategy 2: roundrobin */}
                  <div
                    onClick={() => setFormData({ ...formData, strategy: 'roundrobin' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      formData.strategy === 'roundrobin'
                        ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>roundrobin</span>
                        </span>
                        {formData.strategy === 'roundrobin' && (
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-white">A Rotazione Ciclica</div>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Ruota ciclicamente le chiamate in arrivo tra gli operatori secondo l'ordine di iscrizione.
                      </p>
                    </div>
                  </div>

                  {/* Strategy 3: leastrecent */}
                  <div
                    onClick={() => setFormData({ ...formData, strategy: 'leastrecent' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      formData.strategy === 'leastrecent'
                        ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5" />
                          <span>leastrecent</span>
                        </span>
                        {formData.strategy === 'leastrecent' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-white">Meno Recente</div>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Assegna la chiamata all'agente libero che non ne riceve una da maggior tempo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PRIORITY FIELD (High, Medium, Low) - INFLUENCES INBOUND CALL ROUTING */}
              <div className="space-y-2 p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Priorità Coda & Instradamento Inbound (Priority)</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-sky-400">
                    Asterisk weight={formData.priority === 'high' ? '10' : formData.priority === 'low' ? '1' : '5'} • QUEUE_PRIO={formData.priority === 'high' ? '10' : formData.priority === 'low' ? '1' : '5'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Influenza la priorità di smistamento delle chiamate in ingresso. Gli operatori appartenenti a più code servono per prime le chiamate provenienti da code a priorità maggiore (<strong className="text-rose-400">Alta</strong> &gt; <strong className="text-amber-400">Media</strong> &gt; <strong className="text-slate-300">Bassa</strong>).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* High Priority */}
                  <div
                    onClick={() => setFormData({ ...formData, priority: 'high' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      formData.priority === 'high'
                        ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          <span>Alta (High)</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300">
                          Weight 10
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-white">Precedenza Assoluta</div>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Inoltro prioritario immediato su qualsiasi agente libero o condiviso con altre code ordinarie.
                      </p>
                    </div>
                  </div>

                  {/* Medium Priority */}
                  <div
                    onClick={() => setFormData({ ...formData, priority: 'medium' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      formData.priority === 'medium'
                        ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                          <span>Media (Medium)</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                          Weight 5
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-white">Distribuzione Standard</div>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Priorità bilanciata standard per code di assistenza tecnica o commerciale ordinario.
                      </p>
                    </div>
                  </div>

                  {/* Low Priority */}
                  <div
                    onClick={() => setFormData({ ...formData, priority: 'low' })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      formData.priority === 'low'
                        ? 'bg-slate-800/80 border-slate-500 ring-1 ring-slate-400 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <ArrowDownRight className="w-3.5 h-3.5 text-slate-400" />
                          <span>Bassa (Low)</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-700/60 text-slate-300">
                          Weight 1
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-white">Bassa Precedenza</div>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Canale secondario per code non critiche o back-office, servite quando non vi sono attese prioritarie.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* MAX WAIT TIME (Tempo Massimo di Attesa) */}
              <div className="space-y-2 p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Tempo Massimo di Attesa (Max Wait Time)</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {formData.maxWaitTime > 0
                      ? `${formData.maxWaitTime} secondi (${(formData.maxWaitTime / 60).toFixed(1)} min)`
                      : 'Illimitato (nessun timeout)'}
                  </span>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '30s', val: 30 },
                    { label: '60s (1m)', val: 60 },
                    { label: '120s (2m)', val: 120 },
                    { label: '180s (3m)', val: 180 },
                    { label: '300s (5m)', val: 300 },
                    { label: '600s (10m)', val: 600 },
                    { label: 'Illimitato', val: 0 }
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset.val}
                      onClick={() => setFormData({ ...formData, maxWaitTime: preset.val })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        formData.maxWaitTime === preset.val
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="number"
                    min="0"
                    max="3600"
                    step="10"
                    value={formData.maxWaitTime}
                    onChange={(e) =>
                      setFormData({ ...formData, maxWaitTime: Math.max(0, parseInt(e.target.value, 10) || 0) })
                    }
                    className="w-32 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-[11px] text-slate-400">
                    * Imposta 0 per consentire l'attesa finché un agente non risponde.
                  </span>
                </div>
              </div>

              {/* TIMEOUT DESTINATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Azione a Timeout o Coda Piena
                  </label>
                  <select
                    value={formData.timeoutDestType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timeoutDestType: e.target.value as any
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="voicemail">Segreteria Telefonica (Voicemail)</option>
                    <option value="extension">Inoltra a Interno Specifico</option>
                    <option value="ivr">Ritorna al Menu IVR Principale</option>
                    <option value="hangup">Riaggancia la Chiamata</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Dettaglio Destinazione
                  </label>
                  {formData.timeoutDestType === 'voicemail' ? (
                    <select
                      value={formData.timeoutDestId}
                      onChange={(e) => setFormData({ ...formData, timeoutDestId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="general">Segreteria Generale Aziendale</option>
                      {extensions.map((ext) => (
                        <option key={ext.id} value={ext.number}>
                          Segreteria Interno {ext.number} ({ext.name})
                        </option>
                      ))}
                    </select>
                  ) : formData.timeoutDestType === 'extension' ? (
                    <select
                      value={formData.timeoutDestId}
                      onChange={(e) => setFormData({ ...formData, timeoutDestId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      {extensions.map((ext) => (
                        <option key={ext.id} value={ext.number}>
                          {ext.number} - {ext.name} ({ext.department})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="py-2 text-xs text-slate-400 italic">
                      Destinazione automatica ({formData.timeoutDestType})
                    </div>
                  )}
                </div>
              </div>

              {/* QUEUE MEMBERS ASSIGNMENT (Assegnazione Interni) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>Assegnazione Operatori alla Coda (Queue Members)</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Seleziona gli interni SIP che riceveranno le chiamate accodate.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllMembers}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                    >
                      Tutti
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllMembers}
                      className="text-[11px] text-slate-400 hover:text-slate-300 font-semibold"
                    >
                      Nessuno
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 bg-slate-950 border border-slate-800 rounded-2xl p-2">
                  {extensions.map((ext) => {
                    const isSelected = formData.members.includes(ext.number);
                    return (
                      <div
                        key={ext.id}
                        onClick={() => handleToggleMember(ext.number)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-600/70 text-white'
                            : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by div click
                            className="w-4 h-4 rounded border-slate-700 text-sky-600 focus:ring-sky-500 bg-slate-950 cursor-pointer"
                          />
                          <span className="font-mono font-bold text-xs text-sky-400">
                            {ext.number}
                          </span>
                          <div>
                            <span className="text-xs font-semibold text-white block">
                              {ext.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {ext.department}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              ext.status === 'online'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : ext.status === 'busy'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {ext.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[11px] text-slate-400">
                  Operatori selezionati:{' '}
                  <strong className="text-sky-400">{formData.members.length}</strong> su{' '}
                  {extensions.length}
                </div>
              </div>

              {/* ADVANCED ASTERISK QUEUE PARAMETERS */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="text-xs font-bold text-slate-300">
                  Parametri Avanzati Coda (Asterisk queues.conf)
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Squillo Agente (s)</label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={formData.memberTimeout}
                      onChange={(e) =>
                        setFormData({ ...formData, memberTimeout: parseInt(e.target.value, 10) || 20 })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Pausa Retry (s)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.retryTimeout}
                      onChange={(e) =>
                        setFormData({ ...formData, retryTimeout: parseInt(e.target.value, 10) || 5 })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Riposo Post-Chiamata</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={formData.wrapUpTime}
                      onChange={(e) =>
                        setFormData({ ...formData, wrapUpTime: parseInt(e.target.value, 10) || 15 })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Musica Attesa</label>
                    <select
                      value={formData.musicOnHold}
                      onChange={(e) => setFormData({ ...formData, musicOnHold: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="ambient">Ambient Lounge</option>
                      <option value="jazz">Smooth Jazz</option>
                      <option value="classic">Classica</option>
                      <option value="default">Default Asterisk</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.announcePosition}
                      onChange={(e) =>
                        setFormData({ ...formData, announcePosition: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-700 text-sky-600 bg-slate-950 cursor-pointer"
                    />
                    <span>Annuncia posizione in coda al chiamante</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.announceHoldTime}
                      onChange={(e) =>
                        setFormData({ ...formData, announceHoldTime: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-700 text-sky-600 bg-slate-950 cursor-pointer"
                    />
                    <span>Annuncia tempo stimato di attesa</span>
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Annulla
                </button>
                <button
                  id="btn-save-call-queue"
                  type="submit"
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-sky-600/20 cursor-pointer"
                >
                  {editingQueueId ? 'Salva Modifiche' : 'Crea Coda di Chiamata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Asterisk queues.conf Viewer */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Asterisk Configuration Export (queues.conf & extensions.conf)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sintassi nativa compatibile con Asterisk 18/20/21 e FreePBX / Rocky Linux
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyQueuesConfig}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  {copiedConfig ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copia Config</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
                {generateAsteriskQueuesConf()}
              </pre>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span>* I file possono essere inseriti in /etc/asterisk/queues.conf</span>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
