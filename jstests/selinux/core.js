
'use strict';

load('jstests/selinux/lib/selinux_base_test.js');

class TestDefinition extends SelinuxBaseTest {
    run() {
        // On RHEL7 there is no python3, but check_has_tag.py will also work with python2
        const python = (0 == runNonMongoProgram("which", "python3")) ? "python3" : "python2";

        const dirs = ["jstests/core", "jstests/core_standalone"];

        for (let dir of dirs) {
            jsTest.log("Running tests in " + dir);

            const all_tests = ls(dir).filter(d => !d.endsWith("/")).sort();
            assert(all_tests);
            assert(all_tests.length);

            for (let t of all_tests) {
                // Tests in jstests/core weren't specifically made to pass in this very scenario, so
                // we will not be fixing what is not working, and instead exclude them from running
                // as "known" to not work. This is done by the means of "no_selinux" tag
                const HAS_TAG = 0;
                const NO_TAG = 1;
                let checkTagRc = runNonMongoProgram(
                    python, "buildscripts/resmokelib/utils/check_has_tag.py", t, "^no_selinux$");
                if (HAS_TAG == checkTagRc) {
                    jsTest.log("Skipping test due to no_selinux tag: " + t);
                    continue;
                }
                if (NO_TAG != checkTagRc) {
                    throw ("Failure occurred while checking tags of test: " + t);
                }

                // Tests relying on featureFlagXXX will not work
                checkTagRc = runNonMongoProgram(
                    python, "buildscripts/resmokelib/utils/check_has_tag.py", t, "^featureFlag.+$");
                if (HAS_TAG == checkTagRc) {
                    jsTest.log("Skipping test due to feature flag tag: " + t);
                    continue;
                }
                if (NO_TAG != checkTagRc) {
                    throw ("Failure occurred while checking tags of test: " + t);
                }

                jsTest.log("Running test: " + t);
                if (!load(t)) {
                    throw ("failed to load test " + t);
                }
                jsTest.log("Successful test: " + t);
            }
        }

        jsTest.log("code test suite ran successfully");
    }
}
