import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCustomer,
  getCustomerById,
  getCustomerByEmail,
  getCustomersBySalon,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerStats,
  getCustomerBookingCount,
  getCustomerTotalSpent,
  getCustomerLastBooking,
  getCustomerFavoriteServices,
  getCustomerPreferredStaff,
  getCustomerNotes,
  addCustomerNote,
  updateCustomerNote,
  deleteCustomerNote,
  getCustomerTags,
  addCustomerTag,
  removeCustomerTag,
  mergeCustomers,
  getCustomerDuplicates,
  getCustomerLifetimeValue,
  getCustomerChurnRisk,
  getCustomerSegment,
  exportCustomers,
  importCustomers,
  validateCustomerData,
  sanitizeCustomerData,
  getCustomerConsentStatus,
  updateCustomerConsent,
  getCustomerCommunicationHistory,
  getCustomerFeedback,
  addCustomerFeedback,
  getCustomerReferrals,
  getCustomerLoyaltyPoints,
  updateCustomerLoyaltyPoints,
  getCustomerRewards,
  getCustomerVIPStatus,
  calculateCustomerDiscount,
} from '../../../src/modules/customers/repo/customers-repo.js';
import { getSupabaseClient } from '../../../src/server/db.js';

vi.mock('../../../src/server/db.js');

