import { TreeDataProvider, TreeItem, EventEmitter, TreeItemCollapsibleState, ProviderResult, window } from "vscode";
import { spawn } from "child_process";
import { getRootPath, handlingErrors } from "./util";
import { NPMErr, NPMErrType } from "./npmErr";
import * as path from "path";

export class VisualNPMProvider implements TreeDataProvider<TreeItem>{
    private _onDidChangeTreeData = new EventEmitter<TreeItem>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    // 刷新
    refresh(node: NPMRepo): void {
        this._onDidChangeTreeData.fire(node);
    }

    // 检查更新
    checkAllUpdates(node: NPMRepo): void {
        node.getNodeModules().forEach(async n => {
            if (n.setBusy("checking...")) {
                this._onDidChangeTreeData.fire(n);
                await n.checkUpdate();
                this._onDidChangeTreeData.fire(n);
            }
        });
    }

    // 更新
    async update(node: NodeModule): Promise<void> {
        if (node.setBusy("updating...")) {
            this._onDidChangeTreeData.fire(node);
            let lastVersion = await node.checkUpdate();
            if (lastVersion) {
                let result = await window.showInformationMessage(`Update "${node.label}" to version [${lastVersion}]?`, "Yes", "No");
                if (result === "Yes") {
                    return;
                }
            } else {
                window.showInformationMessage(`"${node.label}" is up to date!`);
            }
            this._onDidChangeTreeData.fire(node);
        }
    }

    getTreeItem(element: TreeItem): TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): ProviderResult<TreeItem[]> {
        if (element) {
            if (element.contextValue === "node-module") {
                return;
            }
            else if (element.contextValue === "npm-repo") {
                return (element as NPMRepo).findNodeModules();
            }
        } else {
            return [new NPMRepo(NPM.Local), new NPMRepo(NPM.Global)];
        }
    }
}

export class NPMRepo extends TreeItem {
    private readonly location: NPM;
    private nodeModules: NodeModule[] = [];

    constructor(location: NPM) {
        super(location.toString(), TreeItemCollapsibleState.Collapsed);
        this.location = location;
    }

    getNodeModules(): NodeModule[] {
        return this.nodeModules;
    }

    async findNodeModules(): Promise<NodeModule[]> {
        let command: string = "npm.cmd";
        let args: string[] = ["list", "--depth=0", "--json"];
        if (this.location === NPM.Global) {
            args.push("-g");
        }
        try {
            let childProcess = spawn(command, args, { stdio: "pipe", cwd: getRootPath() });
            if (childProcess.stdout === null) {
                throw new NPMErr(NPMErrType.Error, "Stdout is null");
            }
            let json: string = await new Promise(resolve => childProcess.stdout.on("data", data => resolve(data.toString())));
            let dependencies = JSON.parse(json).dependencies;
            this.nodeModules = dependencies
                ? Object.keys(dependencies).map(key => new NodeModule(key, dependencies[key].version, this.location))
                : [];
        } catch (err) {
            handlingErrors(err);
            this.nodeModules = [];
        } finally {
            return this.nodeModules;
        }
    }

    iconPath = {
        dark: path.join(__filename, "..", "..", "resources", "dark", "npm-repo.svg"),
        light: path.join(__filename, "..", "..", "resources", "light", "npm-repo.svg")
    };
    contextValue = "npm-repo";
}

export class NodeModule extends TreeItem {
    readonly label: string;
    private version: string;
    readonly location: NPM;
    private attach = "";
    private lock = false;

    constructor(label: string, version: string, location: NPM) {
        super(label, TreeItemCollapsibleState.None);
        this.label = label;
        this.version = version;
        this.location = location;
    }

    get tooltip(): string {
        return `${this.label} ${this.version}`;
    }

    get description(): string {
        return `${this.version}${this.attach === "" ? "" : `  [ ${this.attach} ]`}`;
    }

    setBusy(message: string): boolean {
        if (this.lock) {
            return false;
        }
        this.lock = true;
        this.attach = message;
        return true;
    }

    async checkUpdate(): Promise<string | undefined> {
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
                    return lastVersion;
                }
            } else {
                throw new NPMErr(NPMErrType.Error, "Stdout is null");
            }
        } catch (err) {
            handlingErrors(err);
        } finally {
            this.lock = false;
        }
    }

    iconPath = {
        dark: path.join(__filename, "..", "..", "resources", "dark", "node-module.svg"),
        light: path.join(__filename, "..", "..", "resources", "light", "node-module.svg")
    };
    contextValue = "node-module";
}

export enum NPM {
    Local = "Local",
    Global = "Global"
}
