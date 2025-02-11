#########################################################################
# This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
# License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
#########################################################################


# Catch and report webapp client errors to the SMC server.
# This is based on bugsnag's MIT licensed lib: https://github.com/bugsnag/bugsnag-js
# The basic idea is to wrap very early at a very low level of the event system,
# such that all libraries loaded later are sitting on top of this.
# Additionally, special care is taken to browser brands and their capabilities.
# Finally, additional data about the webapp client is gathered and sent with the error report.

# list of string-identifyers of errors, that were already reported.
# this avoids excessive resubmission of errors
already_reported = []

FUNCTION_REGEX = /function\s*([\w\-$]+)?\s*\(/i

ignoreOnError = 0

shouldCatch = true

# set this to true, to enable the webapp error reporter for development
enable_for_testing = false
if BACKEND? and BACKEND
    # never enable on the backend -- used by static react rendering.
    ENABLED = false
else
    ENABLED = (not DEBUG) or enable_for_testing

# this is the MAIN function of this module
# it's exported publicly and also used in various spots where exceptions are already
# caught and reported to the browser's console.
reportException = (exception, name, severity, comment) ->
    if !exception or typeof exception == "string"
        return
    # setting those *Number defaults to `undefined` breaks somehow on its way
    # to the DB (it only wants NULL or an int). -1 is signaling that there is no info.
    sendError(
        name: name || exception.name
        message: exception.message || exception.description
        comment: comment ? ''
        stacktrace: stacktraceFromException(exception) || generateStacktrace()
        file: exception.fileName || exception.sourceURL
        path: window.location.href
        lineNumber: exception.lineNumber || exception.line || -1
        columnNumber: exception.columnNumber || -1
        severity: severity || "default"
    )

WHITELIST = ['componentWillMount has been renamed', 'componentWillReceiveProps has been renamed', 'a whole package of antd']
isWhitelisted = (opts) ->
    s = JSON.stringify(opts)
    for x in WHITELIST
        if s.indexOf(x) != -1
            return true
    return false

# this is the final step sending the error report.
# it gathers additional information about the webapp client.
sendError = (opts) ->
    require.ensure [], =>
        # console.log 'sendError', opts
        if isWhitelisted(opts)
            # Ignore this antd message in browser.
            return
        misc = require('smc-util/misc')
        opts = misc.defaults opts,
            name            : misc.required
            message         : misc.required
            comment         : ''
            stacktrace      : ''
            file            : ''
            path            : ''
            lineNumber      : -1
            columnNumber    : -1
            severity        : 'default'
        fingerprint = misc.uuidsha1([opts.name, opts.message, opts.comment].join('::'))
        if fingerprint in already_reported and not DEBUG
            return
        already_reported.push(fingerprint)
        # attaching some additional info
        feature = require('smc-webapp/feature')
        opts.user_agent  = navigator?.userAgent
        opts.browser     = feature.get_browser()
        opts.mobile      = feature.IS_MOBILE
        opts.responsive  = feature.is_responsive_mode()
        opts.smc_version = SMC_VERSION
        opts.build_date  = BUILD_DATE
        opts.smc_git_rev = COCALC_GIT_REVISION
        opts.uptime      = misc.get_uptime()
        opts.start_time  = misc.get_start_time_ts()
        if DEBUG then console.info('error reporter sending:', opts)
        try
            # During initial load in some situations evidently webapp_client
            # is not yet initialized, and webapp_client is undefined.  (Maybe
            # a typescript rewrite of everything relevant will help...).  In
            # any case, for now we
            #   https://github.com/sagemathinc/cocalc/issues/4769
            # As an added bonus, by try/catching and retrying once at least,
            # we are more likely to get the error report in case of a temporary
            # network or other glitch....
            {webapp_client} = require('smc-webapp/webapp-client')   # can possibly be undefined
            await webapp_client.tracking_client.webapp_error(opts)  # might fail.
        catch err
            console.info("failed to report error; trying again in 10 seconds", opts)
            {delay} = require('awaiting');
            await delay(10000)
            try
                {webapp_client} = require('smc-webapp/webapp-client')
                await webapp_client.tracking_client.webapp_error(opts)
            catch err
                console.info("failed to report error", err)

# neat trick to get a stacktrace when there is none
generateStacktrace = () ->
    generated = stacktrace = null
    MAX_FAKE_STACK_SIZE = 10
    ANONYMOUS_FUNCTION_PLACEHOLDER = "[anonymous]"

    try
        throw new Error("")
    catch exception
        generated = "<generated>\n"
        stacktrace = stacktraceFromException(exception)

    if not stacktrace
        generated = "<generated-ie>\n"
        functionStack = []
        try
            curr = arguments.callee.caller.caller
            while curr && functionStack.length < MAX_FAKE_STACK_SIZE
                if FUNCTION_REGEX.test(curr.toString())
                    fn = RegExp.$1 ? ANONYMOUS_FUNCTION_PLACEHOLDER
                else
                    fn = ANONYMOUS_FUNCTION_PLACEHOLDER
                functionStack.push(fn)
                curr = curr.caller
        catch e
            #console.error(e)
        stacktrace = functionStack.join("\n")
    return generated + stacktrace

stacktraceFromException = (exception) ->
    return exception.stack || exception.backtrace || exception.stacktrace

# Disable catching on IE < 10 as it destroys stack-traces from generateStackTrace()
# OF COURSE, COCALC doesn't support any version of IE at all, so ...
if (not window.atob)
    shouldCatch = false

# Disable catching on browsers that support HTML5 ErrorEvents properly.
# This lets debug on unhandled exceptions work.
# TODO: enabling the block below distorts (at least) Chrome error messages.
# Maybe Chrome's window.onerror doesn't work as assumed?
# else if window.ErrorEvent
#     try
#         if new window.ErrorEvent("test").colno == 0
#             shouldCatch = false
#     catch e
#         # No action needed

# flag to ignore "onerror" when already wrapped in the event handler
ignoreNextOnError = () ->
    ignoreOnError += 1
    window.setTimeout((-> ignoreOnError -= 1))

# this is the "brain" of all this
wrap = (_super) ->
    try
        if typeof _super != "function"
            return _super

        if !_super._wrapper
            _super._wrapper = () ->
                if shouldCatch
                    try
                        return _super.apply(this, arguments)
                    catch e
                        reportException(e, null, "error")
                        ignoreNextOnError()
                        throw e
                else
                    return _super.apply(this, arguments)

            _super._wrapper._wrapper = _super._wrapper

        return _super._wrapper

    catch e
        return _super

# replaces an attribute of an object by a function that has it as an argument
polyFill = (obj, name, makeReplacement) ->
    original = obj[name]
    replacement = makeReplacement(original)
    obj[name] = replacement

# wrap all prototype objects that have event handlers
# first one is for chrome, the first three for FF, the rest for IE, Safari, etc.
if ENABLED
    "EventTarget Window Node ApplicationCache AudioTrackList ChannelMergerNode CryptoOperation EventSource FileReader HTMLUnknownElement IDBDatabase IDBRequest IDBTransaction KeyOperation MediaController MessagePort ModalWindow Notification SVGElementInstance Screen TextTrack TextTrackCue TextTrackList WebSocket WebSocketWorker Worker XMLHttpRequest XMLHttpRequestEventTarget XMLHttpRequestUpload".replace(/\w+/g, (global) ->
        prototype = window[global]?.prototype
        if prototype?.hasOwnProperty?("addEventListener")
            polyFill(prototype, "addEventListener", (_super) ->
                return (e, f, capture, secure) ->
                    try
                        if f and f.handleEvent
                            f.handleEvent = wrap(f.handleEvent)
                    catch err
                        #console.log(err)
                    return _super.call(this, e, wrap(f), capture, secure)
            )

            polyFill(prototype, "removeEventListener", (_super) ->
                return (e, f, capture, secure) ->
                    _super.call(this, e, f, capture, secure)
                    return _super.call(this, e, wrap(f), capture, secure)
            )
    )

if ENABLED
    polyFill(window, "onerror", (_super) ->
        return (message, url, lineNo, charNo, exception) ->
            # IE 6+ support.
            if !charNo and window.event
                charNo = window.event.errorCharacter

            #if DEBUG
            #    console.log("intercepted window.onerror", message, url, lineNo, charNo, exception)

            if ignoreOnError == 0
                name = exception?.name or "window.onerror"
                stacktrace = (exception and stacktraceFromException(exception)) or generateStacktrace()
                sendError(
                    name        : name
                    message     : message
                    file        : url
                    path        : window.location.href
                    lineNumber  : lineNo
                    columnNumber: charNo
                    stacktrace  : stacktrace
                    severity    : "error"
                )

            # Fire the existing `window.onerror` handler, if one exists
            if _super
                _super(message, url, lineNo, charNo, exception)
    )

# timing functions

hijackTimeFunc = (_super) ->
    return (f, t) ->
        if typeof f == "function"
            f = wrap(f)
            args = Array.prototype.slice.call(arguments, 2)
            return _super((-> f.apply(this, args)), t)
        else
            return _super(f, t)

if ENABLED
    polyFill(window, "setTimeout", hijackTimeFunc)
    polyFill(window, "setInterval", hijackTimeFunc)

if ENABLED and window.requestAnimationFrame
    polyFill(window, "requestAnimationFrame", (_super) ->
        (callback) ->
            return _super(wrap(callback))
    )

if ENABLED and window.setImmediate
    polyFill(window, "setImmediate", (_super) ->
        return () ->
            args = Array.prototype.slice.call(arguments)
            args[0] = wrap(args[0])
            return _super.apply(this, args)
    )

# console terminal

sendLogLine = (severity, args) ->
    require.ensure [], =>
        misc = require('smc-util/misc')
        if typeof(args) == 'object'
            message = misc.trunc_middle(misc.to_json(args), 1000)
        else
            message = Array.prototype.slice.call(args).join(", ")
        sendError(
            name        : 'Console Output'
            message     : message
            file        : ''
            path        : window.location.href
            lineNumber  : -1
            columnNumber: -1
            stacktrace  : generateStacktrace()
            severity    : severity
        )

wrapFunction = (object, property, newFunction) ->
    oldFunction = object[property]
    object[property] = () ->
        newFunction.apply(this, arguments)
        if typeof oldFunction == "function"
            oldFunction.apply(this, arguments)

if ENABLED and window.console?
    wrapFunction(console, "warn",  (-> sendLogLine("warn", arguments)))
    wrapFunction(console, "error", (-> sendLogLine("error", arguments)))

if ENABLED
    window.addEventListener "unhandledrejection",(e) ->
        require.ensure [], =>
            # just to make sure there is a message
            reason = e.reason ? '<no reason>'
            if typeof(reason) == 'object'
                misc = require('smc-util/misc')
                reason = "#{reason.stack ? reason.message ? misc.trunc_middle(misc.to_json(reason), 1000)}"
            e.message = "unhandledrejection: #{reason}"
            reportException(e, "unhandledrejection")

# public API

exports.reportException = reportException

if DEBUG
    window.cc ?= {}
    window.cc.webapp_error_reporter =
        shouldCatch             : -> shouldCatch
        ignoreOnError           : -> ignoreOnError
        already_reported        : -> already_reported
        stacktraceFromException : stacktraceFromException
        generateStacktrace      : generateStacktrace
        sendLogLine             : sendLogLine
        reportException         : reportException
        is_enabled              : -> ENABLED
