import { App, CachedMetadata, getAllTags, iterateCacheRefs } from "obsidian";

export class Utils {
    private fileCache: CachedMetadata;

    /**
     * Checks for the given settings. Is used for `Find unlinked files` and `Find unresolved links`
     * @param app 
     * @param filePath 
     * @param tagsToIgnore 
     * @param linksToIgnore 
     * @param directoriesToIgnore 
     * @param filesToIgnore 
     * @param ignoreDirectories
     */
    constructor(
        private app: App,
        private filePath: string,
        private tagsToIgnore: string[],
        private linksToIgnore: string[],
        private directoriesToIgnore: string[],
        private filesToIgnore: string[],
        private ignoreDirectories: boolean = true,
    ) {
        this.fileCache = app.metadataCache.getCache(filePath);
    }

    private hasTagsToIgnore(): boolean {
        const tags = getAllTags(this.fileCache);
        return tags?.find((tag) => this.tagsToIgnore.contains(tag.substring(1))) !== undefined;
    }
    private hasLinksToIgnore(): boolean {
        if ((this.fileCache?.embeds != null || this.fileCache?.links != null) && this.linksToIgnore[0] == "*") {
            return true;
        }

        return iterateCacheRefs(this.fileCache, cb => {
            const link = this.app.metadataCache.getFirstLinkpathDest(cb.link, this.filePath)?.path;
            return this.linksToIgnore.contains(link);
        });
    }

    private checkDirectory(): boolean {
        const contains = this.directoriesToIgnore.find((value) => this.filePath.startsWith(value) && value.length != 0) !== undefined;
        if (this.ignoreDirectories) {
            return contains;
        } else {
            return !contains;
        }
    }

    private isFileToIgnore() {
        return this.filesToIgnore.contains(this.filePath);
    }

    public isValid() {
        return !this.hasTagsToIgnore() && !this.hasLinksToIgnore() && !this.checkDirectory() && !this.isFileToIgnore();
    }

    /**
     * Writes the text to the file and opens the file in a new pane if it is not opened yet
     * @param app 
     * @param outputFileName name of the output file
     * @param text data to be written to the file
     */
    static async writeAndOpenFile(app: App, outputFileName: string, text: string) {
        await app.vault.adapter.write(outputFileName, text);

        let fileIsAlreadyOpened = false;
        app.workspace.iterateAllLeaves(leaf => {
            if (leaf.getDisplayText() != "" && outputFileName.startsWith(leaf.getDisplayText())) {
                fileIsAlreadyOpened = true;
            }
        });
        if (!fileIsAlreadyOpened)
            app.workspace.openLinkText(outputFileName, "/", true);
    }
}