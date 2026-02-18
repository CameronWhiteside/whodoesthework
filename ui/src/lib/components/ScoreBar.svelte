<script lang="ts">
  export let label: string;
  export let value: number | null;
  export let max = 100;
  export let height = '8px';

  $: pct = value !== null ? Math.round((value / max) * 100) : 0;
  $: color = pct >= 70 ? '#b8ff57' : pct >= 40 ? '#fef3c7' : '#fee2e2';
</script>

<div class="score-bar">
  <div class="label-row">
    <span class="label">{label}</span>
    <span class="value">{value !== null ? value.toFixed(1) : '—'}</span>
  </div>
  <div class="track" style="height: {height}">
    <div class="fill" style="width: {pct}%; background: {color}" />
  </div>
</div>

<style>
  .score-bar { margin-bottom: 0.5rem; }
  .label-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    margin-bottom: 0.2rem;
  }
  .label { color: var(--color-muted); }
  .value { font-weight: 700; color: var(--color-text); font-variant-numeric: tabular-nums; }
  .track { background: rgba(11,10,8,0.08); border-radius: 4px; overflow: hidden; }
  .fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
</style>
