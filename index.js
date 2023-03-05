const fetch = require('isomorphic-fetch');

class Twitch {
    /**
     * Twitch basic client.
     * @param {{ clientId: string, clientSecret: string }} options 
     */
    constructor(options) {
        /** @type {string} Twitch Client ID. */
        this.clientId = options.clientId;

        /** @type {string} Twitch Client Secret. */
        this.clientSecret = options.clientSecret;

        /** @type {{ access_token: string, expires_at: number }} Twitch Access Tokens. */
        this.accessToken = {
            'access_token': '',
            'expires_at': 0
        };
    }

    /**
     * Retrieve token from Twitch.
     * @param {boolean} force Whether or not to force token renewal.
     * @returns {Promise<string>}
     */
    async validateTwitch(force) {
        return new Promise((resolve, reject) => {
            if (!force && this.accessToken.access_token && Date.now() > this.accessToken.expires_at - 5 * 60 * 1000) { resolve(this.accessToken.access_token); }
            else {
                fetch(
                    `https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`,
                    { 'method': 'POST' }
                ).then((response) => response.json()).then((response) => {
                    if (response.status && response.status >= 400) { reject(response.message); }

                    this.accessToken.access_token = response.access_token;
                    this.accessToken.expires_at = Date.now() + response.expires_in * 1000;

                    resolve(this.accessToken.access_token);
                }).catch(reject);
            }
        });
    }

    /**
     * Fetch from Twitch API.
     * @param {string} url 
     * @param {{ method: "GET"|"POST"|"DELETE"|"PUT", headers: Object.<string, string> }} options 
     * @param {boolean} dataOnly
     * @param {boolean} force
     */
    async fetch(url, options, dataOnly, force) {
        return new Promise((resolve, reject) => {
            this.validateTwitch(force).then((token) => {
                const fOptions = Object.assign({}, options);
                fOptions.headers = Object.assign({}, fOptions.headers, { 'Authorization': `Bearer ${token}`, 'Client-Id': this.clientId });

                fetch(url.includes('api.twitch.tv') ? url : `https://api.twitch.tv/helix${url.startsWith('/') ? '' : '/'}${url}`, fOptions)
                .then((response) => response.json()).then((response) => {
                    if (response.status && response.status >= 400 && !force) { return this.fetch(url, options, dataOnly, true).then(resolve).catch(reject); }
                    else if (response.message) { reject(response.message) }
                    else if (!response.data) { reject('An unknown occured and data was not fetched.'); }

                    resolve(dataOnly ? response.data : response);
                }).catch(reject);
            }).catch(reject);
        });
    }
}

module.exports = { Twitch };