<script lang="ts">
	import { onMount } from "svelte";
	import { initLocale } from "$lib/i18n/index.svelte.js";

	let { children } = $props();

	onMount(() => {
		initLocale();
	});
</script>
{@render children()}
