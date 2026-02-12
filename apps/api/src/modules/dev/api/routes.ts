import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSupabaseClient } from '../../../server/db.js';
import { HttpError, httpError } from '../../../server/http-error.js';
import { env } from '../../../config/env.js';

// Dev credentials from env (with secure defaults for local dev only)
const DEV_USERS = {
  owner: {
    id: env.DEV_OWNER_ID ?? '00000000-0000-0000-0000-000000000001',
    email: env.DEV_OWNER_EMAIL ?? 'dev-owner@nemsalon.test',
    name: env.DEV_OWNER_NAME ?? 'Dev Owner',
    password: env.DEV_OWNER_PASSWORD ?? 'dev123456',
  },
  staff: {
    id: env.DEV_STAFF_ID ?? '00000000-0000-0000-0000-000000000002',
    email: env.DEV_STAFF_EMAIL ?? 'dev-staff@nemsalon.test',
    name: env.DEV_STAFF_NAME ?? 'Dev Staff',
    password: env.DEV_STAFF_PASSWORD ?? 'dev123456',
  },
  customer: {
    id: env.DEV_CUSTOMER_ID ?? '00000000-0000-0000-0000-000000000003',
    email: env.DEV_CUSTOMER_EMAIL ?? 'dev-customer@nemsalon.test',
    name: env.DEV_CUSTOMER_NAME ?? 'Dev Customer',
    password: env.DEV_CUSTOMER_PASSWORD ?? 'dev123456',
  },
  platformAdmin: {
    id: env.DEV_PLATFORM_ADMIN_ID ?? '00000000-0000-0000-0000-000000000010',
    email: env.DEV_PLATFORM_ADMIN_EMAIL ?? 'dev-platform-admin@nemsalon.test',
    name: env.DEV_PLATFORM_ADMIN_NAME ?? 'Dev Platform Admin',
    password: env.DEV_PLATFORM_ADMIN_PASSWORD ?? 'dev123456',
  },
};

