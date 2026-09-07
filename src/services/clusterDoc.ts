export interface ClusterDocSection {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  codeSnippet?: string;
  codeLanguage?: string;
}

export const CLUSTER_DOCUMENTATION: ClusterDocSection[] = [
  {
    id: 'arch-overview',
    title: '1. Architettura Enterprise ad Alta Affidabilità (HA)',
    subtitle: 'Topologia Multi-Nodo Active/Standby con Bilanciamento WebRTC',
    content: `Il centralino virtuale supporta una topologia distribuita scalabile su Rocky Linux 9. L'architettura è composta da:
- **Virtual IP (VIP) 192.168.10.100**: Indirizzo IP galleggiante condiviso gestito da Keepalived / Pacemaker che punta al nodo master primario.
- **Node 1 (PBX Primario - 192.168.10.101)**: Esegue Asterisk 20 LTS, PHP 8.2-FPM per le API, Nginx Web Server, e un nodo MariaDB Galera Multi-Master.
- **Node 2 (PBX Secondario - 192.168.10.102)**: Hot-Standby sincronizzato in tempo reale tramite Galera Cluster (dati interni, CDR, dialplan) e Corosync. In caso di mancato heartbeat (< 1500ms), assume istantaneamente il VIP.
- **Node 3 (Edge Gateway WebRTC & SBC - 192.168.10.103)**: Server Kamailio con modulo dispatcher + Coturn TURN/STUN per instradamento SIP over WebSockets e attraversamento NAT/Firewall.`,
    codeSnippet: `+-------------------------------------------------------------+
|                  CLIENT WEBRTC & SIP PHONES                 |
+-------------------------------------------------------------+
                               |
                               v
               [ Virtual IP: 192.168.10.100 ]
              (Keepalived / VRRP Healthcheck)
                               |
          +--------------------+--------------------+
          |                                         |
          v                                         v
+-----------------------+                 +-----------------------+
|  NODE 1: PBX PRIMARY  |   Corosync/Sync | NODE 2: PBX STANDBY   |
|  - Asterisk 20 LTS    |<===============>| - Asterisk 20 LTS     |
|  - Nginx + PHP 8.2    |   Galera WSREP  | - Nginx + PHP 8.2     |
|  - MariaDB Galera M1  |                 | - MariaDB Galera M2   |
+-----------------------+                 +-----------------------+
          |                                         |
          +--------------------+--------------------+
                               |
                               v
+-------------------------------------------------------------+
|  NODE 3: EDGE WebRTC / KAMAILIO SIP DISPATCHER + COTURN     |
+-------------------------------------------------------------+`,
    codeLanguage: 'text'
  },
  {
    id: 'corosync-keepalived',
    title: '2. Configurazione Keepalived VRRP e Virtual IP (VIP)',
    subtitle: 'Failover automatico con switch in meno di 1 secondo',
    content: `Per garantire che telefoni VoIP, client WebRTC e telefoni cellulari rimangano sempre collegati allo stesso IP senza dover riconfigurare i client, viene configurato Keepalived con script di controllo dello stato del processo Asterisk.`,
    codeSnippet: `# /etc/keepalived/keepalived.conf su Node 1 (Master)
vrrp_script check_asterisk {
    script "/usr/bin/asterisk -rx 'core show version' > /dev/null 2>&1"
    interval 2
    weight 2
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
        auth_pass PBXClusterVrrp2026!
    }
    virtual_ipaddress {
        192.168.10.100/24 dev eth0 label eth0:vip
    }
    track_script {
        check_asterisk
    }
}`,
    codeLanguage: 'bash'
  },
  {
    id: 'galera-cluster',
    title: '3. Configurazione Database Multi-Master MariaDB Galera',
    subtitle: 'Sincronizzazione bidirezionale sincrona a latenza zero per Interni e CDR',
    content: `Tutti i nodi condividono le tabelle degli interni, dialplan, rubrica aziendale e registrazioni CDR. La replica Galera wsrep garantisce che ogni modifica apportata sul pannello web di un nodo sia immediatamente visibile su tutti gli altri senza conflitti.`,
    codeSnippet: `# /etc/my.cnf.d/galera.cnf
[mysqld]
binlog_format=ROW
default_storage_engine=InnoDB
innodb_autoinc_lock_mode=2
bind-address=0.0.0.0

# Galera Provider Configuration
wsrep_on=ON
wsrep_provider=/usr/lib64/galera/libgalera_smm.so
wsrep_cluster_name="pbx_galera_cluster"
wsrep_cluster_address="gcomm://192.168.10.101,192.168.10.102"
wsrep_node_address="192.168.10.101"
wsrep_node_name="pbx-node01"
wsrep_sst_method=mariabackup
wsrep_sst_auth="sst_user:SstP@ssw0rd2026!"`,
    codeLanguage: 'ini'
  },
  {
    id: 'kamailio-webrtc',
    title: '4. Configurazione Kamailio WebRTC Gateway & SIP Dispatcher',
    subtitle: 'Gestione del protocollo WSS (WebSockets) e bilanciamento carichi',
    content: `Kamailio agisce come proxy SIP/WebSockets di frontiera. Riceve le connessioni WebSocket sicure WSS da browser Chrome, Safari, Firefox ed effettua il transcodifica SIP su UDP/TCP verso i nodi Asterisk locali.`,
    codeSnippet: `# /etc/kamailio/kamailio.cfg (Estratto WebRTC WSS)
listen=tls:192.168.10.103:8089
tcp_accept_no_cl=yes
enable_tls=yes

route[WEBRTC_WSS] {
    if (proto == WS || proto == WSS) {
        # Gestione Origin e CORS
        if (!websocket_handle_handshake()) {
            t_reply("400", "Bad WebSocket Request");
            exit;
        }
        # Inoltro al pool Asterisk tramite dispatcher
        ds_select_dst("1", "4"); # Algoritmo Round-Robin o Failover
        t_relay();
    }
}`,
    codeLanguage: 'c'
  },
  {
    id: 'push-service-mobile',
    title: '5. Integrazione Notifiche Push (iOS CallKit & Android FCM)',
    subtitle: 'Risveglio istantaneo dell\'app mobile per preservare la batteria',
    content: `Sui sistemi mobile (iOS e Android), le connessioni SIP persistenti in background consumano la batteria e vengono chiuse dal sistema operativo.
Il nostro centralino implementa la tecnologia Push-to-Talk / Wake-on-Call:
1. Quando arriva una chiamata per l'interno, Asterisk invoca lo script AGI \`push_notify.php\`.
2. Viene inviata una notifica ad altissima priorità ad Apple APNs (PushKit) o Firebase FCM v1.
3. Lo smartphone si risveglia ed espone l'interfaccia nativa di chiamata (iOS CallKit / Android Telecom).
4. L'app mobile apre la connessione WebRTC SIP in meno di 400ms e risponde alla chiamata.`,
    codeSnippet: `; /etc/asterisk/extensions.conf
exten => _1XX,1,NoOp(Invio Wake-up Push a \${EXTEN})
 same => n,AGI(push_notify.php,\${EXTEN},\${CALLERID(num)},\${CALLERID(name)},\${UNIQUEID})
 same => n,Dial(PJSIP/\${EXTEN},30,rtT)`,
    codeLanguage: 'ini'
  }
];

