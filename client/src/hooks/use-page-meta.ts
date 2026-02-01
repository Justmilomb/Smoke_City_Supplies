import { useEffect } from "react";

const META_DESCRIPTION_ID = "meta-description";
const SITE_NAME = "Smoke City Supplies";

export type PageMeta = {
  title: string;
  description?: string;
  /** Absolute or relative image URL for og:image / twitter:image */
  image?: string;
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

/**
 * Sets document title and optional meta description / og / twitter for the current page.
 * Call once per page (e.g. in the page component).
 */
export function usePageMeta(meta: PageMeta) {
  const { title, description, image } = meta;

  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    if (description) {
      setMetaDescription(description);
    }

    if (image) {
      const absoluteImage = image.startsWith("http") ? image : `${window.location.origin}${image.startsWith("/") ? "" : "/"}${image}`;
      setMetaProperty("og:image", absoluteImage);
      setMetaName("twitter:image", absoluteImage);
    }

    setMetaProperty("og:title", fullTitle);
    setMetaName("twitter:title", fullTitle);
    if (description) {
      setMetaProperty("og:description", description);
      setMetaName("twitter:description", description);
    }
  }, [title, description, image]);
}
