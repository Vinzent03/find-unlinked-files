# Find unlinked files (files with no backlinks) and unresolved links
A Plugin for [Obsidian](https://obsidian.md)

## How does it work?

### Find unlinked files

This plugin goes through your whole vault and searches for files, which are linked nowhere. In other words: Files with no backlinks.

In the end, it will create a file with a list of links to these unlinked files. Now you can either delete these unused files or link them somewhere in your vault.

### Find unresolved links

It creates a file with a list of links, which linked file has not been created yet.


## How to use
Call the command `Find unlinked files` and the file `Find unlinked files plugin output.md` will be created in your vault root and opened in a new pane. 

## Additional features:
- add files to ignore
- add directories to ignore
- add tags to ignore files with one of these tags
- add files to ignore files with links to one of these files
- add specific file types to ignore
- change output file name

## Move files with certain extension in output file to system trash (extra command)
Goes through every link in the output file. If the extension of the link is in the list (can be set in settings), it moves the file to system trash. Is useful to delete many unused media files.

**Please note that the setting "Disable working links" needs to be disabled.**

## Compatibility
Custom plugins are only available for Obsidian v0.9.7+.

## Installing

### From Obsidian
1. Open settings -> Third party plugin
2. Disable Safe mode
3. Click Browse community plugins
4. Search for "Find unlinked files"
5. Install it
6. Activate it under Installed plugins


### From GitHub
1. Download the [latest release](https://github.com/Vinzent03/find-unlinked-files/releases/latest)
2. Move `manifest.json` and `main.js` to `<vault>/.obsidian/plugins/find-unlinked-files`
3. Reload Obsidian (Str + r)
4. Go to settings and disable safe mode
5. Enable `Find unlinked files`


> If you want to support me you can consider [buying me a coffee](https://www.buymeacoffee.com/Vinzent03).

<br>

<a href="https://www.buymeacoffee.com/Vinzent03"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=Vinzent03&button_colour=5F7FFF&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00"></a>
