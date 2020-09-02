<script lang="ts" context="module">
	import { Interval } from './objInterval.svelte';

	export class Work {
		#id: string;
		#text: string;
		#intervals: Interval[];

		constructor(pText: string = '', pIntervals: Interval[] = []) {
			this.#id = Math.random().toString(36).substr(2, 10);
			this.#text = pText;
			this.#intervals = pIntervals;
		}

		get id(): string {
			return this.#id;
		}

		get text(): string {
			return this.#text;
		}

		set text(text: string) {
			this.#text = text;
		}

		get intervals(): Interval[] {
			return this.#intervals;
		}

		start() {
			this.#intervals = [
				new Interval(),
				...this.#intervals
			];
		}

		stop() {
			this.#intervals[0].stop();
		}
	}
</script>