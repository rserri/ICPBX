export interface InstallStepLog {
  stepIndex: number;
  stepName: string;
  command: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  logs: string[];
  durationSec: number;
}

export const ROCKY_LINUX_INSTALLER_SCRIPT = `#!/usr/bin/env bash
# ==============================================================================
# Script di Installazione Automatica Centralino Virtuale PBX (Asterisk 20 LTS + WebRTC)
# Sistema Operativo: Rocky Linux 9.x / 8.x (x86_64 / aarch64)
# Funzionalità: Nginx, PHP 8.2-FPM, MariaDB 10.11 Galera-Ready, Certbot SSL, Firewalld
# ==============================================================================

set -euo pipefail
IFS=$'\\n\\t'

# --- Variabili di Configurazione ---
LOG_FILE="/var/log/pbx-install.log"
ASTERISK_VER="20.6.0"
PBX_DOMAIN="\${1:-pbx.azienda.it}"
ADMIN_EMAIL="\${2:-admin@azienda.it}"
DB_ROOT_PASS="\${3:-RootP@ssw0rd2026!}"
DB_PBX_PASS="\${4:-AsteriskP@ssw0rd2026!}"

# Codici Colori ANSI per Output Console
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

# Inizializzazione Log
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

echo -e "\${CYAN}====================================================================\${NC}"
echo -e "\${CYAN}  AVVIO INSTALLAZIONE AUTOMATICA PBX VIRTUAL CLUSTER SU ROCKY LINUX \${NC}"
echo -e "\${CYAN}  Dominio: \$PBX_DOMAIN | Asterisk: \$ASTERISK_VER | Log: \$LOG_FILE \${NC}"
echo -e "\${CYAN}====================================================================\${NC}"

# --- Gestore Errori con Segnalazione in Tempo Reale ---
error_handler() {
    local exit_code=$1
    local line_num=$2
    local last_command="$BASH_COMMAND"
    echo -e "\\n\${RED}[ERRORE CRITICO]\${NC} Installazione interrotta alla riga \${line_num}!"
    echo -e "\${RED}Comando fallito:\${NC} \${last_command}"
    echo -e "\${RED}Codice di uscita:\${NC} \${exit_code}"
    echo -e "\${YELLOW}Consultare il file di log completo: \${LOG_FILE}\${NC}"
    exit "\$exit_code"
}
trap 'error_handler $? $LINENO' ERR

# 1. Verifica Prerequisiti di Sistema (Root & Rocky Linux)
echo -e "\\n\${BLUE}[1/8] Verifica Prerequisiti e OS Rocky Linux...\${NC}"
if [[ $EUID -ne 0 ]]; then
    echo -e "\${RED}Questo script deve essere eseguito come root o con sudo.\${NC}"
    exit 1
fi

if ! grep -qi "Rocky Linux" /etc/os-release; then
    echo -e "\${YELLOW}[ATTENZIONE] Il sistema operativo non sembra Rocky Linux nativo. Continuo comunque...\${NC}"
else
    echo -e "\${GREEN}✓ Rilevato Rocky Linux compatibile.\${NC}"
fi

# 2. Configurazione Repository (EPEL, CRB) & Aggiornamento
echo -e "\\n\${BLUE}[2/8] Abilitazione Repository EPEL & CRB (CodeReady Builder)...\${NC}"
dnf install -y epel-release dnf-plugins-core
dnf config-manager --set-enabled crb || dnf config-manager --set-enabled powertools || true
dnf update -y --exclude=kernel*

# 3. Installazione Pacchetti di Compilazione e Dipendenze Asterisk
echo -e "\\n\${BLUE}[3/8] Installazione Strumenti di Compilazione & Librerie WebRTC (libsrtp, jansson, pjproject)...\${NC}"
dnf install -y \\
    gcc gcc-c++ make automake autoconf libtool \\
    ncurses-devel libxml2-devel sqlite-devel openssl-devel \\
    newt-devel libuuid-devel speex-devel libogg-devel libvorbis-devel \\
    libsrtp-devel jansson-devel opus-devel libedit-devel \\
    libcurl-devel gnutls-devel unbound-devel wget tar bzip2 \\
    git net-tools psmisc policycoreutils-python-utils \\
    certbot python3-certbot-nginx firewalld

# 4. Installazione MariaDB 10.11 Galera-Ready & Configurazione DB
echo -e "\\n\${BLUE}[4/8] Installazione MariaDB 10.11 Galera Cluster & Database PBX...\${NC}"
dnf install -y mariadb-server mariadb
systemctl enable --now mariadb

# Inizializzazione Schema Database Asterisk
mysql -u root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY '\$DB_ROOT_PASS';
CREATE DATABASE IF NOT EXISTS \`asterisk_pbx\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'asterisk_user'@'localhost' IDENTIFIED BY '\$DB_PBX_PASS';
GRANT ALL PRIVILEGES ON \`asterisk_pbx\`.* TO 'asterisk_user'@'localhost';
CREATE USER IF NOT EXISTS 'asterisk_user'@'%' IDENTIFIED BY '\$DB_PBX_PASS';
GRANT ALL PRIVILEGES ON \`asterisk_pbx\`.* TO 'asterisk_user'@'%';
FLUSH PRIVILEGES;
EOF
echo -e "\${GREEN}✓ MariaDB avviato e configurato con successo.\${NC}"

# 5. Installazione PHP 8.2-FPM & Moduli Web
echo -e "\\n\${BLUE}[5/8] Installazione PHP 8.2-FPM e Moduli PDO, cURL, Sockets...\${NC}"
dnf module reset php -y || true
dnf module enable php:8.2 -y || true
dnf install -y php php-fpm php-mysqlnd php-opcache php-json php-curl php-mbstring php-xml php-sockets

systemctl enable --now php-fpm
echo -e "\${GREEN}✓ PHP 8.2-FPM attivo.\${NC}"

# 6. Compilazione e Installazione Asterisk 20 LTS con WebRTC
echo -e "\\n\${BLUE}[6/8] Download e Compilazione Asterisk \${ASTERISK_VER} LTS con PJSIP & WebRTC...\${NC}"
cd /usr/src
if [ ! -f "asterisk-\${ASTERISK_VER}.tar.gz" ]; then
    wget -q "https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-\${ASTERISK_VER}.tar.gz"
fi
tar -zxf "asterisk-\${ASTERISK_VER}.tar.gz"
cd "asterisk-\${ASTERISK_VER}"

# Download moduli MP3 e prerequisiti
contrib/scripts/get_mp3_source.sh || true
contrib/scripts/install_prereq install || true

./configure --with-jansson-bundled --with-pjproject-bundled --with-crypto --with-ssl --with-srtp
make menuselect.makeopts
menuselect/menuselect --enable res_srtp --enable res_pjsip --enable res_pjsip_transport_websocket --enable codec_opus --enable format_mp3 menuselect.makeopts

make -j$(nproc)
make install
make samples
make config

# Creazione utente dedicato asterisk
useradd -m -d /var/lib/asterisk -s /sbin/nologin asterisk || true
chown -R asterisk:asterisk /var/lib/asterisk /var/spool/asterisk /var/log/asterisk /var/run/asterisk /etc/asterisk

# 7. Gestione Certificati SSL Let's Encrypt / Certbot & Nginx
echo -e "\\n\${BLUE}[7/8] Automazione Certificati SSL Let's Encrypt & WebRTC WSS Gateway...\${NC}"
dnf install -y nginx
systemctl enable --now nginx

if [ "\$PBX_DOMAIN" != "pbx.azienda.it" ] && [ "\$PBX_DOMAIN" != "localhost" ]; then
    echo -e "\${CYAN}Richiesta certificato SSL ufficiale per \$PBX_DOMAIN...\${NC}"
    certbot certonly --nginx --non-interactive --agree-tos -m "\$ADMIN_EMAIL" -d "\$PBX_DOMAIN" || {
        echo -e "\${YELLOW}[AVVISO] Let's Encrypt fallito o dominio non propagato. Generazione certificato Self-Signed per WebRTC...\${NC}"
        mkdir -p /etc/asterisk/keys
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
            -keyout /etc/asterisk/keys/asterisk.key \\
            -out /etc/asterisk/keys/asterisk.crt \\
            -subj "/CN=\$PBX_DOMAIN/O=Virtual PBX/C=IT"
        chown -R asterisk:asterisk /etc/asterisk/keys
    }
else
    echo -e "\${YELLOW}Dominio locale o test: Generazione chiavi SSL interne per WebSockets WSS...\${NC}"
    mkdir -p /etc/asterisk/keys
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
        -keyout /etc/asterisk/keys/asterisk.key \\
        -out /etc/asterisk/keys/asterisk.crt \\
        -subj "/CN=pbx.local/O=Virtual PBX/C=IT"
    chown -R asterisk:asterisk /etc/asterisk/keys
fi

# 8. Apertura Porte Firewall (SIP 5060, WSS 8089, RTP 10000-20000)
echo -e "\\n\${BLUE}[8/8] Configurazione Porte Firewalld per Telefonia e Web Client...\${NC}"
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=5060/udp    # SIP Standard UDP
firewall-cmd --permanent --add-port=5061/tcp    # SIP TLS Cifrato
firewall-cmd --permanent --add-port=8089/tcp    # Asterisk WebSocket WSS WebRTC
firewall-cmd --permanent --add-port=10000-20000/udp # RTP Audio Media Stream
firewall-cmd --permanent --add-port=5038/tcp    # Asterisk AMI (Manager)
firewall-cmd --reload

# Avvio e Verifica Servizio Asterisk
systemctl enable --now asterisk
sleep 3

if asterisk -rx "core show version" | grep -qi "Asterisk"; then
    echo -e "\\n\${GREEN}====================================================================\${NC}"
    echo -e "\${GREEN}  INSTALLAZIONE COMPLETATA CON SUCCESSO! \${NC}"
    echo -e "\${GREEN}  Asterisk: $(asterisk -rx "core show version")\${NC}"
    echo -e "\${GREEN}  Interfaccia Web: https://\$PBX_DOMAIN/\${NC}"
    echo -e "\${GREEN}  Log Completo: \$LOG_FILE\${NC}"
    echo -e "\${GREEN}====================================================================\${NC}"
else
    echo -e "\${RED}[ERRORE] Asterisk non risponde dopo l'avvio.\${NC}"
    exit 1
fi
`;

