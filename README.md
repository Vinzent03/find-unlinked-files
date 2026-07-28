# Find orphaned files (files with no backlinks) and broken links

A Plugin for [Obsidian](https://obsidian.md)

## How does it work?

### Find orphaned files

This plugin goes through your whole vault and searches for files, which are linked nowhere. In other words: Files with no backlinks.

In the end, it will create a file with a list of links to these orphaned files. Now you can either delete these unused files or link them somewhere in your vault.

### Find broken links

Creates a file with a list of links, which linked file has not been created yet.

In addition, there is a command to create those linked files.

### Find empty files

Creates a file with a list of empty files. Files with just frontmatter are considered empty as well.

### Find empty folders

Creates a file with a list of empty folders. Use the `Delete empty folders` command to move the listed folders to the system trash after confirmation. Folders that are no longer empty are left untouched.

Note that hidden files and folders (starting with a dot) are ignored. So folders containing only hidden files are considered empty as well.

## How to use

Call the command `Find orphaned files` and the file `Find orphaned files plugin output.md` will be created in your vault root and opened in a new pane.

## Additional features:

-   add files to ignore
-   add directories to ignore
-   add tags to ignore files with one of these tags
-   add files to ignore files with links to one of these files
-   add specific file types to ignore
-   change output file name
-   sort output by size or alphabetically

## Move files with certain extension in output file to system trash or archive (extra commands)

Goes through every link in the output file. If the extension of the link is in the corresponding delete or archive filetype list (can be set in settings), it moves the file to system trash or to the configured archive directory. This is useful to clean up many unused media files while still allowing you to preserve them in an archive folder.

The archive command requires the configured archive directory to already exist and preserves the original path inside it.

**Please note that the setting "Disable working links" needs to be disabled.**

## Installing

### From Obsidian

1. Open settings -> Third party plugin
2. Disable Restricted mode
3. Click Browse community plugins
4. Search for "Find orphaned files and broken links"
5. Install it
6. Activate it under Installed plugins

### From GitHub

1. Download the [latest release](https://github.com/Vinzent03/find-unlinked-files/releases/latest)
2. Move `manifest.json` and `main.js` to `<vault>/.obsidian/plugins/find-unlinked-files`
3. Reload Obsidian (Str + r)
4. Go to settings and disable safe mode
5. Enable `Find orphaned files and broken links`

If you find this plugin useful and would like to support its development, you can support me on [Ko-fi](https://Ko-fi.com/Vinzent).

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F195IQ5)
