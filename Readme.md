_Wordfind_ is a simple `javascript` library for generating (hopefully fun) word find (also known as word search) puzzles. Just give it a set of words and a few milliseconds later it will spit out a puzzle containing those words.

The core `wordfind.js` library contains no dependencies and will work both in the browser and in node.js. The repository also includes a fully functional word find game (aptly called `wordfindgame.js`) as an example. The game has a dependency on `jQuery`.

This is a fork of https://github.com/bunkat/wordfind allowing to specify the filling letters you want.

Check out the sample game at http://Lucas-C.github.com/wordfind/.

Keyboard support:
- `tab`:  move the focus to the next letter
- `shift + tab`: move the focus to the previous letter
- `enter`/`space`: to select the focused letter
  - `left` / `right` arrows: move the focus to the next or previous letter starting from the selected letter
  - `tab` / `shift + tab`: move the focus to the next or previous letter starting from the selected letter
  - `enter` / `space` after intitally selecting a letter: ends the word selection. If the word is correct, the word will be highlighted. Otherwise all letters will be unselected.
- `ESC`: unselected the current selection.
