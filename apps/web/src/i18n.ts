export const copy = {
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
    needsLogin: {
      badge: 'Login required',
      title: 'Sign in to continue',
      body: 'We could not find an active session. Please log in to start onboarding.',
      primaryAction: 'Go to login',
      secondaryAction: 'Retry'
    }
  },
  salon: {
    badge: 'Step 1',
    title: 'Create your salon',
    body: 'Set your default settings now. You can always fine-tune later.',
    missingSalonId:
      'No salon ID found on your profile. You may need an admin to create a salon first.',
    fields: {
      nameLabel: 'Salon name',
      namePlaceholder: 'Studio Ember',
      timezoneLabel: 'Timezone',
      timezonePlaceholder: 'Europe/Copenhagen',
      localeLabel: 'Locale',
      currencyLabel: 'Currency',
      currencyPlaceholder: 'DKK'
    },
    hours: {
      title: 'Business hours',
      body: 'Default hours for new staff and booking availability.',
      note: 'Business hours are saved locally until a /business-hours endpoint exists.'
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
      assignNote:
        'Assignment is stored locally for now. API endpoint for staff-service mapping is not in the current OpenAPI.'
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
      openCheckout: 'Open checkout',
      viewCalendar: 'View calendar'
    },
    success: {
      bookingPending: 'Booking created, payment pending.',
      checkoutReady: 'Booking created. Checkout ready.',
      bookingQueued: 'Booking created. Confirmation is queued.'
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
      currency: 'Currency is required.'
    },
    staff: {
      name: 'Staff name must be 2-60 characters.',
      role: 'Select a valid role.',
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
  apiErrors: {
    generic: 'Something went wrong. Please try again.',
    'error.validation_failed': 'Check the highlighted fields and try again.',
    'error.database_error': 'We hit a database error. Please try again.',
    'error.request_error': 'We could not complete the request. Please try again.',
    'error.internal_error': 'Something went wrong on our side. Please try again.',
    'error.salon_not_found': 'Salon was not found.',
    'error.staff_not_found': 'Staff member was not found.',
    'error.service_not_found': 'Service was not found.',
    'error.customer_not_found': 'Customer was not found.',
    'error.customer_required': 'Add a customer before booking.',
    'error.booking_not_found': 'Booking was not found.'
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
