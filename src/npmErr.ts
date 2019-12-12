export class NPMErr extends Error {
    public readonly type: NPMErrType;
    constructor(type: NPMErrType, message: string) {
        super(message);
        this.type = type;
    }
}

export enum NPMErrType {
    Error,
    Warning,
    Info
}
