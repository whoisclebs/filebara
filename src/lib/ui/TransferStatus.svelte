<script lang="ts">
	import { t } from "$lib/i18n/index.svelte.js";
	import { type TransferState } from "$lib/protocol/state.js";

	let {
		state,
		progress = 0,
		detail = "",
	}: {
		/** Current transfer state. */
		state: TransferState;
		/** Progress percentage (0-100). Used during transferring/verifying. */
		progress?: number;
		/** Optional extra detail shown below the label. */
		detail?: string;
	} = $props();

	function stateKey(s: TransferState): string {
		if (s === "awaiting-approval") return "awaitingApproval";
		return s;
	}

	let label = $derived(t("states." + stateKey(state)));
	let showSpinner = $derived(
		state === "preparing" ||
			state === "connecting" ||
			state === "validating" ||
			state === "awaiting-approval" ||
			state === "transferring" ||
			state === "verifying",
	);
	let isActive = $derived(state === "transferring" || state === "verifying");
	let isDone = $derived(state === "completed");
	let isError = $derived(state === "failed");
</script>

<div class="transfer-status" data-state={state} class:done={isDone} class:error={isError}>
	{#if showSpinner}
		<div class="spinner" aria-hidden="true"></div>
	{/if}

	<div class="status-row">
		<span class="status-dot" class:active={isActive} class:done={isDone} class:error={isError}></span>
		<span class="status-label">{label}</span>
	</div>

	{#if state === "transferring" && progress > 0}
		<div class="progress-track">
			<div
				class="progress-fill"
				style="width: {Math.min(progress, 100).toFixed(1)}%"
				role="progressbar"
				aria-valuenow={Math.round(progress)}
				aria-valuemin={0}
				aria-valuemax={100}
			></div>
		</div>
		<p class="progress-text">{Math.min(progress, 100).toFixed(0)}%</p>
	{/if}

	{#if state === "verifying"}
		<div class="progress-track indeterminate">
			<div class="progress-fill indeterminate"></div>
		</div>
	{/if}

	{#if detail}
		<p class="status-detail">{detail}</p>
	{/if}
</div>

<style>
	.transfer-status {
		width: 100%;
		padding: 0.85rem 1rem;
		border: 1px solid #e8e8e8;
		border-radius: 12px;
		background: #fafafa;
		box-sizing: border-box;
		text-align: center;
	}

	.transfer-status.done {
		border-color: #c8e0c8;
		background: #f2faf2;
	}

	.transfer-status.error {
		border-color: #e8d0d0;
		background: #fdf8f8;
	}

	.status-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.spinner {
		width: 24px;
		height: 24px;
		margin: 0 auto 0.7rem;
		border-radius: 50%;
		border: 2.5px solid #ead9d4;
		border-top-color: #b8432a;
		animation: spin 0.8s linear infinite;
	}

	.status-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ccc;
		flex-shrink: 0;
	}

	.status-dot.active {
		background: #b8432a;
		animation: pulse 1.5s ease-in-out infinite;
	}

	.status-dot.done {
		background: #2a9d5c;
	}

	.status-dot.error {
		background: #c13b28;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.3; transform: scale(0.8); }
		50% { opacity: 1; transform: scale(1.2); }
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.status-label {
		font-size: 0.88rem;
		font-weight: 600;
		color: #555;
	}

	.transfer-status.done .status-label {
		color: #2a7a4a;
	}

	.transfer-status.error .status-label {
		color: #c13b28;
	}

	/* ── progress bar ── */
	.progress-track {
		width: 100%;
		height: 6px;
		background: #e8e8e8;
		border-radius: 999px;
		margin-top: 0.7rem;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: #b8432a;
		border-radius: 999px;
		transition: width 0.3s ease;
	}

	.progress-track.indeterminate .progress-fill {
		width: 30%;
		animation: indeterminate 1.5s ease-in-out infinite;
	}

	@keyframes indeterminate {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(400%); }
	}

	.progress-text {
		font-size: 0.78rem;
		color: #999;
		margin: 0.35rem 0 0;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.status-detail {
		font-size: 0.8rem;
		color: #aaa;
		margin: 0.5rem 0 0;
		line-height: 1.4;
	}
</style>
