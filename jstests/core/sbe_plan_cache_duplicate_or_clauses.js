/**
 * This test was originally designed to reproduce SERVER-78752. It ensures that the correct plan is
 * added to the cache for similar queries that only differ in their IETs and if there is a
 * dependency between the values of the $or expression
 *
 * @tags: [
 *   # $planCacheStats requires readConcern:"local".
 *   assumes_read_concern_unchanged,
 *   # Plan cache state is node-local so the test assumes it is always reading from the same node.
 *   assumes_read_preference_unchanged,
 *   assumes_unsharded_collection,
 *   cqf_incompatible,
 *   # This test assumes that the SBE plan cache is in use, but SBE does not support clustered
 *   # collections in 7.0.
 *   does_not_support_clustered_collections,
 *   # Plan cache state is node-local, so this test assumes it is always operating against the same
 *   # mongod.
 *   does_not_support_stepdowns,
 *   # $planCacheStats is not supported in transactions.
 *   does_not_support_transactions,
 *   # This test assumes SBE is enabled, but SBE was not enabled by default until 6.3.
 *   requires_fcv_63,
 *   # Plan cache state is node-local and will not get migrated alongside tenant data.
 *   tenant_migration_incompatible,
 * ]
 */
(function() {
"use strict";

load("jstests/libs/sbe_util.js");  // For checkSBEEnabled.

// This test assumes that the queries are using the SBE plan cache.
if (!checkSBEEnabled(db, [], true /*checkAllNodes*/)) {
    jsTestLog("Skipping test because SBE is disabled");
    return;
}

const coll = db.sbe_plan_cache_duplicate_or_clauses;
coll.drop();
assert.commandWorked(coll.createIndex({a: 1, b: 1, c: 1}));

assert.commandWorked(coll.insert({a: 1, b: 1, c: 1}));
assert.commandWorked(coll.insert({a: 1, b: 1, c: 2}));
assert.commandWorked(coll.insert({a: 1, b: 1, c: 3}));

// Show that this query returns 2 results when the plan cache is empty.
assert.eq(2, coll.find({a: 1, b: 1, $or: [{c: 2}, {c: 3, d: {$eq: null}}]}).itcount());

// Create a cached plan. Run the query twice to make sure that the plan cache entry is active.
assert.eq(1, coll.find({a: 1, b: 1, $or: [{c: 1}, {c: 1, d: {$eq: null}}]}).itcount());
assert.eq(1, coll.find({a: 1, b: 1, $or: [{c: 1}, {c: 1, d: {$eq: null}}]}).itcount());

// Check that we have 2 distinct plans in the cache.
let cacheEntries = coll.getPlanCache().list();
assert.eq(2, cacheEntries.length, cacheEntries);

// The query from above should still return 2 results.
assert.eq(2, coll.find({a: 1, b: 1, $or: [{c: 2}, {c: 3, d: {$eq: null}}]}).itcount());
}());
