import { getLinkpath, iterateCacheRefs, Plugin, TFile } from 'obsidian';
import { DeleteFilesModal } from './deleteFilesModal';
import { SettingsTab } from './settingsTab';
import { Utils } from './utils';

export interface Settings {
	outputFileName: string;
	disableWorkingLinks: boolean;
	directoriesToIgnore: string[];
	filesToIgnore: string[];
	fileTypesToIgnore: string[];
	linksToIgnore: string[];
	tagsToIgnore: string[];
	fileTypesToDelete: string[];
	ignoreFileTypes: boolean;
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
	ignoreFileTypes: true,
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
		this.addSettingTab(new SettingsTab(this.app, this, DEFAULT_SETTINGS));
	}
	findUnlinkedFiles() {
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
		Utils.writeAndOpenFile(this.app, outFileName, text);

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
	findUnresolvedLinks() {
		const outFileName = this.settings.unresolvedLinksOutputFileName + ".md";
		const links: UnresolvedLink[] = [];
		const unresolvedLinks = this.app.metadataCache.unresolvedLinks;

		for (let filePath in unresolvedLinks) {
			if (filePath == this.settings.unresolvedLinksOutputFileName + ".md") continue;

			const fileType = filePath.substring(filePath.lastIndexOf(".") + 1);

			const utils = new Utils(
				this.app,
				filePath,
				this.settings.unresolvedLinksTagsToIgnore,
				this.settings.unresolvedLinksLinksToIgnore,
				this.settings.unresolvedLinksDirectoriesToIgnore,
				this.settings.unresolvedLinksFilesToIgnore
			);
			if (!utils.isValid()) continue;

			for (const link in unresolvedLinks[filePath]) {
				const linkFileType = link.substring(link.lastIndexOf(".") + 1);
				console.log(linkFileType);

				if (this.settings.unresolvedLinksFileTypesToIgnore.contains(linkFileType)) continue;

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
		Utils.writeAndOpenFile(
			this.app,
			outFileName,
			[
				"Don't forget that creating the file from here may create the file in the wrong directory!",
				...links.map((e) => `- [[${e.link}]] in [[${e.files.join("]], [[")}]]`)
			].join("\n"));

	}

	/**
	 * Checks if the given file in an unlinked file
	 * 
	 * @param file file to check
	 * @param links all links in the vault
	 */
	isValid(file: TFile, links: string[]): boolean {
		if (links.contains(file.path))
			return false;

		//filetypes to ignore by default
		if (file.extension == "css")
			return false;

		if (this.settings.fileTypesToIgnore[0] !== "") {
			const containsFileType = this.settings.fileTypesToIgnore.contains(file.extension);
			if (this.settings.ignoreFileTypes) {
				if (containsFileType) return;
			} else {
				if (!containsFileType) return;
			}
		}

		const utils = new Utils(
			this.app,
			file.path,
			this.settings.tagsToIgnore,
			this.settings.linksToIgnore,
			this.settings.directoriesToIgnore,
			this.settings.filesToIgnore,
		);
		if (!utils.isValid())
			return false;

		return true;
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
