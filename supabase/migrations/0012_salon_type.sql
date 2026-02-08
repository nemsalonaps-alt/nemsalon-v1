alter table public.salons
  add column if not exists salon_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'salons_salon_type_check'
  ) then
    alter table public.salons
      add constraint salons_salon_type_check
      check (
        salon_type is null
        or salon_type in (
          'hair_salon',
          'nail_salon',
          'wellness_center',
          'massage_clinic',
          'tattoo_studio',
          'barbershop',
          'spa_wellness',
          'cosmetic_clinic'
        )
      );
  end if;
end
$$;
