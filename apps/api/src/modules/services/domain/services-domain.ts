export type Service = {
  id: string;
  salonId: string;
  name: string;
  durationMinutes: number;
  bufferMinutes?: number;
  price: number;
  currency: string;
  active?: boolean;
};
