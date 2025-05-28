import { createStatus } from '../../src/util/status';

describe('status utility', () => {
    test('update writes to stdout', () => {
        const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
        const status = createStatus();
        status.update('testing');
        expect(writeSpy).toHaveBeenCalled();
        writeSpy.mockRestore();
    });

    test('increment and summary output', () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const status = createStatus();
        status.increment();
        status.increment();
        status.summary();
        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Processed 2 files/));
        logSpy.mockRestore();
    });
});
