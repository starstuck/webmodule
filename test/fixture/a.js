var b = require('./b');

exports.describe = function() {
    var test ='sda';
    return 'Module A with dependency: ' + b.describe();
};

function failure() {
    i.do.not.exists += 1;
};

exports.fail = function() {
    failure();
};

//exports.fail();
