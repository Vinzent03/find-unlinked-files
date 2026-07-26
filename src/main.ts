import {
    getAllTags,
    getLinkpath,
    Notice,
    Plugin,
    TFile,
    TFolder,
} from "obsidian";
import { CanvasData } from "obsidian/canvas";
import { DeleteFilesModal } from "./deleteFilesModal";
import { SettingsTab } from "./settingsTab";
import { Utils } from "./utils";

export type OrphanedFilesSortOrder = "alphabetical" | "size";

export interface Settings {
    outputFileName: string;
    orphanedFilesSortOrder: OrphanedFilesSortOrder;
    disableWorkingLinks: boolean;
    directoriesToIgnore: string[];
    filesToIgnore: string[];
    fileTypesToIgnore: string[];
    linksToIgnore: string[];
    tagsToIgnore: string[];
    fileTypesToDelete: string[];
    ignoreFileTypes: boolean;
    ignoreDirectories: boolean;
    unresolvedLinksIgnoreDirectories: boolean;
    unresolvedLinksDirectoriesToIgnore: string[];
    unresolvedLinksFilesToIgnore: string[];
    unresolvedLinksFileTypesToIgnore: string[];
    unresolvedLinksLinksToIgnore: string[];
    unresolvedLinksTagsToIgnore: string[];
    unresolvedLinksOutputFileName: string;
    withoutTagsDirectoriesToIgnore: string[];
    withoutTagsFilesToIgnore: string[];
    withoutTagsOutputFileName: string;
    emptyFilesOutputFileName: string;
    emptyFilesDirectories: string[];
    emptyFilesFilesToIgnore: string[];
    emptyFilesIgnoreDirectories: boolean;
    openOutputFile: boolean;
}
const DEFAULT_SETTINGS: Settings = {
    outputFileName: "orphaned files output",
    orphanedFilesSortOrder: "size",
    disableWorkingLinks: false,
    directoriesToIgnore: [],
    filesToIgnore: [],
    fileTypesToIgnore: [],
    linksToIgnore: [],
    tagsToIgnore: [],
    fileTypesToDelete: [],
    ignoreFileTypes: true,
    ignoreDirectories: true,
    unresolvedLinksIgnoreDirectories: true,
    unresolvedLinksOutputFileName: "broken links output",
    unresolvedLinksDirectoriesToIgnore: [],
    unresolvedLinksFilesToIgnore: [],
    unresolvedLinksFileTypesToIgnore: [],
    unresolvedLinksLinksToIgnore: [],
    unresolvedLinksTagsToIgnore: [],
    withoutTagsDirectoriesToIgnore: [],
    withoutTagsFilesToIgnore: [],
    withoutTagsOutputFileName: "files without tags",
    emptyFilesOutputFileName: "empty files",
    emptyFilesDirectories: [],
    emptyFilesFilesToIgnore: [],
    emptyFilesIgnoreDirectories: true,
    openOutputFile: true,
};

interface BrokenLink {
    link: string;
    files: string[];
}

export default class FindOrphanedFilesPlugin extends Plugin {
    settings!: Settings;
    findExtensionRegex = /(\.[^.]+)$/;
    async onload() {
        await this.loadSettings();
        this.addCommand({
            id: "find-unlinked-files",
            name: "Find orphaned files",
            callback: () => this.findOrphanedFiles(),
        });
        this.addCommand({
            id: "find-unresolved-link",
            name: "Find broken links",
            callback: () => this.findBrokenLinks(),
        });
        this.addCommand({
            id: "delete-unlinked-files",
            name: "Delete orphaned files with certain extension. See README",
            callback: () => this.deleteOrphanedFiles(),
        });
        this.addCommand({
            id: "create-files-of-broken-links",
            name: "Create files of broken links",
            callback: () => this.createFilesOfBrokenLinks(),
        });
        this.addCommand({
            id: "find-files-without-tags",
            name: "Find files without tags",
            callback: () => this.findFilesWithoutTags(),
        });
        this.addCommand({
            id: "find-empty-files",
            name: "Find empty files",
            callback: () => this.findEmptyFiles(),
        });
        this.addCommand({
            id: "delete-empty-files",
            name: "Delete empty files",
            callback: () => this.deleteEmptyFiles(),
        });
        this.addSettingTab(new SettingsTab(this.app, this, DEFAULT_SETTINGS));

        this.app.workspace.on("file-menu", (menu, file, _, __) => {
            if (file instanceof TFolder) {
                menu.addItem((cb) => {
                    cb.setIcon("search");
                    cb.setTitle("Find orphaned files");
                    // Add trailing slash to catch files named like the directory. See https://github.com/Vinzent03/find-unlinked-files/issues/24
                    cb.onClick(() => {
                        void this.findOrphanedFiles(file.path + "/");
                    });
                });
            }
        });
    }

