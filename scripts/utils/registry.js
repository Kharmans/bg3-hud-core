/**
 * BG3 HUD Component Registry
 * Central storage for system adapter registrations
 */
export const BG3HUD_REGISTRY = {
    // Main container classes registered by adapters
    portraitContainer: null,
    passivesContainer: null,
    actionContainer: null,
    abilityContainer: null,
    actionButtonsContainer: null,
    filterContainer: null,
    weaponSetContainer: null,
    infoContainer: null,

    // Additional containers registered by adapters (e.g., rest/turn, weapon)
    containers: {},

    // System adapters
    adapters: [],

    // Active adapter (based on current game system)
    activeAdapter: null,

    // Tooltip manager instance
    tooltipManager: null,

    // Target selector manager instance
    targetSelectorManager: null,

    // Menu builders registered by adapters
    menuBuilders: {}
};

/**
 * Optional methods system adapters MAY implement beyond MODULE_ID/systemId/registerAdapter config.
 *
 * @typedef {Object} BG3HudAdapterHooks
 * @property {Function} [resolveExternalDragData] Parsed drag payload from `JSON.parse(transfer)`. Return a
 *   result to consume the drop; return `null` to let core handle Item/Macro/Activity only.
 *   @returns {Promise<null|BG3HudDragResolution>}
 * @property {Function} [onAdapterFlagsChanged] Respond to Foundry deltas under `changes.flags[MODULE_ID]` for the active actor.
 *   @returns {Promise<boolean>} `true` if the adapter handled targeted UI updates for this delta.
 */

/**
 * @typedef {Object} BG3HudDragResolution
 * @property {foundry.abstract.Document} document
 * @property {'Item'|'Macro'|'Activity'} type
 * @property {Record<string, unknown>} [augment] Merged onto cell data after adapter `transform*` (e.g. strike metadata).
 */

/**
 * BG3 HUD API
 * Methods for system adapters to register components
 */
