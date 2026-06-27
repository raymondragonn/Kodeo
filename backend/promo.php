<?php

// Valida un código de descuento contra Stripe y devuelve el monto final.
// Si el código es inválido o hay error, devuelve el monto original sin cambios.
function resolvePromoCode(?string $code, int $amountCents): array {
    if (!$code || !trim($code)) {
        return ['final_amount' => $amountCents, 'discount' => 0, 'promo_code_id' => null];
    }

    try {
        $results = \Stripe\PromotionCode::all([
            'code'   => trim(strtoupper($code)),
            'active' => true,
            'limit'  => 1,
        ]);

        if (empty($results->data)) {
            return ['final_amount' => $amountCents, 'discount' => 0, 'promo_code_id' => null];
        }

        $promo  = $results->data[0];
        $coupon = $promo->coupon;

        if (!$coupon->valid) {
            return ['final_amount' => $amountCents, 'discount' => 0, 'promo_code_id' => null];
        }

        $discount = 0;
        if ($coupon->percent_off) {
            $discount = (int) round($amountCents * $coupon->percent_off / 100);
        } elseif ($coupon->amount_off) {
            $discount = min((int) $coupon->amount_off, $amountCents);
        }

        return [
            'final_amount'  => max(0, $amountCents - $discount),
            'discount'      => $discount,
            'promo_code_id' => $promo->id,
        ];
    } catch (\Exception $e) {
        return ['final_amount' => $amountCents, 'discount' => 0, 'promo_code_id' => null];
    }
}
