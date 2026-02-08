if (!process.env.DEV_AUTH_BYPASS) {
  process.env.DEV_AUTH_BYPASS = 'true';
}

if (typeof process.env.PAYMENTS_USE_MOCK === 'undefined') {
  process.env.PAYMENTS_USE_MOCK = 'true';
}
