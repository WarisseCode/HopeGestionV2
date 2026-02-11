
import { validatePassword, WEAK_PASSWORDS } from '../utils/passwordUtils';

declare const process: any;

// Mock console.log/error to prevent noise during test execution
// const originalConsoleLog = console.log;
// const originalConsoleError = console.error;

function runTests() {
    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, testName: string, details?: string) {
        if (condition) {
            console.log(`✅ Passed: ${testName}`);
            passed++;
        } else {
            console.error(`❌ Failed: ${testName}`);
            if (details) console.error(`   Details: ${details}`);
            failed++;
        }
    }

    console.log('--- Testing Password Validation Utility ---');

    // 1. Valid password
    const validPass = 'StrongP@ss1';
    const validResult = validatePassword(validPass);
    assert(validResult.isValid === true, 'Valid password should be accepted', `Result: ${JSON.stringify(validResult)}`);

    // 2. Too short
    const shortResult = validatePassword('Short1!');
    assert(
        shortResult.isValid === false && shortResult.message?.includes('8 caractères') === true,
        'Short password should be rejected',
        `Message: ${shortResult.message}`
    );

    // 3. Missing uppercase
    const noUpperResult = validatePassword('lower123!');
    assert(
        noUpperResult.isValid === false && noUpperResult.message?.includes('majuscule') === true,
        'Missing uppercase should be rejected',
        `Message: ${noUpperResult.message}`
    );

    // 4. Missing lowercase
    const noLowerResult = validatePassword('UPPER123!');
    assert(
        noLowerResult.isValid === false && noLowerResult.message?.includes('minuscule') === true,
        'Missing lowercase should be rejected',
        `Message: ${noLowerResult.message}`
    );

    // 5. Missing number
    const noNumberResult = validatePassword('NoNumber!');
    assert(
        noNumberResult.isValid === false && noNumberResult.message?.includes('chiffre') === true,
        'Missing number should be rejected',
        `Message: ${noNumberResult.message}`
    );

    // 6. Weak password (that fails complexity first)
    // 'password123' has no uppercase, so it fails complexity check.
    const weakSimpleResult = validatePassword('password123');
    assert(
        weakSimpleResult.isValid === false && weakSimpleResult.message?.includes('majuscule') === true,
        'Simple weak password (password123) fails on complexity',
        `Message: ${weakSimpleResult.message}`
    );

    // 7. Weak password (that passes complexity)
    // 'Admin123' has Upper(A), Lower(dmin), Number(123).
    // 'admin123' is in the weak list.
    const weakComplexResult = validatePassword('Admin123');
    assert(
        weakComplexResult.isValid === false && weakComplexResult.message?.includes('trop commun') === true,
        'Complex weak password (Admin123) fails on weak list check',
        `Message: ${weakComplexResult.message}`
    );

    console.log('\n--- Test Summary ---');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

try {
    runTests();
} catch (error) {
    console.error('Test script crashed:', error);
    process.exit(1);
}
