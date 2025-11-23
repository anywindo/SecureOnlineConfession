<?php
declare(strict_types=1);

session_start();
$role = $_SESSION['role'] ?? null;
session_unset();
session_destroy();

session_start();
$farewell = $role === 'priest'
    ? 'You have been signed out. Thank you for guiding the flock.'
    : 'You have been signed out. Peace be with you.';
$_SESSION['flash_success'] = $farewell;

header('Location: index.php');
exit;
