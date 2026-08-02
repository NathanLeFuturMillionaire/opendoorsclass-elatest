export type Country = { code: string; flag: string; fr: string; en: string };

export const COUNTRIES: Country[] = [
  { code: "GA", flag: "🇬🇦", fr: "Gabon", en: "Gabon" },
  { code: "CM", flag: "🇨🇲", fr: "Cameroun", en: "Cameroon" },
  { code: "CI", flag: "🇨🇮", fr: "Côte d'Ivoire", en: "Côte d'Ivoire" },
  { code: "CG", flag: "🇨🇬", fr: "Congo", en: "Congo" },
  { code: "CD", flag: "🇨🇩", fr: "République démocratique du Congo", en: "DR Congo" },
  { code: "SN", flag: "🇸🇳", fr: "Sénégal", en: "Senegal" },
  { code: "BJ", flag: "🇧🇯", fr: "Bénin", en: "Benin" },
  { code: "TG", flag: "🇹🇬", fr: "Togo", en: "Togo" },
  { code: "ML", flag: "🇲🇱", fr: "Mali", en: "Mali" },
  { code: "BF", flag: "🇧🇫", fr: "Burkina Faso", en: "Burkina Faso" },
  { code: "NE", flag: "🇳🇪", fr: "Niger", en: "Niger" },
  { code: "TD", flag: "🇹🇩", fr: "Tchad", en: "Chad" },
  { code: "CF", flag: "🇨🇫", fr: "République centrafricaine", en: "Central African Republic" },
  { code: "GQ", flag: "🇬🇶", fr: "Guinée équatoriale", en: "Equatorial Guinea" },
  { code: "GN", flag: "🇬🇳", fr: "Guinée", en: "Guinea" },
  { code: "MG", flag: "🇲🇬", fr: "Madagascar", en: "Madagascar" },
  { code: "RW", flag: "🇷🇼", fr: "Rwanda", en: "Rwanda" },
  { code: "BI", flag: "🇧🇮", fr: "Burundi", en: "Burundi" },
  { code: "NG", flag: "🇳🇬", fr: "Nigeria", en: "Nigeria" },
  { code: "GH", flag: "🇬🇭", fr: "Ghana", en: "Ghana" },
  { code: "KE", flag: "🇰🇪", fr: "Kenya", en: "Kenya" },
  { code: "TZ", flag: "🇹🇿", fr: "Tanzanie", en: "Tanzania" },
  { code: "UG", flag: "🇺🇬", fr: "Ouganda", en: "Uganda" },
  { code: "ZA", flag: "🇿🇦", fr: "Afrique du Sud", en: "South Africa" },
  { code: "MA", flag: "🇲🇦", fr: "Maroc", en: "Morocco" },
  { code: "DZ", flag: "🇩🇿", fr: "Algérie", en: "Algeria" },
  { code: "TN", flag: "🇹🇳", fr: "Tunisie", en: "Tunisia" },
  { code: "EG", flag: "🇪🇬", fr: "Égypte", en: "Egypt" },
  { code: "FR", flag: "🇫🇷", fr: "France", en: "France" },
  { code: "BE", flag: "🇧🇪", fr: "Belgique", en: "Belgium" },
  { code: "CH", flag: "🇨🇭", fr: "Suisse", en: "Switzerland" },
  { code: "DE", flag: "🇩🇪", fr: "Allemagne", en: "Germany" },
  { code: "ES", flag: "🇪🇸", fr: "Espagne", en: "Spain" },
  { code: "IT", flag: "🇮🇹", fr: "Italie", en: "Italy" },
  { code: "PT", flag: "🇵🇹", fr: "Portugal", en: "Portugal" },
  { code: "GB", flag: "🇬🇧", fr: "Royaume-Uni", en: "United Kingdom" },
  { code: "US", flag: "🇺🇸", fr: "États-Unis", en: "United States" },
  { code: "CA", flag: "🇨🇦", fr: "Canada", en: "Canada" },
  { code: "BR", flag: "🇧🇷", fr: "Brésil", en: "Brazil" },
  { code: "AE", flag: "🇦🇪", fr: "Émirats arabes unis", en: "United Arab Emirates" },
  { code: "SA", flag: "🇸🇦", fr: "Arabie saoudite", en: "Saudi Arabia" },
  { code: "IN", flag: "🇮🇳", fr: "Inde", en: "India" },
  { code: "CN", flag: "🇨🇳", fr: "Chine", en: "China" },
  { code: "JP", flag: "🇯🇵", fr: "Japon", en: "Japan" },
  { code: "AU", flag: "🇦🇺", fr: "Australie", en: "Australia" },
];

export function countryByCode(code: string | null | undefined): Country | undefined {
  if (!code) return undefined;
  const c = code.trim().toUpperCase();
  return COUNTRIES.find((x) => x.code === c);
}

export function countryLabel(code: string, locale: "fr" | "en"): string {
  const c = countryByCode(code);
  return c ? `${c.flag} ${locale === "fr" ? c.fr : c.en}` : code;
}
