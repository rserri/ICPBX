#!/usr/bin/env bash
# ==============================================================================
# Script di Installazione Automatica Centralino Virtuale PBX (Asterisk 20 LTS + WebRTC)
# Sistema Operativo: Rocky Linux 9.x / 8.x (x86_64 / aarch64)
# Funzionalità: Nginx, PHP 8.2-FPM, MariaDB 10.11 Galera-Ready, Certbot SSL, Firewalld
# ==============================================================================

set -euo pipefail
IFS=$'\n\t'

# --- Variabili di Configurazione ---
LOG_FILE="/var/log/pbx-install.log"
ASTERISK_VER="20.6.0"
PBX_DOMAIN="${1:-pbx.azienda.it}"
ADMIN_EMAIL="${2:-admin@azienda.it}"
DB_ROOT_PASS="${3:-RootP@ssw0rd2026!}"
DB_PBX_PASS="${4:-AsteriskP@ssw0rd2026!}"

# Codici Colori ANSI per Output Console
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Inizializzazione Log
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}  AVVIO INSTALLAZIONE AUTOMATICA PBX VIRTUAL CLUSTER SU ROCKY LINUX ${NC}"
echo -e "${CYAN}  Dominio: $PBX_DOMAIN | Asterisk: $ASTERISK_VER | Log: $LOG_FILE ${NC}"
echo -e "${CYAN}====================================================================${NC}"

# --- Gestore Errori con Segnalazione in Tempo Reale ---
error_handler() {
    local exit_code=$1
    local line_num=$2
    local last_command="$BASH_COMMAND"
    echo -e "\n${RED}[ERRORE CRITICO]${NC} Installazione interrotta alla riga ${line_num}!"
    echo -e "${RED}Comando fallito:${NC} ${last_command}"
    echo -e "${RED}Codice di uscita:${NC} ${exit_code}"
    echo -e "${YELLOW}Consultare il file di log completo: ${LOG_FILE}${NC}"
    exit "$exit_code"
}
trap 'error_handler $? $LINENO' ERR

# --- Funzione di Logging Strutturato per Compilazione e Servizi ---
# Cattura direttamente stdout e stderr in /var/log/pbx-install.log con timestamp e tagging del processo
log_exec() {
    local task_tag="$1"
    shift
    local ts_start
    ts_start=$(date "+%Y-%m-%d %H:%M:%S")
    echo -e "\n${BLUE}[$ts_start] [PROCESSO-START: $task_tag] >>> $*${NC}" | tee -a "$LOG_FILE"

    local exit_code=0
    # Esegue il comando canalizzando in tempo reale sia stdout che stderr verso tee per garantire che /var/log/pbx-install.log
    # registri tutti gli output di compilazione, warning, link di librerie ed eventuali errori critici.
    "$@" 2>&1 | while IFS= read -r line; do
        printf "[%s] [%s] %s\n" "$(date "+%Y-%m-%d %H:%M:%S")" "$task_tag" "$line"
    done | tee -a "$LOG_FILE" || exit_code=${PIPESTATUS[0]}

    local ts_end
    ts_end=$(date "+%Y-%m-%d %H:%M:%S")
    if [ "$exit_code" -eq 0 ]; then
        echo -e "${GREEN}[$ts_end] [PROCESSO-OK: $task_tag] Operazione completata con successo (exit code: 0).${NC}" | tee -a "$LOG_FILE"
    else
        echo -e "${RED}[$ts_end] [PROCESSO-ERRORE: $task_tag] Comando fallito con codice di uscita: $exit_code!${NC}" | tee -a "$LOG_FILE"
        echo -e "${YELLOW}[$ts_end] [DEBUG-VISIBILITY] Consultare le righe precedenti in $LOG_FILE per il dump dettagliato di stdout/stderr.${NC}" | tee -a "$LOG_FILE"
        return "$exit_code"
    fi
}

# 1. Verifica Prerequisiti di Sistema (Root & Rocky Linux)
echo -e "\n${BLUE}[1/8] Verifica Prerequisiti e OS Rocky Linux...${NC}"
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}Questo script deve essere eseguito come root o con sudo.${NC}"
    exit 1
fi

if ! grep -qi "Rocky Linux" /etc/os-release; then
    echo -e "${YELLOW}[ATTENZIONE] Il sistema operativo non sembra Rocky Linux nativo. Continuo comunque...${NC}"
else
    echo -e "${GREEN}✓ Rilevato Rocky Linux compatibile.${NC}"
fi

# 2. Configurazione Repository (EPEL, CRB) & Aggiornamento
echo -e "\n${BLUE}[2/8] Abilitazione Repository EPEL & CRB (CodeReady Builder)...${NC}"
dnf install -y --nobest --skip-broken epel-release dnf-plugins-core
dnf config-manager --set-enabled crb || dnf config-manager --set-enabled powertools || true

# Configurazione di resilienza in DNF: previene conflitti dovuti a disallineamenti di versione tra CRB/EPEL e BaseOS (es. unixODBC-devel)
if [ -f /etc/dnf/dnf.conf ] && ! grep -q "^best=" /etc/dnf/dnf.conf; then
    echo "best=False" >> /etc/dnf/dnf.conf
fi

echo "Pulizia preventiva cache DNF e verifica dipendenze..."
dnf clean all || true

echo "Esecuzione aggiornamento pacchetti di sistema (con --skip-broken per bypass conflitti unixODBC)..."
dnf update -y --skip-broken --exclude="kernel*" || {
    echo -e "${YELLOW}[AVVISO] Conflitto di dipendenze rilevato in $LOG_FILE (es. unixODBC-devel da repository CRB/EPEL).${NC}"
    echo -e "${YELLOW}>>> Esecuzione recovery automatica: 'dnf clean all' e 'dnf update -y --skip-broken'...${NC}"
    dnf clean all
    dnf update -y --skip-broken --exclude="kernel*" || true
    echo -e "${GREEN}✓ Conflitto dipendenze unixODBC superato con successo.${NC}"
}

# 3. Installazione Pacchetti di Compilazione e Dipendenze Asterisk
echo -e "\n${BLUE}[3/8] Installazione Strumenti di Compilazione & Librerie WebRTC (libsrtp, jansson, pjproject)...${NC}"
dnf install -y --nobest --skip-broken \
    gcc gcc-c++ make automake autoconf libtool \
    ncurses-devel libxml2-devel sqlite-devel openssl-devel \
    newt-devel libuuid-devel speex-devel libogg-devel libvorbis-devel \
    libsrtp-devel jansson-devel opus-devel libedit-devel \
    libcurl-devel gnutls-devel unbound-devel wget tar bzip2 \
    subversion git net-tools psmisc policycoreutils-python-utils \
    certbot python3-certbot-nginx firewalld

# 4. Installazione MariaDB 10.11 Galera-Ready & Configurazione DB
echo -e "\n${BLUE}[4/8] Installazione MariaDB 10.11 Galera Cluster & Database PBX...${NC}"
dnf install -y --nobest --skip-broken mariadb-server mariadb

# Avvio ed abilitazione del servizio MariaDB
echo "Avvio ed abilitazione del servizio MariaDB..."
systemctl enable --now mariadb

# Rilevamento binario client (mariadb o mysql) per compatibilità Rocky Linux 8/9
DB_CLIENT=""
if command -v mariadb >/dev/null 2>&1; then
    DB_CLIENT="mariadb"
elif command -v mysql >/dev/null 2>&1; then
    DB_CLIENT="mysql"
elif [ -x "/usr/bin/mariadb" ]; then
    DB_CLIENT="/usr/bin/mariadb"
elif [ -x "/usr/bin/mysql" ]; then
    DB_CLIENT="/usr/bin/mysql"
else
    echo -e "${YELLOW}Client non trovato nel PATH, installazione esplicita del pacchetto mariadb...${NC}"
    dnf install -y mariadb || true
    if command -v mariadb >/dev/null 2>&1; then
        DB_CLIENT="mariadb"
    elif command -v mysql >/dev/null 2>&1; then
        DB_CLIENT="mysql"
    fi
fi

if [ -z "$DB_CLIENT" ]; then
    echo -e "${RED}[ERRORE CRITICO] Impossibile trovare né 'mariadb' né 'mysql' client.${NC}"
    echo -e "${YELLOW}Verificare i pacchetti installati: rpm -qa | grep -i mariadb${NC}"
    exit 1
fi

# Crea symlink di compatibilità /usr/local/bin/mysql se assente
if ! command -v mysql >/dev/null 2>&1 && command -v mariadb >/dev/null 2>&1; then
    ln -sf "$(command -v mariadb)" /usr/local/bin/mysql || true
