export const LISTING_TYPES = [
  { value: "sell", label: "Sell" },
  { value: "rent", label: "Rent" },
] as const;

export const RENTAL_PERIODS = [
  { value: "month", label: "per month" },
  { value: "year", label: "per year" },
] as const;

export const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "land", label: "Land" },
  { value: "ruko", label: "Shop-house (Ruko)" },
  { value: "office", label: "Office" },
  { value: "warehouse", label: "Warehouse" },
  { value: "villa", label: "Villa" },
  { value: "other", label: "Other" },
] as const;

export const LISTING_STATUSES = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "rented", label: "Rented" },
] as const;

export const DEAL_TYPES = [
  { value: "sale", label: "Sale" },
  { value: "rent", label: "Rent" },
] as const;

export const DEAL_SOURCES = [
  { value: "listing", label: "From listing" },
  { value: "manual", label: "Manual" },
] as const;

export const PAYMENT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
] as const;

/** Banks most often used for property payments: shown first. */
const POPULAR_BANKS = [
  "BCA", "Mandiri", "BNI", "BRI", "BTN", "BSI (Bank Syariah Indonesia)", "CIMB Niaga", "Danamon", "Permata",
  "Maybank Indonesia", "OCBC", "Panin", "Mega", "UOB Indonesia", "BTPN / SMBC Indonesia", "Bank Jago",
];

/**
 * All other banks operating in Indonesia (OJK-supervised commercial banks, regional development banks, Islamic banks
 * and units, foreign branches, digital banks). Sorted alphabetically below.
 */
const OTHER_BANKS = [
  // State-owned subsidiaries
  "Bank Mandiri Taspen", "Bank Raya Indonesia", "Hibank",
  // Regional development banks (BPD)
  "Bank Jakarta (DKI)", "Bank BJB", "Bank Jateng", "Bank Jatim", "Bank BPD Bali", "Bank BPD DIY", "Bank Banten",
  "Bank Bengkulu", "Bank SulutGo (BSG)", "Bank Jambi", "Bank Kalbar", "Bank Kalsel", "Bank Kalteng", "Bankaltimtara",
  "Bank Lampung", "Bank Maluku Malut", "Bank Nagari", "Bank NTT", "Bank Papua", "Bank Sulselbar", "Bank Sulteng",
  "Bank Sultra", "Bank Sumsel Babel", "Bank Sumut",
  // Private banks
  "ANZ Indonesia", "Artha Graha", "BNP Paribas Indonesia", "Bank Bumi Arta", "Bank Capital Indonesia",
  "China Construction Bank Indonesia", "CTBC Indonesia", "DBS Indonesia", "Bank Ganesha", "Bank Hana Indonesia",
  "HSBC Indonesia", "IBK Indonesia", "ICBC Indonesia", "Bank Ina Perdana", "Bank Index Selindo", "J Trust Bank",
  "KB Bank (KB Bukopin)", "Bank Maspion", "Bank Mayapada", "Bank Mestika Dharma", "Mizuho Indonesia",
  "Bank MNC Internasional", "Bank Multiarta Sentosa", "Nobu Bank", "Bank of India Indonesia", "QNB Indonesia",
  "Resona Perdania", "SBI Indonesia", "Shinhan Indonesia", "Bank Sinarmas", "Bank Victoria", "Woori Saudara",
  // Digital banks
  "Allo Bank", "Amar Bank", "blu by BCA Digital", "Krom Bank", "Bank Neo Commerce", "Bank Oke", "Sahabat Sampoerna",
  "Bank Saqu", "SeaBank", "Superbank",
  // Foreign bank branches
  "Bank of America", "Bank of China", "Citibank", "Deutsche Bank", "JPMorgan Chase", "MUFG Bank", "Standard Chartered",
  // Islamic banks and units
  "Bank Muamalat", "BCA Syariah", "BTPN Syariah", "Mega Syariah", "Panin Dubai Syariah", "KB Bank Syariah",
  "Bank Aladin Syariah", "Bank Nano Syariah", "Bank Aceh Syariah", "Bank NTB Syariah", "BRK Syariah (Riau Kepri)",
  "BJB Syariah", "CIMB Niaga Syariah", "Danamon Syariah", "Permata Syariah", "OCBC Syariah", "Maybank Syariah",
  "Bank Jakarta Syariah", "Bank Jateng Syariah", "Bank Jatim Syariah", "Bank Nagari Syariah", "Bank Sumut Syariah",
  "Bank Kalsel Syariah", "Bank Kalbar Syariah", "Bank Jambi Syariah", "Bank Sulselbar Syariah",
];

export const BANKS: readonly string[] = [
  ...POPULAR_BANKS,
  ...[...new Set(OTHER_BANKS)].filter((b) => !POPULAR_BANKS.includes(b)).sort((a, b) => a.localeCompare(b)),
  "Other",
];

export const paymentLabel = (type: string | null | undefined, bank?: string | null) =>
  type === "cash" ? "Cash" : type === "bank" ? (bank ? `Bank · ${bank}` : "Bank") : "-";

export const DEFAULT_FACILITIES = [
  "Carport",
  "Garage",
  "Swimming pool",
  "Garden",
  "AC",
  "Water heater",
  "Furnished",
  "Security 24h",
  "CCTV",
  "Gym",
];

export type ListingType = (typeof LISTING_TYPES)[number]["value"];
export type ListingStatus = (typeof LISTING_STATUSES)[number]["value"];
export type PropertyType = (typeof PROPERTY_TYPES)[number]["value"];
export type DealType = (typeof DEAL_TYPES)[number]["value"];

const labelOf = (list: readonly { value: string; label: string }[], v: string | null | undefined) =>
  list.find((x) => x.value === v)?.label ?? v ?? "-";

export const propertyTypeLabel = (v: string | null | undefined) => labelOf(PROPERTY_TYPES, v);
export const statusLabel = (v: string | null | undefined) => labelOf(LISTING_STATUSES, v);
export const listingTypeLabel = (v: string | null | undefined) => labelOf(LISTING_TYPES, v);
export const rentalPeriodLabel = (v: string | null | undefined) => labelOf(RENTAL_PERIODS, v);
export const dealTypeLabel = (v: string | null | undefined) => labelOf(DEAL_TYPES, v);
export const dealSourceLabel = (v: string | null | undefined) => labelOf(DEAL_SOURCES, v);

export const PHOTO_BUCKET = "listing-photos";

export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}
