<?php
require 'db.php';

$data = json_decode(file_get_contents("php://input"), true);
$username = $data['username'];
$public_key = $data['public_key'];

// Cek apakah nama sudah ada
$stmt = $conn->prepare("SELECT * FROM chatkeys WHERE Nama = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // Jika sudah ada > update kunci dan timestamp
    $stmt->close();
    $stmt = $conn->prepare("UPDATE chatkeys SET Kuncipublik = ?, Timestamp = NOW() WHERE Nama = ?");
    $stmt->bind_param("ss", $public_key, $username);
    $stmt->execute();
}else {
    $stmt->close();
    $stmt = $conn->prepare("INSERT INTO chatkeys (Nama, Kuncipublik, Timestamp) VALUES (?, ?, NOW())");
    $stmt->bind_param("ss", $username, $public_key);
    $stmt->execute();
}

echo json_encode(["status" => "success"]);
$stmt->close();
$conn->close();
?>
