import { TreeDataProvider, TreeItem, EventEmitter, ProviderResult, TreeItemCollapsibleState, window, workspace } from "vscode";
import { spawn } from "child_process";

export class VisualNPMProvider implements TreeDataProvider<NodeModule>{
    private location: NPM;
    private _onDidChangeTreeData = new EventEmitter<NodeModule>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(location: NPM) {
        this.location = location;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    checkUpdate(): void {
        console.log(this.onDidChangeTreeData.toString());
    }

    getTreeItem(element: NodeModule): TreeItem {
        return element;
    }

    getChildren(element?: NodeModule): ProviderResult<NodeModule[]> {
        if (element) {
            return [];
        } else {
            return this.getNodeModule();
        }
    }

    private async getNodeModule(): Promise<NodeModule[]> {
        let command: string = "npm.cmd";
        let args: string[] = ["list", "--depth=0", "--json"];
        if (this.location === NPM.Global) {
            args.push("-g");
        }
        try {
            let childProcess = spawn(command, args, { stdio: "pipe", cwd: getRootPath() });
            if (childProcess.stdout !== null) {
                let json: string = await new Promise(resolve => childProcess.stdout.on("data", data => resolve(data.toString())));
                let dependencies = JSON.parse(json).dependencies;
                return dependencies
                    ? Object.keys(dependencies).map(key => new NodeModule(key, dependencies[key].version, this.location))
                    : [];
            } else {
                throw new NPMError(NPMErrorType.Error, "Stdout is null");
            }
        } catch (err) {
            if (err.type === NPMErrorType.Error) {
                window.showErrorMessage(err.message);
            } else if (err.type === NPMErrorType.Warning) {
                window.showWarningMessage(err.message);
            } else if (err.type === NPMErrorType.Info) {
                window.showInformationMessage(err.message);
            } else {
                window.showErrorMessage(err.message);
            }
            return [];
        }
    }


}

export class NodeModule extends TreeItem {
    public description: string;
    public readonly label: string;
    private version: string;
    public readonly location: NPM;

    constructor(label: string, version: string, location: NPM) {
        super(label, TreeItemCollapsibleState.None);
        this.label = label;
        this.version = version;
        this.location = location;
        this.description = this.version;
    }

    get tooltip(): string {
        return `${this.label} ${this.version}`;
    }

    async changeDescript(): Promise<void> {
        let command: string = "npm.cmd";
        let args: string[] = ["view", this.label, "version"];
        if (this.location === NPM.Global) {
            args.push("-g");
        }
        try {
            let childProcess = spawn(command, args, { stdio: "pipe", cwd: getRootPath() });
            if (childProcess.stdout !== null) {
                let json = await new Promise(resolve => childProcess.stdout.on("data", data => resolve(data.toString())));

                console.log(json);
                this.description = "nnn";

            } else {
                throw new NPMError(NPMErrorType.Error, "Stdout is null");
            }
        } catch{

        }
    }

    contextValue = "node-module";
}

class NPMError extends Error {
    public readonly type: NPMErrorType;
    constructor(type: NPMErrorType, message: string) {
        super(message);
        this.type = type;
    }
}

enum NPMErrorType {
    Error,
    Warning,
    Info
}

export enum NPM {
    Local,
    Global
}

function getRootPath(): string {
    let folders = workspace.workspaceFolders;
    if (folders === undefined) {
        throw new NPMError(NPMErrorType.Info, "Please open a folder");
    }
    let editor = window.activeTextEditor;
    if (editor === undefined) {
        return folders[0].uri.fsPath;
    }
    for (let folder of folders) {
        if (editor.document.uri.fsPath.indexOf(folder.uri.fsPath) === 0) {
            return folder.uri.fsPath;
        }
    }
    return folders[0].uri.fsPath;
}