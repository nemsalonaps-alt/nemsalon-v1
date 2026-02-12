export type Customer = {
  id: string;
  salonId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};