export function registerDevRoutes(app: FastifyInstance) {
  // Only register in development
  if (env.NODE_ENV === 'production') {
    app.log.info('Dev routes disabled in production');
    return;
  }

  // One-click dev environment setup
  const isAuthUserAlreadyExists = (message?: string, code?: string) => {
    const normalized = message?.toLowerCase() ?? '';
    return (
      code === 'email_exists' ||
      normalized.includes('already been registered') ||
      normalized.includes('already exists') ||
      normalized.includes('user already exists')
    );
  };

  const ensureNoSupabaseError = (
    error: { message?: string } | null,
    context: string,
    code: 'DEV_SETUP_FAILED' | 'RESET_FAILED' = 'DEV_SETUP_FAILED',
  ) => {
    if (!error) return;
    throw httpError(500, code, `error.${code.toLowerCase()}`, {
      context,
      message: error.message ?? 'unknown error',
    });
  };

  app.post('/v1/dev/setup', async (_request: FastifyRequest, reply: FastifyReply) => {
    const client = getSupabaseClient();

    try {
      const result: {
        users: Array<{ id: string; email: string; role: string }>;
        salon?: { id: string; name: string };
        services?: Array<{ id: string; name: string }>;
        staff?: Array<{ id: string; name: string }>;
        customers?: Array<{ id: string; name: string }>;
        bookings?: Array<{ id: string; status: string; start_time: string }>;
      } = { users: [] };

      // 1. Create/ensure owner user
      const { error: ownerError } = await client.auth.admin.createUser({
        id: DEV_USERS.owner.id,
        email: DEV_USERS.owner.email,
        password: DEV_USERS.owner.password,
        email_confirm: true,
        user_metadata: {
          full_name: DEV_USERS.owner.name,
          role: 'owner',
        },
      });

      if (
        ownerError &&
        !isAuthUserAlreadyExists(ownerError.message, (ownerError as { code?: string })?.code)
      ) {
        throw httpError(500, 'DEV_SETUP_FAILED', 'error.dev_setup_failed', {
          context: 'Owner creation failed',
          message: ownerError.message,
        });
      }

      const { error: ownerUpdateError } = await client.auth.admin.updateUserById(
        DEV_USERS.owner.id,
        {
          email: DEV_USERS.owner.email,
          password: DEV_USERS.owner.password,
          user_metadata: {
            full_name: DEV_USERS.owner.name,
            role: 'owner',
          },
        },
      );
      ensureNoSupabaseError(ownerUpdateError, 'Owner update failed');

      // Upsert user record
      await client.from('users').upsert(
        {
          id: DEV_USERS.owner.id,
          email: DEV_USERS.owner.email,
          full_name: DEV_USERS.owner.name,
        },
        { onConflict: 'id' },
      );

      result.users.push({ id: DEV_USERS.owner.id, email: DEV_USERS.owner.email, role: 'owner' });

      // 1b. Create/ensure platform admin user
      const { error: platformAdminUserError } = await client.auth.admin.createUser({
        id: DEV_USERS.platformAdmin.id,
        email: DEV_USERS.platformAdmin.email,
        password: DEV_USERS.platformAdmin.password,
        email_confirm: true,
        user_metadata: {
          full_name: DEV_USERS.platformAdmin.name,
          role: 'admin',
        },
      });

      if (
        platformAdminUserError &&
        !isAuthUserAlreadyExists(
          platformAdminUserError.message,
          (platformAdminUserError as { code?: string })?.code,
        )
      ) {
        throw httpError(500, 'DEV_SETUP_FAILED', 'error.dev_setup_failed', {
          context: 'Platform admin creation failed',
          message: platformAdminUserError.message,
        });
      }

      const { error: platformAdminUpdateError } = await client.auth.admin.updateUserById(
        DEV_USERS.platformAdmin.id,
        {
          email: DEV_USERS.platformAdmin.email,
          password: DEV_USERS.platformAdmin.password,
          user_metadata: {
            full_name: DEV_USERS.platformAdmin.name,
            role: 'admin',
          },
        },
      );
      ensureNoSupabaseError(platformAdminUpdateError, 'Platform admin update failed');

      await client.from('users').upsert(
        {
          id: DEV_USERS.platformAdmin.id,
          email: DEV_USERS.platformAdmin.email,
          full_name: DEV_USERS.platformAdmin.name,
        },
        { onConflict: 'id' },
      );

      result.users.push({
        id: DEV_USERS.platformAdmin.id,
        email: DEV_USERS.platformAdmin.email,
        role: 'platform_admin',
      });

      // 2. Provision salon using existing function
      const { data: salonId, error: salonError } = await client.rpc('provision_salon_for_user', {
        p_user_id: DEV_USERS.owner.id,
        p_email: DEV_USERS.owner.email,
        p_full_name: DEV_USERS.owner.name,
        p_phone: null,
        p_role: 'owner',
      });

      if (salonError || !salonId) {
        throw httpError(
          500,
          'DEV_SETUP_FAILED',
          salonError?.message ?? 'Failed to provision salon',
        );
      }

      // Update salon with dev name
      const { error: salonUpdateError } = await client
        .from('salons')
        .update({
          name: 'Dev Salon',
          slug: 'dev-salon',
          status: 'active',
          timezone: 'Europe/Copenhagen',
          locale: 'da-DK',
          currency: 'DKK',
        })
        .eq('id', salonId);

      if (salonUpdateError) {
        throw httpError(
          500,
          'DEV_SETUP_FAILED',
          `Salon update failed: ${salonUpdateError.message}`,
        );
      }

      const { data: salonStatusCheck, error: salonStatusError } = await client
        .from('salons')
        .select('status')
        .eq('id', salonId)
        .maybeSingle();

      if (salonStatusError) {
        throw httpError(
          500,
          'DEV_SETUP_FAILED',
          `Salon status check failed: ${salonStatusError.message}`,
        );
      }

      if (salonStatusCheck?.status !== 'active') {
        const { error: salonForceError } = await client
          .from('salons')
          .update({ status: 'active' })
          .eq('id', salonId);

        if (salonForceError) {
          throw httpError(
            500,
            'DEV_SETUP_FAILED',
            `Salon activation failed: ${salonForceError.message}`,
          );
        }
      }

      result.salon = { id: salonId, name: 'Dev Salon' };

      const { error: ownerPrimaryError } = await client
        .from('users')
        .update({ primary_salon_id: salonId })
        .eq('id', DEV_USERS.owner.id);

      if (ownerPrimaryError) {
        throw httpError(
          500,
          'DEV_SETUP_FAILED',
          `Owner primary salon failed: ${ownerPrimaryError.message}`,
        );
      }

      // Ensure platform admin user is active for E2E and local testing
      const { error: platformAdminError } = await client.rpc('upsert_platform_admin', {
        p_user_id: DEV_USERS.platformAdmin.id,
        p_email: DEV_USERS.platformAdmin.email,
        p_active: true,
      });
      ensureNoSupabaseError(platformAdminError, 'Platform admin setup failed');

      // Note: RPC upsert_platform_admin already handles the insert with elevated privileges
      // We skip verification select since it would be subject to RLS policies anyway

      // 3. Create services
      const services = [
        { name: 'Haircut', duration_minutes: 30, price: 25000, currency: 'DKK' },
        { name: 'Coloring', duration_minutes: 90, price: 75000, currency: 'DKK' },
        { name: 'Styling', duration_minutes: 45, price: 35000, currency: 'DKK' },
      ];

      const createdServices: Array<{ id: string; name: string }> = [];
      for (const svc of services) {
        const { data: existing, error: existingError } = await client
          .from('services')
          .select('id, name')
          .eq('salon_id', salonId)
          .eq('name', svc.name)
          .maybeSingle();

        if (existingError) {
          throw httpError(
            500,
            'DEV_SETUP_FAILED',
            `Service lookup failed: ${existingError.message}`,
          );
        }

        if (existing) {
          createdServices.push(existing);
          continue;
        }

        const { data: service, error: svcError } = await client
          .from('services')
          .insert({
            salon_id: salonId,
            name: svc.name,
            duration_minutes: svc.duration_minutes,
            buffer_minutes: 15,
            price_amount: svc.price,
            currency: svc.currency,
            active: true,
          })
          .select('id, name')
          .single();

        if (svcError || !service) {
          throw httpError(
            500,
            'DEV_SETUP_FAILED',
            `Service creation failed: ${svcError?.message ?? 'unknown error'}`,
          );
        }
        createdServices.push(service);
      }
      result.services = createdServices;

      // 4. Create staff user with Supabase Auth (unified system)
      const { error: staffError } = await client.auth.admin.createUser({
        id: DEV_USERS.staff.id,
        email: DEV_USERS.staff.email,
        password: DEV_USERS.staff.password,
        email_confirm: true,
        user_metadata: {
          full_name: DEV_USERS.staff.name,
          role: 'staff',
        },
      });

      if (
        staffError &&
        !isAuthUserAlreadyExists(staffError.message, (staffError as { code?: string })?.code)
      ) {
        throw httpError(500, 'DEV_SETUP_FAILED', 'error.dev_setup_failed', {
          context: 'Staff creation failed',
          message: staffError.message,
        });
      }

      const { error: staffUpdateError } = await client.auth.admin.updateUserById(
        DEV_USERS.staff.id,
        {
          email: DEV_USERS.staff.email,
          password: DEV_USERS.staff.password,
          user_metadata: {
            full_name: DEV_USERS.staff.name,
            role: 'staff',
          },
        },
      );
      ensureNoSupabaseError(staffUpdateError, 'Staff update failed');

      // Create user record
      await client.from('users').upsert(
        {
          id: DEV_USERS.staff.id,
          email: DEV_USERS.staff.email,
          full_name: DEV_USERS.staff.name,
          primary_salon_id: salonId,
        },
        { onConflict: 'id' },
      );

      // Ensure owner has membership + staff profile for dev flows
      await client.from('memberships').upsert(
        {
          salon_id: salonId,
          user_id: DEV_USERS.owner.id,
          role: 'owner',
          active: true,
        },
        { onConflict: 'salon_id,user_id' },
      );

      await client.from('staff_profiles').upsert(
        {
          id: DEV_USERS.owner.id,
          salon_id: salonId,
          user_id: DEV_USERS.owner.id,
          display_name: DEV_USERS.owner.name,
          role: 'owner',
          email: DEV_USERS.owner.email,
          active: true,
        },
        { onConflict: 'id' },
      );

      // Create staff profile and link to user
      const { data: staffProfile, error: staffProfileError } = await client
        .from('staff_profiles')
        .upsert(
          {
            id: DEV_USERS.staff.id,
            salon_id: salonId,
            user_id: DEV_USERS.staff.id,
            display_name: DEV_USERS.staff.name,
            role: 'staff',
            email: DEV_USERS.staff.email,
            active: true,
          },
          { onConflict: 'id' },
        )
        .select('id')
        .single();

      if (staffProfileError) {
        throw httpError(
          500,
          'DEV_SETUP_FAILED',
          `Staff profile failed: ${staffProfileError.message}`,
        );
      }

      // Create membership for staff
      await client.from('memberships').upsert(
        {
          salon_id: salonId,
          user_id: DEV_USERS.staff.id,
          role: 'staff',
          active: true,
        },
        { onConflict: 'salon_id,user_id' },
      );

      result.staff = [{ id: staffProfile.id, name: DEV_USERS.staff.name }];

      // Link staff to services for availability
      for (const service of createdServices) {
        const { error: staffServiceError } = await client.from('staff_services').upsert(
          {
            staff_id: staffProfile.id,
            service_id: service.id,
          },
          { onConflict: 'staff_id,service_id' },
        );

        if (staffServiceError) {
          throw httpError(
            500,
            'DEV_SETUP_FAILED',
            `Staff service link failed: ${staffServiceError.message}`,
          );
        }
      }

      // 5. Create customer user
      const { error: customerError } = await client.auth.admin.createUser({
        id: DEV_USERS.customer.id,
        email: DEV_USERS.customer.email,
        password: DEV_USERS.customer.password,
        email_confirm: true,
        user_metadata: {
          name: DEV_USERS.customer.name,
          role: 'customer',
        },
      });

      if (
        customerError &&
        !isAuthUserAlreadyExists(customerError.message, (customerError as { code?: string })?.code)
      ) {
        throw httpError(500, 'DEV_SETUP_FAILED', 'error.dev_setup_failed', {
          context: 'Customer creation failed',
          message: customerError.message,
        });
      }

      const { error: customerUpdateError } = await client.auth.admin.updateUserById(
        DEV_USERS.customer.id,
        {
          email: DEV_USERS.customer.email,
          password: DEV_USERS.customer.password,
          user_metadata: {
            full_name: DEV_USERS.customer.name,
            role: 'customer',
          },
        },
      );
      ensureNoSupabaseError(customerUpdateError, 'Customer update failed');

      // Create customer record
      await client.from('users').upsert(
        {
          id: DEV_USERS.customer.id,
          email: DEV_USERS.customer.email,
          full_name: DEV_USERS.customer.name,
        },
        { onConflict: 'id' },
      );

      const { data: existingDevCustomer, error: existingDevCustomerError } = await client
        .from('customers')
        .select('id')
        .eq('salon_id', salonId)
        .eq('user_id', DEV_USERS.customer.id)
        .maybeSingle();

      if (existingDevCustomerError) {
        throw httpError(
          500,
          'DEV_SETUP_FAILED',
          `Customer lookup failed: ${existingDevCustomerError.message}`,
        );
      }

      if (!existingDevCustomer) {
        const { error: devCustomerError } = await client.from('customers').insert({
          salon_id: salonId,
          user_id: DEV_USERS.customer.id,
          name: DEV_USERS.customer.name,
          email: DEV_USERS.customer.email,
          phone: '+45 11 22 33 44',
        });

        if (devCustomerError) {
          // Log warning but don't fail - RLS may prevent direct insert
          // Tests will create their own customer data as needed
          console.warn(`[DEV SETUP] Customer creation skipped: ${devCustomerError.message}`);
        }
      }

      result.users.push({
        id: DEV_USERS.customer.id,
        email: DEV_USERS.customer.email,
        role: 'customer',
      });

      const { data: devCustomerRow, error: devCustomerRowError } = await client
        .from('customers')
        .select('id')
        .eq('salon_id', salonId)
        .eq('user_id', DEV_USERS.customer.id)
        .maybeSingle();

      if (devCustomerRowError) {
        throw httpError(
          500,
          'DEV_SETUP_FAILED',
          `Dev customer lookup failed: ${devCustomerRowError.message}`,
        );
      }

      // 6. Set business hours (9-17, Mon-Fri)
      const businessHours = [
        { day: 'mon', start_time: '09:00', end_time: '17:00', enabled: true },
        { day: 'tue', start_time: '09:00', end_time: '17:00', enabled: true },
        { day: 'wed', start_time: '09:00', end_time: '17:00', enabled: true },
        { day: 'thu', start_time: '09:00', end_time: '17:00', enabled: true },
        { day: 'fri', start_time: '09:00', end_time: '17:00', enabled: true },
        { day: 'sat', start_time: '09:00', end_time: '17:00', enabled: false },
        { day: 'sun', start_time: '09:00', end_time: '17:00', enabled: false },
      ];

      for (const hours of businessHours) {
        const { error: hoursError } = await client.from('salon_business_hours').upsert(
          {
            salon_id: salonId,
            day: hours.day,
            start_time: hours.start_time,
            end_time: hours.end_time,
            enabled: hours.enabled,
          },
          { onConflict: 'salon_id,day' },
        );

        if (hoursError) {
          throw httpError(500, 'DEV_SETUP_FAILED', `Business hours failed: ${hoursError.message}`);
        }
      }

      const staffHours = businessHours.map((hours) => ({
        staff_id: staffProfile.id,
        day: hours.day,
        start_time: hours.start_time,
        end_time: hours.end_time,
        enabled: hours.enabled,
      }));

      for (const hours of staffHours) {
        const { error: staffHoursError } = await client
          .from('staff_working_hours')
          .upsert(hours, { onConflict: 'staff_id,day' });
        if (staffHoursError) {
          throw httpError(
            500,
            'DEV_SETUP_FAILED',
            `Staff working hours failed: ${staffHoursError.message}`,
          );
        }
      }

      // 7. Create sample customers
      const sampleCustomers = [
        { name: 'Alice Johnson', email: 'alice@example.com', phone: '+45 12345678' },
        { name: 'Bob Smith', email: 'bob@example.com', phone: '+45 87654321' },
        { name: 'Carol White', email: 'carol@example.com', phone: '+45 11223344' },
        { name: 'David Brown', email: 'david@example.com', phone: '+45 55667788' },
        { name: 'Emma Davis', email: 'emma@example.com', phone: '+45 99887766' },
      ];

      const createdCustomers: Array<{ id: string; name: string }> = [];
      for (const customer of sampleCustomers) {
        const { data: existing, error: existingError } = await client
          .from('customers')
          .select('id, name')
          .eq('salon_id', salonId)
          .eq('email', customer.email)
          .maybeSingle();

        if (existingError) {
          throw httpError(
            500,
            'DEV_SETUP_FAILED',
            `Customer lookup failed: ${existingError.message}`,
          );
        }

        if (existing) {
          createdCustomers.push(existing);
          continue;
        }

        const { data: cust, error: custError } = await client
          .from('customers')
          .insert({
            salon_id: salonId,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          })
          .select('id, name')
          .single();

        if (custError || !cust) {
          // Log warning but don't fail - RLS may prevent direct insert
          console.warn(
            `[DEV SETUP] Sample customer creation skipped: ${custError?.message ?? 'unknown error'}`,
          );
          continue;
        }
        createdCustomers.push(cust);
      }
      result.customers = createdCustomers;

      // 8. Clear existing bookings for this salon to avoid overlap/unique conflicts
      const { error: bookingCleanupError } = await client
        .from('bookings')
        .delete()
        .eq('salon_id', salonId);
      ensureNoSupabaseError(bookingCleanupError, 'Booking cleanup failed');

      // 9. Create sample bookings for today and tomorrow
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const future = new Date(today);
      future.setDate(future.getDate() + 3);
      const toLocalDate = (date: Date) => {
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
        return local.toISOString().split('T')[0];
      };

      const timeSlots = ['09:00', '10:30', '13:00', '14:30', '16:00'];
      const sampleBookings = [];

      // Today's bookings
      for (let i = 0; i < 3; i++) {
        const startTime = timeSlots[i]!;
        const [hours, minutes] = startTime.split(':').map(Number) as [number, number];
        const endHour = hours + 1;
        const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        const service = services[0];
        const { data: booking, error: bookingError } = await client
          .from('bookings')
          .insert({
            salon_id: salonId,
            customer_id: createdCustomers[i % createdCustomers.length]?.id,
            staff_id: staffProfile.id,
            service_id: createdServices[0]?.id,
            start_time: `${toLocalDate(today)}T${startTime}:00`,
            end_time: `${toLocalDate(today)}T${endTime}:00`,
            status: i === 0 ? 'completed' : i === 1 ? 'confirmed' : 'pending',
            notes: `Sample booking ${i + 1}`,
            total_amount: service?.price ?? 25000,
            currency: service?.currency ?? 'DKK',
          })
          .select('id, status, start_time')
          .single();

        if (!bookingError && booking) {
          sampleBookings.push(booking);
        }
      }

      // Tomorrow's bookings
      for (let i = 0; i < 2; i++) {
        const startTime = timeSlots[i + 2]!;
        const [hours, minutes] = startTime.split(':').map(Number) as [number, number];
        const endHour = hours + 1;
        const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        const service = services[1] ?? services[0];
        const { data: booking, error: bookingError } = await client
          .from('bookings')
          .insert({
            salon_id: salonId,
            customer_id: createdCustomers[(i + 3) % createdCustomers.length]?.id,
            staff_id: staffProfile.id,
            service_id: createdServices[1]?.id || createdServices[0]?.id,
            start_time: `${toLocalDate(tomorrow)}T${startTime}:00`,
            end_time: `${toLocalDate(tomorrow)}T${endTime}:00`,
            status: 'confirmed',
            notes: `Tomorrow booking ${i + 1}`,
            total_amount: service?.price ?? 25000,
            currency: service?.currency ?? 'DKK',
          })
          .select('id, status, start_time')
          .single();

        if (!bookingError && booking) {
          sampleBookings.push(booking);
        }
      }

      if (devCustomerRow?.id) {
        const [hours, minutes] = timeSlots[1]!.split(':').map(Number) as [number, number];
        const endHour = hours + 1;
        const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const service = services[0];
        const { data: futureBooking, error: futureBookingError } = await client
          .from('bookings')
          .insert({
            salon_id: salonId,
            customer_id: devCustomerRow.id,
            staff_id: staffProfile.id,
            service_id: createdServices[0]?.id,
            start_time: `${toLocalDate(future)}T${timeSlots[1]}:00`,
            end_time: `${toLocalDate(future)}T${endTime}:00`,
            status: 'confirmed',
            notes: 'Dev customer future booking',
            total_amount: service?.price ?? 25000,
            currency: service?.currency ?? 'DKK',
          })
          .select('id, status, start_time')
          .single();

        if (!futureBookingError && futureBooking) {
          sampleBookings.push(futureBooking);
        }
      }
      result.bookings = sampleBookings;

      app.log.info({ result }, 'Dev environment setup complete');

      reply.code(200).send({
        success: true,
        message: 'Dev environment ready',
        ...result,
        credentials: {
          owner: { email: DEV_USERS.owner.email, password: DEV_USERS.owner.password },
          staff: { email: DEV_USERS.staff.email, password: DEV_USERS.staff.password },
          customer: { email: DEV_USERS.customer.email, password: DEV_USERS.customer.password },
        },
      });
    } catch (error) {
      app.log.error({ error }, 'Dev setup failed');
      if (error instanceof HttpError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown dev setup error';
      throw httpError(500, 'DEV_SETUP_FAILED', 'error.dev_setup_failed', { message });
    }
  });

  // Quick reset endpoint
  // NOTE: This is for dev use only. In production, use proper migrations.
  // Deletion order respects FK constraints (child tables first)
  app.post('/v1/dev/reset', async (_request: FastifyRequest, reply: FastifyReply) => {
    const client = getSupabaseClient();

    try {
      // Delete in correct order (respect FK constraints)
      // Clear primary_salon_id references BEFORE deleting salons
      const { error: usersNullError } = await client
        .from('users')
        .update({ primary_salon_id: null })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(usersNullError, 'Reset users primary_salon_id failed', 'RESET_FAILED');

      const { error: auditError } = await client
        .from('audit_log')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(auditError, 'Reset audit_log failed', 'RESET_FAILED');
      const { error: notificationOutboxError } = await client
        .from('notification_outbox')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(
        notificationOutboxError,
        'Reset notification_outbox failed',
        'RESET_FAILED',
      );
      const { error: eventsError } = await client
        .from('events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(eventsError, 'Reset events failed', 'RESET_FAILED');
      const { error: errorEventsError } = await client
        .from('error_events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(errorEventsError, 'Reset error_events failed', 'RESET_FAILED');
      const { error: workerHeartbeatsError } = await client
        .from('worker_heartbeats')
        .delete()
        .neq('worker_name', '');
      ensureNoSupabaseError(
        workerHeartbeatsError,
        'Reset worker_heartbeats failed',
        'RESET_FAILED',
      );
      const { error: bookingAccessError } = await client
        .from('booking_access_tokens')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(
        bookingAccessError,
        'Reset booking_access_tokens failed',
        'RESET_FAILED',
      );
      const { error: platformAdminsError } = await client
        .from('platform_admins')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(platformAdminsError, 'Reset platform_admins failed', 'RESET_FAILED');
      const { error: staffAuthError } = await client
        .from('staff_auth')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(staffAuthError, 'Reset staff_auth failed', 'RESET_FAILED');
      const { error: customerInvitesError } = await client
        .from('customer_invitations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(
        customerInvitesError,
        'Reset customer_invitations failed',
        'RESET_FAILED',
      );
      const { error: bookingsError } = await client
        .from('bookings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(bookingsError, 'Reset bookings failed', 'RESET_FAILED');
      const { error: paymentsError } = await client
        .from('payments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(paymentsError, 'Reset payments failed', 'RESET_FAILED');
      const { error: staffServicesError } = await client
        .from('staff_services')
        .delete()
        .neq('staff_id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(staffServicesError, 'Reset staff_services failed', 'RESET_FAILED');
      const { error: staffTimeOffError } = await client
        .from('staff_time_off')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(staffTimeOffError, 'Reset staff_time_off failed', 'RESET_FAILED');
      const { error: staffHoursError } = await client
        .from('staff_working_hours')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(staffHoursError, 'Reset staff_working_hours failed', 'RESET_FAILED');
      const { error: staffSessionsError } = await client
        .from('staff_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(staffSessionsError, 'Reset staff_sessions failed', 'RESET_FAILED');
      const { error: staffProfilesError } = await client
        .from('staff_profiles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(staffProfilesError, 'Reset staff_profiles failed', 'RESET_FAILED');
      const { error: servicesError } = await client
        .from('services')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(servicesError, 'Reset services failed', 'RESET_FAILED');
      const { error: businessHoursError } = await client
        .from('salon_business_hours')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(
        businessHoursError,
        'Reset salon_business_hours failed',
        'RESET_FAILED',
      );
      const { error: customersError } = await client
        .from('customers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(customersError, 'Reset customers failed', 'RESET_FAILED');
      const { error: membershipsError } = await client
        .from('memberships')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(membershipsError, 'Reset memberships failed', 'RESET_FAILED');
      const { error: salonsError } = await client
        .from('salons')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      ensureNoSupabaseError(salonsError, 'Reset salons failed', 'RESET_FAILED');

      // Delete auth users
      for (const user of Object.values(DEV_USERS)) {
        await client.auth.admin.deleteUser(user.id).catch(() => {});
      }

      app.log.info('Dev environment reset complete');
      reply.code(200).send({ success: true, message: 'All dev data cleared' });
    } catch (error) {
      app.log.error({ error }, 'Dev reset failed');
      if (error instanceof HttpError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Failed to reset dev environment';
      throw httpError(500, 'RESET_FAILED', message);
    }
  });

  // Get dev status
  app.get('/v1/dev/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const client = getSupabaseClient();

    const { count: userCount } = await client
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: salonCount } = await client
      .from('salons')
      .select('*', { count: 'exact', head: true });

    const { count: bookingCount } = await client
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    reply.code(200).send({
      ready: (userCount ?? 0) > 0 && (salonCount ?? 0) > 0,
      stats: {
        users: userCount ?? 0,
        salons: salonCount ?? 0,
        bookings: bookingCount ?? 0,
      },
    });
  });
}
