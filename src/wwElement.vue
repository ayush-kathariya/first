<template>
    <div
        class="ww-kanban"
        :class="{ 'is-touch-dragging': !!touchDragContext }"
        :style="kanbanStyle"
        v-bind="wwElementState?.$attrs"
        ref="kanbanRoot"
    >
        <template v-for="(stack, stackIndex) in renderStacks" :key="getStackRenderKey(stack.value, stackIndex)">
            <wwLayoutItemContext :index="stackIndex" :item="null" :data="stack" :repeated-items="renderStacks" is-repeat>
                <section
                    class="ww-kanban-stack"
                    :class="{
                        'has-add-card': canShowAddCardForStack(stackIndex),
                    }"
                    :data-stack-key="getStackRenderKey(stack.value, stackIndex)"
                    @dragover.prevent="onStackDragOver($event, stack.value, stackIndex)"
                    @drop.prevent="onStackDrop($event, stack.value, stackIndex)"
                >
                    <div class="ww-kanban-stack-panel">
                        <header class="ww-kanban-stack-header">
                            <span class="ww-kanban-stack-title">{{ getStackLabel(stack) }}</span>
                            <span class="ww-kanban-stack-count">{{ stack.items.length }}</span>
                        </header>

                        <div class="ww-kanban-stack-body">
                            <template v-for="(item, itemIndex) in stack.items" :key="getCardKey(item, itemIndex, stack.value, stackIndex)">
                                <wwLayoutItemContext
                                    :index="itemIndex"
                                    :item="item"
                                    :data="getItemLayoutData(item, itemIndex, stack, stackIndex)"
                                    :repeated-items="stack.items"
                                    is-repeat
                                >
                                    <article
                                        class="ww-kanban-card"
                                        :class="{
                                            'is-drag-source': isCardDragSource(stack.value, itemIndex),
                                            'has-fixed-height': hasFixedCardHeight,
                                        }"
                                        :data-item-index="itemIndex"
                                        :data-item-key="String(getItemIdentity(item, itemIndex))"
                                        :draggable="nativeDesktopDragEnabled && !content.customDragHandle"
                                        @dragstart="onDesktopDragStart($event, item, stack.value, itemIndex)"
                                        @dragend="onDesktopDragEnd"
                                        @dragover.stop.prevent="onCardDragOver($event, stack.value, itemIndex, stackIndex)"
                                        @drop.stop.prevent="onCardDrop($event, stack.value, itemIndex, stackIndex)"
                                        @click="onCardClick(item, stack, stackIndex, itemIndex, $event)"
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
                                            <template v-for="cardMeta in [getItemCardMeta(item, itemIndex)]" :key="`meta-${itemIndex}`">
                                                <div v-if="cardMeta.hasAnyMeta" class="ww-kanban-card-meta">
                                                    <div
                                                        v-if="
                                                            cardMeta.deadline ||
                                                            cardMeta.hasDescription ||
                                                            cardMeta.hasAttachment ||
                                                            cardMeta.avatars.length === 1
                                                        "
                                                        class="ww-kanban-card-meta-line"
                                                    >
                                                        <div
                                                            v-if="cardMeta.deadline || cardMeta.hasDescription || cardMeta.hasAttachment"
                                                            class="ww-kanban-card-meta-left"
                                                        >
                                                            <span
                                                                v-if="cardMeta.deadline"
                                                                class="ww-kanban-card-deadline"
                                                                :class="`is-${cardMeta.deadline.tone}`"
                                                                :title="cardMeta.deadline.text"
                                                            >
                                                                <svg
                                                                    class="ww-kanban-card-deadline-icon"
                                                                    viewBox="0 0 20 20"
                                                                    focusable="false"
                                                                    aria-hidden="true"
                                                                >
                                                                    <circle cx="10" cy="10" r="7"></circle>
                                                                    <path d="M10 6.5V10.5"></path>
                                                                    <path d="M10 10.5L12.5 12"></path>
                                                                </svg>
                                                                <span class="ww-kanban-card-deadline-text">{{ cardMeta.deadline.text }}</span>
                                                            </span>

                                                            <span
                                                                v-if="cardMeta.hasDescription"
                                                                class="ww-kanban-card-description-indicator"
                                                                aria-hidden="true"
                                                                title="Description available"
                                                            >
                                                                <svg class="ww-kanban-card-description-icon" viewBox="0 0 20 20" focusable="false">
                                                                    <path d="M4 6h12"></path>
                                                                    <path d="M4 10h12"></path>
                                                                    <path d="M4 14h8"></path>
                                                                </svg>
                                                            </span>

                                                            <span
                                                                v-if="cardMeta.hasAttachment"
                                                                class="ww-kanban-card-attachment-indicator"
                                                                aria-hidden="true"
                                                                title="Attachment available"
                                                            >
                                                                <svg class="ww-kanban-card-attachment-icon" viewBox="0 0 20 20" focusable="false">
                                                                    <path d="M7.4 10.9L11.9 6.4a2.5 2.5 0 1 1 3.5 3.5l-6.1 6.1a4 4 0 0 1-5.6-5.7l6-6"></path>
                                                                </svg>
                                                            </span>
                                                        </div>

                                                        <div
                                                            v-if="cardMeta.avatars.length === 1"
                                                            class="ww-kanban-card-avatars ww-kanban-card-avatars-single"
                                                        >
                                                            <span
                                                                v-for="(avatar, avatarIndex) in cardMeta.avatars.slice(0, 1)"
                                                                :key="`avatar-single-${itemIndex}-${avatarIndex}-${avatar.label}`"
                                                                class="ww-kanban-card-avatar"
                                                                :style="{ backgroundColor: avatar.color, color: avatar.textColor }"
                                                                :title="avatar.label"
                                                            >
                                                                {{ avatar.text }}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div
                                                        v-if="cardMeta.avatars.length > 1"
                                                        class="ww-kanban-card-meta-line ww-kanban-card-meta-line-avatars"
                                                    >
                                                        <div class="ww-kanban-card-avatars ww-kanban-card-avatars-multiple">
                                                            <span
                                                                v-for="(avatar, avatarIndex) in cardMeta.avatars"
                                                                :key="`avatar-multiple-${itemIndex}-${avatarIndex}-${avatar.label}`"
                                                                class="ww-kanban-card-avatar"
                                                                :style="{ backgroundColor: avatar.color, color: avatar.textColor }"
                                                                :title="avatar.label"
                                                            >
                                                                {{ avatar.text }}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </template>
                                        </div>
                                    </article>
                                </wwLayoutItemContext>
                            </template>
                        </div>
                    </div>

                    <footer
                        v-if="canShowAddCardForStack(stackIndex)"
                        class="ww-kanban-stack-footer"
                        :class="{
                            'is-composer-open':
                                content.addCardButtonDirectTrigger !== true && isAddCardComposerOpen(stack.value, stackIndex),
                        }"
                    >
                        <button
                            v-if="content.addCardButtonDirectTrigger === true || !isAddCardComposerOpen(stack.value, stackIndex)"
                            type="button"
                            class="ww-kanban-add-card-button"
                            @click="onAddCardButtonClick(stack, stackIndex, $event)"
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

                        <form
                            v-else-if="content.addCardButtonDirectTrigger !== true"
                            class="ww-kanban-add-card-composer"
                            @submit.prevent="onAddCardSubmit(stack, $event)"
                        >
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
            dropTargetStackKey: null,
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
            const sizeOrKeyword = (value, fallback) => {
                if (value === undefined || value === null || value === "") return fallback;
                if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
                const normalized = String(value).trim();
                if (!normalized) return fallback;
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
                "--ww-card-height": sizeOrKeyword(this.content.cardHeight, "auto"),
                "--ww-card-radius": sizeOrDefault(this.content.cardBorderRadius, 8),
                "--ww-card-padding": sizeOrDefault(this.content.cardPadding, 12),
                "--ww-card-font-size": sizeOrDefault(this.content.cardFontSize, 13),
                "--ww-card-cursor": valueOrDefault(this.content.cardCursor, "auto"),
                "--ww-card-meta-icon-color": valueOrDefault(this.content.cardMetaIconColor, "#4b5563"),
                "--ww-deadline-font-size": sizeOrDefault(this.content.deadlineFontSize, 11),
                "--ww-deadline-font-weight": numberOrDefault(this.content.deadlineFontWeight, 600),
                "--ww-deadline-padding-y": sizeOrDefault(this.content.deadlinePaddingVertical, 2),
                "--ww-deadline-padding-x": sizeOrDefault(this.content.deadlinePaddingHorizontal, 7),
                "--ww-deadline-radius": sizeOrDefault(this.content.deadlineBorderRadius, 6),
                "--ww-deadline-border-width": sizeOrDefault(this.content.deadlineBorderWidth, 0),
                "--ww-deadline-border-color": valueOrDefault(this.content.deadlineBorderColor, "transparent"),
                "--ww-deadline-overdue-bg": valueOrDefault(this.content.deadlineOverdueBackgroundColor, "rgba(248, 113, 113, 0.24)"),
                "--ww-deadline-overdue-text": valueOrDefault(this.content.deadlineOverdueTextColor, "#b91c1c"),
                "--ww-deadline-upcoming-bg": valueOrDefault(this.content.deadlineUpcomingBackgroundColor, "rgba(148, 163, 184, 0.28)"),
                "--ww-deadline-upcoming-text": valueOrDefault(this.content.deadlineUpcomingTextColor, "#0f172a"),
                "--ww-deadline-today-bg": valueOrDefault(this.content.deadlineTodayBackgroundColor, "rgba(250, 204, 21, 0.28)"),
                "--ww-deadline-today-text": valueOrDefault(this.content.deadlineTodayTextColor, "#854d0e"),
                "--ww-deadline-neutral-bg": valueOrDefault(this.content.deadlineNeutralBackgroundColor, "rgba(148, 163, 184, 0.22)"),
                "--ww-deadline-neutral-text": valueOrDefault(this.content.deadlineNeutralTextColor, "#334155"),
                "--ww-add-button-bg": valueOrDefault(this.content.addCardButtonBackgroundColor, "#f8fafc"),
                "--ww-add-button-bg-hover": valueOrDefault(this.content.addCardButtonHoverBackgroundColor, "#f2f5fa"),
                "--ww-add-button-text-color": valueOrDefault(this.content.addCardButtonTextColor, "#111827"),
                "--ww-add-button-text-color-hover": valueOrDefault(
                    this.content.addCardButtonHoverTextColor,
                    this.content.addCardButtonTextColor || "#111827"
                ),
                "--ww-add-button-icon-color": valueOrDefault(
                    this.content.addCardButtonIconColor,
                    this.content.addCardButtonTextColor || "#111827"
                ),
                "--ww-add-button-icon-color-hover": valueOrDefault(
                    this.content.addCardButtonHoverIconColor,
                    this.content.addCardButtonHoverTextColor || this.content.addCardButtonTextColor || "#111827"
                ),
                "--ww-add-button-border-color": valueOrDefault(this.content.addCardButtonBorderColor, "rgba(15, 23, 42, 0.18)"),
                "--ww-add-button-alignment": valueOrDefault(this.content.addCardButtonBorderColor, "flex-start"),
                "--ww-add-button-font-size": sizeOrDefault(this.content.addCardButtonFontSize, 13),
                "--ww-add-cancel-icon-color": valueOrDefault(this.content.addCardCancelIconColor, "#000000"),
                "--ww-add-cancel-icon-color-hover": valueOrDefault(this.content.addCardCancelHoverIconColor, "#111827"),
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
        hasFixedCardHeight() {
            const raw = this.content.cardHeight;
            if (raw === undefined || raw === null || raw === "") return false;
            const normalized = String(raw).trim().toLowerCase();
            if (!normalized) return false;
            return !["auto", "initial", "inherit", "unset", "fit-content", "max-content", "min-content"].includes(
                normalized
            );
        },
        stackKeyLookup() {
            const map = {};
            this.renderStacks.forEach((stack, stackIndex) => {
                map[this.getStackRenderKey(stack.value, stackIndex)] = stack.value;
            });
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
        "content.addCardButtonDirectTrigger"(value) {
            if (value === true) {
                this.cancelAddCardComposer();
            }
        },
    },
    methods: {
        valuesEqual(a, b) {
            return a === b;
        },
        getStackDomKey(stackValue) {
            return stackValue === null ? NULL_STACK_KEY : `__WW_STACK__${String(stackValue)}`;
        },
        getStackRenderKey(stackValue, stackIndex) {
            return `${this.getStackDomKey(stackValue)}::${stackIndex}`;
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
            this.dropTargetStack = null;
            this.dropTargetStackKey = null;
        },
        setDropTargetIndex(index) {
            if (!Number.isFinite(index)) {
                this.dropTargetIndex = null;
                return;
            }
            this.dropTargetIndex = Math.max(0, Number(index));
        },
        getStackElementByKey(stackKey) {
            const root = this.$refs.kanbanRoot;
            if (!root) return null;
            const stackElements = Array.from(root.querySelectorAll(".ww-kanban-stack"));
            return stackElements.find(el => el.dataset.stackKey === stackKey) || null;
        },
        getStackElementByValue(stackValue) {
            const root = this.$refs.kanbanRoot;
            if (!root) return null;
            const stackElements = Array.from(root.querySelectorAll(".ww-kanban-stack"));
            return (
                stackElements.find(element => this.valuesEqual(this.stackKeyLookup[element.dataset.stackKey], stackValue)) || null
            );
        },
        getStackBodyElement(stackValue, stackKey = null) {
            const stackEl = stackKey ? this.getStackElementByKey(stackKey) : this.getStackElementByValue(stackValue);
            return stackEl?.querySelector(".ww-kanban-stack-body") || null;
        },
        isDesktopSourceCardElement(cardEl) {
            if (!this.desktopDrag) return false;
            const stackKey = cardEl?.closest?.(".ww-kanban-stack")?.dataset?.stackKey;
            if (!stackKey || stackKey !== this.desktopDrag.fromStackKey) return false;
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
            const radiusValue = Number(this.content.cardBorderRadius);
            // Scoped styles do not apply to dynamic nodes, so set critical styles inline.
            placeholder.style.pointerEvents = "none";
            placeholder.style.flexShrink = "0";
            placeholder.style.borderRadius = `${Number.isFinite(radiusValue) ? radiusValue : 8}px`;
            placeholder.style.background = this.content.dropPlaceholderColor || "rgba(15, 23, 42, 0.08)";
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
            if (this.dropPlaceholderEl) {
                const radiusValue = Number(this.content.cardBorderRadius);
                this.dropPlaceholderEl.style.height = `${this.dropPlaceholderHeight}px`;
                this.dropPlaceholderEl.style.background = this.content.dropPlaceholderColor || "rgba(15, 23, 42, 0.08)";
                this.dropPlaceholderEl.style.borderRadius = `${Number.isFinite(radiusValue) ? radiusValue : 8}px`;
            }
        },
        mountDropPlaceholder(stackValue, index, stackKey = null) {
            if (!this.isDragging) return;
            const body = this.getStackBodyElement(stackValue, stackKey);
            if (!body) {
                this.clearDropPlaceholder();
                return;
            }

            const placeholder = this.ensureDropPlaceholder();
            if (!placeholder) return;

            const cards = Array.from(body.querySelectorAll(".ww-kanban-card")).filter(
                cardEl => !cardEl.classList.contains("is-drag-source") && !this.isDesktopSourceCardElement(cardEl)
            );
            const clampedIndex = this.clampIndex(index, cards.length);
            const resolvedStackKey = stackKey || body.closest(".ww-kanban-stack")?.dataset?.stackKey || this.getStackDomKey(stackValue);

            const radiusValue = Number(this.content.cardBorderRadius);
            placeholder.style.height = `${this.dropPlaceholderHeight}px`;
            placeholder.style.background = this.content.dropPlaceholderColor || "rgba(15, 23, 42, 0.08)";
            placeholder.style.borderRadius = `${Number.isFinite(radiusValue) ? radiusValue : 8}px`;
            if (
                this.dropPlaceholderStackKey === resolvedStackKey &&
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

            this.dropPlaceholderStackKey = resolvedStackKey;
            this.dropPlaceholderIndex = clampedIndex;
        },
        setDropLocation(stackValue, index, renderPlaceholder = true, stackKey = null) {
            this.setDropTargetStack(stackValue);
            this.dropTargetStackKey = stackKey;
            if (!Number.isFinite(index)) {
                this.setDropTargetIndex(null);
                this.clearDropPlaceholder();
                return;
            }
            const maxIndex = this.getStackItemsByValue(stackValue).length;
            const normalizedIndex = this.clampIndex(index, maxIndex);
            this.setDropTargetIndex(normalizedIndex);
            if (renderPlaceholder) {
                this.mountDropPlaceholder(stackValue, normalizedIndex, stackKey);
            }
        },
        getDesktopDropTarget(clientX, clientY) {
            if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
            const root = this.$refs.kanbanRoot;
            if (!root) return null;

            const doc = wwLib.getFrontDocument();
            const previousPlaceholderVisibility = this.dropPlaceholderEl?.style.visibility ?? "";
            if (this.dropPlaceholderEl) this.dropPlaceholderEl.style.visibility = "hidden";
            const pointElement = doc.elementFromPoint(clientX, clientY);
            if (this.dropPlaceholderEl) this.dropPlaceholderEl.style.visibility = previousPlaceholderVisibility || "";
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
            const cards = Array.from(stackEl.querySelectorAll(".ww-kanban-card")).filter(cardEl => !this.isDesktopSourceCardElement(cardEl));
            let newIndex = cards.length;
            for (let i = 0; i < cards.length; i += 1) {
                const rect = cards[i].getBoundingClientRect();
                if (clientY < rect.top + rect.height / 2) {
                    newIndex = i;
                    break;
                }
            }
            return { toStack, newIndex, stackKey };
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
                this.setDropLocation(target.toStack, target.newIndex, true, target.stackKey);
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
        getDesktopDropIndex(toStack, clientY, stackKey = null) {
            const body = this.getStackBodyElement(toStack, stackKey);
            if (!body) return this.getStackItemsByValue(toStack).length;
            const cards = Array.from(body.querySelectorAll(".ww-kanban-card")).filter(
                cardEl => !cardEl.classList.contains("is-drag-source") && !this.isDesktopSourceCardElement(cardEl)
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
        getCardKey(item, index, stackValue, stackIndex = 0) {
            return `${this.getStackRenderKey(stackValue, stackIndex)}::${this.getItemIdentity(item, index)}::${index}`;
        },
        buildStackMeta(stack, stackIndex) {
            const stackValue = stack?.value ?? null;
            const normalizedIndex = Number.isInteger(stackIndex) ? stackIndex : null;
            return {
                value: stackValue,
                label: this.getStackLabel(stack || { label: "", value: stackValue }),
                index: normalizedIndex,
                key: normalizedIndex === null ? null : this.getStackRenderKey(stackValue, normalizedIndex),
            };
        },
        getItemLayoutData(item, itemIndex, stack, stackIndex) {
            const stackMeta = this.buildStackMeta(stack, stackIndex);
            const base =
                item && typeof item === "object" && !Array.isArray(item)
                    ? { ...item }
                    : {
                          value: item,
                      };
            const existingData =
                base?.data && typeof base.data === "object" && !Array.isArray(base.data) ? { ...base.data } : {};

            return {
                ...base,
                stack: stackMeta,
                stackValue: stackMeta.value,
                stackLabel: stackMeta.label,
                stackIndex: stackMeta.index,
                itemIndex,
                data: {
                    ...existingData,
                    item,
                    stack: stackMeta,
                    stackValue: stackMeta.value,
                    stackLabel: stackMeta.label,
                    stackIndex: stackMeta.index,
                    itemIndex,
                },
            };
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
        resolveItemFieldValue(item, configuredPath, fallbackPaths = []) {
            if (!item || typeof item !== "object") return undefined;
            if (configuredPath) {
                return wwLib.resolveObjectPropertyPath(item, configuredPath);
            }
            for (const path of fallbackPaths) {
                const value = wwLib.resolveObjectPropertyPath(item, path);
                if (value !== undefined) return value;
            }
            return undefined;
        },
        isTruthyMetaField(value) {
            if (value === undefined || value === null || value === false) return false;
            if (typeof value === "string") {
                const normalized = value.trim();
                if (!normalized) return false;
                if (normalized.toLowerCase() === "false") return false;
                if (normalized === "0") return false;
                return true;
            }
            if (typeof value === "number") return value > 0;
            if (Array.isArray(value)) return value.length > 0;
            if (typeof value === "object") return Object.keys(value).length > 0;
            return Boolean(value);
        },
        getItemDescriptionRaw(item) {
            if (!this.content.itemDescription) return undefined;
            return this.resolveItemFieldValue(item, this.content.itemDescription);
        },
        getItemDescription(item) {
            return this.normalizeDisplayValue(this.getItemDescriptionRaw(item));
        },
        hasItemDescription(item) {
            return this.isTruthyMetaField(this.getItemDescriptionRaw(item));
        },
        getAvatarPaletteColor(seed) {
            const palette = ["#0ea5e9", "#ef4444", "#f59e0b", "#22c55e", "#8b5cf6", "#06b6d4", "#ec4899", "#2563eb", "#14b8a6", "#f97316"];
            const source = String(seed ?? "");
            let hash = 0;
            for (let index = 0; index < source.length; index += 1) {
                hash = (hash << 5) - hash + source.charCodeAt(index);
                hash |= 0;
            }
            return palette[Math.abs(hash) % palette.length];
        },
        getAvatarInitials(value) {
            const normalized = this.normalizeDisplayValue(value)
                .replace(/\s+/g, " ")
                .trim();
            if (!normalized) return "?";
            const words = normalized.split(" ").filter(Boolean);
            if (words.length >= 2) {
                return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
            }
            return normalized.slice(0, 2).toUpperCase();
        },
        normalizeAvatarColor(value) {
            const text = typeof value === "string" ? value.trim() : "";
            if (!text) return "";
            const isHexColor = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text);
            const isRgbColor = /^rgba?\([^)]*\)$/i.test(text);
            const isHslColor = /^hsla?\([^)]*\)$/i.test(text);
            return isHexColor || isRgbColor || isHslColor ? text : "";
        },
        getAvatarLabelFromObject(avatar) {
            const keyPaths = [
                this.content.itemAvatarTextKey,
                "text",
                "label",
                "name",
                "title",
                "initials",
                "username",
                "email",
                "id",
            ].filter(Boolean);
            for (const path of keyPaths) {
                const value = wwLib.resolveObjectPropertyPath(avatar, path);
                const normalized = this.normalizeDisplayValue(value);
                if (normalized) return normalized;
            }
            return "";
        },
        getAvatarColorFromObject(avatar) {
            const keyPaths = [
                this.content.itemAvatarColorKey,
                "color",
                "avatarColor",
                "backgroundColor",
                "bgColor",
            ].filter(Boolean);
            for (const path of keyPaths) {
                const value = wwLib.resolveObjectPropertyPath(avatar, path);
                const normalizedColor = this.normalizeAvatarColor(value);
                if (normalizedColor) return normalizedColor;
            }
            return "";
        },
        getItemRawAvatars(item) {
            if (!this.content.itemAvatars) return [];
            const rawValue = this.resolveItemFieldValue(item, this.content.itemAvatars);
            if (rawValue === undefined || rawValue === null || rawValue === false) return [];
            if (Array.isArray(rawValue)) return rawValue;
            if (typeof rawValue === "string" || typeof rawValue === "number") return [rawValue];
            if (typeof rawValue === "object") return [rawValue];
            return [];
        },
        buildAvatarChip(avatarSource, fallbackSeed) {
            let label = "";
            let color = "";

            if (typeof avatarSource === "string" || typeof avatarSource === "number" || typeof avatarSource === "boolean") {
                label = this.normalizeDisplayValue(avatarSource);
            } else if (avatarSource && typeof avatarSource === "object") {
                label = this.getAvatarLabelFromObject(avatarSource);
                color = this.getAvatarColorFromObject(avatarSource);
                if (!label && avatarSource.label !== undefined) {
                    label = this.normalizeDisplayValue(avatarSource.label);
                }
            }

            if (!label) return null;
            const initials = this.getAvatarInitials(label);
            const avatarColor = color || this.getAvatarPaletteColor(`${label}-${fallbackSeed}`);

            return {
                label,
                text: initials,
                color: avatarColor,
                textColor: "#ffffff",
            };
        },
        getItemAvatarChips(item, itemIndex) {
            const rawAvatars = this.getItemRawAvatars(item);
            const chips = rawAvatars
                .map((avatar, avatarIndex) => this.buildAvatarChip(avatar, `${itemIndex}-${avatarIndex}`))
                .filter(Boolean);

            return chips;
        },
        getItemDeadlineRaw(item) {
            if (!this.content.itemDeadline) return undefined;
            return this.resolveItemFieldValue(item, this.content.itemDeadline);
        },
        parseDateValue(value) {
            if (value instanceof Date && Number.isFinite(value.getTime())) return value;
            if (typeof value === "number" && Number.isFinite(value)) {
                const parsedDate = new Date(value);
                return Number.isFinite(parsedDate.getTime()) ? parsedDate : null;
            }
            if (typeof value === "string") {
                const normalized = value.trim();
                if (!normalized) return null;
                const timestamp = Date.parse(normalized);
                if (Number.isFinite(timestamp)) {
                    const parsedDate = new Date(timestamp);
                    if (Number.isFinite(parsedDate.getTime())) return parsedDate;
                }
            }
            return null;
        },
        formatDeadlineDate(dateValue) {
            try {
                return new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                }).format(dateValue);
            } catch (e) {
                return dateValue?.toLocaleDateString?.("en-US") || "";
            }
        },
        getDeadlineTone(deadlineDate) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const target = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
            if (target < today) return "overdue";
            if (target.getTime() === today.getTime()) return "today";
            return "upcoming";
        },
        getItemDeadlineMeta(item) {
            const rawValue = this.getItemDeadlineRaw(item);
            if (!this.isTruthyMetaField(rawValue)) return null;
            const parsedDate = this.parseDateValue(rawValue);
            if (parsedDate) {
                return {
                    text: this.formatDeadlineDate(parsedDate),
                    tone: this.getDeadlineTone(parsedDate),
                };
            }

            const normalized = this.normalizeDisplayValue(rawValue);
            if (!normalized) return null;
            return {
                text: normalized,
                tone: "neutral",
            };
        },
        getItemAttachmentRaw(item) {
            if (!this.content.itemAttachment) return undefined;
            return this.resolveItemFieldValue(item, this.content.itemAttachment);
        },
        hasItemAttachment(item) {
            return this.isTruthyMetaField(this.getItemAttachmentRaw(item));
        },
        getItemCardMeta(item, itemIndex) {
            const deadline = this.getItemDeadlineMeta(item);
            const hasDescription = this.hasItemDescription(item);
            const hasAttachment = this.hasItemAttachment(item);
            const avatars = this.getItemAvatarChips(item, itemIndex);
            return {
                deadline,
                hasDescription,
                hasAttachment,
                avatars,
                hasAnyMeta: !!deadline || hasDescription || hasAttachment || avatars.length > 0,
            };
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
            const fromIndex = this.renderStacks.findIndex(stack => this.valuesEqual(stack.value, payload.from));
            const toIndex = this.renderStacks.findIndex(stack => this.valuesEqual(stack.value, payload.to));
            const fromStack =
                fromIndex >= 0 ? this.renderStacks[fromIndex] : { value: payload.from, label: String(payload.from ?? "") };
            const toStack = toIndex >= 0 ? this.renderStacks[toIndex] : { value: payload.to, label: String(payload.to ?? "") };
            const fromMeta = this.buildStackMeta(fromStack, fromIndex >= 0 ? fromIndex : null);
            const toMeta = this.buildStackMeta(toStack, toIndex >= 0 ? toIndex : null);
            this.$emit("trigger-event", {
                name: "item:moved",
                event: {
                    ...payload,
                    data: {
                        item: payload.item,
                        from: fromMeta,
                        to: toMeta,
                        oldIndex: payload.oldIndex,
                        newIndex: payload.newIndex,
                    },
                },
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
            this.desktopDrag = { item, fromStack, oldIndex, fromStackKey: null };
            this.suppressClickUntil = Date.now() + 300;
            this.isDragging = true;
            const sourceEl = event.currentTarget?.closest?.(".ww-kanban-card") || event.currentTarget;
            if (sourceEl) {
                const rect = sourceEl.getBoundingClientRect();
                this.setDropPlaceholderHeight(rect?.height);
                this.desktopDrag.fromStackKey = sourceEl.closest?.(".ww-kanban-stack")?.dataset?.stackKey || null;
            }
            // Avoid mutating list layout during native dragstart to keep desktop drag preview stable.
            this.setDropLocation(fromStack, oldIndex, false, this.desktopDrag.fromStackKey);
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
        onCardDragOver(event, toStack, _itemIndex, stackIndex) {
            if (!this.desktopDrag) return;
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            const stackKey = this.getStackRenderKey(toStack, stackIndex);
            const index = this.getDesktopDropIndex(toStack, event.clientY, stackKey);
            this.setDropLocation(toStack, index, true, stackKey);
        },
        onCardDrop(event, toStack, _cardIndex, stackIndex) {
            if (!this.desktopDrag) return;
            const stackKey = this.getStackRenderKey(toStack, stackIndex);
            const hasTrackedIndex =
                this.valuesEqual(this.dropTargetStack, toStack) &&
                this.dropTargetStackKey === stackKey &&
                Number.isFinite(this.dropTargetIndex);
            const insertIndex = hasTrackedIndex ? this.dropTargetIndex : this.getDesktopDropIndex(toStack, event.clientY, stackKey);
            this.finalizeMove(this.desktopDrag, toStack, insertIndex);
            this.onDesktopDragEnd();
        },
        onStackDragOver(event, toStack, stackIndex) {
            if (!this.desktopDrag) return;
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            const stackKey = this.getStackRenderKey(toStack, stackIndex);
            this.setDropLocation(toStack, this.getDesktopDropIndex(toStack, event.clientY, stackKey), true, stackKey);
        },
        onStackDrop(event, toStack, stackIndex) {
            if (!this.desktopDrag) return;
            const stackKey = this.getStackRenderKey(toStack, stackIndex);
            const hasTrackedIndex =
                this.valuesEqual(this.dropTargetStack, toStack) &&
                this.dropTargetStackKey === stackKey &&
                Number.isFinite(this.dropTargetIndex);
            const insertIndex = hasTrackedIndex
                ? this.dropTargetIndex
                : Number.isFinite(event?.clientY)
                ? this.getDesktopDropIndex(toStack, event.clientY, stackKey)
                : this.getStackItemsByValue(toStack).length;
            this.finalizeMove(this.desktopDrag, toStack, insertIndex);
            this.onDesktopDragEnd();
        },
        onCardClick(item, stack, stackIndex, itemIndex, event) {
            if (!event?.isTrusted) return;
            if (Date.now() < this.suppressClickUntil) return;
            if (this.touchPressTimer || this.touchDragContext || this.desktopDrag || this.isDragging) return;
            if (this.content.customDragHandle && this.matchesHandleTarget(event.target)) return;
            const stackMeta = this.buildStackMeta(stack, stackIndex);
            const itemKey = this.getItemIdentity(item, itemIndex);

            this.$emit("trigger-event", {
                name: "item:clicked",
                event: {
                    item,
                    stack: stackMeta.value,
                    stackLabel: stackMeta.label,
                    stackIndex: stackMeta.index,
                    stackKey: stackMeta.key,
                    index: itemIndex,
                    itemKey,
                    data: {
                        item,
                        itemKey,
                        index: itemIndex,
                        stack: stackMeta,
                    },
                },
            });
        },
        canShowAddCardForStack(stackIndex) {
            if (this.content.showAddCardButton === false || this.isReadonly) return false;
            if (this.content.showOnLast === true) {
                return stackIndex === this.renderStacks.length - 1;
            }
            return true;
        },
        isAddCardComposerOpen(stackValue, stackIndex = 0) {
            return this.addCardComposerStackKey === this.getStackRenderKey(stackValue ?? null, stackIndex);
        },
        openAddCardComposer(stack, stackIndex, event) {
            if (!event?.isTrusted) return;
            const stackValue = stack?.value ?? null;
            const stackKey = this.getStackRenderKey(stackValue, stackIndex);
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
        emitAddCardEvent(stack, title = "") {
            this.$emit("trigger-event", {
                name: "add-card:clicked",
                event: this.buildAddCardEventPayload(stack, title),
            });
        },
        onAddCardButtonClick(stack, stackIndex, event) {
            if (!event?.isTrusted) return;
            if (this.content.addCardButtonDirectTrigger === true) {
                this.cancelAddCardComposer();
                this.emitAddCardEvent(stack, "");
                return;
            }
            this.openAddCardComposer(stack, stackIndex, event);
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
            this.emitAddCardEvent(stack, title);
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
                this.setDropLocation(target.toStack, target.newIndex, true, target.stackKey);
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
            const previousPlaceholderVisibility = this.dropPlaceholderEl?.style.visibility ?? "";

            if (sourceEl) sourceEl.style.visibility = "hidden";
            if (this.dropPlaceholderEl) this.dropPlaceholderEl.style.visibility = "hidden";
            this.ghostCard.visible = false;

            const pointElement = wwLib.getFrontDocument().elementFromPoint(clientX, clientY);

            if (sourceEl) sourceEl.style.visibility = previousVisibility || "";
            if (this.dropPlaceholderEl) this.dropPlaceholderEl.style.visibility = previousPlaceholderVisibility || "";
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
            return { toStack, newIndex, stackKey };
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
            this.setDropLocation(
                this.touchDragContext.fromStack,
                this.touchDragContext.oldIndex,
                true,
                this.touchDragContext.fromStackKey || null
            );
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
            this.touchPressContext = { item, fromStack, fromStackKey: stackKey, oldIndex, sourceEl: cardEl };

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
                        this.setDropLocation(target.toStack, target.newIndex, true, target.stackKey);
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
                        this.setDropLocation(target.toStack, target.newIndex, true, target.stackKey);
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
            const stackMeta = this.buildStackMeta(firstStack, 0);
            const itemKey = this.getItemIdentity(item, 0);
            return {
                item,
                stack: stackMeta.value,
                stackLabel: stackMeta.label,
                stackIndex: stackMeta.index,
                stackKey: stackMeta.key,
                index: 0,
                itemKey,
                data: {
                    item,
                    itemKey,
                    index: 0,
                    stack: stackMeta,
                },
            };
        },
        getTestEvent() {
            if (!this.renderStacks.length) throw new Error("No stack found");
            const firstStack = this.renderStacks[0];
            if (!firstStack?.items?.length) throw new Error("No item found");
            const stackMeta = this.buildStackMeta(firstStack, 0);
            return {
                item: firstStack.items[0],
                from: firstStack.value,
                to: firstStack.value,
                oldIndex: 0,
                newIndex: 1,
                updatedList: firstStack.items,
                data: {
                    item: firstStack.items[0],
                    from: stackMeta,
                    to: stackMeta,
                    oldIndex: 0,
                    newIndex: 1,
                },
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
    border: var(--ww-panel-border-color);
    background: var(--ww-panel-bg);
    // box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
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
    border: var(--ww-count-border-color);
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
    // border: var(--ww-add-button-border-color);
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
    justify-content: var(--ww-add-button-alignment);
    gap: 8px;
    border: var(--ww-add-button-border-color);
    border-radius: 8px;
    padding: 7px 10px;
    font-size: var(--ww-add-button-font-size);
    font-weight: 600;
    color: var(--ww-add-button-text-color);
    background: var(--ww-add-button-bg);
    cursor: pointer;
}

.ww-kanban-add-card-button:hover {
    background: var(--ww-add-button-bg-hover);
    color: var(--ww-add-button-text-color-hover);
}

.ww-kanban-add-card-button:hover .ww-kanban-add-card-icon {
    color: var(--ww-add-button-icon-color-hover);
}

.ww-kanban-add-card-composer {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ww-kanban-add-card-input {
    width: 100%;
    min-height: var(--ww-add-input-min-height);
    border: var(--ww-add-input-border-color);
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
    border: var(--ww-add-submit-border-color);
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
    color: var(--ww-add-cancel-icon-color);
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

.ww-kanban-add-card-cancel:hover {
    color: var(--ww-add-cancel-icon-color-hover);
}

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
    color: var(--ww-add-button-icon-color);
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
    border: var(--ww-card-border-color);
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
    cursor: var(--ww-card-cursor);
    height: auto;
    max-height: none;
    overflow: clip;
}

.ww-kanban-card.has-fixed-height {
    height: var(--ww-card-height);
    max-height: var(--ww-card-height);
    overflow: hidden;
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
    height: auto;
    max-height: none;
    overflow: visible;
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

.ww-kanban-card-meta {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    min-height: 18px;
    height: auto;
    width: 100%;
    overflow: visible;
}

.ww-kanban-card-meta-line {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
}

.ww-kanban-card-meta-line-avatars {
    justify-content: flex-end;
    min-height: 30px;
}

.ww-kanban-card-meta-left {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1 1 auto;
}

.ww-kanban-card-deadline {
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: var(--ww-deadline-radius);
    padding: var(--ww-deadline-padding-y) var(--ww-deadline-padding-x);
    font-size: var(--ww-deadline-font-size);
    font-weight: var(--ww-deadline-font-weight);
    line-height: 1.2;
    white-space: nowrap;
    border: var(--ww-deadline-border-width) solid var(--ww-deadline-border-color);
    box-sizing: border-box;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ww-kanban-card-deadline.is-overdue {
    background: var(--ww-deadline-overdue-bg);
    color: var(--ww-deadline-overdue-text);
}

.ww-kanban-card-deadline.is-upcoming {
    background: var(--ww-deadline-upcoming-bg);
    color: var(--ww-deadline-upcoming-text);
}

.ww-kanban-card-deadline.is-today {
    background: var(--ww-deadline-today-bg);
    color: var(--ww-deadline-today-text);
}

.ww-kanban-card-deadline.is-neutral {
    background: var(--ww-deadline-neutral-bg);
    color: var(--ww-deadline-neutral-text);
}

.ww-kanban-card-deadline-icon {
    width: 12px;
    height: 12px;
    flex: 0 0 12px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
}

.ww-kanban-card-deadline-text {
    min-width: 0;
}

.ww-kanban-card-description-indicator,
.ww-kanban-card-attachment-indicator {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.ww-kanban-card-description-indicator,
.ww-kanban-card-attachment-indicator {
    color: var(--ww-card-meta-icon-color);
}

.ww-kanban-card-description-icon,
.ww-kanban-card-attachment-icon {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
}

.ww-kanban-card-avatars {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    min-width: 0;
    max-width: 100%;
    min-height: 30px;
    position: static !important;
    inset: auto !important;
    top: auto !important;
    right: auto !important;
    bottom: auto !important;
    left: auto !important;
    transform: none !important;
    float: none !important;
    overflow: visible;
}

.ww-kanban-card-avatars-single {
    margin-left: auto;
}

.ww-kanban-card-avatars-multiple {
    margin-left: 0;
    justify-content: flex-end;
    flex-wrap: wrap;
    row-gap: 4px;
}

.ww-kanban-card-avatar {
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-sizing: border-box;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
    text-transform: uppercase;
    position: static !important;
    inset: auto !important;
    top: auto !important;
    right: auto !important;
    bottom: auto !important;
    left: auto !important;
    transform: none !important;
    margin: 0 !important;
    float: none !important;
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
