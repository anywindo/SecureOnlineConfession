<?php
$conn = new mysqli("localhost", "root", "", "uts");

if ($conn->connect_error) {
    die(json_encode(["error" => "Koneksi gagal: " . $conn->connect_error]));
}
?>
