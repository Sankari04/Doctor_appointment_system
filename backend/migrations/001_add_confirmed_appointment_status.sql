USE `doctor_appointment_db`;

ALTER TABLE `appointments`
  MODIFY `status` ENUM('booked', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'booked';