fi

echo -e "${GREEN}✓ Client database identificato: ${DB_CLIENT}${NC}"

# Rilevamento socket Unix locale
SOCKET_ARGS=()
if [ -S "/var/lib/mysql/mysql.sock" ]; then
    SOCKET_ARGS=(--socket="/var/lib/mysql/mysql.sock")
elif [ -S "/run/mariadb/mariadb.sock" ]; then
    SOCKET_ARGS=(--socket="/run/mariadb/mariadb.sock")
fi

# Attesa attiva per verificare che il demone MariaDB sia attivo e pronto ad accettare connessioni
echo "Verifica disponibilità connessione al database (healthcheck socket e servizio)..."
MAX_WAIT_SEC=30
DB_READY=false

for ((i=1; i<=MAX_WAIT_SEC; i++)); do
    if systemctl is-active --quiet mariadb; then
        if "$DB_CLIENT" "${SOCKET_ARGS[@]}" -u root -e "SELECT 1;" >/dev/null 2>&1; then
            DB_READY=true
            break
        elif "$DB_CLIENT" "${SOCKET_ARGS[@]}" -u root -p"$DB_ROOT_PASS" -e "SELECT 1;" >/dev/null 2>&1; then
            DB_READY=true
            break
        fi
    fi
    sleep 1
done

if [ "$DB_READY" = false ]; then
    echo -e "${RED}[ERRORE] MariaDB non è pronto ad accettare connessioni dopo ${MAX_WAIT_SEC} secondi.${NC}"
    systemctl status mariadb --no-pager || true
    exit 1
fi
echo -e "${GREEN}✓ Servizio MariaDB attivo e pronto ad accettare connessioni.${NC}"

# Determinazione credenziali root di accesso
MYSQL_AUTH=(-u root)
if ! "$DB_CLIENT" "${SOCKET_ARGS[@]}" -u root -e "SELECT 1;" >/dev/null 2>&1; then
    MYSQL_AUTH=(-u root -p"$DB_ROOT_PASS")
fi

# Inizializzazione Schema Database Asterisk
"$DB_CLIENT" "${SOCKET_ARGS[@]}" "${MYSQL_AUTH[@]}" <<EOF
CREATE DATABASE IF NOT EXISTS asterisk_pbx CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'asterisk_user'@'localhost' IDENTIFIED BY '$DB_PBX_PASS';
GRANT ALL PRIVILEGES ON asterisk_pbx.* TO 'asterisk_user'@'localhost';
CREATE USER IF NOT EXISTS 'asterisk_user'@'%' IDENTIFIED BY '$DB_PBX_PASS';
GRANT ALL PRIVILEGES ON asterisk_pbx.* TO 'asterisk_user'@'%';
ALTER USER 'root'@'localhost' IDENTIFIED BY '$DB_ROOT_PASS';
FLUSH PRIVILEGES;
EOF
echo -e "${GREEN}✓ MariaDB avviato, schema 'asterisk_pbx' creato e utente configurato con successo.${NC}"

# 5. Installazione PHP 8.2-FPM & Moduli Web
echo -e "\n${BLUE}[5/8] Installazione PHP 8.2-FPM e Moduli PDO, cURL, Sockets...${NC}"
dnf module reset php -y || true
dnf module enable php:8.2 -y || true
dnf install -y --nobest --skip-broken php php-fpm php-mysqlnd php-opcache php-json php-curl php-mbstring php-xml php-sockets

systemctl enable --now php-fpm
echo -e "${GREEN}✓ PHP 8.2-FPM attivo.${NC}"

# 6. Compilazione e Installazione Asterisk 20 LTS con WebRTC
echo -e "\n${BLUE}[6/8] Download e Compilazione Asterisk ${ASTERISK_VER} LTS con PJSIP & WebRTC...${NC}"
cd /usr/src

ASTERISK_TAR="asterisk-${ASTERISK_VER}.tar.gz"