    async createFilesOfBrokenLinks() {
        if (
            !(await this.app.vault.adapter.exists(
                this.settings.unresolvedLinksOutputFileName + ".md"
            ))
        ) {
            new Notice(
                "Can't find file - Please run the `Find broken files' command before"
            );
            return;
        }
        const links = this.app.metadataCache.getCache(
            this.settings.unresolvedLinksOutputFileName + ".md"
        )?.links;
        if (!links) {
            new Notice("No broken links found");
            return;
        }
        const filesToCreate: string[] = [];

        for (const link of links) {
            const file = this.app.metadataCache.getFirstLinkpathDest(
                link.link,
                "/"
            );
            if (file) continue;
            const foundType = this.findExtensionRegex.exec(link.link)?.[0];
            if ((foundType ?? ".md") == ".md") {
                if (foundType) {
                    filesToCreate.push(link.link);
                } else {
                    filesToCreate.push(link.link + ".md");
                }
            }
        }

        if (filesToCreate) {
            for (const file of filesToCreate) {
                await this.app.vault.create(file, "");
            }
        }
    }

    async findEmptyFiles() {
        const files = this.app.vault.getFiles();
        const emptyFiles: TFile[] = [];
        for (const file of files) {
            if (
                new Utils(
                    this.app,
                    file.path,
                    [],
                    [],
                    this.settings.emptyFilesDirectories,
                    this.settings.emptyFilesFilesToIgnore,
                    this.settings.emptyFilesIgnoreDirectories
                ).shouldIgnoreFile()
            ) {
                continue;
            }
            const content = await this.app.vault.read(file);
            const trimmedContent = content.trim();
            if (!trimmedContent) {
                emptyFiles.push(file);
            }
            const cache = this.app.metadataCache.getFileCache(file);
            const position = cache?.frontmatterPosition;
            if (position) {
                const lines = content.trimEnd().split("\n").length;
                if (position.end.line == lines - 1) {
                    emptyFiles.push(file);
                }
            }
        }
        let prefix: string;
        if (this.settings.disableWorkingLinks) prefix = "	";
        else prefix = "";
        const text = emptyFiles
            .map((file) => `${prefix}- [[${file.path}]]`)
            .join("\n");
        await Utils.writeAndOpenFile(
            this.app,
            this.settings.emptyFilesOutputFileName + ".md",
            text,
            this.settings.openOutputFile
        );
    }

