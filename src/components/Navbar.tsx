import React, { useState } from 'react';
import {
  PhoneCall,
  Server,
  Activity,
  ShieldCheck,
  Bell,
  Sparkles,
  ChevronDown,
  Globe,
  Radio,
  Clock,
  Menu,
  X,
  Voicemail,
  UserCheck,
  Lock,
  Unlock,
  Key,
  LogOut,
  Shield,
  Sun,
  Moon,
  Contrast,
  Check,
  Laptop,
  Headphones
} from 'lucide-react';
import { ClusterNode, DashboardTheme, Extension } from '../types/pbx';

export interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isPhoneOpen: boolean;
  setIsPhoneOpen: (open: boolean) => void;
  isCalling: boolean;
  clusterNodes: ClusterNode[];
  userStatus: 'online' | 'away' | 'dnd' | 'meeting';
  setUserStatus: (status: 'online' | 'away' | 'dnd' | 'meeting') => void;
  mobileSidebarOpen?: boolean;
  setMobileSidebarOpen?: (open: boolean) => void;
  unreadVoicemails?: number;
  isAdminAuthenticated: boolean;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
  onOpenChangePassword: () => void;
  theme?: DashboardTheme;
  setTheme?: (theme: DashboardTheme) => void;
  activeExtension?: Extension;
  onOpenExtensionSelector?: () => void;
}

