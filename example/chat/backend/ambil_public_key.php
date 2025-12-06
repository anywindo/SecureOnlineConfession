<?php
require 'db.php';

$username = $_GET['username'] ?? '';

$stmt = $conn->prepare("SELECT Kuncipublik FROM chatkeys WHERE Nama = ?");
$stmt->bind_param("s", $username);
$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["error" => "Pengguna tidak ditemukan."]);
} else {
    $row = $result->fetch_assoc();
    echo json_encode([
        "username" => $username,
        "public_key" => $row['Kuncipublik']
    ]);
}

$stmt->close();
$conn->close();
?>