    async findOrphanedFiles(dir?: string) {
        const startTime = Date.now();
        const outFileName = this.settings.outputFileName + ".md";
        let outFile: TFile | null = null;
        const allFiles = this.app.vault.getFiles();
        const markdownFiles = this.app.vault.getMarkdownFiles();
        const canvasFiles = allFiles.filter(
            (file) => file.extension === "canvas"
        );
        const links: Set<string> = new Set();
        const findLinkInTextRegex = /\[\[(.*?)\]\]|\[.*?\]\((.*?)\)/g;

        // get a list of all links within canvas files
        const canvasParsingPromises = canvasFiles.map(
            async (canvasFile: TFile) => {
                // Read the canvas file as JSON
                const canvasFileContent = JSON.parse(
                    (await this.app.vault.cachedRead(canvasFile)) || "{}"
                ) as CanvasData;
                // Get a list of all links within the canvas file
                canvasFileContent.nodes?.forEach((node) => {
                    let linkTexts: string[] = [];

                    if (node.type === "file") {
                        linkTexts.push(node.file);
                    } else if (node.type === "text") {
                        // There could be zero or more links in the text. Use a regex to extract all the text between "[[" and "]]"
                        let match;
                        while (
                            (match = findLinkInTextRegex.exec(node.text)) !==
                            null
                        ) {
                            const linkText = match[1] ?? match[2];
                            if (linkText) {
                                linkTexts.push(linkText);
                            }
                        }
                    } else {
                        return; // Skip other types (e.g. "group")
                    }

                    linkTexts.forEach((linkText: string) => {
                        const targetFile =
                            this.app.metadataCache.getFirstLinkpathDest(
                                linkText.split("|")[0]?.split("#")[0] ?? "",
                                canvasFile.path
                            );
                        if (targetFile != null) links.add(targetFile.path);
                    });
                });
            }
        );

        // Get a list of all links within markdown files
        markdownFiles.forEach((mdFile: TFile) => {
            if (outFile === null && mdFile.path == outFileName) {
                outFile = mdFile;
                return;
            }
            const cache = this.app.metadataCache.getFileCache(mdFile);
            if (!cache) {
                return;
            }
            for (const ref of [
                ...(cache.embeds ?? []),
                ...(cache.links ?? []),
                ...(cache.frontmatterLinks ?? []),
            ]) {
                const txt = this.app.metadataCache.getFirstLinkpathDest(
                    getLinkpath(ref.link),
                    mdFile.path
                );
                if (txt != null) links.add(txt.path);
            }
        });

        // Ensure the canvas files have all been parsed before continuing.
        await Promise.all(canvasParsingPromises);

        const notLinkedFiles = allFiles.filter((file) =>
            this.isFileAnOrphan(file, links, dir)
        );
        if (outFile) {
            notLinkedFiles.remove(outFile);
        }

        let text = "";
        let prefix: string;
        if (this.settings.disableWorkingLinks) prefix = "	";
        else prefix = "";

        this.sortOrphanedFiles(notLinkedFiles);

        notLinkedFiles.forEach((file) => {
            text +=
                prefix +
                "- [[" +
                this.app.metadataCache.fileToLinktext(file, "/", false) +
                "]]\n";
        });
        await Utils.writeAndOpenFile(
            this.app,
            outFileName,
            text,
            this.settings.openOutputFile
        );
        const endTime = Date.now();
        const diff = endTime - startTime;
        if (diff > 1000) {
            new Notice(
                `Found ${notLinkedFiles.length} orphaned files in ${diff}ms`
            );
        }
    }

    sortOrphanedFiles(files: TFile[]) {
        if (this.settings.orphanedFilesSortOrder == "alphabetical") {
            files.sort((a, b) => {
                const aLinkText = this.app.metadataCache.fileToLinktext(
                    a,
                    "/",
                    false
                );
                const bLinkText = this.app.metadataCache.fileToLinktext(
                    b,
                    "/",
                    false
                );
                return (
                    aLinkText.localeCompare(bLinkText, undefined, {
                        sensitivity: "base",
                        numeric: true,
                    }) || a.path.localeCompare(b.path)
                );
            });
            return;
        }

        files.sort((a, b) => b.stat.size - a.stat.size);
    }

    async deleteOrphanedFiles() {
        if (
            !(await this.app.vault.adapter.exists(
                this.settings.outputFileName + ".md"
            ))
        ) {
            new Notice(
                "Can't find file - Please run the `Find orphaned files' command before"
            );
            return;
        }
        const links =
            this.app.metadataCache.getCache(
                this.settings.outputFileName + ".md"
            )?.links ?? [];
        const filesToDelete: TFile[] = [];
        links.forEach((link) => {
            const file = this.app.metadataCache.getFirstLinkpathDest(
                link.link,
                "/"
            );
            if (!file) return;

            if (
                this.settings.fileTypesToDelete[0] == "*" ||
                this.settings.fileTypesToDelete.contains(file.extension)
            ) {
                filesToDelete.push(file);
            }
        });
        if (filesToDelete.length > 0)
            new DeleteFilesModal(this.app, filesToDelete).open();
    }

    async deleteEmptyFiles() {
        if (
            !(await this.app.vault.adapter.exists(
                this.settings.emptyFilesOutputFileName + ".md"
            ))
        ) {
            new Notice(
                "Can't find file - Please run the `Find orphaned files' command before"
            );
            return;
        }
        const links =
            this.app.metadataCache.getCache(
                this.settings.emptyFilesOutputFileName + ".md"
            )?.links ?? [];
        const filesToDelete: TFile[] = [];
        for (const link of links) {
            const file = this.app.metadataCache.getFirstLinkpathDest(
                link.link,
                "/"
            );
            if (!file) return;

            filesToDelete.push(file);
        }
        if (filesToDelete.length > 0)
            new DeleteFilesModal(this.app, filesToDelete).open();
    }

