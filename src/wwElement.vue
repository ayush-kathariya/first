<template>
    <div class="ww-kanban" :style="kanbanStyle" v-bind="wwElementState?.$attrs">
        <template v-if="content.uncategorizedStack">
            <wwLayoutItemContext :index="0" :item="null" :data="uncategorizedStack" is-repeat>
                <section class="ww-kanban-stack">
                    <header class="ww-kanban-stack__header">{{ uncategorizedStack.label }}</header>
                    <draggable
                        class="ww-draggable-area"
                        :list="uncategorizedStack.items"
                        :group="dragGroup"
                        :item-key="draggableItemKey"
                        :disabled="isReadonly || content.sortable === false"
                        :sort="content.sortable !== false"
                        :handle="handleSelector"
                        :delay="dragDelay"
                        :delay-on-touch-only="true"
                        :touch-start-threshold="20"
                        :force-fallback="true"
                        :fallback-on-body="true"
                        :fallback-tolerance="10"
                        :animation="160"
                        ghost-class="ww-kanban-item--ghost"
                        chosen-class="ww-kanban-item--chosen"
                        drag-class="ww-kanban-item--dragging"
                        @change="onStackChange($event, null)"
                        @start="onDragStart(null)"
                        @end="onDragEnd(null)"
                    >
                        <template #item="{ element, index }">
                            <wwLayoutItemContext
                                :index="index"
                                :item="element"
                                :data="element"
                                is-repeat
                                :repeated-items="uncategorizedStack.items"
                            >
                                <article class="ww-kanban-item">
                                    <span v-if="content.customDragHandle" class="ww-kanban-item__handle" :class="handleClassName">
                                        ::
                                    </span>
                                    <span class="ww-kanban-item__label">{{ getItemLabel(element) }}</span>
                                </article>
                            </wwLayoutItemContext>
                        </template>
                    </draggable>
                </section>
            </wwLayoutItemContext>
        </template>

        <template v-for="(stack, index) in internalStacks" :key="'ww-stack-' + index">
            <wwLayoutItemContext :index="index" :item="null" is-repeat :data="stack" :repeated-items="internalStacks">
                <section class="ww-kanban-stack">
                    <header class="ww-kanban-stack__header">{{ stack.label }}</header>
                    <draggable
                        class="ww-draggable-area"
                        :list="stack.items"
                        :group="dragGroup"
                        :item-key="draggableItemKey"
                        :disabled="isReadonly || content.sortable === false"
                        :sort="content.sortable !== false"
                        :handle="handleSelector"
                        :delay="dragDelay"
                        :delay-on-touch-only="true"
                        :touch-start-threshold="20"
                        :force-fallback="true"
                        :fallback-on-body="true"
                        :fallback-tolerance="10"
                        :animation="160"
                        ghost-class="ww-kanban-item--ghost"
                        chosen-class="ww-kanban-item--chosen"
                        drag-class="ww-kanban-item--dragging"
                        @change="onStackChange($event, stack.value)"
                        @start="onDragStart(stack.value)"
                        @end="onDragEnd(stack.value)"
                    >
                        <template #item="{ element, index: itemIndex }">
                            <wwLayoutItemContext
                                :index="itemIndex"
                                :item="element"
                                :data="element"
                                is-repeat
                                :repeated-items="stack.items"
                            >
                                <article class="ww-kanban-item">
                                    <span v-if="content.customDragHandle" class="ww-kanban-item__handle" :class="handleClassName">
                                        ::
                                    </span>
                                    <span class="ww-kanban-item__label">{{ getItemLabel(element) }}</span>
                                </article>
                            </wwLayoutItemContext>
                        </template>
                    </draggable>
                </section>
            </wwLayoutItemContext>
        </template>
    </div>
</template>

<script>
import draggable from "vuedraggable";
import { reactive, ref, watch, computed } from "vue";

