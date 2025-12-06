<?php
require 'db.php';

$username = $_GET['username'] ?? '';

// Ambil semua pesan yang ditujukan ke pengguna
$stmt = $conn->prepare("SELECT Asal, Kunci, Pesan, Timestamp FROM chatmessages WHERE Tujuan = ? AND Dibaca = false ORDER BY Timestamp DESC");
$stmt->bind_param("s", $username);
$stmt->execute();

$result = $stmt->get_result();
$messages = [];
while ($row = $result->fetch_assoc()) {
    $messages[] = [
        "asal" => $row["Asal"],
        "kunci" => $row["Kunci"],
        "pesan" => $row["Pesan"],
        "timestamp" => $row["Timestamp"]
    ];
}

echo json_encode($messages);

// ubah status
$stmt = $conn->prepare("UPDATE chatmessages SET Dibaca = true WHERE Tujuan = ? AND Dibaca = false");
$stmt->bind_param("s", $username);
$stmt->execute();

$stmt->close();
$conn->close();
?>

