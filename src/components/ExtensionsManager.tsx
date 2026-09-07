import React, { useState } from 'react';
import {
  Plus,
  Search,
  Radio,
  Phone,
  Edit2,
  Trash2,
  Copy,
  Check,
  Smartphone,
  Shield,
  Voicemail,
  Code,
  FileText
} from 'lucide-react';
import { Extension } from '../types/pbx';

interface ExtensionsManagerProps {
  extensions: Extension[];
  onAddExtension: (ext: Extension) => void;
  onUpdateExtension: (ext: Extension) => void;
  onDeleteExtension: (id: string) => void;
  onDialExtension: (number: string) => void;
}

export const ExtensionsManager: React.FC<ExtensionsManagerProps> = ({
  extensions,
  onAddExtension,
  onUpdateExtension,
  onDeleteExtension,
  onDialExtension
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingExt, setEditingExt] = useState<Extension | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingPjsipExt, setViewingPjsipExt] = useState<Extension | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Extension>>({
    number: '',
    name: '',
    email: '',
    department: 'Commerciale',
    secret: '',
    webrtcEnabled: true,
    codecs: ['opus', 'alaw', 'g722'],
    voicemailEnabled: true,
    voicemailPin: '1234',
    callerId: '',
    status: 'online',
    mobilePushEnabled: true,
    pushDeviceType: 'ios',
    pushToken: '',
    context: 'internal-context',
    maxContacts: 3
  });

  const filteredExtensions = extensions.filter(
    (ext) =>
      ext.number.includes(searchTerm) ||
      ext.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddModal = () => {
    const nextNum = (Math.max(100, ...extensions.map((e) => parseInt(e.number) || 100)) + 1).toString();
    setFormData({
      id: `ext-${nextNum}`,
      number: nextNum,
      name: '',
      email: '',
      department: 'Commerciale',
      secret: `SIP_Pass_${Math.random().toString(36).substring(2, 8)}!`,
      webrtcEnabled: true,
      codecs: ['opus', 'alaw', 'g722'],
      voicemailEnabled: true,
      voicemailPin: `${nextNum}0`,
      callerId: `"${nextNum}" <${nextNum}>`,
      status: 'online',
      mobilePushEnabled: true,
      pushDeviceType: 'ios',
      pushToken: `apns-token-${Math.random().toString(16).substring(2, 10)}`,
      context: 'internal-context',
      maxContacts: 3
    });
    setEditingExt(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ext: Extension) => {
    setEditingExt(ext);
    setFormData({ ...ext });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number || !formData.name || !formData.secret) {
      alert('Compilare i campi obbligatori (Numero, Nome, Password)');
      return;
    }

    if (editingExt) {
      onUpdateExtension(formData as Extension);
    } else {
      onAddExtension({
        ...formData,
        id: `ext-${formData.number}`
      } as Extension);
    }
    setIsModalOpen(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generatePjsipSnippet = (ext: Extension) => {
    return `; --- Configurazione PJSIP per Interno ${ext.number} (${ext.name}) ---
[${ext.number}]
type=endpoint
context=${ext.context}
disallow=all
allow=${ext.codecs.join(',')}
auth=${ext.number}-auth
aors=${ext.number}
callerid=${ext.callerId || `"${ext.name}" <${ext.number}>`}
${
  ext.webrtcEnabled
    ? `webrtc=yes
dtls_auto_generate_cert=no
dtls_verify=fingerprint
dtls_cert_file=/etc/letsencrypt/live/pbx.azienda.it/fullchain.pem
dtls_private_key=/etc/letsencrypt/live/pbx.azienda.it/privkey.pem
dtls_setup=actpass
ice_support=yes
media_encryption=dtls
rtcp_mux=yes`
    : `; WebRTC disabilitato (SIP Standard)`
}

[${ext.number}-auth]
type=auth
auth_type=userpass
username=${ext.number}
password=${ext.secret}

[${ext.number}]
type=aor
max_contacts=${ext.maxContacts}
remove_existing=yes
`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-sky-400" />
            <span>Gestione Interni SIP & WebRTC</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configurazione utenti, credenziali PJSIP, trasporto WebRTC WSS e token per notifiche push mobile.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              id="search-extensions"
              type="text"
              placeholder="Cerca interno, nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-sky-500 w-48 sm:w-64"
            />
          </div>

          <button
            id="btn-add-extension"
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Interno</span>
          </button>
        </div>
      </div>

      {/* Extensions Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Interno</th>
                <th className="py-3 px-4">Nome & Reparto</th>
                <th className="py-3 px-4">Stato Presenza</th>
                <th className="py-3 px-4">WebRTC</th>
                <th className="py-3 px-4">Push Mobile</th>
                <th className="py-3 px-4">Codec</th>
                <th className="py-3 px-4">Voicemail</th>
                <th className="py-3 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredExtensions.map((ext) => (
                <tr key={ext.id} className="hover:bg-slate-800/50 transition">
                  {/* Number */}
                  <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-400">
                      {ext.number}
                    </span>
                  </td>

                  {/* Name & Department */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{ext.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {ext.department} • <span className="font-mono">{ext.email}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        ext.status === 'online'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : ext.status === 'busy'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : ext.status === 'dnd'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
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
                            : 'bg-slate-400'
                        }`}
                      ></span>
                      <span className="capitalize">{ext.status}</span>
                    </span>
                  </td>

                  {/* WebRTC */}
                  <td className="py-3 px-4">
                    {ext.webrtcEnabled ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                        <Shield className="w-3 h-3" />
                        <span>Attivo (DTLS)</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">Solo SIP UDP</span>
                    )}
                  </td>

                  {/* Push Mobile */}
                  <td className="py-3 px-4">
                    {ext.mobilePushEnabled ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                        <Smartphone className="w-3 h-3" />
                        <span className="uppercase">{ext.pushDeviceType || 'Mobile'}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Disattivo</span>
                    )}
                  </td>

                  {/* Codecs */}
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                    {ext.codecs.slice(0, 2).join(', ')}
                    {ext.codecs.length > 2 && ` +${ext.codecs.length - 2}`}
                  </td>

                  {/* Voicemail */}
                  <td className="py-3 px-4">
                    {ext.voicemailEnabled ? (
                      <span className="inline-flex items-center space-x-1 text-slate-300 text-[11px]">
                        <Voicemail className="w-3.5 h-3.5 text-sky-400" />
                        <span>PIN: {ext.voicemailPin}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">No</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        title="Chiama interno"
                        onClick={() => onDialExtension(ext.number)}
                        className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>

                      <button
                        title="Configurazione PJSIP"
                        onClick={() => setViewingPjsipExt(ext)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>

                      <button
                        title="Modifica"
                        onClick={() => handleOpenEditModal(ext)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        title="Elimina"
                        onClick={() => {
                          if (confirm(`Sei sicuro di voler eliminare l'interno ${ext.number}?`)) {
                            onDeleteExtension(ext.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit Extension */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 text-slate-200 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Radio className="w-5 h-5 text-sky-400" />
                <span>{editingExt ? `Modifica Interno ${editingExt.number}` : 'Nuovo Interno Asterisk'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Numero Interno *</label>
                  <input
                    type="text"
                    required
                    value={formData.number || ''}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    placeholder="es. 106"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nome Visualizzato *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="es. Mario Rossi"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Reparto Aziendale</label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="es. Supporto, Vendite..."
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    placeholder="m.rossi@azienda.it"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Password SIP (Secret) *</label>
                  <input
                    type="text"
                    required
                    value={formData.secret || ''}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* WebRTC & Transport Options */}
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Abilita WebRTC (WSS / DTLS-SRTP)</span>
                    <span className="text-[11px] text-slate-400">
                      Consente l'accesso tramite il Web Client dal browser e browser mobili.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.webrtcEnabled}
                    onChange={(e) => setFormData({ ...formData, webrtcEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600 bg-slate-700"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Notifiche Push Mobile (iOS/Android)</span>
                    <span className="text-[11px] text-slate-400">
                      Invia wake-up via Apple APNs o Google FCM per le chiamate in arrivo.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.mobilePushEnabled}
                    onChange={(e) => setFormData({ ...formData, mobilePushEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600 bg-slate-700"
                  />
                </div>

                {formData.mobilePushEnabled && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Sistema Operativo</label>
                      <select
                        value={formData.pushDeviceType || 'ios'}
                        onChange={(e) =>
                          setFormData({ ...formData, pushDeviceType: e.target.value as 'ios' | 'android' })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                      >
                        <option value="ios">Apple iOS (APNs CallKit)</option>
                        <option value="android">Android (Google FCM v1)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Token Dispositivo</label>
                      <input
                        type="text"
                        placeholder="apns/fcm device token..."
                        value={formData.pushToken || ''}
                        onChange={(e) => setFormData({ ...formData, pushToken: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Call Waiting & Inoltro Chiamate (Forward Settings) */}
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Avviso di Chiamata su Occupato (Call Waiting)</span>
                    <span className="text-[11px] text-slate-400">
                      Consente di ricevere una 2ª chiamata in attesa con doppio bip quando l'interno è già in linea.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.callWaitingEnabled ?? true}
                    onChange={(e) => setFormData({ ...formData, callWaitingEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600 bg-slate-700"
                  />
                </div>

                <div className="pt-2 border-t border-slate-700/80 space-y-2">
                  <span className="text-xs font-semibold text-sky-400 block">Regole di Inoltro Chiamata (Call Forwarding)</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* On Busy */}
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700">
                      <label className="block text-slate-300 font-medium mb-1">Se l'interno è Occupato:</label>
                      <select
                        value={formData.forwardSettings?.onBusy?.type || 'voicemail'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            forwardSettings: {
                              ...formData.forwardSettings,
                              onBusy: {
                                enabled: true,
                                type: e.target.value as any,
                                target: e.target.value === 'extension' ? '102' : ''
                              }
                            }
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                      >
                        <option value="voicemail">Invia a Segreteria Vocale</option>
                        <option value="extension">Devia ad altro interno</option>
                        <option value="hangup">Segnale di Occupato (Busy tone)</option>
                      </select>
                    </div>

                    {/* On No Answer */}
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700">
                      <label className="block text-slate-300 font-medium mb-1">Su Mancata Risposta (No Answer):</label>
                      <div className="flex gap-2">
                        <select
                          value={formData.forwardSettings?.onNoAnswer?.type || 'voicemail'}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              forwardSettings: {
                                ...formData.forwardSettings,
                                onNoAnswer: {
                                  enabled: true,
                                  type: e.target.value as any,
                                  target: '',
                                  ringTimeSeconds: formData.forwardSettings?.onNoAnswer?.ringTimeSeconds || 20
                                }
                              }
                            })
                          }
                          className="flex-1 bg-slate-800 border border-slate-700 rounded p-1.5 text-white text-xs"
                        >
                          <option value="voicemail">A Segreteria</option>
                          <option value="extension">Devia a Interno</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="5"
                            max="60"
                            value={formData.forwardSettings?.onNoAnswer?.ringTimeSeconds || 20}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                forwardSettings: {
                                  ...formData.forwardSettings,
                                  onNoAnswer: {
                                    enabled: true,
                                    type: formData.forwardSettings?.onNoAnswer?.type || 'voicemail',
                                    target: '',
                                    ringTimeSeconds: parseInt(e.target.value) || 20
                                  }
                                }
                              })
                            }
                            className="w-14 bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-mono text-xs text-center"
                          />
                          <span className="text-slate-400 text-[10px]">sec</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voicemail & Dialplan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Segreteria Telefonica (Voicemail)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.voicemailEnabled}
                      onChange={(e) => setFormData({ ...formData, voicemailEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-sky-600 bg-slate-700"
                    />
                    <span className="text-white">Attiva Casella</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">PIN Segreteria</label>
                  <input
                    type="text"
                    value={formData.voicemailPin || '1234'}
                    onChange={(e) => setFormData({ ...formData, voicemailPin: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow"
                >
                  Salva Interno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PJSIP Snippet Inspector Modal */}
      {viewingPjsipExt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white">
                  Anteprima Asterisk pjsip.conf (Int. {viewingPjsipExt.number})
                </h3>
              </div>
              <button
                onClick={() => setViewingPjsipExt(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="relative mb-4">
              <pre className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800 max-h-80">
                {generatePjsipSnippet(viewingPjsipExt)}
              </pre>
              <button
                onClick={() => copyToClipboard(generatePjsipSnippet(viewingPjsipExt), viewingPjsipExt.id)}
                className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-700"
              >
                {copiedId === viewingPjsipExt.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === viewingPjsipExt.id ? 'Copiato!' : 'Copia'}</span>
              </button>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Sincronizzato automaticamente via PHP AGI / AMI reload.</span>
              <button
                onClick={() => setViewingPjsipExt(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
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
