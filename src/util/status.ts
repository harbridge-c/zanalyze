export interface Status {
    update(message: string): void;
    increment(): void;
    summary(): void;
}

export const createStatus = (): Status => {
    let count = 0;
    const start = process.hrtime.bigint();

    const update = (message: string) => {
        const columns = process.stdout.columns || 80;
        const padded = message.padEnd(columns);
        process.stdout.write(`\r${padded}`);
    };

    const increment = () => {
        count += 1;
    };

    const summary = () => {
        const duration = Number(process.hrtime.bigint() - start) / 1e9;
        process.stdout.write('\n');
        console.log(`Processed ${count} files in ${duration.toFixed(2)}s`);
    };

    return { update, increment, summary };
};
