import * as vscode from 'vscode';
import { VisualNPMProvider, NPM, NodeModule } from './visualNPM';

export function activate(context: vscode.ExtensionContext) {
	const localVisualNPMProvider = new VisualNPMProvider(NPM.Local);
	vscode.window.registerTreeDataProvider("visual-npm-local", localVisualNPMProvider);
	vscode.commands.registerCommand("local.refresh", () => localVisualNPMProvider.refresh());
	//vscode.commands.registerCommand("asd", (node: NodeModule) => node.changeDescript());

	const globalVisualNPMProvider = new VisualNPMProvider(NPM.Global);
	vscode.window.registerTreeDataProvider("visual-npm-global", globalVisualNPMProvider);
	vscode.commands.registerCommand("global.refresh", () => globalVisualNPMProvider.refresh());
	vscode.commands.registerCommand("asd", () => globalVisualNPMProvider.checkUpdate());
}

export function deactivate() { }
