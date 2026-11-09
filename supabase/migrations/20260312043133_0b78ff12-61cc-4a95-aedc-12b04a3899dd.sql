INSERT INTO instructors (serial_number, employee_id, name, position) VALUES
(2, 497, 'Mr. Tarek Tawfik Mohammed', 'Training Supervisor'),
(8, 781, 'Ms. Mariam Amer Hamad Aleryani', 'Senior Trainer'),
(9, 782, 'Ms. Mariam Hamad Saif Albadi', 'Senior Trainer'),
(3, 788, 'Mr. Humaid Abdallah Mubarak Al Balushi', 'Training Supervisor'),
(5, 790, 'Mr. Khalid Said Ahmed Shah', 'Senior Trainer'),
(6, 801, 'Mr. AbdulRahman Maram Khan', 'Senior Trainer'),
(10, 858, 'Ms. Khaltham Khalaf Mohammed', 'Senior Trainer'),
(7, 859, 'Mr. Rashid Khan Habib ur rehman', 'Senior Trainer'),
(4, 1257, 'Mr. Gihad Mohamed Hassan', 'Training Supervisor'),
(1, 1512, 'Mr. Abdul Hameed Konnola', 'Training Supervisor')
ON CONFLICT (employee_id) DO UPDATE SET position = EXCLUDED.position, name = EXCLUDED.name;