import { App, Modal, TAbstractFile, TFolder } from "obsidian";

export class DeleteFilesModal extends Modal {
    filesToDelete: TAbstractFile[];
    itemName: string;
    constructor(
        app: App,
        filesToDelete: TAbstractFile[],
        itemName: string = "files"
    ) {
        super(app);
        this.filesToDelete = filesToDelete;
        this.itemName = itemName;
    }

    onOpen() {
        let { contentEl, titleEl } = this;
        titleEl.setText(
            "Move " +
                this.filesToDelete.length +
                " " +
                this.itemName +
                " to system trash?"
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
                void this.deleteFiles();
            });
    }

    private async deleteFiles() {
        for (const file of this.filesToDelete) {
            // A folder may have received files after the confirmation dialog
            // opened. Never trash a non-empty folder.
            if (file instanceof TFolder && file.children.length > 0) continue;
            await this.app.fileManager.trashFile(file);
        }
        this.close();
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
