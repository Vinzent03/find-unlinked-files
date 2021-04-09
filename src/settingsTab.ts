import { App, normalizePath, PluginSettingTab, Setting } from 'obsidian';
import FindUnlinkedFilesPlugin, { Settings } from './main';

export class SettingsTab extends PluginSettingTab {
    plugin: FindUnlinkedFilesPlugin;
    constructor(app: App, plugin: FindUnlinkedFilesPlugin, private defaultSettings: Settings) {
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
                    this.plugin.settings.outputFileName = this.defaultSettings.outputFileName;
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
            .setName("Ignore or include files in the given directories")
            .setDesc("Enable to ignore files in the given directories. Disable to only include files in the given filetypes")
            .addToggle(cb =>
                cb.setValue(this.plugin.settings.ignoreDirectories)
                    .onChange(value => {
                        this.plugin.settings.ignoreDirectories = value;
                        this.plugin.saveSettings();
                    }));

        new Setting(containerEl)
            .setName("Directories")
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
            .setName("Ignore or include files with the given filetypes")
            .setDesc("Enable to ignore files with the given filetypes. Disable to only include files with the given filetypes")
            .addToggle(cb =>
                cb.setValue(this.plugin.settings.ignoreFileTypes)
                    .onChange(value => {
                        this.plugin.settings.ignoreFileTypes = value;
                        this.plugin.saveSettings();
                    }));
        new Setting(containerEl)
            .setName("File types")
            .setDesc("Effect depends on toggle above")
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
                    this.plugin.settings.unresolvedLinksOutputFileName = this.defaultSettings.unresolvedLinksOutputFileName;
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
