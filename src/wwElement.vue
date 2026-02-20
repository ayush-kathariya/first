<template>
    <div class="ww-kanban" :style="kanbanStyle" v-bind="wwElementState?.$attrs" ref="kanbanRoot">
        <template v-for="(stack, stackIndex) in renderStacks" :key="getStackDomKey(stack.value)">
            <wwLayoutItemContext :index="stackIndex" :item="null" :data="stack" :repeated-items="renderStacks" is-repeat>
                <section
                    class="ww-kanban-stack"
                    :data-stack-key="getStackDomKey(stack.value)"
                    @dragover.prevent="onStackDragOver"
                    @drop.prevent="onStackDrop($event, stack.value)"
                >
                    <header class="ww-kanban-stack-header">{{ stack.label || "Untitled" }}</header>

                    <div class="ww-kanban-stack-body">
                        <template v-for="(item, itemIndex) in stack.items" :key="getCardKey(item, itemIndex, stack.value)">
                            <wwLayoutItemContext
                                :index="itemIndex"
                                :item="item"
                                :data="item"
                                :repeated-items="stack.items"
                                is-repeat
                            >
                                <article
                                    class="ww-kanban-card"
                                    :class="{ 'is-drag-source': isCardDragSource(stack.value, itemIndex) }"
                                    :data-item-index="itemIndex"
                                    :data-item-key="String(getItemIdentity(item, itemIndex))"
                                    :draggable="canDesktopDrag && !content.customDragHandle"
                                    @dragstart="onDesktopDragStart($event, item, stack.value, itemIndex)"
                                    @dragend="onDesktopDragEnd"
                                    @dragover.prevent="onCardDragOver"
                                    @drop.prevent="onCardDrop($event, stack.value, itemIndex)"
                                >
                                    <button
                                        v-if="content.customDragHandle"
                                        type="button"
                                        class="ww-kanban-card-handle"
                                        :class="effectiveHandleClass"
                                        :draggable="canDesktopDrag"
                                        @dragstart="onDesktopDragStart($event, item, stack.value, itemIndex)"
                                        @dragend="onDesktopDragEnd"
                                    >
                                        ::
                                    </button>
                                    <div class="ww-kanban-card-content">{{ getItemLabel(item, itemIndex) }}</div>
                                </article>
                            </wwLayoutItemContext>
                        </template>
                    </div>
                </section>
            </wwLayoutItemContext>
        </template>

        <div v-if="ghostCard.visible" class="ww-drag-ghost" :style="ghostCard.style" aria-hidden="true">
            <div class="ww-drag-ghost-inner" v-html="ghostCard.html"></div>
        </div>
    </div>
</template>

<script>
import { reactive, ref, watch, computed } from "vue";

