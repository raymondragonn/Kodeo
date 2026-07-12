<?php

// Cargar .env si existe (Docker lo inyecta como variables de entorno reales,
// pero en hosting sin Docker hay que parsearlo aquí antes de leer getenv())
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        if (!getenv(trim($key))) putenv(trim($key) . '=' . trim($val));
    }
}

mb_internal_encoding('UTF-8');
mb_language('neutral');

define('STRIPE_SECRET_KEY',     getenv('STRIPE_SECRET_KEY')     ?: 'sk_test_REEMPLAZA_CON_TU_CLAVE_SECRETA');
define('STRIPE_PUBLISHABLE_KEY', getenv('STRIPE_PUBLISHABLE_KEY') ?: 'pk_test_REEMPLAZA_CON_TU_CLAVE_PUBLICA');
define('STRIPE_WEBHOOK_SECRET', getenv('STRIPE_WEBHOOK_SECRET')  ?: 'whsec_REEMPLAZA_CON_TU_WEBHOOK_SECRET');
define('ALLOWED_ORIGIN',        getenv('ALLOWED_ORIGIN')        ?: 'http://localhost:5000');
define('CAL_WEBHOOK_SECRET',    getenv('CAL_WEBHOOK_SECRET')    ?: '');
define('KODEO_WHATSAPP',        getenv('KODEO_WHATSAPP')        ?: '522298483706');
// Sesión persistente por dispositivo. Puede ajustarse sin cambiar código con
// JWT_SESSION_DAYS; 30 días equilibra comodidad y exposición del token.
define('JWT_TTL_SECONDS',        60 * 60 * 24 * max(1, (int)(getenv('JWT_SESSION_DAYS') ?: 30)));

define('SMTP_HOST',       getenv('SMTP_HOST')       ?: 'smtp.zoho.com');
define('SMTP_PORT',       (int)(getenv('SMTP_PORT') ?: 465));
define('SMTP_SECURE',     getenv('SMTP_SECURE')     ?: 'ssl');
define('SMTP_USER',       getenv('SMTP_USER')       ?: '');
define('SMTP_PASSWORD',   getenv('SMTP_PASSWORD')   ?: '');
define('SMTP_FROM_EMAIL', getenv('SMTP_FROM_EMAIL') ?: SMTP_USER);
define('SMTP_FROM_NAME',  getenv('SMTP_FROM_NAME')  ?: 'Kodeo');

/**
 * Envía un correo HTML vía SMTP (PHPMailer). Devuelve true/false; nunca lanza
 * para no filtrar al cliente si el envío falla (ver forgot-password.php).
 */
function sendMail(string $to, string $subject, string $html): bool {
    if (!SMTP_USER || !SMTP_PASSWORD) {
        error_log('[MAIL] SMTP no configurado — no se envió el correo a ' . $to);
        return false;
    }

    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host        = SMTP_HOST;
        $mail->Port        = SMTP_PORT;
        $mail->SMTPAuth    = true;
        $mail->Username    = SMTP_USER;
        $mail->Password    = SMTP_PASSWORD;
        $mail->SMTPSecure  = SMTP_SECURE === 'tls'
            ? \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS
            : \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        $mail->CharSet     = 'UTF-8';

        $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $html;

        // Logo embebido como adjunto con Content-ID (cid:kodeo-logo en el HTML).
        // Gmail y otros clientes bloquean las imágenes data:base64 inline, pero
        // sí soportan imágenes embebidas vía CID — por eso no usamos data URI aquí.
        $logoPath = __DIR__ . '/assets/logo-email.png';
        if (is_readable($logoPath)) {
            $mail->addEmbeddedImage($logoPath, 'kodeo-logo', 'logo-email.png', 'base64', 'image/png');
        }

        $mail->send();
        return true;
    } catch (\PHPMailer\PHPMailer\Exception $e) {
        error_log('[MAIL] Error al enviar a ' . $to . ': ' . $e->getMessage());
        return false;
    }
}


// Acentos por servicio — deben coincidir con ACCENT en frontend/src/components/ServicePage.jsx
const SERVICE_ACCENTS = [
    'Landing Page'   => '#63C44D', // --accent-green
    'Sitio Web'      => '#5170ff', // --accent-blue
    'Tienda Online'  => '#FFDE59', // --accent-yellow
];
const DEFAULT_EMAIL_ACCENT = '#5170ff';

