/**
 * GET /og/<storageKey> — serves an uploaded image for social-card crawlers.
 *
 * Same bytes as /_emdash/api/media/file/<storageKey>, but outside /_emdash/
 * so crawlers that refuse that path (Facebook) can fetch og:image.
 * Only plain media keys (ULID + image extension) and raster image types are
 * served; anything else is a 404.
 */
import type { APIRoute } from "astro";

export const prerender = false;

const MEDIA_KEY_RE = /^[0-9A-HJKMNP-TV-Z]{26}\.(?:jpe?g|png|webp|gif|avif)$/;

const IMAGE_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/avif",
]);

function notFound(): Response {
	return new Response("Not found", {
		status: 404,
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}

export const GET: APIRoute = async ({ params, locals, request }) => {
	const key = params.key;
	if (!key || !MEDIA_KEY_RE.test(key)) return notFound();

	const storage = locals.emdash?.storage;
	if (!storage) return notFound();

	let body: ReadableStream<Uint8Array> | undefined;
	try {
		const result = await storage.download(key);
		body = result.body;
		if (!IMAGE_TYPES.has(result.contentType)) {
			await body.cancel().catch(() => undefined);
			return notFound();
		}

		const headers: Record<string, string> = {
			"Content-Type": result.contentType,
			"Cache-Control": "public, max-age=86400",
			"Content-Disposition": "inline",
			"X-Content-Type-Options": "nosniff",
		};
		if (result.size) headers["Content-Length"] = String(result.size);
		if (result.lastModified) {
			headers["Last-Modified"] = result.lastModified.toUTCString();
		}

		if (request.method === "HEAD") {
			await body.cancel().catch(() => undefined);
			return new Response(null, { status: 200, headers });
		}
		return new Response(body, { status: 200, headers });
	} catch {
		if (body && !body.locked) await body.cancel().catch(() => undefined);
		return notFound();
	}
};
