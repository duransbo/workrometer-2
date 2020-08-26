<script lang="ts" context="module">
	export class Interval {
		#ini: Date;
		#end: Date;
		#format = (d: Date): string => d.getDate().toString().padStart(2, '0') +
				'/' + (d.getMonth() + 1).toString().padStart(2, '0') +
				'/' + d.getFullYear().toString() +
				' ' + d.getHours().toString().padStart(2, '0') +
				':' + d.getMinutes().toString().padStart(2, '0') +
				':' + d.getSeconds().toString().padStart(2, '0');

		constructor(pIni: Date = new Date(), pEnd: Date = undefined) {
			this.#ini = pIni;
			this.#end = pEnd;
		}

		stop() {
			this.#end = new Date();
		}

		get ini(): string {
			return this.#ini ? this.#format(this.#ini) : '';
		}

		get end(): string {
			return this.#end ? this.#format(this.#end) : '';
		}

		get dt() {
			return {
				'ini': this.#ini,
				'end': this.#end
			};
		}
	}

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