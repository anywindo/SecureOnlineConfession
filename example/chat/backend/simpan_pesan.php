<?php
require 'db.php';

// Ambil data JSON dari body request
$data = json_decode(file_get_contents("php://input"), true);
$asal   = $data['asal']   ?? '';
$tujuan = $data['tujuan'] ?? '';
$kunci  = $data['kunci']  ?? '';
$pesan  = $data['pesan']  ?? '';

// Simpan pesan ke tabel
$stmt = $conn->prepare("INSERT INTO chatmessages (Asal, Tujuan, Kunci, Pesan, Timestamp) VALUES (?, ?, ?, ?, NOW())");
$stmt->bind_param("ssss", $asal, $tujuan, $kunci, $pesan);

if ($stmt->execute()) {
    echo "Pesan berhasil disimpan.";
} else {
    echo "Gagal menyimpan pesan: " . $stmt->error;
}

$stmt->close();
$conn->close();
?>
