import { getI18nConfig } from "emdash";

/**
 * The site's time zone. Dates are stored in UTC; every date shown on the site
 * (post headers, cards, sidebar, archives) is converted to Japan time so a post
 * published on 7/11 JST never shows as 7/10.
 */
export const SITE_TIME_ZONE = "Asia/Tokyo";

/** Offset of SITE_TIME_ZONE from UTC. Japan has no daylight saving time. */
const SITE_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * The default locale from the site's Astro `i18n` config, if it names a
 * language this runtime can format. Callers fall back to Japanese when it's
 * undefined.
 */
export function getSiteLocale(): string | undefined {
	const locale = getI18nConfig()?.defaultLocale;
	if (!locale) return undefined;
	try {
		return Intl.DateTimeFormat.supportedLocalesOf(locale)[0];
	} catch {
		// Malformed tags such as "pt_BR" throw instead of matching nothing.
		return undefined;
	}
}

function dateLocale(): string {
	return getSiteLocale() ?? "ja-JP";
}

/**
 * Formats a date in the site's locale (Japanese without one) and in Japan
 * time, e.g. 2026年7月11日. `month` is kept for call-site compatibility; in
 * Japanese "long" and "short" both read 7月.
 */
export function formatDate(date: Date, month: "long" | "short" = "long"): string {
	return new Intl.DateTimeFormat(dateLocale(), {
		timeZone: SITE_TIME_ZONE,
		year: "numeric",
		month,
		day: "numeric",
	}).format(date);
}

/** Formats a year and month in Japan time, e.g. 2026年7月. */
export function formatYearMonth(date: Date): string {
	return new Intl.DateTimeFormat(dateLocale(), {
		timeZone: SITE_TIME_ZONE,
		year: "numeric",
		month: "long",
	}).format(date);
}

/** The calendar year and month (1–12) of a date in Japan time. */
export function getSiteYearMonth(date: Date): { year: number; month: number } {
	const shifted = new Date(date.getTime() + SITE_UTC_OFFSET_MS);
	return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

/**
 * The UTC instant at which a Japan-time calendar month starts. Month 13 rolls
 * over to January of the next year, so `[start(y, m), start(y, m + 1))` is the
 * whole month.
 */
export function siteMonthStart(year: number, month: number): Date {
	return new Date(Date.UTC(year, month - 1, 1) - SITE_UTC_OFFSET_MS);
}
