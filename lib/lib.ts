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
/// <reference path='primary.ts' />
/// <reference path='secondary.ts' />

var ver = '0.2.0';

exports.version = function () {
  return ver;
}

exports.info = function () {
  return 'hut78-shared ' + ver + ' Copyright(c) Kevin Jones';
}


exports.createStore = shared.store.createStore;

exports.debug = {};
exports.debug.log = function (args) {
  shared.utils.defaultLogger().enableDebugLogging(args);
}
exports.debug.assert = shared.utils.enableAsserts

exports.tests = {};
exports.tests.utils = shared.utils;
exports.tests.types = shared.types;
exports.tests.router = shared.router;
exports.tests.tracker = shared.tracker;
exports.tests.store = shared.store;
