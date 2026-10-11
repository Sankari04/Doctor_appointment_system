USE `doctor_appointment_db`;

ALTER TABLE `doctor_slots`
  ADD COLUMN `session_type` ENUM('Morning', 'Evening') NOT NULL DEFAULT 'Morning' AFTER `date`;

UPDATE `doctor_slots`
SET `session_type` = CASE WHEN HOUR(`start_time`) < 12 THEN 'Morning' ELSE 'Evening' END;

-- The old composite key also supplied the doctor_id index used by its foreign key.
CREATE INDEX `idx_doctor_slots_doctor_id` ON `doctor_slots` (`doctor_id`);

ALTER TABLE `doctor_slots`
  DROP INDEX `unique_doctor_datetime_slot`;

-- Keep existing availability rows and appointment foreign keys intact. Multiple legacy
-- time slots in the same session are grouped by the application into one session window.
UPDATE `appointment_queues` q
JOIN `appointments` a ON a.id = q.appointment_id
JOIN `doctor_slots` s ON s.id = a.slot_id
SET q.session_type = s.session_type;

ALTER TABLE `appointment_queues`
  ADD INDEX `idx_appointment_queues_doctor_id` (`doctor_id`);

SET @old_queue_index = (
  SELECT `index_name`
  FROM `information_schema`.`statistics`
  WHERE `table_schema` = DATABASE()
    AND `table_name` = 'appointment_queues'
    AND `index_name` IN ('unique_doctor_date_seq', 'unique_doctor_date_session_seq')
  GROUP BY `index_name`
  LIMIT 1
);
SET @drop_queue_index = IF(
  @old_queue_index IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE `appointment_queues` DROP INDEX `', @old_queue_index, '`')
);
PREPARE drop_queue_index_statement FROM @drop_queue_index;
EXECUTE drop_queue_index_statement;
DEALLOCATE PREPARE drop_queue_index_statement;

ALTER TABLE `appointment_queues`
  ADD UNIQUE KEY `unique_doctor_date_session_seq`
    (`doctor_id`, `date`, `session_type`, `sequence_number`);
