<?php
/**
 * Transferencia bancaria SPEI (México).
 * Genera una CLABE interbancaria única por cliente para realizar la transferencia.
 * La confirmación puede tardar minutos u horas según el banco emisor.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$body = json_decode(file_get_contents('php://input'), true);

$amount = $body['amount'] ?? null;   // Centavos MXN
$name   = trim($body['name'] ?? '');
$email  = trim($body['email'] ?? '');

if (!$amount || !is_numeric($amount) || $amount < 1000) {
    jsonError('Monto inválido. Mínimo 1000 centavos ($10 MXN).');
}
if (!$name) {
    jsonError('El nombre del cliente es requerido.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Email inválido.');
}

\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

try {
    // Crear o recuperar cliente de Stripe
    $customers = \Stripe\Customer::search([
        'query' => "email:'{$email}'",
        'limit' => 1,
    ]);

    if (count($customers->data) > 0) {
        $customer = $customers->data[0];
    } else {
        $customer = \Stripe\Customer::create([
            'name'  => $name,
            'email' => $email,
        ]);
    }

    $paymentIntent = \Stripe\PaymentIntent::create([
        'amount'               => (int)$amount,
        'currency'             => 'mxn',
        'customer'             => $customer->id,
        'payment_method_types' => ['customer_balance'],
        'payment_method_data'  => [
            'type' => 'customer_balance',
        ],
        'payment_method_options' => [
            'customer_balance' => [
                'funding_type' => 'bank_transfer',
                'bank_transfer' => [
                    'type' => 'mx_bank_transfer',
                ],
            ],
        ],
        'confirm' => true,
    ]);

    $bankTransfer = $paymentIntent->next_action->display_bank_transfer_instructions ?? null;

    jsonSuccess([
        'paymentIntentId' => $paymentIntent->id,
        'customerId'      => $customer->id,
        'status'          => $paymentIntent->status,
        'bankDetails'     => $bankTransfer ? [
            'clabe'       => $bankTransfer->financial_addresses[0]->spei->clabe ?? null,
            'bankName'    => $bankTransfer->financial_addresses[0]->spei->bank_name ?? 'STP',
            'reference'   => $bankTransfer->reference ?? null,
            'amountDue'   => $bankTransfer->amount_remaining ?? (int)$amount,
            'currency'    => 'MXN',
        ] : null,
    ]);
} catch (\Stripe\Exception\ApiErrorException $e) {
    jsonError($e->getMessage());
}
