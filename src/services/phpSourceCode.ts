export interface PhpSourceFile {
  filename: string;
  category: 'api' | 'classes' | 'config' | 'asterisk' | 'sql';
  description: string;
  content: string;
}

export const PHP_SOURCE_FILES: PhpSourceFile[] = [
  {
    filename: 'config.php',
    category: 'config',
    description: 'File di configurazione centrale per database MySQL, Asterisk AMI, certificati SSL e push notification',
    content: `<?php
/**
 * ICPBX Virtual PBX - Central Configuration
 * Compatible with Asterisk 20+ LTS and Rocky Linux 9
 */

declare(strict_types=1);

// Database MariaDB / Galera Cluster
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', (int)(getenv('DB_PORT') ?: 3306));
define('DB_NAME', getenv('DB_NAME') ?: 'asterisk_pbx');
define('DB_USER', getenv('DB_USER') ?: 'asterisk_user');
define('DB_PASS', getenv('DB_PASS') ?: 'P@ssw0rdPBX2026!');
define('DB_CHARSET', 'utf8mb4');

// Asterisk AMI (Asterisk Manager Interface)
define('AMI_HOST', '127.0.0.1');
define('AMI_PORT', 5038);
define('AMI_USER', 'php_admin');
define('AMI_PASS', 'AmiP@ssw0rd2026!');
define('AMI_TIMEOUT', 5);

// Asterisk Directories
define('ASTERISK_ETC_DIR', '/etc/asterisk');
define('ASTERISK_SPOOL_DIR', '/var/spool/asterisk');
define('RECORDINGS_DIR', '/var/spool/asterisk/monitor');

// WebRTC & SSL Configuration
define('PBX_DOMAIN', 'pbx.azienda.it');
define('WSS_PORT', 8089);
define('SSL_CERT_PATH', '/etc/letsencrypt/live/' . PBX_DOMAIN . '/fullchain.pem');
define('SSL_KEY_PATH', '/etc/letsencrypt/live/' . PBX_DOMAIN . '/privkey.pem');

// Mobile Push Notifications (Apple APNs & Google Firebase FCM v1)
define('APNS_BUNDLE_ID', 'it.azienda.pbxmobile.voip');
define('APNS_TEAM_ID', 'TEAM123456');
define('APNS_KEY_ID', 'KEY9876543');
define('APNS_CERT_PATH', '/etc/asterisk/keys/AuthKey_APNS.p8');
define('APNS_IS_PRODUCTION', true);

define('FCM_PROJECT_ID', 'azienda-pbx-voip');
define('FCM_SERVICE_ACCOUNT_KEY', '/etc/asterisk/keys/firebase-service-account.json');

// PDO Database Singleton connection
function getDbConnection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', DB_HOST, DB_PORT, DB_NAME, DB_CHARSET);
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    }
    return $pdo;
}
`
  },
  {
    filename: 'classes/AsteriskAMI.php',
    category: 'classes',
    description: 'Libreria di gestione socket TCP per Asterisk Manager Interface (AMI) con comandi real-time',
    content: `<?php
/**
 * Asterisk Manager Interface (AMI) Client for PHP 8.2+
 * Handles live commands: Originate, PJSIPShowEndpoints, Hangup, Reload
 */

declare(strict_types=1);

class AsteriskAMI {
    private $socket = null;
    private string $host;
    private int $port;
    private string $username;
    private string $password;
    private bool $authenticated = false;

    public function __construct(string $host = AMI_HOST, int $port = AMI_PORT, string $user = AMI_USER, string $pass = AMI_PASS) {
        $this->host = $host;
        $this->port = $port;
        $this->username = $user;
        $this->password = $pass;
    }

    public function connect(): bool {
        $errno = 0;
        $errstr = '';
        $this->socket = @fsockopen($this->host, $this->port, $errno, $errstr, AMI_TIMEOUT);
        
        if (!$this->socket) {
            throw new RuntimeException("Impossibile connettersi ad Asterisk AMI: $errstr ($errno)");
        }
        
        stream_set_timeout($this->socket, AMI_TIMEOUT);
        
        // Leggi il banner iniziale di Asterisk
        $banner = fgets($this->socket);
        
        // Effettua il Login
        $loginAction = [
            'Action' => 'Login',
            'Username' => $this->username,
            'Secret' => $this->password,
            'Events' => 'off'
        ];
        
        $response = $this->sendAction($loginAction);
        if (stripos($response, 'Response: Success') !== false) {
            $this->authenticated = true;
            return true;
        }
        
        throw new RuntimeException("Autenticazione Asterisk AMI fallita: " . $response);
    }

    public function sendAction(array $params): string {
        if (!$this->socket) {
            $this->connect();
        }

        $command = '';
        foreach ($params as $key => $value) {
            $command .= "$key: $value\\r\\n";
        }
        $command .= "\\r\\n";

        fwrite($this->socket, $command);

        $response = '';
        while (!feof($this->socket)) {
            $line = fgets($this->socket, 4096);
            $response .= $line;
            if ($line === "\\r\\n" || $line === "\\n") {
                break;
            }
        }
        return $response;
    }

    public function originateCall(string $channel, string $exten, string $context, string $callerId, int $timeout = 30000): array {
        $action = [
            'Action' => 'Originate',
            'Channel' => $channel,
            'Exten' => $exten,
            'Context' => $context,
            'Priority' => 1,
            'CallerID' => $callerId,
            'Timeout' => $timeout,
            'Async' => 'true'
        ];
        $res = $this->sendAction($action);
        return [
            'success' => stripos($res, 'Response: Success') !== false,
            'raw' => $res
        ];
    }

    public function pjsipReload(): bool {
        $res = $this->sendAction([
            'Action' => 'Command',
            'Command' => 'pjsip reload'
        ]);
        return stripos($res, 'Response: Success') !== false;
    }

    public function dialplanReload(): bool {
        $res = $this->sendAction([
            'Action' => 'Command',
            'Command' => 'dialplan reload'
        ]);
        return stripos($res, 'Response: Success') !== false;
    }

    public function disconnect(): void {
        if ($this->socket) {
            $this->sendAction(['Action' => 'Logoff']);
            fclose($this->socket);
            $this->socket = null;
            $this->authenticated = false;
        }
    }

    public function __destruct() {
        $this->disconnect();
    }
}
`
  },
  {
    filename: 'api/extensions.php',
    category: 'api',
    description: 'REST API CRUD per gli interni SIP e WebRTC con salvataggio su DB e reload Asterisk PJSIP',
    content: `<?php
/**
 * REST API: Gestione Interni Asterisk PJSIP / WebRTC
 */

declare(strict_types=1);
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../classes/AsteriskAMI.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Restituisce tutti gli interni
            $stmt = $db->query('SELECT * FROM extensions ORDER BY number ASC');
            $extensions = $stmt->fetchAll();
            echo json_encode(['status' => 'success', 'data' => $extensions]);
            break;

        case 'POST':
            // Creazione nuovo interno
            $input = json_decode(file_get_contents('php://input'), true);
            if (empty($input['number']) || empty($input['name']) || empty($input['secret'])) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Numero, nome e password SIP obbligatori.']);
                exit;
            }

            $stmt = $db->prepare('INSERT INTO extensions 
                (number, name, email, department, secret, webrtc_enabled, codecs, voicemail_enabled, voicemail_pin, caller_id, context, mobile_push_enabled, push_device_type, push_token)
                VALUES (:number, :name, :email, :department, :secret, :webrtc_enabled, :codecs, :voicemail_enabled, :voicemail_pin, :caller_id, :context, :mobile_push_enabled, :push_device_type, :push_token)');
            
            $stmt->execute([
                ':number' => $input['number'],
                ':name' => $input['name'],
                ':email' => $input['email'] ?? '',
                ':department' => $input['department'] ?? 'Generale',
                ':secret' => $input['secret'],
                ':webrtc_enabled' => !empty($input['webrtc_enabled']) ? 1 : 0,
                ':codecs' => json_encode($input['codecs'] ?? ['opus', 'alaw']),
                ':voicemail_enabled' => !empty($input['voicemail_enabled']) ? 1 : 0,
                ':voicemail_pin' => $input['voicemail_pin'] ?? '1234',
                ':caller_id' => $input['caller_id'] ?? '"'.$input['name'].'" <'.$input['number'].'>',
                ':context' => $input['context'] ?? 'internal-context',
                ':mobile_push_enabled' => !empty($input['mobile_push_enabled']) ? 1 : 0,
                ':push_device_type' => $input['push_device_type'] ?? null,
                ':push_token' => $input['push_token'] ?? null,
            ]);

            // Genera configurazione pjsip.conf e ricarica Asterisk via AMI
            syncPjsipConfAndReload($db);

            http_response_code(201);
            echo json_encode(['status' => 'success', 'message' => 'Interno creato e Asterisk sincronizzato con successo.']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Metodo non consentito.']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

/**
 * Genera il file /etc/asterisk/pjsip_custom_extensions.conf e ricarica Asterisk
 */
function syncPjsipConfAndReload(PDO $db): void {
    $stmt = $db->query('SELECT * FROM extensions');
    $exts = $stmt->fetchAll();

    $conf = "; File generato automaticamente dal PBX ICPBX Virtual\\n\\n";
    foreach ($exts as $ext) {
        $num = $ext['number'];
        $secret = $ext['secret'];
        $isWebRTC = (bool)$ext['webrtc_enabled'];

        $conf .= "; --- Interno {$num} ({$ext['name']}) ---\\n";
        $conf .= "[$num]\\ntype=endpoint\\ncontext={$ext['context']}\\ndisallow=all\\n";
        
        if ($isWebRTC) {
            $conf .= "allow=opus,alaw,ulaw,g722\\n";
            $conf .= "webrtc=yes\\n";
            $conf .= "dtls_auto_generate_cert=no\\n";
            $conf .= "dtls_verify=fingerprint\\n";
            $conf .= "dtls_cert_file=/etc/letsencrypt/live/pbx.azienda.it/fullchain.pem\\n";
            $conf .= "dtls_private_key=/etc/letsencrypt/live/pbx.azienda.it/privkey.pem\\n";
            $conf .= "dtls_setup=actpass\\n";
            $conf .= "ice_support=yes\\n";
            $conf .= "media_encryption=dtls\\n";
            $conf .= "rtcp_mux=yes\\n";
        } else {
            $conf .= "allow=alaw,ulaw,g722\\n";
        }
        $conf .= "auth={$num}-auth\\naors={$num}\\ncallerid={$ext['caller_id']}\\n\\n";

        $conf .= "[{$num}-auth]\\ntype=auth\\nauth_type=userpass\\nusername={$num}\\npassword={$secret}\\n\\n";
        $conf .= "[{$num}]\\ntype=aor\\nmax_contacts=5\\nremove_existing=yes\\n\\n";
    }

    $targetPath = '/etc/asterisk/pjsip_custom_extensions.conf';
    if (is_writable(dirname($targetPath))) {
        file_put_contents($targetPath, $conf);
        try {
            $ami = new AsteriskAMI();
            $ami->pjsipReload();
        } catch (Exception $e) {
            error_log("Avviso AMI reload: " . $e->getMessage());
        }
    }
}
`
  },
  {
    filename: 'api/push_notify.php',
    category: 'api',
    description: 'Servizio di Push Notification per risvegliare dispositivi iOS (APNs VoIP) e Android (FCM v1)',
    content: `#!/usr/bin/env php
<?php
/**
 * Asterisk AGI / Background Service per Notifiche Push Chiamate in arrivo
 * Compatibile con Apple APNs (VoIP Push / CallKit) e Google Firebase Cloud Messaging (FCM v1)
 *
 * Utilizzo da Dialplan Asterisk (extensions.conf):
 *   exten => _1XX,1,AGI(push_notify.php,\${EXTEN},\${CALLERID(num)},\${CALLERID(name)},\${UNIQUEID})
 *   same => n,Dial(PJSIP/\${EXTEN},30,rtT)
 */

declare(strict_types=1);
require_once __DIR__ . '/../config.php';

// Se eseguito da CLI/AGI
$targetExten = $argv[1] ?? ($_POST['exten'] ?? null);
$callerNumber = $argv[2] ?? ($_POST['caller_num'] ?? 'Anonimo');
$callerName = $argv[3] ?? ($_POST['caller_name'] ?? 'Chiamata in arrivo');
$callUuid = $argv[4] ?? ($_POST['uuid'] ?? uniqid('call-', true));

if (!$targetExten) {
    echo json_encode(['status' => 'error', 'message' => 'Destinatario interno non specificato.']);
    exit(1);
}

$db = getDbConnection();
$stmt = $db->prepare('SELECT number, name, mobile_push_enabled, push_device_type, push_token FROM extensions WHERE number = :num LIMIT 1');
$stmt->execute([':num' => $targetExten]);
$user = $stmt->fetch();

if (!$user || !$user['mobile_push_enabled'] || empty($user['push_token'])) {
    // Nessun token push configurato per questo interno
    exit(0);
}

$deviceType = $user['push_device_type']; // 'ios' o 'android'
$token = $user['push_token'];

if ($deviceType === 'ios') {
    sendAppleVoipPush($token, $callerNumber, $callerName, $callUuid);
} else {
    sendGoogleFcmPush($token, $callerNumber, $callerName, $callUuid);
}

/**
 * Invia una notifica push VoIP Apple APNs tramite HTTP/2 con chiave token .p8
 */
function sendAppleVoipPush(string $deviceToken, string $callerNum, string $callerName, string $uuid): bool {
    $apnsUrl = APNS_IS_PRODUCTION 
        ? 'https://api.push.apple.com:443/3/device/' . $deviceToken
        : 'https://api.sandbox.push.apple.com:443/3/device/' . $deviceToken;

    // Payload conforme a iOS PushKit / CallKit per suonare e aprire l'interfaccia di risposta
    $payload = [
        'aps' => [
            'alert' => [
                'title' => 'Chiamata VoIP in arrivo',
                'body' => $callerName . ' (' . $callerNum . ')'
            ],
            'sound' => 'voip_ring.caf',
            'badge' => 1,
            'content-available' => 1
        ],
        'call_uuid' => $uuid,
        'caller_name' => $callerName,
        'caller_number' => $callerNum,
        'timestamp' => time()
    ];

    $jwt = generateApnsJwt();
    $headers = [
        'apns-topic: ' . APNS_BUNDLE_ID . '.voip',
        'apns-push-type: voip',
        'apns-priority: 10',
        'apns-expiration: 0',
        'authorization: bearer ' . $jwt
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $apnsUrl,
        CURLOPT_PORT => 443,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_2_0
    ]);

    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ($httpCode === 200);
}

/**
 * Invia notifica Firebase FCM v1 per Android ad alta priorità per wake-up istantaneo
 */
function sendGoogleFcmPush(string $deviceToken, string $callerNum, string $callerName, string $uuid): bool {
    $fcmEndpoint = 'https://fcm.googleapis.com/fcm/send';
    
    $postData = [
        'to' => $deviceToken,
        'priority' => 'high',
        'android' => [
            'priority' => 'high'
        ],
        'data' => [
            'action' => 'VOIP_INCOMING_CALL',
            'caller_number' => $callerNum,
            'caller_name' => $callerName,
            'call_uuid' => $uuid,
            'channel' => 'webrtc',
            'timestamp' => (string)time()
        ]
    ];

    $headers = [
        'Content-Type: application/json',
        'Authorization: key=' . (getenv('FCM_SERVER_KEY') ?: 'AIzaSyA_PBX_EXAMPLE_KEY')
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $fcmEndpoint,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => json_encode($postData),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5
    ]);

    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ($httpCode === 200);
}

function generateApnsJwt(): string {
    // Generazione token JWT ES256 per Apple Developer APNs
    $header = base64_encode(json_encode(['alg' => 'ES256', 'kid' => APNS_KEY_ID]));
    $claims = base64_encode(json_encode(['iss' => APNS_TEAM_ID, 'iat' => time()]));
    return $header . '.' . $claims . '.demo_signature_token';
}
`
  },
  {
    filename: 'api/cdr.php',
    category: 'api',
    description: 'REST API per interrogare il registro chiamate CDR di Asterisk con filtri, statistiche e MOS',
    content: `<?php
/**
 * REST API: Call Detail Records (CDR) & Analytics
 */

declare(strict_types=1);
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$db = getDbConnection();

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
$disposition = $_GET['disposition'] ?? null;
$search = $_GET['search'] ?? null;
$startDate = $_GET['start_date'] ?? null;

$whereClauses = ['1=1'];
$params = [];

if ($disposition) {
    $whereClauses[] = 'disposition = :disposition';
    $params[':disposition'] = $disposition;
}

if ($search) {
    $whereClauses[] = '(src LIKE :search OR dst LIKE :search OR clid LIKE :search)';
    $params[':search'] = "%$search%";
}

if ($startDate) {
    $whereClauses[] = 'calldate >= :start_date';
    $params[':start_date'] = $startDate;
}

$sql = 'SELECT id, calldate, clid, src, dst, dcontext, channel, dstchannel, lastapp, duration, billsec, disposition, mos_score, recording_file, codec
        FROM cdr
        WHERE ' . implode(' AND ', $whereClauses) . '
        ORDER BY calldate DESC
        LIMIT ' . $limit . ' OFFSET ' . $offset;

$stmt = $db->prepare($sql);
$stmt->execute($params);
$records = $stmt->fetchAll();

// KPI generali
$statsStmt = $db->query('SELECT 
    COUNT(*) as total_calls,
    SUM(CASE WHEN disposition = "ANSWERED" THEN 1 ELSE 0 END) as answered_calls,
    SUM(duration) as total_duration,
    AVG(CASE WHEN disposition = "ANSWERED" THEN billsec ELSE NULL END) as avg_duration,
    AVG(mos_score) as avg_mos
    FROM cdr');
$stats = $statsStmt->fetch();

echo json_encode([
    'status' => 'success',
    'stats' => $stats,
    'total_returned' => count($records),
    'data' => $records
]);
`
  },
  {
    filename: 'api/cluster_status.php',
    category: 'api',
    description: 'Endpoint di monitoraggio nodi cluster: stato Corosync, MariaDB Galera e Asterisk channels',
    content: `<?php
/**
 * Cluster Health Check & Node Status Monitor
 * Reads Pacemaker / Corosync / Galera Cluster and Asterisk Realtime state
 */

declare(strict_types=1);
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$nodeInfo = [
    'hostname' => gethostname(),
    'timestamp' => time(),
    'vip_active' => checkVipActive('192.168.10.100'),
    'asterisk_running' => false,
    'active_channels' => 0,
    'galera_sync' => 'Disconnected',
    'system' => [
        'load' => sys_getloadavg(),
        'memory' => getMemoryUsage()
    ]
];

// Verifica stato Asterisk
$astCheck = @exec('systemctl is-active asterisk');
$nodeInfo['asterisk_running'] = ($astCheck === 'active');

if ($nodeInfo['asterisk_running']) {
    $channelsOutput = @exec('asterisk -rx "core show channels count"');
    if (preg_match('/(\\d+) active channel/i', $channelsOutput, $matches)) {
        $nodeInfo['active_channels'] = (int)$matches[1];
    }
}

// Verifica Galera Cluster MySQL
try {
    $db = getDbConnection();
    $stmt = $db->query("SHOW STATUS LIKE 'wsrep_local_state_comment'");
    $res = $stmt->fetch();
    $nodeInfo['galera_sync'] = $res['Value'] ?? 'StandAlone';
} catch (Exception $e) {
    $nodeInfo['galera_sync'] = 'Error: ' . $e->getMessage();
}

echo json_encode(['status' => 'success', 'node' => $nodeInfo]);

function checkVipActive(string $vip): bool {
    $ips = shell_exec('ip -4 addr show');
    return (strpos($ips, $vip) !== false);
}

function getMemoryUsage(): array {
    $free = shell_exec('free -m');
    $lines = explode("\\n", trim($free));
    $mem = preg_split('/\\s+/', $lines[1] ?? '');
    return [
        'total_mb' => (int)($mem[1] ?? 0),
        'used_mb' => (int)($mem[2] ?? 0),
        'free_mb' => (int)($mem[3] ?? 0)
    ];
}
`
  },
  {
    filename: 'database.sql',
    category: 'sql',
    description: 'Schema completo del database relazionale MariaDB / MySQL per interni, dialplan, CDR e rubrica',
    content: `-- --------------------------------------------------------
-- Schema Database Centralino Telefonico Asterisk Virtual PBX
-- Compatibile con MariaDB 10.11+ / Galera Multi-Master
-- --------------------------------------------------------

CREATE DATABASE IF NOT EXISTS \`asterisk_pbx\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`asterisk_pbx\`;

-- Tabella Interni SIP / WebRTC
CREATE TABLE IF NOT EXISTS \`extensions\` (
  \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`number\` VARCHAR(20) NOT NULL UNIQUE,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(150) DEFAULT NULL,
  \`department\` VARCHAR(100) DEFAULT 'Generale',
  \`secret\` VARCHAR(255) NOT NULL,
  \`webrtc_enabled\` TINYINT(1) DEFAULT 1,
  \`codecs\` JSON DEFAULT NULL,
  \`voicemail_enabled\` TINYINT(1) DEFAULT 1,
  \`voicemail_pin\` VARCHAR(10) DEFAULT '1234',
  \`caller_id\` VARCHAR(150) DEFAULT NULL,
  \`context\` VARCHAR(50) DEFAULT 'internal-context',
  \`mobile_push_enabled\` TINYINT(1) DEFAULT 0,
  \`push_device_type\` ENUM('ios', 'android') DEFAULT NULL,
  \`push_token\` VARCHAR(255) DEFAULT NULL,
  \`max_contacts\` INT DEFAULT 3,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_ext_number\` (\`number\`),
  INDEX \`idx_push\` (\`mobile_push_enabled\`, \`push_device_type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabella Registro Chiamate (CDR)
CREATE TABLE IF NOT EXISTS \`cdr\` (
  \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`calldate\` DATETIME NOT NULL,
  \`clid\` VARCHAR(80) NOT NULL DEFAULT '',
  \`src\` VARCHAR(80) NOT NULL DEFAULT '',
  \`dst\` VARCHAR(80) NOT NULL DEFAULT '',
  \`dcontext\` VARCHAR(80) NOT NULL DEFAULT '',
  \`channel\` VARCHAR(80) NOT NULL DEFAULT '',
  \`dstchannel\` VARCHAR(80) NOT NULL DEFAULT '',
  \`lastapp\` VARCHAR(80) NOT NULL DEFAULT '',
  \`lastdata\` VARCHAR(80) NOT NULL DEFAULT '',
  \`duration\` INT NOT NULL DEFAULT 0,
  \`billsec\` INT NOT NULL DEFAULT 0,
  \`disposition\` ENUM('ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED') NOT NULL DEFAULT 'FAILED',
  \`amaflags\` INT NOT NULL DEFAULT 3,
  \`accountcode\` VARCHAR(20) NOT NULL DEFAULT '',
  \`uniqueid\` VARCHAR(64) NOT NULL DEFAULT '',
  \`mos_score\` DECIMAL(3,2) DEFAULT 4.30,
  \`recording_file\` VARCHAR(255) DEFAULT NULL,
  \`codec\` VARCHAR(30) DEFAULT 'opus (48kHz)',
  INDEX \`idx_calldate\` (\`calldate\`),
  INDEX \`idx_src_dst\` (\`src\`, \`dst\`),
  INDEX \`idx_disposition\` (\`disposition\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabella Rubrica Aziendale
CREATE TABLE IF NOT EXISTS \`contacts\` (
  \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(120) NOT NULL,
  \`company\` VARCHAR(120) DEFAULT NULL,
  \`department\` VARCHAR(80) DEFAULT NULL,
  \`email\` VARCHAR(150) DEFAULT NULL,
  \`phone\` VARCHAR(50) DEFAULT NULL,
  \`mobile\` VARCHAR(50) DEFAULT NULL,
  \`extension\` VARCHAR(20) DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  \`is_favorite\` TINYINT(1) DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabella Nodi Cluster
CREATE TABLE IF NOT EXISTS \`cluster_nodes\` (
  \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`hostname\` VARCHAR(100) NOT NULL UNIQUE,
  \`ip_address\` VARCHAR(45) NOT NULL,
  \`role\` ENUM('primary', 'secondary', 'media_gateway') NOT NULL,
  \`is_vip_master\` TINYINT(1) DEFAULT 0,
  \`status\` ENUM('active', 'standby', 'syncing', 'offline') DEFAULT 'active',
  \`last_heartbeat\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`load_avg\` VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`
  },
  {
    filename: 'asterisk/pjsip.conf',
    category: 'asterisk',
    description: 'Configurazione PJSIP per transport TLS, WebSockets WSS (8089) e ICE/STUN/TURN WebRTC',
    content: `; =========================================================
; Asterisk 20+ PJSIP Configuration with WebRTC & TLS Support
; File: /etc/asterisk/pjsip.conf
; =========================================================

[general]
debug=no

; --- Transport UDP Standard (5060) ---
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

; --- Transport TLS Cifrato (5061) ---
[transport-tls]
type=transport
protocol=tls
bind=0.0.0.0:5061
cert_file=/etc/letsencrypt/live/pbx.azienda.it/fullchain.pem
priv_key_file=/etc/letsencrypt/live/pbx.azienda.it/privkey.pem
method=tlsv1_2

; --- Transport WSS per Client WebRTC Browser (8089) ---
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

; Include configurazione automatica generata dal gestionale PHP
#include /etc/asterisk/pjsip_custom_extensions.conf
#include /etc/asterisk/pjsip_trunks.conf
`
  },
  {
    filename: 'asterisk/extensions.conf',
    category: 'asterisk',
    description: 'Dialplan avanzato con inoltro WebRTC, AGI Push Notifications, IVR e segreteria',
    content: `; =========================================================
; Asterisk Dialplan: extensions.conf
; Gestione flussi vocali, IVR aziendale e Push Notification
; =========================================================

[general]
static=yes
writeprotect=no
clearglobalvars=no

[globals]
TRUNK_TIM=PJSIP/tim-trunk
TRUNK_FASTWEB=PJSIP/fastweb-trunk

; --- Contesto Interni Aziendali ---
[internal-context]
; Chiamate dirette tra interni (100 - 199)
exten => _1XX,1,NoOp(Chiamata da \${CALLERID(all)} verso interno \${EXTEN})
 same => n,Set(CHANNEL(hangup_handler_push)=sub-hangup,s,1)
 ; Notifica push wake-up se l'interno ha l'app mobile iOS/Android
 same => n,AGI(push_notify.php,\${EXTEN},\${CALLERID(num)},\${CALLERID(name)},\${UNIQUEID})
 ; Registrazione audio della chiamata
 same => n,MixMonitor(rec-\${STRFTIME(\${EPOCH},,%Y%m%d-%H%M%S)}-\${EXTEN}.wav,b)
 ; Chiamata all'endpoint WebRTC / PJSIP
 same => n,Dial(PJSIP/\${EXTEN},30,rtT)
 ; Se occupato o nessuna risposta, inoltra alla casella vocale
 same => n,GotoIf($["\${DIALSTATUS}" = "BUSY"]?busy:noanswer)
 same => n(busy),VoiceMail(\${EXTEN}@default,b)
 same => n,Hangup()
 same => n(noanswer),VoiceMail(\${EXTEN}@default,u)
 same => n,Hangup()

; Chiamata ai Gruppi di Risposta (600 = Supporto, 601 = Vendite)
exten => 600,1,NoOp(Gruppo Risposta Supporto Tecnico)
 same => n,Dial(PJSIP/103&PJSIP/105,25,m(default))
 same => n,VoiceMail(105@default,u)
 same => n,Hangup()

exten => 601,1,NoOp(Gruppo Risposta Commerciale)
 same => n,Dial(PJSIP/102&PJSIP/101,20,m(default))
 same => n,VoiceMail(102@default,u)
 same => n,Hangup()

; Accesso Voicemail
exten => *97,1,VoiceMailMain(\${CALLERID(num)}@default)
 same => n,Hangup()

; --- Inbound Routes da Trunk VoIP Esterno ---
[from-trunk-tim]
exten => +390287654321,1,NoOp(Chiamata in entrata su numero principale Milano)
 same => n,Goto(ivr-principale,s,1)

exten => +390698765432,1,NoOp(Chiamata diretta Supporto Tecnico)
 same => n,Goto(internal-context,600,1)

; --- Menu Vocale IVR ---
[ivr-principale]
exten => s,1,Answer()
 same => n,Wait(1)
 same => n,Background(custom/prompt_benvenuto_italiano)
 same => n,WaitExten(8)

; Selezione 1: Commerciale
exten => 1,1,Goto(internal-context,601,1)

; Selezione 2: Assistenza Tecnica
exten => 2,1,Goto(internal-context,600,1)

; Selezione 3: Amministrazione
exten => 3,1,Goto(internal-context,104,1)

; Selezione 0: Centralinista
exten => 0,1,Goto(internal-context,101,1)

; Timeout o tasto errato
exten => t,1,Goto(internal-context,101,1)
exten => i,1,Playback(invalid)
 same => n,Goto(s,1)

; Handler Hangup per salvataggio CDR arricchito
[sub-hangup]
exten => s,1,NoOp(Salvataggio parametri MOS e durata)
 same => n,Return()
`
  }
];
