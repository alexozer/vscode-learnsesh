import * as vscode from "vscode";

import { posix } from "path";

function getTimeStr(date: Date): string {
    let hoursVal = date.getHours() % 12;
    if (hoursVal === 0) {
        hoursVal = 12;
    }
    const hours = String(hoursVal).padStart(2, "0");
    const pm = date.getHours() >= 12 ? "pm" : "am";
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}${pm}`;
    return timeStr;
}

async function createSessionFolder(
    folder: vscode.Uri,
    sessionName: string,
    date: Date
): Promise<vscode.Uri> {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    const monthDirName = `${year}_${month}`;
    const minutesDirName = `${year}${month}${day}_${hours}${minutes}_${sessionName}`;

    const minutesDirUri = folder.with({
        path: posix.join(folder.path, monthDirName, minutesDirName),
    });
    await vscode.workspace.fs.createDirectory(minutesDirUri);
    return minutesDirUri;
}

async function openNotesFiles(folder: vscode.Uri, date: Date): Promise<void> {
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

    // Time string to insert as first line in documents
    const prettyDateStr = `${date.toDateString()} - ${getTimeStr(date)}\n`;

    // Open URIs in order
    for (const uri of fileURIs) {
        await vscode.window.showTextDocument(uri);
        // Idk how else to make everything open in new tabs
        // await vscode.commands.executeCommand("workbench.action.pinEditor");

        // Edit the file so that opening subsequent files opens in new adjacent tabs
        await vscode.window.activeTextEditor?.edit((editBuilder) => {
            editBuilder.insert(new vscode.Position(0, 0), prettyDateStr);
        });
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
    const sessionName = await vscode.window.showInputBox(opts);
    if (sessionName === undefined) {
        // Cancel creating new session
        return;
    }

    // Save and close other editors
    await vscode.workspace.saveAll();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await vscode.commands.executeCommand("workbench.files.action.collapseExplorerFolders");

    const now = new Date(Date.now());

    const dirUri = await createSessionFolder(
        vscode.workspace.workspaceFolders[0].uri,
        sessionName,
        now
    );
    await openNotesFiles(dirUri, now);
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand("learnsesh.newSession", newSession);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
