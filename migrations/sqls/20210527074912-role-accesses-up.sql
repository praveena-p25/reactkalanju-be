CREATE TABLE IF NOT EXISTS `role_accesses` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `role_id` int DEFAULT NULL,
    `access_id` int DEFAULT NULL,
    `deleted_at` datetime DEFAULT NULL,
    `created_at` datetime NOT NULL,
    `updated_at` datetime NOT NULL,
    PRIMARY KEY (`id`)
)