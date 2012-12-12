// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='debug.ts' />
/// <reference path='utils.ts' />
/// <reference path='id.ts' />
/// <reference path='collect.ts' />
/// <reference path='types.ts' />
/// <reference path='router.ts' />
/// <reference path='tracker.ts' />
/// <reference path='shared.ts' />

exports.createStore = shared.main.createStore;

//shared.utils.defaultLogger().enableDebugLogging('ROUTER');
//shared.utils.defaultLogger().enableDebugLogging('STORE');
shared.utils.enableAsserts(true);

exports.tests = {};
exports.tests.utils = shared.utils;
exports.tests.types = shared.types;
exports.tests.router = shared.router;
exports.tests.tracker = shared.tracker;
exports.tests.main = shared.main;
