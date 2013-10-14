var trycatch = require('trycatch')
  , EventEmitter = require('events').EventEmitter
  , util = require('util')
  , NO_RESULT = {}
  , CONFIG
  , DEFAULT_OPTIONS
  , stepup
  , domain

if (process.domain) {
    domain = require('domain')
}

CONFIG = {
    useAsyncTrycatch: true
}

DEFAULT_OPTIONS = {
    timeout: 10000
}

function config(options) {
    if (options.useAsyncTrycatch !== undefined) {
        CONFIG.useAsyncTrycatch = Boolean(options.useAsyncTrycatch)
    }
    // Allow to be chainable: var $$ = require('stepup').config(...)
    return this;
}

function createResultSet(callback) {
    return ResultSetMixin.call([], callback)
}

function ResultSetMixin(callback) {
    var self = this

    self.expectedLength = 0
    self.error = null
    self.queued = false
    self.spreads = []
    self.groups = {}
    self.finished = false

    self.callback = function (err, set) {
        self.finished = true
        if (callback) {
            callback(err, set)
        }
    }

    self.alloc = ResultSetMixin.alloc
    self.check = ResultSetMixin.check
    self.finalize = ResultSetMixin.finalize

    return self
}

ResultSetMixin.alloc = alloc
function alloc(type, hookFn) {
    var self = this
      , index = self.push(NO_RESULT) - 1

    if (process.domain && hookFn) {
        hookFn = process.domain.bind(hookFn)
    }
    self.expectedLength++

    // Any time a group is requested, we need to ensure the finalized result is always an Array.
    // Otherwise, it's handled identically to 'first'.
    if (type === 'group') {
        self.groups[index] = true
        type = 'first'
    }

    return function collect(err /*, ... rest */) {
        if (self.finished) {
            return
        }

        if (hookFn) {
            hookFn.apply(null, arguments)
        }

        self.spreads.forEach(function (adj) {
            if (adj.index < index) {
                index += adj.amount
            }
        })

        if (self[index] !== NO_RESULT) {
            throw new Error('Callbacks cannot be reused.')
        }

        if (err && type !== 'event' && type !== 'ignore') {
            self.error = err
            self.callback(err)
        }

        if (self.error) {
            return
        }

        if (!type || type === 'first') {
            self[index] = arguments[1]
        } else if (type === 'event') {
            self[index] = arguments[0]
            err = null
        } else if (type === 'collapse') {
            self[index] = Array.prototype.slice.call(arguments, 1)
        } else if (type === 'spread') {
            self.splice.apply(self, [index, 1].concat(Array.prototype.slice.call(arguments, 1)))
            self.spreads.forEach(function (adj) {
                if (adj.index > index) {
                    adj.index += arguments.length - 2
                }
            })
            self.spreads.push({
                index: index,
                amount: arguments.length - 2
            })
        } else if (type === 'none' || type === 'ignore') {
            self.splice(index, 1)
            self.spreads.forEach(function (adj) {
                if (adj.index > index) {
                    adj.index -= 1
                }
            })
            self.spreads.push({
                index: index,
                amount: -1
            })
        }

        self.expectedLength--

        if (!self.queued) {
            process.nextTick(function () {
                self.check()
            })
            self.queued = true
        }
    }
}

ResultSetMixin.check = check
function check() {
    this.queued = false
    if (this.expectedLength === 0) {
        this.callback(null, this)
    }
    return this
}

ResultSetMixin.finalize = finalize
function finalize() {
    var index

    if (this.finished) {
        return this
    }

    index = this.length+1

    while (--index) {
        if (this[index] === NO_RESULT) {
            this[index] = this.groups[index] ? [] : null
        }
    }

    this.finished = true
    return this
}

function Context(steps, options, callback) {
    var self = this

    EventEmitter.call(self)

    if (process.domain) {
        callback = process.domain.bind(callback)
        steps.forEach(function(step, key) {
            steps[key] = process.domain.bind(step)
        })
    }

    if (typeof callback === 'function') {
        self.on('error', function errorHandler(err) {
            self.removeListener('error', errorHandler)
            process.nextTick(function () {
                callback(err)
            })
        })

        self.on('complete', function completeHandler() {
            var args = arguments

            self.removeListener('complete', completeHandler)
            process.nextTick(function () {
                callback.apply(null, [null].concat(Array.prototype.slice.call(args)))
            })
        })
    }

    self.steps = steps
    self.index = 0
    self.data = options.data || {}
    self.midStep = false
    self.finished = false
    self.timeout = options.timeout

    // Resettable
    self.sync = null
    self.results = null
    self.timeoutId = null

    self._reset()
    self._defineProps()
}
util.inherits(Context, EventEmitter)

Context.prototype.resume = resume
function resume() {
    var self = this

    process.nextTick(function () {
        self._nextStep()
    })
}

Context.prototype._initAsyncProp = _initAsyncProp
function _initAsyncProp(name, prop) {
    var self = this

    Object.defineProperty(self, name, {
        get: function () {
            self._outOfSync()
            return prop
        }
    })
}

