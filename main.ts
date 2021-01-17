import { App, getAllTags, getLinkpath, iterateCacheRefs, normalizePath, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface Settings {
	outputFileName: string;
	disableWorkingLinks: boolean;
	directoriesToIgnore: string[];
	filesToIgnore: string[];
	fileTypesToIgnore: string[];
	linksToIgnore: string[];
	tagsToIgnore: string[];
}
const DEFAULT_SETTINGS: Settings = {
	outputFileName: "Find unlinked files plugin output",
	disableWorkingLinks: false,
	directoriesToIgnore: [],
	filesToIgnore: [],
	fileTypesToIgnore: [],
	linksToIgnore: [],
	tagsToIgnore: []
};
export default class FindUnlinkedFilesPlugin extends Plugin {
	settings: Settings;
	async onload() {
		console.log('loading ' + this.manifest.name + " plugin");
		await this.loadSettings();
		this.addCommand({
			id: 'find-unlinked-files',
			name: 'Find unlinked files',
			callback: async () => {
				let outFile = this.settings.outputFileName + ".md";
				let files = this.app.vault.getFiles();
				let markdownFiles = this.app.vault.getMarkdownFiles();
				let links: String[] = [];

				markdownFiles.forEach((markFile: TFile) => {
					if (markFile.path == outFile)
						return;
					iterateCacheRefs(this.app.metadataCache.getFileCache(markFile), cb => {
						let txt = this.app.metadataCache.getFirstLinkpathDest(getLinkpath(cb.link), markFile.path);
						if (txt != null)
							links.push(txt.path);
					});
				});

				let notLinkedFiles: TFile[] = [];

				files.forEach((file: TFile) => {
					if (file.path == outFile)
						return;

					//filetypes to ignore by default
					if (["css"].contains(file.extension))
						return;
					if (this.settings.fileTypesToIgnore.contains(file.extension))
						return;

					if (this.findLinksToIgnore(file))
						return;
					if (this.findTagsToIgnore(file))
						return;
					if (this.findDirectoryToIgnore(file))
						return;


					if (this.settings.filesToIgnore.contains(file.path))
						return;
					if (links.contains(file.path))
						return;
					notLinkedFiles.push(file);
				});
				let text = "";
				let prefix: string;
				if (this.settings.disableWorkingLinks)
					prefix = "	";
				else
					prefix = "";
				notLinkedFiles.forEach((file) => {
					text += prefix + "- [[" + this.app.metadataCache.fileToLinktext(file, "/") + "]]\n";
				});
				await this.app.vault.adapter.write(outFile, text);

				let fileIsAlreadyOpened = false;

				this.app.workspace.iterateAllLeaves(leaf => {
					if (outFile.startsWith(leaf.getDisplayText())) {
						fileIsAlreadyOpened = true;
					}
				});
				if (!fileIsAlreadyOpened)
					this.app.workspace.openLinkText(outFile, "/", true);
			},
		});
		this.addSettingTab(new SettingsTab(this.app, this));
	}
	findDirectoryToIgnore(file: TFile): boolean {
		let found = false;
		this.settings.directoriesToIgnore.forEach(value => {
			if (file.path.startsWith(value) && value.length != 0)
				found = true;
		});
		return found;
	}
	findLinksToIgnore(file: TFile): boolean {
		let found = false;
		iterateCacheRefs(this.app.metadataCache.getFileCache(file), cb => {
			let link = this.app.metadataCache.getFirstLinkpathDest(cb.link, file.path)?.path;
			if (!link)
				return;
			if (this.settings.linksToIgnore.contains(link))
				found = true;
		});
		return found;
	}
	findTagsToIgnore(file: TFile): boolean {
		let found = false;
		let tags = getAllTags(this.app.metadataCache.getFileCache(file));

		if (tags) {
			tags.forEach(tag => {
				if (this.settings.tagsToIgnore.contains(tag.substring(1)))
					found = true;
			});
			return found;
		}
		else {
			return false;
		}
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

class SettingsTab extends PluginSettingTab {
	plugin: FindUnlinkedFilesPlugin;
	constructor(app: App, plugin: FindUnlinkedFilesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: this.plugin.manifest.name });

		new Setting(containerEl)
			.setName('Output file name')
			.setDesc('Set name of output file (without file extension). Make sure no file exists with this name because it will be overwritten! If the name is empty, the default name is set.')
			.addText(cb => cb.onChange(value => {
				if (value.length == 0) {
					this.plugin.settings.outputFileName = "Find unlinked files plugin output";
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
					let paths = value.trim().split("\n").map(value => formatPath(value, true));
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
					let paths = value.trim().split("\n").map(value => formatPath(value, false));
					this.plugin.settings.filesToIgnore = paths;
					this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Links to ignore.")
			.setDesc("Ignores files, which contain the given file as link. Add each file path in a new line (with file extension!)")
			.addTextArea(cb => cb
				.setPlaceholder("Directory/file.md")
				.setValue(this.plugin.settings.linksToIgnore.join("\n"))
				.onChange((value) => {
					let paths = value.trim().split("\n").map(value => formatPath(value, false));
					this.plugin.settings.linksToIgnore = paths;
					this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("Filetypes to ignore.")
			.setDesc("Add each filetype separated by comma")
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

		function formatPath(path: string, addDirectorySlash: boolean): string {
			if (path.length == 0)
				return path;
			path = normalizePath(path);
			if (addDirectorySlash)
				return path + "/";
			else
				return path;
		}
	}
}