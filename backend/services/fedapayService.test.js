const path = require('path');
// Use jiti from root node_modules to load the TypeScript service
const jiti = require('jiti')(path.join(process.cwd(), 'index.js'));
const { fedapayService } = jiti('./backend/services/fedapayService');
const assert = require('assert');

describe('FedaPayService', () => {
    describe('calculateEndDate', () => {
        const cases = [
            { y: 2024, m: 0, d: 1, months: 1, expY: 2024, expM: 1, expD: 1, desc: 'Standard case (Jan 1 -> Feb 1)' },
            { y: 2024, m: 0, d: 1, months: 12, expY: 2025, expM: 0, expD: 1, desc: 'One year later (Jan 1 2024 -> Jan 1 2025)' },
            { y: 2024, m: 0, d: 31, months: 1, expY: 2024, expM: 1, expD: 29, desc: 'Month end overflow - leap year (Jan 31 -> Feb 29)' },
            { y: 2025, m: 0, d: 31, months: 1, expY: 2025, expM: 1, expD: 28, desc: 'Month end overflow - non-leap year (Jan 31 -> Feb 28)' },
            { y: 2024, m: 7, d: 31, months: 1, expY: 2024, expM: 8, expD: 30, desc: 'Month end overflow - 31 to 30 days (Aug 31 -> Sep 30)' },
            { y: 2024, m: 11, d: 31, months: 1, expY: 2025, expM: 0, expD: 31, desc: 'Year end transition (Dec 31 -> Jan 31)' },
            { y: 2024, m: 1, d: 29, months: 12, expY: 2025, expM: 1, expD: 28, desc: 'Leap year to non-leap year (Feb 29 2024 -> Feb 28 2025)' },
            { y: 2024, m: 0, d: 1, months: 0, expY: 2024, expM: 0, expD: 1, desc: 'Zero months' },
        ];

        cases.forEach(({ y, m, d, months, expY, expM, expD, desc }) => {
            it(desc, () => {
                const startDate = new Date(y, m, d);
                const actualDate = fedapayService.calculateEndDate(startDate, months);

                assert.strictEqual(actualDate.getFullYear(), expY, `Year mismatch`);
                assert.strictEqual(actualDate.getMonth(), expM, `Month mismatch`);
                assert.strictEqual(actualDate.getDate(), expD, `Day mismatch`);
            });
        });
    });
});
