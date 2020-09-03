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

		get btw() {
			const diff = (this.#end.getTime() - this.#ini.getTime()) / (1000 * 60 * 60 * 24);

			const seg = (Math.floor(diff * 24 * 60 * 60) % 60);
			const min = (Math.floor(diff * 24 * 60) % 60);
			const hor = (Math.floor(diff * 24) % 24);
			const dia =  Math.floor(diff);


			return dia.toString().padStart(2, '0') + 'd ' + hor.toString().padStart(2, '0') + ':' + min.toString().padStart(2, '0');
		}
	}
</script>