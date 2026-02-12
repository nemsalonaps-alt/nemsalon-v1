-- Cleanup seed role overlaps for impersonation lists

do $$
declare
  v_staff_user_id uuid := 'ebf170d8-c6c1-4056-9854-345c06572ab2';
  v_customer_user_id uuid := 'f50b1cb0-3206-4209-8621-a1edcbd70ba3';
begin
  delete from memberships where user_id = v_customer_user_id;
  delete from customers where user_id = v_staff_user_id;
end $$;
