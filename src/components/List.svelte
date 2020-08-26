<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { slide } from "svelte/transition";
	import { elasticInOut } from "svelte/easing";
	import type { Work }  from '../objects/Work.svelte';

	export let workList: Work[];

	const dispatch = createEventDispatcher();

	function start(id: string) {
		dispatch('start', {
			'id': workList.findIndex(work => work.id === id)
		});
	}
</script>


{#each workList as work}
	<div class="-bg" transition:slide="{{duration: 300, easing: elasticInOut}}">
		<form on:submit|preventDefault={() => start(work.id)}>
			<input type="text" value="{work.text}" readonly>
			<button class="-conc -active">&gt;</button>
		</form>
		{#each work.intervals as interval}
			<p>{interval.ini} - {interval.end}</p>
		{/each}
	</div>
{:else}
	<div class="-bg" transition:slide="{{delay: 600, duration: 300, easing: elasticInOut}}">
		<p>Not have works!</p>
	</div>
{/each}

<style>
	.-bg {
		--h: 0;
		--s: 0%;
		--l: 80%;

		padding: 1rem 5%;
		align-items: center;
	}

	form {
		justify-content: space-between;
		align-items: center;
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