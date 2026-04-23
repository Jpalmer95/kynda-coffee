"use client";

import Script from "next/script";

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <Script
      id="json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}

// ---- Pre-built schemas ----

export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Kynda Coffee",
        url: "https://kyndacoffee.com",
        logo: "https://kyndacoffee.com/icons/icon-192.png",
        sameAs: [
          "https://instagram.com/kyndacoffee",
          "https://facebook.com/kyndacoffee",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+1-512-219-6781",
          contactType: "Customer Service",
          areaServed: "US",
          availableLanguage: ["English"],
        },
      }}
    />
  );
}

export function LocalBusinessSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "CafeOrCoffeeShop",
        name: "Kynda Coffee",
        image: "https://kyndacoffee.com/images/hero-coffee.jpg",
        "@id": "https://kyndacoffee.com",
        url: "https://kyndacoffee.com",
        telephone: "+1-512-219-6781",
        priceRange: "$$",
        address: {
          "@type": "PostalAddress",
          streetAddress: "4315 FM 2147",
          addressLocality: "Horseshoe Bay",
          addressRegion: "TX",
          postalCode: "78657",
          addressCountry: "US",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 30.5443,
          longitude: -98.3451,
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "06:00",
            closes: "18:00",
          },
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Saturday", "Sunday"],
            opens: "07:00",
            closes: "17:00",
          },
        ],
        servesCuisine: ["Coffee", "Pastries", "Breakfast"],
        paymentAccepted: ["Cash", "Credit Card", "Apple Pay", "Google Pay"],
      }}
    />
  );
}

export function ProductSchema({
  product,
}: {
  product: {
    name: string;
    description: string;
    image?: string;
    slug: string;
    price_cents: number;
    category?: string;
    rating?: number;
    reviewCount?: number;
  };
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: product.image
          ? [product.image]
          : ["https://kyndacoffee.com/images/og-cover.jpg"],
        url: `https://kyndacoffee.com/shop/product/${product.slug}`,
        brand: {
          "@type": "Brand",
          name: "Kynda Coffee",
        },
        offers: {
          "@type": "Offer",
          url: `https://kyndacoffee.com/shop/product/${product.slug}`,
          priceCurrency: "USD",
          price: (product.price_cents / 100).toFixed(2),
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: {
              "@type": "MonetaryAmount",
              value: "5.99",
              currency: "USD",
            },
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "US",
            },
          },
        },
        aggregateRating:
          product.rating && product.reviewCount
            ? {
                "@type": "AggregateRating",
                ratingValue: product.rating.toFixed(1),
                reviewCount: product.reviewCount,
              }
            : undefined,
      }}
    />
  );
}

export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

export function FAQSchema({
  questions,
}: {
  questions: { question: string; answer: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: questions.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: q.answer,
          },
        })),
      }}
    />
  );
}
