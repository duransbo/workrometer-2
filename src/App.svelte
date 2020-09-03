<script lang="ts">
	import Player from './components/cpnPlayer.svelte';
	import List from './components/cpnList.svelte';
	import Install from './components/cpnInstall.svelte';
	import { workList, workStarted } from './stores/strCore.svelte';

	export let name: string;
</script>

<header class="-bg">
	<h1>{name}</h1>
	<div class="control">
		<button class="-conc -active" on:click="{workStarted.new}">+</button>
	</div>
</header>
{#if $workStarted}
	<Player />
{/if}
<List />
<footer class="-bg">
	<button class="-conc -active" on:click="{workList.clear}">X</button>
</footer>
<Install />


<style>
	header {
		--h: 156;
		--s: 100%;
		--l: 30%;

		padding: 1rem 5%;
		justify-content: center;
		align-items: center;
	}

	h1 {
		color: hsl(0, 0%, 100%);
		font-size: 2rem;
		text-transform: uppercase;
		margin: 0 0 1rem 0;
	}

	.control {
		width: auto;
		justify-content: space-between;
	}

	button {
		width: 3rem;
		height: 3rem;
		font-weight: 900;
		text-transform: uppercase;
		margin: 0 1rem;
		color: hsl(0, 0%, 100%);
		border: none;
		border-radius: 1rem;
	}

	footer {
		--h: 156;
		--s: 100%;
		--l: 30%;

		padding: 1rem 5%;
		align-items: center;
		justify-content: space-around;
	}

	@media (min-width: 320px) {
		header {
			justify-content: space-between;
		}

		h1 {
			margin: 0;
		}

		button {
			margin: 0 0 0 1rem;
		}
	}
</style>