import * as vscode from "vscode";

import { posix } from "path";

async function createSessionFolder(folder: vscode.Uri): Promise<vscode.Uri> {
    const now = new Date(Date.now());
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    let hoursVal = now.getHours() % 12;
    if (hoursVal === 0) {
        hoursVal = 12;
    }
    const hours = String(hoursVal).padStart(2, '0');

    const pm = now.getHours() >= 12 ? "pm" : "am";
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const monthDirName = `${year}-${month}`;
    const minutesDirName = `${year}-${month}-${day}-${hours}:${minutes}${pm}`;

    const minutesDirUri = folder.with({
        path: posix.join(folder.path, monthDirName, minutesDirName),
    });
    await vscode.workspace.fs.createDirectory(minutesDirUri);
    return minutesDirUri;
}

async function openNotesFiles(folder: vscode.Uri): Promise<void> {
    const fileNames = ["dump.md", "meta.md", "questions.md"];
    // Construct URIs
    const fileURIs = fileNames.map((fname) =>
        folder.with({ path: posix.join(folder.path, fname) })
    );

    const folderContents = await vscode.workspace.fs.readDirectory(folder);
    const existingFileNames = folderContents.map((entry) => entry[0]);

    // Write empty files if they don't exist
    for (let fileIdx = 0; fileIdx < fileNames.length; fileIdx++) {
        if (!(fileNames[fileIdx] in existingFileNames)) {
            await vscode.workspace.fs.writeFile(fileURIs[fileIdx], Buffer.from("", "utf-8"));
        }
    }

    // Open URIs in order
    for (const uri of fileURIs) {
        await vscode.window.showTextDocument(uri);
        // Idk how else to make everything open in new tabs
        await vscode.commands.executeCommand("workbench.action.pinEditor");
    }
}

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

    const dirUri = await createSessionFolder(vscode.workspace.workspaceFolders[0].uri);
    await openNotesFiles(dirUri);
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand("learnsesh.newSession", newSession);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
