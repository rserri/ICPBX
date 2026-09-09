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
dnf install -y epel-release dnf-plugins-core
dnf config-manager --set-enabled crb || dnf config-manager --set-enabled powertools || true
dnf update -y --exclude=kernel*

# 3. Installazione Pacchetti di Compilazione e Dipendenze Asterisk
echo -e "\n${BLUE}[3/8] Installazione Strumenti di Compilazione & Librerie WebRTC (libsrtp, jansson, pjproject)...${NC}"
dnf install -y \
    gcc gcc-c++ make automake autoconf libtool \
    ncurses-devel libxml2-devel sqlite-devel openssl-devel \
    newt-devel libuuid-devel speex-devel libogg-devel libvorbis-devel \
    libsrtp-devel jansson-devel opus-devel libedit-devel \
    libcurl-devel gnutls-devel unbound-devel wget tar bzip2 \
    git net-tools psmisc policycoreutils-python-utils \
    certbot python3-certbot-nginx firewalld

# 4. Installazione MariaDB 10.11 Galera-Ready & Configurazione DB
echo -e "\n${BLUE}[4/8] Installazione MariaDB 10.11 Galera Cluster & Database PBX...${NC}"
dnf install -y mariadb-server mariadb

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
dnf install -y php php-fpm php-mysqlnd php-opcache php-json php-curl php-mbstring php-xml php-sockets

systemctl enable --now php-fpm
echo -e "${GREEN}✓ PHP 8.2-FPM attivo.${NC}"

# 6. Compilazione e Installazione Asterisk 20 LTS con WebRTC
echo -e "\n${BLUE}[6/8] Download e Compilazione Asterisk ${ASTERISK_VER} LTS con PJSIP & WebRTC...${NC}"
cd /usr/src
if [ ! -f "asterisk-${ASTERISK_VER}.tar.gz" ]; then
    wget -q "https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VER}.tar.gz"
fi
tar -zxf "asterisk-${ASTERISK_VER}.tar.gz"
cd "asterisk-${ASTERISK_VER}"

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
echo -e "\n${BLUE}[7/8] Automazione Certificati SSL Let's Encrypt & WebRTC WSS Gateway...${NC}"
dnf install -y nginx
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

# Avvio e Verifica Servizio Asterisk
systemctl enable --now asterisk
sleep 3

if asterisk -rx "core show version" | grep -qi "Asterisk"; then
    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${GREEN}  INSTALLAZIONE COMPLETATA CON SUCCESSO! ${NC}"
    echo -e "${GREEN}  Asterisk: $(asterisk -rx "core show version")${NC}"
    echo -e "${GREEN}  Interfaccia Web: https://$PBX_DOMAIN/${NC}"
    echo -e "${GREEN}  Log Completo: $LOG_FILE${NC}"
    echo -e "${GREEN}====================================================================${NC}"
else
    echo -e "${RED}[ERRORE] Asterisk non risponde dopo l'avvio.${NC}"
    exit 1
fi
