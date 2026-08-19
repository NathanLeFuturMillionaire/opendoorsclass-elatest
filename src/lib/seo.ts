export const SITE_URL = "https://opendoorsclass-elatest.lovable.app";
export const SITE_NAME = "OpenDoorsClass";
export const OG_IMAGE = `${SITE_URL}/og-opendoorsclass.jpg`;
export const LOGO_URL = `${SITE_URL}/favicon.png`;
export const WHATSAPP_E164 = "+24174825725";

export const canonical = (path: string) => `${SITE_URL}${path}`;

/** Shared social tags for a public page. */
export function socialMeta(opts: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article" | "profile";
  image?: string;
}) {
  const url = canonical(opts.path);
  const image = opts.image ?? OG_IMAGE;
  return [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:type", content: opts.type ?? "website" },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
    { name: "twitter:image", content: image },
  ];
}

export const canonicalLink = (path: string) => [{ rel: "canonical", href: canonical(path) }];

export const NOINDEX = { name: "robots", content: "noindex, nofollow" };

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  };
}

export function courseLd(opts: {
  name: string;
  description: string;
  path: string;
  inLanguage: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: opts.name,
    description: opts.description,
    url: canonical(opts.path),
    inLanguage: opts.inLanguage,
    educationalLevel: "CEFR A1 to C2",
    provider: {
      "@type": "EducationalOrganization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: "OpenDoorsClass Level Test",
  url: SITE_URL,
  logo: LOGO_URL,
  image: OG_IMAGE,
  description:
    "OpenDoorsClass est une plateforme d'évaluation et d'apprentissage des langues, anglais et espagnol, alignée sur le CECRL, de A1 à C2.",
  founder: [
    {
      "@type": "Person",
      name: "MAYUKWA Nathan Harysthote",
      jobTitle: "Fondateur",
    },
    {
      "@type": "Person",
      name: "IBALA BISSELO Hulda Christ Girelle",
      jobTitle: "Co-fondatrice",
    },
  ],
  areaServed: "Worldwide",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Libreville",
    addressCountry: "GA",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: WHATSAPP_E164,
      contactType: "customer support",
      availableLanguage: ["French", "English", "Spanish"],
    },
  ],
};

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: ["fr", "en", "es"],
  publisher: { "@id": `${SITE_URL}/#organization` },
};