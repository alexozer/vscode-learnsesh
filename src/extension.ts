import * as vscode from "vscode";

import { posix } from "path";

async function newSession(): Promise<void> {
    // We need to have a workspace and folder open
    if (vscode.workspace.workspaceFolders === undefined) {
        vscode.window.showErrorMessage("Cannot create new session: you must have a workspace open");
        return;
    }
    if (vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
            "Cannot create new session: your workspace must contain at least one folder"
        );
        return;
    }

    // Get session name suffix
    const opts: vscode.InputBoxOptions = {
        title: "LearnSesh: New Session",
        prompt: "Enter New Session Name",
    };
    const input = await vscode.window.showInputBox(opts);
    if (input === undefined) {
        // Cancel creating new session
        return;
    }

    // Save and close other editors
    await vscode.workspace.saveAll();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");

    const fileNames = ["dump.md", "meta.md", "questions.md"];
    const folderURI = vscode.workspace.workspaceFolders[0].uri;
    // Construct URIs
    const fileURIs = fileNames.map((fname) =>
        folderURI.with({ path: posix.join(folderURI.path, fname) })
    );
    // Write empty files to URIs in parallel
    await Promise.all(
        fileURIs.map((uri) => vscode.workspace.fs.writeFile(uri, Buffer.from("", "utf-8")))
    );
    // Open URIs in order
    for (const uri of fileURIs) {
        await vscode.window.showTextDocument(uri);
        // Idk how else to make everything open in new tabs
        await vscode.commands.executeCommand("workbench.action.pinEditor");
    }
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand("learnsesh.newSession", newSession);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