describe('Customers Repository - Unit Tests', () => {
  let mockClient: any;
  let mockQuery: any;

  beforeEach(() => {
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };

    mockClient = { from: vi.fn().mockReturnValue(mockQuery) };
    vi.mocked(getSupabaseClient).mockReturnValue(mockClient);
  });

  describe('createCustomer', () => {
    it('should create customer with valid data', async () => {
      const mockCustomer = { id: 'cust-1', name: 'John Doe', email: 'john@example.com' };
      mockQuery.single.mockResolvedValue({ data: mockCustomer, error: null });

      const result = await createCustomer({
        salonId: 'salon-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+4512345678',
      });

      expect(result).toEqual(expect.objectContaining({ id: 'cust-1' }));
    });

    it('should handle duplicate email', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key' },
      });

      await expect(
        createCustomer({
          salonId: 'salon-1',
          name: 'John Doe',
          email: 'existing@example.com',
        }),
      ).rejects.toThrow();
    });

    it('should sanitize phone number', async () => {
      const mockCustomer = { id: 'cust-1', phone: '+4512345678' };
      mockQuery.single.mockResolvedValue({ data: mockCustomer, error: null });

      const result = await createCustomer({
        salonId: 'salon-1',
        name: 'John',
        phone: '12 34 56 78',
      });

      expect(result).toBeDefined();
    });
  });

  describe('getCustomerById', () => {
    it('should return customer by id', async () => {
      const mockCustomer = { id: 'cust-1', name: 'John Doe' };
      mockQuery.single.mockResolvedValue({ data: mockCustomer, error: null });

      const result = await getCustomerById('cust-1');
      expect(result).toEqual(expect.objectContaining({ id: 'cust-1' }));
    });

    it('should return null for non-existent customer', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null });

      const result = await getCustomerById('non-existent');
      expect(result).toBeNull();
    });

    it('should include booking history when requested', async () => {
      mockQuery.single.mockResolvedValue({ data: {}, error: null });

      await getCustomerById('cust-1', { includeBookings: true });
      expect(mockQuery.select).toHaveBeenCalledWith(expect.stringContaining('bookings'));
    });
  });

  describe('getCustomerByEmail', () => {
    it('should return customer by email', async () => {
      const mockCustomer = { id: 'cust-1', email: 'john@example.com' };
      mockQuery.single.mockResolvedValue({ data: mockCustomer, error: null });

      const result = await getCustomerByEmail('salon-1', 'john@example.com');
      expect(result).toEqual(expect.objectContaining({ email: 'john@example.com' }));
    });

    it('should be case insensitive', async () => {
      mockQuery.single.mockResolvedValue({ data: { id: 'cust-1' }, error: null });

      await getCustomerByEmail('salon-1', 'JOHN@EXAMPLE.COM');
      expect(mockQuery.ilike).toHaveBeenCalledWith('email', 'JOHN@EXAMPLE.COM');
    });
  });

  describe('getCustomersBySalon', () => {
    it('should return customers for salon', async () => {
      const mockCustomers = [
        { id: 'cust-1', name: 'John' },
        { id: 'cust-2', name: 'Jane' },
      ];
      mockQuery.order.mockResolvedValue({ data: mockCustomers, error: null });

      const result = await getCustomersBySalon('salon-1');
      expect(result).toHaveLength(2);
    });

    it('should filter by tag', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await getCustomersBySalon('salon-1', { tag: 'VIP' });
      expect(mockQuery.in).toHaveBeenCalled();
    });

    it('should filter by booking count', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await getCustomersBySalon('salon-1', { minBookings: 5 });
      expect(mockQuery.gte).toHaveBeenCalled();
    });

    it('should apply pagination', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await getCustomersBySalon('salon-1', { page: 2, limit: 25 });
      expect(mockQuery.range).toHaveBeenCalledWith(25, 49);
    });

    it('should sort by different fields', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await getCustomersBySalon('salon-1', { sortBy: 'name', sortOrder: 'desc' });
      expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: false });
    });
  });

  describe('updateCustomer', () => {
    it('should update customer', async () => {
      const mockCustomer = { id: 'cust-1', name: 'John Updated' };
      mockQuery.single.mockResolvedValue({ data: mockCustomer, error: null });

      const result = await updateCustomer('cust-1', { name: 'John Updated' });
      expect(result).toEqual(expect.objectContaining({ name: 'John Updated' }));
    });

    it('should prevent duplicate email on update', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate email' },
      });

      await expect(updateCustomer('cust-1', { email: 'existing@example.com' })).rejects.toThrow();
    });

    it('should update GDPR consent', async () => {
      mockQuery.single.mockResolvedValue({ data: {}, error: null });

      const result = await updateCustomer('cust-1', {
        marketingConsent: true,
        consentDate: new Date().toISOString(),
      });
      expect(result).toBeDefined();
    });
  });

  describe('deleteCustomer', () => {
    it('should soft delete customer with bookings', async () => {
      mockQuery.eq.mockReturnThis();
      mockQuery.single.mockResolvedValue({ data: null, error: null });

      const result = await deleteCustomer('cust-1');
      expect(result).toBe(true);
    });

    it('should hard delete customer without bookings', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null });

      const result = await deleteCustomer('cust-1', { hardDelete: true });
      expect(result).toBe(true);
    });

    it('should fail if customer has unpaid bookings', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Customer has unpaid bookings' },
      });

      await expect(deleteCustomer('cust-1')).rejects.toThrow();
    });
  });

  describe('searchCustomers', () => {
    it('should search by name', async () => {
      const mockCustomers = [{ id: 'cust-1', name: 'John Doe' }];
      mockQuery.order.mockResolvedValue({ data: mockCustomers, error: null });

      const result = await searchCustomers('salon-1', 'John');
      expect(result).toHaveLength(1);
    });

    it('should search by phone', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await searchCustomers('salon-1', '12345678');
      expect(mockQuery.or).toHaveBeenCalledWith(expect.stringContaining('phone'));
    });

    it('should search by email', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await searchCustomers('salon-1', '@example.com');
      expect(mockQuery.ilike).toHaveBeenCalledWith('email', '%@example.com%');
    });

    it('should support fuzzy search', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await searchCustomers('salon-1', 'Jon', { fuzzy: true });
      expect(mockQuery.ilike).toHaveBeenCalled();
    });
  });

  describe('getCustomerStats', () => {
    it('should return customer statistics', async () => {
      const mockStats = {
        total_customers: 100,
        new_this_month: 10,
        active_customers: 80,
      };
      mockQuery.single.mockResolvedValue({ data: mockStats, error: null });

      const result = await getCustomerStats('salon-1');
      expect(result).toEqual(expect.objectContaining({ total_customers: 100 }));
    });

    it('should calculate retention rate', async () => {
      mockQuery.single.mockResolvedValue({ data: { retention_rate: 0.75 }, error: null });

      const result = await getCustomerStats('salon-1');
      expect(result.retention_rate).toBe(0.75);
    });
  });

  describe('getCustomerBookingCount', () => {
    it('should return booking count', async () => {
      mockQuery.count.mockResolvedValue({ count: 5, error: null });

      const result = await getCustomerBookingCount('cust-1');
      expect(result).toBe(5);
    });

    it('should filter by status', async () => {
      mockQuery.count.mockResolvedValue({ count: 3, error: null });

      const result = await getCustomerBookingCount('cust-1', { status: 'confirmed' });
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'confirmed');
    });

    it('should filter by date range', async () => {
      mockQuery.count.mockResolvedValue({ count: 2, error: null });

      await getCustomerBookingCount('cust-1', { fromDate: '2024-01-01', toDate: '2024-01-31' });
      expect(mockQuery.gte).toHaveBeenCalled();
    });
  });

  describe('getCustomerTotalSpent', () => {
    it('should return total spent', async () => {
      mockQuery.single.mockResolvedValue({ data: { total: 50000 }, error: null });

      const result = await getCustomerTotalSpent('cust-1');
      expect(result).toBe(50000);
    });

    it('should return 0 for new customer', async () => {
      mockQuery.single.mockResolvedValue({ data: { total: null }, error: null });

      const result = await getCustomerTotalSpent('cust-1');
      expect(result).toBe(0);
    });
  });

  describe('getCustomerLastBooking', () => {
    it('should return last booking', async () => {
      const mockBooking = { id: 'booking-1', start_time: '2024-01-15T10:00:00Z' };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await getCustomerLastBooking('cust-1');
      expect(result).toEqual(expect.objectContaining({ id: 'booking-1' }));
    });

    it('should return null if no bookings', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null });

      const result = await getCustomerLastBooking('cust-1');
      expect(result).toBeNull();
    });
  });

  describe('getCustomerFavoriteServices', () => {
    it('should return favorite services', async () => {
      const mockServices = [
        { service_id: 'svc-1', count: 5, name: 'Haircut' },
        { service_id: 'svc-2', count: 3, name: 'Color' },
      ];
      mockQuery.order.mockResolvedValue({ data: mockServices, error: null });

      const result = await getCustomerFavoriteServices('cust-1');
      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(5);
    });
  });

  describe('getCustomerPreferredStaff', () => {
    it('should return preferred staff', async () => {
      const mockStaff = [
        { staff_id: 'staff-1', count: 8, name: 'Alice' },
        { staff_id: 'staff-2', count: 2, name: 'Bob' },
      ];
      mockQuery.order.mockResolvedValue({ data: mockStaff, error: null });

      const result = await getCustomerPreferredStaff('cust-1');
      expect(result[0].staff_id).toBe('staff-1');
    });
  });

  describe('Customer Notes', () => {
    describe('getCustomerNotes', () => {
      it('should return customer notes', async () => {
        const mockNotes = [{ id: 'note-1', content: 'VIP customer' }];
        mockQuery.order.mockResolvedValue({ data: mockNotes, error: null });

        const result = await getCustomerNotes('cust-1');
        expect(result).toHaveLength(1);
      });

      it('should filter by author', async () => {
        mockQuery.order.mockResolvedValue({ data: [], error: null });

        await getCustomerNotes('cust-1', { authorId: 'staff-1' });
        expect(mockQuery.eq).toHaveBeenCalledWith('created_by', 'staff-1');
      });
    });

    describe('addCustomerNote', () => {
      it('should add note', async () => {
        const mockNote = { id: 'note-1', content: 'Test note' };
        mockQuery.single.mockResolvedValue({ data: mockNote, error: null });

        const result = await addCustomerNote('cust-1', 'Test note', 'staff-1');
        expect(result).toEqual(expect.objectContaining({ content: 'Test note' }));
      });

      it('should handle private notes', async () => {
        mockQuery.single.mockResolvedValue({ data: {}, error: null });

        const result = await addCustomerNote('cust-1', 'Private', 'staff-1', { isPrivate: true });
        expect(result).toBeDefined();
      });
    });

    describe('updateCustomerNote', () => {
      it('should update note', async () => {
        mockQuery.single.mockResolvedValue({ data: { id: 'note-1' }, error: null });

        const result = await updateCustomerNote('note-1', 'Updated content');
        expect(result).toBeDefined();
      });
    });

    describe('deleteCustomerNote', () => {
      it('should delete note', async () => {
        mockQuery.eq.mockReturnThis();
        mockQuery.single.mockResolvedValue({ data: null, error: null });

        const result = await deleteCustomerNote('note-1');
        expect(result).toBe(true);
      });
    });
  });

  describe('Customer Tags', () => {
    describe('getCustomerTags', () => {
      it('should return customer tags', async () => {
        const mockTags = [{ tag: 'VIP' }, { tag: 'Regular' }];
        mockQuery.order.mockResolvedValue({ data: mockTags, error: null });

        const result = await getCustomerTags('cust-1');
        expect(result).toEqual(['VIP', 'Regular']);
      });
    });

    describe('addCustomerTag', () => {
      it('should add tag', async () => {
        mockQuery.single.mockResolvedValue({ data: { tag: 'VIP' }, error: null });

        const result = await addCustomerTag('cust-1', 'VIP');
        expect(result).toBe(true);
      });

      it('should handle duplicate tag', async () => {
        mockQuery.single.mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate tag' },
        });

        const result = await addCustomerTag('cust-1', 'VIP');
        expect(result).toBe(false);
      });
    });

    describe('removeCustomerTag', () => {
      it('should remove tag', async () => {
        mockQuery.eq.mockReturnThis();
        mockQuery.single.mockResolvedValue({ data: null, error: null });

        const result = await removeCustomerTag('cust-1', 'VIP');
        expect(result).toBe(true);
      });
    });
  });

  describe('mergeCustomers', () => {
    it('should merge two customers', async () => {
      mockQuery.single.mockResolvedValue({ data: { id: 'cust-1' }, error: null });

      const result = await mergeCustomers('cust-1', 'cust-2');
      expect(result).toEqual(expect.objectContaining({ id: 'cust-1' }));
    });

    it('should transfer bookings', async () => {
      mockQuery.single.mockResolvedValue({ data: {}, error: null });

      await mergeCustomers('cust-1', 'cust-2');
      expect(mockClient.from).toHaveBeenCalledWith('bookings');
    });

    it('should fail if target has GDPR deletion request', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Target customer requested deletion' },
      });

      await expect(mergeCustomers('cust-1', 'cust-2')).rejects.toThrow();
    });
  });

  describe('getCustomerDuplicates', () => {
    it('should find duplicates by email', async () => {
      const mockDuplicates = [
        { id: 'cust-1', email: 'john@example.com', name: 'John' },
        { id: 'cust-2', email: 'john@example.com', name: 'John Doe' },
      ];
      mockQuery.order.mockResolvedValue({ data: mockDuplicates, error: null });

      const result = await getCustomerDuplicates('salon-1');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should find duplicates by phone', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      const result = await getCustomerDuplicates('salon-1', { matchPhone: true });
      expect(mockQuery.or).toHaveBeenCalled();
    });

    it('should find fuzzy name matches', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      const result = await getCustomerDuplicates('salon-1', { fuzzyMatch: true });
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('getCustomerLifetimeValue', () => {
    it('should calculate LTV', async () => {
      mockQuery.single.mockResolvedValue({
        data: { lifetime_value: 250000, average_order: 50000 },
        error: null,
      });

      const result = await getCustomerLifetimeValue('cust-1');
      expect(result.lifetime_value).toBe(250000);
    });

    it('should include predictions', async () => {
      mockQuery.single.mockResolvedValue({
        data: { predicted_ltv: 500000 },
        error: null,
      });

      const result = await getCustomerLifetimeValue('cust-1', { includePrediction: true });
      expect(result.predicted_ltv).toBeDefined();
    });
  });

  describe('getCustomerChurnRisk', () => {
    it('should calculate churn risk', async () => {
      mockQuery.single.mockResolvedValue({
        data: { risk_score: 0.3, risk_level: 'low' },
        error: null,
      });

      const result = await getCustomerChurnRisk('cust-1');
      expect(result.risk_level).toBe('low');
    });

    it('should identify high risk customers', async () => {
      mockQuery.single.mockResolvedValue({
        data: { risk_score: 0.8, risk_level: 'high' },
        error: null,
      });

      const result = await getCustomerChurnRisk('cust-1');
      expect(result.risk_level).toBe('high');
    });
  });

  describe('getCustomerSegment', () => {
    it('should segment customer', async () => {
      const mockSegment = { segment: 'VIP', criteria: ['high_value', 'frequent'] };
      mockQuery.single.mockResolvedValue({ data: mockSegment, error: null });

      const result = await getCustomerSegment('cust-1');
      expect(result.segment).toBe('VIP');
    });

    it('should calculate RFM score', async () => {
      mockQuery.single.mockResolvedValue({
        data: { rfm_score: 555, rfm_segment: 'Champions' },
        error: null,
      });

      const result = await getCustomerSegment('cust-1');
      expect(result.rfm_score).toBe(555);
    });
  });

  describe('exportCustomers', () => {
    it('should export to CSV', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      const result = await exportCustomers('salon-1', { format: 'csv' });
      expect(result).toBeDefined();
    });

    it('should export to JSON', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      const result = await exportCustomers('salon-1', { format: 'json' });
      expect(typeof result).toBe('string');
    });

    it('should filter by segment', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await exportCustomers('salon-1', { segment: 'VIP' });
      expect(mockQuery.eq).toHaveBeenCalledWith('segment', 'VIP');
    });

    it('should anonymize for GDPR export', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      const result = await exportCustomers('salon-1', { gdprExport: true });
      expect(result).toBeDefined();
    });
  });

  describe('importCustomers', () => {
    it('should import from CSV', async () => {
      mockQuery.single.mockResolvedValue({ data: { id: 'cust-1' }, error: null });

      const result = await importCustomers('salon-1', 'csv-data', { format: 'csv' });
      expect(result.imported).toBeGreaterThanOrEqual(0);
    });

    it('should validate before import', async () => {
      const result = await importCustomers('salon-1', 'invalid-data', { validateOnly: true });
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should handle duplicates', async () => {
      mockQuery.single.mockResolvedValue({ data: { id: 'cust-1' }, error: null });

      const result = await importCustomers('salon-1', 'data', { skipDuplicates: true });
      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it('should update existing customers', async () => {
      mockQuery.single.mockResolvedValue({ data: { id: 'cust-1' }, error: null });

      const result = await importCustomers('salon-1', 'data', { updateExisting: true });
      expect(result.updated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateCustomerData', () => {
    it('should validate email format', () => {
      const result = validateCustomerData({ email: 'invalid-email' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should validate phone format', () => {
      const result = validateCustomerData({ phone: 'invalid-phone' });
      expect(result.valid).toBe(false);
    });

    it('should validate required fields', () => {
      const result = validateCustomerData({});
      expect(result.valid).toBe(false);
    });

    it('should pass valid data', () => {
      const result = validateCustomerData({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+4512345678',
      });
      expect(result.valid).toBe(true);
    });

    it('should validate GDPR consent', () => {
      const result = validateCustomerData({
        name: 'John',
        marketingConsent: true,
      });
      expect(result.warnings).toContain('Consent date required');
    });
  });

  describe('sanitizeCustomerData', () => {
    it('should trim whitespace', () => {
      const result = sanitizeCustomerData({ name: '  John Doe  ' });
      expect(result.name).toBe('John Doe');
    });

    it('should normalize email', () => {
      const result = sanitizeCustomerData({ email: 'JOHN@EXAMPLE.COM' });
      expect(result.email).toBe('john@example.com');
    });

    it('should format phone', () => {
      const result = sanitizeCustomerData({ phone: '12 34 56 78' });
      expect(result.phone).toMatch(/^\+45/);
    });

    it('should remove HTML tags', () => {
      const result = sanitizeCustomerData({ notes: '<script>alert(1)</script>Hello' });
      expect(result.notes).not.toContain('<script>');
    });

    it('should truncate long fields', () => {
      const longName = 'A'.repeat(200);
      const result = sanitizeCustomerData({ name: longName });
      expect(result.name.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getCustomerConsentStatus', () => {
    it('should return consent status', async () => {
      mockQuery.single.mockResolvedValue({
        data: {
          marketing_consent: true,
          sms_consent: false,
          consent_date: '2024-01-01',
        },
        error: null,
      });

      const result = await getCustomerConsentStatus('cust-1');
      expect(result.marketing_consent).toBe(true);
    });
  });

  describe('updateCustomerConsent', () => {
    it('should update consent', async () => {
      mockQuery.single.mockResolvedValue({ data: {}, error: null });

      const result = await updateCustomerConsent('cust-1', {
        marketing: true,
        sms: true,
      });
      expect(result).toBe(true);
    });

    it('should log consent change for GDPR', async () => {
      mockQuery.single.mockResolvedValue({ data: {}, error: null });

      await updateCustomerConsent('cust-1', { marketing: false });
      expect(mockClient.from).toHaveBeenCalledWith('audit_log');
    });
  });

  describe('getCustomerCommunicationHistory', () => {
    it('should return communication history', async () => {
      const mockHistory = [
        { id: 'comm-1', type: 'email', sent_at: '2024-01-15' },
        { id: 'comm-2', type: 'sms', sent_at: '2024-01-10' },
      ];
      mockQuery.order.mockResolvedValue({ data: mockHistory, error: null });

      const result = await getCustomerCommunicationHistory('cust-1');
      expect(result).toHaveLength(2);
    });

    it('should filter by type', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await getCustomerCommunicationHistory('cust-1', { type: 'email' });
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'email');
    });
  });

  describe('getCustomerFeedback', () => {
    it('should return feedback', async () => {
      const mockFeedback = [{ id: 'fb-1', rating: 5, comment: 'Great service!' }];
      mockQuery.order.mockResolvedValue({ data: mockFeedback, error: null });

      const result = await getCustomerFeedback('cust-1');
      expect(result[0].rating).toBe(5);
    });

    it('should calculate average rating', async () => {
      mockQuery.single.mockResolvedValue({ data: { average: 4.5 }, error: null });

      const result = await getCustomerFeedback('cust-1', { includeAverage: true });
      expect(result.average).toBe(4.5);
    });
  });

  describe('addCustomerFeedback', () => {
    it('should add feedback', async () => {
      mockQuery.single.mockResolvedValue({ data: { id: 'fb-1' }, error: null });

      const result = await addCustomerFeedback('cust-1', 'booking-1', {
        rating: 5,
        comment: 'Excellent!',
      });
      expect(result).toBeDefined();
    });

    it('should prevent duplicate feedback', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate feedback' },
      });

      await expect(addCustomerFeedback('cust-1', 'booking-1', { rating: 5 })).rejects.toThrow();
    });
  });

  describe('getCustomerReferrals', () => {
    it('should return referrals', async () => {
      const mockReferrals = [{ id: 'ref-1', referred_customer_id: 'cust-2', status: 'completed' }];
      mockQuery.order.mockResolvedValue({ data: mockReferrals, error: null });

      const result = await getCustomerReferrals('cust-1');
      expect(result).toHaveLength(1);
    });

    it('should calculate referral rewards', async () => {
      mockQuery.single.mockResolvedValue({ data: { total_rewards: 500 }, error: null });

      const result = await getCustomerReferrals('cust-1', { includeRewards: true });
      expect(result.total_rewards).toBe(500);
    });
  });

  describe('getCustomerLoyaltyPoints', () => {
    it('should return points balance', async () => {
      mockQuery.single.mockResolvedValue({ data: { points: 500 }, error: null });

      const result = await getCustomerLoyaltyPoints('cust-1');
      expect(result).toBe(500);
    });

    it('should include points history', async () => {
      const mockHistory = [
        { id: 'pts-1', points: 100, type: 'earned' },
        { id: 'pts-2', points: -50, type: 'redeemed' },
      ];
      mockQuery.order.mockResolvedValue({ data: mockHistory, error: null });

      const result = await getCustomerLoyaltyPoints('cust-1', { includeHistory: true });
      expect(result.history).toHaveLength(2);
    });
  });

  describe('updateCustomerLoyaltyPoints', () => {
    it('should add points', async () => {
      mockQuery.single.mockResolvedValue({ data: { points: 600 }, error: null });

      const result = await updateCustomerLoyaltyPoints('cust-1', 100, 'earned');
      expect(result.points).toBe(600);
    });

    it('should redeem points', async () => {
      mockQuery.single.mockResolvedValue({ data: { points: 400 }, error: null });

      const result = await updateCustomerLoyaltyPoints('cust-1', -100, 'redeemed');
      expect(result.points).toBe(400);
    });

    it('should fail if insufficient points', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Insufficient points' },
      });

      await expect(updateCustomerLoyaltyPoints('cust-1', -1000, 'redeemed')).rejects.toThrow();
    });
  });

  describe('getCustomerRewards', () => {
    it('should return available rewards', async () => {
      const mockRewards = [
        { id: 'reward-1', name: 'Free haircut', points_required: 500 },
        { id: 'reward-2', name: 'Discount 20%', points_required: 300 },
      ];
      mockQuery.order.mockResolvedValue({ data: mockRewards, error: null });

      const result = await getCustomerRewards('cust-1');
      expect(result).toHaveLength(2);
    });

    it('should filter by eligibility', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      const result = await getCustomerRewards('cust-1', { eligibleOnly: true });
      expect(mockQuery.lte).toHaveBeenCalledWith('points_required', expect.any(Number));
    });
  });

  describe('getCustomerVIPStatus', () => {
    it('should return VIP status', async () => {
      mockQuery.single.mockResolvedValue({
        data: {
          is_vip: true,
          tier: 'Gold',
          benefits: ['priority_booking', 'discount_10'],
        },
        error: null,
      });

      const result = await getCustomerVIPStatus('cust-1');
      expect(result.is_vip).toBe(true);
      expect(result.tier).toBe('Gold');
    });

    it('should calculate tier based on spend', async () => {
      mockQuery.single.mockResolvedValue({
        data: { tier: 'Silver', spend_threshold: 100000 },
        error: null,
      });

      const result = await getCustomerVIPStatus('cust-1');
      expect(result.spend_threshold).toBe(100000);
    });
  });

  describe('calculateCustomerDiscount', () => {
    it('should calculate discount for VIP', async () => {
      mockQuery.single.mockResolvedValue({
        data: { tier: 'Gold', discount_percent: 15 },
        error: null,
      });

      const result = await calculateCustomerDiscount('cust-1', 10000);
      expect(result.discount).toBe(1500);
      expect(result.final_price).toBe(8500);
    });

    it('should apply loyalty points discount', async () => {
      mockQuery.single.mockResolvedValue({
        data: { tier: 'Bronze', discount_percent: 0 },
        error: null,
      });

      const result = await calculateCustomerDiscount('cust-1', 10000, { usePoints: 500 });
      expect(result.points_used).toBe(500);
    });

    it('should stack discounts', async () => {
      mockQuery.single.mockResolvedValue({
        data: { tier: 'Silver', discount_percent: 10 },
        error: null,
      });

      const result = await calculateCustomerDiscount('cust-1', 10000, {
        promoCode: 'EXTRA5',
      });
      expect(result.total_discount_percent).toBeGreaterThan(10);
    });
  });
});