/**
 * Envuelve el contenido de un correo en la plantilla de marca Kodeo: misma
 * paleta oscura, tipografía, acentos y botón pill que se usan en los
 * componentes del sitio (ver frontend/src/styles/globals.css y Checkout.jsx).
 *
 * El reto de un email 100% oscuro es que algunos clientes (sobre todo la app
 * de Gmail) reescriben los colores según el modo claro/oscuro del dispositivo
 * en vez de respetar los que mandamos. Para fijarlo combinamos tres técnicas:
 *   1. <meta name="color-scheme"/"supported-color-schemes" content="dark">
 *      — Apple Mail / Outlook.com lo respetan directamente.
 *   2. El hack de Gmail con [data-ogsc]: cuando Gmail decide "corregir" los
 *      colores, marca esos elementos con el atributo data-ogsc; al apuntarle
 *      con !important recuperamos nuestra paleta oscura original.
 *   3. bgcolor como atributo HTML además de background-color en CSS, porque
 *      clientes viejos (Outlook de escritorio) solo respetan el atributo.
 *
 * Usa tablas y estilos inline porque los clientes de correo no soportan
 * flexbox/grid de forma confiable.
 *
 * @param array{label: string, url: string}|null $cta
 */
function renderEmailLayout(string $heading, string $bodyHtml, ?array $cta = null, string $accent = DEFAULT_EMAIL_ACCENT): string {
    $year = date('Y');
    $ctaHtml = '';

    if ($cta) {
        $ctaHtml = '
        <tr>
          <td class="kd-card" style="padding: 4px 36px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#ffffff" class="kd-btn-bg" style="border-radius: 999px; background-color: #ffffff;">
                  <a href="' . htmlspecialchars($cta['url']) . '" target="_blank" class="kd-btn-text" style="display: inline-block; padding: 14px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; color: #161616; text-decoration: none;">
                    ' . htmlspecialchars($cta['label']) . ' &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>';
    }

    return '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <style>
    /* Gmail marca con data-ogsc los elementos a los que les "corrigió" el color.
       Apuntamos ahí para forzar de vuelta nuestra paleta oscura original. */
    [data-ogsc] .kd-page-bg   { background-color: #0e0e0e !important; }
    [data-ogsc] .kd-card      { background-color: #161616 !important; }
    [data-ogsc] .kd-heading   { color: #ffffff !important; }
    [data-ogsc] .kd-body      { color: #9b9b9b !important; }
    [data-ogsc] .kd-body strong, [data-ogsc] .kd-body b { color: #ffffff !important; }
    .kd-body strong[data-ogsc], .kd-body b[data-ogsc] { color: #ffffff !important; }
    [data-ogsc] .kd-footer    { color: #666666 !important; }
    [data-ogsc] .kd-btn-bg    { background-color: #ffffff !important; }
    [data-ogsc] .kd-btn-text  { color: #161616 !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0e0e0e;" bgcolor="#0e0e0e">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0e0e0e" class="kd-page-bg" style="background-color: #0e0e0e;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="#161616" class="kd-card" style="max-width: 560px; width: 100%; background-color: #161616; border: 1px solid #2a2a2a; border-radius: 16px; overflow: hidden;">
          <tr><td height="4" style="background-color: ' . htmlspecialchars($accent) . '; line-height: 4px; font-size: 0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#161616" class="kd-card" style="padding: 32px 36px 4px; background-color: #161616;">
              <img src="cid:kodeo-logo" alt="Kodeo" width="116" height="56" style="display: block; height: 56px; width: 116px; border: 0;">
            </td>
          </tr>
          <tr>
            <td bgcolor="#161616" class="kd-card" style="padding: 28px 36px 4px; background-color: #161616;">
              <h1 class="kd-heading" style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; letter-spacing: -0.3px; color: #ffffff;">' . htmlspecialchars($heading) . '</h1>
            </td>
          </tr>
          <tr>
            <td bgcolor="#161616" class="kd-card kd-body" style="padding: 4px 36px 8px; background-color: #161616; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.65; color: #9b9b9b;">
              ' . $bodyHtml . '
            </td>
          </tr>' . $ctaHtml . '
          <tr>
            <td bgcolor="#161616" class="kd-card" style="padding: 28px 36px 32px; background-color: #161616;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #2a2a2a;">
                <tr>
                  <td bgcolor="#161616" class="kd-card kd-footer" style="padding-top: 20px; background-color: #161616; font-family: Arial, Helvetica, sans-serif; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #666666;">
                    &copy; Kodeo ' . $year . ' &middot; Veracruz, MX
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
}

function setCorsHeaders(): void {
    $origin     = $_SERVER['HTTP_ORIGIN'] ?? '';
    $envOrigin  = ALLOWED_ORIGIN;

    // En desarrollo acepta cualquier origen localhost; en producción usa ALLOWED_ORIGIN exacto
    $isLocalhost = (bool) preg_match('/^https?:\/\/localhost(:\d+)?$/', $origin);
    $allowed     = ($isLocalhost || $origin === $envOrigin) ? $origin : $envOrigin;

    header('Access-Control-Allow-Origin: ' . $allowed);
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Vary: Origin');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// Recargo por Meses Sin Intereses — cubre la comisión que Stripe cobra por plan.
// Debe coincidir con MSI_SURCHARGE en frontend (Checkout.jsx / OrderPaymentPage.jsx).
const MSI_SURCHARGE_RATES = [
    3  => 0.05,
    6  => 0.075,
    9  => 0.10,
    12 => 0.125,
    18 => 0.175,
    24 => 0.225,
];

// Correo que recibe avisos internos (orden pagada, cargo extra aprobado)
define('ADMIN_NOTIFY_EMAIL', getenv('ADMIN_NOTIFY_EMAIL') ?: SMTP_FROM_EMAIL);

// Dominio cuyos correos reciben rol administrador automáticamente
define('ADMIN_EMAIL_DOMAIN', getenv('ADMIN_EMAIL_DOMAIN') ?: 'kodeo.mx');

function defaultRoleForEmail(string $email): string {
    return str_ends_with(strtolower(trim($email)), '@' . ADMIN_EMAIL_DOMAIN)
        ? 'administrador'
        : 'cliente';
}

/**
 * Sube a administrador en cada login/oauth si el correo es del dominio admin.
 * Nunca degrada: un administrador ya asignado conserva su rol.
 */
function ensureAdminRole(PDO $db, array $user): array {
    if ($user['role'] !== 'administrador' && defaultRoleForEmail($user['email']) === 'administrador') {
        $db->prepare("UPDATE users SET role = 'administrador' WHERE id = ?")->execute([$user['id']]);
        $user['role'] = 'administrador';
    }
    return $user;
}

// Días hábiles de desarrollo por servicio (debe coincidir con frontend/src/data/copy.js)
const SERVICE_DEV_DAYS = [
    '01' => 8,  // Landing Page
    '02' => 16, // Sitio Web
    '03' => 20, // Tienda Online
];
const DEFAULT_DEV_DAYS = 8;

/**
 * Suma días hábiles (lunes a viernes) a una fecha, saltando fines de semana.
 */
function addBusinessDays(string $fromDate, int $days): string {
    $date  = new DateTime($fromDate);
    $added = 0;
    while ($added < $days) {
        $date->modify('+1 day');
        if ((int)$date->format('N') < 6) $added++; // 1=lunes ... 5=viernes
    }
    return $date->format('Y-m-d');
}

function jsonError(string $message, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonSuccess(array $data): never {
    http_response_code(200);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Genera un username único a partir del nombre o del correo.
 * Se prueba primero la base derivada del nombre; si viene vacío (p. ej. en el
 * registro manual, donde el username se asigna automáticamente desde el correo)
 * se deriva de la parte local del email. Garantiza unicidad añadiendo un sufijo
 * numérico y, en el peor caso, un sufijo aleatorio.
 */
function generateUsername(PDO $db, string $name, ?string $email): string {
    $base = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode(' ', $name)[0]));

    if (!$base && $email) {
        $base = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode('@', $email)[0]));
    }

    if (!$base) $base = 'usuario';

    $stmt = $db->prepare('SELECT username FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$base]);

    if (!$stmt->fetch()) return $base;

    for ($i = 2; $i <= 9999; $i++) {
        $candidate = $base . $i;
        $stmt->execute([$candidate]);
        if (!$stmt->fetch()) return $candidate;
    }

    return $base . bin2hex(random_bytes(3));
}
