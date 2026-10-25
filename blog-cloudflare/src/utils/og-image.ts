/**
 * Extra Open Graph details for the page's og:image.
 *
 * Facebook only shows a preview image on the first share of a URL when it
 * knows the image size up front (og:image:width / og:image:height);
 * otherwise it processes the image asynchronously and the first preview has
 * no image. Values come from the EmDash media record, never guessed.
 */
export interface OgImageMeta {
	width?: number;
	height?: number;
	type?: string;
	alt?: string;
}

interface MediaLike {
	width?: number | null;
	height?: number | null;
	mimeType?: string | null;
	contentType?: string | null;
	alt?: string | null;
}

function positiveInt(value: unknown): number | undefined {
	return typeof value === "number" && Number.isInteger(value) && value > 0
		? value
		: undefined;
}

function nonEmpty(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Build og:image details from a media value or a resolved media reference. */
export function toOgImageMeta(media: MediaLike | null | undefined): OgImageMeta | null {
	if (!media) return null;
	const width = positiveInt(media.width);
	const height = positiveInt(media.height);
	const meta: OgImageMeta = {
		// Width and height only make sense together.
		...(width && height ? { width, height } : {}),
		...(nonEmpty(media.mimeType ?? media.contentType)
			? { type: nonEmpty(media.mimeType ?? media.contentType) }
			: {}),
		...(nonEmpty(media.alt) ? { alt: nonEmpty(media.alt) } : {}),
	};
	return Object.keys(meta).length > 0 ? meta : null;
}

const MEDIA_FILE_PATH_RE = /^\/_emdash\/api\/media\/file\/([^/?#]+)$/;

/**
 * Point a same-site /_emdash/api/media/file/<key> URL at /og/<key>, which
 * serves the same file outside /_emdash/ (Facebook refuses that path).
 * Any other URL, including external images, is returned unchanged.
 */
export function toOgImageUrl(
	url: string | null | undefined,
	origin: string,
): string | null | undefined {
	if (!url) return url;
	let parsed: URL;
	try {
		parsed = new URL(url, origin);
	} catch {
		return url;
	}
	if (parsed.origin !== new URL(origin).origin || parsed.search || parsed.hash) {
		return url;
	}
	const match = MEDIA_FILE_PATH_RE.exec(parsed.pathname);
	return match ? `${parsed.origin}/og/${match[1]}` : url;
}
