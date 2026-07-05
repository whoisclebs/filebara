<script lang="ts">
	import { t, setLocale, getCurrentLocale } from "$lib/i18n/index.svelte.js";
	import type { Locale } from "$lib/i18n/types.js";

	let { class: className = '' }: { class?: string } = $props();

	let locale = $derived(getCurrentLocale());

	const LOCALE_ORDER: Locale[] = ["en", "es", "pt-BR"];
	const LOCALE_LABELS: Record<Locale, string> = {
		"en": "EN",
		"es": "ES",
		"pt-BR": "PT-BR",
	};

	function toggleLocale() {
		const idx = LOCALE_ORDER.indexOf(locale);
		const next = LOCALE_ORDER[(idx + 1) % LOCALE_ORDER.length];
		setLocale(next);
	}
</script>

<footer class="filebara-footer {className}">
	<div class="footer-inner">
		<p class="footer-credit">{t("footer.credit")}</p>
		<nav class="footer-links">
			<a href="/terms">{t("footer.terms")}</a>
			<a href="/faq">{t("footer.faq")}</a>
			<a href="https://github.com/whoisclebs/filebara" target="_blank" rel="noopener noreferrer">{t("footer.github")}</a>
			<a href="https://github.com/whoisclebs/filebara/fork" target="_blank" rel="noopener noreferrer">{t("footer.fork")}</a>
			<a href="https://github.com/whoisclebs/filebara/issues" target="_blank" rel="noopener noreferrer">{t("footer.support")}</a>
			<button class="locale-toggle" onclick={toggleLocale}>
				{LOCALE_LABELS[locale]}
			</button>
		</nav>
	</div>
</footer>

<style>
	.filebara-footer {
		padding: 0.5rem 0 0.4rem;
		border-top: 1px solid #eee;
		width: 100%;
	}

	.footer-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 100%;
		margin: 0 auto;
		padding: 0 0.75rem;
	}

	.footer-credit {
		color: #999;
		font-size: 0.68rem;
		font-family: ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", Menlo, monospace;
		margin: 0;
		letter-spacing: 0.01em;
	}

	.footer-links {
		display: flex;
		gap: 0.9rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.footer-links a {
		color: #999;
		font-size: 0.68rem;
		font-family: ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", Menlo, monospace;
		text-decoration: none;
		letter-spacing: 0.01em;
		transition: color 0.15s;
	}

	.footer-links a:hover {
		color: #666;
	}

	.locale-toggle {
		padding: 0.1rem 0.5rem;
		border: 1px solid #d5d5d5;
		border-radius: 999px;
		background: #fff;
		color: #999;
		font-size: 0.65rem;
		font-family: ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", Menlo, monospace;
		font-weight: 600;
		cursor: pointer;
		letter-spacing: 0.02em;
		transition: border-color 0.15s, color 0.15s;
	}

	.locale-toggle:hover {
		border-color: #b8432a;
		color: #b8432a;
	}

	@media (max-width: 720px) {
		.footer-inner {
			gap: 0.6rem;
			flex-direction: column;
			align-items: flex-start;
		}

		.footer-links {
			justify-content: flex-start;
		}
	}
</style>
