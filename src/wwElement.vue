<template>
    <div
        class="ww-kanban"
        :class="{ 'is-touch-dragging': !!touchDragContext }"
        :style="kanbanStyle"
        v-bind="wwElementState?.$attrs"
        ref="kanbanRoot"
    >
        <template v-for="(stack, stackIndex) in renderStacks" :key="getStackDomKey(stack.value)">
            <wwLayoutItemContext :index="stackIndex" :item="null" :data="stack" :repeated-items="renderStacks" is-repeat>
                <section
                    class="ww-kanban-stack"
                    :class="{
                        'has-add-card': content.showAddCardButton !== false && !isReadonly,
                    }"
                    :data-stack-key="getStackDomKey(stack.value)"
                    @dragover.prevent="onStackDragOver($event, stack.value)"
                    @drop.prevent="onStackDrop($event, stack.value)"
                >
                    <div class="ww-kanban-stack-panel">
                        <header class="ww-kanban-stack-header">
                            <span class="ww-kanban-stack-title">{{ getStackLabel(stack) }}</span>
                            <span class="ww-kanban-stack-count">{{ stack.items.length }}</span>
                        </header>

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
                                        :draggable="nativeDesktopDragEnabled && !content.customDragHandle"
                                        @dragstart="onDesktopDragStart($event, item, stack.value, itemIndex)"
                                        @dragend="onDesktopDragEnd"
                                        @dragover.stop.prevent="onCardDragOver($event, stack.value, itemIndex)"
                                        @drop.stop.prevent="onCardDrop($event, stack.value, itemIndex)"
                                        @click="onCardClick(item, stack.value, itemIndex, $event)"
                                    >
                                        <button
                                            v-if="content.customDragHandle"
                                            type="button"
                                            class="ww-kanban-card-handle"
                                            :class="effectiveHandleClass"
                                            :draggable="nativeDesktopDragEnabled"
                                            @dragstart="onDesktopDragStart($event, item, stack.value, itemIndex)"
                                            @dragend="onDesktopDragEnd"
                                        >
                                            ::
                                        </button>
                                        <div class="ww-kanban-card-content">
                                            <img
                                                v-if="getItemImage(item)"
                                                class="ww-kanban-card-image"
                                                :src="getItemImage(item)"
                                                alt=""
                                                loading="lazy"
                                                draggable="false"
                                            />
                                            <div class="ww-kanban-card-text">{{ getItemLabel(item, itemIndex) }}</div>
                                        </div>
                                    </article>
                                </wwLayoutItemContext>
                            </template>
                        </div>
                    </div>

                    <footer
                        v-if="content.showAddCardButton !== false && !isReadonly"
                        class="ww-kanban-stack-footer"
                        :class="{ 'is-composer-open': isAddCardComposerOpen(stack.value) }"
                    >
                        <button
                            v-if="!isAddCardComposerOpen(stack.value)"
                            type="button"
                            class="ww-kanban-add-card-button"
                            @click="openAddCardComposer(stack, $event)"
                        >
                            <span class="ww-kanban-add-card-icon" aria-hidden="true">
                                <svg class="ww-kanban-add-card-icon-svg" viewBox="0 0 20 20" focusable="false">
                                    <circle cx="10" cy="10" r="8.25"></circle>
                                    <path d="M10 6.5V13.5"></path>
                                    <path d="M6.5 10H13.5"></path>
                                </svg>
                            </span>
                            <span>{{ content.addCardButtonLabel || "Add Card" }}</span>
                        </button>

                        <form v-else class="ww-kanban-add-card-composer" @submit.prevent="onAddCardSubmit(stack, $event)">
                            <textarea
                                class="ww-kanban-add-card-input"
                                :value="addCardDraft"
                                :placeholder="content.addCardInputPlaceholder || 'Enter a title or paste a link'"
                                rows="3"
                                @input="onAddCardInput"
                            ></textarea>
                            <div class="ww-kanban-add-card-actions">
                                <button type="submit" class="ww-kanban-add-card-submit" :disabled="!addCardDraft.trim()">
                                    {{ content.addCardSubmitLabel || "Add card" }}
                                </button>
                                <button
                                    type="button"
                                    class="ww-kanban-add-card-cancel"
                                    aria-label="Cancel"
                                    @click="cancelAddCardComposer"
                                >
                                    <svg class="ww-kanban-add-card-cancel-icon" viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                                        <path d="M6 6L14 14"></path>
                                        <path d="M14 6L6 14"></path>
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </footer>
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
            touchIdentifier: null,
            touchPressTimer: null,
            touchPressStartX: 0,
            touchPressStartY: 0,
            touchPressContext: null,
            touchDragContext: null,
            touchMoveThreshold: 14,
            previousTouchAction: undefined,
            previousOverscrollBehavior: undefined,
            touchListenersAttached: false,
            touchDragCapturedEl: null,
            touchLastClientX: 0,
            touchLastClientY: 0,
            touchAutoScrollRaf: null,
            touchAutoScrollEdgeSize: 104,
            touchAutoScrollMaxStepX: 34,
            touchAutoScrollMaxStepY: 28,
            touchAutoScrollRunning: false,
            suppressClickUntil: 0,
            dropTargetStack: null,
            dropTargetIndex: null,
            dropPlaceholderEl: null,
            dropPlaceholderStackKey: null,
            dropPlaceholderIndex: -1,
            dropPlaceholderHeight: 74,
            desktopListenersAttached: false,
            addCardDraft: "",
            addCardComposerStackKey: null,
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
            const valueOrDefault = (value, fallback) => {
                if (value === undefined || value === null || value === "") return fallback;
                return String(value);
            };
            const sizeOrDefault = (value, fallbackPx) => {
                if (value === undefined || value === null || value === "") return `${fallbackPx}px`;
                if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
                const normalized = String(value).trim();
                if (!normalized) return `${fallbackPx}px`;
                if (/^-?\d+(\.\d+)?$/.test(normalized)) return `${normalized}px`;
                return normalized;
            };
            const numberOrDefault = (value, fallback) => {
                if (value === undefined || value === null || value === "") return String(fallback);
                const parsed = Number(value);
                return Number.isFinite(parsed) ? String(parsed) : String(value);
            };

            return {
                "--wrap-stacks": "nowrap",
                "--ww-font-family": valueOrDefault(this.content.uiFontFamily, "inherit"),
                "--ww-board-bg": valueOrDefault(this.content.boardBackgroundColor, "#f1f3f6"),
                "--ww-board-gap": sizeOrDefault(this.content.boardGap, 12),
                "--ww-board-padding": sizeOrDefault(this.content.boardPadding, 8),
                "--ww-stack-width": valueOrDefault(this.content.columnWidth, "min(300px, 84vw)"),
                "--ww-stack-height": sizeOrDefault(this.content.columnHeight, 520),
                "--ww-stack-block-gap": sizeOrDefault(this.content.columnBlockGap, 8),
                "--ww-add-card-block-height": sizeOrDefault(this.content.addCardButtonHeight, 34),
                "--ww-panel-bg": valueOrDefault(this.content.columnBackgroundColor, "#f3f4f6"),
                "--ww-panel-border-color": valueOrDefault(this.content.columnBorderColor, "rgba(15, 23, 42, 0.1)"),
                "--ww-header-text-color": valueOrDefault(this.content.columnTitleColor, "#0f172a"),
                "--ww-header-font-size": sizeOrDefault(this.content.columnTitleFontSize, 13),
                "--ww-header-font-weight": numberOrDefault(this.content.columnTitleFontWeight, 600),
                "--ww-count-bg": valueOrDefault(this.content.columnCountBackgroundColor, "#f8fafc"),
                "--ww-count-text-color": valueOrDefault(this.content.columnCountColor, "#111827"),
                "--ww-count-border-color": valueOrDefault(this.content.columnCountBorderColor, "rgba(15, 23, 42, 0.28)"),
                "--ww-card-bg": valueOrDefault(this.content.cardBackgroundColor, "#fbfdff"),
                "--ww-card-text-color": valueOrDefault(this.content.cardTextColor, "#0f172a"),
                "--ww-card-border-color": valueOrDefault(this.content.cardBorderColor, "rgba(15, 23, 42, 0.14)"),
                "--ww-card-hover-border-color": valueOrDefault(this.content.cardHoverBorderColor, "#3b82f6"),
                "--ww-card-hover-ring-color": valueOrDefault(this.content.cardHoverRingColor, "rgba(59, 130, 246, 0.22)"),
                "--ww-card-min-height": sizeOrDefault(this.content.cardMinHeight, 74),
                "--ww-card-radius": sizeOrDefault(this.content.cardBorderRadius, 8),
                "--ww-card-padding": sizeOrDefault(this.content.cardPadding, 12),
                "--ww-card-font-size": sizeOrDefault(this.content.cardFontSize, 13),
                "--ww-add-button-bg": valueOrDefault(this.content.addCardButtonBackgroundColor, "#f8fafc"),
                "--ww-add-button-bg-hover": valueOrDefault(this.content.addCardButtonHoverBackgroundColor, "#f2f5fa"),
                "--ww-add-button-text-color": valueOrDefault(this.content.addCardButtonTextColor, "#111827"),
                "--ww-add-button-border-color": valueOrDefault(this.content.addCardButtonBorderColor, "rgba(15, 23, 42, 0.18)"),
                "--ww-add-button-font-size": sizeOrDefault(this.content.addCardButtonFontSize, 13),
                "--ww-add-input-bg": valueOrDefault(this.content.addCardInputBackgroundColor, "#f8fafc"),
                "--ww-add-input-text-color": valueOrDefault(this.content.addCardInputTextColor, "#0f172a"),
                "--ww-add-input-border-color": valueOrDefault(this.content.addCardInputBorderColor, "rgba(15, 23, 42, 0.16)"),
                "--ww-add-input-placeholder-color": valueOrDefault(this.content.addCardInputPlaceholderColor, "#6b7280"),
                "--ww-add-input-font-size": sizeOrDefault(this.content.addCardInputFontSize, 13),
                "--ww-add-input-min-height": sizeOrDefault(this.content.addCardInputMinHeight, 70),
                "--ww-add-submit-bg": valueOrDefault(this.content.addCardSubmitBackgroundColor, "#2563eb"),
                "--ww-add-submit-bg-hover": valueOrDefault(this.content.addCardSubmitHoverBackgroundColor, "#1d4ed8"),
                "--ww-add-submit-text-color": valueOrDefault(this.content.addCardSubmitTextColor, "#ffffff"),
                "--ww-add-submit-border-color": valueOrDefault(this.content.addCardSubmitBorderColor, "rgba(37, 99, 235, 0.95)"),
                "--ww-add-submit-font-size": sizeOrDefault(this.content.addCardSubmitFontSize, 13),
                "--ww-drop-placeholder-color": valueOrDefault(this.content.dropPlaceholderColor, "rgba(15, 23, 42, 0.08)"),
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
            return this.content.sortable !== false && !this.isReadonly;
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
        hasFinePointer() {
            try {
                const win = wwLib.getFrontWindow?.() || (typeof window !== "undefined" ? window : null);
                if (!win?.matchMedia) return !this.isTouchDevice;
                return win.matchMedia("(pointer: fine)").matches || win.matchMedia("(any-pointer: fine)").matches;
            } catch (e) {
                return !this.isTouchDevice;
            }
        },
        nativeDesktopDragEnabled() {
            if (!this.canDesktopDrag) return false;
            if (!this.hasFinePointer) return false;
            return true;
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
                    this.cancelAddCardComposer();
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
        setDropTargetStack(stackValue) {
            if (this.valuesEqual(this.dropTargetStack, stackValue)) return;
            this.dropTargetStack = stackValue;
        },
        clearDropTargetStack() {
            if (this.dropTargetStack === null) return;
            this.dropTargetStack = null;
        },
        setDropTargetIndex(index) {
            if (!Number.isFinite(index)) {
                this.dropTargetIndex = null;
                return;
            }
            this.dropTargetIndex = Math.max(0, Number(index));
        },
        getStackElementByValue(stackValue) {
            const root = this.$refs.kanbanRoot;
            if (!root) return null;
            const stackKey = this.getStackDomKey(stackValue);
            const stackElements = Array.from(root.querySelectorAll(".ww-kanban-stack"));
            return stackElements.find(el => el.dataset.stackKey === stackKey) || null;
        },
        getStackBodyElement(stackValue) {
            return this.getStackElementByValue(stackValue)?.querySelector(".ww-kanban-stack-body") || null;
        },
        isDesktopSourceCardElement(cardEl, stackValue) {
            if (!this.desktopDrag) return false;
            if (!this.valuesEqual(this.desktopDrag.fromStack, stackValue)) return false;
            const cardIndex = Number(cardEl?.dataset?.itemIndex);
            return Number.isInteger(cardIndex) && cardIndex === this.desktopDrag.oldIndex;
        },
        ensureDropPlaceholder() {
            if (this.dropPlaceholderEl) return this.dropPlaceholderEl;
            const doc = wwLib.getFrontDocument?.() || (typeof document !== "undefined" ? document : null);
            if (!doc) return null;
            const placeholder = doc.createElement("div");
            placeholder.className = "ww-drop-placeholder";
            placeholder.setAttribute("aria-hidden", "true");
            this.dropPlaceholderEl = placeholder;
            return placeholder;
        },
        clearDropPlaceholder() {
            if (this.dropPlaceholderEl?.parentNode) {
                this.dropPlaceholderEl.parentNode.removeChild(this.dropPlaceholderEl);
            }
            this.dropPlaceholderStackKey = null;
            this.dropPlaceholderIndex = -1;
        },
        setDropPlaceholderHeight(height) {
            const parsed = Number(height);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            this.dropPlaceholderHeight = Math.max(24, Math.round(parsed));
        },
        mountDropPlaceholder(stackValue, index) {
            if (!this.isDragging) return;
            const body = this.getStackBodyElement(stackValue);
            if (!body) {
                this.clearDropPlaceholder();
                return;
            }

            const placeholder = this.ensureDropPlaceholder();
            if (!placeholder) return;

            const cards = Array.from(body.querySelectorAll(".ww-kanban-card")).filter(
                cardEl => !cardEl.classList.contains("is-drag-source") && !this.isDesktopSourceCardElement(cardEl, stackValue)
            );
            const clampedIndex = this.clampIndex(index, cards.length);
            const stackKey = this.getStackDomKey(stackValue);

            placeholder.style.height = `${this.dropPlaceholderHeight}px`;
            if (
                this.dropPlaceholderStackKey === stackKey &&
                this.dropPlaceholderIndex === clampedIndex &&
                placeholder.parentElement === body
            ) {
                return;
            }

            if (clampedIndex >= cards.length) {
                body.appendChild(placeholder);
            } else {
                body.insertBefore(placeholder, cards[clampedIndex]);
            }

            this.dropPlaceholderStackKey = stackKey;
            this.dropPlaceholderIndex = clampedIndex;
        },
        setDropLocation(stackValue, index, renderPlaceholder = true) {
            this.setDropTargetStack(stackValue);
            if (!Number.isFinite(index)) {
                this.setDropTargetIndex(null);
                this.clearDropPlaceholder();
                return;
            }
            const maxIndex = this.getStackItemsByValue(stackValue).length;
            const normalizedIndex = this.clampIndex(index, maxIndex);
            this.setDropTargetIndex(normalizedIndex);
            if (renderPlaceholder) {
                this.mountDropPlaceholder(stackValue, normalizedIndex);
            }
        },
        getDesktopDropTarget(clientX, clientY) {
            if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
            const root = this.$refs.kanbanRoot;
            if (!root) return null;

            const doc = wwLib.getFrontDocument();
            const pointElement = doc.elementFromPoint(clientX, clientY);
            let stackEl = pointElement?.closest(".ww-kanban-stack") || null;
            if (stackEl && !root.contains(stackEl)) {
                stackEl = null;
            }

            if (!stackEl) {
                const stackElements = Array.from(root.querySelectorAll(".ww-kanban-stack"));
                if (!stackElements.length) return null;

                stackEl =
                    stackElements.find(el => {
                        const rect = el.getBoundingClientRect();
                        return clientX >= rect.left && clientX <= rect.right;
                    }) ||
                    stackElements.reduce((nearestEl, currentEl) => {
                        if (!nearestEl) return currentEl;
                        const nearestRect = nearestEl.getBoundingClientRect();
                        const currentRect = currentEl.getBoundingClientRect();
                        const nearestDistance = Math.abs(clientX - (nearestRect.left + nearestRect.width / 2));
                        const currentDistance = Math.abs(clientX - (currentRect.left + currentRect.width / 2));
                        return currentDistance < nearestDistance ? currentEl : nearestEl;
                    }, null);
            }
            if (!stackEl) return null;

            const stackKey = stackEl.dataset.stackKey;
            if (!(stackKey in this.stackKeyLookup)) return null;
            const toStack = this.stackKeyLookup[stackKey];
            const cards = Array.from(stackEl.querySelectorAll(".ww-kanban-card")).filter(
                cardEl => !this.isDesktopSourceCardElement(cardEl, toStack)
            );
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
        runDesktopAutoScroll(clientX, clientY) {
            if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
            const root = this.$refs.kanbanRoot;
            if (!root) return;

            const rootRect = root.getBoundingClientRect();
            const deltaX = this.computeEdgeAutoScrollDelta(
                clientX,
                rootRect.left,
                rootRect.right,
                this.touchAutoScrollEdgeSize,
                this.touchAutoScrollMaxStepX
            );
            if (deltaX !== 0) {
                root.scrollLeft += deltaX;
            }

            const stackBody = this.getNearestStackBody(clientX, clientY);
            if (!stackBody) return;
            const stackRect = stackBody.getBoundingClientRect();
            const deltaY = this.computeEdgeAutoScrollDelta(
                clientY,
                stackRect.top,
                stackRect.bottom,
                this.touchAutoScrollEdgeSize,
                this.touchAutoScrollMaxStepY
            );
            if (deltaY !== 0) {
                stackBody.scrollTop += deltaY;
            }
        },
        onDesktopDragOverGlobal(event) {
            if (!this.desktopDrag) return;
            const clientX = event.clientX;
            const clientY = event.clientY;
            if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
            if (event.cancelable) event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";

            this.runDesktopAutoScroll(clientX, clientY);
            const target = this.getDesktopDropTarget(clientX, clientY);
            if (target) {
                this.setDropLocation(target.toStack, target.newIndex);
            }
        },
        attachDesktopListeners() {
            if (this.desktopListenersAttached) return;
            const doc = wwLib.getFrontDocument();
            doc.addEventListener("dragover", this.onDesktopDragOverGlobal, { capture: true, passive: false });
            this.desktopListenersAttached = true;
        },
        detachDesktopListeners() {
            if (!this.desktopListenersAttached) return;
            const doc = wwLib.getFrontDocument();
            doc.removeEventListener("dragover", this.onDesktopDragOverGlobal, true);
            this.desktopListenersAttached = false;
        },
        getDesktopDropIndex(toStack, clientY) {
            const body = this.getStackBodyElement(toStack);
            if (!body) return this.getStackItemsByValue(toStack).length;
            const cards = Array.from(body.querySelectorAll(".ww-kanban-card")).filter(
                cardEl => !cardEl.classList.contains("is-drag-source") && !this.isDesktopSourceCardElement(cardEl, toStack)
            );
            for (let index = 0; index < cards.length; index += 1) {
                const rect = cards[index].getBoundingClientRect();
                if (clientY < rect.top + rect.height / 2) {
                    return index;
                }
            }
            return cards.length;
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
        stripHtml(value) {
            const text = typeof value === "string" ? value : String(value ?? "");
            if (!text) return "";
            if (!/[<>]/.test(text)) return text.trim();

            try {
                const doc = wwLib.getFrontDocument?.();
                if (!doc) return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                const temp = doc.createElement("div");
                temp.innerHTML = text;
                return (temp.textContent || temp.innerText || "").replace(/\s+/g, " ").trim();
            } catch (e) {
                return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
            }
        },
        normalizeDisplayValue(value) {
            if (value === null || value === undefined) return "";
            if (typeof value === "string") return this.stripHtml(value);
            if (typeof value === "number" || typeof value === "boolean") return String(value);
            return "";
        },
        getStackLabel(stack) {
            const value = this.normalizeDisplayValue(stack?.label);
            return value || "Untitled";
        },
        isLikelyImageUrl(value) {
            if (typeof value !== "string") return false;
            const text = value.trim();
            if (!text) return false;
            if (/^data:image\//i.test(text)) return true;
            return /\.(apng|avif|bmp|gif|ico|jpe?g|png|svg|webp)(\?.*)?$/i.test(text);
        },
        getItemImage(item) {
            if (!item || typeof item !== "object") return "";
            const imagePaths = [
                this.content.itemImage,
                "image",
                "imageUrl",
                "img",
                "thumbnail",
                "photo",
                "avatar",
                "cover",
            ].filter(Boolean);
            for (const path of imagePaths) {
                const value = wwLib.resolveObjectPropertyPath(item, path);
                const normalizedValue = typeof value === "string" ? value.trim() : "";
                if (normalizedValue && (path === this.content.itemImage || this.isLikelyImageUrl(normalizedValue))) {
                    return normalizedValue;
                }
            }
            return "";
        },
        getAutoLabelFromItemObject(item) {
            const preferredPaths = ["title", "name", "label", "text", "content", "description", "summary", "task"];
            for (const path of preferredPaths) {
                const value = wwLib.resolveObjectPropertyPath(item, path);
                const normalized = this.normalizeDisplayValue(value);
                if (normalized) return normalized;
            }

            for (const [key, value] of Object.entries(item)) {
                if (key === this.content.itemKey) continue;
                if (/^id$|_id$|Id$|status$|state$|stack$|column$/i.test(key)) continue;
                if (typeof value !== "string") continue;
                const normalized = this.normalizeDisplayValue(value);
                if (!normalized) continue;
                if (this.isLikelyImageUrl(normalized)) continue;
                return normalized;
            }

            return "";
        },
        getItemLabel(item, index) {
            if (item === null || item === undefined) return "";
            if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
                return this.normalizeDisplayValue(item);
            }

            let configuredNumericFallback = "";
            if (this.content.itemLabel) {
                const configuredLabel = wwLib.resolveObjectPropertyPath(item, this.content.itemLabel);
                if (typeof configuredLabel === "string") {
                    const normalizedConfiguredLabel = this.normalizeDisplayValue(configuredLabel);
                    if (normalizedConfiguredLabel) return normalizedConfiguredLabel;
                } else if (typeof configuredLabel === "number" || typeof configuredLabel === "boolean") {
                    configuredNumericFallback = String(configuredLabel);
                }
            }

            const inferredLabel = this.getAutoLabelFromItemObject(item);
            if (inferredLabel) return inferredLabel;
            if (configuredNumericFallback) return configuredNumericFallback;

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
        setObjectPropertyByPath(target, path, value) {
            if (!target || typeof target !== "object" || !path) return;
            const normalizedPath = String(path).replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "");
            const keys = normalizedPath.split(".").filter(Boolean);
            if (!keys.length) return;
            let current = target;
            for (let index = 0; index < keys.length - 1; index += 1) {
                const key = keys[index];
                if (!current[key] || typeof current[key] !== "object") {
                    current[key] = {};
                }
                current = current[key];
            }
            current[keys[keys.length - 1]] = value;
        },
        applyLocalMove(payload) {
            if (!payload) return;
            const fromItems = this.getStackItemsByValue(payload.from);
            const toItems = this.getStackItemsByValue(payload.to);
            if (!Array.isArray(fromItems) || !Array.isArray(toItems)) return;

            if (this.valuesEqual(payload.from, payload.to)) {
                if (payload.oldIndex < 0 || payload.oldIndex >= fromItems.length) return;
                const movedItem = fromItems.splice(payload.oldIndex, 1)[0];
                const targetIndex = this.clampIndex(payload.newIndex, fromItems.length);
                fromItems.splice(targetIndex, 0, movedItem);
                return;
            }

            if (payload.oldIndex < 0 || payload.oldIndex >= fromItems.length) return;
            const movedItem = fromItems.splice(payload.oldIndex, 1)[0];
            const targetIndex = this.clampIndex(payload.newIndex, toItems.length);
            toItems.splice(targetIndex, 0, movedItem);

            if (this.content.stackedBy) {
                this.setObjectPropertyByPath(movedItem, this.content.stackedBy, payload.to);
            }
        },
        finalizeMove(dragContext, toStack, newIndex) {
            const payload = this.prepareMovePayload(dragContext, toStack, newIndex);
            if (!payload) return;
            this.applyLocalMove(payload);
            this.emitMove({
                ...payload,
                updatedList: [...this.getStackItemsByValue(payload.to)],
            });
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
            if (!this.nativeDesktopDragEnabled) {
                event.preventDefault();
                return;
            }
            this.desktopDrag = { item, fromStack, oldIndex };
            this.suppressClickUntil = Date.now() + 300;
            this.isDragging = true;
            const sourceEl = event.currentTarget?.closest?.(".ww-kanban-card") || event.currentTarget;
            if (sourceEl) {
                const rect = sourceEl.getBoundingClientRect();
                this.setDropPlaceholderHeight(rect?.height);
            }
            // Avoid mutating list layout during native dragstart to keep desktop drag preview stable.
            this.setDropLocation(fromStack, oldIndex, false);
            this.clearDropPlaceholder();
            this.hideGhost();
            this.attachDesktopListeners();
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", "kanban-move");
            }
        },
        onDesktopDragEnd() {
            this.desktopDrag = null;
            this.setDropTargetIndex(null);
            this.clearDropTargetStack();
            this.clearDropPlaceholder();
            this.detachDesktopListeners();
            if (!this.touchDragContext) this.isDragging = false;
        },
        onCardDragOver(event, toStack, _itemIndex) {
            if (!this.desktopDrag) return;
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            const index = this.getDesktopDropIndex(toStack, event.clientY);
            this.setDropLocation(toStack, index);
        },
        onCardDrop(event, toStack, _cardIndex) {
            if (!this.desktopDrag) return;
            const hasTrackedIndex =
                this.valuesEqual(this.dropTargetStack, toStack) && Number.isFinite(this.dropTargetIndex);
            const insertIndex = hasTrackedIndex ? this.dropTargetIndex : this.getDesktopDropIndex(toStack, event.clientY);
            this.finalizeMove(this.desktopDrag, toStack, insertIndex);
            this.onDesktopDragEnd();
        },
        onStackDragOver(event, toStack) {
            if (!this.desktopDrag) return;
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            this.setDropLocation(toStack, this.getDesktopDropIndex(toStack, event.clientY));
        },
        onStackDrop(event, toStack) {
            if (!this.desktopDrag) return;
            const hasTrackedIndex =
                this.valuesEqual(this.dropTargetStack, toStack) && Number.isFinite(this.dropTargetIndex);
            const insertIndex = hasTrackedIndex
                ? this.dropTargetIndex
                : Number.isFinite(event?.clientY)
                ? this.getDesktopDropIndex(toStack, event.clientY)
                : this.getStackItemsByValue(toStack).length;
            this.finalizeMove(this.desktopDrag, toStack, insertIndex);
            this.onDesktopDragEnd();
        },
        onCardClick(item, stackValue, itemIndex, event) {
            if (!event?.isTrusted) return;
            if (Date.now() < this.suppressClickUntil) return;
            if (this.touchPressTimer || this.touchDragContext || this.desktopDrag || this.isDragging) return;
            if (this.content.customDragHandle && this.matchesHandleTarget(event.target)) return;

            this.$emit("trigger-event", {
                name: "item:clicked",
                event: {
                    item,
                    stack: stackValue,
                    index: itemIndex,
                    itemKey: this.getItemIdentity(item, itemIndex),
                },
            });
        },
        isAddCardComposerOpen(stackValue) {
            return this.addCardComposerStackKey === this.getStackDomKey(stackValue ?? null);
        },
        openAddCardComposer(stack, event) {
            if (!event?.isTrusted) return;
            const stackValue = stack?.value ?? null;
            const stackKey = this.getStackDomKey(stackValue);
            this.addCardComposerStackKey = stackKey;
            this.addCardDraft = "";
            this.$nextTick(() => {
                const root = this.$refs.kanbanRoot;
                const stackElements = Array.from(root?.querySelectorAll?.(".ww-kanban-stack") || []);
                const stackEl = stackElements.find(element => element.dataset.stackKey === stackKey);
                const inputEl = stackEl?.querySelector?.(".ww-kanban-add-card-input");
                inputEl?.focus?.();
            });
        },
        cancelAddCardComposer() {
            this.addCardDraft = "";
            this.addCardComposerStackKey = null;
        },
        onAddCardInput(event) {
            this.addCardDraft = String(event?.target?.value ?? "");
        },
        buildAddCardEventPayload(stack, title) {
            const stackValue = stack?.value ?? null;
            const normalizedTitle = String(title ?? "").trim();
            const defaultItem = {};
            if (normalizedTitle) {
                this.setObjectPropertyByPath(defaultItem, this.content.itemLabel || "title", normalizedTitle);
            }
            if (this.content.stackedBy) {
                this.setObjectPropertyByPath(defaultItem, this.content.stackedBy, stackValue);
            }
            return {
                stack: stackValue,
                stackValue,
                stackLabel: this.getStackLabel(stack),
                title: normalizedTitle,
                stackedBy: this.content.stackedBy || null,
                defaultItem,
            };
        },
        onAddCardSubmit(stack, event) {
            if (event) event.preventDefault?.();
            const title = this.addCardDraft.trim();
            if (!title) return;
            this.$emit("trigger-event", {
                name: "add-card:clicked",
                event: this.buildAddCardEventPayload(stack, title),
            });
            this.addCardDraft = "";
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
            this.ghostCard.style.left = `${clientX - this.ghostCard.offsetX}px`;
            this.ghostCard.style.top = `${clientY - this.ghostCard.offsetY}px`;
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
            this.stopTouchAutoScroll();
            this.detachDesktopListeners();
            if (this.touchDragCapturedEl && this.touchPointerId !== null) {
                try {
                    this.touchDragCapturedEl.releasePointerCapture?.(this.touchPointerId);
                } catch (e) {
                    // ignore
                }
            }
            this.touchDragCapturedEl = null;
            if (this.touchDragContext?.sourceEl) {
                this.touchDragContext.sourceEl.classList.remove("is-drag-source");
            }
            this.touchDragContext = null;
            this.touchPointerId = null;
            this.touchIdentifier = null;
            this.setDropTargetIndex(null);
            this.clearDropTargetStack();
            this.clearDropPlaceholder();
            this.hideGhost();
            this.unlockTouchScroll();
            if (!this.desktopDrag) this.isDragging = false;
        },
        supportsNativeTouchEvents() {
            try {
                const win = wwLib.getFrontWindow?.() || (typeof window !== "undefined" ? window : null);
                if (!win) return false;
                return "ontouchstart" in win || typeof win.TouchEvent !== "undefined";
            } catch (e) {
                return false;
            }
        },
        getTouchByIdentifier(touchList, identifier) {
            if (!touchList || identifier === null || identifier === undefined) return null;
            const touches = Array.from(touchList);
            return touches.find(touch => touch.identifier === identifier) || null;
        },
        getNearestTouch(touchList, referenceX, referenceY) {
            if (!touchList) return null;
            const touches = Array.from(touchList);
            if (!touches.length) return null;
            return touches.reduce((nearestTouch, currentTouch) => {
                if (!nearestTouch) return currentTouch;
                const nearestDistance = Math.hypot(nearestTouch.clientX - referenceX, nearestTouch.clientY - referenceY);
                const currentDistance = Math.hypot(currentTouch.clientX - referenceX, currentTouch.clientY - referenceY);
                return currentDistance < nearestDistance ? currentTouch : nearestTouch;
            }, null);
        },
        resolveActiveTouch(event) {
            if (!event) return null;
            if (this.touchIdentifier !== null) {
                return (
                    this.getTouchByIdentifier(event.touches, this.touchIdentifier) ||
                    this.getTouchByIdentifier(event.changedTouches, this.touchIdentifier)
                );
            }

            const referenceX = Number.isFinite(this.touchLastClientX) ? this.touchLastClientX : this.touchPressStartX;
            const referenceY = Number.isFinite(this.touchLastClientY) ? this.touchLastClientY : this.touchPressStartY;
            const nearestTouch =
                this.getNearestTouch(event.touches, referenceX, referenceY) ||
                this.getNearestTouch(event.changedTouches, referenceX, referenceY);
            if (nearestTouch) {
                this.touchIdentifier = nearestTouch.identifier;
            }
            return nearestTouch;
        },
        didActiveTouchEnd(event) {
            const changedTouches = Array.from(event?.changedTouches || []);
            if (!changedTouches.length) return false;
            if (this.touchIdentifier !== null) {
                return changedTouches.some(touch => touch.identifier === this.touchIdentifier);
            }
            if (changedTouches.length === 1) {
                this.touchIdentifier = changedTouches[0].identifier;
                return true;
            }
            return false;
        },
        computeEdgeAutoScrollDelta(pointer, start, end, edgeSize, maxStep) {
            if (!Number.isFinite(pointer) || !Number.isFinite(start) || !Number.isFinite(end)) return 0;
            const safeEdge = Math.max(24, Number(edgeSize) || 64);
            const safeMaxStep = Math.max(2, Number(maxStep) || 18);
            if (end <= start) return 0;

            const minTrigger = start + safeEdge;
            const maxTrigger = end - safeEdge;

            if (pointer < minTrigger) {
                const ratio = Math.min(1, (minTrigger - pointer) / safeEdge);
                return -Math.max(2, Math.round(safeMaxStep * ratio * ratio));
            }

            if (pointer > maxTrigger) {
                const ratio = Math.min(1, (pointer - maxTrigger) / safeEdge);
                return Math.max(2, Math.round(safeMaxStep * ratio * ratio));
            }

            return 0;
        },
        getNearestStackBody(clientX, clientY) {
            const root = this.$refs.kanbanRoot;
            if (!root) return null;

            const doc = wwLib.getFrontDocument();
            const pointElement = doc.elementFromPoint(clientX, clientY);
            const directBody = pointElement?.closest(".ww-kanban-stack-body");
            if (directBody && root.contains(directBody)) return directBody;

            const directStack = pointElement?.closest(".ww-kanban-stack");
            if (directStack && root.contains(directStack)) {
                const body = directStack.querySelector(".ww-kanban-stack-body");
                if (body) return body;
            }

            const stackElements = Array.from(root.querySelectorAll(".ww-kanban-stack"));
            if (!stackElements.length) return null;

            const nearestStack = stackElements.reduce((nearestEl, currentEl) => {
                if (!nearestEl) return currentEl;
                const nearestRect = nearestEl.getBoundingClientRect();
                const currentRect = currentEl.getBoundingClientRect();
                const nearestDistance = Math.abs(clientX - (nearestRect.left + nearestRect.width / 2));
                const currentDistance = Math.abs(clientX - (currentRect.left + currentRect.width / 2));
                return currentDistance < nearestDistance ? currentEl : nearestEl;
            }, null);

            return nearestStack?.querySelector(".ww-kanban-stack-body") || null;
        },
        runTouchAutoScrollStep() {
            if (!this.touchDragContext) return;
            const root = this.$refs.kanbanRoot;
            if (!root) return;

            const clientX = this.touchLastClientX;
            const clientY = this.touchLastClientY;

            const rootRect = root.getBoundingClientRect();
            const deltaX = this.computeEdgeAutoScrollDelta(
                clientX,
                rootRect.left,
                rootRect.right,
                this.touchAutoScrollEdgeSize,
                this.touchAutoScrollMaxStepX
            );
            if (deltaX !== 0) {
                root.scrollLeft += deltaX;
            }

            const stackBody = this.getNearestStackBody(clientX, clientY);
            if (!stackBody) return;
            const stackRect = stackBody.getBoundingClientRect();
            const deltaY = this.computeEdgeAutoScrollDelta(
                clientY,
                stackRect.top,
                stackRect.bottom,
                this.touchAutoScrollEdgeSize,
                this.touchAutoScrollMaxStepY
            );
            if (deltaY !== 0) {
                stackBody.scrollTop += deltaY;
            }

            const target = this.getTouchDropTarget(clientX, clientY);
            if (target) {
                this.setDropLocation(target.toStack, target.newIndex);
            }
        },
        startTouchAutoScroll() {
            if (this.touchAutoScrollRaf !== null) return;
            const frontWindow = wwLib.getFrontWindow?.() || (typeof window !== "undefined" ? window : null);
            if (!frontWindow?.requestAnimationFrame) return;
            this.touchAutoScrollRunning = true;

            const tick = () => {
                this.touchAutoScrollRaf = null;
                if (!this.touchDragContext) return;
                this.runTouchAutoScrollStep();
                this.touchAutoScrollRaf = frontWindow.requestAnimationFrame(tick);
            };

            this.touchAutoScrollRaf = frontWindow.requestAnimationFrame(tick);
        },
        stopTouchAutoScroll() {
            this.touchAutoScrollRunning = false;
            if (this.touchAutoScrollRaf === null) return;
            const frontWindow = wwLib.getFrontWindow?.() || (typeof window !== "undefined" ? window : null);
            frontWindow?.cancelAnimationFrame?.(this.touchAutoScrollRaf);
            this.touchAutoScrollRaf = null;
        },
        isCardDragSource(stackValue, itemIndex) {
            return (
                !!this.touchDragContext &&
                this.valuesEqual(this.touchDragContext.fromStack, stackValue) &&
                this.touchDragContext.oldIndex === itemIndex
            );
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

            let stackEl = pointElement?.closest(".ww-kanban-stack") || null;
            if (!stackEl) {
                const root = this.$refs.kanbanRoot;
                const stackElements = Array.from(root?.querySelectorAll(".ww-kanban-stack") || []);
                if (!stackElements.length) return null;

                stackEl =
                    stackElements.find(el => {
                        const rect = el.getBoundingClientRect();
                        return clientX >= rect.left && clientX <= rect.right;
                    }) ||
                    stackElements.reduce((nearestEl, currentEl) => {
                        if (!nearestEl) return currentEl;
                        const nearestRect = nearestEl.getBoundingClientRect();
                        const currentRect = currentEl.getBoundingClientRect();
                        const nearestDistance = Math.abs(clientX - (nearestRect.left + nearestRect.width / 2));
                        const currentDistance = Math.abs(clientX - (currentRect.left + currentRect.width / 2));
                        return currentDistance < nearestDistance ? currentEl : nearestEl;
                    }, null);
            }
            if (!stackEl) return null;

            const stackKey = stackEl.dataset.stackKey;
            if (!(stackKey in this.stackKeyLookup)) return null;
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
            this.suppressClickUntil = Date.now() + 500;
            this.isDragging = true;
            this.setDropTargetStack(this.touchDragContext.fromStack);
            const sourceRect = this.touchDragContext.sourceEl?.getBoundingClientRect?.();
            this.setDropPlaceholderHeight(sourceRect?.height);
            this.touchDragContext.sourceEl.classList.add("is-drag-source");
            try {
                this.touchDragContext.sourceEl.setPointerCapture?.(this.touchPointerId);
                this.touchDragCapturedEl = this.touchDragContext.sourceEl;
            } catch (e) {
                this.touchDragCapturedEl = null;
            }
            this.showGhost(this.touchDragContext.sourceEl, clientX, clientY);
            this.lockTouchScroll();
            this.touchLastClientX = clientX;
            this.touchLastClientY = clientY;
            this.setDropLocation(this.touchDragContext.fromStack, this.touchDragContext.oldIndex);
            this.startTouchAutoScroll();
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
            this.touchIdentifier = null;
            this.touchPressStartX = event.clientX;
            this.touchPressStartY = event.clientY;
            this.touchLastClientX = event.clientX;
            this.touchLastClientY = event.clientY;
            this.clearTouchPress();
            this.touchPressContext = { item, fromStack, oldIndex, sourceEl: cardEl };

            // On touch, always use long-press before drag to preserve natural scroll gestures.
            const delay = Number.isFinite(Number(this.content.longPressDelay))
                ? Math.max(250, Number(this.content.longPressDelay))
                : 400;
            this.touchPressTimer = setTimeout(() => {
                this.touchPressTimer = null;
                this.startTouchDrag(this.touchPressStartX, this.touchPressStartY);
            }, delay);
        },
        onTouchPointerMove(event) {
            if (event.pointerType !== "touch") return;
            if (this.touchPointerId === null || event.pointerId !== this.touchPointerId) return;
            this.touchLastClientX = event.clientX;
            this.touchLastClientY = event.clientY;

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
                if (!this.touchAutoScrollRunning) {
                    const target = this.getTouchDropTarget(event.clientX, event.clientY);
                    if (target) {
                        this.setDropLocation(target.toStack, target.newIndex);
                    }
                }
            }
        },
        onNativeTouchMove(event) {
            const primaryTouch = this.resolveActiveTouch(event);
            if (primaryTouch) {
                this.touchLastClientX = primaryTouch.clientX;
                this.touchLastClientY = primaryTouch.clientY;
            }

            if (this.touchPressTimer && primaryTouch) {
                const dx = primaryTouch.clientX - this.touchPressStartX;
                const dy = primaryTouch.clientY - this.touchPressStartY;
                if (Math.hypot(dx, dy) > this.touchMoveThreshold) {
                    this.clearTouchPress();
                    this.touchPointerId = null;
                    return;
                }
            }

            if (this.touchDragContext) {
                if (primaryTouch) this.moveGhost(primaryTouch.clientX, primaryTouch.clientY);
                if (primaryTouch && !this.touchAutoScrollRunning) {
                    const target = this.getTouchDropTarget(primaryTouch.clientX, primaryTouch.clientY);
                    if (target) {
                        this.setDropLocation(target.toStack, target.newIndex);
                    }
                }
                if (event.cancelable) event.preventDefault();
            }
        },
        onNativeTouchEnd(event) {
            if (this.touchPointerId === null) return;
            if (!this.didActiveTouchEnd(event)) return;
            if (this.touchDragContext) {
                const primaryTouch = this.resolveActiveTouch(event) || event.changedTouches?.[0];
                const clientX = primaryTouch?.clientX ?? this.touchLastClientX;
                const clientY = primaryTouch?.clientY ?? this.touchLastClientY;
                const target = this.getTouchDropTarget(clientX, clientY);
                if (target) {
                    this.finalizeMove(this.touchDragContext, target.toStack, target.newIndex);
                }
            }
            this.clearTouchInteraction();
        },
        onNativeTouchCancel(event) {
            if (this.touchPointerId === null && !this.touchDragContext && !this.touchPressTimer) return;
            if (event && !this.didActiveTouchEnd(event)) return;
            this.clearTouchInteraction();
        },
        onTouchPointerUp(event) {
            if (event.pointerType !== "touch") return;
            if (this.touchPointerId === null || event.pointerId !== this.touchPointerId) return;
            if (this.supportsNativeTouchEvents()) return;

            if (this.touchDragContext) {
                const target = this.getTouchDropTarget(event.clientX, event.clientY);
                if (target) {
                    this.finalizeMove(this.touchDragContext, target.toStack, target.newIndex);
                }
            }

            this.clearTouchInteraction();
        },
        onTouchPointerCancel(event) {
            if (event.pointerType !== "touch") return;
            if (this.touchPointerId === null || event.pointerId !== this.touchPointerId) return;
            if (this.supportsNativeTouchEvents()) return;
            this.clearTouchInteraction();
        },
        attachTouchListeners() {
            if (this.touchListenersAttached) return;
            const root = this.$refs.kanbanRoot;
            if (!root) return;

            const doc = wwLib.getFrontDocument();
            root.addEventListener("pointerdown", this.onTouchPointerDown, true);
            doc.addEventListener("pointermove", this.onTouchPointerMove, { capture: true, passive: false });
            doc.addEventListener("touchmove", this.onNativeTouchMove, { capture: true, passive: false });
            doc.addEventListener("pointerup", this.onTouchPointerUp, true);
            doc.addEventListener("pointercancel", this.onTouchPointerCancel, true);
            doc.addEventListener("touchend", this.onNativeTouchEnd, true);
            doc.addEventListener("touchcancel", this.onNativeTouchCancel, true);
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
            doc.removeEventListener("touchmove", this.onNativeTouchMove, true);
            doc.removeEventListener("pointerup", this.onTouchPointerUp, true);
            doc.removeEventListener("pointercancel", this.onTouchPointerCancel, true);
            doc.removeEventListener("touchend", this.onNativeTouchEnd, true);
            doc.removeEventListener("touchcancel", this.onNativeTouchCancel, true);
            this.touchListenersAttached = false;
        },
        /* wwEditor:start */
        getTestAddCardEvent() {
            if (!this.renderStacks.length) throw new Error("No stack found");
            const firstStack = this.renderStacks[0];
            return this.buildAddCardEventPayload(firstStack, "Test card");
        },
        getTestClickEvent() {
            if (!this.renderStacks.length) throw new Error("No stack found");
            const firstStack = this.renderStacks[0];
            if (!firstStack?.items?.length) throw new Error("No item found");
            const item = firstStack.items[0];
            return {
                item,
                stack: firstStack.value,
                index: 0,
                itemKey: this.getItemIdentity(item, 0),
            };
        },
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
        this.detachDesktopListeners();
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
    gap: var(--ww-board-gap);
    overflow-x: auto;
    overflow-y: hidden;
    width: 100%;
    height: 100%;
    padding: var(--ww-board-padding);
    background: var(--ww-board-bg);
    font-family: var(--ww-font-family);
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x pan-y;
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.ww-kanban::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
}

.ww-kanban.is-touch-dragging {
    overflow-x: auto;
    overflow-y: hidden;
    touch-action: none;
}

.ww-kanban-stack {
    --add-card-block-height: var(--ww-add-card-block-height);
    --stack-block-gap: var(--ww-stack-block-gap);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    width: var(--ww-stack-width);
    height: var(--ww-stack-height);
    border: none;
    background: transparent;
    overflow: visible;
    gap: var(--stack-block-gap);
    position: relative;
    z-index: 0;
}

.ww-kanban-stack-panel {
    display: flex;
    flex-direction: column;
    flex: 0 1 auto;
    min-height: 0;
    border-radius: 11px;
    border: 1px solid var(--ww-panel-border-color);
    background: var(--ww-panel-bg);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
    padding: 10px;
    overflow: hidden;
}

.ww-kanban-stack.has-add-card .ww-kanban-stack-panel {
    max-height: calc(100% - var(--add-card-block-height) - var(--stack-block-gap));
}

.ww-kanban-stack:not(.has-add-card) .ww-kanban-stack-panel {
    max-height: 100%;
}

.ww-kanban-stack-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 2px 2px 10px;
    font-size: var(--ww-header-font-size);
    font-weight: var(--ww-header-font-weight);
    color: var(--ww-header-text-color);
    background: transparent;
}