    async findBrokenLinks() {
        const outFileName = this.settings.unresolvedLinksOutputFileName + ".md";
        const links: BrokenLink[] = [];
        const brokenLinks = this.app.metadataCache.unresolvedLinks;

        for (const sourceFilepath in brokenLinks) {
            if (
                sourceFilepath ==
                this.settings.unresolvedLinksOutputFileName + ".md"
            )
                continue;

            const fileType = sourceFilepath.substring(
                sourceFilepath.lastIndexOf(".") + 1
            );

            const utils = new Utils(
                this.app,
                sourceFilepath,
                this.settings.unresolvedLinksTagsToIgnore,
                this.settings.unresolvedLinksLinksToIgnore,
                this.settings.unresolvedLinksDirectoriesToIgnore,
                this.settings.unresolvedLinksFilesToIgnore,
                this.settings.unresolvedLinksIgnoreDirectories
            );
            if (utils.shouldIgnoreFile()) continue;

            for (const link in brokenLinks[sourceFilepath]) {
                const linkFileType = link.substring(link.lastIndexOf(".") + 1);

                if (
                    this.settings.unresolvedLinksFileTypesToIgnore.contains(
                        linkFileType
                    )
                )
                    continue;

                let formattedFilePath = sourceFilepath;
                if (fileType == "md") {
                    formattedFilePath = sourceFilepath.substring(
                        0,
                        sourceFilepath.lastIndexOf(".md")
                    );
                }
                const brokenLink: BrokenLink = {
                    files: [formattedFilePath],
                    link: link,
                };
                if (links.contains(brokenLink)) continue;
                const duplication = links.find((e) => e.link == link);
                if (duplication) {
                    duplication.files.push(formattedFilePath);
                } else {
                    links.push(brokenLink);
                }
            }
        }
        await Utils.writeAndOpenFile(
            this.app,
            outFileName,
            [
                "Don't forget that creating the file from here may create the file in the wrong directory!",
                ...links.map(
                    (e) => `- [[${e.link}]] in [[${e.files.join("]], [[")}]]`
                ),
            ].join("\n"),
            this.settings.openOutputFile
        );
    }

    async findFilesWithoutTags() {
        const outFileName = this.settings.withoutTagsOutputFileName + ".md";
        let outFile: TFile | null = null;
        const files = this.app.vault.getMarkdownFiles();
        let withoutFiles = files.filter((file) => {
            if (outFile === null && file.path == outFileName) {
                outFile = file;
                return false;
            }
            const utils = new Utils(
                this.app,
                file.path,
                [],
                [],
                this.settings.withoutTagsDirectoriesToIgnore,
                this.settings.withoutTagsFilesToIgnore,
                true
            );

            if (utils.shouldIgnoreFile()) {
                return false;
            }
            const cache = this.app.metadataCache.getFileCache(file);
            return (cache ? (getAllTags(cache)?.length ?? 0) : 0) <= 0;
        });
        if (outFile) {
            withoutFiles.remove(outFile);
        }

        let prefix: string;
        if (this.settings.disableWorkingLinks) prefix = "	";
        else prefix = "";
        const text = withoutFiles
            .map((file) => `${prefix}- [[${file.path}]]`)
            .join("\n");
        await Utils.writeAndOpenFile(
            this.app,
            outFileName,
            text,
            this.settings.openOutputFile
        );
    }

    /**
     * Checks if the given file in an orphaned file
     *
     * @param file file to check
     * @param links all links in the vault
     * @param dir optional directory to check if the file is in
     */
    isFileAnOrphan(file: TFile, links: Set<string>, dir?: string): boolean {
        if (links.has(file.path)) return false;

        //filetypes to ignore by default
        if (file.extension == "css") return false;

        if (this.settings.fileTypesToIgnore[0] !== "") {
            const containsFileType = this.settings.fileTypesToIgnore.contains(
                file.extension
            );
            if (this.settings.ignoreFileTypes) {
                if (containsFileType) return false;
            } else {
                if (!containsFileType) return false;
            }
        }

        const utils = new Utils(
            this.app,
            file.path,
            this.settings.tagsToIgnore,
            this.settings.linksToIgnore,
            this.settings.directoriesToIgnore,
            this.settings.filesToIgnore,
            this.settings.ignoreDirectories,
            dir
        );
        if (utils.shouldIgnoreFile()) return false;

        return true;
    }
    async loadSettings() {
        const loadedData = (await this.loadData()) as Partial<Settings> | null;
        this.settings = {
            ...DEFAULT_SETTINGS,
            ...loadedData,
        };
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