const NULL_STACK_KEY = "__WW_NULL_STACK__";

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
    setup(props) {
        const internalStacks = ref([]);
        const uncategorizedStack = reactive({
            label: "Uncategorized",
            value: null,
            items: [],
        });
        const isDragging = ref(false);
        const ghostCard = reactive({
            visible: false,
            html: "",
            style: {},
            offsetX: 0,
            offsetY: 0,
        });

        const { setValue: setDrag } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: "isDragging",
            type: "boolean",
            defaultValue: false,
            readonly: true,
        });
        watch(
            isDragging,
            value => {
                setDrag(value);
            },
            { immediate: true }
        );

        const css = computed(() => `* { cursor: ${props.content.draggingCursor || "grabbing"} !important; }`);
        const styletag = wwLib.getFrontDocument().createElement("style");
        watch(isDragging, value => {
            if (value) {
                styletag.textContent = css.value;
                wwLib.getFrontDocument().body.appendChild(styletag);
            } else {
                styletag.remove();
            }
        });

        return { internalStacks, uncategorizedStack, isDragging, ghostCard };
    },
    data() {
        return {
            desktopDrag: null,
            touchPointerId: null,
            touchPressTimer: null,
            touchPressStartX: 0,
            touchPressStartY: 0,
            touchPressContext: null,
            touchDragContext: null,
            touchMoveThreshold: 10,
            previousTouchAction: undefined,
            previousOverscrollBehavior: undefined,
            touchListenersAttached: false,
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
        renderStacks() {
            return this.content.uncategorizedStack ? [this.uncategorizedStack, ...this.internalStacks] : this.internalStacks;
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
        canDrag() {
            return !!this.content.sortable && !this.isReadonly;
        },
        canDesktopDrag() {
            return this.canDrag;
        },
        effectiveHandleClass() {
            return this.content.handleClass || "draggable";
        },
        isTouchDevice() {
            try {
                const win = wwLib.getFrontWindow?.() || (typeof window !== "undefined" ? window : null);
                if (!win) return false;
                return (
                    (win.navigator?.maxTouchPoints || 0) > 0 ||
                    (win.matchMedia && (win.matchMedia("(pointer: coarse)").matches || win.matchMedia("(any-pointer: coarse)").matches))
                );
            } catch (e) {
                return false;
            }
        },
        stackKeyLookup() {
            const map = {};
            if (this.content.uncategorizedStack) {
                map[this.getStackDomKey(null)] = null;
            }
            for (const stack of this.internalStacks) {
                map[this.getStackDomKey(stack.value)] = stack.value;
            }
            return map;
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
                    this.clearTouchInteraction();
                } else {
                    this.$emit("remove-state", "readonly");
                }
            },
        },
    },
    methods: {
        valuesEqual(a, b) {
            return a === b;
        },
        getStackDomKey(stackValue) {
            return stackValue === null ? NULL_STACK_KEY : `__WW_STACK__${String(stackValue)}`;
        },
        getStackItemsByValue(stackValue) {
            if (stackValue === null) return this.uncategorizedStack.items || [];
            const foundStack = this.internalStacks.find(stack => this.valuesEqual(stack.value, stackValue));
            return foundStack?.items || [];
        },
        getItemIdentity(item, index) {
            if (this.content.itemKey) {
                const key = wwLib.resolveObjectPropertyPath(item, this.content.itemKey);
                if (key !== undefined && key !== null && key !== "") return key;
            }
            return index;
        },
        getCardKey(item, index, stackValue) {
            return `${this.getStackDomKey(stackValue)}::${this.getItemIdentity(item, index)}::${index}`;
        },
        getItemLabel(item, index) {
            if (item === null || item === undefined) return "";
            if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") return String(item);

            const preferredPaths = [this.content.itemKey, "title", "name", "label"].filter(Boolean);
            for (const path of preferredPaths) {
                const value = wwLib.resolveObjectPropertyPath(item, path);
                if (value !== undefined && value !== null && value !== "") return String(value);
            }

            try {
                const text = JSON.stringify(item);
                return text.length > 120 ? `${text.slice(0, 117)}...` : text;
            } catch (e) {
                return `Item ${index + 1}`;
            }
        },
        clampIndex(index, length) {
            if (!Number.isFinite(index)) return 0;
            return Math.max(0, Math.min(index, length));
        },
        prepareMovePayload(dragContext, toStack, newIndex) {
            if (!dragContext || !this.canDrag) return null;

            const sourceItems = [...this.getStackItemsByValue(dragContext.fromStack)];
            if (dragContext.oldIndex < 0 || dragContext.oldIndex >= sourceItems.length) return null;

            const movedItem = dragContext.item ?? sourceItems[dragContext.oldIndex];
            sourceItems.splice(dragContext.oldIndex, 1);

            const isSameStack = this.valuesEqual(dragContext.fromStack, toStack);
            const targetItems = isSameStack ? sourceItems : [...this.getStackItemsByValue(toStack)];
            const finalIndex = this.clampIndex(newIndex, targetItems.length);
            targetItems.splice(finalIndex, 0, movedItem);

            if (isSameStack && finalIndex === dragContext.oldIndex) return null;

            return {
                item: movedItem,
                from: dragContext.fromStack,
                to: toStack,
                oldIndex: dragContext.oldIndex,
                newIndex: finalIndex,
                updatedList: targetItems,
            };
        },
        emitMove(payload) {
            if (!payload) return;
            this.$emit("trigger-event", {
                name: "item:moved",
                event: payload,
            });
        },
        refreshStacks() {
            this.internalStacks = this.stacks
                .map(stack => ({
                    label: wwLib.resolveObjectPropertyPath(stack, this.content.stackLabel || "label") ?? "",
                    value: wwLib.resolveObjectPropertyPath(stack, this.content.stackValue || "value") ?? "",
                }))
                .map(stack => ({
                    ...stack,
                    items: this.items
                        .filter(item => wwLib.resolveObjectPropertyPath(item, this.content.stackedBy) === stack.value)
                        .sort((a, b) => {
                            if (!this.content.sortedBy) return 0;
                            const valueA = wwLib.resolveObjectPropertyPath(a, this.content.sortedBy);
                            const valueB = wwLib.resolveObjectPropertyPath(b, this.content.sortedBy);
                            if (this.content.sortOrder === "asc") {
                                return valueA > valueB ? 1 : -1;
                            }
                            return valueA > valueB ? -1 : 1;
                        }),
                }));

            const stackValues = this.stacks.map(stack => wwLib.resolveObjectPropertyPath(stack, this.content.stackValue || "value"));
            this.uncategorizedStack.items = this.items.filter(
                item => !stackValues.includes(wwLib.resolveObjectPropertyPath(item, this.content.stackedBy))
            );
        },
        onDesktopDragStart(event, item, fromStack, oldIndex) {
            if (!this.canDesktopDrag) {
                event.preventDefault();
                return;
            }
            if (this.isTouchDevice && this.content.longPress) {
                event.preventDefault();
                return;
            }
            this.desktopDrag = { item, fromStack, oldIndex };
            this.isDragging = true;
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", "kanban-move");
            }
        },
        onDesktopDragEnd() {
            this.desktopDrag = null;
            if (!this.touchDragContext) this.isDragging = false;
        },
        onCardDragOver(event) {
            if (!this.desktopDrag) return;
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        },
        onCardDrop(event, toStack, cardIndex) {
            if (!this.desktopDrag) return;
            const rect = event.currentTarget.getBoundingClientRect();
            let insertIndex = cardIndex + (event.clientY > rect.top + rect.height / 2 ? 1 : 0);
            if (this.valuesEqual(this.desktopDrag.fromStack, toStack) && insertIndex > this.desktopDrag.oldIndex) {
                insertIndex -= 1;
            }
            this.emitMove(this.prepareMovePayload(this.desktopDrag, toStack, insertIndex));
            this.onDesktopDragEnd();
        },
        onStackDragOver(event) {
            if (!this.desktopDrag) return;
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        },
        onStackDrop(_event, toStack) {
            if (!this.desktopDrag) return;
            let insertIndex = this.getStackItemsByValue(toStack).length;
            if (this.valuesEqual(this.desktopDrag.fromStack, toStack) && insertIndex > this.desktopDrag.oldIndex) {
                insertIndex -= 1;
            }
            this.emitMove(this.prepareMovePayload(this.desktopDrag, toStack, insertIndex));
            this.onDesktopDragEnd();
        },
        matchesHandleTarget(target) {
            if (!this.content.customDragHandle) return true;
            return !!target.closest(`.${this.effectiveHandleClass}`);
        },
        showGhost(sourceEl, clientX, clientY) {
            const rect = sourceEl.getBoundingClientRect();
            this.ghostCard.visible = true;
            this.ghostCard.html = sourceEl.innerHTML;
            this.ghostCard.offsetX = clientX - rect.left;
            this.ghostCard.offsetY = clientY - rect.top;
            this.ghostCard.style = {
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                left: `${rect.left}px`,
                top: `${rect.top}px`,
            };
        },
        moveGhost(clientX, clientY) {
            this.ghostCard.style = {
                ...this.ghostCard.style,
                left: `${clientX - this.ghostCard.offsetX}px`,
                top: `${clientY - this.ghostCard.offsetY}px`,
            };
        },
        hideGhost() {
            this.ghostCard.visible = false;
            this.ghostCard.html = "";
            this.ghostCard.style = {};
            this.ghostCard.offsetX = 0;
            this.ghostCard.offsetY = 0;
        },
        lockTouchScroll() {
            try {
                const body = wwLib.getFrontDocument().body;
                this.previousTouchAction = body.style.touchAction;
                this.previousOverscrollBehavior = body.style.overscrollBehavior;
                body.style.touchAction = "none";
                body.style.overscrollBehavior = "none";
            } catch (e) {
                this.previousTouchAction = undefined;
                this.previousOverscrollBehavior = undefined;
            }
        },
        unlockTouchScroll() {
            try {
                const body = wwLib.getFrontDocument().body;
                body.style.touchAction = this.previousTouchAction || "";
                body.style.overscrollBehavior = this.previousOverscrollBehavior || "";
            } catch (e) {
                // ignore
            }
            this.previousTouchAction = undefined;
            this.previousOverscrollBehavior = undefined;
        },
        clearTouchPress() {
            if (this.touchPressTimer) {
                clearTimeout(this.touchPressTimer);
                this.touchPressTimer = null;
            }
            this.touchPressContext = null;
        },
        clearTouchInteraction() {
            this.clearTouchPress();
            if (this.touchDragContext?.sourceEl) {
                this.touchDragContext.sourceEl.classList.remove("is-drag-source");
            }
            this.touchDragContext = null;
            this.touchPointerId = null;
            this.hideGhost();
            this.unlockTouchScroll();
            if (!this.desktopDrag) this.isDragging = false;
        },
        isCardDragSource(stackValue, itemIndex) {
            if (!this.touchDragContext) return false;
            return this.valuesEqual(this.touchDragContext.fromStack, stackValue) && this.touchDragContext.oldIndex === itemIndex;
        },
        getTouchDropTarget(clientX, clientY) {
            const sourceEl = this.touchDragContext?.sourceEl;
            const prevGhostVisible = this.ghostCard.visible;
            const previousVisibility = sourceEl ? sourceEl.style.visibility : "";

            if (sourceEl) sourceEl.style.visibility = "hidden";
            this.ghostCard.visible = false;

            const pointElement = wwLib.getFrontDocument().elementFromPoint(clientX, clientY);

            if (sourceEl) sourceEl.style.visibility = previousVisibility || "";
            this.ghostCard.visible = prevGhostVisible;

            if (!pointElement) return null;

            const stackEl = pointElement.closest(".ww-kanban-stack");
            if (!stackEl) return null;

            const stackKey = stackEl.dataset.stackKey;
            const toStack = this.stackKeyLookup[stackKey];
            const cards = Array.from(stackEl.querySelectorAll(".ww-kanban-card")).filter(el => el !== sourceEl);
            let newIndex = cards.length;
            for (let i = 0; i < cards.length; i += 1) {
                const rect = cards[i].getBoundingClientRect();
                if (clientY < rect.top + rect.height / 2) {
                    newIndex = i;
                    break;
                }
            }
            return { toStack, newIndex };
        },
        startTouchDrag(clientX, clientY) {
            if (!this.touchPressContext) return;
            this.touchDragContext = this.touchPressContext;
            this.touchPressContext = null;
            this.isDragging = true;
            this.touchDragContext.sourceEl.classList.add("is-drag-source");
            this.showGhost(this.touchDragContext.sourceEl, clientX, clientY);
            this.lockTouchScroll();
        },
        onTouchPointerDown(event) {
            if (!event.isTrusted) return;
            if (event.pointerType !== "touch") return;
            if (!this.canDrag) return;
            if (this.touchPointerId !== null) return;

            const root = this.$refs.kanbanRoot;
            if (!root) return;

            const cardEl = event.target.closest(".ww-kanban-card");
            if (!cardEl || !root.contains(cardEl)) return;
            if (!this.matchesHandleTarget(event.target)) return;

            const stackEl = cardEl.closest(".ww-kanban-stack");
            if (!stackEl) return;

            const stackKey = stackEl.dataset.stackKey;
            const fromStack = this.stackKeyLookup[stackKey];
            const oldIndex = Number(cardEl.dataset.itemIndex);
            if (!Number.isInteger(oldIndex)) return;

            const stackItems = this.getStackItemsByValue(fromStack);
            const item = stackItems[oldIndex];
            if (item === undefined) return;

            this.touchPointerId = event.pointerId;
            this.touchPressStartX = event.clientX;
            this.touchPressStartY = event.clientY;
            this.clearTouchPress();
            this.touchPressContext = { item, fromStack, oldIndex, sourceEl: cardEl };

            if (this.content.longPress) {
                const delay = Number.isFinite(Number(this.content.longPressDelay))
                    ? Math.max(0, Number(this.content.longPressDelay))
                    : 400;
                this.touchPressTimer = setTimeout(() => {
                    this.touchPressTimer = null;
                    this.startTouchDrag(this.touchPressStartX, this.touchPressStartY);
                }, delay);
            } else {
                this.startTouchDrag(event.clientX, event.clientY);
            }
        },
        onTouchPointerMove(event) {
            if (event.pointerType !== "touch") return;
            if (this.touchPointerId === null || event.pointerId !== this.touchPointerId) return;

            if (this.touchPressTimer) {
                const dx = event.clientX - this.touchPressStartX;
                const dy = event.clientY - this.touchPressStartY;
                if (Math.hypot(dx, dy) > this.touchMoveThreshold) {
                    this.clearTouchPress();
                    this.touchPointerId = null;
                }
                return;
            }

            if (this.touchDragContext) {
                if (event.cancelable) event.preventDefault();
                this.moveGhost(event.clientX, event.clientY);
            }
        },
        onTouchPointerUp(event) {
            if (event.pointerType !== "touch") return;
            if (this.touchPointerId === null || event.pointerId !== this.touchPointerId) return;

            if (this.touchDragContext) {
                const target = this.getTouchDropTarget(event.clientX, event.clientY);
                if (target) {
                    this.emitMove(this.prepareMovePayload(this.touchDragContext, target.toStack, target.newIndex));
                }
            }

            this.clearTouchInteraction();
        },
        onTouchPointerCancel(event) {
            if (event.pointerType !== "touch") return;
            if (this.touchPointerId === null || event.pointerId !== this.touchPointerId) return;
            this.clearTouchInteraction();
        },
        attachTouchListeners() {
            if (this.touchListenersAttached) return;
            const root = this.$refs.kanbanRoot;
            if (!root) return;

            const doc = wwLib.getFrontDocument();
            root.addEventListener("pointerdown", this.onTouchPointerDown, true);
            doc.addEventListener("pointermove", this.onTouchPointerMove, { capture: true, passive: false });
            doc.addEventListener("pointerup", this.onTouchPointerUp, true);
            doc.addEventListener("pointercancel", this.onTouchPointerCancel, true);
            this.touchListenersAttached = true;
        },
        detachTouchListeners() {
            if (!this.touchListenersAttached) return;
            const root = this.$refs.kanbanRoot;
            const doc = wwLib.getFrontDocument();
            if (root) {
                root.removeEventListener("pointerdown", this.onTouchPointerDown, true);
            }
            doc.removeEventListener("pointermove", this.onTouchPointerMove, true);
            doc.removeEventListener("pointerup", this.onTouchPointerUp, true);
            doc.removeEventListener("pointercancel", this.onTouchPointerCancel, true);
            this.touchListenersAttached = false;
        },
        /* wwEditor:start */
        getTestEvent() {
            if (!this.renderStacks.length) throw new Error("No stack found");
            const firstStack = this.renderStacks[0];
            if (!firstStack?.items?.length) throw new Error("No item found");
            return {
                item: firstStack.items[0],
                from: firstStack.value,
                to: firstStack.value,
                oldIndex: 0,
                newIndex: 1,
                updatedList: firstStack.items,
            };
        },
        /* wwEditor:end */
    },
    mounted() {
        this.refreshStacks();
        this.attachTouchListeners();
    },
    beforeUnmount() {
        this.detachTouchListeners();
        this.clearTouchInteraction();
    },
};
</script>

