<script lang="ts">
	import Player from './components/Player.svelte';
	import List from './components/List.svelte';
	import Install from './components/Install.svelte';
	import { Core } from './objects/Core.svelte';

	export let name: string;

	const core = new Core();

	let workList = core.workList;
	let workStarted = core.workStarted;

	function sinc() {
		workList = core.workList;
		workStarted = core.workStarted;
	}

	function newWork() {
		core.newWork();
		sinc();
	}

	function stopWork() {
		core.stopWork();
		sinc();
	}

	function startWork(e) {
		core.startWork(e.detail.id);
		sinc();
	}

	function delWork() {
		core.delWork();
		sinc();
	}
</script>

<header class="-bg">
	<h1>{name}</h1>
	<div class="control">
		<button class="-conc -active" on:click="{newWork}">+</button>
	</div>
</header>
{#if workStarted}
	<Player {workStarted} on:stop={stopWork} />
{/if}
<List {workList} on:start={startWork} />
<footer class="-bg">
	<button class="-conc -active" on:click="{delWork}">X</button>
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