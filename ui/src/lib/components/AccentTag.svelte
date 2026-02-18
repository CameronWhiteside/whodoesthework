<script lang="ts">
  import { selectionHandles } from '$lib/actions/selectionHandles';

  export let text: string;
  export let href: string | null = null;
</script>

{#if href}
  <a class="accent-tag mono" href={href} use:selectionHandles data-handles="on">{text}</a>
{:else}
  <div class="accent-tag mono" use:selectionHandles data-handles="on">{text}</div>
{/if}
