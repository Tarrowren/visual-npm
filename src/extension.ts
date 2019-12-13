import { ExtensionContext, window, commands } from "vscode";
import { VisualNPMProvider, NodeModule, NPMRepo } from "./visualNPM";

export function activate(context: ExtensionContext) {
	const visualNPMProvider = new VisualNPMProvider();
	window.registerTreeDataProvider("visual-npm", visualNPMProvider);
	commands.registerCommand("visual-npm.checkAllUpdates", (node: NPMRepo) => visualNPMProvider.checkAllUpdates(node));
	commands.registerCommand("visual-npm.refresh", (node: NPMRepo) => visualNPMProvider.refresh(node));
	commands.registerCommand("visual-npm.update", (node: NodeModule) => visualNPMProvider.update(node));
}

export function deactivate() { }
