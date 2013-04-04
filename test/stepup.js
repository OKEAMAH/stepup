/*global describe:true, it:true */
var EventEmitter = require('events').EventEmitter,
    expect = require('chai').expect,
    stepup = require('../')

describe('ResultSet', function () {
    it('should be an Array.', function () {
        var set = stepup.createResultSet()

        expect(set).to.be.an.instanceof(Array)
        expect(Array.isArray(set)).to.be.true
    })

    it('should grow on each call to alloc().', function () {
        var set = stepup.createResultSet()

        expect(set).to.have.length(0)

        var callback = set.alloc()

        expect(set).to.have.length(1)
    })

    it('should set when an alloc() callback is fired.', function () {
        var set = stepup.createResultSet(),
            callback = set.alloc()

        callback(null, 42)
        expect(set.slice()).to.deep.equal([42])
    })

    it('should call the final callback once all generated callbacks have been fired.', function (done) {
        var set = stepup.createResultSet(function () {
                expect(set).to.have.length(2)
                expect(set.slice()).to.deep.equal([1, 2])
                done()
            })

        set.alloc()(null, 1)
        set.alloc()(null, 2)
    })
})

describe('Stepup', function () {
    it('should run the first step function asynchronously.', function () {
        var hits = []

        stepup([function stepOne() {
            hits.push(1)
        }])

        hits.push(2)

        expect(hits).to.contain(2)
        expect(hits).to.not.contain(1)
    })

    it('should return the new Context.', function () {
        var context = stepup([])

        expect(context).to.exist
        expect(context).to.be.an.instanceof(stepup.Context)
    })

    it('should pass the current Context into each step function.', function (done) {
        stepup([function stepOne(context) {
            expect(context).to.exist
            expect(context).to.be.an.instanceof(stepup.Context)
            done()
        }])
    })

    describe('Synchronous Flow', function () {
        it('should run each step function in order.', function (done) {
            var hits = []

            stepup([function stepOne() {
                hits.push(1)
            }, function stepTwo() {
                hits.push(2)
            }, function finished() {
                expect(hits.slice()).to.deep.equal([1, 2])
                done()
            }])
        })

        it('should run each step function synchronously after the last.', function (done) {
            var hits = []

            stepup([function stepOne() {
                hits.push(1)

                process.nextTick(function () {
                    hits.push(3)
                })
            }, function stepTwo() {
                hits.push(2)

                process.nextTick(function () {
                    hits.push(4)
                })
            }, function finished() {
                expect(hits.slice()).to.deep.equal([1, 2])
                done()
            }])
        })

        it('should pass the return value of each step function on to the next as the second and final argument.', function (done) {
            stepup([function stepOne(context) {
                return [1]
            }, function stepTwo(context, hits) {
                expect(arguments).to.have.length(2)
                return hits.concat([2])
            }, function finished(context, hits) {
                expect(hits.slice()).to.deep.equal([1, 2])
                done()
            }])
        })

        it('should call the Node-style callback asynchronously after the last step function.', function (done) {
            var hits = []

            stepup([function stepOne() {
                hits.push(1)

                process.nextTick(function () {
                    hits.push(3)
                })
            }, function stepTwo() {
                hits.push(2)

                process.nextTick(function () {
                    hits.push(4)
                })
            }], function finished() {
                expect(hits.slice()).to.deep.equal([1, 2, 3, 4])
                done()
            })
        })

        it('should call the Node-style callback with the return value of the last step function as the second and final argument.', function (done) {
            stepup([function stepOne(context) {
                return [1]
            }, function stepTwo(context, hits) {
                return hits.concat([2])
            }], function finished(err, hits) {
                expect(err).to.not.exist
                expect(hits.slice()).to.deep.equal([1, 2])
                expect(arguments).to.have.length(2)
                done()
            })
        })

        it('should call the Node-style callback with any thrown Error as the first and only argument.', function (done) {
            var message = 'Oh noes!'

            stepup([function stepOne() {
                throw new Error(message)
            }], function finished(err, hits) {
                expect(err).to.have.property('message', message)
                expect(arguments).to.have.length(1)
                done()
            })
        })

        it('should call the Node-style callback with any returned Error as the first and only argument.', function (done) {
            var message = 'Oh noes!'

            stepup([function stepOne() {
                return new Error(message)
            }], function finished(err, hits) {
                expect(err).to.have.property('message', message)
                expect(arguments).to.have.length(1)
                done()
            })
        })
    })

    describe('Pre-defined Asynchronous Flow', function () {
        it('should generate a callback function with each call to push().', function (done) {
            stepup([function stepOne(context) {
                var callback = context.push()

                expect(callback).to.be.a('function')

                callback()
            }], done)
        })

        it('should run each step function only after all previously-generated callbacks have been fired.', function (done) {
            var hits = []

            stepup([function stepOne(context) {
                var callbacks = [
                    context.push(),
                    context.push()
                ]

                hits.push(1)
                callbacks[0]()
                hits.push(2)
                callbacks[1]()
            }], function () {
                expect(hits.slice()).to.deep.equal([1, 2])
                done()
            })
        })

        it('should run each step function with the non-Error result(s) of the previous step based on the type.', function (done) {
            var message = 'Oh noes!'

            stepup([function stepOne(context) {
                context.push()(null, [1])
            }, function stepTwo(context, hits) {
                context.push('first')(null, hits.concat([2]))
            }, function stepThree(context, hits) {
                context.push('spread')(null, hits, [3])
            }, function stepFour(context, hits, otherArray) {
                context.push('collapse')(null, hits[0], hits[1], otherArray[0])
            }, function stepFive(context, hits) {
                context.push('event')(hits.concat([4]))
            }, function stepSix(context, hits) {
                expect(hits.slice()).to.deep.equal([1, 2, 3, 4])
                context.push('none')(null, hits.concat([5]))
            }, function stepSeven(context, hits) {
                expect(arguments).to.have.length(1)
                context.push('ignore')(new Error(message))
            }, function stepSeven(context, hits) {
                expect(arguments).to.have.length(1)
                done()
            }])
        })

        it('should run each step function with the non-Error result(s) of the previous step based on the type (shorthand).', function (done) {
            var message = 'Oh noes!'

            stepup([function stepOne(context) {
                context.push()(null, [1])
            }, function stepTwo(context, hits) {
                context.first()(null, hits.concat([2]))
            }, function stepThree(context, hits) {
                context.spread()(null, hits, [3])
            }, function stepFour(context, hits, otherArray) {
                context.collapse()(null, hits[0], hits[1], otherArray[0])
            }, function stepFive(context, hits) {
                context.ignore()(new Error(message))
                context.none()(null, hits.concat([4]))
                context.event()(hits.concat([5]))
            }, function stepSeven(context, hits) {
                expect(hits.slice()).to.deep.equal([1, 2, 3, 5])
                done()
            }])
        })

        it('should call the Node-style callback with the non-Error result of the last step function as the second and final argument.', function (done) {
            var message = 'Oh noes!'

            stepup([function stepOne(context) {
                context.push()(null, [1])
            }, function stepTwo(context, hits) {
                context.push('first')(null, hits.concat([2]))
            }, function stepThree(context, hits) {
                context.push('spread')(null, hits, [3])
            }, function stepFour(context, hits, otherArray) {
                context.push('collapse')(null, hits[0], hits[1], otherArray[0])
            }, function stepFive(context, hits) {
                context.push('ignore')(new Error(message))
                context.push('none')(null, hits.concat([4]))
                context.push('event')(hits.concat([5]))
            }], function finished(err, hits) {
                expect(err).to.not.exist
                expect(hits.slice()).to.deep.equal([1, 2, 3, 5])
                expect(arguments).to.have.length(2)
                done()
            })
        })

        it('should call the Node-style callback with any Error passed to a callback as the first and only argument.', function (done) {
            var message = 'Oh noes!'

            stepup([function stepOne(context) {
                context.push()(new Error(message))
            }], function finished(err, hits) {
                expect(err).to.have.property('message', message)
                expect(arguments).to.have.length(1)
                done()
            })
        })
    })

    describe('Arbitrary Asynchronous Flow', function () {
        it('should generate a generator function with each call to group().', function (done) {
            stepup([function stepOne(context) {
                var generator = context.group()

                expect(generator).to.be.a('function')
                done()
            }])
        })

        it('should generate a callback function with each call of the generator.', function (done) {
            stepup([function stepOne(context) {
                var callback = context.group()()

                expect(callback).to.be.a('function')
                done()
            }])
        })

        it('should return a set of callback functions if a size is passed to group().', function (done) {
            stepup([function stepOne(context) {
                var callbacks = context.group(4)

                expect(callbacks).to.have.length(4)
                expect(callbacks[0]).to.be.a('function')
                expect(callbacks[1]).to.be.a('function')
                expect(callbacks[2]).to.be.a('function')
                expect(callbacks[3]).to.be.a('function')

                done()
            }])
        })

        it('should run each step function only after all generated callbacks have been fired.', function (done) {
            var hits = []

            stepup([function stepOne(context) {
                var callbacks = context.group(2)

                hits.push(1)
                callbacks[0]()
                hits.push(2)
                callbacks[1]()
            }], function () {
                expect(hits.slice()).to.deep.equal([1, 2])
                done()
            })
        })

        it('should run the next step function immediately if the generator has never been called.', function (done) {
            var hits = []

            stepup([function stepOne(context) {
                var generator = context.group()

                process.nextTick(function () {
                    hits.push(1)
                })
            }, function stepTwo(context, results) {
                expect(results.slice()).to.deep.equal([])
            }], done)
        })

        it('should run each step function with the non-Error result(s) of the previous step based on the type.', function (done) {
            var messageOne = 'Oh noes! 1',
                messageTwo = 'Oh noes! 2'

            stepup([function stepOne(context) {
                var callbacks = context.group(2)

                callbacks[0](null, 1)
                callbacks[1](null, 2)
            }, function stepTwo(context, hits) {
                expect(hits.slice()).to.deep.equal([1, 2])

                var callbacks = context.group(2, 'first')

                callbacks[0](null, 1)
                callbacks[1](null, 2)
            }, function stepThree(context, hits) {
                expect(hits.slice()).to.deep.equal([1, 2])

                var callbacks = context.group(2, 'spread')

                callbacks[0](null, 1, 3)
                callbacks[1](null, 2, 4)
            }, function stepFour(context, hits) {
                expect(hits.slice()).to.deep.equal([1, 3, 2, 4])

                var callbacks = context.group(2, 'collapse')

                callbacks[0](null, 1, 3)
                callbacks[1](null, 2, 4)
            }, function stepFive(context, hits) {
                expect(hits.slice()).to.deep.equal([[1, 3], [2, 4]])

                var callbacks = context.group(2, 'event')

                callbacks[0](1)
                callbacks[1](2)
            }, function stepSix(context, hits) {
                expect(hits.slice()).to.deep.equal([1, 2])

                var callbacks = context.group(2, 'none')

                callbacks[0](null, 1)
                callbacks[1](null, 2, 3)
            }, function stepSeven(context) {
                expect(arguments.length).to.equal(1)

                var callbacks = context.group(2, 'ignore')

                callbacks[0](new Error(messageOne))
                callbacks[1](new Error(messageTwo))
            }, function stepEight(context) {
                expect(arguments.length).to.equal(1)
            }], done)
        })

        it('should call the Node-style callback with the non-Error result of the last step function as the second and final argument.', function (done) {
            stepup([function stepOne(context) {
                var callbacks = context.group(2)

                callbacks[0](null, 1)
                callbacks[1](null, 2)
            }], function finished(err, hits) {
                expect(err).to.not.exist
                expect(hits.slice()).to.deep.equal([1, 2])
                expect(arguments).to.have.length(2)
                done()
            })
        })

        it('should call the Node-style callback with any Error passed to a callback as the first and only argument.', function (done) {
            var message = 'Oh noes!'

            stepup([function stepOne(context) {
                context.group()()(new Error(message))
            }], function finished(err, hits) {
                expect(err).to.have.property('message', message)
                expect(arguments).to.have.length(1)
                done()
            })
        })
    })

    describe('Substeps', function () {
        it('should run with a new Context', function (done) {
            stepup.run([function outerStep(outer) {
                outer.run([function innerStep(inner) {
                    expect(outer).to.not.equal(inner)
                    expect(outer).to.not.deep.equal(inner)
                }], done)
            }])
        })

        it('should share the existing data', function (done) {
            stepup.run([function outerStep(outer) {
                outer.run([function innerStep(inner) {
                    expect(outer.data).to.equal(inner.data)
                }], done)
            }])
        })

        it('should invoke any callback provided after the inner steps', function (done) {
            stepup.run([function outerStep(outer) {
                var fn = outer.first()

                outer.run([function innerStep(inner) {
                    return 42
                }], function innerCallback(err, data) {
                    expect(data).to.equal(42)
                    fn(null, 'answer')
                })
            }], function outerCallback(err, data) {
                expect(data).to.equal('answer')
                done()
            })
        })

        it('should default to continuing the parent Context', function (done) {
            stepup.run([function outerStep(outer) {
                outer.run([function innerStep(outer) {
                    return 42
                }])
            }], function (err, data) {
                expect(data).to.equal(42)
                done()
            })
        })
    })

    describe('Advanced Usage', function () {
        describe('next/nextStep', function () {
            it('should move on to the next step immediately.', function (done) {
                var hits = []

                stepup([function stepOne(context) {
                    hits.push(1)
                    context.next()
                    hits.push(3)
                }, function stepTwo(context) {
                    hits.push(2)
                    context.next()
                }], function finished() {
                    expect(hits).to.deep.equal([1, 2, 3])
                    done()
                })
            })

            it('should reject any results collected after it is called.', function (done) {
                stepup([function stepOne(context) {
                    var callback = context.push(),
                        group = context.group(1)

                    context.next()

                    callback(null, 42)
                    group[0](null, 'answer')
                }, function stepTwo(context) {
                    expect(arguments).to.have.length(1)
                }], done)
            })

            it('should accept non-Error arguments.', function (done) {
                stepup([function stepOne(context) {
                    context.next(null, 42)
                }], function finished(err, arg) {
                    expect(arguments).to.have.length(2)
                    expect(err).to.not.exist
                    expect(arg).to.equal(42)
                    done()
                })
            })

            it('should accept Error arguments.', function (done) {
                var message = 'Oh noes!'

                stepup([function stepOne(context) {
                    context.next(new Error(message))
                }], function finished(err) {
                    expect(err).to.have.property('message', message)
                    expect(arguments).to.have.length(1)
                    done()
                })
            })
        })

        describe('end', function () {
            it('should fire the final callback asynchronously.', function (done) {
                var hits = []

                stepup([function stepOne(context) {
                    hits.push(1)
                    context.end()
                    hits.push(2)
                }], function finished() {
                    expect(hits).to.deep.equal([1, 2])
                    done()
                })
            })

            it('should cause further steps to be skipped.', function (done) {
                var hits = []

                stepup([function stepOne(context) {
                    hits.push(1)
                    context.end()
                    hits.push(3)
                }, function stepTwo(context) {
                    hits.push(2)
                }], function finished() {
                    expect(hits).to.deep.equal([1, 3])
                    done()
                })
            })

            it('should provide the only results.', function (done) {
                stepup([function stepOne(context) {
                    var args = [
                        context.push(),
                        context.push()
                    ]

                    args[0](null, 1)
                    context.end()
                    args[1](null, 2)
                }], function finished(err) {
                    expect(arguments).to.have.length(1)
                    expect(err).to.not.exist
                    done()
                })
            })

            it('should accept non-Error arguments.', function (done) {
                stepup([function stepOne(context) {
                    context.end(null, 42)
                }], function finished(err, arg) {
                    expect(arguments).to.have.length(2)
                    expect(err).to.not.exist
                    expect(arg).to.equal(42)
                    done()
                })
            })

            it('should accept Error arguments.', function (done) {
                var message = 'Oh noes!'

                stepup([function stepOne(context) {
                    context.end(new Error(message))
                }], function finished(err) {
                    expect(err).to.have.property('message', message)
                    expect(arguments).to.have.length(1)
                    done()
                })
            })
        })

        describe('options.timeout', function () {
            it('should fire "timeout" events if a step takes longer than timeout ms.', function (done) {
                var fired = false

                stepup([function stepOne(context) {
                    var callback = context.next.bind(context)

                    setTimeout(function () {
                        callback()
                    }, 10)
                }], {
                    timeout: 1
                }, function finished(err, arg) {
                    expect(fired).to.be.true
                    done()
                }).on('timeout', function () {
                    fired = true
                })
            })

            it('should not fire "timeout" events if a step takes less than timeout ms.', function (done) {
                var fired = false

                stepup([function stepOne(context) {
                    var callback = context.next.bind(context)

                    setTimeout(function () {
                        callback()
                    }, 1)
                }], {
                    timeout: 10
                }, function finished(err, arg) {
                    expect(fired).to.be.false
                    done()
                }).on('timeout', function () {
                    fired = true
                })
            })

            it('should skip the offending steps if the provided skip function is called.', function (done) {
                var fired = false

                stepup([function stepOne(context) {
                    var callback = context.next.bind(context)

                    setTimeout(function () {
                        callback(null, 42)
                    }, 10)
                }], {
                    timeout: 1
                }, function finished(err, arg) {
                    expect(fired).to.be.true
                    expect(err).to.not.exist
                    expect(arg).to.not.exist
                    done()
                }).on('timeout', function (data, skip) {
                    fired = true
                    skip()
                })
            })
        })

        describe('bind', function () {
            it('should bind the first occurrence of an event to a callback', function (done) {
                var emitter = new EventEmitter()

                stepup([function stepOne(context) {
                    var callback = context.first()

                    stepup.bind(emitter, 'test', callback)

                    emitter.emit('test', 42)
                }, function stepTwo(context, answer) {
                    expect(answer).to.equal(42)
                }], done)
            })

            it('should bind the first occurrence of an event to a Context', function (done) {
                var emitter = new EventEmitter()

                stepup([function stepOne(context) {
                    stepup.bind(emitter, 'test', context)

                    emitter.emit('test', 42)
                }, function stepTwo(context, answer) {
                    expect(answer).to.equal(42)
                }], done)
            })

            it('should be aliased on the Context', function (done) {
                var emitter = new EventEmitter()

                stepup([function stepOne(context) {
                    context.bind(emitter, 'test')

                    emitter.emit('test', 42)
                }, function stepTwo(context, answer) {
                    expect(answer).to.equal(42)
                }], done)
            })
        })

        describe('bindError', function () {
            it('should bind the first error on an EventEmitter to a callback', function (done) {
                var emitter = new EventEmitter(),
                    message = 'Oh noes!'

                stepup([function stepOne(context) {
                    var callback = context.first()

                    stepup.bindError(emitter, callback)

                    emitter.emit('error', new Error(message))
                }], function finished(err, hits) {
                    expect(err).to.have.property('message', message)
                    expect(arguments).to.have.length(1)
                    done()
                })
            })

            it('should bind the first error on an EventEmitter to a Context', function (done) {
                var emitter = new EventEmitter(),
                    message = 'Oh noes!'

                stepup([function stepOne(context) {
                    stepup.bindError(emitter, context)

                    emitter.emit('error', new Error(message))
                }, function stepTwo(context, answer) {
                    expect(answer).to.equal(42)
                }], function finished(err, hits) {
                    expect(err).to.have.property('message', message)
                    expect(arguments).to.have.length(1)
                    done()
                })
            })

            it('should be aliased on the Context', function (done) {
                var emitter = new EventEmitter(),
                    message = 'Oh noes!'

                stepup([function stepOne(context) {
                    context.bindError(emitter)

                    emitter.emit('error', new Error(message))
                }, function stepTwo(context, answer) {
                    expect(answer).to.equal(42)
                }], function finished(err, hits) {
                    expect(err).to.have.property('message', message)
                    expect(arguments).to.have.length(1)
                    done()
                })
            })
        })
    })

    describe('Regressions', function () {
        describe('Stepup', function () {
            it('should continue if one group generator has been called, but not another', function (done) {
                stepup([function stepOne(context) {
                    var a = context.group(),
                        callback = a(),
                        b = context.group()

                    process.nextTick(function () {
                        callback(null, 42)
                    })
                }, function stepTwo(context, a, b) {
                    expect(a.slice()).to.deep.equal([42])
                    expect(b.slice()).to.deep.equal([])
                }], done)
            })

            it('should continue if a group generator is never called but a non-group callback is fired', function (done) {
                stepup([function stepOne(context) {
                    var generator = context.group(),
                        callback = context.first()

                    process.nextTick(function () {
                        callback(null, 42)
                    })
                }, function stepTwo(context, group, other) {
                    expect(group.slice()).to.deep.equal([])
                    expect(other).to.equal(42)
                }], done)
            })

            it('should create a new data object per context', function (done) {
                var outerError

                stepup([function stepOne(context) {
                    var callback = context.first()

                    context.data.foo = 'bar'

                    setTimeout(callback, 0)
                }, function stepTwo(context) {
                    expect(outerError).to.not.exist
                    expect(context.data).to.have.property('foo', 'bar')
                }], done)

                stepup([function stepOne(context) {
                    expect(context.data).to.not.have.property('foo')
                    expect(Object.keys(context.data)).to.have.length(0)
                }], function(err) {
                    if (err) {
                        outerError = err
                    }
                })
            })
        })
    })
})
