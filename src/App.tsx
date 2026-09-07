import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar, TopHeader } from './components/Navbar';
import { WebPhone } from './components/WebPhone';
import { ExtensionsManager } from './components/ExtensionsManager';
import { DialplanManager } from './components/DialplanManager';
import { CdrManager } from './components/CdrManager';
import { ReportsAnalytics } from './components/ReportsAnalytics';
import { ContactsManager } from './components/ContactsManager';
import { PushNotificationManager } from './components/PushNotificationManager';
import { ClusterDashboard } from './components/ClusterDashboard';
import { RockyLinuxInstaller } from './components/RockyLinuxInstaller';
import { PhpBackendViewer } from './components/PhpBackendViewer';
import { ClusterDocs } from './components/ClusterDocs';
import { VoicemailManager } from './components/VoicemailManager';
import { BusinessHoursManager } from './components/BusinessHoursManager';
import { UserWebClient } from './components/UserWebClient';
import { ExtensionSelectorDashboard } from './components/ExtensionSelectorDashboard';
import { AdminAuthModal, ChangeAdminPasswordModal } from './components/AdminAuthModal';
import { CallQueuesManager } from './components/CallQueuesManager';

import {
  Extension,
  ExtensionStatus,
  CDRRecord,
  Contact,
  ClusterNode,
  InboundRoute,
  OutboundRoute,
  IVRMenu,
  RingGroup,
  PushLog,
  VoicemailMessage,
  BusinessHoursConfig,
  DashboardTheme,
  CallQueue
} from './types/pbx';

import {
  MOCK_EXTENSIONS,
  MOCK_CDR_RECORDS,
  MOCK_CONTACTS,
  MOCK_CLUSTER_NODES,
  MOCK_INBOUND_ROUTES,
  MOCK_OUTBOUND_ROUTES,
  MOCK_IVR_MENUS,
  MOCK_RING_GROUPS,
  MOCK_PUSH_LOGS,
  initialVoicemailMessages,
  initialBusinessHoursConfig,
  initialCallQueues
} from './services/mockData';

