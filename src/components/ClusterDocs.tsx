import React, { useState } from 'react';
import {
  BookOpen,
  Server,
  Database,
  Shield,
  Radio,
  Bell,
  Lock,
  Copy,
  Check,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { CLUSTER_DOCUMENTATION_MARKDOWN } from '../services/clusterDoc';

export const ClusterDocs: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<string>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sections = [
    { id: 'overview', title: '1. Architettura & Schema IP', icon: Server },
    { id: 'galera', title: '2. MariaDB Galera Multi-Master', icon: Database },
    { id: 'keepalived', title: '3. Keepalived & Virtual IP (VIP)', icon: Shield },
    { id: 'kamailio', title: '4. Kamailio & WebRTC Edge Gateway', icon: Radio },
    { id: 'push', title: '5. Notifiche Push (iOS & Android)', icon: Bell },
    { id: 'ssl', title: '6. Gestione Certificati SSL & DTLS', icon: Lock }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <span>Guida Ufficiale Cluster PBX Alta Affidabilità</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manuale di ingegneria dei sistemi per il deployment multi-nodo in cluster attivo-passivo e bilanciamento WebRTC.
          </p>
        </div>

        <button
          onClick={() => handleCopy(CLUSTER_DOCUMENTATION_MARKDOWN, 'full-doc')}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow transition"
        >
          {copiedKey === 'full-doc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copiedKey === 'full-doc' ? 'Documento Copiato!' : 'Copia Manuale Completo'}</span>
        </button>
      </div>

      {/* Two Column Layout: Navigation & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = selectedSection === sec.id;

            return (
              <button
                key={sec.id}
                onClick={() => setSelectedSection(sec.id)}
                className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold transition ${
                  isActive
                    ? 'bg-sky-600/20 border-sky-500/50 text-sky-300 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span>{sec.title}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-600'}`} />
              </button>
            );
          })}
        </div>

        {/* Content Pane (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-300 text-xs space-y-5 leading-relaxed">
          {selectedSection === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Server className="w-5 h-5 text-sky-400" />
                <span>1. Architettura di Rete e Schema d'Indirizzamento IP</span>
              </h3>
              <p>
                Il cluster del centralino virtuale è progettato secondo i principi di **ridondanza N+1** e **assenza di singolo punto di rottura (SPOF)**.
                Tutti i telefoni IP fisici e i client WebRTC nel browser dialogano con un **Virtual IP (VIP)** gestito da Keepalived con failover in meno di 1 secondo.
              </p>

              <div className="overflow-x-auto bg-slate-950 p-4 rounded-xl border border-slate-800">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-2">Hostname</th>
                      <th className="pb-2">Indirizzo IP</th>
                      <th className="pb-2">Ruolo Cluster</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-2 text-sky-400 font-bold">pbx-cluster.azienda.it</td>
                      <td className="py-2 text-emerald-400 font-bold">192.168.10.100</td>
                      <td className="py-2">Virtual IP (VIP VRRP Keepalived)</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-200">pbx-node01.azienda.it</td>
                      <td className="py-2">192.168.10.101</td>
                      <td className="py-2">Nodo Asterisk Primario + Galera Master 1</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-200">pbx-node02.azienda.it</td>
                      <td className="py-2">192.168.10.102</td>
                      <td className="py-2">Nodo Asterisk Secondario + Galera Master 2</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-200">webrtc-edge.azienda.it</td>
                      <td className="py-2">192.168.10.103</td>
                      <td className="py-2">Kamailio Edge Proxy + Coturn STUN/TURN</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedSection === 'galera' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Database className="w-5 h-5 text-sky-400" />
                <span>2. MariaDB Galera Multi-Master Replication</span>
              </h3>
              <p>
                La persistenza degli interni telefonici, delle registrazioni PJSIP e del registro chiamate CDR
                è sincronizzata in tempo reale tra tutti i nodi tramite Galera Cluster WSREP.
              </p>

              <div className="relative">
                <pre className="bg-slate-950 p-4 rounded-xl font-mono text-[11px] text-emerald-400 border border-slate-800 overflow-x-auto">
{`# /etc/my.cnf.d/galera.cnf
[mysqld]
binlog_format=ROW
default-storage-engine=innodb
innodb_autoinc_lock_mode=2

# WSREP Cluster Settings
wsrep_on=ON
wsrep_provider=/usr/lib64/galera-4/libgalera_smm.so
wsrep_cluster_name="pbx_galera_cluster"
wsrep_cluster_address="gcomm://192.168.10.101,192.168.10.102,192.168.10.103"
wsrep_sst_method=mariabackup
wsrep_node_address="192.168.10.101"
wsrep_node_name="pbx-node01"`}
                </pre>
                <button
                  onClick={() =>
                    handleCopy(
                      `wsrep_cluster_address="gcomm://192.168.10.101,192.168.10.102,192.168.10.103"`,
                      'galera'
                    )
                  }
                  className="absolute top-2.5 right-2.5 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  {copiedKey === 'galera' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-slate-300">
                <strong>Comando bootstrap iniziale:</strong> Sul primo nodo eseguire solo la prima volta:
                <code className="text-sky-300 block font-mono mt-1">galera_new_cluster</code>
              </div>
            </div>
          )}

          {selectedSection === 'keepalived' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Shield className="w-5 h-5 text-sky-400" />
                <span>3. Keepalived & Virtual IP (Failover Sub-Secondo)</span>
              </h3>
              <p>
                Keepalived verifica continuamente la risposta del demone Asterisk tramite uno script periodico.
                Se Asterisk non risponde su `127.0.0.1:5060` o tramite AMI porta `5038`, il VIP migra istantaneamente sul nodo standby.
              </p>

              <pre className="bg-slate-950 p-4 rounded-xl font-mono text-[11px] text-sky-400 border border-slate-800 overflow-x-auto">
{`# /etc/keepalived/keepalived.conf
vrrp_script check_asterisk {
    script "/usr/sbin/asterisk -rx 'core ping' > /dev/null 2>&1"
    interval 2
    weight 10
    fall 2
    rise 2
}

vrrp_instance VI_PBX {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass PbxSecretCluster2024!
    }
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:vip
    }
    track_script {
        check_asterisk
    }
}`}
              </pre>
            </div>
          )}

          {selectedSection === 'kamailio' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Radio className="w-5 h-5 text-sky-400" />
                <span>4. Kamailio & WebRTC Edge Gateway (WSS porta 8089)</span>
              </h3>
              <p>
                I browser web non possono inviare pacchetti UDP SIP nativi; utilizzano WebSocket sicuri (WSS/TLS).
                Kamailio funge da terminatore WSS ad alte prestazioni e ridistribuisce il traffico SIP verso i nodi Asterisk di backend tramite il modulo `dispatcher`.
              </p>
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-slate-300">
                <strong>Coturn STUN/TURN:</strong> Configurato per l'attraversamento NAT simmetrici e firewall aziendali restrittivi (porte 3478 e 5349 TLS).
              </div>
            </div>
          )}

          {selectedSection === 'push' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Bell className="w-5 h-5 text-sky-400" />
                <span>5. Flusso Notifiche Push (Apple APNs & Google FCM)</span>
              </h3>
              <p>
                Quando arriva una chiamata per un interno mobile, Asterisk sospende temporaneamente il dialplan nel modulo AGI:
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
                <li>Asterisk esegue <code className="text-sky-300 font-mono">push_notify.php</code> passando interno e dati chiamante.</li>
                <li>Lo script AGI invia un payload push con priorità massima ("VoIP Push" su APNs o "high priority" su FCM).</li>
                <li>Il telefono mobile dell'utente si risveglia in background ed esegue la registrazione SIP via WebRTC / PJSIP.</li>
                <li>Asterisk fa squillare l'interno registrato. Se l'utente risponde, la chiamata vocale viene instaurata.</li>
              </ol>
            </div>
          )}

          {selectedSection === 'ssl' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Lock className="w-5 h-5 text-sky-400" />
                <span>6. Gestione Certificati SSL & DTLS-SRTP</span>
              </h3>
              <p>
                WebRTC richiede obbligatoriamente la crittografia dei flussi multimediali tramite **DTLS (Datagram Transport Layer Security)** e **SRTP**.
                I certificati SSL sono emessi automaticamente da Let's Encrypt Certbot con rinnovo automatico `certbot.timer`.
              </p>
              <pre className="bg-slate-950 p-4 rounded-xl font-mono text-[11px] text-amber-300 border border-slate-800 overflow-x-auto">
{`# Hook post-rinnovo Certbot per Asterisk (/etc/letsencrypt/renewal-hooks/deploy/asterisk.sh)
#!/bin/bash
cat /etc/letsencrypt/live/pbx.azienda.it/fullchain.pem > /etc/asterisk/keys/asterisk.crt
cat /etc/letsencrypt/live/pbx.azienda.it/privkey.pem > /etc/asterisk/keys/asterisk.key
chown asterisk:asterisk /etc/asterisk/keys/asterisk.*
chmod 600 /etc/asterisk/keys/asterisk.key
asterisk -rx "core reload"`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
