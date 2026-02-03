import createClient from 'openapi-fetch';
import type { paths } from './schema.js';

const baseUrl = process.env.NEMSALON_API_URL ?? 'http://localhost:3000/api';

export const apiClient = createClient<paths>({ baseUrl });
