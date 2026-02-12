-- Ensure customers table has user_id column and link existing customers
-- This fixes the impersonation API join between users and customers

-- Add user_id column if it doesn't exist (backup in case 0017 migration wasn't applied)
alter table customers add column if not exists user_id uuid references users(id) on delete set null;

-- Link existing customers to their users based on email matching
-- This handles cases where customers were created before user_id was set
do $$
declare
  r record;
begin
  for r in
    select c.id, u.id as user_id
    from customers c
    join users u on u.email = c.email
    where c.user_id is null
      and u.id in (
        select id from users where email in (
          'kunde@gmail.com', 'lisa@example.com', 'testcustomer@gmail.com'
        )
      )
  loop
    update customers set user_id = r.user_id where id = r.id;
    raise notice 'Linked customer % to user %', r.id, r.user_id;
  end loop;
end $$;

-- Create index for faster lookups (already exists from 0017, but just in case)
create index if not exists idx_customers_user_id on customers(user_id) where user_id is not null;
