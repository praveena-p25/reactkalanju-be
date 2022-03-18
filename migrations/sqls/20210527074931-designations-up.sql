CREATE TABLE IF NOT EXISTS `designations` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `title` varchar(255) DEFAULT NULL,
    `branch` varchar(255) DEFAULT NULL,
    `start_date` date DEFAULT NULL,
    `end_date` date DEFAULT NULL,
    `resource_id` bigint NOT NULL,
    `created_at` datetime(6) NOT NULL,
    `updated_at` datetime(6) NOT NULL,
    `branch_id` bigint DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `index_designations_on_resource_id` (`resource_id`),
    KEY `index_designations_on_branch_id` (`branch_id`),
    CONSTRAINT `designation-resources` FOREIGN KEY (`resource_id`) REFERENCES `resources` (`id`)
)