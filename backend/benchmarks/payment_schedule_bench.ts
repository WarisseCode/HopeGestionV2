
import { performance } from 'perf_hooks';

// Mock DB Pool
class MockPool {
    async query(text: string, params: any[]) {
        // Simulate DB latency (e.g., 2ms)
        await new Promise(resolve => setTimeout(resolve, 2));
        return { rows: [] };
    }
}

const pool = new MockPool();

// Current Implementation (N+1)
async function generatePaymentScheduleCurrent(
    leaseId: number,
    startDate: string,
    numInstallments: number,
    amount: number,
    dayOfMonth: number,
    frequency: string = 'mensuel'
) {
    const start = new Date(startDate);

    for (let i = 0; i < numInstallments; i++) {
        let echeanceDate: Date;

        switch (frequency) {
            case 'hebdomadaire': // Weekly
                echeanceDate = new Date(start);
                echeanceDate.setDate(start.getDate() + (i * 7));
                break;
            case 'bimensuel': // Bi-monthly (every 2 weeks)
                echeanceDate = new Date(start);
                echeanceDate.setDate(start.getDate() + (i * 14));
                break;
            case 'mensuel':
            default:
                echeanceDate = new Date(start.getFullYear(), start.getMonth() + i, dayOfMonth || start.getDate());
                break;
        }

        await pool.query(`
            INSERT INTO payment_schedules (lease_id, due_date, total_amount, amount_paid, statut, description)
            VALUES ($1, $2, $3, 0, 'en_attente', $4)
        `, [leaseId, echeanceDate, amount, `Échéance #${i + 1}`]);
    }

    const firstPaymentDate = new Date(startDate);
    await pool.query('UPDATE leases SET next_payment_date = $1 WHERE id = $2', [firstPaymentDate, leaseId]);
}

// Optimized Implementation (Bulk)
async function generatePaymentScheduleOptimized(
    leaseId: number,
    startDate: string,
    numInstallments: number,
    amount: number,
    dayOfMonth: number,
    frequency: string = 'mensuel'
) {
    const start = new Date(startDate);

    const dueDates: Date[] = [];
    const descriptions: string[] = [];

    for (let i = 0; i < numInstallments; i++) {
        let echeanceDate: Date;

        switch (frequency) {
            case 'hebdomadaire': // Weekly
                echeanceDate = new Date(start);
                echeanceDate.setDate(start.getDate() + (i * 7));
                break;
            case 'bimensuel': // Bi-monthly (every 2 weeks)
                echeanceDate = new Date(start);
                echeanceDate.setDate(start.getDate() + (i * 14));
                break;
            case 'mensuel':
            default:
                echeanceDate = new Date(start.getFullYear(), start.getMonth() + i, dayOfMonth || start.getDate());
                break;
        }

        dueDates.push(echeanceDate);
        descriptions.push(`Échéance #${i + 1}`);
    }

    if (numInstallments > 0) {
        await pool.query(`
            INSERT INTO payment_schedules (lease_id, due_date, total_amount, amount_paid, statut, description)
            SELECT $1, d, $3, 0, 'en_attente', descr
            FROM UNNEST($2::date[], $4::text[]) AS t(d, descr)
        `, [leaseId, dueDates, amount, descriptions]);
    }

    const firstPaymentDate = new Date(startDate);
    await pool.query('UPDATE leases SET next_payment_date = $1 WHERE id = $2', [firstPaymentDate, leaseId]);
}

async function runBenchmark() {
    console.log('--- Payment Schedule Benchmark ---');
    console.log('Simulated DB Latency: 2ms per query');

    const scenarios = [
        { installments: 12, label: 'Standard Lease (1 year)' },
        { installments: 60, label: 'Long Lease (5 years)' },
        { installments: 360, label: 'Mortgage (30 years)' }
    ];

    for (const scenario of scenarios) {
        console.log(`\nScenario: ${scenario.label} (${scenario.installments} installments)`);

        // Measure Current
        const startCurrent = performance.now();
        await generatePaymentScheduleCurrent(1, '2023-01-01', scenario.installments, 1000, 1);
        const endCurrent = performance.now();
        const durationCurrent = endCurrent - startCurrent;

        // Measure Optimized
        const startOptimized = performance.now();
        await generatePaymentScheduleOptimized(1, '2023-01-01', scenario.installments, 1000, 1);
        const endOptimized = performance.now();
        const durationOptimized = endOptimized - startOptimized;

        console.log(`  Current (N+1): ${durationCurrent.toFixed(2)}ms`);
        console.log(`  Optimized (Bulk): ${durationOptimized.toFixed(2)}ms`);
        console.log(`  Improvement: ${(durationCurrent / durationOptimized).toFixed(2)}x faster`);
    }
}

runBenchmark();
