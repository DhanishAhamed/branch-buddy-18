-- Insert sample properties with location data for Calicut and Kochi branches
-- Using PostGIS POINT(longitude, latitude) format

INSERT INTO public.properties (title, description, address, price, area_sqft, bedrooms, bathrooms, status, portal_type, property_type_id, branch_id, location) VALUES

-- CALICUT RESIDENTIAL PROPERTIES
('Serene Hillside Villa', 'Luxurious 4BHK villa with panoramic views of the Western Ghats. Features include a private swimming pool, landscaped garden, and smart home automation.', 'Chelavoor, Kozhikode', 25000000, 3500, 4, 4, 'available', 'residential', '46da556c-4320-487c-9eac-f31f161ddd7d', '563be887-e06b-43f6-b67e-b38f0dc241f1', ST_SetSRID(ST_MakePoint(75.8156, 11.2588), 4326)),

('Modern Beach Apartment', '3BHK sea-facing apartment in premium gated community. Walking distance to Kozhikode beach with 24/7 security and modern amenities.', 'Beach Road, Kozhikode', 8500000, 1800, 3, 2, 'available', 'residential', '9e3534c2-c304-47ad-883c-379c36d743bc', '563be887-e06b-43f6-b67e-b38f0dc241f1', ST_SetSRID(ST_MakePoint(75.7657, 11.2500), 4326)),

('Garden View House', 'Spacious independent house with beautiful garden. Perfect for families seeking tranquility in the heart of the city.', 'West Hill, Kozhikode', 12000000, 2400, 4, 3, 'available', 'residential', '025798ca-0afa-464b-bf25-34d380713765', '563be887-e06b-43f6-b67e-b38f0dc241f1', ST_SetSRID(ST_MakePoint(75.7894, 11.2725), 4326)),

('Compact City Apartment', 'Well-designed 2BHK apartment near Mavoor Road. Close to shopping centers, hospitals, and schools.', 'Mavoor Road, Kozhikode', 4500000, 1100, 2, 2, 'available', 'residential', '9e3534c2-c304-47ad-883c-379c36d743bc', '563be887-e06b-43f6-b67e-b38f0dc241f1', ST_SetSRID(ST_MakePoint(75.7933, 11.2553), 4326)),

('Premium Penthouse', 'Exclusive penthouse with private terrace and stunning city views. Features include home theater, modular kitchen, and dedicated parking.', 'YMCA Road, Kozhikode', 18500000, 2800, 3, 3, 'available', 'residential', '9e3534c2-c304-47ad-883c-379c36d743bc', '563be887-e06b-43f6-b67e-b38f0dc241f1', ST_SetSRID(ST_MakePoint(75.7822, 11.2598), 4326)),

-- CALICUT COMMERCIAL PROPERTIES
('Prime Office Complex', 'Class A office space in the business hub. Includes conference facilities, fiber connectivity, and ample parking.', 'Malaparamba, Kozhikode', 35000000, 5000, NULL, NULL, 'available', 'commercial', '8cdf25c0-852d-4050-bb30-7b30364e0225', '563be887-e06b-43f6-b67e-b38f0dc241f1', ST_SetSRID(ST_MakePoint(75.8042, 11.2612), 4326)),

('Retail Space on SM Street', 'High-footfall retail shop in the famous SM Street shopping area. Perfect for clothing, jewelry, or electronics store.', 'SM Street, Kozhikode', 15000000, 800, NULL, NULL, 'available', 'commercial', 'd9ed9ffe-3af0-4d61-935d-ddb3a9279e3b', '563be887-e06b-43f6-b67e-b38f0dc241f1', ST_SetSRID(ST_MakePoint(75.7810, 11.2571), 4326)),

('Industrial Warehouse', 'Spacious warehouse with loading docks and 24/7 access. Strategic location near Kozhikode bypass for logistics.', 'Palazhi, Kozhikode', 28000000, 12000, NULL, NULL, 'available', 'commercial', '3deecbf8-5618-475b-8453-a05f86b75bbd', '563be887-e06b-43f6-b67e-b38f0dc241f1', ST_SetSRID(ST_MakePoint(75.8245, 11.2402), 4326)),

-- CALICUT RENTAL PROPERTIES
('Premium Mens Hostel', 'Fully furnished mens hostel near IT park. Includes meals, WiFi, laundry, and housekeeping services.', 'Cyberpark, Kozhikode', 8000, 150, NULL, NULL, 'available', 'rentals', '47fbae7c-aaca-4ac3-916d-63393f7299b3', '563be887-e06b-43f6-b67e-b38f0dc241f1', ST_SetSRID(ST_MakePoint(75.8358, 11.2175), 4326)),

