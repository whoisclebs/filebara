<script lang="ts">
	import { t } from "$lib/i18n/index.svelte.js";
	import FilebaraFooter from "$lib/ui/FilebaraFooter.svelte";
	import FileSelector from "$lib/ui/FileSelector.svelte";
	import PasswordInput from "$lib/ui/PasswordInput.svelte";
	import TransferStatus from "$lib/ui/TransferStatus.svelte";
	import ShareScreen from "$lib/ui/ShareScreen.svelte";
	import ApprovalPanel from "$lib/ui/ApprovalPanel.svelte";
	import ErrorMessage from "$lib/ui/ErrorMessage.svelte";

	import { transferBootstrap, SenderSession } from "$lib/session/senderSession.js";
	import type { TransferBootstrap, ApprovalRequestInfo } from "$lib/session/senderSession.js";
	import { classifyFailure, type FailureKind } from "$lib/protocol/state.js";

	// ── Form state ──
	let file: File | null = $state(null);
	let password: string = $state("");
	let passwordError: string | undefined = $state();

	// ── Sender flow ──
	type SenderStep =
		| "idle"
		| "bootstrapping"
		| "share-ready"
		| "listening"
		| "pending-approval"
		| "approved"
		| "transferring"
		| "verifying"
		| "completed"
		| "failed";
	let step: SenderStep = $state("idle");
	let bootstrap: TransferBootstrap | undefined = $state();
	let transferLink: string = $state("");
	let bootstrapError: string | undefined = $state();

	// Session
	let senderSession: SenderSession | undefined = $state();
	let approvalRequest: ApprovalRequestInfo | null | undefined = $state();
	let approveDisabled = $state(false);
	let approvalResult: string | undefined = $state();

	// Classified failures
	let failureKind: FailureKind = $state("unknown");
	let failureDetail: string | undefined = $state();

	// Transfer progress
	let transferProgress = $state(0);

	// Derived: whether the user has selected a file within the idle step
	let fileSelected = $derived(!!file);

	const MIN_PASSWORD_LENGTH = 4;

	function validatePassword(pw: string): string | undefined {
		if (pw.length === 0) return undefined;
		if (pw.length < MIN_PASSWORD_LENGTH)
			return t("errors.passwordLength", { n: MIN_PASSWORD_LENGTH });
		return undefined;
	}

	function isPasswordValid(): boolean {
		return password.length >= MIN_PASSWORD_LENGTH;
	}

	function isFormValid(): boolean {
		return !!file && isPasswordValid();
	}

	$effect(() => {
		passwordError = validatePassword(password);
	});

	function handleCancel() {
		cleanupTransfer();
	}

	function cleanupTransfer() {
		file = null;
		password = "";
		passwordError = undefined;
		bootstrapError = undefined;
		failureKind = "unknown";
		failureDetail = undefined;
		approvalRequest = null;
		approvalResult = undefined;
		transferProgress = 0;
		senderSession?.destroy();
		senderSession = undefined;
		step = "idle";
	}

	async function handleStartTransfer() {
		if (!file || !isPasswordValid()) return;

		step = "bootstrapping";
		bootstrapError = undefined;
		failureKind = "unknown";
		failureDetail = undefined;

		try {
			const result = await transferBootstrap(file);
			bootstrap = result;
			transferLink = `${window.location.origin}${result.link}`;

			// Create the sender session and show the share-ready screen first.
			// The receiver cannot connect until the link exists and is shared.
			senderSession = new SenderSession(result, password);
			step = "share-ready";

			// Start listening in the background without replacing the share screen.
			void startListening();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t("sender.errorBootstrap");
			bootstrapError = msg;
			failureKind = classifyFailure(msg);
			failureDetail = msg;
			step = "failed";
		}
	}

	async function startListening() {
		if (!senderSession) return;

		try {
			await senderSession.startListening();

			// Poll for state changes — SenderSession uses state transitions
			const checkState = setInterval(() => {
				if (!senderSession) {
					clearInterval(checkState);
					return;
				}

				const state = senderSession.state;
				if (state === "pending-approval") {
					approvalRequest = senderSession.pendingApproval;
					step = "pending-approval";
				} else if (state === "approved") {
					approvalResult = t("sender.approving");
					step = "approved";
					clearInterval(checkState);
					// Begin file transfer immediately
					startFileTransfer();
				} else if (state === "denied") {
					failureKind = "denied";
					failureDetail = senderSession.error ?? t("sender.errorDeny");
					step = "failed";
					clearInterval(checkState);
				} else if (state === "failed") {
					const errMsg = senderSession.error ?? t("sender.errorTransfer");
					failureKind = classifyFailure(errMsg);
					failureDetail = errMsg;
					step = "failed";
					clearInterval(checkState);
				}
			}, 200);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t("sender.errorListening");
			failureKind = classifyFailure(msg, {});
			failureDetail = msg;
			step = "failed";
		}
	}

	async function startFileTransfer() {
		if (!senderSession) return;

		step = "transferring";
		failureKind = "unknown";
		failureDetail = undefined;

		// Start polling for transfer progress
		const progressInterval = setInterval(() => {
			if (!senderSession) {
				clearInterval(progressInterval);
				return;
			}
			const sessionState = senderSession.state;
			const total = senderSession.totalChunks;
			const current = senderSession.currentChunkIndex;

			if (sessionState === "transferring" && total > 0) {
				transferProgress = (current / total) * 100;
				step = "transferring";
			} else if (sessionState === "verifying") {
				step = "verifying";
				transferProgress = 100;
			} else if (sessionState === "completed") {
				transferProgress = 100;
				step = "completed";
				clearInterval(progressInterval);
			} else if (sessionState === "failed") {
				const errMsg = senderSession.error ?? t("sender.errorTransfer");
				failureKind = classifyFailure(errMsg, {});
				failureDetail = errMsg;
				step = "failed";
				clearInterval(progressInterval);
			}
		}, 300);

		// Launch the async send — check result explicitly
		try {
			await senderSession.sendFile();
		} catch (err: unknown) {
			// sendFile() now transitions to failed state internally, but
			// a synchronous/early throw before the try block could reach here.
			const errMsg = err instanceof Error ? err.message : t("sender.errorTransfer");
			failureKind = classifyFailure(errMsg, {});
			failureDetail = errMsg;
			step = "failed";
			clearInterval(progressInterval);
		}
	}

	async function handleApprove() {
		if (!senderSession) return;
		approveDisabled = true;
		try {
			await senderSession.approveReceiver();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t("sender.errorApprove");
			failureKind = classifyFailure(msg, {});
			failureDetail = msg;
			step = "failed";
		} finally {
			approveDisabled = false;
		}
	}

	async function handleDeny() {
		if (!senderSession) return;
		approveDisabled = true;
		try {
			await senderSession.denyReceiver();
			failureKind = "denied";
			failureDetail = t("sender.errorDeny");
			step = "failed";
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t("sender.errorDeny");
			failureKind = classifyFailure(msg, {});
			failureDetail = msg;
			step = "failed";
		} finally {
			approveDisabled = false;
		}
	}

	function handleRemoveFile() {
		file = null;
	}

	function handleAddMoreFiles() {
		file = null;
	}

	function handleRetry() {
		// For retryable errors, go back to idle
		cleanupTransfer();
	}

	function handleNewTransfer() {
		cleanupTransfer();
	}

	function getFileExtension(name: string): string {
		const i = name.lastIndexOf(".");
		return i > 0 ? name.slice(i + 1).toUpperCase() : "FILE";
	}

	function getFileIcon(name: string): string {
		const ext = name.lastIndexOf(".") > 0 ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
		const icons: Record<string, string> = {
			pdf: "📄",
			zip: "📦",
			gz: "📦",
			tar: "📦",
			rar: "📦",
			doc: "📝",
			docx: "📝",
			xls: "📊",
			xlsx: "📊",
			ppt: "📽️",
			pptx: "📽️",
			jpg: "🖼️",
			jpeg: "🖼️",
			png: "🖼️",
			gif: "🖼️",
			mp4: "🎬",
			mov: "🎬",
			mp3: "🎵",
			wav: "🎵",
		};
		return icons[ext] || "📎";
	}
