<template>
    <div class="ww-kanban" :style="kanbanStyle" v-bind="wwElementState?.$attrs">
        <template v-if="content.uncategorizedStack">
            <wwLayoutItemContext :index="0" :item="null" :data="uncategorizedStack" is-repeat>
                <wwElement
                    v-bind="content.stackElement"
                    :ww-props="{
                        ...stackConfig,
                        items: uncategorizedStack.items,
                        stack: null,
                    }"
                    class="ww-kanban-stack"
                    :states="isDragging ? ['dragging'] : []"
                ></wwElement>
            </wwLayoutItemContext>
        </template>

        <template v-for="(stack, index) in internalStacks" :key="'ww-stack-' + index">
            <wwLayoutItemContext :index="index" :item="null" is-repeat :data="stack" :repeated-items="internalStacks">
                <wwElement
                    v-bind="content.stackElement"
                    :ww-props="{ ...stackConfig, items: stack.items, stack: stack.value }"
                    class="ww-kanban-stack"
                    :states="isDragging ? ['dragging'] : []"
                ></wwElement>
            </wwLayoutItemContext>
        </template>

        <!-- Ghost card shown while dragging on touch -->
        <div
            v-if="ghostCard.visible"
            class="ww-drag-ghost"
            :style="ghostCard.style"
            aria-hidden="true"
        >
            <div class="ww-drag-ghost-inner" v-html="ghostCard.html"></div>
        </div>
    </div>
</template>

<script>
import { provide, reactive, ref, watch, computed, nextTick } from "vue";

