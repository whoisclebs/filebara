<script lang="ts">
    import { t } from "$lib/i18n/index.svelte.js";

    let {
        value = $bindable(""),
        placeholder = undefined as string | undefined,
        inputId = "transfer-password",
    }: {
        value?: string;
        placeholder?: string;
        inputId?: string;
    } = $props();

    let resolvedPlaceholder = $derived(placeholder ?? t("common.password") + "...");
</script>

<div class="password-input-wrapper">
    <input
        id={inputId}
        type="password"
        bind:value
        placeholder={resolvedPlaceholder}
        autocomplete="off"
        class="password-input"
    />
</div>

<style>
    .password-input-wrapper {
        width: 100%;
    }
    .password-input {
        display: block;
        width: 100%;
        padding: 0.65rem 0.85rem;
        border: 1.5px solid #ddd;
        border-radius: 8px;
        font-size: 0.88rem;
        font-family: inherit;
        color: #333;
        background: #fff;
        box-sizing: border-box;
        transition:
            border-color 0.15s,
            box-shadow 0.15s;
        outline: none;
    }
    .password-input::placeholder {
        color: #bbb;
        font-size: 0.82rem;
    }
    .password-input:focus {
        border-color: #b8432a;
        box-shadow: 0 0 0 3px rgba(184, 67, 42, 0.08);
    }
</style>
