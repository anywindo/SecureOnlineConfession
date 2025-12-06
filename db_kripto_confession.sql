-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Dec 06, 2025 at 03:02 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_kripto_confession`
--

DROP DATABASE IF EXISTS `db_kripto_confession`;
CREATE DATABASE `db_kripto_confession`;
USE `db_kripto_confession`;

-- --------------------------------------------------------

--
-- Table structure for table `chat_keys`
--

CREATE TABLE `chat_keys` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `public_key` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chat_keys`
--

INSERT INTO `chat_keys` (`id`, `user_id`, `public_key`, `updated_at`) VALUES
(1, 9, '04563213245b4f1f0e59153ece4d8ea2be0d0269c0a14d0cbded682215f988027528e60970e73a4426c677ab33597f9319988a1c9ec86d72c275d87db9b7839302', '2025-12-06 00:38:54'),
(2, 8, '0462c17e8b23836781a3bf1440b5757cad8b6fe2278059a9f5f13f1a043d4b725f7a87f8b6aa31e7c6d4d541b73546b8925ab296a22c4b9a2bd4b35dc0185c0c0f', '2025-12-06 00:55:29');

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL,
  `thread_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `sender_public_key` text NOT NULL,
  `recipient_public_key` text DEFAULT NULL,
  `ciphertext_b64` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chat_messages`
--

INSERT INTO `chat_messages` (`id`, `thread_id`, `sender_id`, `sender_public_key`, `recipient_public_key`, `ciphertext_b64`, `created_at`, `read_at`) VALUES
(10, 6, 9, '04563213245b4f1f0e59153ece4d8ea2be0d0269c0a14d0cbded682215f988027528e60970e73a4426c677ab33597f9319988a1c9ec86d72c275d87db9b7839302', '0462c17e8b23836781a3bf1440b5757cad8b6fe2278059a9f5f13f1a043d4b725f7a87f8b6aa31e7c6d4d541b73546b8925ab296a22c4b9a2bd4b35dc0185c0c0f', '1SzCm+Dce+hJa/UCefD7k6zKSksr/G8sfV+kBGW6FderdF1nbw5w6Njx0PT266Ml', '2025-12-06 01:26:17', NULL),
(11, 6, 8, '0462c17e8b23836781a3bf1440b5757cad8b6fe2278059a9f5f13f1a043d4b725f7a87f8b6aa31e7c6d4d541b73546b8925ab296a22c4b9a2bd4b35dc0185c0c0f', '04563213245b4f1f0e59153ece4d8ea2be0d0269c0a14d0cbded682215f988027528e60970e73a4426c677ab33597f9319988a1c9ec86d72c275d87db9b7839302', 'gDU03uvQS+q8hpGOyhIMM641ktE3TJlhvycQCv3z8DfTc8/tGume8Hx6AcEgGtr6', '2025-12-06 01:26:39', NULL),
(12, 6, 9, '04563213245b4f1f0e59153ece4d8ea2be0d0269c0a14d0cbded682215f988027528e60970e73a4426c677ab33597f9319988a1c9ec86d72c275d87db9b7839302', '0462c17e8b23836781a3bf1440b5757cad8b6fe2278059a9f5f13f1a043d4b725f7a87f8b6aa31e7c6d4d541b73546b8925ab296a22c4b9a2bd4b35dc0185c0c0f', 'F+SjpO/jbeVWUgJXum1WpNe6AM0HNbJEXaQID7hW7t8=', '2025-12-06 01:52:43', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `chat_threads`
--

CREATE TABLE `chat_threads` (
  `id` int(11) NOT NULL,
  `penitent_id` int(11) NOT NULL,
  `priest_id` int(11) NOT NULL,
  `subject` varchar(150) NOT NULL,
  `resolved` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chat_threads`
--

INSERT INTO `chat_threads` (`id`, `penitent_id`, `priest_id`, `subject`, `resolved`, `created_at`, `updated_at`) VALUES
(6, 9, 8, 'Session One', 1, '2025-12-06 01:26:17', '2025-12-06 01:52:43');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('user','priest') NOT NULL DEFAULT 'user',
  `public_key` text NOT NULL,
  `encrypted_private_key` text NOT NULL,
  `salt` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--



--
-- Indexes for dumped tables
--

--
-- Indexes for table `chat_keys`
--
ALTER TABLE `chat_keys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_chat_keys_user` (`user_id`);

--
-- Indexes for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chat_messages_thread` (`thread_id`),
  ADD KEY `idx_chat_messages_sender` (`sender_id`);

--
-- Indexes for table `chat_threads`
--
ALTER TABLE `chat_threads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chat_threads_priest_resolved` (`priest_id`,`resolved`),
  ADD KEY `idx_chat_threads_penitent` (`penitent_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `chat_keys`
--
ALTER TABLE `chat_keys`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `chat_threads`
--
ALTER TABLE `chat_threads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chat_keys`
--
ALTER TABLE `chat_keys`
  ADD CONSTRAINT `fk_chat_keys_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `fk_chat_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chat_messages_thread` FOREIGN KEY (`thread_id`) REFERENCES `chat_threads` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_threads`
--
ALTER TABLE `chat_threads`
  ADD CONSTRAINT `fk_chat_threads_penitent` FOREIGN KEY (`penitent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chat_threads_priest` FOREIGN KEY (`priest_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
