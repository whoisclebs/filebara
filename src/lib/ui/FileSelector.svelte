<script lang="ts">
	import { t } from "$lib/i18n/index.svelte.js";

	let { value = $bindable(null) }: { value?: File | null } = $props();

	let isDragOver = $state(false);

	function onFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		if (file) {
			value = file;
		}
		// Reset so the same file can be re-selected
		input.value = "";
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragOver = true;
	}

	function onDragLeave() {
		isDragOver = false;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragOver = false;
		const file = event.dataTransfer?.files?.[0] ?? null;
		if (file) {
			value = file;
		}
	}
</script>

<!--
	Click-to-upload and drag-and-drop are handled by the same element.
	The native <input type="file"> is visually hidden (sr-only) but still
	focusable and accessible. The <label> wraps the visible zone so clicking
	it opens the file picker natively and reliably.
-->
<div
	class="file-selector-shell"
	class:dragover={isDragOver}
	role="button"
	tabindex="-1"
>
	<!-- svelte-ignore a11y_label_has_associated_control -->
	<label
		class="file-selector"
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
	>
		<input
			type="file"
			accept="*/*"
			onchange={onFileChange}
			class="sr-only"
			aria-label={t("fileSelector.dropFile")}
		/>
		<svg
			class="upload-icon"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="17 8 12 3 7 8" />
			<line x1="12" y1="3" x2="12" y2="15" />
		</svg>
		{t("fileSelector.dropFile")}
	</label>
</div>

<style>
	.file-selector-shell {
		display: flex;
		justify-content: center;
	}

	.file-selector-shell.dragover .file-selector {
		border-color: #b8432a;
		background: #fdf5f0;
		box-shadow: 0 0 0 3px rgba(184, 67, 42, 0.08);
	}

	.file-selector {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.82rem 1.55rem;
		border: 1.5px solid #2a241f;
		border-radius: 10px;
		background: #fff;
		color: #2a241f;
		font-size: 0.9rem;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
		user-select: none;
		appearance: none;
		-webkit-appearance: none;
	}
	.file-selector:hover {
		border-color: #000;
		background: #fafafa;
	}
	.file-selector:focus-visible {
		outline: 2px solid #b8432a;
		outline-offset: 2px;
	}

	.upload-icon {
		flex-shrink: 0;
	}

	/* Screen-reader-only utility — visually hidden but still focusable/accessible */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
