import { siteConfig } from "@/lib/config";
import { type ClassValue, clsx } from "clsx";
import { type Metadata } from "@/components/common";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string) {
  return `${siteConfig.url}${path}`;
}

export function constructMetadata({
  title = siteConfig.name,
  description = siteConfig.description,
  image = absoluteUrl("/og"),
  ...props
}: {
  title?: string;
  description?: string;
  image?: string;
  [key: string]: any;
}): Metadata {
  return {
    title: {
      template: "%s | " + siteConfig.name,
      default: siteConfig.name,
    },
    description: description || siteConfig.description,
    keywords: siteConfig.keywords,
    openGraph: {
      title,
      description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
      locale: "en_US",
    },
    icons: "/favicon.ico",
    metadataBase: new URL(siteConfig.url),
  };
}

/**
 * Format a date string with localization support
 * @param date - The date string to format
 * @param locale - Optional locale string (defaults to browser locale)
 * @param translations - Optional translations object
 */
export function formatDate(date: string, locale?: string, translations?: Record<string, string>) {
  const currentDate = new Date().getTime();
  if (!date.includes("T")) {
    date = `${date}T00:00:00`;
  }
  const targetDate = new Date(date).getTime();
  const timeDifference = Math.abs(currentDate - targetDate);
  const daysAgo = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

  // Use browser's locale if not specified
  const userLocale = locale || navigator.language || 'en-US';
  
  const fullDate = new Date(date).toLocaleString(userLocale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Use translations if provided, otherwise use defaults
  const todayText = translations?.today || "Today";
  const daysAgoText = translations?.days_ago || "d ago";
  const weeksAgoText = translations?.weeks_ago || "w ago";
  const monthsAgoText = translations?.months_ago || "mo ago";
  const yearsAgoText = translations?.years_ago || "y ago";

  if (daysAgo < 1) {
    return todayText;
  } else if (daysAgo < 7) {
    return `${fullDate} (${daysAgo}${daysAgoText})`;
  } else if (daysAgo < 30) {
    const weeksAgo = Math.floor(daysAgo / 7);
    return `${fullDate} (${weeksAgo}${weeksAgoText})`;
  } else if (daysAgo < 365) {
    const monthsAgo = Math.floor(daysAgo / 30);
    return `${fullDate} (${monthsAgo}${monthsAgoText})`;
  } else {
    const yearsAgo = Math.floor(daysAgo / 365);
    return `${fullDate} (${yearsAgo}${yearsAgoText})`;
  }
}