export default {
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
        /* wwEditor:start */
        wwElementState: { type: Object, required: true },
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },
    emits: ["trigger-event", "update:content:effect"],
    setup(props, { emit }) {
        const internalStacks = ref([]);
        const uncategorizedStack = reactive({
            label: "Uncategorized",
            value: null,
            items: [],
        });

        // ─── Drag state ────────────────────────────────────────────────
        const isDragging = ref(false);
        const ghostCard = reactive({
            visible: false,
            html: "",
            style: {},
        });

        const { setValue: setDrag } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: "isDragging",
            type: "boolean",
            defaultValue: false,
            readonly: true,
        });

        watch(isDragging, (v) => setDrag(v), { immediate: true });

        // ─── Cursor style tag ──────────────────────────────────────────
        const css = computed(() => `* { cursor: ${props.content.draggingCursor || "grabbing"} !important; }`);
        const styletag = wwLib.getFrontDocument().createElement("style");
        watch(isDragging, (value) => {
            if (value) {
                styletag.textContent = css.value;
                wwLib.getFrontDocument().body.appendChild(styletag);
            } else {
                styletag.remove();
            }
        });

        // ─── Touch drag engine ─────────────────────────────────────────
        //
        // Strategy: completely bypass SortableJS on touch devices.
        // On pointerdown (touch), we start a long-press timer.
        // If the finger moves > threshold before the timer fires → it's a scroll, do nothing.
        // If the timer fires (long press confirmed) → lock scroll, show ghost card,
        // track pointermove to move ghost, on pointerup find drop target and emit move event.
        //
        // SortableJS is disabled on touch (via readonly:true passed per-stack when
        // our custom drag is active) so the two systems never conflict.

        let _pressTimer = null;
        let _pressPointerId = null;
        let _pressStartX = 0;
        let _pressStartY = 0;
        let _dragItem = null;          // the data item being dragged
        let _dragFromStack = null;     // stack value the item came from
        let _dragSourceEl = null;      // DOM card element
        let _dragActive = false;
        let _prevTouchAction = "";

        const MOVE_THRESHOLD = 8;      // px — below this = still pressing, above = scrolling

        function getDelay() {
            return typeof props.content.longPressDelay === "number" && !isNaN(props.content.longPressDelay)
                ? props.content.longPressDelay
                : 400;
        }

        function findCardEl(target) {
            // Walk up from touch target to find the draggable card element.
            // Cards are expected to have data-item-key attribute set by the child stack component.
            let el = target;
            while (el && el !== document.body) {
                if (el.dataset && el.dataset.itemKey !== undefined) return el;
                // Fallback: look for sortable item class used by vue-draggable / SortableJS
                if (el.classList && (el.classList.contains("ww-item") || el.getAttribute("draggable") === "true")) return el;
                el = el.parentElement;
            }
            return null;
        }

        function findStackForEl(cardEl) {
            // Find which stack (column) a card element lives in by walking up to ww-kanban-stack
            let el = cardEl;
            while (el) {
                if (el.classList && el.classList.contains("ww-kanban-stack")) return el;
                el = el.parentElement;
            }
            return null;
        }

        function getStackValueFromEl(stackEl) {
            return stackEl ? (stackEl.dataset.stackValue ?? null) : null;
        }

        function showGhost(cardEl, clientX, clientY) {
            const rect = cardEl.getBoundingClientRect();
            ghostCard.html = cardEl.innerHTML;
            ghostCard.style = {
                width: rect.width + "px",
                height: rect.height + "px",
                left: rect.left + "px",
                top: rect.top + "px",
                pointerEvents: "none",
                position: "fixed",
                zIndex: 9999,
                opacity: "0.85",
                transform: "rotate(2deg) scale(1.03)",
                transition: "transform 0.15s ease",
                boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
                borderRadius: "8px",
                background: "white",
                overflow: "hidden",
            };
            ghostCard.visible = true;
            // Store offset so ghost follows finger precisely
            ghostCard._offsetX = clientX - rect.left;
            ghostCard._offsetY = clientY - rect.top;
        }

        function moveGhost(clientX, clientY) {
            ghostCard.style = {
                ...ghostCard.style,
                left: (clientX - ghostCard._offsetX) + "px",
                top: (clientY - ghostCard._offsetY) + "px",
            };
        }

        function hideGhost() {
            ghostCard.visible = false;
            ghostCard.html = "";
        }

        function lockScroll() {
            const body = wwLib.getFrontDocument().body;
            _prevTouchAction = body.style.touchAction;
            body.style.touchAction = "none";
            body.style.overscrollBehavior = "none";
        }

        function unlockScroll() {
            const body = wwLib.getFrontDocument().body;
            body.style.touchAction = _prevTouchAction || "";
            body.style.overscrollBehavior = "";
        }

        function findDropTarget(clientX, clientY, excludeEl) {
            // Temporarily hide ghost so elementFromPoint works
            const prevDisplay = excludeEl ? excludeEl.style.visibility : null;
            if (excludeEl) excludeEl.style.visibility = "hidden";
            ghostCard.visible = false;

            const el = wwLib.getFrontDocument().elementFromPoint(clientX, clientY);

            if (excludeEl) excludeEl.style.visibility = prevDisplay || "";
            ghostCard.visible = true;

            if (!el) return { stackEl: null, stackValue: null, newIndex: 0 };

            // Find stack column
            let stackEl = el;
            while (stackEl && !stackEl.classList?.contains("ww-kanban-stack")) {
                stackEl = stackEl.parentElement;
            }
            if (!stackEl) return { stackEl: null, stackValue: null, newIndex: 0 };

            const stackValue = getStackValueFromEl(stackEl);

            // Find index — which card are we hovering over?
            const cards = Array.from(stackEl.querySelectorAll("[data-item-key], [draggable='true']"));
            let newIndex = cards.length;
            for (let i = 0; i < cards.length; i++) {
                const r = cards[i].getBoundingClientRect();
                const midY = r.top + r.height / 2;
                if (clientY < midY) {
                    newIndex = i;
                    break;
                }
            }

            return { stackEl, stackValue, newIndex };
        }

        function onTouchPointerDown(event) {
            if (!event.isTrusted) return;
            if (event.pointerType !== "touch") return;
            if (props.content.readonly) return;

            const cardEl = findCardEl(event.target);
            if (!cardEl) return;

            // Cancel any prior press
            cancelPress();

            _pressPointerId = event.pointerId;
            _pressStartX = event.clientX;
            _pressStartY = event.clientY;
            _dragSourceEl = cardEl;

            _pressTimer = setTimeout(async () => {
                _pressTimer = null;
                if (!_dragSourceEl) return;

                // Long-press confirmed — start drag
                lockScroll();
                _dragActive = true;
                isDragging.value = true;

                // Find item data from card element
                const itemKey = _dragSourceEl.dataset?.itemKey;
                const stackEl = findStackForEl(_dragSourceEl);
                _dragFromStack = getStackValueFromEl(stackEl);

                // Resolve item from internalStacks
                const allItems = [
                    ...internalStacks.value.flatMap(s => s.items),
                    ...uncategorizedStack.items,
                ];
                _dragItem = itemKey
                    ? allItems.find(item => String(wwLib.resolveObjectPropertyPath(item, props.content.itemKey)) === itemKey)
                    : allItems[0]; // fallback

                await nextTick();
                showGhost(_dragSourceEl, event.clientX, event.clientY);
                // Dim the source card
                _dragSourceEl.style.opacity = "0.3";

            }, getDelay());
        }

        function onTouchPointerMove(event) {
            if (event.pointerType !== "touch") return;
            if (_pressPointerId !== null && event.pointerId !== _pressPointerId) return;

            if (_pressTimer !== null) {
                // Still in long-press waiting window — check if user scrolled
                const dx = event.clientX - _pressStartX;
                const dy = event.clientY - _pressStartY;
                if (Math.hypot(dx, dy) > MOVE_THRESHOLD) {
                    // User is scrolling — cancel press, let scroll happen
                    cancelPress();
                    return;
                }
            }

            if (_dragActive) {
                if (event.cancelable) event.preventDefault();
                moveGhost(event.clientX, event.clientY);
            }
        }

        function onTouchPointerUp(event) {
            if (event.pointerType !== "touch") return;
            if (_pressPointerId !== null && event.pointerId !== _pressPointerId) return;

            if (_dragActive && _dragItem !== null) {
                const { stackValue: toStack, newIndex } = findDropTarget(event.clientX, event.clientY, _dragSourceEl);

                emit("trigger-event", {
                    name: "item:moved",
                    event: {
                        item: _dragItem,
                        from: _dragFromStack,
                        to: toStack,
                        oldIndex: null,
                        newIndex,
                        updatedList: [...internalStacks.value.flatMap(s => s.items), ...uncategorizedStack.items],
                    },
                });
            }

            endDrag();
        }

        function cancelPress() {
            if (_pressTimer) {
                clearTimeout(_pressTimer);
                _pressTimer = null;
            }
            _pressPointerId = null;
            _dragSourceEl = null;
        }

        function endDrag() {
            cancelPress();
            if (_dragSourceEl) _dragSourceEl.style.opacity = "";
            _dragSourceEl = null;
            _dragItem = null;
            _dragFromStack = null;
            _dragActive = false;
            isDragging.value = false;
            hideGhost();
            unlockScroll();
        }

        // Attach listeners at document level (capture phase so we beat SortableJS)
        function attachTouchListeners() {
            const doc = wwLib.getFrontDocument();
            doc.addEventListener("pointerdown", onTouchPointerDown, { capture: true, passive: true });
            doc.addEventListener("pointermove", onTouchPointerMove, { capture: true, passive: false });
            doc.addEventListener("pointerup", onTouchPointerUp, { capture: true });
            doc.addEventListener("pointercancel", endDrag, { capture: true });
        }

        function detachTouchListeners() {
            const doc = wwLib.getFrontDocument();
            doc.removeEventListener("pointerdown", onTouchPointerDown, { capture: true });
            doc.removeEventListener("pointermove", onTouchPointerMove, { capture: true });
            doc.removeEventListener("pointerup", onTouchPointerUp, { capture: true });
            doc.removeEventListener("pointercancel", endDrag, { capture: true });
        }

        // ─── SortableJS event bridge (for mouse/desktop drag) ─────────
        provide("customHandler", (change, { stack: stackValue, updatedStackItems }) => {
            if (change.moved) {
                emit("trigger-event", {
                    name: "item:moved",
                    event: {
                        item: change.moved.element,
                        from: stackValue,
                        to: stackValue,
                        oldIndex: change.moved.oldIndex,
                        newIndex: change.moved.newIndex,
                        updatedList: updatedStackItems,
                    },
                });
            }
            if (change.added) {
                emit("trigger-event", {
                    name: "item:moved",
                    event: {
                        item: change.added.element,
                        from: wwLib.resolveObjectPropertyPath(change.added.element, props.content.stackedBy),
                        to: stackValue,
                        oldIndex: null,
                        newIndex: change.added.newIndex,
                        updatedList: updatedStackItems,
                    },
                });
            }
        });

        const isDraggingManager = reactive({});
        provide("customDragHandler", (dragging, { stack }) => (isDraggingManager[stack] = dragging));

        return {
            internalStacks,
            uncategorizedStack,
            isDragging,
            ghostCard,
            attachTouchListeners,
            detachTouchListeners,
        };
    },

    computed: {
        stacks() {
            const stacks = wwLib.wwCollection.getCollectionData(this.content.stacks);
            if (!Array.isArray(stacks)) return [];
            return stacks;
        },
        items() {
            const items = wwLib.wwCollection.getCollectionData(this.content.items);
            if (!Array.isArray(items)) return [];
            return items;
        },
        stackConfig() {
            const isTouchDevice = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
            return {
                sortable: this.content.sortable,
                group: "kanban-" + this.uid,
                itemKey: this.content.itemKey,
                handle: this.content.customDragHandle ? this.content.handleClass || "draggable" : null,
                readonly: this.content.readonly,
                // On touch: disable SortableJS drag entirely — our pointer engine handles it.
                // On mouse: SortableJS works as normal with zero delay.
                ...(isTouchDevice && this.content.longPress
                    ? { delay: 99999, delayOnTouchOnly: true, touchStartThreshold: 999 }
                    : { delay: 0, delayOnTouchOnly: false }),
            };
        },
        kanbanStyle() {
            return {
                "--wrap-stacks": this.content.wrapStacks ? "wrap" : "nowrap",
            };
        },
        isReadonly() {
            /* wwEditor:start */
            if (this.wwEditorState.isSelected) {
                return this.wwElementState.states.includes("readonly");
            }
            /* wwEditor:end */
            return this.content.readonly;
        },
    },

    watch: {
        "content.stackValue"() { this.refreshStacks(); },
        "content.stackedBy"() { this.refreshStacks(); },
        "content.sortedBy"() { this.refreshStacks(); },
        "content.sortOrder"() { this.refreshStacks(); },
        "content.stacks": { handler() { this.refreshStacks(); }, deep: true },
        stacks() { this.refreshStacks(); },
        items: { handler() { this.refreshStacks(); }, deep: true },
        isReadonly: {
            immediate: true,
            handler(value) {
                if (value) this.$emit("add-state", "readonly");
                else this.$emit("remove-state", "readonly");
            },
        },
    },

    methods: {
        refreshStacks() {
            this.internalStacks = this.stacks
                .map((stack) => ({
                    label: wwLib.resolveObjectPropertyPath(stack, this.content.stackLabel || "label") ?? "",
                    value: wwLib.resolveObjectPropertyPath(stack, this.content.stackValue || "value") ?? "",
                }))
                .map((stack) => ({
                    ...stack,
                    items: this.items
                        .filter((item) => wwLib.resolveObjectPropertyPath(item, this.content.stackedBy) === stack.value)
                        .sort((a, b) => {
                            if (!this.content.sortedBy) return 0;
                            const valueA = wwLib.resolveObjectPropertyPath(a, this.content.sortedBy);
                            const valueB = wwLib.resolveObjectPropertyPath(b, this.content.sortedBy);
                            return this.content.sortOrder === "asc"
                                ? valueA > valueB ? 1 : -1
                                : valueA > valueB ? -1 : 1;
                        }),
                }));

            const stacksList = this.stacks.map((stack) =>
                wwLib.resolveObjectPropertyPath(stack, this.content.stackValue || "value")
            );
            this.uncategorizedStack.items = this.items.filter(
                (item) => !stacksList.includes(wwLib.resolveObjectPropertyPath(item, this.content.stackedBy))
            );
        },

        /* wwEditor:start */
        getTestEvent() {
            if (!this.internalStacks.length) throw new Error("No stack found");
            if (!this.items.length) throw new Error("No item found");
            return {
                item: this.items[0],
                from: this.internalStacks[0].value,
                to: this.internalStacks[0].value,
                oldIndex: 0,
                newIndex: 1,
                updatedList: this.items,
            };
        },
        /* wwEditor:end */
    },

    mounted() {
        this.refreshStacks();
        if (this.content.longPress) {
            this.attachTouchListeners();
        }
    },

    beforeUnmount() {
        this.detachTouchListeners();
    },
};
</script>

<style lang="scss" scoped>
.ww-kanban {
    display: flex;
    flex-direction: row;
    flex-wrap: var(--wrap-stacks);
    align-items: flex-start;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    height: 100%;
    /* Allow scroll by default — our JS locks it only after long-press confirms */
    touch-action: pan-x pan-y;
}

:deep(.ww-kanban-stack) {
    display: flex;
    flex-direction: column;
    max-height: 100%;
    overflow: hidden;
    flex-shrink: 0;
}

/* Allow scrolling inside stacks on touch */
:deep(.ww-kanban-stack *) {
    touch-action: auto;
}

/* Ghost card floating above everything while dragging */
.ww-drag-ghost {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    border-radius: 8px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    background: white;
    opacity: 0.88;
    transform: rotate(2deg) scale(1.03);
    will-change: left, top;
}

.ww-drag-ghost-inner {
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
}
</style>