<script lang="ts">
	import { t } from "$lib/i18n/index.svelte.js";
	import { onMount } from "svelte";
	import FilebaraFooter from "$lib/ui/FilebaraFooter.svelte";
	import PasswordInput from "$lib/ui/PasswordInput.svelte";
	import TransferStatus from "$lib/ui/TransferStatus.svelte";
	import ErrorMessage from "$lib/ui/ErrorMessage.svelte";
	import type { TransferLinkParams } from "$lib/protocol/link.js";
	import { ReceiverSession } from "$lib/session/receiverSession.js";
	import {
		classifyFailure,
		type FailureKind,
	} from "$lib/protocol/state.js";

	let password: string = $state("");
	let session = $state<ReceiverSession | null>(null);
	let linkParams: TransferLinkParams | null = $state(null);
	let linkError: string | undefined = $state();
	let passwordError: string | undefined = $state();

	// Protocol flow state
	let verificationCode: string | undefined = $state();
	let metadata: { filename: string; fileSize: number } | undefined = $state();
	let deniedReason: string | undefined = $state();
	let approvalCode: string | undefined = $state();

	// Classified failures
	let failureKind: FailureKind = $state("unknown");
	let failureDetail: string | undefined = $state();

	// Transfer progress
	let transferProgress = $state(0);

	// Download state
	let receivedBlob: Blob | undefined = $state();
	let receivedFilename: string | undefined = $state();
	let downloadUrl: string | undefined = $state();

	type Step =
		| "parsing"
		| "password"
		| "deriving"
		| "preparing-proof"
		| "generating-identity"
		| "connecting"
		| "awaiting-accept"
		| "awaiting-approval"
		| "approved"
		| "denied"
		| "transferring"
		| "verifying"
		| "completed"
		| "failed";
	let step: Step = $state("parsing");

	const MIN_PASSWORD_LENGTH = 4;

	onMount(() => {
		session = new ReceiverSession();
		const params = session.parseLink(window.location.href);
		if (params) {
			linkParams = params;
			step = "password";
		} else {
			linkError = t("errors.transferLinkInvalid");
			failureKind = "unknown";
			step = "failed";
		}
	});

	function validatePassword(pw: string): string | undefined {
		if (pw.length === 0) return undefined;
		if (pw.length < MIN_PASSWORD_LENGTH)
			return t("errors.passwordLength", { n: MIN_PASSWORD_LENGTH });
		return undefined;
	}

	function isPasswordValid(): boolean {
		return password.length >= MIN_PASSWORD_LENGTH;
	}

	$effect(() => {
		passwordError = validatePassword(password);
	});

	async function handleJoinTransfer() {
		if (!session || !linkParams || !isPasswordValid()) return;

		step = "deriving";
		failureKind = "unknown";
		failureDetail = undefined;
		deniedReason = undefined;
		approvalCode = undefined;

		try {
			// 1. Derive auth key
			session.startWorker();
			const authKey = await session.deriveAuthKey(password);
			step = "preparing-proof";

			// 2. Compute password proof
			const proof = await session.computeProof(authKey);
			step = "generating-identity";

			// 3. Generate ephemeral receiver identity
			await session.generateIdentity();

			// Compute verification code now so both sides can compare before/during approval
			if (session) {
				verificationCode = await session.computeVerificationCode();
			}

			step = "connecting";

			// 4. Connect to sender and run full auth + approval protocol
			const result = await session.requestApproval(proof, linkParams.fileId);

			// 5. Handle result
			if (result.status === "approved") {
				step = "approved";
				approvalCode = result.message;

				// Store metadata if available
				if (session.metadata) {
					metadata = {
						filename: session.metadata.filename,
						fileSize: session.metadata.fileSize,
					};
				}

				// Begin receiving the file
				startFileReceipt();
			} else {
				step = "denied";
				failureKind = "denied";
				failureDetail = result.message ?? t("receiver.errorDenied");
				deniedReason = result.message ?? t("receiver.errorDenied");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t("receiver.errorSetup");
			step = "failed";

			// Classify the failure based on context
			if (
				msg.toLowerCase().includes("incorrect password") ||
				msg.toLowerCase().includes("invalid proof") ||
				msg.toLowerCase().includes("auth rejected")
			) {
				failureKind = "wrong-password";
			} else if (
				msg.toLowerCase().includes("denied") ||
				msg.toLowerCase().includes("rejected")
			) {
				failureKind = "denied";
			} else if (
				msg.toLowerCase().includes("timed out") ||
				msg.toLowerCase().includes("connection closed") ||
				msg.toLowerCase().includes("peer")
			) {
				failureKind = "sender-offline";
			} else {
				failureKind = classifyFailure(msg);
			}
			failureDetail = msg;
		}
	}

	async function startFileReceipt() {
		if (!session) return;

		step = "transferring";
		failureKind = "unknown";
		failureDetail = undefined;

		// Poll for progress during file receive
		const progressInterval = setInterval(() => {
			if (!session) {
				clearInterval(progressInterval);
				return;
			}
			const sessionState = session.state;
			if (sessionState === "transferring") {
				const total = session.totalChunks;
				const received = session.receivedChunksCount;
				if (total > 0) {
					transferProgress = (received / total) * 100;
				}
			}
		}, 300);

		const result = await session.receiveFile();

		clearInterval(progressInterval);

		if (result.status === "ok") {
			if (!result.blob) {
				// Defensive: blob should always be present with status "ok",
				// but guard to avoid showing 100% with no download.
				failureKind = "unknown";
				failureDetail = t("receiver.errorNoBlob");
				step = "failed";
			} else {
				step = "completed";
				transferProgress = 100;
				receivedBlob = result.blob;
				receivedFilename = metadata?.filename ?? "downloaded-file";
				downloadUrl = URL.createObjectURL(result.blob);
			}
		} else {
			const msg = result.error ?? t("receiver.errorFailed");
			failureKind =
				result.status === "integrity-failed" ? "integrity-failed" : classifyFailure(msg);
			failureDetail = msg;
			step = "failed";
		}
	}

	function handleRetry() {
		password = "";
		failureKind = "unknown";
		failureDetail = undefined;
		deniedReason = undefined;
		approvalCode = undefined;
		step = "password";
	}

	function handleDownload() {
		// Download is handled via the URL blob link
	}

	function handleCancel() {
		session?.destroy();
		session = null;
		window.location.href = "/";
	}

	function formatFileId(id: string): string {
		if (id.length <= 12) return id;
		return id.slice(0, 6) + "…" + id.slice(-4);
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<svelte:head>
	<title>Receive file — Filebara</title>
</svelte:head>

<div class="page-wrap">
	<main class="central-column">
		<div class="content-stack">
			<img
				src="/filebara.png"
				alt="Filebara capybara mascot"
				width="160"
				height="160"
				class="mascot-img"
			/>

			<!-- ═══ BRAND HEADER ═══ -->
			<h1 class="wordmark">Filebara</h1>
			<p class="tagline">{t("common.tagline")}</p>

			<!-- ═══ PARSING ═══ -->
			{#if step === "parsing"}
				<div class="flow-section">
					<TransferStatus state="preparing" />
				</div>

			<!-- ═══ PASSWORD ENTRY ═══ -->
			{:else if step === "password" && linkParams}
				<div class="flow-section">
					<p class="receive-heading">{t("receiver.heading")}</p>
					<p class="session-info">
						{t("receiver.session")}: <span class="file-id">{formatFileId(linkParams.fileId)}</span>
					</p>
					<p class="instructions">
						{t("receiver.enterPassword")}
					</p>

					<div class="password-section">
						<label class="password-label" for="receiver-password">{t("common.password")}</label>
						<PasswordInput bind:value={password} inputId="receiver-password" />
					</div>

					{#if passwordError}
						<p class="field-error">{passwordError}</p>
					{/if}

					<div class="action-row">
						<button
							class="btn-join"
							disabled={!isPasswordValid()}
							onclick={handleJoinTransfer}
						>
							{t("receiver.join")}
						</button>
					</div>
				</div>

			<!-- ═══ DERIVING ═══ -->
			{:else if step === "deriving"}
				<div class="flow-section">
					<TransferStatus state="validating" />
					<p class="status-note">{t("receiver.preparing")}</p>
				</div>

			<!-- ═══ PREPARING PROOF ═══ -->
			{:else if step === "preparing-proof"}
				<div class="flow-section">
					<TransferStatus state="validating" />
					<p class="status-note">{t("receiver.proof")}</p>
				</div>

			<!-- ═══ GENERATING IDENTITY ═══ -->
			{:else if step === "generating-identity"}
				<div class="flow-section">
					<TransferStatus state="connecting" />
					<p class="status-note">{t("receiver.identity")}</p>
				</div>

			<!-- ═══ CONNECTING / AWAITING ═══ -->
			{:else if step === "connecting" || step === "awaiting-accept" || step === "awaiting-approval"}
				<div class="flow-section">
					<div class="awaiting-card">
						<div class="spinner" aria-hidden="true"></div>
						<p class="awaiting-label">{t("receiver.awaiting")}</p>
						{#if verificationCode}
							<div class="info-row">
								<span class="info-label">{t("approval.code")}</span>
								<span class="verification-code">{verificationCode}</span>
							</div>
							<p class="verification-hint">
								{t("approval.hint")}
							</p>
						{/if}
						<p class="status-note">{t("receiver.connecting")}</p>
					</div>
					<button class="btn-cancel" onclick={handleCancel} style="margin-top:1.25rem">{t("common.cancel")}</button>
				</div>

			<!-- ═══ APPROVED (transitioning to transfer) ═══ -->
			{:else if step === "approved"}
				<div class="flow-section">
					<div class="success-card">
						<p class="success-icon">✓</p>
						<p class="success-title">{t("receiver.approved")}</p>
						{#if metadata}
							<p class="metadata-row">
								<span class="meta-label">{t("common.file")}:</span> {metadata.filename}
							</p>
							<p class="metadata-row">
								<span class="meta-label">{t("common.size")}:</span> {formatSize(metadata.fileSize)}
							</p>
						{/if}
					{#if verificationCode}
						<div class="info-card" style="width:100%; margin-bottom:1rem">
							<div class="info-row">
								<span class="info-label">{t("approval.code")}</span>
								<span class="verification-code">{verificationCode}</span>
							</div>
							<p class="verification-hint">{t("approval.verified")}</p>
						</div>
					{/if}
						{#if approvalCode}
							<p class="approved-note">{approvalCode}</p>
						{/if}
						<p class="status-note" style="margin-top:0.75rem">{t("receiver.receiving")}</p>
					</div>
				</div>

			<!-- ═══ TRANSFERRING ═══ -->
			{:else if step === "transferring"}
				<div class="flow-section">
					<TransferStatus state="transferring" progress={transferProgress} detail={t("receiver.receivingChunks")} />
					<button class="btn-cancel" onclick={handleCancel} style="margin-top:1.25rem">{t("common.cancel")}</button>
				</div>

			<!-- ═══ VERIFYING ═══ -->
			{:else if step === "verifying"}
				<div class="flow-section">
					<TransferStatus state="verifying" progress={100} detail={t("receiver.verifying")} />
					<button class="btn-cancel" onclick={handleCancel} style="margin-top:1.25rem">{t("common.cancel")}</button>
				</div>

			<!-- ═══ COMPLETED ═══ -->
			{:else if step === "completed"}
				<div class="flow-section">
					<div class="success-card completed-card">
						<p class="success-icon completed-icon">✓</p>
						<p class="success-title">{t("receiver.completed")}</p>
						{#if metadata}
							<p class="metadata-row">
								<span class="meta-label">{t("common.file")}:</span> {metadata.filename}
							</p>
							<p class="metadata-row">
								<span class="meta-label">{t("common.size")}:</span> {formatSize(metadata.fileSize)}
							</p>
						{/if}
						{#if downloadUrl}
							<div class="download-section">
								<a
									href={downloadUrl}
									download={receivedFilename}
									class="btn-download"
									onclick={handleDownload}
								>
									{t("receiver.download")}
								</a>
							</div>
						{/if}
					</div>
				</div>

			<!-- ═══ DENIED ═══ -->
			{:else if step === "denied"}
				<div class="flow-section error-section">
					<ErrorMessage
						kind="denied"
						message={deniedReason}
					/>
				</div>

			<!-- ═══ FAILED ═══ -->
			{:else if step === "failed"}
				<div class="flow-section error-section">
					{#if linkError}
						<div class="inline-error">
							<p class="error-heading">{t("receiver.unableToReceive")}</p>
							<p class="error-message">{linkError}</p>
						</div>
					{:else if failureKind === "wrong-password" || failureKind === "connection-failed"}
						<ErrorMessage
							kind={failureKind}
							message={failureDetail}
							onRetry={handleRetry}
						/>
					{:else}
						<ErrorMessage
							kind={failureKind}
							message={failureDetail}
						/>
					{/if}
				</div>
			{/if}
		</div>
	</main>

	<!-- ═══ FOOTER ═══ -->
	<FilebaraFooter />
</div>

<style>
	/* ── mascot image ── */
	.mascot-img {
		display: block;
		margin: 0 auto;
		width: clamp(110px, 16vh, 160px);
		height: auto;
	}

	/* ── page wrapper ── */
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
		align-items: center;
		justify-content: center;
		font-family: system-ui, -apple-system, sans-serif;
		box-sizing: border-box;
	}

	.content-stack {
		max-width: 440px;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
		padding: 0.6rem 1.5rem;
		box-sizing: border-box;
	}

	/* ── wordmark ── */
	.wordmark {
		margin: 0.35rem 0 0.15rem;
		font-size: 2.6rem;
		font-weight: 800;
		font-family: "Playfair Display", Georgia, serif;
		font-style: italic;
		letter-spacing: -0.01em;
		color: #b8432a;
		text-align: center;
		line-height: 1.1;
	}

	.tagline {
		margin: 0 0 1rem;
		font-size: 0.88rem;
		color: #777;
		text-align: center;
		font-weight: 400;
	}

	/* ── flow sections ── */
	.flow-section {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.error-section {
		margin-top: 0.5rem;
	}

	/* ── receive heading ── */
	.receive-heading {
		margin: 0 0 0.5rem;
		font-size: 1.05rem;
		font-weight: 600;
		color: #333;
		text-align: center;
	}

	.session-info {
		margin: 0 0 0.75rem;
		font-size: 0.82rem;
		color: #999;
		text-align: center;
	}

	.file-id {
		font-family: ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono",
			Menlo, monospace;
		background: #f5f5f5;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		color: #666;
	}

	.instructions {
		margin: 0 0 1rem;
		font-size: 0.85rem;
		color: #888;
		text-align: center;
		line-height: 1.4;
	}

	/* ── password section ── */
	.password-section {
		width: 100%;
		margin-bottom: 0.15rem;
	}

	.password-label {
		display: block;
		font-size: 0.78rem;
		font-weight: 600;
		color: #555;
		margin-bottom: 0.4rem;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	/* ── errors ── */
	.field-error {
		color: #c13b28;
		font-size: 0.78rem;
		margin: 0.2rem 0 0.4rem;
		width: 100%;
		text-align: left;
	}

	.inline-error {
		width: 100%;
		text-align: center;
	}

	.error-heading {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		color: #c13b28;
		text-align: center;
	}

	.error-message {
		margin: 0;
		font-size: 0.88rem;
		color: #888;
		text-align: center;
		line-height: 1.4;
	}

	/* ── action row ── */
	.action-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.85rem;
		margin-top: 0.75rem;
		width: 100%;
	}

	.btn-join {
		padding: 0.6rem 2.25rem;
		border: none;
		border-radius: 999px;
		background: #b8432a;
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, opacity 0.15s;
	}
	.btn-join:hover {
		background: #a33a24;
	}
	.btn-join:disabled {
		opacity: 0.35;
		cursor: default;
		background: #b8432a;
	}

	/* ── status notes ── */
	.status-note {
		color: #999;
		font-size: 0.85rem;
		margin-top: 0.75rem;
	}

	/* ── success / completed cards ── */
	.success-card {
		width: 100%;
		padding: 1.25rem;
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		background: #fafafa;
		text-align: center;
		box-sizing: border-box;
	}

	.completed-card {
		border-color: #c8e0c8;
		background: #f2faf2;
	}

	.success-icon {
		font-size: 2rem;
		color: #2a9d5c;
		margin: 0 0 0.5rem;
		font-weight: 700;
	}

	.success-title {
		font-size: 1rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 0.6rem;
	}

	.metadata-row {
		font-size: 0.82rem;
		color: #888;
		margin: 0.25rem 0;
		line-height: 1.4;
	}

	.meta-label {
		font-weight: 600;
		color: #666;
	}

	.verification-code {
		font-family: ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono",
			Menlo, monospace;
		font-size: 1.4rem;
		font-weight: 700;
		color: #b8432a;
		letter-spacing: 0.15em;
		background: #fff;
		padding: 0.3rem 0.8rem;
		border-radius: 8px;
		border: 1px solid #e8e8e8;
		margin: 0;
	}

	/* ── awaiting-approval unified card ── */
	.awaiting-card {
		width: 100%;
		padding: 1.25rem 1rem;
		border: 1px solid #e8e8e8;
		border-radius: 12px;
		background: #fafafa;
		box-sizing: border-box;
		text-align: center;
	}

	.awaiting-card .spinner {
		width: 24px;
		height: 24px;
		margin: 0 auto 0.7rem;
		border-radius: 50%;
		border: 2.5px solid #ead9d4;
		border-top-color: #b8432a;
		animation: awaiting-spin 0.8s linear infinite;
	}

	.awaiting-label {
		font-size: 0.88rem;
		font-weight: 600;
		color: #555;
		margin: 0 0 0.75rem;
	}

	.awaiting-card .info-row {
		margin: 0.5rem 0;
	}

	.awaiting-card .status-note {
		margin-top: 0.75rem;
	}

	@keyframes awaiting-spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.info-card {
		width: 100%;
		padding: 1rem;
		border: 1px solid #eee;
		border-radius: 12px;
		background: #fafafa;
		box-sizing: border-box;
		margin-bottom: 1.25rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0;
	}

	.info-label {
		font-size: 0.82rem;
		color: #888;
		font-weight: 500;
	}

	.verification-hint {
		font-size: 0.78rem;
		color: #aaa;
		margin: 0.5rem 0 0;
		line-height: 1.4;
		text-align: center;
	}

	.approved-note {
		font-size: 0.82rem;
		color: #888;
		margin: 0.75rem 0 0;
		line-height: 1.4;
	}

	/* ── download section ── */
	.download-section {
		margin: 1rem 0;
	}

	.btn-download {
		display: inline-block;
		padding: 0.7rem 2rem;
		border: none;
		border-radius: 999px;
		background: #2a9d5c;
		color: #fff;
		font-size: 0.95rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s;
	}
	.btn-download:hover {
		background: #238b4f;
	}

	.btn-cancel {
		padding: 0.55rem 1.5rem;
		border: 1.5px solid #d5d5d5;
		border-radius: 999px;
		background: #fff;
		color: #888;
		font-size: 0.85rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}
	.btn-cancel:hover {
		border-color: #c13b28;
		color: #c13b28;
	}

</style>
