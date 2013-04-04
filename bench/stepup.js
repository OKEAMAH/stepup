var $$ = require('../lib/stepup');

module.exports = {
    'Single Sync Step': function (done) {
        $$([function stepOne(context) {
        }], done);
    },

    'Double Sync Steps': function (done) {
        $$([function stepOne(context) {
        }, function stepTwo(context) {
        }], done);
    },

    'Quadruple Sync Steps': function (done) {
        $$([function stepOne(context) {
        }, function stepTwo(context) {
        }, function stepThree(context) {
        }, function stepFour(context) {
        }], done);
    },

    'Ten Sync Steps': function (done) {
        $$([function stepOne(context) {
        }, function stepTwo(context) {
        }, function stepThree(context) {
        }, function stepFour(context) {
        }, function stepFive(context) {
        }, function stepSix(context) {
        }, function stepSeven(context) {
        }, function stepEight(context) {
        }, function stepNine(context) {
        }, function stepTen(context) {
        }], done);
    },

    'Single Async Step': function (done) {
        $$([function stepOne(context) {
            process.nextTick(context.push('first'));
        }], done);
    },

    'Double Async Steps': function (done) {
        $$([function stepOne(context) {
            process.nextTick(context.push('first'));
        }, function stepTwo(context) {
            process.nextTick(context.push('first'));
        }], done);
    },

    'Quadruple Async Steps': function (done) {
        $$([function stepOne(context) {
            process.nextTick(context.push('first'));
        }, function stepTwo(context) {
            process.nextTick(context.push('first'));
        }, function stepThree(context) {
            process.nextTick(context.push('first'));
        }, function stepFour(context) {
            process.nextTick(context.push('first'));
        }], done);
    },

    'Ten Async Steps': function (done) {
        $$([function stepOne(context) {
            process.nextTick(context.push('first'));
        }, function stepTwo(context) {
            process.nextTick(context.push('first'));
        }, function stepThree(context) {
            process.nextTick(context.push('first'));
        }, function stepFour(context) {
            process.nextTick(context.push('first'));
        }, function stepFive(context) {
            process.nextTick(context.push('first'));
        }, function stepSix(context) {
            process.nextTick(context.push('first'));
        }, function stepSeven(context) {
            process.nextTick(context.push('first'));
        }, function stepEight(context) {
            process.nextTick(context.push('first'));
        }, function stepNine(context) {
            process.nextTick(context.push('first'));
        }, function stepTen(context) {
            process.nextTick(context.push('first'));
        }], done);
    },

    'Single Async Step with two results': function (done) {
        $$([function stepOne(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }], done);
    },

    'Double Async Steps with two results': function (done) {
        $$([function stepOne(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepTwo(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }], done);
    },

    'Quadruple Async Steps with two results': function (done) {
        $$([function stepOne(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepTwo(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepThree(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepFour(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }], done);
    },

    'Ten Async Steps with two results': function (done) {
        $$([function stepOne(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepTwo(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepThree(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepFour(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepFive(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepSix(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepSeven(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepEight(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepNine(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }, function stepTen(context) {
            process.nextTick(context.push('first'));
            process.nextTick(context.push('first'));
        }], done);
    },

    'Single Group Step with two results': function (done) {
        $$([function stepOne(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }], done);
    },

    'Double Group Steps with two results': function (done) {
        $$([function stepOne(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepTwo(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }], done);
    },

    'Quadruple Group Steps with two results': function (done) {
        $$([function stepOne(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepTwo(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepThree(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepFour(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }], done);
    },

    'Ten Group Steps with two results': function (done) {
        $$([function stepOne(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepTwo(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepThree(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepFour(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepFive(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepSix(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepSeven(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepEight(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepNine(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }, function stepTen(context) {
            var generator = context.group();

            process.nextTick(generator());
            process.nextTick(generator());
        }], done);
    }
};