export default function App() {
  // Navigation: if the user hasn't chosen an extension for this computer yet, start on the extension_setup dashboard
  const [activeTab, setActiveTab] = useState<string>(() => {
    const saved = localStorage.getItem('pbx_active_extension_id');
    return saved ? 'user_dashboard' : 'extension_setup';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Administrator Authentication State (Protects the main dashboard, user: Amministratore)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    const session = sessionStorage.getItem('pbx_admin_authenticated');
    const persistent = localStorage.getItem('pbx_admin_authenticated');
    return session === 'true' || persistent === 'true';
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [pendingAdminTab, setPendingAdminTab] = useState<string | null>(null);

  const handleRequireAdminAuth = (tabId: string) => {
    if (isAdminAuthenticated) {
      setActiveTab(tabId);
    } else {
      setPendingAdminTab(tabId);
      setShowAdminLoginModal(true);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    setShowAdminLoginModal(false);
    if (pendingAdminTab) {
      setActiveTab(pendingAdminTab);
      setPendingAdminTab(null);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('pbx_admin_authenticated');
    localStorage.removeItem('pbx_admin_authenticated');
    setIsAdminAuthenticated(false);
    setActiveTab('user_dashboard');
  };

  // WebPhone softphone drawer
  const [isPhoneOpen, setIsPhoneOpen] = useState<boolean>(true);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [externalNumberToDial, setExternalNumberToDial] = useState<string | null>(null);

  // User presence synchronized across PBX extensions, local storage, and Navbar
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'dnd' | 'meeting'>(() => {
    const saved = localStorage.getItem('pbx_user_status');
    return (saved as 'online' | 'away' | 'dnd' | 'meeting') || 'online';
  });

  // Dashboard Visual Theme State ('dark' default, 'light', 'high-contrast' persisted in localStorage)
  const [theme, setTheme] = useState<DashboardTheme>(() => {
    const saved = localStorage.getItem('pbx_dashboard_theme');
    if (saved === 'light' || saved === 'high-contrast' || saved === 'dark') {
      return saved;
    }
    return 'dark';
  });

  // Keep theme synchronized with document root classes and localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pbx_dashboard_theme', theme);
      const root = document.documentElement;
      root.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');
      root.classList.add(`theme-${theme}`);
      root.setAttribute('data-theme', theme);
    } catch (e) {
      console.error('Failed to save theme in localStorage', e);
    }
  }, [theme]);

  // Main PBX State
  const [extensions, setExtensions] = useState<Extension[]>(() => {
    const saved = localStorage.getItem('pbx_extensions');
    return saved ? JSON.parse(saved) : MOCK_EXTENSIONS;
  });

  const [cdrRecords, setCdrRecords] = useState<CDRRecord[]>(() => {
    const saved = localStorage.getItem('pbx_cdr');
    return saved ? JSON.parse(saved) : MOCK_CDR_RECORDS;
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('pbx_contacts');
    return saved ? JSON.parse(saved) : MOCK_CONTACTS;
  });

  const [clusterNodes, setClusterNodes] = useState<ClusterNode[]>(() => {
    const saved = localStorage.getItem('pbx_nodes');
    return saved ? JSON.parse(saved) : MOCK_CLUSTER_NODES;
  });

  const [inboundRoutes, setInboundRoutes] = useState<InboundRoute[]>(() => {
    const saved = localStorage.getItem('pbx_inbound_routes');
    return saved ? JSON.parse(saved) : MOCK_INBOUND_ROUTES;
  });

  const [outboundRoutes, setOutboundRoutes] = useState<OutboundRoute[]>(() => {
    const saved = localStorage.getItem('pbx_outbound_routes');
    return saved ? JSON.parse(saved) : MOCK_OUTBOUND_ROUTES;
  });

  const [ivrMenus, setIvrMenus] = useState<IVRMenu[]>(() => {
    const saved = localStorage.getItem('pbx_ivr_menus');
    return saved ? JSON.parse(saved) : MOCK_IVR_MENUS;
  });

  const [ringGroups, setRingGroups] = useState<RingGroup[]>(() => {
    const saved = localStorage.getItem('pbx_ring_groups');
    return saved ? JSON.parse(saved) : MOCK_RING_GROUPS;
  });

  const [pushLogs, setPushLogs] = useState<PushLog[]>(() => {
    const saved = localStorage.getItem('pbx_push_logs');
    return saved ? JSON.parse(saved) : MOCK_PUSH_LOGS;
  });

  const [voicemails, setVoicemails] = useState<VoicemailMessage[]>(() => {
    const saved = localStorage.getItem('pbx_voicemails');
    return saved ? JSON.parse(saved) : initialVoicemailMessages;
  });

  const [businessHours, setBusinessHours] = useState<BusinessHoursConfig>(() => {
    const saved = localStorage.getItem('pbx_business_hours');
    return saved ? JSON.parse(saved) : initialBusinessHoursConfig;
  });

  const [callQueues, setCallQueues] = useState<CallQueue[]>(() => {
    const saved = localStorage.getItem('pbx_call_queues');
    if (saved) {
      try {
        const parsed: CallQueue[] = JSON.parse(saved);
        return parsed.map((q) => ({
          ...q,
          priority: q.priority || (q.number === '702' ? 'high' : q.number === '700' ? 'medium' : 'low')
        }));
      } catch {
        return initialCallQueues;
      }
    }
    return initialCallQueues;
  });

  const [isFailoverSimulated, setIsFailoverSimulated] = useState<boolean>(false);

  // Persistence to local storage
  useEffect(() => {
    localStorage.setItem('pbx_extensions', JSON.stringify(extensions));
  }, [extensions]);

  useEffect(() => {
    localStorage.setItem('pbx_cdr', JSON.stringify(cdrRecords));
  }, [cdrRecords]);

  useEffect(() => {
    localStorage.setItem('pbx_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('pbx_push_logs', JSON.stringify(pushLogs));
  }, [pushLogs]);

  useEffect(() => {
    localStorage.setItem('pbx_voicemails', JSON.stringify(voicemails));
  }, [voicemails]);

  useEffect(() => {
    localStorage.setItem('pbx_business_hours', JSON.stringify(businessHours));
  }, [businessHours]);

  useEffect(() => {
    localStorage.setItem('pbx_call_queues', JSON.stringify(callQueues));
  }, [callQueues]);

  // Active Extension assigned to this computer / workstation
  const [activeExtensionId, setActiveExtensionId] = useState<string>(() => {
    return localStorage.getItem('pbx_active_extension_id') || 'ext-101';
  });

  const activeExtension = useMemo(() => {
    return (
      extensions.find((e) => e.id === activeExtensionId || e.number === activeExtensionId) ||
      extensions[0]
    );
  }, [extensions, activeExtensionId]);

  const handleSelectExtension = (ext: Extension) => {
    setActiveExtensionId(ext.id);
    localStorage.setItem('pbx_active_extension_id', ext.id);
  };

  // Synchronize operator userStatus across the entire system (extensions, BLF, storage)
  useEffect(() => {
    localStorage.setItem('pbx_user_status', userStatus);
    setExtensions((prev) =>
      prev.map((ext) => {
        if (ext.id === activeExtension.id || ext.number === activeExtension.number) {
          const extStatus: ExtensionStatus =
            userStatus === 'online' ? 'online' : userStatus === 'dnd' ? 'dnd' : 'busy';
          return ext.status !== extStatus ? { ...ext, status: extStatus } : ext;
        }
        return ext;
      })
    );
  }, [userStatus, activeExtension.id, activeExtension.number]);

  // Click to dial handler
  const handleDialNumber = (num: string) => {
    setExternalNumberToDial(num);
    setIsPhoneOpen(true);
  };

  // Call finished callback from WebPhone
  const handleCallFinished = (rec: Partial<CDRRecord>) => {
    const newRecord: CDRRecord = {
      id: `cdr-${Date.now()}`,
      callDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      clid: rec.clid || `"${activeExtension.name}" <${activeExtension.number}>`,
      src: rec.src || activeExtension.number,
      dst: rec.dst || 'Unknown',
      dcontext: 'internal-context',
      channel: `PJSIP/${activeExtension.number}-0000003b`,
      dstchannel: `PJSIP/${rec.dst}-0000003c`,
      lastapp: 'Dial',
      duration: rec.duration || 12,
      billsec: rec.billsec || 10,
      disposition: rec.disposition || 'ANSWERED',
      codec: 'Opus HD (48kHz)',
      mosScore: 4.41,
      hasRecording: true,
      recordingFile: `rec-${Date.now()}.wav`
    };

    setCdrRecords((prev) => [newRecord, ...prev]);
  };

  // Extensions CRUD
  const handleAddExtension = (ext: Extension) => {
    setExtensions((prev) => [...prev, ext]);
  };

  const handleUpdateExtension = (ext: Extension) => {
    setExtensions((prev) => prev.map((e) => (e.id === ext.id ? ext : e)));
  };

  const handleDeleteExtension = (id: string) => {
    setExtensions((prev) => prev.filter((e) => e.id !== id));
  };

  // Contacts CRUD
  const handleAddContact = (c: Contact) => {
    setContacts((prev) => [c, ...prev]);
  };

  const handleUpdateContact = (c: Contact) => {
    setContacts((prev) => prev.map((item) => (item.id === c.id ? c : item)));
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((item) => item.id !== id));
  };

  // Routes handlers
  const handleAddInbound = (route: InboundRoute) => {
    setInboundRoutes((prev) => [...prev, route]);
  };

  const handleDeleteInbound = (id: string) => {
    setInboundRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddOutbound = (route: OutboundRoute) => {
    setOutboundRoutes((prev) => [...prev, route]);
  };

  const handleDeleteOutbound = (id: string) => {
    setOutboundRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  // Push log handler
  const handleAddPushLog = (log: PushLog) => {
    setPushLogs((prev) => [log, ...prev]);
  };

  // Voicemail Handlers
  const handleAddVoicemail = (msg: VoicemailMessage) => {
    setVoicemails((prev) => [msg, ...prev]);
  };

  const handleDeleteVoicemail = (id: string) => {
    setVoicemails((prev) => prev.filter((v) => v.id !== id));
  };

  const handleToggleVoicemailRead = (id: string) => {
    setVoicemails((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isNew: !v.isNew } : v))
    );
  };

  // Call Queues Handlers
  const handleAddCallQueue = (queue: CallQueue) => {
    setCallQueues((prev) => [queue, ...prev]);
  };

  const handleUpdateCallQueue = (queue: CallQueue) => {
    setCallQueues((prev) => prev.map((q) => (q.id === queue.id ? queue : q)));
  };

  const handleDeleteCallQueue = (id: string) => {
    setCallQueues((prev) => prev.filter((q) => q.id !== id));
  };

  const unreadVoicemailsCount = voicemails.filter((v) => v.isNew).length;

  // Failover simulation
  const handleTriggerFailover = () => {
    setIsFailoverSimulated((prev) => !prev);
    setClusterNodes((prev) =>
      prev.map((n) => {
        if (n.role === 'primary') {
          return {
            ...n,
            vipAssigned: isFailoverSimulated,
            status: isFailoverSimulated ? 'active' : 'standby'
          };
        }
        if (n.role === 'secondary') {
          return {
            ...n,
            vipAssigned: !isFailoverSimulated,
            status: !isFailoverSimulated ? 'active' : 'standby'
          };
        }
        return n;
      })
    );
  };

  return (
    <div
      id="pbx-app-root"
      className={`flex h-screen w-screen font-sans overflow-hidden selection:bg-sky-500 selection:text-slate-950 transition-colors duration-200 ${
        theme === 'light'
          ? 'theme-light bg-slate-50 text-slate-900'
          : theme === 'high-contrast'
          ? 'theme-high-contrast bg-black text-white'
          : 'theme-dark bg-slate-950 text-slate-200'
      }`}
    >
      {/* Elegant Aside Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        unreadVoicemails={unreadVoicemailsCount}
        isAdminAuthenticated={isAdminAuthenticated}
        onRequireAdminAuth={handleRequireAdminAuth}
        onAdminLogout={handleAdminLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <TopHeader
          clusterNodes={clusterNodes}
          userStatus={userStatus}
          setUserStatus={setUserStatus}
          isPhoneOpen={isPhoneOpen}
          setIsPhoneOpen={setIsPhoneOpen}
          isCalling={isCalling}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          isAdminAuthenticated={isAdminAuthenticated}
          onOpenAdminLogin={() => setShowAdminLoginModal(true)}
          onAdminLogout={handleAdminLogout}
          onOpenChangePassword={() => setShowChangePasswordModal(true)}
          theme={theme}
          setTheme={setTheme}
          activeExtension={activeExtension}
          onOpenExtensionSelector={() => setActiveTab('extension_setup')}
        />

        {/* Scrollable Viewport with Metric Strip & Active View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top 4 KPI Metric Cards (Only shown in Main Dashboard when Amministratore is authenticated) */}
          {isAdminAuthenticated && activeTab !== 'user_dashboard' && activeTab !== 'extension_setup' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-500 font-bold uppercase mb-1">Active Channels</div>
                <div className="text-3xl font-light text-sky-400">
                  {isCalling ? '25' : '24'} <span className="text-xs text-slate-600">/ 250</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-500 font-bold uppercase mb-1">Registered Ext.</div>
                <div className="text-3xl font-light text-slate-100">
                  {extensions.length}{' '}
                  <span className="text-xs text-emerald-400 font-medium">
                    +{extensions.filter((e) => e.status === 'online').length} Online
                  </span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-500 font-bold uppercase mb-1">WebRTC Sessions</div>
                <div className="text-3xl font-light text-purple-400">08</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-500 font-bold uppercase mb-1">Cluster Nodes</div>
                <div className="text-3xl font-light text-slate-100">
                  02 <span className="text-xs text-slate-500 font-medium">Healthy</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab View */}
          <div className="space-y-6">
            {/* If attempting to view an admin tab without Amministratore password, block view and show inline login */}
            {activeTab !== 'user_dashboard' && activeTab !== 'extension_setup' && !isAdminAuthenticated ? (
              <AdminAuthModal
                isOpen={true}
                isInline={true}
                onClose={() => setActiveTab('user_dashboard')}
                onSuccess={handleAdminLoginSuccess}
                pendingTabLabel={activeTab}
                onOpenChangePassword={() => setShowChangePasswordModal(true)}
              />
            ) : (
              <>
                {/* TAB: SELEZIONE INTERNO PC (Dashboard Iniziale Collegamento) */}
                {activeTab === 'extension_setup' && (
                  <ExtensionSelectorDashboard
                    extensions={extensions}
                    activeExtension={activeExtension}
                    onSelectExtension={handleSelectExtension}
                    onNavigateToWebClient={() => setActiveTab('user_dashboard')}
                    onOpenWebPhone={() => setIsPhoneOpen(true)}
                    onAddNewExtension={handleAddExtension}
                  />
                )}

                {/* TAB: WEB CLIENT UTENTI SEMPLICI (Dashboard Completa) */}
                {activeTab === 'user_dashboard' && (
                  <UserWebClient
                    extensions={extensions}
                    contacts={contacts}
                    voicemails={voicemails}
                    cdrRecords={cdrRecords}
                    onAddContact={handleAddContact}
                    onDeleteVoicemail={handleDeleteVoicemail}
                    onToggleVoicemailRead={handleToggleVoicemailRead}
                    onAddVoicemail={handleAddVoicemail}
                    onCallFinished={handleCallFinished}
                    userStatus={userStatus}
                    setUserStatus={setUserStatus}
                    theme={theme}
                    setTheme={setTheme}
                    activeExtension={activeExtension}
                    onSwitchExtension={() => setActiveTab('extension_setup')}
                    callQueues={callQueues}
                    onUpdateCallQueues={setCallQueues}
                  />
                )}

                {/* TAB 1: WEB CLIENT (Dedicated Softphone + Presence BLF) */}
                {activeTab === 'webclient' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-6 flex justify-center">
                      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
                        <div className="text-center mb-4 pb-3 border-b border-slate-800">
                          <h2 className="text-lg font-bold text-white">Web Client ICPBX Softphone</h2>
                          <p className="text-xs text-slate-400">
                            Postazione Operatore WebRTC: Interno {activeExtension.number} ({activeExtension.name})
                          </p>
                        </div>
                        <WebPhone
                          isOpen={true}
                          onClose={() => {}}
                          extensions={extensions}
                          onCallFinished={handleCallFinished}
                          externalNumberToDial={externalNumberToDial}
                          onClearExternalDial={() => setExternalNumberToDial(null)}
                          onAddVoicemail={handleAddVoicemail}
                          activeExtension={activeExtension}
                        />
                      </div>
                    </div>

            {/* Quick Speed Dial & Busy Lamp Field (BLF) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Presence Board */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">Pannello Presenze Interni (BLF)</h3>
                  <span className="text-[11px] text-emerald-400 font-mono">Asterisk PJSIP Presence: ON</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {extensions.map((ext) => (
                    <div
                      key={ext.id}
                      className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between hover:border-sky-500 transition cursor-pointer"
                      onClick={() => handleDialNumber(ext.number)}
                    >
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              ext.status === 'online'
                                ? 'bg-emerald-400'
                                : ext.status === 'busy'
                                ? 'bg-rose-500 animate-ping'
                                : 'bg-slate-500'
                            }`}
                          ></span>
                          <span className="font-bold text-xs text-white">{ext.number}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium truncate max-w-[120px]">
                          {ext.name}
                        </div>
                        <div className="text-[10px] text-slate-400">{ext.department}</div>
                      </div>

                      <button
                        title="Chiama interno"
                        className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white rounded-lg text-xs font-semibold transition"
                      >
                        Chiama
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick speed dials */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-white pb-2 border-b border-slate-800">
                  Numeri Rapidi Aziendali
                </h3>
                <div className="space-y-2 text-xs">
                  <div
                    onClick={() => handleDialNumber('ivr')}
                    className="p-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-white">IVR Risponditore Automatico</span>
                      <span className="text-[11px] text-slate-400 block">Menu vocale principale aziendale</span>
                    </div>
                    <span className="text-sky-400 font-mono font-bold">Menu IVR</span>
                  </div>

                  <div
                    onClick={() => handleDialNumber('600')}
                    className="p-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-white">Gruppo 600 - Commerciale</span>
                      <span className="text-[11px] text-slate-400 block">Squillo simultaneo interni 101, 102</span>
                    </div>
                    <span className="text-sky-400 font-mono font-bold">Ext 600</span>
                  </div>

                  <div
                    onClick={() => handleDialNumber('700')}
                    className="p-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-white">Coda 700 - Supporto Tecnico</span>
                      <span className="text-[11px] text-slate-400 block">Coda ACD leastrecent (Interni 103, 105)</span>
                    </div>
                    <span className="text-sky-400 font-mono font-bold">Coda 700</span>
                  </div>

                  <div
                    onClick={() => handleDialNumber('*97')}
                    className="p-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-white">Segreteria Telefonica (Voicemail)</span>
                      <span className="text-[11px] text-slate-400 block">Ascolto messaggi vocali interni</span>
                    </div>
                    <span className="text-sky-400 font-mono font-bold">*97</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXTENSIONS & SIP */}
        {activeTab === 'extensions' && (
          <ExtensionsManager
            extensions={extensions}
            onAddExtension={handleAddExtension}
            onUpdateExtension={handleUpdateExtension}
            onDeleteExtension={handleDeleteExtension}
            onDialExtension={handleDialNumber}
          />
        )}

        {/* TAB: CODE DI CHIAMATA / CALL QUEUES (Asterisk app_queue) */}
        {activeTab === 'call_queues' && (
          <CallQueuesManager
            queues={callQueues}
            extensions={extensions}
            onAddQueue={handleAddCallQueue}
            onUpdateQueue={handleUpdateCallQueue}
            onDeleteQueue={handleDeleteCallQueue}
            onDialNumber={handleDialNumber}
          />
        )}

        {/* TAB: SEGRETERIE TELEFONICHE / VOICEMAIL */}
        {activeTab === 'voicemail' && (
          <VoicemailManager
            voicemails={voicemails}
            extensions={extensions}
            onDeleteVoicemail={handleDeleteVoicemail}
            onToggleRead={handleToggleVoicemailRead}
            onAddVoicemail={handleAddVoicemail}
            onDialNumber={handleDialNumber}
          />
        )}

        {/* TAB: ORARI DI LAVORO & IVR FUORI ORARIO */}
        {activeTab === 'business_hours' && (
          <BusinessHoursManager
            config={businessHours}
            onUpdateConfig={setBusinessHours}
            extensions={extensions}
            ringGroups={ringGroups}
            ivrMenus={ivrMenus}
            onAddVoicemail={handleAddVoicemail}
          />
        )}

        {/* TAB 3: DIALPLAN & IVR */}
        {activeTab === 'dialplan' && (
          <DialplanManager
            inboundRoutes={inboundRoutes}
            outboundRoutes={outboundRoutes}
            ivrMenus={ivrMenus}
            ringGroups={ringGroups}
            extensions={extensions}
            onAddInbound={handleAddInbound}
            onDeleteInbound={handleDeleteInbound}
            onAddOutbound={handleAddOutbound}
            onDeleteOutbound={handleDeleteOutbound}
          />
        )}

        {/* TAB 4: CDR LOGS */}
        {activeTab === 'cdr' && <CdrManager cdrRecords={cdrRecords} />}

        {/* TAB 5: ADVANCED REPORTS */}
        {activeTab === 'reports' && <ReportsAnalytics cdrRecords={cdrRecords} />}

        {/* TAB 6: CONTACTS DIRECTORY */}
        {activeTab === 'contacts' && (
          <ContactsManager
            contacts={contacts}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
            onDialNumber={handleDialNumber}
          />
        )}

        {/* TAB 7: MOBILE PUSH NOTIFICATIONS */}
        {activeTab === 'push' && (
          <PushNotificationManager
            extensions={extensions}
            pushLogs={pushLogs}
            onAddPushLog={handleAddPushLog}
            onOpenWebPhoneWithNumber={handleDialNumber}
          />
        )}

        {/* TAB 8: CLUSTER MONITORING */}
        {activeTab === 'cluster' && (
          <div className="space-y-8">
            <ClusterDashboard
              clusterNodes={clusterNodes}
              onTriggerFailover={handleTriggerFailover}
              isFailoverSimulated={isFailoverSimulated}
            />
            {/* Embedded Architecture Documentation */}
            <div className="pt-6 border-t border-slate-800">
              <ClusterDocs />
            </div>
          </div>
        )}

        {/* TAB 9: ROCKY LINUX INSTALLER SCRIPT & TERMINAL */}
        {activeTab === 'installer' && <RockyLinuxInstaller />}

        {/* TAB 10: PHP SERVER BACKEND & ASTERISK CONFIGS */}
        {activeTab === 'php-source' && <PhpBackendViewer />}
              </>
            )}
          </div>

          {/* Footer */}
          <footer className="pt-6 pb-2 text-center text-xs text-slate-500 border-t border-slate-800/80">
            <p>
              Centralino Telefonico Virtuale tipo ICPBX • Motore Asterisk 20 LTS VoIP & WebRTC • Backend PHP 8.2 & Galera Cluster • Rocky Linux Ready
            </p>
          </footer>
        </div>
      </div>

      {/* Floating WebPhone Softphone (Accessible across all tabs except softphone-focused tabs) */}
      {isPhoneOpen && activeTab !== 'webclient' && activeTab !== 'user_dashboard' && activeTab !== 'extension_setup' && (
        <div className="fixed bottom-6 right-6 z-50 shadow-2xl rounded-3xl overflow-hidden border border-slate-700 bg-slate-900 w-[380px] max-h-[85vh] flex flex-col">
          <WebPhone
            isOpen={isPhoneOpen}
            onClose={() => setIsPhoneOpen(false)}
            extensions={extensions}
            onCallFinished={handleCallFinished}
            externalNumberToDial={externalNumberToDial}
            onClearExternalDial={() => setExternalNumberToDial(null)}
            onAddVoicemail={handleAddVoicemail}
            activeExtension={activeExtension}
          />
        </div>
      )}

      {/* Admin Login Modal (Triggered by click on locked admin tabs or top header button) */}
      <AdminAuthModal
        isOpen={showAdminLoginModal}
        onClose={() => {
          setShowAdminLoginModal(false);
          setPendingAdminTab(null);
        }}
        onSuccess={handleAdminLoginSuccess}
        pendingTabLabel={pendingAdminTab || undefined}
        onOpenChangePassword={() => {
          setShowAdminLoginModal(false);
          setShowChangePasswordModal(true);
        }}
      />

      {/* Change Password Modal */}
      <ChangeAdminPasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onPasswordChanged={() => {}}
      />
    </div>
  );
}