export const Sidebar: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  unreadVoicemails?: number;
  isAdminAuthenticated: boolean;
  onRequireAdminAuth: (tabId: string) => void;
  onAdminLogout: () => void;
}> = ({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
  unreadVoicemails = 0,
  isAdminAuthenticated,
  onRequireAdminAuth,
  onAdminLogout
}) => {
  // Area Utenti Semplici (Accesso Libero Postazione di Lavoro)
  const userItems = [
    { id: 'extension_setup', label: 'Selezione Interno PC', icon: Laptop, isPublic: true },
    { id: 'user_dashboard', label: 'Web Client Utenti', icon: UserCheck, isPublic: true }
  ];

  // Dashboard Principale Amministrazione PBX
  const adminManagementItems = [
    { id: 'cluster', label: 'Dashboard Cluster & KPI', icon: Server },
    { id: 'extensions', label: 'Interni & SIP', icon: Radio },
    { id: 'call_queues', label: 'Code di Chiamata', icon: Headphones },
    { id: 'dialplan', label: 'Dialplan & IVR', icon: Activity },
    { id: 'business_hours', label: 'Orari & IVR Notturno', icon: Clock },
    { id: 'voicemail', label: 'Segreterie Vocali', icon: Voicemail, badge: unreadVoicemails },
    { id: 'cdr', label: 'Registro CDR', icon: Clock },
    { id: 'contacts', label: 'Rubrica Contatti', icon: Globe },
    { id: 'webclient', label: 'Softphone Avanzato', icon: PhoneCall }
  ];

  const adminInfrastructureItems = [
    { id: 'reports', label: 'Reportistica & Analisi', icon: Activity },
    { id: 'push', label: 'Notifiche Mobile', icon: Bell },
    { id: 'installer', label: 'Installer Rocky Linux', icon: ShieldCheck },
    { id: 'php-source', label: 'Server PHP & Asterisk', icon: Sparkles }
  ];

  const handleItemClick = (id: string, isPublic: boolean = false) => {
    if (isPublic || isAdminAuthenticated) {
      setActiveTab(id);
      if (setMobileOpen) setMobileOpen(false);
    } else {
      onRequireAdminAuth(id);
      if (setMobileOpen) setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen && setMobileOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-sky-500 rounded flex items-center justify-center font-bold text-slate-950 shadow-sm">
                V
              </div>
              <span className="text-xl font-semibold tracking-tight text-white">VOX-CORE</span>
            </div>
            <div className="mt-1 text-[10px] text-sky-400 font-mono uppercase tracking-widest">
              PBX Cluster v3.12 • Asterisk 20
            </div>
          </div>
          {setMobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 p-3.5 space-y-4 text-sm overflow-y-auto">
          {/* Section: Area Utenti Semplici */}
          <div>
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center justify-between">
              <span>Area Utenti</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">Libero</span>
            </div>
            {userItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => handleItemClick(item.id, true)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left text-sm ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 font-medium border border-sky-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-sky-400" />
                  <span className="truncate flex-1 font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Section: Dashboard Principale (Amministrazione PBX) */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className={`w-3 h-3 ${isAdminAuthenticated ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span>Dashboard Principale</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 font-bold rounded flex items-center gap-1 ${
                  isAdminAuthenticated
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                }`}
              >
                {isAdminAuthenticated ? (
                  <>
                    <Unlock className="w-2.5 h-2.5" />
                    <span>Amministratore</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-2.5 h-2.5" />
                    <span>Protetto</span>
                  </>
                )}
              </span>
            </div>

            <div className="space-y-0.5">
              {adminManagementItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => handleItemClick(item.id, false)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left text-xs ${
                      isActive
                        ? 'bg-slate-800 text-sky-400 font-semibold border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {Boolean(item.badge && item.badge > 0) && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-500 text-white rounded-full leading-none">
                        {item.badge}
                      </span>
                    )}
                    {!isAdminAuthenticated && (
                      <Lock className="w-3 h-3 text-slate-500 shrink-0" title="Accesso protetto: Nome utente Amministratore" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Infrastructure */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2 px-2 flex items-center justify-between">
              <span>Infrastruttura & Script</span>
              {!isAdminAuthenticated && <Lock className="w-2.5 h-2.5 text-slate-500" />}
            </div>
            <div className="space-y-0.5">
              {adminInfrastructureItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => handleItemClick(item.id, false)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left text-xs ${
                      isActive
                        ? 'bg-slate-800 text-sky-400 font-semibold border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {!isAdminAuthenticated && (
                      <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Administrator Auth Card in Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isAdminAuthenticated ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-[11px] font-semibold text-slate-300">
                  Utente: Amministratore
                </span>
              </div>
            </div>

            {isAdminAuthenticated ? (
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-sidebar-admin-logout"
                  onClick={onAdminLogout}
                  className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-slate-800 hover:border-rose-800/60 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition"
                  title="Disconnetti e blocca la Dashboard Principale"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Disconnetti</span>
                </button>
              </div>
            ) : (
              <button
                id="btn-sidebar-admin-login"
                onClick={() => onRequireAdminAuth('cluster')}
                className="w-full py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <Lock className="w-3 h-3" />
                <span>Sblocca con Password</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export const TopHeader: React.FC<{
  clusterNodes: ClusterNode[];
  userStatus: 'online' | 'away' | 'dnd' | 'meeting';
  setUserStatus: (status: 'online' | 'away' | 'dnd' | 'meeting') => void;
  isPhoneOpen: boolean;
  setIsPhoneOpen: (open: boolean) => void;
  isCalling: boolean;
  onToggleMobileSidebar: () => void;
  isAdminAuthenticated: boolean;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
  onOpenChangePassword: () => void;
  theme?: DashboardTheme;
  setTheme?: (theme: DashboardTheme) => void;
  activeExtension?: Extension;
  onOpenExtensionSelector?: () => void;
}> = ({
  clusterNodes,
  userStatus,
  setUserStatus,
  isPhoneOpen,
  setIsPhoneOpen,
  isCalling,
  onToggleMobileSidebar,
  isAdminAuthenticated,
  onOpenAdminLogin,
  onAdminLogout,
  onOpenChangePassword,
  theme = 'dark',
  setTheme,
  activeExtension,
  onOpenExtensionSelector
}) => {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const activeMasterNode = clusterNodes.find((n) => n.vipAssigned) || clusterNodes[0];

  const statusConfig = {
    online: { label: 'Disponibile', color: 'bg-emerald-500', text: 'text-emerald-400' },
    away: { label: 'Assente', color: 'bg-amber-500', text: 'text-amber-400' },
    dnd: { label: 'Non Disturbare (DND)', color: 'bg-rose-500', text: 'text-rose-400' },
    meeting: { label: 'In Riunione', color: 'bg-indigo-500', text: 'text-indigo-400' }
  };

  const themeConfig = {
    dark: { label: 'Dark', icon: Moon, color: 'text-sky-400', desc: 'Predefinita' },
    light: { label: 'Light', icon: Sun, color: 'text-amber-400', desc: 'Sfondo chiaro' },
    'high-contrast': { label: 'High-Contrast', icon: Contrast, color: 'text-yellow-300', desc: 'Alto contrasto' }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
      {/* Left Info Columns */}
      <div className="flex items-center gap-4 sm:gap-8">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md bg-slate-800 border border-slate-700"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            Server Engine
          </span>
          <span className="text-xs sm:text-sm font-medium text-slate-200">
            Asterisk v20.4 LTS
          </span>
        </div>

        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            Database Cluster
          </span>
          <span className="text-xs sm:text-sm font-medium text-slate-200">
            MariaDB Galera Synced
          </span>
        </div>

        <div className="hidden md:flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            Virtual IP HA
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs sm:text-sm font-medium text-emerald-400 font-mono">
              192.168.10.100 ({activeMasterNode?.name || 'Node 1'})
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Connected Computer Extension Station Button */}
        {activeExtension && (
          <button
            id="btn-top-active-extension"
            onClick={onOpenExtensionSelector}
            title={`Postazione collegata all'Interno ${activeExtension.number} (${activeExtension.name}). Clicca per cambiare interno.`}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-xs text-slate-200 transition group"
          >
            <Laptop className="w-3.5 h-3.5 text-sky-400 group-hover:text-sky-300" />
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sky-400 font-mono">Int. {activeExtension.number}</span>
              <span className="hidden xl:inline text-slate-300 truncate max-w-[100px]">
                {activeExtension.name.split(' ')[0]}
              </span>
            </div>
            <span className="text-[10px] px-1 py-0.2 bg-slate-900 text-slate-400 rounded border border-slate-700 hidden sm:inline group-hover:text-white">
              Cambia
            </span>
          </button>
        )}

        {/* Softphone Drawer Button */}
        <button
          id="btn-toggle-webphone"
          onClick={() => setIsPhoneOpen(!isPhoneOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm ${
            isCalling
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
              : isPhoneOpen
              ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
              : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isCalling ? 'Chiamata Attiva' : isPhoneOpen ? 'Web Phone' : 'Apri Phone'}
          </span>
        </button>

        {/* Status Dropdown */}
        <div className="relative">
          <button
            id="btn-status-dropdown"
            onClick={() => {
              setStatusMenuOpen(!statusMenuOpen);
              setThemeMenuOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition"
          >
            <span className={`w-2 h-2 rounded-full ${statusConfig[userStatus].color}`}></span>
            <span className="font-medium hidden md:inline">
              Int. {activeExtension ? activeExtension.number : '101'} - {statusConfig[userStatus].label}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {statusMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
              <div className="px-3 py-1.5 border-b border-slate-700 text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>Stato Int. {activeExtension ? activeExtension.number : '101'}</span>
                {activeExtension?.name && (
                  <span className="text-[9px] text-slate-500 font-sans">{activeExtension.name.split(' ')[0]}</span>
                )}
              </div>
              {(['online', 'away', 'dnd', 'meeting'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setUserStatus(st);
                    setStatusMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                >
                  <span className={`w-2 h-2 rounded-full ${statusConfig[st].color}`}></span>
                  <span>{statusConfig[st].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dashboard Theme Selector Dropdown */}
        {setTheme && (
          <div className="relative">
            <button
              id="btn-theme-dropdown"
              onClick={() => {
                setThemeMenuOpen(!themeMenuOpen);
                setStatusMenuOpen(false);
              }}
              title={`Tema attuale: ${themeConfig[theme].label} (${themeConfig[theme].desc})`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition"
            >
              {React.createElement(themeConfig[theme].icon, {
                className: `w-3.5 h-3.5 ${themeConfig[theme].color}`
              })}
              <span className="font-medium hidden lg:inline">{themeConfig[theme].label}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {themeMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-slate-700 text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>Tema Dashboard Web</span>
                  <span className="text-[9px] text-slate-500 font-mono">Salva in LocalStorage</span>
                </div>
                {(['dark', 'light', 'high-contrast'] as const).map((mode) => {
                  const cfg = themeConfig[mode];
                  const Icon = cfg.icon;
                  const isSelected = theme === mode;
                  return (
                    <button
                      key={mode}
                      id={`theme-option-${mode}`}
                      onClick={() => {
                        setTheme(mode);
                        setThemeMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition ${
                        isSelected ? 'bg-slate-700/80 font-semibold text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{cfg.label}</span>
                            {mode === 'dark' && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-700">
                                Predefinito
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-normal">{cfg.desc}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Admin Login / Logout Controls */}
        {isAdminAuthenticated ? (
          <div className="flex items-center gap-1.5 pl-1">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/80 border border-emerald-700/70 rounded-lg text-xs"
              title="Autenticato come Amministratore (accesso completo alla dashboard principale)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-semibold hidden md:inline">Amministratore</span>
            </div>

            <button
              id="btn-top-change-admin-pw"
              onClick={onOpenChangePassword}
              title="Modifica password Amministratore"
              className="p-1.5 text-slate-400 hover:text-sky-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
            >
              <Key className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-top-admin-logout"
              onClick={onAdminLogout}
              title="Disconnetti e blocca dashboard principale"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-medium transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Esci</span>
            </button>
          </div>
        ) : (
          <button
            id="btn-top-admin-login"
            onClick={onOpenAdminLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 rounded-lg text-xs font-semibold transition"
            title="L'accesso alla dashboard principale richiede la password per l'utente Amministratore"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Accedi (Amministratore)</span>
          </button>
        )}
      </div>
    </header>
  );
};

export const Navbar: React.FC<NavbarProps> = (props) => {
  return (
    <TopHeader
      clusterNodes={props.clusterNodes}
      userStatus={props.userStatus}
      setUserStatus={props.setUserStatus}
      isPhoneOpen={props.isPhoneOpen}
      setIsPhoneOpen={props.setIsPhoneOpen}
      isCalling={props.isCalling}
      onToggleMobileSidebar={() => {
        if (props.setMobileSidebarOpen) {
          props.setMobileSidebarOpen(!props.mobileSidebarOpen);
        }
      }}
      isAdminAuthenticated={props.isAdminAuthenticated}
      onOpenAdminLogin={props.onOpenAdminLogin}
      onAdminLogout={props.onAdminLogout}
      onOpenChangePassword={props.onOpenChangePassword}
      theme={props.theme}
      setTheme={props.setTheme}
      activeExtension={props.activeExtension}
      onOpenExtensionSelector={props.onOpenExtensionSelector}
    />
  );
};