export default {
    components: {
        draggable,
    },
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
        /* wwEditor:start */
        wwElementState: { type: Object, required: true },
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },
    emits: ["trigger-event", "update:content:effect"],
    setup(props) {
        const internalStacks = ref([]);
        const uncategorizedStack = reactive({
            label: "Uncategorized",
            value: null,
            items: [],
        });

        const isDraggingManager = reactive({});

        const { setValue: setDrag } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: "isDragging",
            type: "boolean",
            defaultValue: false,
            readonly: true,
        });
        const managerIsDragging = computed(() => Object.values(isDraggingManager).some((isDragging) => isDragging));
        const isDragging = computed(() => managerIsDragging.value);
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
                    styletag.textContent = css.value;
                    wwLib.getFrontDocument().body.appendChild(styletag);
                } else {
                    styletag.remove();
                }
            },
            { deep: true }
        );

        return { internalStacks, uncategorizedStack, isDragging, isDraggingManager };
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
        dragGroup() {
            return "kanban-" + this.uid;
        },
        dragDelay() {
            if (!this.content.longPress) return 0;
            const delay = Number(this.content.longPressDelay);
            return Number.isFinite(delay) && delay >= 0 ? delay : 400;
        },
        handleClassName() {
            const rawClass = String(this.content.handleClass || "draggable").trim();
            return rawClass.replace(/^\./, "");
        },
        handleSelector() {
            if (!this.content.customDragHandle) return null;
            const firstClass = this.handleClassName
                .split(/\s+/)
                .filter(Boolean)[0];
            return firstClass ? `.${firstClass}` : null;
        },
        kanbanStyle() {
            return {
                "--wrap-stacks": this.content.wrapStacks ? "wrap" : "nowrap",
                "--kanban-user-select": this.content.longPress ? "none" : "auto",
                "--kanban-touch-callout": this.content.longPress ? "none" : "initial",
            };
        },
        effectiveReadonly() {
            return this.content.readonly;
        },
        isReadonly() {
            /* wwEditor:start */
            if (this.wwEditorState.isSelected) {
                return this.wwElementState.states.includes("readonly");
            }
            /* wwEditor:end */
            return this.effectiveReadonly;
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
        draggableItemKey(item) {
            if (this.content.itemKey) {
                const resolved = wwLib.resolveObjectPropertyPath(item, this.content.itemKey);
                if (resolved !== undefined && resolved !== null) return resolved;
            }
            const fallback = item?.id ?? item?._id;
            if (fallback !== undefined && fallback !== null) return fallback;
            return this.getStableItemKey(item);
        },
        getStableItemKey(item) {
            if (!item || typeof item !== "object") return String(item);
            if (!this._wwItemKeyMap) {
                this._wwItemKeyMap = new WeakMap();
                this._wwItemKeySeed = 0;
            }
            if (!this._wwItemKeyMap.has(item)) {
                this._wwItemKeySeed += 1;
                this._wwItemKeyMap.set(item, `ww-item-${this.uid}-${this._wwItemKeySeed}`);
            }
            return this._wwItemKeyMap.get(item);
        },
        getItemLabel(item) {
            if (item === null || item === undefined) return "";
            if (typeof item !== "object") return String(item);
            return String(item.label ?? item.name ?? item.title ?? item.id ?? item._id ?? JSON.stringify(item));
        },
        getStackKey(stackValue) {
            return stackValue === null ? "__uncategorized__" : String(stackValue);
        },
        getStackItems(stackValue) {
            if (stackValue === null) return this.uncategorizedStack.items;
            const stack = this.internalStacks.find((currentStack) => currentStack.value === stackValue);
            return stack ? stack.items : [];
        },
        setStackedByValue(item, stackValue) {
            if (!item || typeof item !== "object" || !this.content.stackedBy) return;
            const path = String(this.content.stackedBy)
                .split(".")
                .filter(Boolean);
            if (!path.length) return;

            let cursor = item;
            for (let index = 0; index < path.length - 1; index += 1) {
                const key = path[index];
                if (cursor[key] === null || typeof cursor[key] !== "object") {
                    cursor[key] = {};
                }
                cursor = cursor[key];
            }
            cursor[path[path.length - 1]] = stackValue;
        },
        onDragStart(stackValue) {
            this.isDraggingManager[this.getStackKey(stackValue)] = true;
        },
        onDragEnd(stackValue) {
            this.isDraggingManager[this.getStackKey(stackValue)] = false;
        },
        onStackChange(change, stackValue) {
            const updatedStackItems = this.getStackItems(stackValue);
            if (change.moved) {
                this.$emit("trigger-event", {
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
                const fromValue = wwLib.resolveObjectPropertyPath(change.added.element, this.content.stackedBy);
                this.setStackedByValue(change.added.element, stackValue);
                this.$emit("trigger-event", {
                    name: "item:moved",
                    event: {
                        item: change.added.element,
                        from: fromValue,
                        to: stackValue,
                        oldIndex: null,
                        newIndex: change.added.newIndex,
                        updatedList: updatedStackItems,
                    },
                });
            }
        },
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
    },
    mounted() {
        this.refreshStacks();
    },
    beforeUnmount() {
        // No manual listeners to cleanup.
    },
};
</script>

<style lang="scss" scoped>
.ww-kanban {
    display: flex;
    flex-direction: row;
    flex-wrap: var(--wrap-stacks);
    user-select: var(--kanban-user-select);
    -webkit-user-select: var(--kanban-user-select);
    -webkit-touch-callout: var(--kanban-touch-callout);
    gap: 20px;
    align-items: flex-start;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    height: 100%;
}

.ww-kanban-stack {
    display: flex;
    flex-direction: column;
    min-width: 260px;
    max-width: 340px;
    max-height: 100%;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: #f5f6fa;
}

.ww-kanban-stack__header {
    padding: 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    font-weight: 600;
    font-size: 14px;
}

.ww-draggable-area {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 60px;
    padding: 10px;
    overflow-y: auto;
    max-height: 100%;
    -webkit-overflow-scrolling: touch;
}

.ww-kanban-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    background: #ffffff;
}

.ww-kanban-item__handle {
    user-select: none;
    cursor: grab;
    font-weight: 700;
    line-height: 1;
    color: #6b7280;
}

.ww-kanban-item__label {
    overflow-wrap: anywhere;
}

.ww-kanban-item--ghost {
    opacity: 0.45;
}

.ww-kanban-item--chosen {
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16);
}

.ww-kanban-item--dragging {
    cursor: grabbing;
}

:deep(.ww-draggable-area > *) {
    touch-action: auto;
}
</style>
