# stepup

A simple control-flow library for node.JS that makes parallel execution, serial execution, and error handling painless.

## How to install

    npm install stepup

## Basic Usage (Serial)

stepup exports a single function:

    var $$ = require('stepup')
    $$(steps, [options], [callback])
