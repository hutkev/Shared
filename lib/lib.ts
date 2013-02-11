// Copyright (c) Kevin Jones. All rights reserved. Licensed under the Apache 
// License, Version 2.0. See LICENSE.txt in the project root for complete
// license information.

/// <reference path='import.ts' />
/// <reference path='debug.ts' />
/// <reference path='utils.ts' />
/// <reference path='id.ts' />
/// <reference path='collect.ts' />
/// <reference path='types.ts' />
/// <reference path='tracker.ts' />
/// <reference path='mongo.ts' />

var ver = '0.2.0';

exports.version = function () {
  return ver;
}

exports.info = function () {
  return 'Shared ' + ver + ' Copyright(c) Kevin Jones @hutkev';
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
exports.tests.tracker = shared.tracker;
exports.tests.store = shared.store;
