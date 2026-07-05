<script lang="ts">
	import { toCanvas } from "qrcode";

	let {
		value,
		size = 200,
	}: {
		/** The text/URL to encode in the QR code. */
		value: string;
		/** QR code canvas dimensions in pixels. Default 200. */
		size?: number;
	} = $props();

	let canvasEl: HTMLCanvasElement | undefined = $state();

	$effect(() => {
		if (canvasEl && value) {
			toCanvas(canvasEl, value, {
				width: size,
				margin: 2,
				color: { dark: "#1a1a1a", light: "#ffffff" },
			}).catch(() => {
				// Swallow render errors; QR is non-critical.
			});
		}
	});
</script>

<canvas
	bind:this={canvasEl}
	width={size}
	height={size}
	aria-label="QR code for transfer link"
></canvas>

<style>
	canvas {
		display: block;
		max-width: 100%;
		height: auto;
		border-radius: 4px;
	}
</style>