.ww-kanban-stack-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ww-kanban-stack-count {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    border-radius: 999px;
    border: 1px solid var(--ww-count-border-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: var(--ww-count-text-color);
    background: var(--ww-count-bg);
}

.ww-kanban-stack-body {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    gap: 10px;
    padding: 0 1px 1px;
    overflow-y: auto;
    overflow-x: hidden;
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.ww-kanban-stack-body::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
}

.ww-drop-placeholder {
    flex: 0 0 auto;
    border-radius: var(--ww-card-radius);
    background: var(--ww-drop-placeholder-color);
    pointer-events: none;
}

.ww-kanban-stack-footer {
    padding: 1px;
    // border: 1px solid var(--ww-add-button-border-color);
    border-radius: 10px;
    background: var(--ww-panel-bg);
    height: var(--add-card-block-height);
    flex: 0 0 var(--add-card-block-height);
    box-sizing: border-box;
}

.ww-kanban-stack-footer.is-composer-open {
    padding: 0;
    border: none;
    background: transparent;
    height: auto;
    flex: 0 0 auto;
}

.ww-kanban-add-card-button {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    // border: 1px solid var(--ww-add-button-border-color);
    border-radius: 8px;
    padding: 7px 10px;
    font-size: var(--ww-add-button-font-size);
    font-weight: 600;
    color: var(--ww-add-button-text-color);
    background: var(--ww-add-button-bg);
    cursor: pointer;
}

// .ww-kanban-add-card-button:hover {
//     background: var(--ww-add-button-bg-hover);
// }

.ww-kanban-add-card-composer {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ww-kanban-add-card-input {
    width: 100%;
    min-height: var(--ww-add-input-min-height);
    border: 1px solid var(--ww-add-input-border-color);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: var(--ww-add-input-font-size);
    line-height: 1.35;
    resize: none;
    background: var(--ww-add-input-bg);
    color: var(--ww-add-input-text-color);
    font-family: var(--ww-font-family);
}

.ww-kanban-add-card-input:focus {
    outline: none;
    // border-color: #3b82f6;
    box-shadow: 0 0 0 0px rgba(59, 130, 246, 0.2);
}

.ww-kanban-add-card-input::placeholder {
    color: var(--ww-add-input-placeholder-color);
}

.ww-kanban-add-card-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.ww-kanban-add-card-submit {
    border: 1px solid var(--ww-add-submit-border-color);
    border-radius: 6px;
    background: var(--ww-add-submit-bg);
    color: var(--ww-add-submit-text-color);
    font-size: var(--ww-add-submit-font-size);
    font-weight: 600;
    padding: 7px 12px;
    cursor: pointer;
    font-family: var(--ww-font-family);
}

.ww-kanban-add-card-submit:hover {
    background: var(--ww-add-submit-bg-hover);
}

.ww-kanban-add-card-submit:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.ww-kanban-add-card-cancel {
    border: none;
    background: transparent;
    color: #000000;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0;
    // border-radius: 6px;
    cursor: pointer;
}

// .ww-kanban-add-card-cancel:hover {
//     color: #111827;
//     background: rgba(15, 23, 42, 0.06);
// }

.ww-kanban-add-card-cancel-icon {
    width: 24px;
    height: 24px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1;
    stroke-linecap: round;
}

.ww-kanban-add-card-icon {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: currentColor;
}

.ww-kanban-add-card-icon-svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
}

.ww-kanban-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border: 1px solid var(--ww-card-border-color);
    border-radius: var(--ww-card-radius);
    background: var(--ww-card-bg);
    color: var(--ww-card-text-color);
    padding: var(--ww-card-padding);
    min-height: var(--ww-card-min-height);
    box-sizing: border-box;
    user-select: none;
    -webkit-user-select: none;
    touch-action: auto;
    transition: border-color 120ms ease, box-shadow 120ms ease;
    font-family: var(--ww-font-family);
}

.ww-kanban-card:hover {
    border-color: var(--ww-card-hover-border-color);
    box-shadow: 0 0 0 1px var(--ww-card-hover-ring-color);
}

.ww-kanban-card:focus-within {
    border-color: var(--ww-card-hover-border-color);
    box-shadow: 0 0 0 1px var(--ww-card-hover-ring-color);
}

.ww-kanban-card.is-drag-source {
    opacity: 0.35;
}

.ww-kanban-card-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    flex: 1 1 auto;
}

.ww-kanban-card-image {
    width: 100%;
    max-height: 160px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid rgba(20, 24, 33, 0.1);
}

.ww-kanban-card-text {
    font-size: var(--ww-card-font-size);
    line-height: 1.3;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
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
