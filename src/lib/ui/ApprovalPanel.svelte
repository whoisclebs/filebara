<script lang="ts">
	import { t } from "$lib/i18n/index.svelte.js";
	import type { ApprovalRequestInfo } from "$lib/session/senderSession.js";

	let {
		pendingApproval,
		onApprove,
		onDeny,
		disabled = false,
	}: {
		pendingApproval: ApprovalRequestInfo;
		onApprove: () => void;
		onDeny: () => void;
		disabled?: boolean;
	} = $props();
</script>

<div class="approval-panel">
	<h2 class="panel-title">{t("approval.title")}</h2>

	<div class="info-card">
		<div class="info-row">
			<span class="info-label">{t("approval.code")}</span>
			<span class="verification-code">{pendingApproval.verificationCode}</span>
		</div>

		<p class="verification-hint">
			{t("approval.hint")}
		</p>

		<div class="info-row">
			<span class="info-label">{t("approval.fingerprint")}</span>
			<span class="fingerprint">{pendingApproval.receiverFingerprint.slice(0, 16)}…</span>
		</div>
	</div>

	<div class="action-row">
		<button
			class="btn-deny"
			disabled={disabled}
			onclick={onDeny}
		>
			{t("approval.deny")}
		</button>
		<button
			class="btn-approve"
			disabled={disabled}
			onclick={onApprove}
		>
			{t("approval.approve")}
		</button>
	</div>
</div>

<style>
	.approval-panel {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.panel-title {
		margin: 0 0 1rem;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
		text-align: center;
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
	}

	.verification-hint {
		font-size: 0.78rem;
		color: #aaa;
		margin: 0.5rem 0 0;
		line-height: 1.4;
		text-align: center;
	}

	.fingerprint {
		font-family: ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono",
			Menlo, monospace;
		font-size: 0.78rem;
		color: #999;
		background: #f0f0f0;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
	}

	.action-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.85rem;
		width: 100%;
	}

	.btn-deny {
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
	.btn-deny:hover {
		border-color: #c13b28;
		color: #c13b28;
	}
	.btn-deny:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.btn-approve {
		padding: 0.6rem 2rem;
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
	.btn-approve:hover {
		background: #238b4f;
	}
	.btn-approve:disabled {
		opacity: 0.4;
		cursor: default;
		background: #2a9d5c;
	}
</style>
