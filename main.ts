import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

export default class MyPlugin extends Plugin {
	settings: Settings;
	async onload() {
		console.log('loading ' + this.manifest.name);

		this.settings = await this.loadData() || new Settings();

		this.addCommand({
			id: 'find-unlinked-files',
			name: 'Find unlinked files',
			callback: () => {
				let outFile = this.manifest.name + " plugin output.md";
				let files = this.app.vault.getFiles();
				let markdownFiles = this.app.vault.getMarkdownFiles();
				let links: String[]
				links = [];

				markdownFiles.forEach((markFile: TFile) => {
					if (markFile.path == outFile)
						return
					let rawLinks = this.app.metadataCache.getFileCache(markFile).links ?? [];
					let rawEmbeds = this.app.metadataCache.getFileCache(markFile).embeds ?? [];

					rawLinks.concat(rawEmbeds).forEach(link => {
						let linkText: string;
						if (link.link.contains("#"))
							linkText = link.link.substring(0, link.link.lastIndexOf("#"));
						else
							linkText = link.link;
						let txt = this.app.metadataCache.getFirstLinkpathDest(linkText, markFile.path);
						if (txt != null)
							links.push(txt.path);


					});
				});

				let notLinkedFiles: TFile[];
				notLinkedFiles = [];

				files.forEach((file: TFile) => {
					if (file.path == outFile)
						return
					if (["css"].contains(file.extension))
						return
					if (!links.contains(file.path)) {
						notLinkedFiles.push(file)
					}
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
				this.app.vault.adapter.write(outFile, text).then(() => {
					this.app.workspace.openLinkText(outFile, "/")
				});
			},
		});
		this.addSettingTab(new SettingsTab(this.app, this))
	}

	onunload() {
		console.log('unloading ' + this.manifest.name);
	}

}
class Settings {
	disableWorkingLinks: boolean = false;
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
	}
}