import { useEffect } from "react";

const META_DESCRIPTION_ID = "meta-description";
const SITE_NAME = "Smoke City Supplies";

export type PageMeta = {
  title: string;
  description?: string;
  /** Absolute or relative image URL for og:image / twitter:image */
  image?: string;
  /** Comma-separated keywords for meta keywords tag */
  keywords?: string;
  /** og:type — defaults to "website", use "product" for product pages */
  ogType?: string;
  /** If true, adds noindex meta tag (for admin pages) */
  noindex?: boolean;
};

function setMetaDescription(content: string) {
  let el = document.getElementById(META_DESCRIPTION_ID) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.id = META_DESCRIPTION_ID;
    el.name = "description";
    document.head.appendChild(el);
  }
  el.content = content;
}

function setMetaProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setMetaName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Sets document title, meta description, canonical URL, og tags, twitter tags,
 * and optional noindex for the current page. Call once per page component.
 */
export function usePageMeta(meta: PageMeta) {
  const { title, description, image, keywords, ogType, noindex } = meta;

  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    // Canonical URL (strip query params for clean canonical)
    const canonicalUrl = window.location.origin + window.location.pathname;
    setLink("canonical", canonicalUrl);

    // Description
    if (description) {
      setMetaDescription(description);
    }

    // Image
    if (image) {
      const absoluteImage = image.startsWith("http") ? image : `${window.location.origin}${image.startsWith("/") ? "" : "/"}${image}`;
      setMetaProperty("og:image", absoluteImage);
      setMetaName("twitter:image", absoluteImage);
    }

    // Keywords
    if (keywords) {
      setMetaName("keywords", keywords);
    }

    // Open Graph
    setMetaProperty("og:title", fullTitle);
    setMetaProperty("og:url", canonicalUrl);
    setMetaProperty("og:site_name", SITE_NAME);
    setMetaProperty("og:type", ogType || "website");
    if (description) {
      setMetaProperty("og:description", description);
    }

    // Twitter
    setMetaName("twitter:title", fullTitle);
    if (description) {
      setMetaName("twitter:description", description);
    }

    // Noindex for admin pages
    if (noindex) {
      setMetaName("robots", "noindex, nofollow");
    } else {
      // Remove noindex if navigating from admin to public page
      const robotsEl = document.querySelector('meta[name="robots"]');
      if (robotsEl && robotsEl.getAttribute("content")?.includes("noindex")) {
        robotsEl.remove();
      }
    }
  }, [title, description, image, keywords, ogType, noindex]);
}