export const BG3HUD_API = {
    /**
     * Register a portrait container class
     * @param {Class} containerClass - Class that extends PortraitContainer
     */
    registerPortraitContainer(containerClass) {
        console.info('[bg3-hud-core] Registering portrait container:', containerClass.name);
        BG3HUD_REGISTRY.portraitContainer = containerClass;
    },

    /**
     * Register a passives container class
     * @param {Class} containerClass - Class that extends PassivesContainer
     */
    registerPassivesContainer(containerClass) {
        console.info('[bg3-hud-core] Registering passives container:', containerClass.name);
        BG3HUD_REGISTRY.passivesContainer = containerClass;
    },

    /**
     * Register an action container class
     * @param {Class} containerClass - Class that extends ActionContainer
     */
    registerActionContainer(containerClass) {
        console.info('[bg3-hud-core] Registering action container:', containerClass.name);
        BG3HUD_REGISTRY.actionContainer = containerClass;
    },

    /**
     * Register an ability container class
     * @param {Class} containerClass - Class that extends AbilityContainer
     */
    registerAbilityContainer(containerClass) {
        console.info('[bg3-hud-core] Registering ability container:', containerClass.name);
        BG3HUD_REGISTRY.abilityContainer = containerClass;
    },

    /**
     * Register an action buttons container class
     * @param {Class} containerClass - Class that extends ActionButtonsContainer
     */
    registerActionButtonsContainer(containerClass) {
        console.info('[bg3-hud-core] Registering action buttons container:', containerClass.name);
        BG3HUD_REGISTRY.actionButtonsContainer = containerClass;
    },

    /**
     * Register a filter container class
     * @param {Class} containerClass - Class that extends FilterContainer
     */
    registerFilterContainer(containerClass) {
        console.info('[bg3-hud-core] Registering filter container:', containerClass.name);
        BG3HUD_REGISTRY.filterContainer = containerClass;
    },

    /**
     * Register a weapon set container class
     * @param {Class} containerClass - Class that extends WeaponSetContainer
     */
    registerWeaponSetContainer(containerClass) {
        console.info('[bg3-hud-core] Registering weapon set container:', containerClass.name);
        BG3HUD_REGISTRY.weaponSetContainer = containerClass;
    },

    /**
     * Register an info container class
     * @param {Class} containerClass - Class that extends InfoContainer
     */
    registerInfoContainer(containerClass) {
        console.info('[bg3-hud-core] Registering info container:', containerClass.name);
        BG3HUD_REGISTRY.infoContainer = containerClass;
    },

    /**
     * Register a container class
     * @param {string} id - Container identifier (e.g., 'restTurn', 'weapon')
     * @param {Class} containerClass - Container class
     */
    registerContainer(id, containerClass) {
        console.info(`[bg3-hud-core] Registering container '${id}':`, containerClass.name);
        BG3HUD_REGISTRY.containers[id] = containerClass;
    },

    /**
     * Register a system adapter
     * @param {Object} adapter - System adapter instance
     * @param {string} adapter.MODULE_ID - Required: The adapter package ID (must match manifest `id`)
     * @param {string} adapter.systemId - Required: Foundry system id (`game.system.id`) this adapter targets
     * @param {string} [adapter.name] - Optional: Display name for the adapter
     * @param {Object} [config] - Optional: Adapter configuration
     * @param {string[]} [config.tooltipClassBlacklist] - CSS classes to filter from UI tooltips
     */
    registerAdapter(adapter, config = {}) {
        // Validate required properties
        if (!adapter.MODULE_ID) {
            console.error('[bg3-hud-core] Adapter missing required MODULE_ID property:', adapter);
            return;
        }
        if (!adapter.systemId) {
            console.error('[bg3-hud-core] Adapter missing required systemId property:', adapter);
            return;
        }

        // Store config on adapter for later access
        adapter._bg3Config = {
            tooltipClassBlacklist: config.tooltipClassBlacklist || [],
            ...config
        };

        console.info('[bg3-hud-core] Registering adapter:', adapter.constructor.name);
        BG3HUD_REGISTRY.adapters.push(adapter);

        // Set as active if it matches current system
        if (adapter.systemId === game.system.id) {
            BG3HUD_REGISTRY.activeAdapter = adapter;
            console.info('[bg3-hud-core] Active adapter set:', adapter.constructor.name);

            // Connect adapter to target selector manager
            if (BG3HUD_REGISTRY.targetSelectorManager) {
                BG3HUD_REGISTRY.targetSelectorManager.setAdapter(adapter);
                console.info('[bg3-hud-core] Target selector connected to adapter');
            }
        }
    },

    /**
     * Get the component registry
     * @returns {Object} The registry object
     */
    getRegistry() {
        return BG3HUD_REGISTRY;
    },

    /**
     * Get the active system adapter
     * @returns {Object|null} The active adapter or null
     */
    getActiveAdapter() {
        return BG3HUD_REGISTRY.activeAdapter;
    },

    /**
     * Register a tooltip renderer for the current game system
     * @param {string} systemId - System ID matching `game.system.id`
     * @param {Function} renderer - Renderer function that returns tooltip content
     * @param {Object} renderer.data - Data object (item, spell, etc.)
     * @param {Object} renderer.options - Rendering options
     * @returns {Promise<Object>} Object with { content: string|HTMLElement, classes?: string[], direction?: string }
     * 
     * @example
     * BG3HUD_API.registerTooltipRenderer(game.system.id, async (data, options) => {
     *   const html = await renderTemplate('path/to/template.hbs', data);
     *   return {
     *     content: html,
     *     classes: ['item-tooltip', 'spell-tooltip'],
     *     direction: 'UP'
     *   };
     * });
     */
    registerTooltipRenderer(systemId, renderer) {
        if (!BG3HUD_REGISTRY.tooltipManager) {
            console.error('[bg3-hud-core] TooltipManager not initialized. Call BG3HUD_API.setTooltipManager() first.');
            return;
        }
        BG3HUD_REGISTRY.tooltipManager.registerRenderer(systemId, renderer);
    },

    /**
     * Set the tooltip manager instance
     * @param {TooltipManager} tooltipManager - TooltipManager instance
     */
    setTooltipManager(tooltipManager) {
        BG3HUD_REGISTRY.tooltipManager = tooltipManager;
        console.info('[bg3-hud-core] TooltipManager registered');
    },

    /**
     * Get the tooltip manager instance
     * @returns {TooltipManager|null} The tooltip manager or null
     */
    getTooltipManager() {
        return BG3HUD_REGISTRY.tooltipManager;
    },

    /**
     * Register a menu builder for the current game system
     * @param {string} systemId - System ID matching `game.system.id`
     * @param {Class} builderClass - MenuBuilder class (or subclass)
     * @param {Object} [options] - Options for the menu builder
     * @param {Object} [options.adapter] - Adapter instance to pass to builder
     * 
     * @example
     * import { MenuBuilder } from './components/menus/MyMenuBuilder.js';
     * BG3HUD_API.registerMenuBuilder(game.system.id, MenuBuilder, { adapter: this });
     */
    registerMenuBuilder(systemId, builderClass, options = {}) {
        console.info(`[bg3-hud-core] Registering menu builder for system '${systemId}':`, builderClass.name);

        // Create builder instance with adapter if provided
        const builder = new builderClass({ adapter: options.adapter || null });
        BG3HUD_REGISTRY.menuBuilders[systemId] = builder;
    },

    /**
     * Get the menu builder for a system
     * @param {string} [systemId] - System ID (defaults to current game system)
     * @returns {MenuBuilder|null} The menu builder or null
     */
    getMenuBuilder(systemId = null) {
        const targetSystemId = systemId || game.system.id;
        return BG3HUD_REGISTRY.menuBuilders[targetSystemId] || null;
    },

    /**
     * Set the target selector manager instance
     * @param {TargetSelectorManager} manager - TargetSelectorManager instance
     */
    setTargetSelectorManager(manager) {
        BG3HUD_REGISTRY.targetSelectorManager = manager;
        console.info('[bg3-hud-core] TargetSelectorManager registered');
    },

    /**
     * Get the target selector manager instance
     * @returns {TargetSelectorManager|null} The target selector manager or null
     */
    getTargetSelectorManager() {
        return BG3HUD_REGISTRY.targetSelectorManager;
    },

    /**
     * Start target selection for an item use
     * @param {Object} options
     * @param {Token} options.token - The source token (caster/attacker)
     * @param {Item} options.item - The item being used
     * @param {Object} [options.activity] - Optional activity for multi-activity items
     * @returns {Promise<Token[]>} Promise that resolves with selected targets
     */
    async startTargetSelection({ token, item, activity = null }) {
        const manager = BG3HUD_REGISTRY.targetSelectorManager;
        if (!manager) {
            console.warn('[bg3-hud-core] Target selector manager not initialized');
            return Array.from(game.user.targets);
        }
        return manager.select({ token, item, activity });
    },

    /**
     * Check if an item needs targeting
     * @param {Item} item - The item to check
     * @param {Object} [activity] - Optional activity
     * @returns {boolean} True if targeting is required
     */
    needsTargeting(item, activity = null) {
        const manager = BG3HUD_REGISTRY.targetSelectorManager;
        if (!manager) {
            return false;
        }
        return manager.needsTargeting(item, activity);
    },

    /**
     * Show range indicator for an item
     * @param {Object} options
     * @param {Token} options.token - The source token
     * @param {Item} options.item - The item
     * @param {Object} [options.activity] - Optional activity
     */
    showRangeIndicator({ token, item, activity = null }) {
        const manager = BG3HUD_REGISTRY.targetSelectorManager;
        if (!manager) return;
        manager.showRangeIndicator({ token, item, activity });
    },

    /**
     * Hide range indicator
     */
    hideRangeIndicator() {
        const manager = BG3HUD_REGISTRY.targetSelectorManager;
        if (!manager) return;
        manager.hideRangeIndicator();
    }
};
