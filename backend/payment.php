<?php
// payment.php
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
    'signature' => getenv('PAYPAL_SIGNATURE'),
    'bn_code' => getenv('PAYPAL_BN_CODE') ?: ''
];

$paypal = new PaypalApi($paypalConfig);

// Set up return and cancel URLs
$baseUrl = 'http://' . $_SERVER['HTTP_HOST'] . ':' . ($_SERVER['SERVER_PORT'] ?? '5502');
$paypal->returnURL($baseUrl . '/payment-success.php');
$paypal->cancelURL($baseUrl . '/payment-cancel.php');

// Get parameters from query string
$plan = $_GET['plan'] ?? '';
$userId = $_GET['user'] ?? '';
$paymentId = $_GET['paymentId'] ?? '';
$amount = $_GET['amount'] ?? 0;

// Define plan names for display
$planNames = [
    'basic' => 'Basic Plan',
    'premium' => 'Premium Plan', 
    'platinum' => 'Platinum Plan',
    'vip' => 'VIP Plan'
];

if (array_key_exists($plan, $planNames) && $amount > 0 && !empty($userId) && !empty($paymentId)) {
    // Create payment items array
    $items = [
        [
            'name' => "AI-MMI {$planNames[$plan]} Subscription",
            'price' => $amount,
            'quantity' => 1
        ]
    ];
    
    // Sample user data
    $shipTo = [
        'name' => 'Customer Name',
        'email' => 'customer@example.com',
        'street' => '123 Main St',
        'city' => 'City',
        'state' => 'State',
        'country_code' => 'AU',
        'zip' => '12345',
        'street2' => '',
        'phone_num' => '',
    ];
    
    // Create a unique hash to identify this transaction
    $hash = md5($userId . $plan . $paymentId . time());
    
    // Start checkout process
    $redirectUrl = $paypal->checkOut($items, $shipTo, $hash);
    
    // Store transaction details in session
    $_SESSION['payment_hash'] = $hash;
    $_SESSION['user_id'] = $userId;
    $_SESSION['plan'] = $plan;
    $_SESSION['payment_id'] = $paymentId;
    $_SESSION['amount'] = $amount;
    
    // Redirect to PayPal
    header("Location: " . $redirectUrl);
    exit();
} else {
    // Invalid parameters
    header("Location: /ai-mmi?error=invalid_payment_parameters");
    exit();
}
?>