<script lang="ts" context="module">
	import { writable, get } from 'svelte/store';
	import { Work } from '../objects/objWork.svelte';
	import { Interval } from '../objects/objInterval.svelte';
	
	const save = () => {
		localStorage.setItem('workrometer', JSON.stringify({
			'workStarted': get(workStarted) ? {
				'text' : get(workStarted).text,
				'intervals' : get(workStarted).intervals.map(interval => {
					return {
						'ini' : interval.dt.ini,
						'end' : interval.dt.end
					}
				})
			} : undefined,
			'workList': get(workList).map(work => {
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
	};

	export const workStarted = (() => {
		const { subscribe, set, update } = writable(undefined);

		const storage = JSON.parse(localStorage.getItem('workrometer'));

		if (storage && storage.workStarted) {
			set(new Work(storage.workStarted.text, storage.workStarted.intervals.map(interval => {
				return new Interval(new Date(interval.ini), interval.end ? new Date(interval.end) : undefined);
			})));
		}

		return {
			subscribe,
			new: () => {
				workStarted.stop();
				
				const work = new Work('New Work');
				work.text += ' #' + work.id;
				work.start();
				set(work);
				save();
			},
			start: (id: string) => {
				workStarted.stop();

				const i = get(workList).findIndex(work => work.id === id);
				get(workList)[i].start();
				set(get(workList)[i]);
				save();
			},
			stop: () => {
				if (get(workStarted)) {
					get(workStarted).stop();
					workList.add();
				}
				set(undefined);
				save();
			}
		};
	})();

	export const workList = (() => {
		const { subscribe, set, update } = writable([]);

		const storage = JSON.parse(localStorage.getItem('workrometer'));

		if (storage) {
			set(storage.workList.map(work => {
				return new Work(work.text, work.intervals.map(interval => {
					return new Interval(new Date(interval.ini), new Date(interval.end));
				}));
			}));
		}

		return {
			subscribe,
			add: () => update((v: Work[]) => [get(workStarted), ...v]),
			del: (i: number) => {
				get(workList).splice(i, 1);
				set(get(workList));
				save();
			},
			start: (id: string) => {
				workStarted.start(id);
				workList.del(get(workList).findIndex(work => work.id === id));
			},
			clear: () => {
				set([]);
				save();
			}
		};
	})();
</script>