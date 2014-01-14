var express = require('express');

express()
    .use('/lib', express.static('./lib'))
    .use('/test', express.static('./test'))
    .get('/', function(req, res) {
        res.redirect('/test/fixture/index.html');
    })
    .listen(3000, function() {
        console.log('Debug server started http://localhost:3000');
    });
