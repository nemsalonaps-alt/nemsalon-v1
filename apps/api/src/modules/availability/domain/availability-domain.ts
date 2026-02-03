export type AvailabilitySlot = {
  startUtc: string;
  endUtc: string;
  staffId: string;
};

export type AvailabilityMeta = {
  fromUtc: string;
  days: number;
  intervalMinutes: number;
  serviceId: string;
  staffId?: string;
  timezone: string;
};

export type AvailabilityResponse = {
  slots: AvailabilitySlot[];
  meta: AvailabilityMeta;
};
