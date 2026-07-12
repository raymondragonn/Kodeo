<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

setCorsHeaders();

$auth = getAuthUser();
if ($auth['role'] !== 'administrador') jsonError('Acceso denegado', 403);

$db = getDb();

// ── GET — detalle de un usuario (con historial) ────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && (int) ($_GET['id'] ?? 0) > 0) {
    $id = (int) $_GET['id'];

    $stmt = $db->prepare(
        'SELECT id, name, username, email, role, oauth_provider, verified_at, created_at
         FROM users WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$id]);
    $u = $stmt->fetch();
    if (!$u) jsonError('Usuario no encontrado', 404);

    // Pedidos (compras vía checkout)
    $orders = [];
    try {
        $stmt = $db->prepare(
            'SELECT id, service, amount, status, notes, start_date, delivery_date, created_at
             FROM orders WHERE user_id = ? ORDER BY created_at DESC'
        );
        $stmt->execute([$id]);
        $orders = $stmt->fetchAll();
    } catch (Throwable $e) { $orders = []; }

    // Proyectos + sus órdenes de pago
    $projects = [];
    try {
        $stmt = $db->prepare(
            'SELECT id, name, status, notes, created_at
             FROM projects WHERE user_id = ? ORDER BY created_at DESC'
        );
        $stmt->execute([$id]);
        $projects = $stmt->fetchAll();
        foreach ($projects as &$p) {
            $ps = $db->prepare(
                'SELECT id, descripcion, amount, currency, tipo_pago, status, permite_msi, es_cargo_extra, paid_at, created_at
                 FROM payment_orders WHERE project_id = ? ORDER BY created_at DESC'
            );
            $ps->execute([$p['id']]);
            $p['payment_orders'] = $ps->fetchAll();
        }
        unset($p);
    } catch (Throwable $e) { $projects = []; }

    // Citas agendadas
    $appointments = [];
    try {
        $stmt = $db->prepare(
            'SELECT id, service, service_code, call_type, scheduled_at, status, project_details, amount, payment_enabled, created_at
             FROM appointments WHERE user_id = ? ORDER BY scheduled_at DESC'
        );
        $stmt->execute([$id]);
        $appointments = $stmt->fetchAll();
    } catch (Throwable $e) { $appointments = []; }

    jsonSuccess([
        'user'         => $u,
        'orders'       => $orders,
        'projects'     => $projects,
        'appointments' => $appointments,
    ]);
}

// ── GET — listar usuarios ──────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->query(
        'SELECT id, name, username, email, role, created_at
         FROM users
         ORDER BY created_at DESC'
    );
    jsonSuccess(['users' => $stmt->fetchAll()]);
}

// ── POST — crear nuevo usuario (con rol elegible) ─────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $name     = trim($body['name']     ?? '');
    $username = trim($body['username'] ?? '');
    $email    = trim($body['email']    ?? '');
    $password =      $body['password'] ?? '';
    $role     = in_array($body['role'] ?? '', ['cliente', 'administrador'], true)
                ? $body['role'] : 'administrador';

    if (!$name)                                               jsonError('El nombre es requerido');
    if (!$username)                                           jsonError('El usuario es requerido');
    if (!preg_match('/^[a-z0-9_]{3,30}$/', $username))       jsonError('Usuario inválido: solo letras minúsculas, números y guión bajo (3-30 caracteres)');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))           jsonError('Correo inválido');
    if (strlen($password) < 8)                               jsonError('La contraseña debe tener al menos 8 caracteres');

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ? OR username = ?');
    $stmt->execute([$email, $username]);
    if ($stmt->fetch()) jsonError('Este correo o usuario ya está registrado', 409);

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->prepare('INSERT INTO users (name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')->execute([$name, $username, $email, $hash, $role]);
    $newId = (int) $db->lastInsertId();

    $stmt = $db->prepare('SELECT id, name, username, email, role, created_at FROM users WHERE id = ?');
    $stmt->execute([$newId]);
    jsonSuccess(['user' => $stmt->fetch()]);
}

// ── PATCH — cambiar rol de un usuario ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) jsonError('ID requerido');

    if ($id === (int) $auth['sub']) jsonError('No puedes cambiar tu propio rol', 403);

    $body = json_decode(file_get_contents('php://input'), true);
    $role = $body['role'] ?? '';

    if (!in_array($role, ['cliente', 'administrador'], true)) {
        jsonError('Rol inválido. Valores permitidos: cliente, administrador');
    }

    $stmt = $db->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) jsonError('Usuario no encontrado', 404);

    $db->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $id]);

    jsonSuccess(['message' => 'Rol actualizado']);
}

jsonError('Método no permitido', 405);
