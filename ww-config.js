function showObjectPropertyPath(basePropertyKey, { content, boundProps }) {
    return (
        boundProps[basePropertyKey] &&
        content[basePropertyKey] &&
        typeof wwLib.wwCollection.getCollectionData(content[basePropertyKey])[0] === "object"
    );
}
function getObjectPropertyPathOptions(basePropertyKey, { content }) {
    const data = wwLib.wwCollection.getCollectionData(content[basePropertyKey]);
    if (!data.length || typeof data[0] !== "object") {
        return null;
    }

    return { object: data[0] };
}

export default {
    editor: {
        label: {
            en: "Kanban",
        },
        bubble: {
            icon: "template",
        },
        icon: "template",
        customSettingsPropertiesOrder: [
            "items",
            [
                "itemKey",
                "itemLabel",
                "itemImage",
                "itemDescription",
                "itemDeadline",
                "itemAttachment",
                "itemAvatars",
                "itemAvatarTextKey",
                "itemAvatarColorKey",
                "stackedBy",
                "sortedBy",
                "sortOrder",
            ],
            [
                "showAddCardButton",
                "showOnLast",
                "addCardButtonDirectTrigger",
                "addCardButtonLabel",
                "addCardInputPlaceholder",
                "addCardSubmitLabel",
            ],
            "readonly",
            "draggingCursor",
            "customDragHandle",
            ["handleClass"],
            "longPress",
            ["longPressDelay"],
        ],
        customStylePropertiesOrder: [
            "styleBoardHeading",
            ["wrapStacks", "uiFontFamily", "boardBackgroundColor", "boardGap", "boardPadding"],
            "styleColumnHeading",
            ["columnWidth", "columnHeight", "columnBlockGap", "columnBackgroundColor", "columnBorderColor", "columnShadow"],
            "styleColumnHeaderHeading",
            ["columnTitleColor", "columnTitleFontSize", "columnTitleFontWeight", "columnCountBackgroundColor", "columnCountColor", "columnCountBorderColor"],
            "styleCardHeading",
            [
                "cardBackgroundColor",
                "cardTextColor",
                "cardBorderColor",
                "cardHoverBorderColor",
                "cardBorderShadow",
                "cardHoverRingColor",
                "cardMetaIconColor",
                "cardMetaGap",
                "cardLabelMetaGap",
                "cardMetaIconSize",
                "dropPlaceholderColor",
                "cardMinHeight",
                "cardHeight",
                "cardBorderRadius",
                "cardPadding",
                "cardMargin",
                "cardFontSize",
                "cardFontWeight",
                "cardLabelTypography",
                "cardLabelMaxLength",
                "cardCursor",
            ],
            "styleAvatarHeading",
            ["cardAvatarBorder", "cardAvatarMargin", "cardAvatarPadding"],
            "styleDeadlineHeading",
            [
                "deadlineFontSize",
                "deadlineIconSize",
                "deadlineFontWeight",
                "deadlinePaddingVertical",
                "deadlinePaddingHorizontal",
                "deadlineBorderRadius",
                "deadlineBorderWidth",
                "deadlineBorderColor",
                "deadlineOverdueBackgroundColor",
                "deadlineOverdueTextColor",
                "deadlineUpcomingBackgroundColor",
                "deadlineUpcomingTextColor",
                "deadlineTodayBackgroundColor",
                "deadlineTodayTextColor",
                "deadlineNeutralBackgroundColor",
                "deadlineNeutralTextColor",
            ],
            "styleAddCardButtonHeading",
            [
                "addCardButtonHeight",
                "addCardButtonBackgroundColor",
                "addCardButtonHoverBackgroundColor",
                "addCardButtonTextColor",
                "addCardButtonHoverTextColor",
                "addCardButtonIconColor",
                "addCardButtonHoverIconColor",
                "addCardButtonBorderColor",
                "addCardButtonJustifyContent",
                "addCardButtonFontSize",
                "addCardButtonFontWeight",
                "addCardButtonTypography",
                "addCardCancelIconColor",
                "addCardCancelHoverIconColor",
            ],
            "styleAddCardInputHeading",
            [
                "addCardInputBackgroundColor",
                "addCardInputTextColor",
                "addCardInputBorderColor",
                "addCardInputPlaceholderColor",
                "addCardInputFontSize",
                "addCardInputMinHeight",
            ],
            "styleAddCardSubmitHeading",
            [
                "addCardSubmitBackgroundColor",
                "addCardSubmitHoverBackgroundColor",
                "addCardSubmitTextColor",
                "addCardSubmitBorderColor",
                "addCardSubmitFontSize",
                "addCardSubmitFontWeight",
                "addCardSubmitTypography",
                "addCardSubmitBorder",
                "addCardSubmitBorderRadius",
                "addCardSubmitPadding",
                "addCardSubmitMargin",
            ],
        ],
    },
    states: ["readonly"],
    options: {
        displayAllowedValues: ["flex", "inline-flex"],
    },
    triggerEvents: [
        {
            name: "add-card:clicked",
            label: { en: "On add card clicked" },
            event: {
                stack: "",
                stackValue: "",
                stackLabel: "",
                title: "",
                stackedBy: "",
                defaultItem: {},
            },
            getTestEvent: "getTestAddCardEvent",
        },
        {
            name: "item:clicked",
            label: { en: "On item clicked" },
            event: {
                item: {},
                stack: "",
                stackLabel: "",
                stackIndex: 0,
                stackKey: "",
                index: 0,
                itemKey: "",
                data: {
                    item: {},
                    itemKey: "",
                    index: 0,
                    stack: {
                        value: "",
                        label: "",
                        index: 0,
                        key: "",
                    },
                },
            },
            getTestEvent: "getTestClickEvent",
        },
        {
            name: "item:moved",
            label: { en: "On item moved" },
            event: {
                item: {},
                from: "",
                to: "",
                oldIndex: 0,
                newIndex: 1,
                updatedList: [],
                data: {
                    item: {},
                    from: {
                        value: "",
                        label: "",
                        index: 0,
                        key: "",
                    },
                    to: {
                        value: "",
                        label: "",
                        index: 0,
                        key: "",
                    },
                    oldIndex: 0,
                    newIndex: 1,
                },
            },
            getTestEvent: "getTestEvent",
            default: true,
        },
    ],
    properties: {
        stackElement: {
            hidden: true,
            //ww-stack
            defaultValue: {
                isWwObject: true,
                type: "5a88036f-22ea-4f8d-b4a5-bc226ef95061",
            },
        },
        styleBoardHeading: {
            label: { en: "Board" },
            type: "Title",
            editorOnly: true,
            section: "style",
        },
        styleColumnHeading: {
            label: { en: "Column" },
            type: "Title",
            editorOnly: true,
            section: "style",
        },
        styleColumnHeaderHeading: {
            label: { en: "Column header" },
            type: "Title",
            editorOnly: true,
            section: "style",
        },
        styleCardHeading: {
            label: { en: "Card" },
            type: "Title",
            editorOnly: true,
            section: "style",
        },
        styleAvatarHeading: {
            label: { en: "Avatar" },
            type: "Title",
            editorOnly: true,
            section: "style",
        },
        styleDeadlineHeading: {
            label: { en: "Deadline" },
            type: "Title",
            editorOnly: true,
            section: "style",
        },
        styleAddCardButtonHeading: {
            label: { en: "Add card button" },
            type: "Title",
            editorOnly: true,
            section: "style",
        },
        styleAddCardInputHeading: {
            label: { en: "Add card input" },
            type: "Title",
            editorOnly: true,
            section: "style",
        },
        styleAddCardSubmitHeading: {
            label: { en: "Add card submit" },
            type: "Title",
            editorOnly: true,
            section: "style",
        },
        wrapStacks: {
            label: {
                en: "Wrap stacks",
            },
            type: "OnOff",
            defaultValue: true,
            responsive: true,
            bindable: true,
            states: true,
            classes: true,
            section: "style",
        },
        items: {
            label: {
                en: "Items",
            },
            type: "Info",
            options: {
                text: { en: "Bind your data" },
            },
            bindable: true,
            defaultValue: [],
            section: "settings",
        },
        itemKey: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Item key",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        itemLabel: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Card label",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        itemImage: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Card image",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        itemDescription: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Card description",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        itemDeadline: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Card deadline",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        itemAttachment: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Card attachment",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        itemAvatars: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Card avatars",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        itemAvatarTextKey: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Avatar text key",
            },
            type: "Text",
            defaultValue: "name",
            bindable: true,
            section: "settings",
            propertyHelp: {
                tooltip: "Used when each avatar is an object (for example: name, initials, username).",
            },
        },
        itemAvatarColorKey: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Avatar color key",
            },
            type: "Text",
            defaultValue: "color",
            bindable: true,
            section: "settings",
            propertyHelp: {
                tooltip: "Optional object key for avatar color. If empty/missing, color is generated dynamically.",
            },
        },
        stackedBy: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Stacked by",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        sortedBy: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Sorted by",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("items", { content }),
            defaultValue: null,
            section: "settings",
        },
        sortOrder: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }) || !content.sortedBy,
            label: {
                en: "Sort order",
            },
            type: "TextRadioGroup",
            options: {
                choices: [
                    {
                        label: { en: "Asc" },
                        value: "asc",
                        default: true,
                    },
                    {
                        label: { en: "Desc" },
                        value: "desc",
                    },
                ],
            },
            defaultValue: "asc",
            bindable: true,
            section: "settings",
        },
        sortable: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("items", { content, boundProps }),
            label: {
                en: "Sortable",
            },
            type: "OnOff",
            defaultValue: true,
            section: "settings",
        },
        uncategorizedStack: {
            label: {
                en: "Uncategorized stack",
            },
            type: "OnOff",
            defaultValue: false,
            section: "settings",
        },
        showAddCardButton: {
            label: {
                en: "Show add card button",
            },
            type: "OnOff",
            defaultValue: true,
            bindable: true,
            section: "settings",
        },
        showOnLast: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Show on last",
            },
            type: "OnOff",
            defaultValue: false,
            bindable: true,
            section: "settings",
            propertyHelp: {
                tooltip: "When enabled, Add Card is visible only in the last column.",
            },
        },
        addCardButtonDirectTrigger: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Trigger event on add button",
            },
            type: "OnOff",
            defaultValue: false,
            bindable: true,
            section: "settings",
            propertyHelp: {
                tooltip:
                    "When enabled, clicking Add Card directly triggers 'On add card clicked' without opening the input form.",
            },
        },
        addCardButtonLabel: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card button label",
            },
            type: "Text",
            defaultValue: "Add Card",
            bindable: true,
            section: "settings",
        },
        addCardInputPlaceholder: {
            hidden: (content) => content.showAddCardButton === false || content.addCardButtonDirectTrigger === true,
            label: {
                en: "Add card input placeholder",
            },
            type: "Text",
            defaultValue: "Enter a title or paste a link",
            bindable: true,
            section: "settings",
        },
        addCardSubmitLabel: {
            hidden: (content) => content.showAddCardButton === false || content.addCardButtonDirectTrigger === true,
            label: {
                en: "Add card submit label",
            },
            type: "Text",
            defaultValue: "Add card",
            bindable: true,
            section: "settings",
        },
        uiFontFamily: {
            label: {
                en: "Font family",
            },
            type: "Text",
            defaultValue: "",
            bindable: true,
            section: "style",
        },
        boardBackgroundColor: {
            label: {
                en: "Board background color",
            },
            type: "Text",
            defaultValue: "#f1f3f6",
            bindable: true,
            section: "style",
        },
        boardGap: {
            label: {
                en: "Board gap",
            },
            type: "Number",
            defaultValue: 12,
            bindable: true,
            section: "style",
        },
        boardPadding: {
            label: {
                en: "Board padding",
            },
            type: "Spacing",
            defaultValue: "8px",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "padding",
                tooltip: "A valid CSS padding value",
            },
        },
        columnWidth: {
            label: {
                en: "Column width",
            },
            type: "Text",
            defaultValue: "min(300px, 84vw)",
            bindable: true,
            section: "style",
        },
        columnHeight: {
            label: {
                en: "Column height",
            },
            type: "Number",
            defaultValue: 520,
            bindable: true,
            section: "style",
        },
        columnBlockGap: {
            label: {
                en: "Column section gap",
            },
            type: "Number",
            defaultValue: 8,
            bindable: true,
            section: "style",
        },
        columnBackgroundColor: {
            label: {
                en: "Column background color",
            },
            type: "Text",
            defaultValue: "#f3f4f6",
            bindable: true,
            section: "style",
        },
        columnBorderColor: {
            label: {
                en: "Column border",
            },
            type: "Border",
            defaultValue: "1px solid rgba(15, 23, 42, 0.1)",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "border",
                tooltip: "A valid CSS border value",
            },
        },
        columnShadow: {
            label: {
                en: "Column shadow",
            },
            type: "Text",
            defaultValue: "none",
            bindable: true,
            section: "style",
            propertyHelp: {
                tooltip: "Any valid CSS box-shadow value, for example: 0 8px 24px rgba(0,0,0,0.12)",
            },
        },
        columnTitleColor: {
            label: {
                en: "Column title color",
            },
            type: "Text",
            defaultValue: "#0f172a",
            bindable: true,
            section: "style",
        },
        columnTitleFontSize: {
            label: {
                en: "Column title size",
            },
            type: "Number",
            defaultValue: 13,
            bindable: true,
            section: "style",
        },
        columnTitleFontWeight: {
            label: {
                en: "Column title weight",
            },
            type: "Number",
            defaultValue: 600,
            bindable: true,
            section: "style",
        },
        columnCountBackgroundColor: {
            label: {
                en: "Column count background",
            },
            type: "Text",
            defaultValue: "#f8fafc",
            bindable: true,
            section: "style",
        },
        columnCountColor: {
            label: {
                en: "Column count color",
            },
            type: "Text",
            defaultValue: "#111827",
            bindable: true,
            section: "style",
        },
        columnCountBorderColor: {
            label: {
                en: "Column count border",
            },
            type: "Border",
            defaultValue: "1px solid rgba(15, 23, 42, 0.28)",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "border",
                tooltip: "A valid CSS border value",
            },
        },
        cardBackgroundColor: {
            label: {
                en: "Card background color",
            },
            type: "Text",
            defaultValue: "#fbfdff",
            bindable: true,
            section: "style",
        },
        cardTextColor: {
            label: {
                en: "Card text color",
            },
            type: "Text",
            defaultValue: "#0f172a",
            bindable: true,
            section: "style",
        },
        cardBorderColor: {
            label: {
                en: "Card border",
            },
            type: "Border",
            defaultValue: "1px solid rgba(15, 23, 42, 0.14)",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "border",
                tooltip: "A valid CSS border value",
            },
        },
        cardBorderShadow: {
            label: {
                en: "Card border shadow",
            },
            type: "Text",
            defaultValue: "#3b82f6",
            bindable: true,
            section: "style",
        },
        cardHoverBorderColor: {
            label: {
                en: "Card hover border",
            },
            type: "Text",
            defaultValue: "#3b82f6",
            bindable: true,
            section: "style",
        },
        cardHoverRingColor: {
            label: {
                en: "Card hover ring",
            },
            type: "Text",
            defaultValue: "rgba(59, 130, 246, 0.22)",
            bindable: true,
            section: "style",
        },
        cardMetaIconColor: {
            label: {
                en: "Card meta icon color",
            },
            type: "Text",
            defaultValue: "#4b5563",
            bindable: true,
            section: "style",
        },
        cardMetaGap: {
            label: {
                en: "Card meta gap",
            },
            type: "Number",
            defaultValue: 8,
            bindable: true,
            section: "style",
        },
        cardLabelMetaGap: {
            label: {
                en: "Card label/meta row gap",
            },
            type: "Number",
            defaultValue: 8,
            bindable: true,
            section: "style",
        },
        cardMetaIconSize: {
            label: {
                en: "Card meta icon size",
            },
            type: "Text",
            defaultValue: "auto",
            bindable: true,
            section: "style",
            propertyHelp: {
                tooltip: "Use CSS size like 14px, 1rem, 18px. Keep auto to use default size.",
            },
            bindingValidation: {
                type: "string",
                tooltip: "A valid CSS size value or auto",
            },
        },
        dropPlaceholderColor: {
            label: {
                en: "Drop placeholder color",
            },
            type: "Text",
            defaultValue: "rgba(15, 23, 42, 0.08)",
            bindable: true,
            section: "style",
        },
        cardMinHeight: {
            label: {
                en: "Card min height",
            },
            type: "Number",
            defaultValue: 74,
            bindable: true,
            section: "style",
        },
        cardHeight: {
            label: {
                en: "Card height",
            },
            type: "Text",
            defaultValue: "auto",
            bindable: true,
            section: "style",
            propertyHelp: {
                tooltip: "Supports values like auto, 120px, 50%, etc.",
            },
        },
        cardBorderRadius: {
            label: {
                en: "Card border radius",
            },
            type: "Text",
            defaultValue: "8px",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "border-radius",
                tooltip: "A valid CSS border-radius value",
            },
        },
        cardPadding: {
            label: {
                en: "Card padding",
            },
            type: "Spacing",
            defaultValue: "12px",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "padding",
                tooltip: "A valid CSS padding value",
            },
        },
        cardMargin: {
            label: {
                en: "Card margin",
            },
            type: "Spacing",
            defaultValue: "0px",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "margin",
                tooltip: "A valid CSS margin value",
            },
        },
        cardFontSize: {
            hidden: (content) => !!content.cardLabelTypography,
            label: {
                en: "Card font size",
            },
            type: "Number",
            defaultValue: 13,
            bindable: true,
            section: "style",
        },
        cardFontWeight: {
            hidden: (content) => !!content.cardLabelTypography,
            label: {
                en: "Card font weight",
            },
            type: "Number",
            defaultValue: 400,
            bindable: true,
            section: "style",
        },
        cardLabelTypography: {
            label: {
                en: "Card label typography",
            },
            type: "Text",
            defaultValue: "",
            bindable: true,
            section: "style",
            propertyHelp: {
                tooltip: "Full CSS font shorthand for card label, for example: 600 14px/1.4 Inter",
            },
        },
        cardLabelMaxLength: {
            label: {
                en: "Card label max length",
            },
            type: "Number",
            defaultValue: 0,
            bindable: true,
            section: "style",
            propertyHelp: {
                tooltip: "Maximum characters to show in card label. Set 0 to show full text.",
            },
        },
        cardCursor: {
            label: { en: "Card cursor" },
            type: "TextSelect",
            section: "style",
            options: {
                options: [
                    { value: "auto", label: "Auto", default: true },
                    { value: "default", label: "Default" },
                    { value: "pointer", label: "Pointer" },
                    { value: "none", label: "None" },
                    { value: "not-allowed", label: "Not allowed" },
                    { value: "help", label: "Help" },
                    { value: "text", label: "Text" },
                    { value: "move", label: "Move" },
                    { value: "grab", label: "Grab" },
                    { value: "grabbing", label: "Grabbing" },
                    { value: "n-resize", label: "Arrow up" },
                    { value: "s-resize", label: "Arrow down" },
                    { value: "w-resize", label: "Arrow left" },
                    { value: "e-resize", label: "Arrow right" },
                    { value: "ne-resize", label: "Arrow top-right" },
                    { value: "nw-resize", label: "Arrow top-left" },
                    { value: "se-resize", label: "Arrow bottom-right" },
                    { value: "sw-resize", label: "Arrow bottom-left" },
                    { value: "ew-resize", label: "Arrow left-right" },
                    { value: "ns-resize", label: "Arrow up-down" },
                    { value: "nesw-resize", label: "Arrow top-right to bottom-left" },
                    { value: "nwse-resize", label: "Arrow top-left to bottom-right" },
                    { value: "zoom-in", label: "Zoom in" },
                    { value: "zoom-out", label: "Zoom out" },
                    { value: "col-resize", label: "Column resize" },
                    { value: "row-resize", label: "Row resize" },
                    { value: "all-scroll", label: "All-scroll" },
                    { value: "context-menu", label: "Context menu" },
                    { value: "cell", label: "Cell" },
                    { value: "crosshair", label: "Crosshair" },
                    { value: "vertical-text", label: "Vertical text" },
                    { value: "alias", label: "Alias" },
                    { value: "copy", label: "Copy" },
                    { value: "progress", label: "Progress" },
                    { value: "wait", label: "Wait" },
                ],
            },
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: "string",
                tooltip: "A string that represent the cursor type for cards",
            },
            /* wwEditor:end */
            defaultValue: "auto",
        },
        cardAvatarBorder: {
            label: {
                en: "Avatar border",
            },
            type: "Border",
            defaultValue: "1px solid rgba(255, 255, 255, 0.8)",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "border",
                tooltip: "A valid CSS border value",
            },
        },
        cardAvatarMargin: {
            label: {
                en: "Avatar margin",
            },
            type: "Spacing",
            defaultValue: "0px",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "margin",
                tooltip: "A valid CSS margin value",
            },
        },
        cardAvatarPadding: {
            label: {
                en: "Avatar padding",
            },
            type: "Spacing",
            defaultValue: "0px",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "padding",
                tooltip: "A valid CSS padding value",
            },
        },
        deadlineFontSize: {
            label: {
                en: "Deadline font size",
            },
            type: "Number",
            defaultValue: 11,
            bindable: true,
            section: "style",
        },
        deadlineIconSize: {
            label: {
                en: "Deadline icon size",
            },
            type: "Text",
            defaultValue: "auto",
            bindable: true,
            section: "style",
            propertyHelp: {
                tooltip: "Use CSS size like 12px, 0.8rem, 14px. Keep auto to use default size.",
            },
            bindingValidation: {
                type: "string",
                tooltip: "A valid CSS size value or auto",
            },
        },
        deadlineFontWeight: {
            label: {
                en: "Deadline font weight",
            },
            type: "Number",
            defaultValue: 600,
            bindable: true,
            section: "style",
        },
        deadlinePaddingVertical: {
            label: {
                en: "Deadline padding Y",
            },
            type: "Number",
            defaultValue: 2,
            bindable: true,
            section: "style",
        },
        deadlinePaddingHorizontal: {
            label: {
                en: "Deadline padding X",
            },
            type: "Number",
            defaultValue: 7,
            bindable: true,
            section: "style",
        },
        deadlineBorderRadius: {
            label: {
                en: "Deadline border radius",
            },
            type: "Text",
            defaultValue: "6px",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "border-radius",
                tooltip: "A valid CSS border-radius value",
            },
        },
        deadlineBorderWidth: {
            label: {
                en: "Deadline border width",
            },
            type: "Number",
            defaultValue: 0,
            bindable: true,
            section: "style",
        },
        deadlineBorderColor: {
            label: {
                en: "Deadline border color",
            },
            type: "Text",
            defaultValue: "transparent",
            bindable: true,
            section: "style",
        },
        deadlineOverdueBackgroundColor: {
            label: {
                en: "Deadline overdue bg",
            },
            type: "Text",
            defaultValue: "rgba(248, 113, 113, 0.24)",
            bindable: true,
            section: "style",
        },
        deadlineOverdueTextColor: {
            label: {
                en: "Deadline overdue text",
            },
            type: "Text",
            defaultValue: "#b91c1c",
            bindable: true,
            section: "style",
        },
        deadlineUpcomingBackgroundColor: {
            label: {
                en: "Deadline upcoming bg",
            },
            type: "Text",
            defaultValue: "rgba(148, 163, 184, 0.28)",
            bindable: true,
            section: "style",
        },
        deadlineUpcomingTextColor: {
            label: {
                en: "Deadline upcoming text",
            },
            type: "Text",
            defaultValue: "#0f172a",
            bindable: true,
            section: "style",
        },
        deadlineTodayBackgroundColor: {
            label: {
                en: "Deadline today bg",
            },
            type: "Text",
            defaultValue: "rgba(250, 204, 21, 0.28)",
            bindable: true,
            section: "style",
        },
        deadlineTodayTextColor: {
            label: {
                en: "Deadline today text",
            },
            type: "Text",
            defaultValue: "#854d0e",
            bindable: true,
            section: "style",
        },
        deadlineNeutralBackgroundColor: {
            label: {
                en: "Deadline neutral bg",
            },
            type: "Text",
            defaultValue: "rgba(148, 163, 184, 0.22)",
            bindable: true,
            section: "style",
        },
        deadlineNeutralTextColor: {
            label: {
                en: "Deadline neutral text",
            },
            type: "Text",
            defaultValue: "#334155",
            bindable: true,
            section: "style",
        },
        addCardButtonHeight: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card button height",
            },
            type: "Number",
            defaultValue: 34,
            bindable: true,
            section: "style",
        },
        addCardButtonBackgroundColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card button background",
            },
            type: "Text",
            defaultValue: "#f8fafc",
            bindable: true,
            section: "style",
        },
        addCardButtonHoverBackgroundColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card button hover background",
            },
            type: "Text",
            defaultValue: "#f2f5fa",
            bindable: true,
            section: "style",
        },
        addCardButtonTextColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card button text color",
            },
            type: "Text",
            defaultValue: "#111827",
            bindable: true,
            section: "style",
        },
        addCardButtonHoverTextColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card hover text color",
            },
            type: "Text",
            defaultValue: "#111827",
            bindable: true,
            section: "style",
        },
        addCardButtonIconColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card icon color",
            },
            type: "Text",
            defaultValue: "#111827",
            bindable: true,
            section: "style",
        },
        addCardButtonHoverIconColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card hover icon color",
            },
            type: "Text",
            defaultValue: "#111827",
            bindable: true,
            section: "style",
        },
        addCardButtonBorderColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card button border",
            },
            type: "Border",
            defaultValue: "1px solid rgba(15, 23, 42, 0.18)",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "border",
                tooltip: "A valid CSS border value",
            },
        },
        addCardButtonJustifyContent: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card button justify content",
            },
            type: "TextSelect",
            options: {
                options: [
                    { value: "flex-start", label: "Left", default: true },
                    { value: "center", label: "Center" },
                    { value: "flex-end", label: "Right" },
                    { value: "space-between", label: "Space between" },
                    { value: "space-around", label: "Space around" },
                    { value: "space-evenly", label: "Space evenly" },
                ],
            },
            defaultValue: "flex-start",
            bindable: true,
            section: "style",
        },
        addCardButtonFontSize: {
            hidden: (content) => content.showAddCardButton === false || !!content.addCardButtonTypography,
            label: {
                en: "Add card button font size",
            },
            type: "Number",
            defaultValue: 13,
            bindable: true,
            section: "style",
        },
        addCardButtonFontWeight: {
            hidden: (content) => content.showAddCardButton === false || !!content.addCardButtonTypography,
            label: {
                en: "Add card button font weight",
            },
            type: "Number",
            defaultValue: 600,
            bindable: true,
            section: "style",
        },
        addCardButtonTypography: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card button typography",
            },
            type: "Text",
            defaultValue: "",
            bindable: true,
            section: "style",
            propertyHelp: {
                tooltip: "Full CSS font shorthand for Add Card button, for example: 600 14px/1.35 Inter",
            },
        },
        addCardCancelIconColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card cancel icon",
            },
            type: "Text",
            defaultValue: "#000000",
            bindable: true,
            section: "style",
        },
        addCardCancelHoverIconColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card cancel hover icon",
            },
            type: "Text",
            defaultValue: "#111827",
            bindable: true,
            section: "style",
        },
        addCardInputBackgroundColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card input background",
            },
            type: "Text",
            defaultValue: "#f8fafc",
            bindable: true,
            section: "style",
        },
        addCardInputTextColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card input text color",
            },
            type: "Text",
            defaultValue: "#0f172a",
            bindable: true,
            section: "style",
        },
        addCardInputBorderColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card input border",
            },
            type: "Border",
            defaultValue: "1px solid rgba(15, 23, 42, 0.16)",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "border",
                tooltip: "A valid CSS border value",
            },
        },
        addCardInputPlaceholderColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card placeholder color",
            },
            type: "Text",
            defaultValue: "#6b7280",
            bindable: true,
            section: "style",
        },
        addCardInputFontSize: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card input font size",
            },
            type: "Number",
            defaultValue: 13,
            bindable: true,
            section: "style",
        },
        addCardInputMinHeight: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card input min height",
            },
            type: "Number",
            defaultValue: 70,
            bindable: true,
            section: "style",
        },
        addCardSubmitBackgroundColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card submit background",
            },
            type: "Text",
            defaultValue: "#2563eb",
            bindable: true,
            section: "style",
        },
        addCardSubmitHoverBackgroundColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card submit hover background",
            },
            type: "Text",
            defaultValue: "#1d4ed8",
            bindable: true,
            section: "style",
        },
        addCardSubmitTextColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card submit text color",
            },
            type: "Text",
            defaultValue: "#ffffff",
            bindable: true,
            section: "style",
        },
        addCardSubmitBorderColor: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card submit border color",
            },
            type: "Text",
            defaultValue: "rgba(37, 99, 235, 0.95)",
            bindable: true,
            section: "style",
        },
        addCardSubmitFontSize: {
            hidden: (content) => content.showAddCardButton === false || !!content.addCardSubmitTypography,
            label: {
                en: "Add card submit font size",
            },
            type: "Number",
            defaultValue: 13,
            bindable: true,
            section: "style",
        },
        addCardSubmitFontWeight: {
            hidden: (content) => content.showAddCardButton === false || !!content.addCardSubmitTypography,
            label: {
                en: "Add card submit font weight",
            },
            type: "Number",
            defaultValue: 600,
            bindable: true,
            section: "style",
        },
        addCardSubmitTypography: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card submit typography",
            },
            type: "Text",
            defaultValue: "",
            bindable: true,
            section: "style",
            propertyHelp: {
                tooltip: "Full CSS font shorthand for submit button, for example: 600 13px/1.3 Inter",
            },
        },
        addCardSubmitBorder: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card submit border",
            },
            type: "Border",
            defaultValue: "",
            bindable: true,
            section: "style",
            propertyHelp: {
                tooltip: "Full CSS border value, for example: 1px solid rgba(37,99,235,.95)",
            },
            bindingValidation: {
                type: "string",
                cssSupports: "border",
                tooltip: "A valid CSS border value",
            },
        },
        addCardSubmitBorderRadius: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card submit border radius",
            },
            type: "Text",
            defaultValue: "6px",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "border-radius",
                tooltip: "A valid CSS border-radius value",
            },
        },
        addCardSubmitPadding: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card submit padding",
            },
            type: "Spacing",
            defaultValue: "7px 12px",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "padding",
                tooltip: "A valid CSS padding value",
            },
        },
        addCardSubmitMargin: {
            hidden: (content) => content.showAddCardButton === false,
            label: {
                en: "Add card submit margin",
            },
            type: "Spacing",
            defaultValue: "0px",
            bindable: true,
            section: "style",
            bindingValidation: {
                type: "string",
                cssSupports: "margin",
                tooltip: "A valid CSS margin value",
            },
        },
        stacks: {
            label: {
                en: "Stacks",
            },
            type: "Array",
            bindable: true,
            options: {
                movable: true,
                expandable: true,
                getItemLabel(_, index) {
                    return `Stack ${index + 1}`;
                },
                item: {
                    type: "Object",
                    defaultValue: { label: "", value: "" },
                    options: {
                        item: {
                            label: {
                                label: { en: "Label" },
                                type: "Text",
                            },
                            value: {
                                label: { en: "Value" },
                                type: "Text",
                            },
                        },
                    },
                },
            },
            defaultValue: [
                { label: "Todo", value: "todo" },
                { label: "In progress", value: "wip" },
                { label: "Done", value: "done" },
            ],
            section: "settings",
        },
        stackLabel: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("stacks", { content, boundProps }),
            label: {
                en: "Label",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("stacks", { content }),
            defaultValue: null,
            section: "settings",
        },
        stackValue: {
            hidden: (content, sidepanelContent, boundProps) =>
                !showObjectPropertyPath("stacks", { content, boundProps }),
            label: {
                en: "Value",
            },
            type: "ObjectPropertyPath",
            options: (content) => getObjectPropertyPathOptions("stacks", { content }),
            defaultValue: null,
            section: "settings",
        },
        readonly: {
            label: { en: "Read only", fr: "Lecture seule" },
            type: "OnOff",
            section: "settings",
            bindable: true,
            defaultValue: false,
            hidden: (content, sidePanelContent, boundProps, wwProps) => !!(wwProps && wwProps.readonly !== undefined),
            /* wwEditor:start */
            bindingValidation: {
                type: "boolean",
                tooltip: "A boolean that defines if the input is in readonly: `true | false`",
            },
            /* wwEditor:end */
        },
        draggingCursor: {
            label: { en: "Dragging cursor" },
            type: "TextSelect",
            section: "settings",
            options: {
                options: [
                    { value: "auto", label: "Auto" },
                    { value: "default", label: "Default" },
                    { value: "pointer", label: "Pointer" },
                    { value: "none", label: "None" },
                    { value: "not-allowed", label: "Not allowed" },
                    { value: "help", label: "Help" },
                    { value: "text", label: "Text" },
                    { value: "move", label: "Move" },
                    { value: "grab", label: "Grab" },
                    { value: "grabbing", label: "Grabbing", default: true },
                    { value: "n-resize", label: "Arrow up" },
                    { value: "s-resize", label: "Arrow down" },
                    { value: "w-resize", label: "Arrow left" },
                    { value: "e-resize", label: "Arrow right" },
                    { value: "ne-resize", label: "Arrow top-right" },
                    { value: "nw-resize", label: "Arrow top-left" },
                    { value: "se-resize", label: "Arrow bottom-right" },
                    { value: "sw-resize", label: "Arrow bottom-left" },
                    { value: "ew-resize", label: "Arrow left-right" },
                    { value: "ns-resize", label: "Arrow up-down" },
                    { value: "nesw-resize", label: "Arrow top-right to bottom-left" },
                    { value: "nwse-resize", label: "Arrow top-left to bottom-right" },
                    { value: "zoom-in", label: "Zoom in" },
                    { value: "zoom-out", label: "Zoom out" },
                    { value: "col-resize", label: "Column resize" },
                    { value: "row-resize", label: "Row resize" },
                    { value: "all-scroll", label: "All-scroll" },
                    { value: "context-menu", label: "Context menu" },
                    { value: "cell", label: "Cell" },
                    { value: "crosshair", label: "Crosshair" },
                    { value: "vertical-text", label: "Vertical text" },
                    { value: "alias", label: "Alias" },
                    { value: "copy", label: "Copy" },
                    { value: "progress", label: "Progress" },
                    { value: "wait", label: "Wait" },
                ],
            },
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: "string",
                tooltip: "A string that represent the cursor type",
            },
            /* wwEditor:end */
            defaultValue: "grabbing",
        },
        customDragHandle: {
            label: "Custom drag",
            type: "OnOff",
            section: "settings",
            defaultValue: false,
            propertyHelp: {
                tooltip: `By default, dragging is triggered when a user clicks anywhere on a Kanban item. To trigger the dragging behavior on click of a specific element inside the item:
* Enable this option
* Go to that element’s Settings > HTML attributes
* Add the class you choose to its Class attribute (default: 'draggable'))`,
            },
            hidden: (content, sidePanelContent, boundProps, wwProps) => wwProps?.handle?.length,
        },
        handleClass: {
            label: "Class name",
            type: "Text",
            bindable: true,
            section: "settings",
            defaultValue: "draggable",
            propertyHelp: {
                tooltip:
                    "This class must be added on elements to trigger the drag&drop. (Settings > HTML attributes > Class)",
            },
            options: {
                placeholder: "draggable",
            },
            /* wwEditor:start */
            bindingValidation: {
                type: "string",
                tooltip: "A string that represent the class of the handle",
            },
            /* wwEditor:end */
            hidden: (content, sidePanelContent, boundProps, wwProps) =>
                !content.customDragHandle || wwProps?.handle?.length,
        },
        longPress: {
            label: { en: "Long press to drag" },
            type: "OnOff",
            section: "settings",
            bindable: true,
            responsive: true,
            defaultValue: true,
            propertyHelp: {
                tooltip:
                    "When enabled, items can only be dragged after a long press. Useful for mobile to avoid accidental drags.",
            },
        },
        longPressDelay: {
            hidden: (content) => !content.longPress,
            label: { en: "Long press duration (ms)" },
            type: "Number",
            section: "settings",
            bindable: true,
            defaultValue: 400,
            options: {
                min: 0,
                step: 50,
            },
            propertyHelp: {
                tooltip: "How long the press must be held before the drag starts, in milliseconds.",
            },
        },
    },
};
