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

        const { setValue: setDrag } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: "isDragging",
            type: "boolean",
            defaultValue: false,
            readonly: true,
        });
        const managerIsDragging = computed(() => Object.values(isDraggingManager).some((isDragging) => isDragging));
        const isDragging = computed(() => managerIsDragging.value);
        const longPressUnlocked = ref(false);
        const isCoarsePointer = ref(false);

        try {
            const frontWindow = wwLib.getFrontWindow?.() || (typeof window !== "undefined" ? window : null);
            if (frontWindow?.matchMedia) {
                isCoarsePointer.value =
                    frontWindow.matchMedia("(pointer: coarse)").matches ||
                    frontWindow.matchMedia("(any-pointer: coarse)").matches;
            } else {
                isCoarsePointer.value = !!frontWindow?.navigator?.maxTouchPoints;
            }
        } catch (e) {
            isCoarsePointer.value = false;
        }

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

        return { internalStacks, uncategorizedStack, isDragging, managerIsDragging, longPressUnlocked, isCoarsePointer };
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
            const configuredLongPressDelay = Number(this.content.longPressDelay);
            const longPressDelay = Number.isFinite(configuredLongPressDelay) ? configuredLongPressDelay : 400;
            const lockTouchDragUntilLongPress = this.content.longPress && this.isCoarsePointer && !this.longPressUnlocked;

            return {
                sortable: this.content.sortable,
                group: "kanban-" + this.uid,
                itemKey: this.content.itemKey,
                handle: this.content.customDragHandle ? this.content.handleClass || "draggable" : null,
                readonly: this.content.readonly || lockTouchDragUntilLongPress,
                delay: this.content.longPress ? Math.max(0, longPressDelay) : 0,
                delayOnTouchOnly: true,
                touchStartThreshold: 10,
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
        managerIsDragging(value) {
            if (!value) {
                this.longPressUnlocked = false;
            }
        },
        "content.longPress"(value) {
            if (value && this.isCoarsePointer && !this.content.readonly) {
                this.setupLongPressGate();
            } else {
                this.cleanupLongPressGate();
            }
        },
        isReadonly: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.$emit("add-state", "readonly");
                    this.cleanupLongPressGate();
                } else {
                    this.$emit("remove-state", "readonly");
                    if (this.content.longPress && this.isCoarsePointer) {
                        this.setupLongPressGate();
                    }
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
        setupLongPressGate() {
            if (this._longPressGateAttached || !this.$el) return;
            this._longPressGateAttached = true;
            const el = this.$el;
            el.addEventListener("pointerdown", this.onLongPressGatePointerDown, true);
            el.addEventListener("pointermove", this.onLongPressGatePointerMove, true);
            el.addEventListener("pointerup", this.onLongPressGatePointerUp, true);
            el.addEventListener("pointercancel", this.onLongPressGatePointerCancel, true);
        },
        clearLongPressGateTimer() {
            if (this._longPressGateTimer) {
                clearTimeout(this._longPressGateTimer);
                this._longPressGateTimer = null;
            }
        },
        resetLongPressGatePointerState() {
            this._longPressGatePointerId = null;
            this._longPressGateStartX = null;
            this._longPressGateStartY = null;
            this._longPressGateTarget = null;
            this._longPressGateEventInit = null;
        },
        cleanupLongPressGate() {
            this.clearLongPressGateTimer();
            this.resetLongPressGatePointerState();
            this.longPressUnlocked = false;

            if (this._longPressGateAttached && this.$el) {
                const el = this.$el;
                el.removeEventListener("pointerdown", this.onLongPressGatePointerDown, true);
                el.removeEventListener("pointermove", this.onLongPressGatePointerMove, true);
                el.removeEventListener("pointerup", this.onLongPressGatePointerUp, true);
                el.removeEventListener("pointercancel", this.onLongPressGatePointerCancel, true);
            }
            this._longPressGateAttached = false;
        },
        getLongPressDelay() {
            const configuredDelay = Number(this.content.longPressDelay);
            return Number.isFinite(configuredDelay) ? Math.max(0, configuredDelay) : 400;
        },
        onLongPressGatePointerDown(event) {
            if (!event.isTrusted) return;
            if (event.pointerType !== "touch") return;
            if (!this.content.longPress || this.isReadonly || !this.isCoarsePointer) return;
            if (this.managerIsDragging) return;
            if (this._longPressGatePointerId !== null && event.pointerId !== this._longPressGatePointerId) return;

            this.clearLongPressGateTimer();
            this.longPressUnlocked = false;
            this._longPressGatePointerId = event.pointerId;
            this._longPressGateStartX = event.clientX;
            this._longPressGateStartY = event.clientY;
            this._longPressGateTarget = event.target;
            this._longPressGateEventInit = {
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

            this._longPressGateTimer = setTimeout(() => {
                this._longPressGateTimer = null;
                this.longPressUnlocked = true;

                this.$nextTick(() => {
                    if (!this.longPressUnlocked || !this._longPressGateTarget || this.isReadonly) return;

                    try {
                        const syntheticEvent = new PointerEvent("pointerdown", this._longPressGateEventInit);
                        this._longPressGateTarget.dispatchEvent(syntheticEvent);
                    } catch (e) {
                        const mouseEvent = new MouseEvent("mousedown", {
                            bubbles: true,
                            cancelable: true,
                            clientX: this._longPressGateEventInit.clientX,
                            clientY: this._longPressGateEventInit.clientY,
                            screenX: this._longPressGateEventInit.screenX,
                            screenY: this._longPressGateEventInit.screenY,
                            buttons: 1,
                        });
                        this._longPressGateTarget.dispatchEvent(mouseEvent);
                    }
                });
            }, this.getLongPressDelay());
        },
        onLongPressGatePointerMove(event) {
            if (event.pointerType !== "touch") return;
            if (this._longPressGateTimer === null) return;
            if (this._longPressGatePointerId !== null && event.pointerId !== this._longPressGatePointerId) return;

            if (
                this._longPressGateStartX !== null &&
                this._longPressGateStartY !== null &&
                Math.hypot(event.clientX - this._longPressGateStartX, event.clientY - this._longPressGateStartY) > 10
            ) {
                this.clearLongPressGateTimer();
                this.longPressUnlocked = false;
                this.resetLongPressGatePointerState();
            }
        },
        onLongPressGatePointerUp(event) {
            if (event.pointerType !== "touch") return;
            if (this._longPressGatePointerId !== null && event.pointerId !== this._longPressGatePointerId) return;

            this.clearLongPressGateTimer();
            if (!this.managerIsDragging) {
                this.longPressUnlocked = false;
            }
            this.resetLongPressGatePointerState();
        },
        onLongPressGatePointerCancel(event) {
            if (event.pointerType !== "touch") return;
            if (this._longPressGatePointerId !== null && event.pointerId !== this._longPressGatePointerId) return;

            this.clearLongPressGateTimer();
            this.longPressUnlocked = false;
            this.resetLongPressGatePointerState();
        },
    },
    mounted() {
        this.refreshStacks();
        if (this.content.longPress && this.isCoarsePointer && !this.content.readonly) {
            this.setupLongPressGate();
        }
    },
    beforeUnmount() {
        this.cleanupLongPressGate();
    },
};
</script>

<style lang="scss" scoped>
.ww-kanban {
    flex-direction: row;
    flex-wrap: var(--wrap-stacks);
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
}

:deep(.ww-draggable-area > *) {
    touch-action: auto;
}
</style>
