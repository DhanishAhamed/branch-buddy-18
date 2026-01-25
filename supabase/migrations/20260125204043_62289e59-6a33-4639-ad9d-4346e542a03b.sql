-- Assign all leads with NULL workspace_id to Room4Calicut
UPDATE leads 
SET workspace_id = '2e5fd4d3-d9c9-4fe6-a4cc-2fb363af0f0e'
WHERE workspace_id IS NULL;

-- Assign all properties with NULL workspace_id to Room4Calicut
UPDATE properties 
SET workspace_id = '2e5fd4d3-d9c9-4fe6-a4cc-2fb363af0f0e'
WHERE workspace_id IS NULL;

-- Assign all tasks with NULL workspace_id to Room4Calicut
UPDATE tasks 
SET workspace_id = '2e5fd4d3-d9c9-4fe6-a4cc-2fb363af0f0e'
WHERE workspace_id IS NULL;