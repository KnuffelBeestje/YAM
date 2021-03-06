"use strict";

// Manage unhandled errors
window.onerror = function (message, source, lineno, colno, error) {
    window.API.log.error(`${message} at line ${lineno}:${colno}.\n${error.stack}`);

    window.API.invoke("require-messagebox", {
        type: "error",
        title: "Unhandled error",
        message: `${message} at line ${lineno}:${colno}.\n
        It is advisable to terminate the application to avoid unpredictable behavior.\n
        ${error.stack}\n
        Please report this error on https://github.com/MillenniumEarl/F95GameUpdater`,
        buttons: [{
            name: "close"
        }]
    });
};

/**
 * This class deals with visualizing, managing, modifying 
 * the data related to a game. It is also used to search 
 * for updates on the same.
 */
class RecommendedCard extends HTMLElement {
    constructor() {
        super();

        /**
         * @private
         * Information about the game shown by this card.
         * @type GameInfoExtended
         */
        this._info = null;
        /** 
         * @private
         * Indicates whether the DOM was successfully loaded.
         * @type Boolean
        */
        this._loadedDOM = false;
        /**
         * Default image to use when the game preview is not available.
         */
        this.DEFAULT_IMAGE = "../../resources/images/f95-logo.webp";
    }

    /**
     * Triggered once the element is added to the DOM
     */
    connectedCallback() {
        // Prepare DOM
        if (!this._loadedDOM) this._prepareDOM();
        this._loadedDOM = true;

        // Refresh data
        window.requestAnimationFrame(() => this._refreshUI());
    }

    //#region Properties
    /**
     * Game information shown on this card
     */
    set info(value) {
        if (!value) throw new Error("Invalid value");
        this._info = value;

        // DOM not ready, cannot update information
        if(!this._loadedDOM) return;

        // Refresh data
        window.requestAnimationFrame(() => this._refreshUI());
    }

    /**
     * Game information shown on this card.
     */
    get info() {
        return this._info;
    }
    //#endregion Properties

    //#region Private methods
    /**
     * Load the HTML file and define the buttons of the custom component.
     */
    _prepareDOM() {
        /* Defines the HTML code of the custom element */
        const template = document.createElement("template");

        /* Synchronous read of the HTML template */
        const pathHTML = window.API.join(
            window.API.appDir,
            "src",
            "components",
            "recommended-card",
            "recommended-card.html"
        );
        template.innerHTML = window.IO.readSync(pathHTML);
        this.appendChild(template.content.cloneNode(true));

        /* Bind function to use this */
        this._refreshUI = this._refreshUI.bind(this);

        // Translate DOM
        this._translateElementsInDOM();
    }

    /**
     * @private
     * Update the data shown on the item.
     */
    async _refreshUI() {
        // Set HTML elements
        this.querySelector("#rc-name").innerText = this.info.isMod ?
            `[MOD] ${this.info.name}` :
            this.info.name;
        this.querySelector("#rc-author").innerText = this.info.author;
        this.querySelector("#rc-overview").innerText = this.info.overview;
        this.querySelector("#rc-engine").innerText = this.info.engine;
        this.querySelector("#rc-status").innerText = this.info.status;
        this.querySelector("#rc-available-version").innerText = this.info.version;
        this.querySelector("#rc-preview").setAttribute("src", this.info.previewSrc);
        this.querySelector("#rc-tags").innerText = this.info.tags.join(", ");
        this.querySelector("#rc-open-thread-btn").setAttribute("href", this.info.url);

        // Show/hide last update date
        const lastUpdateElement = this.querySelector("#rc-last-update");
        if (this.info.lastUpdate) {
            // Date in format YYYY-mm-dd
            const datestring = this.info.lastUpdate.toISOString().split("T")[0];
            lastUpdateElement.innerText = datestring;

            // Show element
            lastUpdateElement.style.display = "block";
        }
        else lastUpdateElement.style.display = "none";
    }

    /**
     * @private
     * Translate the DOM elements in the current language.
     */
    async _translateElementsInDOM() {
        // Get only the localizable elements
        const elements = this.querySelectorAll(".localizable");

        // Translate elements
        for (const e of elements) {
            // Change text if no child elements are presents...
            if (e.childNodes.length === 0) e.textContent = await window.API.translate(e.id);
            // ... or change only the last child (the text)
            else e.childNodes[e.childNodes.length - 1].textContent = await window.API.translate(e.id);
        }
    }
    //#endregion Private methods
}

// Let the browser know that <recommended-card> is served by our new class
customElements.define("recommended-card", RecommendedCard);
