<?php
// payment-cancel.php
session_start();

// Clear session data
unset($_SESSION['payment_hash']);
unset($_SESSION['user_id']);
unset($_SESSION['plan']);
unset($_SESSION['payment_id']);
unset($_SESSION['amount']);

// Redirect back to Migration AI
header("Location: http://localhost:3000?payment=cancelled");
exit();
?>