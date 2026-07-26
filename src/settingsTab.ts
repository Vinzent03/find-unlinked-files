import { App, normalizePath, PluginSettingTab, Setting } from "obsidian";
import FindOrphanedFilesPlugin, { Settings } from "./main";
import { Utils } from "./utils";

export class SettingsTab extends PluginSettingTab {
    plugin: FindOrphanedFilesPlugin;
    constructor(
        app: App,
        plugin: FindOrphanedFilesPlugin,
        private defaultSettings: Settings
    ) {
        super(app, plugin);
        this.plugin = plugin;
    }

    // Add trailing slash to catch files named like the directory. See https://github.com/Vinzent03/find-unlinked-files/issues/24
    formatPath(path: string, addDirectorySlash: boolean): string {
        if (path.length == 0) return path;
        path = normalizePath(path);
        if (addDirectorySlash) return path + "/";
        else return path;
    }

    display(): void {
        let { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl).setName("Find orphaned files").setHeading();

        new Setting(containerEl).setName("Open output file").addToggle((cb) =>
            cb
                .setValue(this.plugin.settings.openOutputFile)
                .onChange((value) => {
                    this.plugin.settings.openOutputFile = value;
                    void this.plugin.saveSettings();
                })
        );

        new Setting(containerEl)
            .setName("Output file name")
            .setDesc(
                "Set name of output file (without file extension). Make sure no file exists with this name because it will be overwritten! If the name is empty, the default name is set."
            )
            .addText((cb) =>
                cb
                    .onChange((value) => {
                        if (value.length == 0) {
                            this.plugin.settings.outputFileName =
                                this.defaultSettings.outputFileName;
                        } else {
                            this.plugin.settings.outputFileName = value;
                        }
                        void this.plugin.saveSettings();
                    })
                    .setValue(this.plugin.settings.outputFileName)
            );

        new Setting(containerEl)
            .setName("Sort output by")
            .setDesc("Choose the order of files in the generated output file")
            .addDropdown((cb) =>
                cb
                    .addOption("size", "Size")
                    .addOption("alphabetical", "Alphabetical")
                    .setValue(this.plugin.settings.orphanedFilesSortOrder)
                    .onChange((value) => {
                        this.plugin.settings.orphanedFilesSortOrder =
                            value as Settings["orphanedFilesSortOrder"];
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Disable working links")
            .setDesc(
                "Indent lines to disable the link and to clean up the graph view"
            )
            .addToggle((cb) =>
                cb
                    .onChange((value) => {
                        this.plugin.settings.disableWorkingLinks = value;
                        void this.plugin.saveSettings();
                    })
                    .setValue(this.plugin.settings.disableWorkingLinks)
            );

        new Setting(containerEl)
            .setName("Exclude files in the given directories")
            .setDesc(
                "Enable to exclude files in the given directories. Disable to only include files in the given directories"
            )
            .addToggle((cb) =>
                cb
                    .setValue(this.plugin.settings.ignoreDirectories)
                    .onChange((value) => {
                        this.plugin.settings.ignoreDirectories = value;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Directories")
            .setDesc("Add each directory path in a new line")
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("Directory/Subdirectory")
                    .setValue(
                        this.plugin.settings.directoriesToIgnore.join("\n")
                    )
                    .onChange((value) => {
                        let paths = value
                            .trim()
                            .split("\n")
                            .map((value) => this.formatPath(value, true));
                        this.plugin.settings.directoriesToIgnore = paths;
                        void this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Exclude files")
            .setDesc("Add each file path in a new line (with file extension!)")
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("Directory/file.md")
                    .setValue(this.plugin.settings.filesToIgnore.join("\n"))
                    .onChange((value) => {
                        let paths = value
                            .trim()
                            .split("\n")
                            .map((value) => this.formatPath(value, false));
                        this.plugin.settings.filesToIgnore = paths;
                        void this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Exclude links")
            .setDesc(
                "Exclude files, which contain the given file as link. Add each file path in a new line (with file extension!). Set it to `*` to exclude files with links."
            )
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("Directory/file.md")
                    .setValue(this.plugin.settings.linksToIgnore.join("\n"))
                    .onChange((value) => {
                        let paths = value
                            .trim()
                            .split("\n")
                            .map((value) => this.formatPath(value, false));
                        this.plugin.settings.linksToIgnore = paths;
                        void this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Exclude files with the given filetypes")
            .setDesc(
                "Enable to exclude files with the given filetypes. Disable to only include files with the given filetypes"
            )
            .addToggle((cb) =>
                cb
                    .setValue(this.plugin.settings.ignoreFileTypes)
                    .onChange((value) => {
                        this.plugin.settings.ignoreFileTypes = value;
                        void this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("File types")
            .setDesc("Effect depends on toggle above")
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("docx,txt")
                    .setValue(this.plugin.settings.fileTypesToIgnore.join(","))
                    .onChange((value) => {
                        let extensions = Utils.splitCommaSeparatedList(value);
                        this.plugin.settings.fileTypesToIgnore = extensions;
                        void this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Exclude tags")
            .setDesc(
                "Exclude files, which contain the given tag. Add each tag separated by comma (without `#`)"
            )
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("todo,unfinished")
                    .setValue(this.plugin.settings.tagsToIgnore.join(","))
                    .onChange((value) => {
                        const tags = Utils.splitCommaSeparatedList(value);
                        this.plugin.settings.tagsToIgnore = tags;
                        void this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Filetypes to delete per command. See README.")
            .setDesc(
                "Add each filetype separated by comma. Set to `*` to delete all files."
            )
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("jpg,png")
                    .setValue(this.plugin.settings.fileTypesToDelete.join(","))
                    .onChange((value) => {
                        const extensions = Utils.splitCommaSeparatedList(value);
                        this.plugin.settings.fileTypesToDelete = extensions;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Filetypes to archive per command. See README.")
            .setDesc(
                "Add each filetype separated by comma. Set to `*` to archive all files."
            )
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("jpg,png")
                    .setValue(this.plugin.settings.fileTypesToArchive.join(","))
                    .onChange((value) => {
                        const extensions = Utils.splitCommaSeparatedList(value);
                        this.plugin.settings.fileTypesToArchive = extensions;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Archive directory")
            .setDesc(
                "Existing directory where the archive command moves orphaned files. Original paths are preserved inside this directory."
            )
            .addText((cb) =>
                cb
                    .setPlaceholder("Archive")
                    .setValue(this.plugin.settings.archiveDirectory)
                    .onChange((value) => {
                        this.plugin.settings.archiveDirectory = this.formatPath(
                            value.trim(),
                            false
                        );
                        void this.plugin.saveSettings();
                    })
            );

        /// Settings for find brokenLinks
        new Setting(containerEl).setName("Find broken links").setHeading();

        new Setting(containerEl)
            .setName("Output file name")
            .setDesc(
                "Set name of output file (without file extension). Make sure no file exists with this name because it will be overwritten! If the name is empty, the default name is set."
            )
            .addText((cb) =>
                cb
                    .onChange((value) => {
                        if (value.length == 0) {
                            this.plugin.settings.unresolvedLinksOutputFileName =
                                this.defaultSettings.unresolvedLinksOutputFileName;
                        } else {
                            this.plugin.settings.unresolvedLinksOutputFileName =
                                value;
                        }
                        void this.plugin.saveSettings();
                    })
                    .setValue(
                        this.plugin.settings.unresolvedLinksOutputFileName
                    )
            );

        new Setting(containerEl)
            .setName("Exclude files in the given directories")
            .setDesc(
                "Enable to exclude files in the given directories. Disable to only include files in the given directories"
            )
            .addToggle((cb) =>
                cb
                    .setValue(
                        this.plugin.settings.unresolvedLinksIgnoreDirectories
                    )
                    .onChange((value) => {
                        this.plugin.settings.unresolvedLinksIgnoreDirectories =
                            value;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Directories")
            .setDesc("Add each directory path in a new line")
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("Directory/Subdirectory")
                    .setValue(
                        this.plugin.settings.unresolvedLinksDirectoriesToIgnore.join(
                            "\n"
                        )
                    )
                    .onChange((value) => {
                        let paths = value
                            .trim()
                            .split("\n")
                            .map((value) => this.formatPath(value, true));
                        this.plugin.settings.unresolvedLinksDirectoriesToIgnore =
                            paths;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Exclude files")
            .setDesc(
                "Exclude links in the specified file. Add each file path in a new line (with file extension!)"
            )
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("Directory/file.md")
                    .setValue(
                        this.plugin.settings.unresolvedLinksFilesToIgnore.join(
                            "\n"
                        )
                    )
                    .onChange((value) => {
                        let paths = value
                            .trim()
                            .split("\n")
                            .map((value) => this.formatPath(value, false));
                        this.plugin.settings.unresolvedLinksFilesToIgnore =
                            paths;
                        void this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Exclude links")
            .setDesc(
                "Exclude files, which contain the given file as link. Add each file path in a new line (with file extension!). Set it to `*` to exclude files with links."
            )
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("Directory/file.md")
                    .setValue(
                        this.plugin.settings.unresolvedLinksLinksToIgnore.join(
                            "\n"
                        )
                    )
                    .onChange((value) => {
                        let paths = value
                            .trim()
                            .split("\n")
                            .map((value) => this.formatPath(value, false));
                        this.plugin.settings.unresolvedLinksLinksToIgnore =
                            paths;
                        void this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Exclude filetypes")
            .setDesc(
                "Exclude links with the specified filetype. Add each filetype separated by comma"
            )
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("docx,txt")
                    .setValue(
                        this.plugin.settings.unresolvedLinksFileTypesToIgnore.join(
                            ","
                        )
                    )
                    .onChange((value) => {
                        const extensions = Utils.splitCommaSeparatedList(value);
                        this.plugin.settings.unresolvedLinksFileTypesToIgnore =
                            extensions;
                        void this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Exclude tags")
            .setDesc(
                "Exclude links in files, which contain the given tag. Add each tag separated by comma (without `#`)"
            )
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("todo,unfinished")
                    .setValue(
                        this.plugin.settings.unresolvedLinksTagsToIgnore.join(
                            ","
                        )
                    )
                    .onChange((value) => {
                        const tags = Utils.splitCommaSeparatedList(value);
                        this.plugin.settings.unresolvedLinksTagsToIgnore = tags;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Find files without tags")
            .setHeading();

        new Setting(containerEl)
            .setName("Output file name")
            .setDesc(
                "Set name of output file (without file extension). Make sure no file exists with this name because it will be overwritten! If the name is empty, the default name is set."
            )
            .addText((cb) =>
                cb
                    .onChange((value) => {
                        if (value.length == 0) {
                            this.plugin.settings.withoutTagsOutputFileName =
                                this.defaultSettings.withoutTagsOutputFileName;
                        } else {
                            this.plugin.settings.withoutTagsOutputFileName =
                                value;
                        }
                        void this.plugin.saveSettings();
                    })
                    .setValue(this.plugin.settings.withoutTagsOutputFileName)
            );

        new Setting(containerEl)
            .setName("Exclude files")
            .setDesc(
                "Exclude the specific files. Add each file path in a new line (with file extension!)"
            )
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("Directory/file.md")
                    .setValue(
                        this.plugin.settings.withoutTagsFilesToIgnore.join("\n")
                    )
                    .onChange((value) => {
                        let paths = value
                            .trim()
                            .split("\n")
                            .map((value) => this.formatPath(value, false));
                        this.plugin.settings.withoutTagsFilesToIgnore = paths;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Exclude directories")
            .setDesc(
                "Exclude files in the specified directories. Add each directory path in a new line"
            )
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("Directory/Subdirectory")
                    .setValue(
                        this.plugin.settings.withoutTagsDirectoriesToIgnore.join(
                            "\n"
                        )
                    )
                    .onChange((value) => {
                        let paths = value
                            .trim()
                            .split("\n")
                            .map((value) => this.formatPath(value, true));
                        this.plugin.settings.withoutTagsDirectoriesToIgnore =
                            paths;
                        void this.plugin.saveSettings();
                    })
            );

        /// Settings for empty files
        new Setting(containerEl).setName("Find empty files").setHeading();

        new Setting(containerEl)
            .setName("Output file name")
            .setDesc(
                "Set name of output file (without file extension). Make sure no file exists with this name because it will be overwritten! If the name is empty, the default name is set."
            )
            .addText((cb) =>
                cb
                    .onChange((value) => {
                        if (value.length == 0) {
                            this.plugin.settings.emptyFilesOutputFileName =
                                this.defaultSettings.emptyFilesOutputFileName;
                        } else {
                            this.plugin.settings.emptyFilesOutputFileName =
                                value;
                        }
                        void this.plugin.saveSettings();
                    })
                    .setValue(this.plugin.settings.emptyFilesOutputFileName)
            );

        new Setting(containerEl)
            .setName("Exclude files in the given directories")
            .setDesc(
                "Enable to exclude files in the given directories. Disable to only include files in the given directories"
            )
            .addToggle((cb) =>
                cb
                    .setValue(this.plugin.settings.emptyFilesIgnoreDirectories)
                    .onChange((value) => {
                        this.plugin.settings.emptyFilesIgnoreDirectories =
                            value;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Directories")
            .setDesc("Add each directory path in a new line")
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("Directory/Subdirectory")
                    .setValue(
                        this.plugin.settings.emptyFilesDirectories.join("\n")
                    )
                    .onChange((value) => {
                        let paths = value
                            .trim()
                            .split("\n")
                            .map((value) => this.formatPath(value, true));
                        this.plugin.settings.emptyFilesDirectories = paths;
                        void this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Exclude files")
            .setDesc("Add each file path in a new line (with file extension!)")
            .addTextArea((cb) =>
                cb
                    .setPlaceholder("Directory/file.md")
                    .setValue(
                        this.plugin.settings.emptyFilesFilesToIgnore.join("\n")
                    )
                    .onChange((value) => {
                        let paths = value
                            .trim()
                            .split("\n")
                            .map((value) => this.formatPath(value, false));
                        this.plugin.settings.emptyFilesFilesToIgnore = paths;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Donate")
            .setDesc(
                "If you like this Plugin, consider donating to support continued development."
            )
            .addButton((bt) => {
                bt.buttonEl.outerHTML =
                    "<a href='https://ko-fi.com/F1F195IQ5' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi3.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>";
            });
    }
}
