// For more information about secure use of IPC see:
// https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

"use strict";

// Core modules
const { join } = require("path");

// Public modules from npm
const { ipcRenderer, contextBridge } = require("electron");
const logger = require("electron-log");

// Modules from file
const {
    readFileSync
} = require("../../src/scripts/io-operations.js");

// Array of valid render-to-main channels
const validSendChannels = [
    "window-close",
    "window-resize",
    "translate",
];

// Array of valid main-to-render channels
const validReceiveChannels = ["window-arguments"];

/**
 * @event
 * Handles errors generated by the application.
 * @param {String} message Error message
 * @param {String} source File where the error occurred
 * @param {number} lineno Line containing the instruction that generated the error
 * @param {number} colno Column containing the statement that generated the error
 * @param {Error} error Application generated error
 */
window.onerror = function (message, source, lineno, colno, error) {
    logger.error(`${message} at line ${lineno}:${colno}.\n${error.stack}`);

    ipcRenderer.invoke("require-messagebox", {
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
 * @event
 * Handles errors generated within non-catch promises.
 * @param {PromiseRejectionEvent} error 
 */
window.onunhandledrejection = function (error) {
    logger.error(error.reason);

    ipcRenderer.invoke("require-messagebox", {
        type: "error",
        title: "Unhandled promise rejection",
        message: `${error.reason}.\n
        It is advisable to terminate the application to avoid unpredictable behavior.\n
        Please report this error on https://github.com/MillenniumEarl/F95GameUpdater`,
        buttons: [{
            name: "close"
        }]
    });
};

contextBridge.exposeInMainWorld("API", {
    /**
     * Join multiple strings into a parsed path for the current OS.
     * @param {String[]} paths Partial paths to join
     * @return {String} Joined path
     */
    join: (...paths) => join(...paths),
    /**
     * Return the current working directory.
     */
    cwd: async function cwd() {
        return ipcRenderer.invoke("cwd");
    },
    /**
     * Send an asynchronous request via IPC.
     * @param {String} channel Communication channel
     * @param {Any[]} data Data to send to main process
     */
    send: (channel, ...data) => {
        // Send a custom _message
        if (validSendChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
        else logger.warn(`Unauthorized IPC message from 'messagebox-preload.js' through ${channel}: ${data}`);
    },
    /**
     * Send an asynchronous request via IPC and wait for a response.
     * @param {String} channel Communication channel
     * @param {Any[]} data Data to send to main process
     * @returns {Promise<Any>} Result from the main process
     */
    invoke: (channel, ...data) => {
        // Send a custom message
        if (validSendChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        } else logger.warn(`Unauthorized IPC message from 'messagebox-preload.js' through ${channel}: ${data}`);
    },
    once: (channel, func) => {
        // Receive a custom message
        if (validReceiveChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.once(channel, (event, ...args) => func(...args));
        }
    },
    /**
     * Translate a key into a _message in the language specified by the user.
     * @param {String} key Unique key of the _message
     * @param {Object} interpolation Dictionary containing the interpolation values
     * @returns {Promise<String>}
     */
    translate: async function apiTranslate(key, interpolation) {
        return ipcRenderer.invoke("translate", key, interpolation);
    },
    /**
     * Provide access to logger methods.
     */
    log: logger.functions,
});

contextBridge.exposeInMainWorld("IO", {
    /**
     * Read data from a file asynchronously.
     * @param {String} path
     * @returns {Any}
     */
    read: async function ioRead(path) {
        return readFileSync(path);
    }
});
