-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 23, 2025 at 04:19 AM
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

CREATE DATABASE `db_kripto_confession`;
USE `db_kripto_confession`;

-- --------------------------------------------------------

--
-- Table structure for table `confessions`
--

CREATE TABLE `confessions` (
  `id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `recipient_id` int(11) DEFAULT NULL,
  `subject` varchar(150) DEFAULT NULL,
  `follow_up` text DEFAULT NULL,
  `resolved` tinyint(1) DEFAULT 0,
  `iv` varchar(255) NOT NULL,
  `ciphertext` longtext NOT NULL,
  `message_hash` char(64) NOT NULL,
  `signature` longtext NOT NULL,
  `reply_ciphertext` longtext DEFAULT NULL,
  `reply_iv` varchar(255) DEFAULT NULL,
  `reply_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `full_name`, `password_hash`, `role`, `public_key`, `encrypted_private_key`, `created_at`) VALUES
(8, 'priest', 'Father John', '$2y$10$057AeA6WIwoZNxt/Y8NhF.jFZCcQQht/TjMbpffXoWGl9JxBDYc7q', 'priest', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzmbDOyLbjzPljakKY/sg\nzRzFGpqCdb7+MsxObxyB0jERUfcNJgrGIX5xw2oPvGdOswwIg2LeJWzvG5J4HIxK\n5zGqvCL2n9aKmJPsMfrhkYoC2AUJMeLRjSa0nXF0ATQtZ1V1nzi7dsvytKxgB9V3\n7/CcV3LsJQXIcLc/cENlNMoa5iquT1g9rfGr735QKG/upyq64l5GCQQ3jEVollbB\n6YO2dGphfR5QC3c5mPZHYAaUzYUY1oIvmgQOEN9aJRmTOpTmKu6EvFpsVKQzVHiv\nR0CPv0KogkrA7W6KvXwxUmBps0kODOxNnNeffYuoy896XJF8aMcBPrRNnchCSwj9\npwIDAQAB\n-----END PUBLIC KEY-----\n', '{\"iv\":\"PcaG+mqap1fzlYeZpyX\\/wA==\",\"ciphertext\":\"YJSczxlSAQT9MMLbfLft29A519lyn7ta6hblD0b\\/hTGW4SFCseGFX8OAqQ7atDDqhEuAKWuWPINkiHu+j7\\/I+1MwIi2\\/CFcfx8anU8K8bVuT0evxgbHvbZ6jnfqWAWj0A5P2GYN5WHawoga06HeGLiGDoEyB2DOg\\/WXycyHXf9rWHDzoizQrwCiQ+Ur\\/dwOAdlac2tjhLJapclZ7bW92uGBxssw5F4RD0Y2yk7lQFuojV2ceL04ymzT+62D3qaZPxwBAbHB\\/9Pn8sY2rhsAjVYhopEQVzQh2d0d\\/SrPsNUsArX2DvcpMSqU1bWvSgUOdbkbIUIyeN41QxglV\\/PGjNd3hr65\\/1\\/fK9cKSKP+HXXUCuOPHyRvvschWr5h\\/KY0f6lTsnR7L16wlV3R5NYAh5zeo3DjW9RPk\\/TF\\/LwTzk0ct01e4MjHKdr8zAvQYzErCacDZpJ31+KZeCA8xy+ToFKziKRNJ2hHuQqlIxoBsZe4dCl0s6Sw74qjhNcfTKqvoA\\/oKBT4gjFSNv4HveNC5lEIDpDVK1ZUA0ZDtj9yNzfi0sEGS8fhWavNhN1f0kX8yJnTZE5I9DDzvZ7Ec+7B0ewgvMNpYdeBvEB3zuGVVK7Ct2b9Yi5Lh5qSyyIYsDlUTahOq37+c0DCkX9rVAdorh3HrRzGNf9RUOPcvP9yCmHP5xA\\/2syWRy3t0Rv\\/y4irPRPQ+O3dU28ozHzcfxRl4aliyn7dEzNevi8o\\/miA1Kn\\/v1ci33Kk9Z+movP2HiB4dR1ylvsAEyCLRsbPRlQIbeOOKC2qPLIJoYdn0spm6Sh+fAisFh1EAvdiru6h5KNzFscm1PqHJkDdYRkqMT2PHmfm2m0AcQ\\/fEDr4ufJhIFFnqGWzQglUXoREb2KXGAZJloALNnUuRETNUvN2WzAWx0WQZleMWjTjXHafNjpkGofglL1T2qEVGaPIMOtWPBjGpg1tDYUsclTW8lalNIKCPZabuuhEHjJH+EGMboE1HzPsg1ic+dTrdVo6EYsDKyjnQ8Du05dy0d\\/5yOnvga0oQBTIug+ZadAWnGoGI\\/GduRPcMcCFd4i4t19unYPjfytcmG+FrajoDA2BsLxthKj5RgCS274l2gCy+vlEFEUONn7zGlropePvHpzddf4EjvlgHn4h45I\\/GU74YJfcN1rCKzBbPooR\\/wnPQD5CHf4OaPdzsXMvkjBIqMaL4\\/\\/LtsoPuyaZMjetSMiH4cCc+pbv8T+1dqqhVEQy8INyQca1TBXo\\/Q19mq3EcIGofwvZhgBCTMkj6L\\/byfHorr\\/IkGIrHQO8zxNS4xnH6wgF3gTSkOnxFADlIM\\/V\\/k1r377f9ZX4CzUoh3V3qjjAyoowNL2Y3unQnY5HVryfN66x\\/+nSi9TcgcXCR0cNjZeCkSXLOnTZdFtvlTWd74dartk3XA45p+rCCuQHu\\/oi8jNlKFEBS6UmqK5mQYUnbisQWzNeGDMqlkz1PYgHxe0All9Xp9ZIS3PhmL4uzYBy5+JrNjQwBEZB1cgpihHhL6H5Z5zxVvKpLbhnA8dMN7sAuk72SznZ8APVUAnp+rxqXNhiBfszbRgeLFM0RUtNIGzOVjPxlpjiT9FwckmVW0rZwzokN609m1ow+HntLYW9d98yZ+msbTC64UR9zTq0Y2M2hxMx\\/ZJ9+6gvbYqVcaoHT84x9rOgTEu29t86iktriTPLxkEO8lUGGs+i5e4ZaSopcGhcanx4sLOc+c6HTO9BJHYH4Zt8H80VPqVMKq5NIpQDSTXtDgY8JTQ1SYTv10aOf3MXPUfSlupsNHZ2YoE65CBB\\/AmkMXvkWMzMnD3QUktuvldvVH3r0NQltl9oeFon44yhmhaixisbHjQD+O8QVEfm8kceXG2P1yWh+r4\\/AGuyBp2r2pQOOTenlic+UkTBvyjgK0A5PBAMDHU4JkFCfFW5Thy89MDl5SEjM8eNpBWgpu4Move8fv8TAAEptkboqKkL39V8b0V\\/PEgNSxLAt24YXCbnwpXDw7QvenTnhK75RIdBv1q60daBTmRszbkQxnslfUmWSv+GbzIi+aAXYI9fqTsnLh6cgZMJISy7GzvypbFj0Xo3P\\/tdu9Kd8BT6\\/gzp5dCL8U6R0bEV\\/BO+RctAmcPmdlCt4TvwZR7ufR0wICdDKzkF5PL3ItZFlcDSWnY7qEVtBncvHj0ubrkoILm0jGfGGcuu5T\\/A+i5bgQdj0R7PaTC446lG1mZ3i0URhs8HFd8qLB8ue86UiVkB2owqokTVBK6jCXThCT1SGQRIW+vzKreE=\"}', '2025-11-23 02:24:25'),
(9, 'user', 'Joel Miller', '$2y$10$gWkZKQxI6jS2/fvShS78S.HFs6wpz/sjMsJEV6nlOfPh235sousC2', 'user', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7mRkbHpInZfD6xSm7onv\nm8dN6JXJFf/hSjNJJquNvxCH/8pQI3prwVqhccHlxRICYm+DmX1VuVmp+LWmmVnB\ncxCemywjozLTSBOfADA3bsxGwCh5pja0+DWNLIEWJhlkgf9QGOVoXHTRdFif0g0/\nHaRd4NlzrSdwLgksGoZmHsA839NuWaqE/H2ID3crEpmW0S2aISkw/klmKfxqKyGE\nPB2dVkQ/Eckg9yaCf/ZDyQ0e0c6QuF023yvGsMN/MydnC6h0trGJTzjkrbpyY8Ct\nFVEskFldOgYLkD2lcsB7h9hSVuupHtjUH5lMu2b46nruyYm2EiiRTWDk0b+p+qef\n/QIDAQAB\n-----END PUBLIC KEY-----\n', '{\"iv\":\"fgY2Iagb\\/MioOjRHiwBICQ==\",\"ciphertext\":\"PbNJdqsOyTkiCizTrRvU2ajjv1XBOithIAcT\\/qKhly6Rt\\/nLx08ZroMJ6xHTFIowkm7mpwgIHAIeX2lyDWlgnDUBiCACagoycZr\\/Yegfq5C\\/Ks6fA40q3xaqD0G5qistrDZzuWaVAc47FbAtZJ9suiCfU5uEcHAdAfgfpfSA1IDANL4QikiaqJ+N9FMWpBn0d\\/3Y2\\/UtHFJQkJsbK78jr8PXmaCUHlhNoNJHlWL1TLfLL9\\/8X6QUVIbDEcHJWVq4\\/3\\/AuBhZNo1kd6sjrEECV+PescLZm5W6GymiLVDpyvhQvMIZZieWK28TVM+ifjfBB7qHGMNOCLfBN5g74HlVsHxnEqnB73wTb5rHu4j6JQHBU7ttxa34BjKJkL2\\/QwSSX8716fTdu9sUsge4ko8R+hAFk0bir7gAbShyt3U7DOwFrSmZRV3h1bDOeqiOW1CkK7T+1EmY6LEDUR5tRK9uhjKI0Ax29gGD38N6LZBNwiVQ0OSJRy35kTJjEfdciJjJ3ewG62HZVGr+nEs5NBOkK4pidktkR7ofg++9gcZyCEWKrVYX3kHee\\/PYr+p\\/Y5cXMo8m2cONbJ4MwiE97Is5mrKOvZrT+riHMilX5ch\\/\\/z\\/Y0wHSue7diicD4Af607c6scKg\\/sBXZXOsb6+JcXL9uBuBJnEITAx6WWWOTYBoiI2ixCVVytKkFhFtw+txMyWo1kjkhTOJD9\\/zAijQCtvt8EN70c+WpKA4LcSHgu2ddUSR7zZB4I8XXGLLa7UH1U\\/m8O8u9uvMuiCa9k2rlxXXCWEKGOHG+BomRY27KcEJntPODibL8SqUpYjYEUyCOYBTuT4UAm6CRnzBWL\\/TucMVsauOEANXB\\/3wwO0bn8LWG3FZ89pdMQyVmygZjK7BEU\\/EtA26I470UO+IMz1yAK12d8ebQQnbaMz5WpMrCfiJbuL8kFTS7bGM9UOjoxLQ0\\/0GO7wdFDdcU+Oxfva719BlkdhDNyhuqFf+Xot45KtwWq8UcVN7\\/9yvrpiNF2rF9XcLVITTxF8k2z569egQHljJoROZs9a4qQPC0zgU7fW7ymM+zv\\/q\\/WdfF9GQ2ROse2rHrN08ZVqIUhxJo1iDCH95aDgTOvKFwK5o1EwtUJIScc4V\\/3r17IHdzIgsXCpU6\\/1nwMUcahbZ8IpsR4qJQ9HmnE9LxmdiERGa8WPPk2a9LIfo3bQtxL6PsrchHm42DZVSqmRMoVHv96gEPW6+fVUX5azO70pib6UL7hVn54ChMV95l0elRkJW3bcssFDFaBXgz\\/esrCahuUVQiIkHl8n6xPiW6Y\\/ftke8VFKq30gX\\/EUA4O8JAWp84SZ98B9fweFxqJ08misut6rZaUW+LJoZ39qE+F5mx1+pj14NVKczQRv\\/LsVci5T5DVjokhEOd8lIuFRcvL4t3AvrkdIHa7gdeTpV0mY0YhqVeeObx48eNMzCNHemC5FbF\\/H82iGS5uPo7iTexPaTUIsAsd3eL0B95rY9gttXh7EhErJ\\/Z2ZHv8tBQ5MCnnKUg1yTnKNd35TEg4sYs1y06N3hvzkwlGoUuSjoQ8xA9LWd5cnZiHsu\\/gAaG1ucaJQ0u8UImnc2GvZd7eezQx5udAQcDegPRtY3MIVCfYpXdMOxwgvfTARdVBUnGtO\\/oq7f6vM90pvFDGxXIrQ7TrV1NQXH03z+lhL7k1uidn\\/sHIhM\\/VyTB09NDEEcUkJFh6\\/FoEoX7huuPA0V\\/wXN7HpeqjdxPHDpKETGBKyxkoJF+H7ZQ2x8X4JmikZzeeqVbAI5XKbkN5MIpqkpGLGEVPAwTBuN0RTjX2AgvgAgo+9+et2pdASNwxJ7ql8Nf9AwLXEERH1pFZXfYJONlUOrIa8LLS5rVxBVRLKwHUKRFMo43N0ZoAclPYm+Znjej9sSA1Y\\/CMrWDtyFrhWaOOIFO\\/QItTKtAwWawPanXR1WO5GjCmxoi8rDJhPeihB8p3EDsaXTtnCvkT\\/cG4eWkV+p\\/wA80RatZU2KZQfVD1jzPYkKf838qlDeNrjaE5o\\/yxDDzDizvR85fRjUp7MfuAfKVmPljfme\\/B2z200iNIXgLjpBHvA1FsqwJyopTpLdsdLuHUoqqBQiO4kBCaXmPu23IRaRbLJ\\/RzejQcAWUN+Uyh07+QmBvfL8zxnyHZ7GHPOizghfAi5AGbhSaWxRDf4pYmh2E9\\/EuAVAFOHHvjK5UQ3FuWBs4PrJ2ZM7ehTrKBFjZeH6KXbUPzAtl7gUpkjTVMbXNQAJ8Gf\\/stq9GgSavRewxG\\/DpwcoPKED4Z8=\"}', '2025-11-23 02:25:01');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `confessions`
--
ALTER TABLE `confessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_confessions_sender` (`sender_id`),
  ADD KEY `fk_confessions_recipient` (`recipient_id`);

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
-- AUTO_INCREMENT for table `confessions`
--
ALTER TABLE `confessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `confessions`
--
ALTER TABLE `confessions`
  ADD CONSTRAINT `fk_confessions_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_confessions_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
