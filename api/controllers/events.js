'use strict';

module.exports.register = (req, res) => {

    let data = req.swagger.params.data.value;

    global.module.add(data);

    res.status(200).end();
};