<style lang="scss" scoped>
.ww-kanban {
    display: flex;
    flex-direction: row;
    flex-wrap: var(--wrap-stacks);
    align-items: flex-start;
    gap: 16px;
    overflow-x: auto;
    overflow-y: hidden;
    width: 100%;
    height: 100%;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x pan-y;
}

.ww-kanban-stack {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    width: min(320px, 85vw);
    max-height: 100%;
    border: 1px solid rgba(20, 24, 33, 0.12);
    border-radius: 12px;
    background: #f5f7fb;
    overflow: hidden;
}

.ww-kanban-stack-header {
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 600;
    color: #172033;
    border-bottom: 1px solid rgba(20, 24, 33, 0.12);
    background: #eaf0fb;
}

.ww-kanban-stack-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    overflow-y: auto;
    min-height: 54px;
}

.ww-kanban-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border: 1px solid rgba(20, 24, 33, 0.12);
    border-radius: 10px;
    background: #ffffff;
    color: #151b2a;
    padding: 10px 12px;
    user-select: none;
    -webkit-user-select: none;
    touch-action: auto;
}

.ww-kanban-card.is-drag-source {
    opacity: 0.35;
}

.ww-kanban-card-content {
    font-size: 13px;
    line-height: 1.35;
    overflow-wrap: anywhere;
    flex: 1 1 auto;
}

.ww-kanban-card-handle {
    border: none;
    background: transparent;
    color: #6f7b91;
    cursor: grab;
    font-size: 12px;
    line-height: 1;
    padding: 2px 4px;
    margin-top: 2px;
    flex: 0 0 auto;
}

.ww-kanban-card-handle:active {
    cursor: grabbing;
}

.ww-drag-ghost {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    border-radius: 10px;
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28);
    background: #ffffff;
    opacity: 0.9;
    transform: rotate(2deg) scale(1.02);
    overflow: hidden;
    will-change: left, top;
}

.ww-drag-ghost-inner {
    width: 100%;
    height: 100%;
    pointer-events: none;
}
</style>
