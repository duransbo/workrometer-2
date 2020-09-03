<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { workStarted } from '../stores/strCore.svelte';
</script>

<div class="-bg">
	<form on:submit|preventDefault={workStarted.stop}>
		<input class="-conv" bind:value={$workStarted.text} type="text" placeholder="Name" required>
		<button class="-conc -active">||</button>
	</form>
	<p>{$workStarted.intervals[0].ini}</p>
</div>

<style>
	.-bg {
		--h: 75;
		--s: 61%;
		--l: 56%;

		padding: 1rem 5%;
	}

	form {
		align-items: center;
		justify-content: space-between;
	}

	input {
		--si: 0%;
		--li: 80%;

		width: calc(90% - 3rem);
		height: 3rem;
		padding: 0 1rem;
		box-sizing: border-box;
		border: none;
		border-radius: 1rem;
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