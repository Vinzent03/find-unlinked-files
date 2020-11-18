import { App, getLinkpath, iterateCacheRefs, normalizePath, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface Settings {
	disableWorkingLinks: boolean;
	directoriesToIgnore: string[];
	filesToIgnore: string[];
}
export default class MyPlugin extends Plugin {
	settings: Settings;
	async onload() {
		console.log('loading ' + this.manifest.name + " plugin");
		let tempData: Settings = await this.loadData();
		this.settings = {
			disableWorkingLinks: tempData?.disableWorkingLinks ?? false,
			directoriesToIgnore: tempData?.directoriesToIgnore ?? [],
			filesToIgnore: tempData?.filesToIgnore ?? [],
		}

		this.addCommand({
			id: 'find-unlinked-files',
			name: 'Find unlinked files',
			callback: async () => {
				let outFile = this.manifest.name + " plugin output.md";
				let files = this.app.vault.getFiles();
				let markdownFiles = this.app.vault.getMarkdownFiles();
				let links: String[] = [];

				markdownFiles.forEach((markFile: TFile) => {
					if (markFile.path == outFile)
						return
					iterateCacheRefs(this.app.metadataCache.getFileCache(markFile), cb => {
						let txt = this.app.metadataCache.getFirstLinkpathDest(getLinkpath(cb.link), markFile.path);
						if (txt != null)
							links.push(txt.path);
					});
				});

				let notLinkedFiles: TFile[] = [];

				files.forEach((file: TFile) => {
					if (file.path == outFile)
						return
					if (["css"].contains(file.extension))
						return
					let ignoreBecauseOfDirectory = false;
					this.settings.directoriesToIgnore.forEach(value => {
						if (file.path.startsWith(value) && value.length != 0)
							ignoreBecauseOfDirectory = true;
					})
					if (ignoreBecauseOfDirectory)
						return
					if (this.settings.filesToIgnore.contains(file.path))
						return
					if (links.contains(file.path))
						return
					notLinkedFiles.push(file)
				});
				let text = ""
				let prefix: string;
				if (this.settings.disableWorkingLinks)
					prefix = "	"
				else
					prefix = ""
				notLinkedFiles.forEach((file) => {
					text += prefix + "- [[" + this.app.metadataCache.fileToLinktext(file, "/") + "]]\n";
				});
				await this.app.vault.adapter.write(outFile, text);
				this.app.workspace.openLinkText(outFile, "/");
			},
		});
		this.addSettingTab(new SettingsTab(this.app, this))
	}

	onunload() {
		console.log('unloading ' + this.manifest.name + " plugin");
	}

}

class SettingsTab extends PluginSettingTab {
	plugin: MyPlugin;
	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: this.plugin.manifest.name })

		new Setting(containerEl)
			.setName('Disable working links')
			.setDesc('Indent lines to disable the link and to clean up the graph view')
			.addToggle(cb => cb.onChange(value => {
				this.plugin.settings.disableWorkingLinks = value;
				this.plugin.saveData(this.plugin.settings);
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
					this.plugin.saveData(this.plugin.settings);
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
					this.plugin.saveData(this.plugin.settings);
				}));

		function formatPath(path: string, addDirectorySlash: boolean): string {
			if (path.length == 0)
				return path;
			path = normalizePath(path);
			if (addDirectorySlash)
				return path + "/"
			else
				return path
		}
	}
}