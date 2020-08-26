<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Work } from '../objects/Work.svelte';

	export let workStarted: Work;

	const dispatch = createEventDispatcher();
	
	let input: string = workStarted.text;

	function stop() {
		workStarted.text = input;
		dispatch('stop');
	}
</script>

<form class="-bg" on:submit|preventDefault={stop}>
	<input bind:value={input} type="text" placeholder="Name" required>
	<button class="-conc -active">||</button>
	<ul>
		{#each workStarted.intervals as interval}
			<li>{interval.ini} - {interval.end}</li>
		{/each}
	</ul>
</form>

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