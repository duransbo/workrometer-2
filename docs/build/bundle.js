
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Player.svelte generated by Svelte v3.24.1 */
    const file = "src\\components\\Player.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (16:2) {#each workStarted.intervals as interval}
    function create_each_block(ctx) {
    	let li;
    	let t0_value = /*interval*/ ctx[5].ini + "";
    	let t0;
    	let t1;
    	let t2_value = /*interval*/ ctx[5].end + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(li, file, 16, 3, 478);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*workStarted*/ 1 && t0_value !== (t0_value = /*interval*/ ctx[5].ini + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*workStarted*/ 1 && t2_value !== (t2_value = /*interval*/ ctx[5].end + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(16:2) {#each workStarted.intervals as interval}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let form;
    	let input_1;
    	let t0;
    	let button;
    	let t2;
    	let ul;
    	let mounted;
    	let dispose;
    	let each_value = /*workStarted*/ ctx[0].intervals;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			form = element("form");
    			input_1 = element("input");
    			t0 = space();
    			button = element("button");
    			button.textContent = "||";
    			t2 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(input_1, "type", "text");
    			attr_dev(input_1, "placeholder", "Name");
    			input_1.required = true;
    			attr_dev(input_1, "class", "svelte-ogcd4v");
    			add_location(input_1, file, 12, 1, 311);
    			attr_dev(button, "class", "-conc -active svelte-ogcd4v");
    			add_location(button, file, 13, 1, 380);
    			add_location(ul, file, 14, 1, 424);
    			attr_dev(form, "class", "-bg svelte-ogcd4v");
    			add_location(form, file, 11, 0, 258);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, input_1);
    			set_input_value(input_1, /*input*/ ctx[1]);
    			append_dev(form, t0);
    			append_dev(form, button);
    			append_dev(form, t2);
    			append_dev(form, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[3]),
    					listen_dev(form, "submit", prevent_default(/*stop*/ ctx[2]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*input*/ 2 && input_1.value !== /*input*/ ctx[1]) {
    				set_input_value(input_1, /*input*/ ctx[1]);
    			}

    			if (dirty & /*workStarted*/ 1) {
    				each_value = /*workStarted*/ ctx[0].intervals;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	
    	let { workStarted } = $$props;
    	const dispatch = createEventDispatcher();
    	let input = workStarted.text;

    	function stop() {
    		$$invalidate(0, workStarted.text = input, workStarted);
    		dispatch("stop");
    	}

    	const writable_props = ["workStarted"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Player> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Player", $$slots, []);

    	function input_1_input_handler() {
    		input = this.value;
    		$$invalidate(1, input);
    	}

    	$$self.$$set = $$props => {
    		if ("workStarted" in $$props) $$invalidate(0, workStarted = $$props.workStarted);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		workStarted,
    		dispatch,
    		input,
    		stop
    	});

    	$$self.$inject_state = $$props => {
    		if ("workStarted" in $$props) $$invalidate(0, workStarted = $$props.workStarted);
    		if ("input" in $$props) $$invalidate(1, input = $$props.input);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [workStarted, input, stop, input_1_input_handler];
    }

    class Player extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { workStarted: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Player",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*workStarted*/ ctx[0] === undefined && !("workStarted" in props)) {
    			console.warn("<Player> was created without expected prop 'workStarted'");
    		}
    	}

    	get workStarted() {
    		throw new Error("<Player>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set workStarted(value) {
    		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function elasticInOut(t) {
        return t < 0.5
            ? 0.5 *
                Math.sin(((+13.0 * Math.PI) / 2) * 2.0 * t) *
                Math.pow(2.0, 10.0 * (2.0 * t - 1.0))
            : 0.5 *
                Math.sin(((-13.0 * Math.PI) / 2) * (2.0 * t - 1.0 + 1.0)) *
                Math.pow(2.0, -10.0 * (2.0 * t - 1.0)) +
                1.0;
    }

    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => `overflow: hidden;` +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    /* src\components\List.svelte generated by Svelte v3.24.1 */
    const file$1 = "src\\components\\List.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (25:0) {:else}
    function create_else_block(ctx) {
    	let div;
    	let p;
    	let t1;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "Not have works!";
    			t1 = space();
    			add_location(p, file$1, 26, 2, 836);
    			attr_dev(div, "class", "-bg svelte-ovbxx9");
    			add_location(div, file$1, 25, 1, 744);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(div, t1);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(
    					div,
    					slide,
    					{
    						delay: 600,
    						duration: 300,
    						easing: elasticInOut
    					},
    					true
    				);

    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(
    				div,
    				slide,
    				{
    					delay: 600,
    					duration: 300,
    					easing: elasticInOut
    				},
    				false
    			);

    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(25:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (21:2) {#each work.intervals as interval}
    function create_each_block_1(ctx) {
    	let p;
    	let t0_value = /*interval*/ ctx[7].ini + "";
    	let t0;
    	let t1;
    	let t2_value = /*interval*/ ctx[7].end + "";
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			add_location(p, file$1, 21, 3, 674);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*workList*/ 1 && t0_value !== (t0_value = /*interval*/ ctx[7].ini + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*workList*/ 1 && t2_value !== (t2_value = /*interval*/ ctx[7].end + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(21:2) {#each work.intervals as interval}",
    		ctx
    	});

    	return block;
    }

    // (15:0) {#each workList as work}
    function create_each_block$1(ctx) {
    	let div;
    	let form;
    	let input;
    	let input_value_value;
    	let t0;
    	let button;
    	let t2;
    	let t3;
    	let div_transition;
    	let current;
    	let mounted;
    	let dispose;

    	function submit_handler(...args) {
    		return /*submit_handler*/ ctx[2](/*work*/ ctx[4], ...args);
    	}

    	let each_value_1 = /*work*/ ctx[4].intervals;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			form = element("form");
    			input = element("input");
    			t0 = space();
    			button = element("button");
    			button.textContent = ">";
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			attr_dev(input, "type", "text");
    			input.value = input_value_value = /*work*/ ctx[4].text;
    			input.readOnly = true;
    			attr_dev(input, "class", "svelte-ovbxx9");
    			add_location(input, file$1, 17, 3, 524);
    			attr_dev(button, "class", "-conc -active svelte-ovbxx9");
    			add_location(button, file$1, 18, 3, 577);
    			attr_dev(form, "class", "svelte-ovbxx9");
    			add_location(form, file$1, 16, 2, 465);
    			attr_dev(div, "class", "-bg svelte-ovbxx9");
    			add_location(div, file$1, 15, 1, 385);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, form);
    			append_dev(form, input);
    			append_dev(form, t0);
    			append_dev(form, button);
    			append_dev(div, t2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t3);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(form, "submit", prevent_default(submit_handler), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (!current || dirty & /*workList*/ 1 && input_value_value !== (input_value_value = /*work*/ ctx[4].text) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (dirty & /*workList*/ 1) {
    				each_value_1 = /*work*/ ctx[4].intervals;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t3);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, { duration: 300, easing: elasticInOut }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, slide, { duration: 300, easing: elasticInOut }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (detaching && div_transition) div_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(15:0) {#each workList as work}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*workList*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block(ctx);
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();

    			if (each_1_else) {
    				each_1_else.c();
    			}
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);

    			if (each_1_else) {
    				each_1_else.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*workList, start*/ 3) {
    				each_value = /*workList*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();

    				if (!each_value.length && each_1_else) {
    					each_1_else.p(ctx, dirty);
    				} else if (!each_value.length) {
    					each_1_else = create_else_block(ctx);
    					each_1_else.c();
    					transition_in(each_1_else, 1);
    					each_1_else.m(each_1_anchor.parentNode, each_1_anchor);
    				} else if (each_1_else) {
    					group_outros();

    					transition_out(each_1_else, 1, 1, () => {
    						each_1_else = null;
    					});

    					check_outros();
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    			if (each_1_else) each_1_else.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	
    	let { workList } = $$props;
    	const dispatch = createEventDispatcher();

    	function start(id) {
    		dispatch("start", {
    			"id": workList.findIndex(work => work.id === id)
    		});
    	}

    	const writable_props = ["workList"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<List> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("List", $$slots, []);
    	const submit_handler = work => start(work.id);

    	$$self.$$set = $$props => {
    		if ("workList" in $$props) $$invalidate(0, workList = $$props.workList);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		slide,
    		elasticInOut,
    		workList,
    		dispatch,
    		start
    	});

    	$$self.$inject_state = $$props => {
    		if ("workList" in $$props) $$invalidate(0, workList = $$props.workList);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [workList, start, submit_handler];
    }

    class List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { workList: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "List",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*workList*/ ctx[0] === undefined && !("workList" in props)) {
    			console.warn("<List> was created without expected prop 'workList'");
    		}
    	}

    	get workList() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set workList(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Install.svelte generated by Svelte v3.24.1 */

    const { console: console_1 } = globals;
    const file$2 = "src\\components\\Install.svelte";

    // (40:0) {#if deferredInstallPrompt}
    function create_if_block(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Install";
    			attr_dev(button, "id", "butInstall");
    			add_location(button, file$2, 40, 1, 1058);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*installPWA*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:0) {#if deferredInstallPrompt}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let if_block_anchor;
    	let if_block = /*deferredInstallPrompt*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*deferredInstallPrompt*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function logAppInstalled(event) {
    	console.log("Weather App was installed.", event);
    }

    function instance$2($$self, $$props, $$invalidate) {
    	if ("serviceWorker" in navigator) {
    		window.addEventListener("load", () => {
    			navigator.serviceWorker.register("/sw.js").then(reg => {
    				console.log("Service worker registered.", reg);
    			});
    		});
    	}

    	let deferredInstallPrompt = null;
    	let installButton = false;

    	function saveBeforeInstallPromptEvent(event) {
    		$$invalidate(0, deferredInstallPrompt = event);
    		installButton = true;
    	}

    	function installPWA(event) {
    		deferredInstallPrompt.prompt();
    		installButton = false;

    		deferredInstallPrompt.userChoice.then(choice => {
    			if (choice.outcome === "accepted") {
    				console.log("User accepted the A2HS prompt", choice);
    			} else {
    				console.log("User dismissed the A2HS prompt", choice);
    			}

    			$$invalidate(0, deferredInstallPrompt = null);
    		});
    	}

    	window.addEventListener("beforeinstallprompt", saveBeforeInstallPromptEvent);
    	window.addEventListener("appinstalled", logAppInstalled);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Install> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Install", $$slots, []);

    	$$self.$capture_state = () => ({
    		deferredInstallPrompt,
    		installButton,
    		saveBeforeInstallPromptEvent,
    		installPWA,
    		logAppInstalled
    	});

    	$$self.$inject_state = $$props => {
    		if ("deferredInstallPrompt" in $$props) $$invalidate(0, deferredInstallPrompt = $$props.deferredInstallPrompt);
    		if ("installButton" in $$props) installButton = $$props.installButton;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [deferredInstallPrompt, installPWA];
    }

    class Install extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Install",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\objects\Work.svelte generated by Svelte v3.24.1 */

    var __classPrivateFieldSet = undefined && undefined.__classPrivateFieldSet || function (receiver, privateMap, value) {
    	if (!privateMap.has(receiver)) {
    		throw new TypeError("attempted to set private field on non-instance");
    	}

    	privateMap.set(receiver, value);
    	return value;
    };

    var __classPrivateFieldGet = undefined && undefined.__classPrivateFieldGet || function (receiver, privateMap) {
    	if (!privateMap.has(receiver)) {
    		throw new TypeError("attempted to get private field on non-instance");
    	}

    	return privateMap.get(receiver);
    };

    var _ini, _end, _format, _id, _text, _intervals;

    class Interval {
    	constructor(pIni = new Date(), pEnd = undefined) {
    		_ini.set(this, void 0);
    		_end.set(this, void 0);
    		_format.set(this, d => d.getDate().toString().padStart(2, "0") + "/" + (d.getMonth() + 1).toString().padStart(2, "0") + "/" + d.getFullYear().toString() + " " + d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0") + ":" + d.getSeconds().toString().padStart(2, "0"));
    		__classPrivateFieldSet(this, _ini, pIni);
    		__classPrivateFieldSet(this, _end, pEnd);
    	}

    	stop() {
    		__classPrivateFieldSet(this, _end, new Date());
    	}

    	get ini() {
    		return __classPrivateFieldGet(this, _ini)
    		? __classPrivateFieldGet(this, _format).call(this, __classPrivateFieldGet(this, _ini))
    		: "";
    	}

    	get end() {
    		return __classPrivateFieldGet(this, _end)
    		? __classPrivateFieldGet(this, _format).call(this, __classPrivateFieldGet(this, _end))
    		: "";
    	}

    	get dt() {
    		return {
    			"ini": __classPrivateFieldGet(this, _ini),
    			"end": __classPrivateFieldGet(this, _end)
    		};
    	}
    }

    (_ini = new WeakMap(), _end = new WeakMap(), _format = new WeakMap());

    class Work {
    	constructor(pText = "", pIntervals = []) {
    		_id.set(this, void 0);
    		_text.set(this, void 0);
    		_intervals.set(this, void 0);
    		__classPrivateFieldSet(this, _id, Math.random().toString(36).substr(2, 10));
    		__classPrivateFieldSet(this, _text, pText);
    		__classPrivateFieldSet(this, _intervals, pIntervals);
    	}

    	get id() {
    		return __classPrivateFieldGet(this, _id);
    	}

    	get text() {
    		return __classPrivateFieldGet(this, _text);
    	}

    	set text(text) {
    		__classPrivateFieldSet(this, _text, text);
    	}

    	get intervals() {
    		return __classPrivateFieldGet(this, _intervals);
    	}

    	start() {
    		__classPrivateFieldSet(this, _intervals, [new Interval(), ...__classPrivateFieldGet(this, _intervals)]);
    	}

    	stop() {
    		__classPrivateFieldGet(this, _intervals)[0].stop();
    	}
    }

    (_id = new WeakMap(), _text = new WeakMap(), _intervals = new WeakMap());

    /* src\objects\Core.svelte generated by Svelte v3.24.1 */

    var __classPrivateFieldSet$1 = undefined && undefined.__classPrivateFieldSet || function (receiver, privateMap, value) {
    	if (!privateMap.has(receiver)) {
    		throw new TypeError("attempted to set private field on non-instance");
    	}

    	privateMap.set(receiver, value);
    	return value;
    };

    var __classPrivateFieldGet$1 = undefined && undefined.__classPrivateFieldGet || function (receiver, privateMap) {
    	if (!privateMap.has(receiver)) {
    		throw new TypeError("attempted to get private field on non-instance");
    	}

    	return privateMap.get(receiver);
    };

    var _workList, _workStarted;

    class Core {
    	constructor() {
    		_workList.set(this, void 0);
    		_workStarted.set(this, void 0);
    		__classPrivateFieldSet$1(this, _workList, []);
    		this.load();
    	}

    	save() {
    		localStorage.setItem("workrometer", JSON.stringify({
    			"workStarted": __classPrivateFieldGet$1(this, _workStarted)
    			? {
    					"text": __classPrivateFieldGet$1(this, _workStarted).text,
    					"intervals": __classPrivateFieldGet$1(this, _workStarted).intervals.map(interval => {
    						return {
    							"ini": interval.dt.ini,
    							"end": interval.dt.end
    						};
    					})
    				}
    			: undefined,
    			"workList": __classPrivateFieldGet$1(this, _workList).map(work => {
    				return {
    					"text": work.text,
    					"intervals": work.intervals.map(interval => {
    						return {
    							"ini": interval.dt.ini,
    							"end": interval.dt.end
    						};
    					})
    				};
    			})
    		}));
    	}

    	load() {
    		const storage = JSON.parse(localStorage.getItem("workrometer"));

    		if (storage) {
    			__classPrivateFieldSet$1(this, _workList, storage.workList.map(work => {
    				return new Work(work.text,
    				work.intervals.map(interval => {
    						return new Interval(new Date(interval.ini), new Date(interval.end));
    					}));
    			}));

    			if (storage.workStarted) {
    				__classPrivateFieldSet$1(this, _workStarted, new Work(storage.workStarted.text,
    				storage.workStarted.intervals.map(interval => {
    						return new Interval(new Date(interval.ini), interval.end ? new Date(interval.end) : undefined);
    					})));
    			}
    		}
    	}

    	newWork() {
    		this.stopWork();
    		__classPrivateFieldSet$1(this, _workStarted, new Work("New Work"));
    		__classPrivateFieldGet$1(this, _workStarted).start();
    		this.save();
    	}

    	delWork() {
    		__classPrivateFieldSet$1(this, _workList, []);
    		this.save();
    	}

    	stopWork() {
    		if (__classPrivateFieldGet$1(this, _workStarted)) {
    			__classPrivateFieldGet$1(this, _workStarted).stop();

    			__classPrivateFieldSet$1(this, _workList, [
    				__classPrivateFieldGet$1(this, _workStarted),
    				...__classPrivateFieldGet$1(this, _workList)
    			]);

    			__classPrivateFieldSet$1(this, _workStarted, undefined);
    		}

    		this.save();
    	}

    	startWork(i) {
    		const start = i + (__classPrivateFieldGet$1(this, _workStarted) ? 1 : 0);
    		this.stopWork();
    		__classPrivateFieldSet$1(this, _workStarted, __classPrivateFieldGet$1(this, _workList)[start]);
    		__classPrivateFieldGet$1(this, _workStarted).start();
    		__classPrivateFieldGet$1(this, _workList).splice(start, 1);
    		this.save();
    	}

    	get workList() {
    		return __classPrivateFieldGet$1(this, _workList);
    	}

    	get workStarted() {
    		return __classPrivateFieldGet$1(this, _workStarted);
    	}
    }

    (_workList = new WeakMap(), _workStarted = new WeakMap());

    /* src\App.svelte generated by Svelte v3.24.1 */
    const file$3 = "src\\App.svelte";

    // (37:0) {#if workStarted}
    function create_if_block$1(ctx) {
    	let player;
    	let current;

    	player = new Player({
    			props: { workStarted: /*workStarted*/ ctx[2] },
    			$$inline: true
    		});

    	player.$on("stop", /*stopWork*/ ctx[4]);

    	const block = {
    		c: function create() {
    			create_component(player.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(player, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const player_changes = {};
    			if (dirty & /*workStarted*/ 4) player_changes.workStarted = /*workStarted*/ ctx[2];
    			player.$set(player_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(player.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(player.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(player, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(37:0) {#if workStarted}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let header;
    	let h1;
    	let t0;
    	let t1;
    	let div;
    	let button0;
    	let t3;
    	let t4;
    	let list;
    	let t5;
    	let footer;
    	let button1;
    	let t7;
    	let install;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*workStarted*/ ctx[2] && create_if_block$1(ctx);

    	list = new List({
    			props: { workList: /*workList*/ ctx[1] },
    			$$inline: true
    		});

    	list.$on("start", /*startWork*/ ctx[5]);
    	install = new Install({ $$inline: true });

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			t0 = text(/*name*/ ctx[0]);
    			t1 = space();
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "+";
    			t3 = space();
    			if (if_block) if_block.c();
    			t4 = space();
    			create_component(list.$$.fragment);
    			t5 = space();
    			footer = element("footer");
    			button1 = element("button");
    			button1.textContent = "X";
    			t7 = space();
    			create_component(install.$$.fragment);
    			attr_dev(h1, "class", "svelte-r5nvck");
    			add_location(h1, file$3, 31, 1, 702);
    			attr_dev(button0, "class", "-conc -active svelte-r5nvck");
    			add_location(button0, file$3, 33, 2, 743);
    			attr_dev(div, "class", "control svelte-r5nvck");
    			add_location(div, file$3, 32, 1, 719);
    			attr_dev(header, "class", "-bg svelte-r5nvck");
    			add_location(header, file$3, 30, 0, 680);
    			attr_dev(button1, "class", "-conc -active svelte-r5nvck");
    			add_location(button1, file$3, 41, 1, 955);
    			attr_dev(footer, "class", "-bg svelte-r5nvck");
    			add_location(footer, file$3, 40, 0, 933);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    			append_dev(h1, t0);
    			append_dev(header, t1);
    			append_dev(header, div);
    			append_dev(div, button0);
    			insert_dev(target, t3, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(list, target, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, button1);
    			insert_dev(target, t7, anchor);
    			mount_component(install, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*newWork*/ ctx[3], false, false, false),
    					listen_dev(button1, "click", /*delWork*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t0, /*name*/ ctx[0]);

    			if (/*workStarted*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*workStarted*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t4.parentNode, t4);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const list_changes = {};
    			if (dirty & /*workList*/ 2) list_changes.workList = /*workList*/ ctx[1];
    			list.$set(list_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(list.$$.fragment, local);
    			transition_in(install.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(list.$$.fragment, local);
    			transition_out(install.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t3);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(list, detaching);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(footer);
    			if (detaching) detach_dev(t7);
    			destroy_component(install, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	const core = new Core();
    	let workList = core.workList;
    	let workStarted = core.workStarted;

    	function sinc() {
    		$$invalidate(1, workList = core.workList);
    		$$invalidate(2, workStarted = core.workStarted);
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

    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		Player,
    		List,
    		Install,
    		Core,
    		name,
    		core,
    		workList,
    		workStarted,
    		sinc,
    		newWork,
    		stopWork,
    		startWork,
    		delWork
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("workList" in $$props) $$invalidate(1, workList = $$props.workList);
    		if ("workStarted" in $$props) $$invalidate(2, workStarted = $$props.workStarted);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, workList, workStarted, newWork, stopWork, startWork, delWork];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'Workrometer'
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
