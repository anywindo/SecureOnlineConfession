<?php
declare(strict_types=1);

session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require __DIR__ . '/login.php';
    exit;
}

header('Location: ../index.html');
exit;