export const CLUSTER_DOCUMENTATION_MARKDOWN = `# GUIDA TECNICA DEPLOYMENT CLUSTER PBX ICPBX (ROCKY LINUX 9)
# Autore: Team Ingegneria Sistemi VoIP & Asterisk
# Versione: 2026.1 LTS - Alta Affidabilità (HA)

## 1. Schema IP e Architettura Cluster
- Virtual IP (VIP): 192.168.10.100 (Keepalived VRRP)
- PBX Node 1 (Master): 192.168.10.101 (Asterisk 20 + MariaDB Galera)
- PBX Node 2 (Standby): 192.168.10.102 (Asterisk 20 + MariaDB Galera)
- WebRTC Edge Gateway: 192.168.10.103 (Kamailio WSS + Coturn TURN)

## 2. Configurazione Galera Multi-Master
Tutti i nodi condividono in modo sincrono le tabelle ps_endpoints, ps_auths, ps_aors e cdr.
Bootstrap sul primo nodo: galera_new_cluster

## 3. Failover Sub-Secondo Keepalived
Script di monitoraggio Asterisk:
vrrp_script check_asterisk {
    script "/usr/sbin/asterisk -rx 'core ping' > /dev/null 2>&1"
    interval 2
    weight 10
}

## 4. WebRTC TLS & Certbot
I certificati SSL sono rinnovati con Let's Encrypt Certbot.
Il transport WSS su porta 8089 utilizza certificati validi per WebRTC senza avvisi di sicurezza.

## 5. Push Notifications iOS & Android
Script AGI push_notify.php invia notifiche APNs VoIP ed FCM v1 ad alta priorità per risvegliare l'app mobile prima dello squillo SIP.
`;

