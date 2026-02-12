-- Seed data fix: Update full_name and roles for impersonation
-- This ensures all test users have correct data for impersonation testing

do $$
declare
  v_platform_admin_id uuid := '84b565e6-e67a-45be-9d97-23a5c0d91982';
  v_owner_id uuid := '31ebc1aa-2668-4cfd-9983-ab8ad44b3a7f';
  v_staff_user_id uuid := 'ebf170d8-c6c1-4056-9854-345c06572ab2';
  v_customer_user_id uuid := 'f50b1cb0-3206-4209-8621-a1edcbd70ba3';
  v_salon_id uuid;
begin
  -- Get salon ID for the owner
  select primary_salon_id into v_salon_id from users where id = v_owner_id;

  -- ==========================================
  -- Fix full_name for all users
  -- ==========================================
  update users set full_name = 'Platform Administrator' where id = v_platform_admin_id;
  update users set full_name = 'Mette Nielsen' where id = v_owner_id;
  update users set full_name = 'Tina Pedersen' where id = v_staff_user_id;
  update users set full_name = 'Lisa Jensen' where id = v_customer_user_id;

  -- ==========================================
  -- Fix staff membership role (Tina should be staff, not owner)
  -- ==========================================
  update memberships
  set role = 'staff'
  where user_id = v_staff_user_id
    and salon_id = v_salon_id
    and role = 'owner';

  -- ==========================================
  -- Link customers to users if not already linked
  -- ==========================================
  update customers c
  set user_id = v_customer_user_id
  from users u
  where u.email = c.email
    and c.user_id is null
    and u.id = v_customer_user_id;

  raise notice 'Seed data fix applied successfully';
  raise notice 'Platform Admin: %', v_platform_admin_id;
  raise notice 'Owner: % (%)', v_owner_id, (select full_name from users where id = v_owner_id);
  raise notice 'Staff: % (%)', v_staff_user_id, (select full_name from users where id = v_staff_user_id);
  raise notice 'Customer: % (%)', v_customer_user_id, (select full_name from users where id = v_customer_user_id);
end $$;
