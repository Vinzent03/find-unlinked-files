import { App, Modal, TFile } from "obsidian";

export class DeleteFilesModal extends Modal {
    filesToDelete: TFile[];
    constructor(app: App, filesToDelete: TFile[]) {
        super(app);
        this.filesToDelete = filesToDelete;
    }

    onOpen() {
        let { contentEl, titleEl } = this;
        titleEl.setText(
            "Move " + this.filesToDelete.length + " files to system trash?"
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
            .addEventListener("click", async () => {
                for (const file of this.filesToDelete) {
                    await this.app.vault.trash(file, true);
                }
                this.close();
            });
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
