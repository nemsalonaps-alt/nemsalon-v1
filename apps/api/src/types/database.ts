/**
 * Supabase Database Types
 * Auto-generated from local database schema
 * Run `supabase gen types --local --schema public > apps/api/src/types/database.ts` to regenerate
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          ip_address: unknown;
          metadata: Json | null;
          salon_id: string | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          salon_id?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          salon_id?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_user_id_fkey';
            columns: ['actor_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_log_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_access_tokens: {
        Row: {
          booking_id: string;
          created_at: string;
          expires_at: string | null;
          id: string;
          last_used_at: string | null;
          revoked_at: string | null;
          token_hash: string;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          token_hash: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_access_tokens_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          cancel_note: string | null;
          cancel_reason_key: string | null;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          customer_id: string;
          end_time: string;
          expires_at: string | null;
          id: string;
          idempotency_key: string | null;
          notes: string | null;
          salon_id: string;
          service_id: string;
          staff_id: string;
          start_time: string;
          status: Database['public']['Enums']['booking_status'];
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          cancel_note?: string | null;
          cancel_reason_key?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          customer_id: string;
          end_time: string;
          expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          notes?: string | null;
          salon_id: string;
          service_id: string;
          staff_id: string;
          start_time: string;
          status?: Database['public']['Enums']['booking_status'];
          total_amount: number;
          updated_at?: string;
        };
        Update: {
          cancel_note?: string | null;
          cancel_reason_key?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          customer_id?: string;
          end_time?: string;
          expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          notes?: string | null;
          salon_id?: string;
          service_id?: string;
          staff_id?: string;
          start_time?: string;
          status?: Database['public']['Enums']['booking_status'];
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          created_by_user_id: string;
          customer_id: string | null;
          email: string;
          id: string;
          invite_expires_at: string;
          invite_token: string;
          salon_id: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          created_by_user_id: string;
          customer_id?: string | null;
          email: string;
          id?: string;
          invite_expires_at?: string;
          invite_token: string;
          salon_id: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          created_by_user_id?: string;
          customer_id?: string | null;
          email?: string;
          id?: string;
          invite_expires_at?: string;
          invite_token?: string;
          salon_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customer_invitations_created_by_user_id_fkey';
            columns: ['created_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_invitations_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_invitations_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          email: string | null;
          has_auth_account: boolean | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          salon_id: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          has_auth_account?: boolean | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          salon_id: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          has_auth_account?: boolean | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          salon_id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
        ];
      };
      error_events: {
        Row: {
          created_at: string;
          error_key: string | null;
          id: string;
          request_id: string | null;
          route: string | null;
          salon_id: string | null;
          status: number;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          error_key?: string | null;
          id?: string;
          request_id?: string | null;
          route?: string | null;
          salon_id?: string | null;
          status: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          error_key?: string | null;
          id?: string;
          request_id?: string | null;
          route?: string | null;
          salon_id?: string | null;
          status?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'error_events_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'error_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          event_key: string;
          id: string;
          metadata: Json | null;
          salon_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_key: string;
          id?: string;
          metadata?: Json | null;
          salon_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_key?: string;
          id?: string;
          metadata?: Json | null;
          salon_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'events_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      memberships: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          role: string;
          salon_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          role: string;
          salon_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          role?: string;
          salon_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_outbox: {
        Row: {
          attempts: number;
          booking_id: string | null;
          channel: Database['public']['Enums']['notification_channel'];
          created_at: string;
          dedupe_key: string | null;
          id: string;
          locked_at: string | null;
          locked_by: string | null;
          next_attempt_at: string | null;
          payload: Json;
          provider: string;
          recipient: string;
          salon_id: string;
          status: Database['public']['Enums']['notification_status'];
          type: string;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          booking_id?: string | null;
          channel: Database['public']['Enums']['notification_channel'];
          created_at?: string;
          dedupe_key?: string | null;
          id?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          next_attempt_at?: string | null;
          payload?: Json;
          provider: string;
          recipient: string;
          salon_id: string;
          status?: Database['public']['Enums']['notification_status'];
          type: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          booking_id?: string | null;
          channel?: Database['public']['Enums']['notification_channel'];
          created_at?: string;
          dedupe_key?: string | null;
          id?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          next_attempt_at?: string | null;
          payload?: Json;
          provider?: string;
          recipient?: string;
          salon_id?: string;
          status?: Database['public']['Enums']['notification_status'];
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_outbox_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_outbox_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          booking_id: string;
          created_at: string;
          currency: string;
          id: string;
          idempotency_key: string | null;
          provider: string;
          provider_event_id: string | null;
          provider_intent_id: string | null;
          provider_reference: string | null;
          raw_event: Json | null;
          salon_id: string;
          status: Database['public']['Enums']['payment_status'];
          subtotal_amount: number | null;
          tax_amount: number | null;
          total_amount: number | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          booking_id: string;
          created_at?: string;
          currency?: string;
          id?: string;
          idempotency_key?: string | null;
          provider: string;
          provider_event_id?: string | null;
          provider_intent_id?: string | null;
          provider_reference?: string | null;
          raw_event?: Json | null;
          salon_id: string;
          status?: Database['public']['Enums']['payment_status'];
          subtotal_amount?: number | null;
          tax_amount?: number | null;
          total_amount?: number | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          booking_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          idempotency_key?: string | null;
          provider?: string;
          provider_event_id?: string | null;
          provider_intent_id?: string | null;
          provider_reference?: string | null;
          raw_event?: Json | null;
          salon_id?: string;
          status?: Database['public']['Enums']['payment_status'];
          subtotal_amount?: number | null;
          tax_amount?: number | null;
          total_amount?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
        ];
      };
      platform_admins: {
        Row: {
          active: boolean;
          created_at: string;
          email: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          email: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          email?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'platform_admins_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      salon_business_hours: {
        Row: {
          created_at: string;
          day: string;
          enabled: boolean;
          end_time: string;
          id: string;
          salon_id: string;
          start_time: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          day: string;
          enabled?: boolean;
          end_time: string;
          id?: string;
          salon_id: string;
          start_time: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          day?: string;
          enabled?: boolean;
          end_time?: string;
          id?: string;
          salon_id?: string;
          start_time?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'salon_business_hours_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
        ];
      };
      salons: {
        Row: {
          address_line1: string | null;
          address_line2: string | null;
          cancellation_window_minutes: number;
          city: string | null;
          country: string | null;
          created_at: string;
          currency: string;
          email: string | null;
          id: string;
          locale: string;
          name: string;
          phone: string | null;
          postal_code: string | null;
          salon_type: string | null;
          slug: string | null;
          status: Database['public']['Enums']['salon_status'];
          stripe_account_id: string | null;
          stripe_charges_enabled: boolean;
          stripe_connect_state: string | null;
          stripe_connect_state_expires_at: string | null;
          stripe_details_submitted: boolean;
          stripe_onboarding_completed_at: string | null;
          stripe_payouts_enabled: boolean;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          address_line1?: string | null;
          address_line2?: string | null;
          cancellation_window_minutes?: number;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string;
          email?: string | null;
          id?: string;
          locale?: string;
          name: string;
          phone?: string | null;
          postal_code?: string | null;
          salon_type?: string | null;
          slug?: string | null;
          status?: Database['public']['Enums']['salon_status'];
          stripe_account_id?: string | null;
          stripe_charges_enabled?: boolean;
          stripe_connect_state?: string | null;
          stripe_connect_state_expires_at?: string | null;
          stripe_details_submitted?: boolean;
          stripe_onboarding_completed_at?: string | null;
          stripe_payouts_enabled?: boolean;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address_line1?: string | null;
          address_line2?: string | null;
          cancellation_window_minutes?: number;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string;
          email?: string | null;
          id?: string;
          locale?: string;
          name?: string;
          phone?: string | null;
          postal_code?: string | null;
          salon_type?: string | null;
          slug?: string | null;
          status?: Database['public']['Enums']['salon_status'];
          stripe_account_id?: string | null;
          stripe_charges_enabled?: boolean;
          stripe_connect_state?: string | null;
          stripe_connect_state_expires_at?: string | null;
          stripe_details_submitted?: boolean;
          stripe_onboarding_completed_at?: string | null;
          stripe_payouts_enabled?: boolean;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          buffer_minutes: number;
          created_at: string;
          currency: string;
          description: string | null;
          duration_minutes: number;
          id: string;
          name: string;
          price_amount: number;
          salon_id: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          buffer_minutes?: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          duration_minutes: number;
          id?: string;
          name: string;
          price_amount: number;
          salon_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          buffer_minutes?: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          name?: string;
          price_amount?: number;
          salon_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'services_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_auth: {
        Row: {
          active: boolean;
          created_at: string;
          failed_login_attempts: number;
          id: string;
          invite_expires_at: string;
          invite_token: string;
          invited_email: string;
          last_login_at: string | null;
          locked_until: string | null;
          pin_hash: string | null;
          pin_set_at: string | null;
          salon_id: string;
          staff_id: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          failed_login_attempts?: number;
          id?: string;
          invite_expires_at?: string;
          invite_token: string;
          invited_email: string;
          last_login_at?: string | null;
          locked_until?: string | null;
          pin_hash?: string | null;
          pin_set_at?: string | null;
          salon_id: string;
          staff_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          failed_login_attempts?: number;
          id?: string;
          invite_expires_at?: string;
          invite_token?: string;
          invited_email?: string;
          last_login_at?: string | null;
          locked_until?: string | null;
          pin_hash?: string | null;
          pin_set_at?: string | null;
          salon_id?: string;
          staff_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_auth_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_auth_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: true;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_profiles: {
        Row: {
          active: boolean;
          created_at: string;
          display_name: string;
          email: string | null;
          id: string;
          phone: string | null;
          role: string;
          salon_id: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          display_name: string;
          email?: string | null;
          id?: string;
          phone?: string | null;
          role?: string;
          salon_id: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          id?: string;
          phone?: string | null;
          role?: string;
          salon_id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_profiles_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_services: {
        Row: {
          created_at: string;
          service_id: string;
          staff_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          service_id: string;
          staff_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          service_id?: string;
          staff_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_services_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_services_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_sessions: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          ip_address: unknown;
          last_active_at: string;
          salon_id: string;
          staff_id: string;
          token_hash: string;
          user_agent: string | null;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          ip_address?: unknown;
          last_active_at?: string;
          salon_id: string;
          staff_id: string;
          token_hash: string;
          user_agent?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          ip_address?: unknown;
          last_active_at?: string;
          salon_id?: string;
          staff_id?: string;
          token_hash?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_sessions_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_sessions_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_time_off: {
        Row: {
          created_at: string;
          end_time: string;
          id: string;
          reason: string | null;
          salon_id: string;
          staff_id: string;
          start_time: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_time: string;
          id?: string;
          reason?: string | null;
          salon_id: string;
          staff_id: string;
          start_time: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_time?: string;
          id?: string;
          reason?: string | null;
          salon_id?: string;
          staff_id?: string;
          start_time?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_time_off_salon_id_fkey';
            columns: ['salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_time_off_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_working_hours: {
        Row: {
          created_at: string;
          day: string;
          enabled: boolean;
          end_time: string;
          id: string;
          staff_id: string;
          start_time: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          day: string;
          enabled?: boolean;
          end_time: string;
          id?: string;
          staff_id: string;
          start_time: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          day?: string;
          enabled?: boolean;
          end_time?: string;
          id?: string;
          staff_id?: string;
          start_time?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_working_hours_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          primary_salon_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          primary_salon_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          primary_salon_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_primary_salon_id_fkey';
            columns: ['primary_salon_id'];
            isOneToOne: false;
            referencedRelation: 'salons';
            referencedColumns: ['id'];
          },
        ];
      };
      worker_heartbeats: {
        Row: {
          details: Json | null;
          last_seen_at: string;
          worker_name: string;
        };
        Insert: {
          details?: Json | null;
          last_seen_at: string;
          worker_name: string;
        };
        Update: {
          details?: Json | null;
          last_seen_at?: string;
          worker_name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cleanup_expired_staff_sessions: { Args: never; Returns: undefined };
      get_user_primary_role: { Args: { p_user_id: string }; Returns: string };
      is_platform_admin: { Args: { p_user_id: string }; Returns: boolean };
      provision_salon_for_user: {
        Args: {
          p_email: string;
          p_full_name: string;
          p_phone: string;
          p_role?: string;
          p_user_id: string;
        };
        Returns: string;
      };
      upsert_platform_admin: {
        Args: { p_active?: boolean; p_email: string; p_user_id: string };
        Returns: {
          active: boolean;
          created_at: string;
          email: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'platform_admins';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      booking_status:
        | 'pending'
        | 'confirmed'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
        | 'no_show';
      notification_channel: 'email' | 'sms' | 'push';
      notification_status: 'pending' | 'sent' | 'failed' | 'processing';
      payment_status:
        | 'pending'
        | 'paid'
        | 'failed'
        | 'refunded'
        | 'created'
        | 'requires_action'
        | 'processing'
        | 'succeeded'
        | 'canceled';
      salon_status: 'draft' | 'active';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      booking_status: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
      notification_channel: ['email', 'sms', 'push'],
      notification_status: ['pending', 'sent', 'failed', 'processing'],
      payment_status: [
        'pending',
        'paid',
        'failed',
        'refunded',
        'created',
        'requires_action',
        'processing',
        'succeeded',
        'canceled',
      ],
      salon_status: ['draft', 'active'],
    },
  },
} as const;

// Common table type aliases for direct import
export type AuditLog = Tables<'audit_log'>;
export type Booking = Tables<'bookings'>;
export type BookingAccessToken = Tables<'booking_access_tokens'>;
export type Customer = Tables<'customers'>;
export type CustomerInvitation = Tables<'customer_invitations'>;
export type ErrorEvent = Tables<'error_events'>;
export type Event = Tables<'events'>;
export type Membership = Tables<'memberships'>;
export type NotificationOutbox = Tables<'notification_outbox'>;
export type Payment = Tables<'payments'>;
export type PlatformAdmin = Tables<'platform_admins'>;
export type Salon = Tables<'salons'>;
export type SalonBusinessHours = Tables<'salon_business_hours'>;
export type Service = Tables<'services'>;
export type StaffAuth = Tables<'staff_auth'>;
export type StaffProfile = Tables<'staff_profiles'>;
export type StaffService = Tables<'staff_services'>;
export type StaffSession = Tables<'staff_sessions'>;
export type StaffTimeOff = Tables<'staff_time_off'>;
export type StaffWorkingHours = Tables<'staff_working_hours'>;
export type User = Tables<'users'>;
export type WorkerHeartbeat = Tables<'worker_heartbeats'>;

// Enum type aliases
export type BookingStatus = Enums<'booking_status'>;
export type NotificationChannel = Enums<'notification_channel'>;
export type NotificationStatus = Enums<'notification_status'>;
export type PaymentStatus = Enums<'payment_status'>;
export type SalonStatus = Enums<'salon_status'>;
