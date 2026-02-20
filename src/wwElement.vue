<template>
    <div class="ww-kanban" :style="kanbanStyle">
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
    </div>
</template>

<script>
import { provide, reactive, ref, watch, computed } from "vue";

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
        provide("customDragHandler", (isDragging, { stack }) => (isDraggingManager[stack] = isDragging));
        const isLongPressDragging = ref(false);

        const { setValue: setDrag } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: "isDragging",
            type: "boolean",
            defaultValue: false,
            readonly: true,
        });
        const managerIsDragging = computed(() => Object.values(isDraggingManager).some((isDragging) => isDragging));
        const isDragging = computed(() => managerIsDragging.value || isLongPressDragging.value);
        watch(
            isDragging,
            (value) => {
                setDrag(value);
            },
            { immediate: true }
        );

        const css = computed(() => `* { cursor: ${props.content.draggingCursor || "grabbing"} !important; }`);
        const styletag = wwLib.getFrontDocument().createElement("style");

        watch(
            isDragging,
            (value) => {
                if (value) {
                    styletag.appendChild(wwLib.getFrontDocument().createTextNode(css.value));
                    wwLib.getFrontDocument().body.appendChild(styletag);
                } else {
                    styletag.remove();
                }
            },
            { deep: true }
        );

        return { internalStacks, uncategorizedStack, isDragging, isLongPressDragging, managerIsDragging };
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
            return {
                sortable: this.content.sortable,
                group: "kanban-" + this.uid,
                itemKey: this.content.itemKey,
                handle: this.content.customDragHandle ? this.content.handleClass || "draggable" : null,
                readonly: this.content.readonly,
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
        "content.stackValue"() {
            this.refreshStacks();
        },
        "content.stackedBy"() {
            this.refreshStacks();
        },
        "content.sortedBy"() {
            this.refreshStacks();
        },
        "content.sortOrder"() {
            this.refreshStacks();
        },
        "content.stacks": {
            handler() {
                this.refreshStacks();
            },
            deep: true,
        },
        stacks() {
            this.refreshStacks();
        },
        items: {
            handler() {
                this.refreshStacks();
            },
            deep: true,
        },
        "content.longPress"(value) {
            if (value) {
                this.setupLongPressListeners();
            } else {
                this.cleanupLongPress();
            }
        },
        managerIsDragging(value) {
            if (value && this._longPressDragPending) {
                this.isLongPressDragging = true;
                this._longPressDragPending = false;
            }
            if (!value && this._longPressReleaseRequested) {
                this._longPressReleaseRequested = false;
                this.cleanupLongPress(true, true);
            }
        },
        isReadonly: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.$emit("add-state", "readonly");
                } else {
                    this.$emit("remove-state", "readonly");
                }
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
                            if (this.content.sortOrder === "asc") {
                                return valueA > valueB ? 1 : -1;
                            } else {
                                return valueA > valueB ? -1 : 1;
                            }
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
        setupLongPressListeners() {
            if (this._longPressListenersAttached || !this.$el) return;
            this._longPressListenersAttached = true;
            const el = this.$el;
            el.addEventListener("pointerdown", this.onPointerDown, true);
            el.addEventListener("pointerup", this.onPointerUp, true);
            el.addEventListener("pointercancel", this.onPointerCancel, true);
        },
        detachLongPressDocumentListeners() {
            try {
                const doc = wwLib.getFrontDocument();
                if (this._onLongPressDocPointerUp) {
                    doc.removeEventListener("pointerup", this._onLongPressDocPointerUp, true);
                    this._onLongPressDocPointerUp = null;
                }
                if (this._onLongPressDocTouchEnd) {
                    doc.removeEventListener("touchend", this._onLongPressDocTouchEnd, true);
                    this._onLongPressDocTouchEnd = null;
                }
                if (this._onLongPressDocTouchCancel) {
                    doc.removeEventListener("touchcancel", this._onLongPressDocTouchCancel, true);
                    this._onLongPressDocTouchCancel = null;
                }
                if (this._onLongPressDocPointerMove) {
                    // Note: remove with capture=true (boolean true) is sufficient
                    doc.removeEventListener("pointermove", this._onLongPressDocPointerMove, true);
                    this._onLongPressDocPointerMove = null;
                }
            } catch (e) {
                // fail silently if front document is not available
            }
        },
        cleanupLongPress(restoreTouchAction = true, forceCleanup = false) {
            // Don't cleanup if drag is actually in progress (unless forceCleanup is true)
            // This prevents the drag from freezing when scrolling during drag
            if (this.isDragging && !forceCleanup) {
                return;
            }

            this.detachLongPressDocumentListeners();
            this.isLongPressDragging = false;
            this._longPressDragPending = false;
            this._longPressReleaseRequested = false;
            if (this._longPressTimer) {
                clearTimeout(this._longPressTimer);
                this._longPressTimer = null;
            }
            this._longPressTarget = null;
            this._longPressEventInit = null;
            this._longPressPointerId = null;
            this._longPressStartX = null;
            this._longPressStartY = null;
            this._longPressMoveThreshold = null;

            // Release pointer capture if we took it on touch start
            if (this._longPressCapturedTarget && this._longPressCapturedPointerId !== null) {
                try {
                    this._longPressCapturedTarget.releasePointerCapture?.(this._longPressCapturedPointerId);
                } catch (e) {
                    // ignore
                }
            }
            this._longPressCapturedTarget = null;
            this._longPressCapturedPointerId = null;

            // Restore scroll / touch behavior on the page
            if (restoreTouchAction) {
                try {
                    const body = wwLib.getFrontDocument().body;
                    if (this._previousTouchAction !== undefined) {
                        body.style.touchAction = this._previousTouchAction;
                    } else {
                        body.style.touchAction = "";
                    }
                    this._previousTouchAction = undefined;

                    if (this._previousOverscrollBehavior !== undefined) {
                        body.style.overscrollBehavior = this._previousOverscrollBehavior;
                    } else {
                        body.style.overscrollBehavior = "";
                    }
                    this._previousOverscrollBehavior = undefined;
                } catch (e) {
                    // fail silently if front document is not available
                }
            }
        },
        requestLongPressCleanupOnRelease() {
            if (this.managerIsDragging) {
                this._longPressReleaseRequested = true;
                return;
            }
            this._longPressReleaseRequested = false;
            this.cleanupLongPress(true, true);
        },
        onPointerDown(event) {
            // Only intercept real touch events when long press is enabled
            if (!event.isTrusted) return;
            if (!this.content.longPress || this.isReadonly) return;
            if (event.pointerType !== "touch") return;

            // Let the browser handle native scroll detection before long-press confirms drag.

            this.cleanupLongPress();

            const delay =
                typeof this.content.longPressDelay === "number" && !isNaN(this.content.longPressDelay)
                    ? this.content.longPressDelay
                    : 400;
            this._longPressTarget = event.target;
            this._longPressPointerId = event.pointerId;
            this._longPressStartX = event.clientX;
            this._longPressStartY = event.clientY;
            this._longPressMoveThreshold = 10;

            // Cancel long-press if user moves finger enough to indicate scrolling.
            // Once drag starts, keep preventing browser touch scrolling.
            // passive:false is required for preventDefault to work on iOS/Android.
            try {
                const doc = wwLib.getFrontDocument();
                this._onLongPressDocPointerMove = (e) => {
                    if (e.pointerType !== "touch") return;
                    if (this._longPressPointerId !== null && e.pointerId !== this._longPressPointerId) return;
                    if (
                        this._longPressTimer &&
                        this._longPressStartX !== null &&
                        this._longPressStartY !== null &&
                        Math.hypot(e.clientX - this._longPressStartX, e.clientY - this._longPressStartY) >
                            this._longPressMoveThreshold
                    ) {
                        this.cleanupLongPress();
                        return;
                    }
                    if (this._longPressDragPending || this.isLongPressDragging) {
                        if (e.cancelable) e.preventDefault();
                    }
                };
                doc.addEventListener("pointermove", this._onLongPressDocPointerMove, { capture: true, passive: false });
            } catch (e) {
                // ignore
            }
            this._longPressEventInit = {
                bubbles: true,
                cancelable: true,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                clientX: event.clientX,
                clientY: event.clientY,
                screenX: event.screenX,
                screenY: event.screenY,
                buttons: 1,
            };
            this._longPressTimer = setTimeout(() => {
                if (!this._longPressTarget || !this._longPressEventInit) return;

                // Long-press is confirmed: lock touch scrolling during drag.
                try {
                    const body = wwLib.getFrontDocument().body;
                    this._previousTouchAction = body.style.touchAction;
                    body.style.touchAction = "none";
                    this._previousOverscrollBehavior = body.style.overscrollBehavior;
                    body.style.overscrollBehavior = "none";
                } catch (e) {
                    // fail silently if front document is not available
                }

                // Capture pointer once drag is about to begin to avoid losing events mid-drag.
                try {
                    this._longPressTarget?.setPointerCapture?.(this._longPressPointerId);
                    this._longPressCapturedTarget = this._longPressTarget;
                    this._longPressCapturedPointerId = this._longPressPointerId;
                } catch (e) {
                    this._longPressCapturedTarget = null;
                    this._longPressCapturedPointerId = null;
                }

                // Cleanup only when touch is actually released/cancelled on the device.
                const doc = wwLib.getFrontDocument();
                this.detachLongPressDocumentListeners();
                this._onLongPressDocPointerUp = (e) => {
                    if (e.pointerType !== "touch") return;
                    if (this._longPressPointerId !== null && e.pointerId !== this._longPressPointerId) return;
                    // Ignore pointerup during active long-press drag.
                    // Touchend/touchcancel will handle the real finger release cleanup.
                    if (this.isLongPressDragging || this._longPressDragPending) return;
                    this.requestLongPressCleanupOnRelease();
                };
                this._onLongPressDocTouchEnd = (e) => {
                    if (!e?.changedTouches?.length) return;
                    this.requestLongPressCleanupOnRelease();
                };
                this._onLongPressDocTouchCancel = (e) => {
                    // Do not cancel long press on touchcancel while finger can still be on screen.
                    // Cleanup is handled on real touch release (pointerup/touchend).
                    if (e?.touches?.length) return;
                    this.requestLongPressCleanupOnRelease();
                };
                doc.addEventListener("pointerup", this._onLongPressDocPointerUp, true);
                doc.addEventListener("touchend", this._onLongPressDocTouchEnd, true);
                doc.addEventListener("touchcancel", this._onLongPressDocTouchCancel, true);

                // Re-add pointermove prevention during drag (detachLongPressDocumentListeners removed it)
                if (this._onLongPressDocPointerMove) {
                    try {
                        doc.addEventListener("pointermove", this._onLongPressDocPointerMove, { capture: true, passive: false });
                    } catch (e) {
                        // ignore
                    }
                }

                try {
                    const syntheticEvent = new PointerEvent("pointerdown", this._longPressEventInit);
                    this._longPressTarget.dispatchEvent(syntheticEvent);
                } catch (e) {
                    // Fallback: mouse event if pointer event construction fails
                    const mouseEvent = new MouseEvent("mousedown", {
                        bubbles: true,
                        cancelable: true,
                        clientX: this._longPressEventInit.clientX,
                        clientY: this._longPressEventInit.clientY,
                        screenX: this._longPressEventInit.screenX,
                        screenY: this._longPressEventInit.screenY,
                        buttons: 1,
                    });
                    this._longPressTarget.dispatchEvent(mouseEvent);
                }

                // Mark drag as pending; it will be confirmed via managerIsDragging watcher.
                this._longPressDragPending = true;
                if (this.isDragging) {
                    this.isLongPressDragging = true;
                    this._longPressDragPending = false;
                }
            }, delay);
        },
        onPointerUp(event) {
            if (!this.content.longPress) return;
            if (event.pointerType !== "touch") return;
            if (this._longPressPointerId !== null && event.pointerId !== this._longPressPointerId) return;
            // During active drag, ignore pointerup here to avoid premature cleanup.
            // Real release cleanup is handled via document touchend/touchcancel.
            if (this.isLongPressDragging || this._longPressDragPending) return;
            this.requestLongPressCleanupOnRelease();
        },
        onPointerCancel(event) {
            if (!this.content.longPress) return;
            if (event.pointerType !== "touch") return;
            // Ignore cancel after long press has started. We'll cleanup on real touch release only.
            if (this.isLongPressDragging || this._longPressDragPending) return;
            this.cleanupLongPress();
        },
    },
    mounted() {
        this.refreshStacks();
        if (this.content.longPress) {
            this.setupLongPressListeners();
        }
    },
    beforeUnmount() {
        if (this._longPressListenersAttached && this.$el) {
            const el = this.$el;
            el.removeEventListener("pointerdown", this.onPointerDown, true);
            el.removeEventListener("pointerup", this.onPointerUp, true);
            el.removeEventListener("pointercancel", this.onPointerCancel, true);
        }
        this.cleanupLongPress(true, true);
    },
};
</script>

<style lang="scss" scoped>
.ww-kanban {
    flex-direction: row;
    flex-wrap: var(--wrap-stacks);
}
</style>
