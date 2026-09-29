-- Clarify the exact meaning of the department_id column since it references a user, not a separate department entity
COMMENT ON COLUMN public.challenges.department_id IS 'department_id stores the creating officer''s user ID (auth.users.id), not a separate department entity — there is no departments table.';
