export const copy = {
  customerPortal: {
    title: 'My Bookings',
    loading: 'Loading...',
    logout: 'Log out',
    emptyState: 'No bookings found.',
    viewDetails: 'View details',
    filters: {
      all: 'All',
      upcoming: 'Upcoming',
      past: 'Past',
      cancelled: 'Cancelled'
    },
    status: {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show'
    },
    notLoggedIn: {
      title: 'Not Logged In',
      message: 'Please log in to view your bookings.',
      loginButton: 'Go to Login'
    }
  },
  dayLabels: {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun'
  },
  locales: {
    da: 'da',
    en: 'en'
  },
  roles: {
    owner: 'Owner',
    admin: 'Admin',
    staff: 'Staff'
  },
  stepper: {
    title: 'Onboarding',
    steps: {
      salon: { title: 'Salon setup', hint: 'Required' },
      staff: { title: 'Staff + services', hint: 'Required' },
      payments: { title: 'Payments', hint: 'Optional' },
      cta: { title: 'First booking', hint: 'Launch' }
    }
  },
  topBar: {
    brand: 'Nemsalon Onboarding',
    badge: 'v1 funnel'
  },
  gate: {
    checking: {
      badge: 'Checking access',
      title: 'Preparing your workspace',
      body: 'We are verifying your membership and salon setup.',
      note: 'If this takes longer than a few seconds, refresh the page.'
    },
    hasSalon: {
      badge: 'Welcome back',
      title: 'Your salon is already set up',
      body: 'Jump straight to the dashboard or review your settings.',
      primaryAction: 'Go to dashboard',
      secondaryAction: 'Review settings'
    },
    error: {
      badge: 'Connection issue',
      title: 'We could not reach the API',
      body: 'Check that the API is running and try again.',
      primaryAction: 'Retry'
    },
    needsLogin: {
      badge: 'Login required',
      title: 'Sign in to continue',
      body: 'We could not find an active session. Please log in to start onboarding.',
      primaryAction: 'Go to login',
      secondaryAction: 'Retry',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      signIn: 'Sign in',
      signingIn: 'Signing in...',
      missingFields: 'Enter email and password.',
      missingConfig: 'Supabase auth is not configured for this environment.'
    },
    devHelper: {
      badge: 'Dev helper',
      title: 'Local shortcuts',
      body: 'These tools only appear in development and never run in production.',
      useBypass: 'Use dev bypass',
      createUser: 'Create test user',
      creating: 'Creating...',
      missingFields: 'Fill email and password first.',
      missingConfig: 'Supabase config missing in .env.local.',
      createdNeedsConfirm: 'User created. Confirm the user in Supabase Studio, then sign in.',
      createdAndSignedIn: 'User created and signed in. Retrying...',
      bypassNotice: 'Dev bypass requested. Retrying...'
    }
  },
  salon: {
    badge: 'Step 1',
    title: 'Create your salon',
    body: 'Set your default settings now. You can always fine-tune later.',
    missingSalonId: 'No salon was assigned yet. Please retry login or contact support.',
    types: {
      hair_salon: { label: 'Hair salon', description: 'Cut, color, styling, and hair treatments', serviceExample: 'Haircut & Style' },
      nail_salon: { label: 'Nail salon', description: 'Manicures, pedicures, and nail art', serviceExample: 'Manicure' },
      wellness_center: { label: 'Wellness center', description: 'Holistic wellness and health services', serviceExample: 'Wellness Treatment' },
      massage_clinic: { label: 'Massage clinic', description: 'Therapeutic and relaxation massage', serviceExample: 'Relaxing Massage' },
      tattoo_studio: { label: 'Tattoo studio', description: 'Custom tattoos and body art', serviceExample: 'Tattoo Session' },
      barbershop: { label: 'Barbershop', description: 'Men\'s cuts, beard trims, and grooming', serviceExample: 'Beard Trim' },
      spa_wellness: { label: 'Spa & wellness', description: 'Full spa treatments and relaxation', serviceExample: 'Spa Package' },
      cosmetic_clinic: { label: 'Cosmetic clinic', description: 'Skincare, facials, and beauty treatments', serviceExample: 'Facial Treatment' }
    },
    fields: {
      nameLabel: 'Salon name',
      namePlaceholder: 'Studio Ember',
      timezoneLabel: 'Timezone',
      timezonePlaceholder: 'Europe/Copenhagen',
      localeLabel: 'Locale',
      typeLabel: 'Salon type',
      typePlaceholder: 'Select type',
      currencyLabel: 'Currency',
      currencyPlaceholder: 'DKK'
    },
    hours: {
      title: 'Business hours',
      body: 'Default hours for new staff and booking availability.',
      note: 'Business hours are saved with your salon calendar.'
    },
    actions: {
      saving: 'Saving...',
      continue: 'Continue to staff & services'
    }
  },
  staff: {
    badge: 'Step 2',
    title: 'Add your team',
    body: 'Start with one key person. You can add the rest later.',
    fields: {
      nameLabel: 'Staff name',
      namePlaceholder: 'Ava Jensen',
      roleLabel: 'Role',
      emailLabel: 'Email (optional)',
      emailPlaceholder: 'staff@example.com',
      useSalonHours: 'Use salon business hours',
      workingHoursTitle: 'Staff working hours'
    },
    service: {
      title: 'Define your first service',
      body: 'This service will be bookable immediately.',
      nameLabel: 'Service name',
      namePlaceholder: 'Signature cut',
      durationLabel: 'Duration (min)',
      pricePlaceholder: '499,00',
      bufferLabel: 'Buffer time',
      assignLabel: 'This staff can perform this service',
      assignNote: 'We will save the assignment so services and calendar stay aligned.'
    },
    actions: {
      back: 'Back to salon setup',
      saving: 'Saving...',
      continue: 'Continue to payments'
    }
  },
  payments: {
    badge: 'Optional',
    title: 'Enable online payments',
    body: 'Turn this on if you want to charge customers before their visit.',
    toggle: 'Enable Stripe payments now',
    stripe: {
      title: 'Stripe setup',
      body: 'Connect once, then payments run automatically.',
      connect: 'Connect Stripe',
      connected: 'Connected',
      note:
        'In v1 this can be a lightweight connect step or an info page if you use a shared key.'
    },
    actions: {
      back: 'Back to staff & services',
      continue: 'Continue to first booking'
    }
  },
  cta: {
    badge: 'Launch',
    title: 'Create your first booking',
    body: 'Everything is ready. Book the first appointment in minutes.',
    assignBanner: 'Assign the service to a staff member to unlock bookings.',
    fixAssignments: 'Fix assignments',
    slots: {
      badge: 'Availability',
      title: 'Suggested slots',
      body: 'Quick picks based on business hours, assignments, and bookings.',
      loading: 'Finding available times...',
      empty: 'No open slots found in the current window.'
    },
    heroTitle: 'Instant booking wizard',
    heroNote: 'Start time + duration + buffer will auto-calc end time and availability.',
    fields: {
      customerNameLabel: 'Customer name',
      customerNamePlaceholder: 'Customer name',
      customerEmailLabel: 'Customer email',
      customerEmailPlaceholder: 'hello@example.com',
      customerPhoneLabel: 'Customer phone',
      customerPhonePlaceholder: '+45 12 34 56 78',
      serviceLabel: 'Service',
      staffLabel: 'Staff',
      dateLabel: 'Date',
      startTimeLabel: 'Start time',
      endTimeLabel: 'End time',
      endTimePlaceholder: 'Auto-calculated',
      notesLabel: 'Notes',
      notesPlaceholder: 'Add any notes for the visit.'
    },
    toggles: {
      sendEmail: 'Send email confirmation',
      sendSms: 'Send SMS confirmation (plan required)',
      smsNote: 'SMS sending requires plan entitlements and an active SMS provider.'
    },
    actions: {
      back: 'Back to payments',
      create: 'Create booking',
      creating: 'Creating...',
      cancel: 'Cancel booking',
      cancelling: 'Cancelling...',
      reschedule: 'Reschedule',
      rescheduling: 'Rescheduling...',
      openCheckout: 'Open checkout',
      viewCalendar: 'View calendar'
    },
    manage: {
      title: 'Manage this booking',
      body: 'Cancel or reschedule using the suggested slots below.',
      rescheduleHint: 'Pick a slot to reschedule this booking.'
    },
    success: {
      bookingPending: 'Booking created, payment pending.',
      checkoutReady: 'Booking created. Checkout ready.',
      bookingQueued: 'Booking created. Confirmation is queued.',
      bookingCancelled: 'Booking cancelled.',
      bookingRescheduled: 'Booking rescheduled.'
    },
    fallback: {
      salon: 'Your salon',
      staff: 'Owner',
      service: 'Signature service'
    }
  },
  validation: {
    hours: {
      noDays: 'Select at least one day.',
      timeRange: 'Start time must be before end time.'
    },
    salon: {
      name: 'Salon name must be 2-60 characters.',
      timezone: 'Timezone is required.',
      locale: 'Locale is required.',
      currency: 'Currency is required.',
      type: 'Salon type is required.'
    },
    staff: {
      name: 'Staff name must be 2-60 characters.',
      role: 'Select a valid role.',
      email: 'Please enter a valid email address.',
      serviceName: 'Service name must be 2-60 characters.',
      serviceDuration: 'Duration must be between 5 and 480 minutes.',
      servicePrice: 'Price must be a positive number.',
      serviceBuffer: 'Buffer must be 0, 5, 10, or 15.',
      assignService: 'At least one staff must be assigned to the service.'
    },
    booking: {
      customerName: 'Customer name is required.',
      time: 'Select a date and time.',
      salonId: 'Salon ID is missing. Refresh or contact support.',
      assignService: 'Assign the service to a staff member first.'
    }
  },
  customerDashboard: {
    title: 'Your booking',
    status: {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_progress: 'In progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No show'
    },
    paymentStatus: {
      pending: 'Pending',
      paid: 'Paid',
      failed: 'Failed',
      refunded: 'Refunded'
    },
    labels: {
      service: 'Service',
      staff: 'Staff',
      date: 'Date',
      time: 'Time',
      status: 'Status',
      payment: 'Payment',
      phone: 'Phone',
      email: 'Email'
    },
    actions: {
      showOnMap: 'Show on map',
      changeBooking: 'Change booking',
      reschedule: 'Reschedule',
      cancel: 'Cancel',
      selectNewTime: 'Select new time',
      cancelReschedule: 'Cancel reschedule',
      addToCalendar: 'Add to calendar',
      payNow: 'Pay now'
    },
    states: {
      cancelling: 'Cancelling...',
      rescheduling: 'Rescheduling...',
      preparingPayment: 'Preparing payment...'
    },
    noSlots: 'No available slots for this date.',
    windowClosed: 'The cancellation window has closed. Contact the salon for changes.',
    completed: {
      title: 'Booking completed',
      message: 'Thank you for your visit!'
    },
    cancelled: {
      title: 'Booking cancelled',
      message: 'This booking has been cancelled.'
    },
    practicalInfo: {
      title: 'Practical information'
    }
  },
  console: {
    validation: {
      staff: {
        name: 'Staff name must be 2-60 characters.',
        role: 'Select a valid role.',
        serviceName: 'Service name must be 2-60 characters.',
        serviceDuration: 'Duration must be between 5 and 480 minutes.',
        servicePrice: 'Price must be a positive number.',
        serviceBuffer: 'Buffer must be 0, 5, 10, or 15.',
        assignService: 'At least one staff must be assigned to the service.',
        serviceRequired: 'At least one service must be assigned to staff.'
      },
      booking: {
        customerName: 'Customer name is required.',
        time: 'Select a date and time.',
        salonId: 'Salon ID is missing. Refresh or contact support.',
        assignService: 'Assign the service to a staff member first.'
      },
      salon: {
        name: 'Salon name must be 2-60 characters.',
        timezone: 'Timezone is required.',
        locale: 'Locale is required.',
        currency: 'Currency is required.'
      },
      hours: {
        noDays: 'Select at least one day.',
        timeRange: 'Start time must be before end time.'
      }
    },
    paymentMissing: 'No payment found for this booking.',
    refundFailed: 'Refund failed. Please try again.',
    refundIdempotent: 'Refund already processed.',
    refundSuccess: 'Refund processed successfully.',
    reconcileFailed: 'Failed to reconcile payment.',
    reconcileUpdated: 'Payment status updated.',
    reconcileNoop: 'Payment already up to date.',
    refundAction: 'Refund payment',
    reconcileAction: 'Reconcile payment',
    dashboard: {
      error: 'Failed to load dashboard data.',
      retry: 'Retry',
      kpis: {
        todayBookings: "Today's Bookings",
        todayRevenue: "Today's Revenue",
        completed: 'completed',
        remaining: 'remaining',
        confirmedAmount: 'confirmed',
        noRevenueYet: 'No revenue yet',
        upcomingBookings: 'Upcoming Bookings',
        nextBookingAt: 'Next at',
        systemStatus: 'System Status',
        allGood: 'All good',
        actionRequired: 'Action required',
        noIssues: 'No issues detected'
      },
      bookings: {
        title: "Today's Bookings",
        unknownCustomer: 'Unknown customer',
        status: {
          pending: 'Pending',
          confirmed: 'Confirmed',
          in_progress: 'In progress',
          completed: 'Completed',
          cancelled: 'Cancelled',
          no_show: 'No show'
        },
        emptyTitle: 'No bookings today',
        emptyBody: 'There are no bookings scheduled for today.',
        createBooking: 'Create booking',
        viewCalendar: 'View calendar'
      },
      quickActions: {
        createManual: 'Create manual booking',
        goToCalendar: 'Go to calendar',
        viewStaff: 'View staff',
        settings: 'Settings',
        support: 'Support'
      }
    },
    calendar: {
      today: 'Today',
      dayView: 'Day',
      weekView: 'Week',
      createBooking: 'Create booking',
      selectStaff: 'Select staff',
      allStaff: 'All staff',
      noBookings: 'No bookings',
      goToToday: 'Go to today'
    }
  },
  apiErrors: {
    generic: 'Something went wrong. Please try again.',
    'error.validation_failed': 'Check the highlighted fields and try again.',
    'error.database_error': 'We hit a database error. Please try again.',
    'error.request_error': 'We could not complete the request. Please try again.',
    'error.internal_error': 'Something went wrong on our side. Please try again.',
    'error.unauthorized': 'Please sign in again to continue.',
    'error.auth.forbidden': 'You do not have access to this resource.',
    'error.salon_required': 'Please complete salon setup first.',
    'error.salon_forbidden': 'You do not have access to this salon.',
    'error.business_hours_invalid': 'Start time must be before end time.',
    'error.business_hours_duplicate_day': 'Each day can only appear once.',
    'error.provision_failed': 'We could not create your salon yet. Please retry.',
    'error.salon_not_found': 'Salon was not found.',
    'error.staff_salon_mismatch': 'This staff member does not belong to the salon.',
    'error.service_salon_mismatch': 'This service does not belong to the salon.',
    'error.customer_salon_mismatch': 'This customer does not belong to the salon.',
    'error.staff_not_found': 'Staff member was not found.',
    'error.service_not_found': 'Service was not found.',
    'error.customer_not_found': 'Customer was not found.',
    'error.customer_required': 'Add a customer before booking.',
    'error.booking.invalid_reference': 'Staff or service reference is invalid.',
    'error.booking.staff_not_assigned_to_service': 'Selected staff cannot perform this service.',
    'error.booking.duration_mismatch': 'Selected time does not match service duration.',
    'error.booking.invalid_time_range': 'Selected time is invalid.',
    'error.booking.invalid_time_alignment': 'Start time must be on a 15-minute grid.',
    'error.booking.outside_business_hours': 'Selected time is outside business hours.',
    'error.booking.time_not_available': 'Selected time is no longer available.',
    'error.booking.customer_required': 'Add a customer before booking.',
    'error.booking.not_found': 'Booking was not found.',
    'error.booking.cannot_cancel': 'This booking cannot be cancelled.',
    'error.booking.cannot_reschedule': 'This booking cannot be rescheduled.',
    'error.booking.cancellation_window': 'Cancellation window has passed. Contact the salon.',
    'error.booking_not_found': 'Booking was not found.',
    'error.availability.invalid_query': 'Availability query is invalid.',
    'error.availability.service_not_found': 'Service was not found.',
    'error.availability.no_staff_for_service': 'No staff available for this service.'
  },
  errors: {
    staffMissingSalonId: 'Salon ID missing. Complete salon setup first.',
    bookingMissingIds: 'Missing staff/service/salon IDs. Complete steps above first.',
    bookingEndTime: 'End time could not be calculated.',
    requestFailed: (status: number) => `Request failed (${status}).`
  },
  format: {
    priceLabel: (currency: string) => `Price (${currency})`,
    bufferMinutes: (value: number) => `${value} min`,
    heroSummary: (salon: string, staff: string, service: string) =>
      `${salon} / ${staff} / ${service}`
  }
} as const;

const STORAGE_KEY = 'nemsalon-locale';

export type Locale = 'da' | 'en';
export type SupportedLocale = Locale;

export function resolveLocale(locale: string): Locale {
  return locale?.toLowerCase().startsWith('da') ? 'da' : 'en';
}

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'da' ? 'da' : 'en';
}

export function setStoredLocale(locale: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, locale === 'da' ? 'da' : 'en');
}

export function getCopy(_locale?: string): typeof copy {
  return copy;
}