('Ladies PG Near College', 'Safe and comfortable PG accommodation for women. Close to medical college with vegetarian meals included.', 'Medical College Road, Kozhikode', 6500, 120, NULL, NULL, 'available', 'rentals', '21465e27-5545-4975-b546-042ae139a623', '563be887-e06b-43f6-b67e-b38f0dc241f1', ST_SetSRID(ST_MakePoint(75.8276, 11.2451), 4326)),

-- KOCHI RESIDENTIAL PROPERTIES
('Waterfront Villa', 'Exquisite 5BHK villa overlooking the backwaters. Features private jetty, infinity pool, and Italian marble flooring.', 'Marine Drive, Kochi', 45000000, 5500, 5, 5, 'available', 'residential', '46da556c-4320-487c-9eac-f31f161ddd7d', 'e091f5c3-65fc-4ae8-8996-d8bd53af9fc8', ST_SetSRID(ST_MakePoint(76.2673, 9.9816), 4326)),

('Smart City Apartment', '3BHK smart apartment in upcoming tech hub. Energy efficient design with EV charging and community amenities.', 'Kakkanad, Kochi', 9500000, 1650, 3, 2, 'available', 'residential', '9e3534c2-c304-47ad-883c-379c36d743bc', 'e091f5c3-65fc-4ae8-8996-d8bd53af9fc8', ST_SetSRID(ST_MakePoint(76.3450, 10.0158), 4326)),

('Heritage Home', 'Beautifully restored heritage property in Fort Kochi. Perfect blend of colonial architecture and modern comforts.', 'Fort Kochi, Kochi', 28000000, 3200, 4, 3, 'available', 'residential', '025798ca-0afa-464b-bf25-34d380713765', 'e091f5c3-65fc-4ae8-8996-d8bd53af9fc8', ST_SetSRID(ST_MakePoint(76.2432, 9.9658), 4326)),

-- KOCHI COMMERCIAL PROPERTIES
('Tech Park Office', 'Premium IT office space in Infopark. Ready-to-move with workstations, UPS backup, and cafeteria.', 'Infopark, Kochi', 42000000, 8000, NULL, NULL, 'available', 'commercial', '8cdf25c0-852d-4050-bb30-7b30364e0225', 'e091f5c3-65fc-4ae8-8996-d8bd53af9fc8', ST_SetSRID(ST_MakePoint(76.3588, 10.0266), 4326)),

('Lulu Mall Shop', 'Prime retail space in Lulu Mall. High visibility location with excellent footfall throughout the year.', 'Edapally, Kochi', 22000000, 600, NULL, NULL, 'available', 'commercial', 'd9ed9ffe-3af0-4d61-935d-ddb3a9279e3b', 'e091f5c3-65fc-4ae8-8996-d8bd53af9fc8', ST_SetSRID(ST_MakePoint(76.3041, 10.0256), 4326)),

('Co-working Space MG Road', 'Trendy co-working space in prime MG Road location. Includes meeting rooms, event space, and networking opportunities.', 'MG Road, Kochi', 18000000, 3500, NULL, NULL, 'available', 'commercial', '7dab7d77-4975-433d-9fc9-2974464af46f', 'e091f5c3-65fc-4ae8-8996-d8bd53af9fc8', ST_SetSRID(ST_MakePoint(76.2896, 9.9834), 4326)),

-- KOCHI RENTAL PROPERTIES
('Executive Mens Hostel', 'Premium mens hostel for working professionals. Located near Infopark with AC rooms and all amenities.', 'Kakkanad, Kochi', 12000, 180, NULL, NULL, 'available', 'rentals', '47fbae7c-aaca-4ac3-916d-63393f7299b3', 'e091f5c3-65fc-4ae8-8996-d8bd53af9fc8', ST_SetSRID(ST_MakePoint(76.3520, 10.0180), 4326)),

('Womens Hostel Near Infopark', 'Secure womens hostel with 24/7 security. Walking distance to Infopark with home-cooked meals.', 'Infopark, Kochi', 9500, 140, NULL, NULL, 'available', 'rentals', '8109aa26-7baf-49e1-95a4-142bddb23f98', 'e091f5c3-65fc-4ae8-8996-d8bd53af9fc8', ST_SetSRID(ST_MakePoint(76.3605, 10.0245), 4326));

-- Add a few under_offer and sold properties for variety
UPDATE public.properties SET status = 'under_offer' WHERE title = 'Premium Penthouse';
UPDATE public.properties SET status = 'sold' WHERE title = 'Heritage Home';