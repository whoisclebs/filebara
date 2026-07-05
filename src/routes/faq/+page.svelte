<script lang="ts">
	import { t } from "$lib/i18n/index.svelte.js";
	import FilebaraFooter from "$lib/ui/FilebaraFooter.svelte";
</script>

<svelte:head>
	<title>Filebara — Frequently Asked Questions</title>
</svelte:head>

<div class="page-wrap">
	<main class="central-column">
		<div class="content-stack">
			<a href="/" class="mascot-link">
				<img src="/filebara.png" alt="Filebara capybara mascot" width="120" height="120" class="mascot-img" />
			</a>

			<h1 class="wordmark">{t("faq.title")}</h1>

			<div class="qa-list">
				<div class="qa-item">
					<h2 class="question">{t("faq.q0")}</h2>
					<p class="answer">{t("faq.a0")}</p>
				</div>

				<div class="qa-item">
					<h2 class="question">{t("faq.q1")}</h2>
					<p class="answer">{t("faq.a1")}</p>
				</div>

				<div class="qa-item">
					<h2 class="question">{t("faq.q2")}</h2>
					<p class="answer">{t("faq.a2")}</p>
				</div>

				<div class="qa-item">
					<h2 class="question">{t("faq.q3")}</h2>
					<p class="answer">{t("faq.a3")}</p>
				</div>

				<div class="qa-item">
					<h2 class="question">{t("faq.q4")}</h2>
					<p class="answer">{t("faq.a4")}</p>
				</div>

				<div class="qa-item">
					<h2 class="question">{t("faq.q5")}</h2>
					<p class="answer">{t("faq.a5")}</p>
				</div>

				<div class="qa-item">
					<h2 class="question">{t("faq.q6")}</h2>
					<p class="answer">{t("faq.a6")}</p>
				</div>

				<div class="qa-item">
					<h2 class="question">{t("faq.q7")}</h2>
					<p class="answer">{t("faq.a7")}</p>
				</div>

				<div class="qa-item">
					<h2 class="question">{t("faq.q8")}</h2>
					<p class="answer">{t("faq.a8")}</p>
				</div>

				<div class="qa-item">
					<h2 class="question">{t("faq.q9")}</h2>
					<p class="answer">{t("faq.a9")}</p>
				</div>
			</div>

			<a href="/" class="btn-back">{t("faq.back")}</a>
		</div>
	</main>

	<FilebaraFooter />
</div>

<style>
	.page-wrap {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background: #fff;
	}

	.central-column {
		flex: 1;
		width: 100%;
		margin: 0 auto;
		padding: 0;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		font-family: system-ui, -apple-system, sans-serif;
		box-sizing: border-box;
	}

	.content-stack {
		max-width: 600px;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 0 auto;
		padding: 2rem 1.5rem 3rem;
		box-sizing: border-box;
	}

	.mascot-link {
		display: block;
		line-height: 0;
	}

	.mascot-img {
		display: block;
		margin: 0 auto;
		width: clamp(90px, 12vh, 120px);
		height: auto;
	}

	.wordmark {
		margin: 0.35rem 0 2rem;
		font-size: 1.8rem;
		font-weight: 800;
		font-family: "Playfair Display", Georgia, serif;
		font-style: italic;
		letter-spacing: -0.01em;
		color: #b8432a;
		text-align: center;
		line-height: 1.1;
	}

	.qa-list {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.qa-item {
		width: 100%;
	}

	.question {
		margin: 0 0 0.35rem;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
		font-family: inherit;
		line-height: 1.4;
	}

	.answer {
		margin: 0;
		font-size: 0.88rem;
		color: #666;
		line-height: 1.6;
		font-weight: 400;
	}

	.btn-back {
		margin-top: 2.5rem;
		padding: 0.55rem 1.5rem;
		border: 1.5px solid #d5d5d5;
		border-radius: 999px;
		background: #fff;
		color: #888;
		font-size: 0.85rem;
		font-weight: 500;
		font-family: inherit;
		text-decoration: none;
		transition: border-color 0.15s, color 0.15s;
	}
	.btn-back:hover {
		border-color: #b8432a;
		color: #b8432a;
	}
</style>
