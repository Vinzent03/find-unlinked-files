# Find unlinked files

## Info
This plugin goes through your whole vault and searches for files, which are linked nowhere. In the end, it will create a file with a list of links to these unlinked files. Now you can either delete this unused files or link them somewhere in your vault.

**Important:** I have not tested the performance in big vaults.

## How to use
Call the command `Find unlinked files` and an the file `Find unlinked files plugin output.md` will be created in your vault root.

## Compatibility
Custom plugins are only available for Obsidian v0.9.7+.

## TODO:
- [ ] add directories to ignore
- [ ] add file extensions to ignore

## Installing

### From GitHub
1. Download the [latest release](https://github.com/Vinzent03/find-unlinked-files/releases/latest)
2. Move `manifest.json` and `main.js` to `<vault>/.obsidian/plugins/find-unlinked-files`
3. Reload Obsidian (Str + r)
4. Go to settings and disable safe mode
5. Enable `Find unlinked files`