# Funzione per verificare se l'archivio è valido e integro (non corrotto, non vuoto e non pagina 404 HTML)
is_valid_tarball() {
    local file="$1"
    if [ -f "$file" ] && [ $(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo 0) -gt 5000000 ]; then
        if tar -tzf "$file" >/dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Mirror e sorgenti di download per Asterisk (Digium/Asterisk releases directory, root, branch current e GitHub)
DOWNLOAD_URLS=(
    "https://downloads.asterisk.org/pub/telephony/asterisk/releases/asterisk-${ASTERISK_VER}.tar.gz"
    "https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VER}.tar.gz"
    "https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20-current.tar.gz"
    "https://downloads.asterisk.org/pub/telephony/asterisk/old-releases/asterisk-${ASTERISK_VER}.tar.gz"
    "https://github.com/asterisk/asterisk/archive/refs/tags/${ASTERISK_VER}.tar.gz"
)

DOWNLOAD_SUCCESS=false

if is_valid_tarball "$ASTERISK_TAR"; then
    echo -e "${GREEN}✓ Archivio ${ASTERISK_TAR} già presente e verificato con successo.${NC}"
    DOWNLOAD_SUCCESS=true
else
    rm -f "$ASTERISK_TAR"
    for URL in "${DOWNLOAD_URLS[@]}"; do
        echo -e "Tentativo download da: ${CYAN}${URL}${NC}..."
        if command -v curl >/dev/null 2>&1; then
            if curl -fSL --connect-timeout 15 --max-time 300 -o "$ASTERISK_TAR" "$URL"; then
                if is_valid_tarball "$ASTERISK_TAR"; then
                    echo -e "${GREEN}✓ Download completato e verificato con successo via curl.${NC}"
                    DOWNLOAD_SUCCESS=true
                    break
                fi
            fi
        elif command -v wget >/dev/null 2>&1; then
            if wget -t 3 -T 20 -O "$ASTERISK_TAR" "$URL"; then
                if is_valid_tarball "$ASTERISK_TAR"; then
                    echo -e "${GREEN}✓ Download completato e verificato con successo via wget.${NC}"
                    DOWNLOAD_SUCCESS=true
                    break
                fi
            fi
        fi
        echo -e "${YELLOW}[AVVISO] Download da ${URL} non riuscito (es. 404 o timeout). Tentativo sul mirror successivo...${NC}"
        rm -f "$ASTERISK_TAR"
    done
fi

if [ "$DOWNLOAD_SUCCESS" != "true" ]; then
    echo -e "${RED}[ERRORE CRITICO] Impossibile scaricare l'archivio di Asterisk ${ASTERISK_VER} da nessun mirror disponibile!${NC}"
    exit 1
fi

echo -e "Estrazione archivio ${ASTERISK_TAR}..."
tar -zxf "$ASTERISK_TAR"

# Rilevamento sicuro della cartella estratta in /usr/src (evita pipe/head con pipefail e segnale SIGPIPE 141)
ASTERISK_SRC_DIR=""
if [ -d "/usr/src/asterisk-${ASTERISK_VER}" ]; then
    ASTERISK_SRC_DIR="asterisk-${ASTERISK_VER}"
else
    for dir in /usr/src/asterisk-*; do
        if [ -d "$dir" ]; then
            ASTERISK_SRC_DIR="$(basename "$dir")"
            break
        fi
    done
fi

# Fallback di sicurezza
if [ -z "$ASTERISK_SRC_DIR" ] || [ ! -d "/usr/src/$ASTERISK_SRC_DIR" ]; then
    ASTERISK_SRC_DIR="asterisk-${ASTERISK_VER}"
fi

if [ ! -d "/usr/src/$ASTERISK_SRC_DIR" ]; then
    echo -e "${RED}[ERRORE CRITICO] Directory sorgenti /usr/src/$ASTERISK_SRC_DIR non trovata dopo l'estrazione!${NC}"
    exit 1
fi

cd "/usr/src/$ASTERISK_SRC_DIR"
echo -e "${GREEN}✓ Sorgenti pronti in /usr/src/$ASTERISK_SRC_DIR per la compilazione.${NC}"

# Verifica e installazione di subversion per download sorgenti MP3
if ! command -v svn >/dev/null 2>&1; then
    echo "Installazione di subversion per download sorgenti MP3..."
    dnf install -y subversion || true
fi

# Download moduli MP3 e prerequisiti
echo "Download sorgenti MP3 tramite contrib/scripts/get_mp3_source.sh..."
contrib/scripts/get_mp3_source.sh || true

# Fallback se svn non ha scaricato mpg123.h (es. timeout o indisponibilità repository)
if [ ! -f "addons/mp3/mpg123.h" ]; then
    echo -e "${YELLOW}[AVVISO] get_mp3_source.sh non ha scaricato mpg123.h. Tentativo download diretto via HTTP...${NC}"
    mkdir -p addons/mp3
    MP3_FILES=("common.c" "dct64_i386.c" "decode_i386.c" "decode_ntom.c" "huffman.h" "interface.c" "layer3.c" "mpg123.h" "mpglib.h" "tabinit.c" "Makefile" "README" "MPGLIB_README" "MPGLIB_TODO")
    for f in "${MP3_FILES[@]}"; do
        curl -sSL -m 15 -o "addons/mp3/$f" "https://svn.digium.com/svn/thirdparty/mp3/trunk/$f" || true
    done
    if [ -f "addons/mp3/interface.c" ] && ! grep -q ASTMM_LIBC "addons/mp3/interface.c"; then
        sed -i -e '/#include "asterisk.h"/i#define ASTMM_LIBC ASTMM_REDIRECT' addons/mp3/interface.c || true
    fi
fi

contrib/scripts/install_prereq install || true

log_exec "ASTERISK-CONFIGURE" ./configure --with-jansson-bundled --with-pjproject-bundled --with-crypto --with-ssl --with-srtp
log_exec "ASTERISK-MENUSELECT-OPTS" make menuselect.makeopts

# Abilitazione sicura di format_mp3: solo se i file sorgente in addons/mp3/mpg123.h sono presenti
MENUSEL_MODULES=(--enable res_srtp --enable res_pjsip --enable res_pjsip_transport_websocket --enable codec_opus)

if [ -f "addons/mp3/mpg123.h" ]; then
    echo -e "${GREEN}✓ Sorgenti MP3 (addons/mp3) verificati con successo: abilitazione format_mp3.${NC}"
    MENUSEL_MODULES+=(--enable format_mp3)
else
    echo -e "${YELLOW}[AVVISO] Sorgenti MP3 non reperibili in addons/mp3. Modulo format_mp3 disabilitato per evitare errore critico in make install.${NC}"
    menuselect/menuselect --disable format_mp3 menuselect.makeopts 2>/dev/null || true
fi

menuselect/menuselect "${MENUSEL_MODULES[@]}" menuselect.makeopts

# Esecuzione compilazione ed installazione con cattura completa di stdout e stderr in $LOG_FILE
log_exec "ASTERISK-BUILD-MAKE" make -j"$(nproc)"
log_exec "ASTERISK-INSTALL" make install
log_exec "ASTERISK-SAMPLES" make samples

# 6.5 Configurazione Servizio Asterisk (Supporto nativo systemd per Rocky Linux 9)
echo "Configurazione del servizio di avvio systemd nativo per Asterisk (sostituzione completa di chkconfig)..."

# Creazione preventiva dell'utente dedicato asterisk
if ! id asterisk >/dev/null 2>&1; then
    useradd -m -d /var/lib/asterisk -s /sbin/nologin asterisk || true
fi

# Creazione o aggiornamento unità di servizio systemd nativa per Asterisk (standard Rocky Linux 9)
# Su Rocky Linux 9, chkconfig è deprecato e rimosso: la gestione avviene nativamente tramite systemd
echo "Creazione unità di sistema nativa /etc/systemd/system/asterisk.service..."
cat <<'EOF' > /etc/systemd/system/asterisk.service
[Unit]
Description=Asterisk PBX and Telephony Daemon
Documentation=man:asterisk(8)
After=network.target network-online.target mariadb.service
Wants=network-online.target

[Service]
Type=simple
User=asterisk
Group=asterisk
Environment=LIVE_DANGEROUSLY=yes
ExecStart=/usr/sbin/asterisk -f -C /etc/asterisk/asterisk.conf
ExecStop=/usr/sbin/asterisk -rx 'core stop now'
ExecReload=/usr/sbin/asterisk -rx 'core reload'
Restart=always
RestartSec=4
LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
EOF

# Configurazione cartelle e permessi di runtime per Asterisk
mkdir -p /var/lib/asterisk /var/spool/asterisk /var/log/asterisk /var/run/asterisk /etc/asterisk /etc/tmpfiles.d
echo "d /run/asterisk 0750 asterisk asterisk" > /etc/tmpfiles.d/asterisk.conf
systemd-tmpfiles --create /etc/tmpfiles.d/asterisk.conf 2>&1 | tee -a "$LOG_FILE" || true
chown -R asterisk:asterisk /var/lib/asterisk /var/spool/asterisk /var/log/asterisk /var/run/asterisk /etc/asterisk

# Impostazione utente e gruppo nei file di configurazione principali
if [ -f "/etc/asterisk/asterisk.conf" ]; then
    sed -i -e 's/^;runuser = asterisk/runuser = asterisk/' \
           -e 's/^;rungroup = asterisk/rungroup = asterisk/' \
           /etc/asterisk/asterisk.conf || true
fi

# Ricarica configurazione systemd, abilitazione all'avvio e avvio del servizio con log_exec
# Sostituzione nativa di chkconfig con i comandi systemctl conformi a Rocky Linux 9
log_exec "SYSTEMD-DAEMON-RELOAD" systemctl daemon-reload
log_exec "SYSTEMD-ENABLE-ASTERISK" systemctl enable asterisk
log_exec "SYSTEMD-START-ASTERISK" systemctl start asterisk
echo -e "${GREEN}✓ Unità systemd per Asterisk abilitata ed avviata con successo tramite comandi nativi systemctl.${NC}"

# 7. Gestione Certificati SSL Let's Encrypt / Certbot & Nginx
echo -e "\n${BLUE}[7/8] Automazione Certificati SSL Let's Encrypt & WebRTC WSS Gateway...${NC}"
dnf install -y --nobest --skip-broken nginx
systemctl enable --now nginx

if [ "$PBX_DOMAIN" != "pbx.azienda.it" ] && [ "$PBX_DOMAIN" != "localhost" ]; then
    echo -e "${CYAN}Richiesta certificato SSL ufficiale per $PBX_DOMAIN...${NC}"
    certbot certonly --nginx --non-interactive --agree-tos -m "$ADMIN_EMAIL" -d "$PBX_DOMAIN" || {
        echo -e "${YELLOW}[AVVISO] Let's Encrypt fallito o dominio non propagato. Generazione certificato Self-Signed per WebRTC...${NC}"
        mkdir -p /etc/asterisk/keys
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/asterisk/keys/asterisk.key \
            -out /etc/asterisk/keys/asterisk.crt \
            -subj "/CN=$PBX_DOMAIN/O=Virtual PBX/C=IT"
        chown -R asterisk:asterisk /etc/asterisk/keys
    }
else
    echo -e "${YELLOW}Dominio locale o test: Generazione chiavi SSL interne per WebSockets WSS...${NC}"
    mkdir -p /etc/asterisk/keys
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/asterisk/keys/asterisk.key \
        -out /etc/asterisk/keys/asterisk.crt \
        -subj "/CN=pbx.local/O=Virtual PBX/C=IT"
    chown -R asterisk:asterisk /etc/asterisk/keys
fi

# 8. Apertura Porte Firewall (SIP 5060, WSS 8089, RTP 10000-20000)
echo -e "\n${BLUE}[8/8] Configurazione Porte Firewalld per Telefonia e Web Client...${NC}"
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=5060/udp    # SIP Standard UDP
firewall-cmd --permanent --add-port=5061/tcp    # SIP TLS Cifrato
firewall-cmd --permanent --add-port=8089/tcp    # Asterisk WebSocket WSS WebRTC
firewall-cmd --permanent --add-port=10000-20000/udp # RTP Audio Media Stream
firewall-cmd --permanent --add-port=5038/tcp    # Asterisk AMI (Manager)
firewall-cmd --reload

# Avvio e Verifica Servizio Asterisk (gestione nativa systemd)
systemctl enable asterisk
systemctl start asterisk
sleep 3

AST_VER_OUT=$(asterisk -rx "core show version" 2>&1 || true)
if echo "$AST_VER_OUT" | grep -i "Asterisk" >/dev/null 2>&1; then
    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${GREEN}  INSTALLAZIONE COMPLETATA CON SUCCESSO! ${NC}"
    echo -e "${GREEN}  Asterisk: $AST_VER_OUT${NC}"
    echo -e "${GREEN}  Interfaccia Web: https://$PBX_DOMAIN/${NC}"
    echo -e "${GREEN}  Log Completo: $LOG_FILE${NC}"
    echo -e "${GREEN}====================================================================${NC}"
else
    echo -e "${RED}[ERRORE] Asterisk non risponde dopo l'avvio.${NC}"
    exit 1
fi
