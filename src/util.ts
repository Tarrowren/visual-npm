import { workspace, window } from "vscode";
import { NPMErr, NPMErrType } from "./npmErr";

export function getRootPath(): string {
    let folders = workspace.workspaceFolders;
    if (folders === undefined || folders.length === 0) {
        throw new NPMErr(NPMErrType.Info, "Please open a folder");
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

export function handlingErrors(err: NPMErr): void {
    if (err.type === NPMErrType.Error) {
        window.showErrorMessage(err.message);
    } else if (err.type === NPMErrType.Warning) {
        window.showWarningMessage(err.message);
    } else if (err.type === NPMErrType.Info) {
        window.showInformationMessage(err.message);
    } else {
        window.showErrorMessage(err.message);
    }
}
