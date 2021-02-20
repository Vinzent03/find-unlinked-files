import { App, CachedMetadata, getAllTags, getLinkpath, iterateCacheRefs, Modal, normalizePath, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface Settings {
	outputFileName: string;
	disableWorkingLinks: boolean;
	directoriesToIgnore: string[];
	filesToIgnore: string[];
	fileTypesToIgnore: string[];
	linksToIgnore: string[];
	tagsToIgnore: string[];
	fileTypesToDelete: string[];
	unresolvedLinksDirectoriesToIgnore: string[];
	unresolvedLinksFilesToIgnore: string[];
	unresolvedLinksFileTypesToIgnore: string[];
	unresolvedLinksLinksToIgnore: string[];
	unresolvedLinksTagsToIgnore: string[];
	unresolvedLinksOutputFileName: string;
}
const DEFAULT_SETTINGS: Settings = {
	outputFileName: "unlinked files output",
	disableWorkingLinks: false,
	directoriesToIgnore: [],
	filesToIgnore: [],
	fileTypesToIgnore: [],
	linksToIgnore: [],
	tagsToIgnore: [],
	fileTypesToDelete: [],
	unresolvedLinksOutputFileName: "unresolved links output",
	unresolvedLinksDirectoriesToIgnore: [],
	unresolvedLinksFilesToIgnore: [],
	unresolvedLinksFileTypesToIgnore: [],
	unresolvedLinksLinksToIgnore: [],
	unresolvedLinksTagsToIgnore: [],
};
interface UnresolvedLink {
	link: string;
	files: string[];
}
export default class FindUnlinkedFilesPlugin extends Plugin {
	settings: Settings;
	async onload() {
		console.log('loading ' + this.manifest.name + " plugin");
		await this.loadSettings();
		this.addCommand({
			id: 'find-unlinked-files',
			name: 'Find unlinked files',
			callback: () => this.findUnlinkedFiles(),
		});
		this.addCommand({
			id: 'find-unresolved-link',
			name: 'Find unresolved links',
			callback: () => this.findUnresolvedLinks(),
		});
		this.addCommand({
			id: "delete-unlinked-files",
			name: "Delete unlinked files with certain extension. See README",
			callback: () => this.deleteUnlinkedFiles()
		});
		this.addSettingTab(new SettingsTab(this.app, this));
	}
	async findUnlinkedFiles() {
		const outFileName = this.settings.outputFileName + ".md";
		let outFile: TFile;
		const files = this.app.vault.getFiles();
		const markdownFiles = this.app.vault.getMarkdownFiles();
		let links: string[] = [];

		markdownFiles.forEach((markFile: TFile) => {
			if (markFile.path == outFileName) {
				outFile = markFile;
				return;
			} iterateCacheRefs(this.app.metadataCache.getFileCache(markFile), cb => {
				let txt = this.app.metadataCache.getFirstLinkpathDest(getLinkpath(cb.link), markFile.path);
				if (txt != null)
					links.push(txt.path);
			});
		});
		const notLinkedFiles = files.filter((file) => this.isValid(file, links));
		notLinkedFiles.remove(outFile);


		let text = "";
		let prefix: string;
		if (this.settings.disableWorkingLinks)
			prefix = "	";
		else
			prefix = "";
		notLinkedFiles.forEach((file) => {
			text += prefix + "- [[" + this.app.metadataCache.fileToLinktext(file, "/") + "]]\n";
		});
		this.writeAndOpenFile(outFileName, text);

	}
	deleteUnlinkedFiles() {
		const links = this.app.metadataCache.getCache(this.settings.outputFileName + ".md")?.links ?? [];
		const filesToDelete: TFile[] = [];
		links.forEach((link) => {
			const file = this.app.metadataCache.getFirstLinkpathDest(link.link, "/");
			if (!file)
				return;
			if (this.settings.fileTypesToDelete.contains(file.extension)) {
				filesToDelete.push(file);
			}
		});
		if (filesToDelete.length > 0)
			new DeleteFilesModal(this.app, filesToDelete).open();
	}
	async findUnresolvedLinks() {
		const outFileName = this.settings.unresolvedLinksOutputFileName + ".md";
		const links: UnresolvedLink[] = [];
		const unresolvedLinks = this.app.metadataCache.unresolvedLinks;

		for (let filePath in unresolvedLinks) {
			if (filePath == this.settings.unresolvedLinksOutputFileName + ".md") continue;

			const cache = this.app.metadataCache.getCache(filePath);
			const fileType = filePath.substring(filePath.lastIndexOf(".") + 1);

			if (this.isDirectoryToIgnore(filePath, this.settings.unresolvedLinksDirectoriesToIgnore)) continue;
			if (this.settings.unresolvedLinksFilesToIgnore.contains(filePath)) continue;
			if (this.hasLinksToIgnore(cache, filePath, this.settings.unresolvedLinksLinksToIgnore)) continue;
			if (this.settings.unresolvedLinksFileTypesToIgnore.contains(fileType)) continue;
			if (this.hasTagsToIgnore(cache, this.settings.unresolvedLinksTagsToIgnore)) continue;

			for (const link in unresolvedLinks[filePath]) {
				let formattedFilePath = filePath;
				if (fileType == "md") {
					formattedFilePath = filePath.substring(0, filePath.lastIndexOf(".md"));
				}
				const unresolvedLink: UnresolvedLink = { files: [formattedFilePath], link: link };
				if (links.contains(unresolvedLink))
					continue;
				const duplication = links.find((e) => e.link == link);
				if (duplication) {
					duplication.files.push(formattedFilePath);
				} else {
					links.push(unresolvedLink);
				}
			}
		}
		this.writeAndOpenFile(outFileName,
			[
				"Don't forget that creating the file from here may create the file in the wrong directory!",
				...links.map((e) => `- [[${e.link}]] in [[${e.files.join("]], [[")}]]`)
			].join("\n"));

	}
	async writeAndOpenFile(outputFileName: string, text: string) {
		await this.app.vault.adapter.write(outputFileName, text);

		let fileIsAlreadyOpened = false;

		this.app.workspace.iterateAllLeaves(leaf => {
			if (outputFileName.startsWith(leaf.getDisplayText())) {
				fileIsAlreadyOpened = true;
			}
		});
		if (!fileIsAlreadyOpened)
			this.app.workspace.openLinkText(outputFileName, "/", true);
	}

	isValid(file: TFile, links: string[]): boolean {
		if (links.contains(file.path))
			return false;

		//filetypes to ignore by default
		if (file.extension == "css")
			return false;

		if (this.settings.fileTypesToIgnore.contains(file.extension))
			return false;

		const cache = this.app.metadataCache.getFileCache(file);

		if (this.hasLinksToIgnore(cache, file.path, this.settings.linksToIgnore))
			return false;

		if (this.hasTagsToIgnore(cache, this.settings.tagsToIgnore))
			return false;

		if (this.isDirectoryToIgnore(file.path, this.settings.directoriesToIgnore))
			return false;

		if (this.settings.filesToIgnore.contains(file.path))
			return false;

		return true;
	}

	isDirectoryToIgnore(filePath: string, directoriesToIgnore: string[]): boolean {
		return directoriesToIgnore.find((value) => filePath.startsWith(value) && value.length != 0) !== undefined;
	}
	hasLinksToIgnore(fileCache: CachedMetadata, filePath: string, linksToIgnore: string[]): boolean {
		if ((fileCache?.embeds != null || fileCache?.links != null) && linksToIgnore[0] == "*") {
			return true;
		}

		return iterateCacheRefs(fileCache, cb => {
			const link = this.app.metadataCache.getFirstLinkpathDest(cb.link, filePath)?.path;
			return linksToIgnore.contains(link);
		});
	}
	hasTagsToIgnore(fileCache: CachedMetadata, tagsToIgnore: string[]): boolean {
		const tags = getAllTags(fileCache);
		return tags?.find((tag) => tagsToIgnore.contains(tag.substring(1))) !== undefined;
	}


	onunload() {
		console.log('unloading ' + this.manifest.name + " plugin");
	}
	async loadSettings() {
		this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
class DeleteFilesModal extends Modal {
	filesToDelete: TFile[];
	constructor(app: App, filesToDelete: TFile[]) {
		super(app);
		this.filesToDelete = filesToDelete;
	}

	onOpen() {
		let { contentEl, titleEl } = this;
		titleEl.setText('Move ' + this.filesToDelete.length + ' files to system trash?');
		contentEl
			.createEl("button", { text: "Cancel" })
			.addEventListener("click", () => this.close());
		contentEl
			.setAttr("margin", "auto");

		contentEl
			.createEl("button",
				{
					cls: "mod-cta",
					text: "Confirm"
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

class SettingsTab extends PluginSettingTab {
	plugin: FindUnlinkedFilesPlugin;
	constructor(app: App, plugin: FindUnlinkedFilesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	formatPath(path: string, addDirectorySlash: boolean): string {
		if (path.length == 0)
			return path;
		path = normalizePath(path);
		if (addDirectorySlash)
			return path + "/";
		else
			return path;
	}

	display(): void {
		let { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: this.plugin.manifest.name });

		containerEl.createEl("h4", { text: "Settings for find unlinked files" });
		new Setting(containerEl)
			.setName('Output file name')
			.setDesc('Set name of output file (without file extension). Make sure no file exists with this name because it will be overwritten! If the name is empty, the default name is set.')
			.addText(cb => cb.onChange(value => {
				if (value.length == 0) {
					this.plugin.settings.outputFileName = DEFAULT_SETTINGS.outputFileName;
				} else {
					this.plugin.settings.outputFileName = value;
				}
				this.plugin.saveSettings();
			}).setValue(this.plugin.settings.outputFileName));

		new Setting(containerEl)
			.setName('Disable working links')
			.setDesc('Indent lines to disable the link and to clean up the graph view')
			.addToggle(cb => cb.onChange(value => {
				this.plugin.settings.disableWorkingLinks = value;
				this.plugin.saveSettings();
			}
			).setValue(this.plugin.settings.disableWorkingLinks));

		new Setting(containerEl)
			.setName("Directories to ignore.")
			.setDesc("Add each directory path in a new line")
			.addTextArea(cb => cb
				.setPlaceholder("Directory/Subdirectory")
				.setValue(this.plugin.settings.directoriesToIgnore.join("\n"))
				.onChange((value) => {
					let paths = value.trim().split("\n").map(value => this.formatPath(value, true));
					this.plugin.settings.directoriesToIgnore = paths;
					this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Files to ignore.")
			.setDesc("Add each file path in a new line (with file extension!)")
			.addTextArea(cb => cb
				.setPlaceholder("Directory/file.md")
				.setValue(this.plugin.settings.filesToIgnore.join("\n"))
				.onChange((value) => {
					let paths = value.trim().split("\n").map(value => this.formatPath(value, false));
					this.plugin.settings.filesToIgnore = paths;
					this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Links to ignore.")
			.setDesc("Ignore files, which contain the given file as link. Add each file path in a new line (with file extension!). Set it to `*` to ignore files with links.")
			.addTextArea(cb => cb
				.setPlaceholder("Directory/file.md")
				.setValue(this.plugin.settings.linksToIgnore.join("\n"))
				.onChange((value) => {
					let paths = value.trim().split("\n").map(value => this.formatPath(value, false));
					this.plugin.settings.linksToIgnore = paths;
					this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("File types to ignore.")
			.setDesc("Add each file type separated by comma")
			.addTextArea(cb => cb
				.setPlaceholder("docx,txt")
				.setValue(this.plugin.settings.fileTypesToIgnore.join(","))
				.onChange((value) => {
					let extensions = value.trim().split(",");
					this.plugin.settings.fileTypesToIgnore = extensions;
					this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Tags to ignore.")
			.setDesc("Ignore files, which contain the given tag. Add each tag separated by comma (without `#`)")
			.addTextArea(cb => cb
				.setPlaceholder("todo,unfinished")
				.setValue(this.plugin.settings.tagsToIgnore.join(","))
				.onChange((value) => {
					let tags = value.trim().split(",");
					this.plugin.settings.tagsToIgnore = tags;
					this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Filetypes to delete per command. See README.")
			.setDesc("Add each filetype separated by comma. ")
			.addTextArea(cb => cb
				.setPlaceholder("jpg,png")
				.setValue(this.plugin.settings.fileTypesToDelete.join(","))
				.onChange((value) => {
					let extensions = value.trim().split(",");
					this.plugin.settings.fileTypesToDelete = extensions;
					this.plugin.saveSettings();
				}));


		/// Settings for find unresolvedLinks

		containerEl.createEl("h4", { text: "Settings for find unresolved links" });

		new Setting(containerEl)
			.setName('Output file name')
			.setDesc('Set name of output file (without file extension). Make sure no file exists with this name because it will be overwritten! If the name is empty, the default name is set.')
			.addText(cb => cb.onChange(value => {
				if (value.length == 0) {
					this.plugin.settings.unresolvedLinksOutputFileName = DEFAULT_SETTINGS.unresolvedLinksOutputFileName;
				} else {
					this.plugin.settings.unresolvedLinksOutputFileName = value;
				}
				this.plugin.saveSettings();
			}).setValue(this.plugin.settings.unresolvedLinksOutputFileName));

		new Setting(containerEl)
			.setName("Directories to ignore.")
			.setDesc("Ignore links in files in the specified directory. Add each directory path in a new line")
			.addTextArea(cb => cb
				.setPlaceholder("Directory/Subdirectory")
				.setValue(this.plugin.settings.unresolvedLinksDirectoriesToIgnore.join("\n"))
				.onChange((value) => {
					let paths = value.trim().split("\n").map(value => this.formatPath(value, true));
					this.plugin.settings.unresolvedLinksDirectoriesToIgnore = paths;
					this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Files to ignore.")
			.setDesc("Ignore links in the specified file. Add each file path in a new line (with file extension!)")
			.addTextArea(cb => cb
				.setPlaceholder("Directory/file.md")
				.setValue(this.plugin.settings.unresolvedLinksFilesToIgnore.join("\n"))
				.onChange((value) => {
					let paths = value.trim().split("\n").map(value => this.formatPath(value, false));
					this.plugin.settings.unresolvedLinksFilesToIgnore = paths;
					this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Links to ignore.")
			.setDesc("Ignore files, which contain the given file as link. Add each file path in a new line (with file extension!). Set it to `*` to ignore files with links.")
			.addTextArea(cb => cb
				.setPlaceholder("Directory/file.md")
				.setValue(this.plugin.settings.unresolvedLinksLinksToIgnore.join("\n"))
				.onChange((value) => {
					let paths = value.trim().split("\n").map(value => this.formatPath(value, false));
					this.plugin.settings.unresolvedLinksLinksToIgnore = paths;
					this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Filetypes to ignore.")
			.setDesc("Ignore links with the specified filetype. Add each filetype separated by comma")
			.addTextArea(cb => cb
				.setPlaceholder("docx,txt")
				.setValue(this.plugin.settings.unresolvedLinksFileTypesToIgnore.join(","))
				.onChange((value) => {
					let extensions = value.trim().split(",");
					this.plugin.settings.unresolvedLinksFileTypesToIgnore = extensions;
					this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Tags to ignore.")
			.setDesc("Ignore links in files, which contain the given tag. Add each tag separated by comma (without `#`)")
			.addTextArea(cb => cb
				.setPlaceholder("todo,unfinished")
				.setValue(this.plugin.settings.unresolvedLinksTagsToIgnore.join(","))
				.onChange((value) => {
					let tags = value.trim().split(",");
					this.plugin.settings.unresolvedLinksTagsToIgnore = tags;
					this.plugin.saveSettings();
				}));
	}
}