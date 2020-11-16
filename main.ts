import { Plugin, TFile } from 'obsidian';

export default class MyPlugin extends Plugin {
	onload() {
		console.log('loading ' + this.manifest.name);
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
				notLinkedFiles.forEach((file) => {
					text += "- [[" + this.app.metadataCache.fileToLinktext(file, "/") + "]]\n";
				})
				this.app.vault.adapter.write(outFile, text).then(() => {
					this.app.workspace.openLinkText(outFile, "/")
				})
			},
		});
	}

	onunload() {
		console.log('unloading ' + this.manifest.name);
	}
}