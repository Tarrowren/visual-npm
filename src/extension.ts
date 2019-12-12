import * as vscode from 'vscode';
import { VisualNPMProvider, NodeModule } from './visualNPM';

export function activate(context: vscode.ExtensionContext) {
	const visualNPMProvider = new VisualNPMProvider();
	vscode.window.registerTreeDataProvider("visual-npm-view", visualNPMProvider);
	vscode.commands.registerCommand("visual-npm.refresh", (node: NodeModule) => visualNPMProvider.refresh(node));
	vscode.commands.registerCommand("visual-npm.module.update", (node: NodeModule) => visualNPMProvider.update(node));
	vscode.commands.registerCommand("visual-npm.module.checkUpdate", (node: NodeModule) => visualNPMProvider.checkUpdate(node));
}

export function deactivate() { }
