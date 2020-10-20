'use strict';
require('array.prototype.find');

const bent = require('bent');
const crypto = require('crypto');

function WebHook(config) {

    if ( !(this instanceof WebHook) ){
        return new WebHook(config);
    }

    const logger = require('sentinel-common').logger;

    const messageHandler = require('./messageHandler')();

    if ( config.webhook === undefined ) {
        config.webhook = {
            endpoints: {}
        };
    }

    let endPoints = config.webhook.endpoints;

    this.add = (h) => {
        let key = crypto.createHash('md5').update(h.url).digest("hex");
        endPoints[ key ] = h;
        config.webhook.endpoints = endPoints;
        config.save();
    };

    setInterval( () =>{

        for (let i in endPoints) {

            let endPoint = endPoints[i];

            if ( endPoint.lastNotify ) {
                let now = new Date();
                let lastNotify = new Date(endPoint.lastNotify);

                let d = ((now - lastNotify) / 1000) / 3600;

                if (d >= 6)
                    delete endPoints[i];
            }
        }

        config.save();

    }, 5000 );

    messageHandler.on('device.update', (data) => {
        for (let i in endPoints) {

            let endPoint = endPoints[i];

            const _notify = bent(endPoint.method, 200);

            let url = endPoint.url;

            let headers = {
                'content-type': 'application/json',
                'x-security-key' : endPoint.securityKey
            };

            let evt = {
                source : 'sentinel',
                type : 'device.update',
                timestamp : new Date().toISOString(),
                payload : data,
            };

            logger.trace(JSON.stringify(evt));

            _notify(url, evt, headers)
                .then((res) => {
                    if (res.statusCode === 200) {
                        logger.debug(`Info: Endpoint ${endPoint.url} notified`);
                        endPoint.lastNotify = new Date().toISOString();
                    }else{
                        logger.debug(`Info: Endpoint ${endPoint.url} notification failed`);
                    }
                })
                .catch((err) => {
                    logger.error('Notify error: ' + err);
                });
        }
    });

}

module.exports = WebHook;