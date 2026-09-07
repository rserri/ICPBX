import React, { useState } from 'react';
import {
  Bell,
  Smartphone,
  Apple,
  Send,
  CheckCircle2,
  AlertCircle,
  Phone,
  PhoneOff,
  Code,
  ShieldCheck,
  Radio,
  Clock
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { PushLog, Extension } from '../types/pbx';

interface PushNotificationManagerProps {
  extensions: Extension[];
  pushLogs: PushLog[];
  onAddPushLog: (log: PushLog) => void;
  onOpenWebPhoneWithNumber: (num: string) => void;
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  extensions,
  pushLogs,
  onAddPushLog,
  onOpenWebPhoneWithNumber
}) => {
  const [selectedExt, setSelectedExt] = useState<string>(extensions[0]?.number || '101');
  const [callerName, setCallerName] = useState('Studio Tecnico Milano');
  const [callerNumber, setCallerNumber] = useState('+39 02 87654321');
  const [devicePreview, setDevicePreview] = useState<'ios' | 'android'>('ios');
  const [isSimulating, setIsSimulating] = useState(false);
  const [activePushAlert, setActivePushAlert] = useState<boolean>(false);

  const currentExt = extensions.find((e) => e.number === selectedExt) || extensions[0];

  const handleSendTestPush = () => {
    setIsSimulating(true);
    audioService.startIncomingRingtone();

    setTimeout(() => {
      setIsSimulating(false);
      setActivePushAlert(true);

      const newLog: PushLog = {
        id: `plog-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        deviceType: devicePreview,
        recipient: `${currentExt.name} (Ext ${currentExt.number} - ${devicePreview.toUpperCase()})`,
        caller: `${callerName} <${callerNumber}>`,
        status: 'delivered',
        latencyMs: Math.floor(Math.random() * 80 + 80),
        payloadJson:
          devicePreview === 'ios'
            ? JSON.stringify({
                aps: {
                  alert: { title: 'Chiamata VoIP in arrivo', body: `${callerName} (${callerNumber})` },
                  sound: 'voip_ring.caf',
                  badge: 1,
                  'content-available': 1
                },
                call_uuid: `uuid-${Math.random().toString(36).substring(2, 9)}`,
                caller_name: callerName,
                caller_number: callerNumber
              })
            : JSON.stringify({
                priority: 'high',
                data: {
                  action: 'VOIP_INCOMING_CALL',
                  caller_number: callerNumber,
                  caller_name: callerName,
                  call_uuid: `uuid-${Math.random().toString(36).substring(2, 9)}`,
                  channel: 'webrtc'
                }
              })
      };

      onAddPushLog(newLog);
    }, 450);
  };

  const handleDismissAlert = () => {
    audioService.stopTones();
    setActivePushAlert(false);
  };

  const handleAnswerOnDevice = () => {
    audioService.stopTones();
    setActivePushAlert(false);
    onOpenWebPhoneWithNumber(callerNumber);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Bell className="w-5 h-5 text-sky-400" />
            <span>Notifiche Push Mobile (iOS & Android)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Architettura Push-to-Talk / Wake-on-Call per Apple APNs (CallKit VoIP) e Google Firebase Cloud Messaging (FCM v1).
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="flex items-center space-x-1.5 bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-3 py-1.5 rounded-xl font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>APNs & FCM Attivi</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Settings & Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration & Test Trigger (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* APNs & FCM Gateway Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Apple APNs */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <Apple className="w-4 h-4" />
                  <span>Apple APNs (VoIP Push)</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <div>Bundle ID: <span className="font-mono text-slate-200">it.azienda.pbxmobile.voip</span></div>
                <div>Team ID: <span className="font-mono text-slate-200">TEAM987654</span></div>
                <div>Chiave .p8: <span className="text-emerald-400 font-semibold">Cifrata ES256 Valida</span></div>
              </div>
            </div>

            {/* Google FCM */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Google Firebase FCM v1</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <div>Project ID: <span className="font-mono text-slate-200">azienda-pbx-voip</span></div>
                <div>Priorità: <span className="font-mono text-sky-400">High Priority (Wake-up)</span></div>
                <div>Service Account: <span className="text-emerald-400 font-semibold">JSON Attivo</span></div>
              </div>
            </div>
          </div>

          {/* Test Push Sender Form */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <Send className="w-4 h-4 text-sky-400" />
              <span>Simulatore Wake-on-Call in Tempo Reale</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Interno Destinatario</label>
                <select
                  value={selectedExt}
                  onChange={(e) => setSelectedExt(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                >
                  {extensions.map((ext) => (
                    <option key={ext.id} value={ext.number}>
                      {ext.number} - {ext.name} ({ext.pushDeviceType?.toUpperCase() || 'Mobile'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Dispositivo di Anteprima</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setDevicePreview('ios')}
                    className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1 font-semibold transition ${
                      devicePreview === 'ios'
                        ? 'bg-slate-700 text-white border border-slate-500'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Apple className="w-3.5 h-3.5" />
                    <span>Apple iOS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDevicePreview('android')}
                    className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1 font-semibold transition ${
                      devicePreview === 'android'
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Android</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nome Chiamante Simulato</label>
                <input
                  type="text"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Numero Chiamante</label>
                <input
                  type="text"
                  value={callerNumber}
                  onChange={(e) => setCallerNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono"
                />
              </div>
            </div>

            <button
              id="btn-trigger-push-test"
              onClick={handleSendTestPush}
              disabled={isSimulating}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg transition"
            >
              <Send className="w-4 h-4" />
              <span>{isSimulating ? 'Invio Push in corso...' : 'Invia Notifica Push di Risveglio'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Smartphone Device Mockup (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="w-[300px] h-[580px] bg-slate-950 border-4 border-slate-700 rounded-[40px] shadow-2xl p-3 flex flex-col relative overflow-hidden">
            {/* Speaker & Dynamic Island / Camera cutout */}
            <div className="w-full flex justify-center mb-2">
              <div className="w-24 h-5 bg-slate-800 rounded-full flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2"></span>
                <span className="w-2 h-2 rounded-full bg-slate-900"></span>
              </div>
            </div>

            {/* Phone Screen Canvas */}
            <div className="flex-1 rounded-[28px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 p-4 flex flex-col justify-between text-white relative">
              {/* Top Status Bar */}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold">10:45</span>
                <div className="flex items-center space-x-1">
                  <span>5G</span>
                  <span className="w-4 h-2 rounded bg-slate-400 inline-block"></span>
                </div>
              </div>

              {/* Incoming Call Overlay if Push triggered */}
              {activePushAlert ? (
                <div className="flex-1 flex flex-col items-center justify-between py-6 animate-fade-in">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 bg-sky-950/80 px-2.5 py-1 rounded-full border border-sky-800">
                      {devicePreview === 'ios' ? 'iOS CallKit VoIP' : 'Android Telecom Call'}
                    </span>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center mx-auto my-4 text-white text-xl font-bold shadow-lg">
                      {callerName.charAt(0)}
                    </div>
                    <h4 className="text-base font-bold">{callerName}</h4>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">{callerNumber}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Centralino ICPBX • Interno {currentExt.number}</p>
                  </div>

                  {/* Accept & Decline Buttons */}
                  <div className="w-full flex items-center justify-around px-4">
                    <button
                      onClick={handleDismissAlert}
                      className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-lg transition"
                    >
                      <PhoneOff className="w-5 h-5" />
                    </button>

                    <button
                      onClick={handleAnswerOnDevice}
                      className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-lg transition animate-bounce"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <Bell className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-xs">Schermata Blocco {devicePreview.toUpperCase()}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Invia un push di test a sinistra per verificare il risveglio automatico del dispositivo.
                  </p>
                </div>
              )}

              {/* Home indicator bar */}
              <div className="w-24 h-1 bg-slate-600 rounded-full mx-auto"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Push Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Registro Notifiche Push Inviate (Audit Log)</h3>
          <span className="text-xs text-slate-400">{pushLogs.length} eventi registrati</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Data & Ora</th>
                <th className="py-2.5 px-4">Piattaforma</th>
                <th className="py-2.5 px-4">Destinatario</th>
                <th className="py-2.5 px-4">Chiamante</th>
                <th className="py-2.5 px-4">Stato Consegna</th>
                <th className="py-2.5 px-4">Latenza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {pushLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">{log.timestamp}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        log.deviceType === 'ios'
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {log.deviceType}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-white">{log.recipient}</td>
                  <td className="py-2.5 px-4 text-slate-300">{log.caller}</td>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Consegnato</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-emerald-400">{log.latencyMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
