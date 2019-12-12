import { TreeDataProvider, TreeItem, EventEmitter, TreeItemCollapsibleState, window } from "vscode";
import { spawn } from "child_process";
import { getRootPath, handlingErrors } from "./util";
import { NPMErr, NPMErrType } from "./npmErr";

export class VisualNPMProvider implements TreeDataProvider<NodeModule>{
    private _onDidChangeTreeData = new EventEmitter<NodeModule>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor() { }

    // 刷新
    refresh(node: NodeModule): void {
        this._onDidChangeTreeData.fire(node);
    }

    // 检查更新
    async checkUpdate(node: NodeModule): Promise<void> {
        node.busy("checking...");
        this._onDidChangeTreeData.fire(node);
        await node.checkUpdate();
        this._onDidChangeTreeData.fire(node);
    }

    // 更新
    async update(node: NodeModule): Promise<void> {
        if (await window.showInformationMessage("Confirm Update?", "Yes", "No") === "Yes") {
            console.log(node.location);
        }
    }

    getTreeItem(element: NodeModule): TreeItem {
        return element;
    }

    async getChildren(element?: NodeModule): Promise<NodeModule[]> {
        if (element) {
            if (element.contextValue === "node-module") {
                return [];
            }
            else {
                return await this.getNodeModule(element);
            }
        } else {
            return await this.getNodeModule();
        }
    }

    private async getNodeModule(node?: NodeModule): Promise<NodeModule[]> {
        if (node) {
            let command: string = "npm.cmd";
            let args: string[] = ["list", "--depth=0", "--json"];
            if (node.location === NPM.Global) {
                args.push("-g");
            }
            try {
                let childProcess = spawn(command, args, { stdio: "pipe", cwd: getRootPath() });
                if (childProcess.stdout !== null) {
                    let json: string = await new Promise(resolve => childProcess.stdout.on("data", data => resolve(data.toString())));
                    let dependencies = JSON.parse(json).dependencies;
                    return dependencies
                        ? Object.keys(dependencies).map(key => new NodeModule(key, node.location, dependencies[key].version))
                        : [];
                } else {
                    throw new NPMErr(NPMErrType.Error, "Stdout is null");
                }
            } catch (err) {
                handlingErrors(err);
                return [];
            }
        } else {
            return [new NodeModule("local", NPM.Local), new NodeModule("global", NPM.Global)];
        }
    }
}

export class NodeModule extends TreeItem {
    readonly label: string;
    private version: string | undefined;
    readonly location: NPM;
    private attach = "";

    constructor(label: string, location: NPM, version?: string) {
        super(label, version ? TreeItemCollapsibleState.None : TreeItemCollapsibleState.Collapsed);
        this.label = label;
        this.version = version;
        version ? this.contextValue = "node-module" : this.contextValue = "location";
        this.location = location;
    }

    get tooltip(): string {
        if (this.version) {
            return `${this.label} ${this.version}`;
        } else {
            return this.label;
        }
    }

    get description(): string {
        if (this.version) {
            return `${this.version}${this.attach === "" ? "" : `  [ ${this.attach} ]`}`;
        } else {
            return this.attach;
        }
    }

    busy(message: string): void {
        this.attach = message;
    }

    async checkUpdate(): Promise<void> {
        let command: string = "npm.cmd";
        let args: string[] = ["view", this.label, "version"];
        if (this.location === NPM.Global) {
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
}

export enum NPM {
    Local,
    Global
}
