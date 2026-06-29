const SAFE_TAGS = new Set(["a", "br", "strong", "b", "em", "i", "u", "span"]);
const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "blob:"]);
const SAFE_IMAGE_DATA_URL_RE = /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-zA-Z0-9+/]+=*$/;
const SAFE_VIDEO_DATA_URL_RE = /^data:video\/(?:mp4|webm|ogg);base64,[a-zA-Z0-9+/]+=*$/;
const URL_SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const CSS_URL_UNSAFE_RE = /[\u0000-\u001F\u007F<>"'()\\]/;

export function isSafeResourceUrl(value: string): boolean {
  const url = value.trim();
  if (!url) return false;
  if (CSS_URL_UNSAFE_RE.test(url)) return false;
  if (SAFE_IMAGE_DATA_URL_RE.test(url)) return true;
  if (SAFE_VIDEO_DATA_URL_RE.test(url)) return true;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  if (!url.startsWith("//") && !URL_SCHEME_RE.test(url)) return true;
  try {
    return SAFE_URL_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

function isSafeLinkHref(value: string): boolean {
  const href = value.trim();
  if (!href) return false;
  if (href.startsWith("#")) return true;
  return isSafeResourceUrl(href);
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";

  const template = document.createElement("template");
  template.innerHTML = html;

  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        const tag = element.tagName.toLowerCase();

        if (!SAFE_TAGS.has(tag)) {
          element.replaceWith(...Array.from(element.childNodes));
          continue;
        }

        for (const attr of [...element.attributes]) {
          const name = attr.name.toLowerCase();
          const value = attr.value;
          if (name.startsWith("on") || name === "style") {
            element.removeAttribute(attr.name);
            continue;
          }
          if (tag === "a" && name === "href") {
            if (isSafeLinkHref(value)) {
              element.setAttribute("target", "_blank");
              element.setAttribute("rel", "noreferrer");
            } else {
              element.removeAttribute(attr.name);
            }
            continue;
          }
          if (!(tag === "a" && (name === "target" || name === "rel"))) {
            element.removeAttribute(attr.name);
          }
        }
      }
      walk(child);
    }
  };

  walk(template.content);
  return template.innerHTML;
}
