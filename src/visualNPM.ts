import { TreeDataProvider, TreeItem, EventEmitter, ProviderResult, TreeItemCollapsibleState, window } from "vscode";
import { spawn } from "child_process";
import { getRootPath, handlingErrors } from "./util";
import { NPMErr, NPMErrType } from "./npmErr";

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

    // 检查更新
    async checkUpdate(node: NodeModule): Promise<void> {
        node.busy("checking...");
        this._onDidChangeTreeData.fire(node);
        await node.checkUpdate(this.location);
        this._onDidChangeTreeData.fire(node);
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
                    ? Object.keys(dependencies).map(key => new NodeModule(key, dependencies[key].version))
                    : [];
            } else {
                throw new NPMErr(NPMErrType.Error, "Stdout is null");
            }
        } catch (err) {
            handlingErrors(err);
            return [];
        }
    }
}

export class NodeModule extends TreeItem {
    readonly label: string;
    private version: string;
    private attach = "";

    constructor(label: string, version: string) {
        super(label, TreeItemCollapsibleState.None);
        this.label = label;
        this.version = version;
    }

    get tooltip(): string {
        return `${this.label} ${this.version}`;
    }

    get description(): string {
        return `${this.version}${this.attach === "" ? "" : `  [ ${this.attach} ]`}`;
    }

    busy(message: string): void {
        this.attach = message;
    }

    async checkUpdate(location: NPM): Promise<void> {
        let command: string = "npm.cmd";
        let args: string[] = ["view", this.label, "version"];
        if (location === NPM.Global) {
            args.push("-g");
        }
        try {
            let childProcess = spawn(command, args, { stdio: "pipe", cwd: getRootPath() });
            if (childProcess.stdout !== null) {
                let lastVersion: string = await new Promise(resolve => childProcess.stdout.on("data", data => resolve(data.toString())));
                lastVersion = lastVersion.trim();
                if (this.version === lastVersion) {
                    this.attach = "";
                } else {
                    this.attach = `new! ${lastVersion}`;
                }
            } else {
                throw new NPMErr(NPMErrType.Error, "Stdout is null");
            }
        } catch (err) {
            handlingErrors(err);
        }
    }

    contextValue = "node-module";
}

export enum NPM {
    Local,
    Global
}
