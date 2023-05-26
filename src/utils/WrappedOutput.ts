import * as vscode from 'vscode';

export class WrappedOutput {
    public writeEmitter: vscode.EventEmitter<string>;

    constructor(writeEmitter: vscode.EventEmitter<string>) {
        this.writeEmitter = writeEmitter;
    }

    write(data: string | Buffer) {
        if (Buffer.isBuffer(data)) {
            data = data.toString('utf8');
        }
        this.writeEmitter.fire(data);
    }
}