Context.prototype._defineProps = _defineProps
function _defineProps() {
    var self = this

    self._initAsyncProp('next', next)
    function next(err /*, ... rest */) {
        var args = arguments.length ? arguments : [null]

        self._nextStep.apply(self, args)
    }

    self._initAsyncProp('end', end)
    function end(err /*, ... rest */) {
        var args = arguments.length ? arguments : [null]

        self._finish.apply(self, args)
    }

    Object.defineProperties(self, {
        group: {
            value: self._group
        },
        push: {
            value: function push(type, hookFn) {
                self._outOfSync()
                return self.results.alloc(type, hookFn)
            }
        },
        first: {
            value: function first(hookFn) {
                self._outOfSync()
                return self.results.alloc('first', hookFn)
            }
        },
        collapse: {
            value: function collapse(hookFn) {
                self._outOfSync()
                return self.results.alloc('collapse', hookFn)
            }
        },
        spread: {
            value: function spread(hookFn) {
                self._outOfSync()
                return self.results.alloc('spread', hookFn)
            }
        },
        event: {
            value: function event(hookFn) {
                self._outOfSync()
                return self.results.alloc('event', hookFn)
            }
        },
        bind: {
            value: function bind(ee, event) {
                self._outOfSync()
                return stepup.bind(ee, event, self)
            }
        },
        bindError: {
            value: function bindError(ee) {
                return stepup.bindError(ee, self)
            }
        },
        none: {
            value: function none(hookFn) {
                self._outOfSync()
                return self.results.alloc('none', hookFn)
            }
        },
        ignore: {
            value: function ignore(hookFn) {
                self._outOfSync()
                return self.results.alloc('ignore', hookFn)
            }
        }
    })
}

Context.prototype._outOfSync = _outOfSync
function _outOfSync() {
    var self = this

    if (!self.sync) {
        return
    }

    self.sync = false

    if (self.timeout && !self.timeoutId) {
        self.timeoutId = setTimeout(function () {
            self.emit('timeout', {
                step: self.steps[self.index - 1],
                results: self.results
            }, function skip() {
                self._nextStep()
            })
        }, self.timeout)
    }
}

Context.prototype._reset = _reset
function _reset() {
    var self = this

    self.results = createResultSet(function () {
        self._nextStep()
    })
    self.results.push(self)
    self.sync = true

    if (self.timeoutId) {
        clearTimeout(self.timeoutId)
        self.timeoutId = null
    }
}

Context.prototype._finish = _finish
function _finish(err /*, ... rest */) {
    if (this.finished) {
        return
    }

    this.finished = true

    if (arguments.length > 0) {
        if (err) {
            this.emit('error', err)
        } else {
            err = 'complete'
            this.emit.apply(this, arguments)
        }
        return
    }

    if (!this.results) {
        this.emit('complete')
        return
    }

    if (this.results.error) {
        this.emit('error', this.results.error)
        return
    }

    this.results.finalize()
    this.results[0] = 'complete'

    this.emit.apply(this, this.results)

    return this
}

Context.prototype._group = _group
function _group(count, type) {
    var self = this
      , allocType
      , callback
      , groupResults
      , group


    if (!this.midStep) {
        throw new Error('Cannot call group asynchronously.')
    }

    if (typeof count === 'string') {
        type = count
        count = null
    }

    // Zero is a special case. We're not actually out of sync, because we're expecting to "generate" an empty set of
    // callback functions.
    if (count === 0) {
        return []
    }

    allocType = ['none', 'ignore'].indexOf(type) !== -1 ? type : 'group'
    callback = this.results.alloc(allocType)
    groupResults = createResultSet(callback)

    if (count) {
        self._outOfSync()
        group = []
        while (count--) {
            group.push(groupResults.alloc(type))
        }
        return group
    }

    process.nextTick(function () {
        if (!self.sync && !groupResults.length) {
            if (allocType === 'group') {
                callback(null, [])
                return
            }

            callback()
        }
    })

    return function generator(hookFn) {
        self._outOfSync()
        return groupResults.alloc(type, hookFn)
    }
}

Context.prototype._nextStep = _nextStep
function _nextStep(err /*, ... rest */) {
    var self = this
      , step
      , prev
      , result

    if (this.finished) {
        return
    }

    if (arguments.length > 0) {
        this._reset()
        this.results.error = err
        this.results.push.apply(this.results, Array.prototype.slice.call(arguments, 1))
    }

    if (this.results && this.results.error) {
        this.emit('error', this.results.error)
        return
    }

    if (this.index === this.steps.length) {
        return this._finish()
    }

    step = self.steps[self.index++]
    prev = self.results ? self.results.finalize() : []

    function run() {
        result = step.apply(null, prev)
    }

    self._reset()
    self.midStep = true

    if (CONFIG.useAsyncTrycatch) {
        trycatch(run, function (e) {
            self._finish(e)
        })
    } else {
        try {
            run()
        } catch(e) {
            self._finish(e)
        }
    }

    self.midStep = false

    if (self.sync) {
        if (result instanceof Error) {
            return this._finish(result)
        }
        self.results.push(result)
        self._nextStep()
    }
}

Context.prototype.run = stepup = run
function run(steps, options, callback) {
    var context

    if (arguments.length <= 2) {
        callback = options
        options = {}
    } else if (Object.prototype.toString.call(options) !== '[object Object]') {
        object = {}
    }

    options = util._extend({}, options, DEFAULT_OPTIONS)

    if (this instanceof Context) {
        if (typeof callback === 'string') {
            callback = this.push(callback)
        }

        if (!callback) {
            callback = this.first()
        }

        options.data = this.data
    }

    context = new Context(steps, options, callback)

    context.resume()
    return context
}

stepup.bindFirst = stepup.bind = bindFirst
function bindFirst(ee, event, callback) {
    if (callback instanceof Context) {
        callback = callback.first()
    }

    ee.once(event, function handler(data) {
        callback(null, data)
    })
}

stepup.bindError = bindError
function bindError(ee, callback) {
    var _callback = callback

    if (callback instanceof Context) {
        _callback = function fail(err) {
            callback._finish(err)
        }
    }

    ee.once('error', _callback)
}



stepup.Context = Context
stepup.ResultSetMixin = ResultSetMixin
stepup.createResultSet = createResultSet
stepup.run = stepup
stepup.config = config

module.exports = stepup