</script>

<svelte:head>
	<title>Filebara — direct file sharing</title>
</svelte:head>

<div class="page-wrap">
	<main class="central-column">
		<div class="content-stack">
			<img src="/filebara.png" alt="Filebara capybara mascot" width="160" height="160" class="mascot-img" />

			<!-- ═══ BRAND HEADER ═══ -->
			<h1 class="wordmark">Filebara</h1>
			<p class="tagline">{t("common.tagline")}</p>

			<!-- ═══ IDLE: initial + file-selected ═══ -->
			{#if step === "idle"}
				<div class="flow-section">
				{#if !fileSelected}
					<!-- ── Initial screen: drop file ── -->
					<div class="drop-area">
						<FileSelector bind:value={file} />
					</div>
					<p class="terms-note">
						{t("common.termsNote")}
					</p>
				{:else}
					<!-- ── File-selected screen ── -->
					<p class="file-count">{t("sender.aboutToUpload")} <button class="add-more-files" onclick={handleAddMoreFiles}>{t("sender.addMoreFiles")}</button></p>

					<div class="file-row">
						<span class="file-icon">{getFileIcon(file!.name)}</span>
						<span class="file-name">{file!.name}</span>
						<span class="file-type-pill">{getFileExtension(file!.name)}</span>
						<button class="file-remove" onclick={handleRemoveFile} aria-label={t("common.removeFile")}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>

					<div class="password-section">
						<label class="password-label" for="transfer-password">{t("common.password")}</label>
						<PasswordInput bind:value={password} inputId="transfer-password" />
					</div>

					{#if passwordError}
						<p class="field-error">{passwordError}</p>
					{/if}

					{#if bootstrapError}
						<p class="field-error bootstrap-error">{bootstrapError}</p>
					{/if}

					<div class="action-row">
						<button class="btn-cancel" onclick={handleCancel}>{t("common.cancel")}</button>
						<button
							class="btn-start"
							disabled={!isFormValid()}
							onclick={handleStartTransfer}
						>
							{t("common.start")}
						</button>
					</div>
				{/if}
				</div>

			{:else if step === "bootstrapping"}
				<!-- ═══ BOOTSTRAPPING ═══ -->
				<div class="flow-section">
					<TransferStatus state="preparing" />
					<p class="status-note">{t("sender.bootstrap")}</p>
				</div>

		{:else if step === "share-ready" && bootstrap}
			<!-- ═══ SHARE-READY (with listening indicator) ═══ -->
			<ShareScreen {bootstrap} {transferLink} />
			<div class="flow-section" style="margin-top:1rem">
				<button class="btn-cancel" onclick={handleCancel}>{t("common.cancel")}</button>
			</div>

		{:else if step === "listening"}
			<!-- ═══ LISTENING FOR RECEIVER ═══ -->
			<div class="flow-section">
				<TransferStatus state="connecting" />
				<p class="status-note">{t("sender.listening")}</p>
				<button class="btn-cancel" onclick={handleCancel} style="margin-top:1.25rem">{t("common.cancel")}</button>
			</div>

		{:else if step === "pending-approval" && approvalRequest}
			<!-- ═══ APPROVAL PANEL ═══ -->
			<div class="flow-section">
				<ApprovalPanel
					pendingApproval={approvalRequest}
					onApprove={handleApprove}
					onDeny={handleDeny}
					disabled={approveDisabled}
				/>
			</div>

			{:else if step === "approved"}
				<!-- ═══ APPROVED (transitioning to transfer) ═══ -->
				<div class="flow-section">
					<div class="success-card">
						<p class="success-icon">✓</p>
						<p class="success-title">{t("sender.approved")}</p>
						<p class="success-desc">{approvalResult ?? t("sender.approving")}</p>
					</div>
				</div>

			{:else if step === "transferring"}
				<!-- ═══ TRANSFERRING ═══ -->
				<div class="flow-section">
					<TransferStatus state="transferring" progress={transferProgress} />
					<button class="btn-cancel" onclick={handleCancel} style="margin-top:1.25rem">{t("common.cancel")}</button>
				</div>

			{:else if step === "verifying"}
				<!-- ═══ VERIFYING ═══ -->
				<div class="flow-section">
					<TransferStatus state="verifying" progress={100} detail={t("sender.verifying")} />
					<button class="btn-cancel" onclick={handleCancel} style="margin-top:1.25rem">{t("common.cancel")}</button>
				</div>

			{:else if step === "completed"}
				<!-- ═══ COMPLETED ═══ -->
				<div class="flow-section">
					<div class="success-card completed-card">
						<p class="success-icon completed-icon">✓</p>
						<p class="success-title">{t("sender.completed")}</p>
						<p class="success-desc">{t("sender.completedDesc")}</p>
						<button class="btn-new-send" onclick={handleNewTransfer}>
							{t("common.sendAnotherFile")}
						</button>
					</div>
				</div>

			{:else if step === "failed"}
				<!-- ═══ FAILED ═══ -->
				<div class="flow-section error-section">
					{#if bootstrapError}
						<p class="field-error bootstrap-error" style="text-align:center">{bootstrapError}</p>
					{:else}
						<ErrorMessage
							kind={failureKind}
							message={failureDetail}
							onRetry={handleRetry}
							onNewTransfer={handleNewTransfer}
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

	.drop-area {
		display: flex;
		justify-content: center;
	}

	.terms-note {
		margin: 0.5rem 0 0;
		font-size: 0.72rem;
		color: #bbb;
		text-align: center;
		max-width: 320px;
		line-height: 1.45;
	}

	/* ── file-selected subview ── */
	.file-count {
		margin: 0 0 0.65rem;
		font-size: 0.88rem;
		color: #555;
		text-align: center;
		width: 100%;
		line-height: 1.4;
	}

	.add-more-files {
		display: inline;
		padding: 0;
		border: none;
		background: none;
		color: #b8432a;
		font-size: inherit;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-thickness: 1px;
		text-decoration-color: #ddd;
		transition: text-decoration-color 0.15s;
	}
	.add-more-files:hover {
		text-decoration-color: #b8432a;
	}

	.file-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.55rem 0.75rem 0.55rem 0.6rem;
		background: #fff;
		border: 1px solid #e8e8e8;
		border-radius: 10px;
		box-sizing: border-box;
		margin-bottom: 0.65rem;
	}

	.file-icon {
		flex-shrink: 0;
		font-size: 1.15rem;
		line-height: 1;
		display: inline-flex;
		align-items: center;
	}

	.file-name {
		flex: 1;
		font-size: 0.88rem;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-type-pill {
		flex-shrink: 0;
		font-size: 0.65rem;
		font-weight: 600;
		color: #999;
		background: #f0f0f0;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.file-remove {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: #ccc;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		padding: 0;
		margin-left: 0.25rem;
	}
	.file-remove:hover {
		background: #f5f5f5;
		color: #888;
	}

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
	.bootstrap-error {
		margin-top: 0.25rem;
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

	.btn-cancel {
		padding: 0.6rem 1.75rem;
		border: 1.5px solid #d5d5d5;
		border-radius: 999px;
		background: #fff;
		color: #888;
		font-size: 0.88rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}
	.btn-cancel:hover {
		border-color: #bbb;
		color: #555;
	}

	.btn-start {
		padding: 0.6rem 2.25rem;
		border: none;
		border-radius: 999px;
		background: #2a9d5c;
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, opacity 0.15s;
	}
	.btn-start:hover {
		background: #238b4f;
	}
	.btn-start:disabled {
		opacity: 0.35;
		cursor: default;
		background: #2a9d5c;
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
		margin: 0 0 0.4rem;
	}

	.success-desc {
		font-size: 0.85rem;
		color: #888;
		margin: 0 0 0.75rem;
		line-height: 1.4;
	}

	.btn-new-send {
		padding: 0.55rem 1.5rem;
		border: 1.5px solid #2a9d5c;
		border-radius: 999px;
		background: #fff;
		color: #2a9d5c;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}
	.btn-new-send:hover {
		background: #2a9d5c;
		color: #fff;
	}
</style>
