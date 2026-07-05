<script lang="ts">
	import { t } from "$lib/i18n/index.svelte.js";
	import {
		type FailureKind,
		FAILURE_RECOVERY,
	} from "$lib/protocol/state.js";

	let {
		kind,
		message,
		retryable,
		onRetry,
		onNewTransfer,
		actionLabel,
		onAction,
	}: {
		/** The classified failure category. */
		kind: FailureKind;
		/** Optional override message (shown as detail). Defaults to the standard description. */
		message?: string;
		/** Whether this failure is retryable within the current session. Overrides the built-in mapping if set. */
		retryable?: boolean;
		/** Optional callback for retry action. */
		onRetry?: () => void;
		/** Optional callback for starting a new transfer. */
		onNewTransfer?: () => void;
		/** Custom label for the primary action button (shown instead of "Start new transfer" when onNewTransfer is set). */
		actionLabel?: string;
		/** Custom callback for the primary action button (defaults to onNewTransfer when actionLabel is set). */
		onAction?: () => void;
	} = $props();

	function failureKey(k: FailureKind): string {
		return k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
	}

	let recovery = $derived(FAILURE_RECOVERY[kind]);
	let isRetryable = $derived(retryable ?? recovery.retryable);
	let key = $derived(failureKey(kind));
	let description = $derived(message ?? t("errors.descriptions." + key));
	let label = $derived(t("errors.labels." + key));
	let guidance = $derived(t("errors.guidance." + key));
</script>

<div class="failure-panel" data-kind={kind} class:retryable={isRetryable}>
	<div class="failure-header">
		<span class="failure-icon" aria-hidden="true">
			{#if isRetryable}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			{:else}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10" />
					<line x1="15" y1="9" x2="9" y2="15" />
					<line x1="9" y1="9" x2="15" y2="15" />
				</svg>
			{/if}
		</span>
		<span class="failure-label">{label}</span>
	</div>

	<p class="failure-description">{description}</p>

	<div class="recovery-banner">
		<p class="recovery-guidance">{guidance}</p>
	</div>

	{#if onRetry && isRetryable}
		<div class="failure-actions">
			<button class="btn-retry" onclick={onRetry}>
				{t("common.tryAgain")}
			</button>
			{#if actionLabel && onAction}
				<button class="btn-new-transfer" onclick={onAction}>
					{actionLabel}
				</button>
			{:else if onNewTransfer}
				<button class="btn-new-transfer" onclick={onNewTransfer}>
					{t("common.newTransfer")}
				</button>
			{/if}
		</div>
	{:else if actionLabel && onAction}
		<div class="failure-actions">
			<button class="btn-new-transfer" onclick={onAction}>
				{actionLabel}
			</button>
		</div>
	{:else if onNewTransfer}
		<div class="failure-actions">
			<button class="btn-new-transfer" onclick={onNewTransfer}>
				{t("common.startNewTransfer")}
			</button>
		</div>
	{/if}
</div>

<style>
	.failure-panel {
		width: 100%;
		padding: 1rem 1.1rem;
		border: 1px solid #e8d0d0;
		border-radius: 12px;
		background: #fdf8f8;
		box-sizing: border-box;
		text-align: left;
	}

	.failure-panel.retryable {
		border-color: #e8d8c0;
		background: #fffbf5;
	}

	.failure-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.failure-icon {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: #c13b28;
		color: #fff;
	}

	.failure-panel.retryable .failure-icon {
		background: #d48828;
	}

	.failure-label {
		font-size: 0.92rem;
		font-weight: 700;
		color: #c13b28;
	}

	.failure-panel.retryable .failure-label {
		color: #a0671e;
	}

	.failure-description {
		font-size: 0.84rem;
		color: #777;
		margin: 0 0 0.75rem;
		line-height: 1.5;
	}

	.recovery-banner {
		padding: 0.6rem 0.75rem;
		background: #fff;
		border: 1px solid #eee;
		border-radius: 8px;
		margin-bottom: 0.75rem;
	}

	.recovery-guidance {
		font-size: 0.8rem;
		color: #666;
		margin: 0;
		line-height: 1.45;
	}

	.failure-actions {
		display: flex;
		gap: 0.7rem;
		justify-content: center;
	}

	.btn-retry {
		padding: 0.55rem 1.5rem;
		border: none;
		border-radius: 999px;
		background: #b8432a;
		color: #fff;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-retry:hover {
		background: #a33a24;
	}

	.btn-new-transfer {
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
	.btn-new-transfer:hover {
		border-color: #bbb;
		color: #555;
	}
</style>
