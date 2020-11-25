// For more information about secure use of IPC see:
// https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

"use strict";

// Core modules
const fs = require("fs");

// Public modules from npm
const { contextBridge, ipcRenderer } = require("electron");
const F95API = require("f95api");
const logger = require("electron-log");

// Set F95API logger level
F95API.loggerLevel = "warn";

// Array of valid render-to-main channels
const validSendChannels = [
    "window-close",
    "credentials-path",
    "translate",
];

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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("API", {
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
        }
        else logger.warn(`Unauthorized IPC message from 'login-preload.js' through ${channel}: ${data}`);
    },
    /**
     * Send an asynchronous request via IPC.
     * @param {String} channel Communication channel
     * @param {Any[]} data Data to send to main process
     */
    send: (channel, ...data) => {
        // Send a custom message
        if (validSendChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
        else logger.warn(`Unauthorized IPC message from 'login-preload.js' through ${channel}: ${data}`);
    },
    /**
     * Translate a key into a message in the language specified by the user.
     * @param {String} key Unique key of the message
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

// Expose the I/O operations
contextBridge.exposeInMainWorld("IO", {
    /**
     * Read data from a file asynchronously.
     * @param {String} path
     * @returns {Promise<String>}
     */
    read: async function ioRead(path) {
        return fs.readFileSync(path, "utf-8");
    },
    /**
     * Write data in a file asynchronously.
     * @param {String} path
     * @param {Any} value
     */
    write: async function ioWrite(path, value) {
        fs.writeFileSync(path, value);
    },
    /**
     * Check if the specified file exists on disk asynchronously.
     * @param {String} filename 
     * @returns {Boolean}
     */
    exists: async function ioFileExists(filename) {
        return fs.existsSync(filename);
    },
});

// Expose the F95API
contextBridge.exposeInMainWorld("F95", {
    /**
     * Login to the F95Zone platform.
     * @param {String} username
     * @param {String} password
     */
    login: (username, password) => F95API.login(username, password),
});
