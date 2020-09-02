<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { workStarted } from '../stores/strCore.svelte';
</script>

{#if $workStarted}
	<form class="-bg" on:submit|preventDefault={workStarted.stop}>
		<input bind:value={$workStarted.text} type="text" placeholder="Name" required>
		<button class="-conc -active">||</button>
		<ul>
			{#each $workStarted.intervals as interval}
				<li>{interval.ini} - {interval.end}</li>
			{/each}
		</ul>
	</form>
{/if}

<style>
	form {
		--h: 75;
		--s: 61%;
		--l: 56%;

		padding: 1rem 5%;
		align-items: center;
		justify-content: space-between;
	}

	input {
		width: calc(90% - 4rem);
		height: 2rem;
		padding: 1rem;
		box-sizing: border-box;
	}

	button {
		width: 3rem;
		height: 3rem;
		font-weight: 900;
		text-transform: uppercase;
		color: hsl(0, 0%, 100%);
		border: none;
		border-radius: 1rem;
	}
</style>