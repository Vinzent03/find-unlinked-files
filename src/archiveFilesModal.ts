import { App, Modal, normalizePath, Notice, TFile, TFolder } from "obsidian";

export class ArchiveFilesModal extends Modal {
    constructor(
        app: App,
        private filesToArchive: TFile[],
        private archiveDirectory: string
    ) {
        super(app);
    }

    onOpen() {
        let { contentEl, titleEl } = this;
        titleEl.setText(
            "Move " +
                this.filesToArchive.length +
                " files to " +
                this.archiveDirectory +
                "?"
        );
        contentEl
            .createEl("button", { text: "Cancel" })
            .addEventListener("click", () => this.close());
        contentEl.setAttr("margin", "auto");

        contentEl
            .createEl("button", {
                cls: "mod-cta",
                text: "Confirm",
            })
            .addEventListener("click", () => {
                void this.archiveFiles();
            });
    }

    private async archiveFiles() {
        let archivedFiles = 0;
        let failedFiles = 0;
        for (const file of this.filesToArchive) {
            try {
                const destinationPath =
                    await this.getAvailableArchivePath(file);
                if (destinationPath == file.path) continue;

                const parentPath = destinationPath.substring(
                    0,
                    destinationPath.lastIndexOf("/")
                );
                await this.createFolderPath(parentPath);
                await this.app.fileManager.renameFile(file, destinationPath);
                archivedFiles++;
            } catch (error) {
                console.error("Failed to archive file", file.path, error);
                failedFiles++;
            }
        }

        const failureMessage = failedFiles > 0 ? `, ${failedFiles} failed` : "";
        new Notice(
            `Moved ${archivedFiles} files to ${this.archiveDirectory}${failureMessage}`
        );
        this.close();
    }

    private async getAvailableArchivePath(file: TFile): Promise<string> {
        const archivePath = normalizePath(
            this.archiveDirectory + "/" + file.path
        );
        if (!(await this.app.vault.adapter.exists(archivePath))) {
            return archivePath;
        }

        const parentPath = archivePath.substring(
            0,
            archivePath.lastIndexOf("/")
        );
        const extension = file.extension ? "." + file.extension : "";
        const basePath = parentPath
            ? parentPath + "/" + file.basename
            : file.basename;
        let counter = 1;
        let destinationPath = `${basePath} ${counter}${extension}`;

        while (await this.app.vault.adapter.exists(destinationPath)) {
            counter++;
            destinationPath = `${basePath} ${counter}${extension}`;
        }

        return destinationPath;
    }

    private async createFolderPath(folderPath: string) {
        if (!folderPath) return;

        const folders = folderPath.split("/");
        let currentPath = "";
        for (const folder of folders) {
            currentPath = currentPath ? currentPath + "/" + folder : folder;
            const existingFile =
                this.app.vault.getAbstractFileByPath(currentPath);
            if (existingFile instanceof TFolder) continue;
            if (existingFile) {
                throw new Error(
                    `Cannot create archive folder because ${currentPath} is a file`
                );
            }

            await this.app.vault.createFolder(currentPath);
        }
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
