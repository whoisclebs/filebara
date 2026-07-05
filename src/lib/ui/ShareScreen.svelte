<script lang="ts">
	import { t } from "$lib/i18n/index.svelte.js";
	import QrCode from "./QrCode.svelte";
	import type { TransferBootstrap } from "$lib/session/senderSession.js";

	let {
		bootstrap,
		transferLink,
	}: {
		bootstrap: TransferBootstrap;
		transferLink: string;
	} = $props();

	let copied = $state(false);
	let copyError = $state<string | undefined>();
	let showQr = $state(false);

	async function copyToClipboard() {
		copied = false;
		copyError = undefined;

		try {
			await navigator.clipboard.writeText(transferLink);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2500);
		} catch {
			try {
				const ta = document.createElement("textarea");
				ta.value = transferLink;
				ta.style.position = "fixed";
				ta.style.left = "-9999px";
				ta.style.top = "-9999px";
				document.body.appendChild(ta);
				ta.select();
				document.execCommand("copy");
				document.body.removeChild(ta);
				copied = true;
				setTimeout(() => {
					copied = false;
				}, 2500);
			} catch {
				copyError = t("shareScreen.copyError");
			}
		}
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function getFileExtension(name: string): string {
		const i = name.lastIndexOf(".");
		return i > 0 ? name.slice(i + 1).toUpperCase() : "FILE";
	}
</script>

<div class="share-screen">
	<!-- ═══ File summary ═══ -->
	<div class="file-summary">
		<span class="file-name">{bootstrap.file.name}</span>
		<span class="file-size">{formatSize(bootstrap.file.size)}</span>
		<span class="file-type-pill">{getFileExtension(bootstrap.file.name)}</span>
	</div>

	<!-- ═══ Share link ═══ -->
	<div class="link-section">
		<label for="transfer-link" class="section-label">{t("shareScreen.shareLink")}</label>
		<div class="link-row">
			<input
				id="transfer-link"
				type="text"
				readonly
				value={transferLink}
				class="link-input"
			/>
			<button onclick={copyToClipboard} class="copy-btn">
				{copied ? t("shareScreen.copied") : t("shareScreen.copy")}
			</button>
		</div>
		{#if copyError}
			<p class="copy-error">{copyError}</p>
		{/if}
		<button class="qr-toggle" onclick={() => (showQr = !showQr)}>
			{showQr ? t("shareScreen.hideQr") : t("shareScreen.showQr")}
		</button>
	</div>

	{#if showQr}
		<div class="qr-section">
			<QrCode value={transferLink} size={180} />
		</div>
	{/if}

	<!-- ═══ Waiting state ═══ -->
	<div class="waiting-state">
		<div class="waiting-indicator">
			<span class="pulse-dot"></span>
			<span>{t("shareScreen.waiting")}</span>
		</div>
		<p class="keep-open-note">
			<strong>{t("shareScreen.keepOpen")}</strong> {t("shareScreen.keepOpenDetail")}
		</p>
	</div>
</div>

<style>
	.share-screen {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* ── file summary ── */
	.file-summary {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.65rem 1rem;
		background: #fafafa;
		border: 1px solid #eee;
		border-radius: 12px;
		box-sizing: border-box;
		margin-bottom: 1.25rem;
	}

	.file-name {
		flex: 1;
		font-size: 0.9rem;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-size {
		flex-shrink: 0;
		font-size: 0.8rem;
		color: #999;
	}

	.file-type-pill {
		flex-shrink: 0;
		font-size: 0.7rem;
		font-weight: 600;
		color: #888;
		background: #e8e8e8;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		letter-spacing: 0.03em;
	}

	/* ── link section ── */
	.link-section {
		width: 100%;
		margin-bottom: 1rem;
	}

	.section-label {
		display: block;
		font-size: 0.85rem;
		color: #888;
		margin-bottom: 0.5rem;
	}

	.link-row {
		display: flex;
		gap: 0.5rem;
	}

	.link-input {
		flex: 1;
		padding: 0.6rem 0.8rem;
		font-family: monospace;
		font-size: 0.78rem;
		border: 2px solid #e0e0e0;
		border-radius: 10px;
		background: #fafafa;
		color: #444;
		outline: none;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}
	.link-input:focus {
		border-color: #c13b28;
	}

	.copy-btn {
		padding: 0.6rem 1.25rem;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		border: 2px solid #c13b28;
		border-radius: 999px;
		background: #fff;
		color: #c13b28;
		white-space: nowrap;
		transition: background 0.15s, color 0.15s;
	}
	.copy-btn:hover {
		background: #c13b28;
		color: #fff;
	}
	.copy-btn:active {
		background: #a83222;
	}

	.copy-error {
		font-size: 0.8rem;
		color: #c13b28;
		margin-top: 0.35rem;
	}

	.qr-toggle {
		margin-top: 0.6rem;
		padding: 0;
		border: none;
		background: none;
		color: #aaa;
		font-size: 0.82rem;
		font-family: inherit;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.15s;
	}
	.qr-toggle:hover {
		color: #666;
	}

	/* ── QR section ── */
	.qr-section {
		margin-bottom: 1.25rem;
		display: flex;
		justify-content: center;
	}

	/* ── waiting state ── */
	.waiting-state {
		width: 100%;
		padding: 1rem;
		border: 1px solid #eee;
		border-radius: 12px;
		background: #fafafa;
		text-align: center;
		box-sizing: border-box;
	}

	.waiting-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 0.6rem;
		font-size: 0.9rem;
		color: #666;
	}

	.pulse-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		background: #c13b28;
		border-radius: 50%;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.3;
			transform: scale(0.8);
		}
		50% {
			opacity: 1;
			transform: scale(1.2);
		}
	}

	.keep-open-note {
		font-size: 0.82rem;
		color: #999;
		margin: 0;
		line-height: 1.4;
	}
</style>
