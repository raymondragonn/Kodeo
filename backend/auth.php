<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function getAuthUser(): array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/Bearer\s+(.+)/i', $header, $m)) jsonError('No autorizado', 401);
    try {
        $secret  = getenv('JWT_SECRET') ?: 'kodeo_jwt_secret_dev';
        $decoded = JWT::decode($m[1], new Key($secret, 'HS256'));
        return (array) $decoded;
    } catch (\Throwable $e) {
        jsonError('Token inválido', 401);
    }
}
