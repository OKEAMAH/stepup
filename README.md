# stepup

A simple control-flow library for node.js that makes parallel execution, serial execution, and error handling painless.

## Install

    npm install stepup

## Basic Usage

_For a complete overview of functionality, [see the unit tests](https://github.com/CrabDude/stepup/blob/master/test/stepup.js)._

stepup exports a single function:

    var $$ = require('stepup')
    $$(steps, [options], [callback])
    
Which can be used to execute an array of functions or "steps"

    $$([
      function stepOne($) {
        var valueOne = 'a synchronous value'
        return valueOne
      }
    , function stepTwo($, valueOne) {
        fs.readFile('someFile.txt', $.first())
      }
    , function stepThree($, someFileTxt) {
        // ...
      }
    ])
    
The first argument is the context object, `$`. `$` contains functions for generating callbacks. When all generated callbacks have been called, synchronously or asynchronously, the next step will be called.

Note:

* Any number of callbacks may be generated in a given step.
* If no callbacks are generated (e.g., a value is returned), the next step will proceed.

Additionally, there are many types of generator functions
    
    $$([
      function($) {
        // Pass the first non-error argument
        $.first()(null, 'firstValue')
        
        // Pass all arguments as an array
        $.collapse()(null, 'collapseA', 'collapseB', 'collapseC')
        
        // Pass the first argument from an event (error-less) handler
        $.event()('eventValue')
                
        // Don't pass any arguments
        $.none()(null, 'noneA', 'noneB')
        
        // Don't pass any arguments AND ignore the error value
        $.ignore()(new Error('Don't care.'), 'ignoreA', 'ignoreB')
        
        // Pass all arguments spread across multiple values
        $.spread()(null, 'spreadA', 'spreadB')
      }
    , function($, firstValue, collapseValues, eventValue, spreadA, spreadB) {
        // collapseValues === ['collapseA', 'collapseB', 'collapseC']
        
    	// Errors will be passed to the callback and remaining steps will be skipped
    	$.first()(null, 'This value will never be seen.')
    	$.first()(new Error('Pass this to the callback'))
      }
    , function ignoredStep($) {
        // Skipped because error was passed
      }
    ], function callback(err) {
      // err.message === 'Pass this to the callback'
    })
    
The group generator is convenient for waiting on a set of async calls
    
    $$([
      function($) {
        var files = ['A.txt', 'B.txt', 'C.txt', 'D.txt']
        // Create a group generator, type is optional and defaults to 'first'
        // (e.g., 'first', 'collapse', 'event', 'none', etc...)
        var group = $.group('first')
        
        files.forEach(function(fileName) {
          // Generate a callback for each file in the list
          fs.readFile(fileName, group())
        )
      }
    , function($, groupValues) {
        // ...
      }
    ])
    
## Error Handling

The first error is always passed to the callback, with all remaining results, errors, or steps ignored. If you this is undesirable, considering using `$.ignore` or wrapping a callback

    $$([
      function($) {
        var next = $.first()
        
        fs.readFile(fileName, function(err, data) {
          // Ignore the error if it exists
          next(null, data)
        })
      }
      // ...
    ])
    
Additionally, stepup uses the `trycatch` async try/catch library to catch all errors. To disable, call `$.config({useAsyncTrycatch: false})`


## Extras

### $.end    
Useful for skipping the remaining steps and passing values to the callback

    $$([
      function($) {
        if (cachedValue) {
          return $.end(null, cachedValue)
        }
        fs.readFile('someFile.txt', $.first())
      }
    , function($, someFileTxt) {
        // Skipped when cachedValue is truthy
      }
    ], callback)
    
### $.data
Is an object useful for storing state across steps
     
    $$([
      function($) {
        $.data.foo = true
        fs.readFile('someFile.txt', $.first())
      }
    , function($, someFileTxt) {
        // $.data.foo === true
      }
    ], callback)
    
### $.run
Is a convenience function for nesting steps

    $$([
      function($) {
        $.run([
          function(_$) {
            // ...
          }
        , function(_$) {
            // ...
          }
        ], $.first())
        
        fs.readFile('someFile.txt', $.first())
      }
    , function($, subStepResult, someFileTxt) {
        // ...
      }
    ], callback)
        
## Options

### timeout
Use to guarantee a callback is called after a timeout period

    $$([
      function($) {
        var next = $.first()

        setTimeout(function() {
          next()
        }, 2000)
      }
    , function($) {
        // Never called because of timeout
      }
    ], {timeout: 1000}, callback)