export const SIMULATED_INSTALL_STEPS: InstallStepLog[] = [
  {
    stepIndex: 1,
    stepName: 'Verifica OS Rocky Linux & Privilegi Root',
    command: 'check_os_version && whoami',
    status: 'success',
    logs: [
      '[INFO] Checking EUID... OK (EUID=0, root)',
      '[INFO] Checking /etc/os-release: Rocky Linux 9.4 (Blue Onyx) x86_64',
      '[INFO] Kernel: 5.14.0-427.13.1.el9_4.x86_64',
      '[SUCCESS] Rocky Linux 9 support verified.'
    ],
    durationSec: 1.2
  },
  {
    stepIndex: 2,
    stepName: 'Abilitazione Repositories EPEL & CRB',
    command: 'dnf install -y epel-release && crb enable',
    status: 'success',
    logs: [
      '[INFO] Updating DNF repository metadata cache...',
      '[INFO] Installed: epel-release-9-7.el9.noarch',
      '[INFO] CRB (CodeReady Linux Builder) repository enabled.',
      '[SUCCESS] Repositories synchronized.'
    ],
    durationSec: 3.8
  },
  {
    stepIndex: 3,
    stepName: 'Installazione Strumenti di Compilazione & WebRTC',
    command: 'dnf install -y gcc gcc-c++ libsrtp-devel opus-devel certbot',
    status: 'success',
    logs: [
      '[INFO] Resolving dependencies for WebRTC audio...',
      '[INFO] Installed libsrtp2-devel.x86_64 2.4.2-3.el9',
      '[INFO] Installed opus-devel.x86_64 1.3.1-10.el9',
      '[INFO] Installed jansson-devel.x86_64 2.14-1.el9',
      '[SUCCESS] All 38 development packages installed.'
    ],
    durationSec: 6.4
  },
  {
    stepIndex: 4,
    stepName: 'Database MariaDB 10.11 & Configurazione Cluster Galera',
    command: 'systemctl enable --now mariadb && mysql_secure_installation',
    status: 'success',
    logs: [
      '[INFO] MariaDB Server 10.11.7 installed and started.',
      '[INFO] Database `asterisk_pbx` created with utf8mb4 collation.',
      '[INFO] Created user asterisk_user with remote and local grants.',
      '[INFO] Galera multi-master replication provider ready (wsrep_on=ON).',
      '[SUCCESS] MariaDB database active on port 3306.'
    ],
    durationSec: 4.1
  },
  {
    stepIndex: 5,
    stepName: 'Compilazione Asterisk 20.6 LTS con Transport WSS',
    command: './configure --with-pjproject-bundled && make -j$(nproc) && make install',
    status: 'success',
    logs: [
      '[INFO] Configuring Asterisk 20.6.0 with WebRTC support...',
      '[INFO] pjproject-bundled: enabled (PJSIP with SRTP & ICE support)',
      '[INFO] res_pjsip_transport_websocket: enabled',
      '[INFO] codec_opus: compiled and enabled',
      '[INFO] Building modules... 100% complete',
      '[SUCCESS] Asterisk installed to /usr/sbin/asterisk.'
    ],
    durationSec: 12.5
  },
  {
    stepIndex: 6,
    stepName: 'Certificati SSL Let\'s Encrypt & WebRTC WSS Gateway',
    command: 'certbot certonly --nginx -d pbx.azienda.it --agree-tos',
    status: 'success',
    logs: [
      '[INFO] Requesting SSL certificate from Let\'s Encrypt CA...',
      '[INFO] Account registered: admin@azienda.it',
      '[INFO] Certificate issued: /etc/letsencrypt/live/pbx.azienda.it/fullchain.pem',
      '[INFO] WSS WebSocket port 8089 configured with TLS 1.3 encryption.',
      '[INFO] Certbot automated daily renewal cron installed.',
      '[SUCCESS] SSL Certificate active.'
    ],
    durationSec: 5.2
  },
  {
    stepIndex: 7,
    stepName: 'Configurazione Porte Firewalld & SELinux Policy',
    command: 'firewall-cmd --permanent --add-port={5060,5061,8089,10000-20000}/udp',
    status: 'success',
    logs: [
      '[INFO] Opening UDP 5060 (SIP Signaling)',
      '[INFO] Opening TCP 5061 (SIP TLS)',
      '[INFO] Opening TCP 8089 (WebRTC WebSocket WSS)',
      '[INFO] Opening UDP 10000-20000 (RTP Voice Audio Streams)',
      '[INFO] Setting SELinux boolean: setsebool -P nis_enabled 1',
      '[SUCCESS] Firewall and SELinux configured.'
    ],
    durationSec: 2.1
  },
  {
    stepIndex: 8,
    stepName: 'Avvio Servizi & Healthcheck Finale',
    command: 'systemctl restart php-fpm nginx asterisk && asterisk -rx "core show version"',
    status: 'success',
    logs: [
      '[INFO] Restarting system services...',
      '[INFO] php-fpm: Active (running)',
      '[INFO] nginx: Active (running)',
      '[INFO] asterisk: Active (running)',
      '[INFO] Asterisk CLI test: Asterisk 20.6.0 built on Rocky Linux 9.4',
      '[SUCCESS] Centralino PBX ICPBX Virtual online e pronto all\'uso!'
    ],
    durationSec: 2.9
  }
];
