USE `doctor_appointment_db`;

ALTER TABLE `medications`
  ADD COLUMN `doctor_id` INT NULL AFTER `patient_id`;

UPDATE `medications` m
JOIN `appointments` a ON a.id = m.appointment_id
SET m.doctor_id = a.doctor_id
WHERE m.doctor_id IS NULL;

ALTER TABLE `medications`
  ADD CONSTRAINT `fk_medications_doctor`
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL;