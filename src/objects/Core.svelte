<script>
import { init } from 'svelte/internal';
</script>
<script lang="ts" context="module">
	import { Work, Interval } from './Work.svelte';

	export class Core {
		#workList: Work[];
		#workStarted: Work;

		constructor() {
			this.#workList = [];
			this.load();
		}
	
		save() {
			localStorage.setItem('workrometer', JSON.stringify({
				'workStarted': this.#workStarted ? {
					'text' : this.#workStarted.text,
					'intervals' : this.#workStarted.intervals.map(interval => {
						return {
							'ini' : interval.dt.ini,
							'end' : interval.dt.end
						}
					})
				} : undefined,
				'workList': this.#workList.map(work => {
					return {
						'text' : work.text,
						'intervals' : work.intervals.map(interval => {
							return {
								'ini' : interval.dt.ini,
								'end' : interval.dt.end
							}
						})
					};
				})
			}));
		}

		load() {
			const storage = JSON.parse(localStorage.getItem('workrometer'));

			if (storage) {
				this.#workList = storage.workList.map(work => {
					return new Work(work.text, work.intervals.map(interval => {
						return new Interval(new Date(interval.ini), new Date(interval.end));
					}));
				});
				
				if (storage.workStarted) {
					this.#workStarted = new Work(storage.workStarted.text, storage.workStarted.intervals.map(interval => {
						return new Interval(new Date(interval.ini), interval.end ? new Date(interval.end) : undefined);
					}));
				}
			}
		}

		newWork() {
			this.stopWork();
			this.#workStarted = new Work('New Work');
			this.#workStarted.start();
			this.save();
		}

		delWork() {
			this.#workList = [];
			this.save();
		}

		stopWork() {
			if (this.#workStarted) {
				this.#workStarted.stop();
				this.#workList = [this.#workStarted, ...this.#workList];
				this.#workStarted = undefined;
			}
			this.save();
		}

		startWork(i: number) {
			const start = i + (this.#workStarted ? 1 : 0);

			this.stopWork();
			this.#workStarted = this.#workList[start];
			this.#workStarted.start();
			this.#workList.splice(start, 1);
			this.save();
		}

		get workList(): Work[] {
			return this.#workList;
		}

		get workStarted(): Work {
			return this.#workStarted;
		}
	}
</script>