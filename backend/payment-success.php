<?php
// payment-success.php
session_start();
require_once 'App/Libraries/PaypalApi.php';

// Load environment variables
function loadEnv($filePath) {
    if (!file_exists($filePath)) {
        return false;
    }
    
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        if (!array_key_exists($name, $_ENV)) {
            $_ENV[$name] = $value;
            putenv("$name=$value");
        }
    }
    return true;
}

// Load the .env file
loadEnv(__DIR__ . '/.env');

// Initialize PayPal API
$paypalConfig = [
    'api_live_mode' => getenv('PAYPAL_LIVE_MODE') === 'true',
    'username' => getenv('PAYPAL_USERNAME'),
    'password' => getenv('PAYPAL_PASSWORD'),
    'signature' => getenv('PAYPAL_SIGNATURE')
];

$paypal = new PaypalApi($paypalConfig);

try {
    // Confirm payment
    $paymentConfirmed = $paypal->confirm(
        $_SESSION['amount'],
        $_GET['token'],
        $_GET['PayerID']
    );
    
    if ($paymentConfirmed) {
        // Payment successful
        $userId = $_SESSION['user_id'];
        $plan = $_SESSION['plan'];
        
        // Clear session data
        unset($_SESSION['payment_hash']);
        unset($_SESSION['user_id']);
        unset($_SESSION['plan']);
        unset($_SESSION['payment_id']);
        unset($_SESSION['amount']);
        
        // Redirect to AI-MMI with success message
        header("Location: http://localhost:3000?payment=success&plan=" . urlencode($plan));
        exit();
    } else {
        throw new Exception("Payment confirmation failed");
    }
} catch (Exception $e) {
    // Payment failed
    header("Location: http://localhost:3000?payment=failed&error=" . urlencode($e->getMessage()));
    exit();
}
?>