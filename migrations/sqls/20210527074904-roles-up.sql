CREATE TABLE IF NOT EXISTS `roles` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `role` varchar(255) DEFAULT NULL,
    `deleted_at` datetime DEFAULT NULL,
    `created_at` datetime NOT NULL,
    `updated_at` datetime NOT NULL,
    `status` tinyint(1) DEFAULT NULL,
    PRIMARY KEY (`id`)
)