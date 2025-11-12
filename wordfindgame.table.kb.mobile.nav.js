/**
* Wordfind.js 0.0.1
* (c) 2012 Bill, BunKat LLC.
* Wordfind is freely distributable under the MIT license.
* For all details and documentation:
*     http://github.com/bunkat/wordfind
*/

(function (document, $, wordfind) {
  'use strict';

  /**
  * An example game using the puzzles created from wordfind.js. Click and drag
  * to highlight words.
  *
  * WordFindGame requires wordfind.js and jQuery.
  */

  /**
  * Draws the puzzle by inserting rows of buttons into el.
  *
  * @param {String} el: The jQuery element to write the puzzle to
  * @param {[[String]]} puzzle: The puzzle to draw
  */
  var drawPuzzle = function (el, puzzle) {
    var output = '';
    output += '<table role="grid" aria-label="Word search grid"><tbody>';
    // for each row in the puzzle
    for (var i = 0, height = puzzle.length; i < height; i++) {
      var row = puzzle[i];
      output += '<tr role="row">';
      // for each element in that row
      for (var j = 0, width = row.length; j < width; j++) {
        // each cell contains a button for keyboard/focus while keeping table semantics
        var letter = row[j] || '&nbsp;';
        output += '<td role="gridcell">';
        output += '<button class="puzzleSquare" x="' + j + '" y="' + i + '" aria-label="' + letter + ', Row ' + (i + 1) + ', Column ' + (j + 1) + '">';
        output += letter;
        output += '</button>';
        output += '</td>';
      }
      output += '</tr>';
    }
    output += '</tbody></table>';
    $(el).html(output);
  };

  var getWords = function () {
    return $('input.word').toArray().map(wordEl => wordEl.value.toLowerCase()).filter(word => word);
  };

  /**
  * Given two points, ensure that they are adjacent and determine what
  * orientation the second point is relative to the first
  *
  * @param {int} x1: The x coordinate of the first point
  * @param {int} y1: The y coordinate of the first point
  * @param {int} x2: The x coordinate of the second point
  * @param {int} y2: The y coordinate of the second point
  */
  var calcOrientation = function (x1, y1, x2, y2) {

    for (var orientation in wordfind.orientations) {
      var nextFn = wordfind.orientations[orientation];
      var nextPos = nextFn(x1, y1, 1);

      if (nextPos.x === x2 && nextPos.y === y2) {
        return orientation;
      }
    }

    return null;
  };

  /**
       * Determines the orientation from (x1,y1) to (x2,y2) even if they are not adjacent.
       * Returns one of the keys in wordfind.orientations or null if not aligned.
       */
  var calcLineOrientation = function (x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    if (dx === 0 && dy === 0) return null;
    // must be straight or at 45deg diagonal
    if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return null;
    var sx = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
    var sy = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
    if (sx === 1 && sy === 0) return 'horizontal';
    if (sx === -1 && sy === 0) return 'horizontalBack';
    if (sx === 0 && sy === 1) return 'vertical';
    if (sx === 0 && sy === -1) return 'verticalUp';
    if (sx === 1 && sy === 1) return 'diagonal';
    if (sx === -1 && sy === 1) return 'diagonalBack';
    if (sx === 1 && sy === -1) return 'diagonalUp';
    if (sx === -1 && sy === -1) return 'diagonalUpBack';
    return null;
  };




  /**
  * Initializes the WordFindGame object.
  *
  * Creates a new word find game and draws the board and words.
  *
  * Returns the puzzle that was created.
  *
  * @param {String} puzzleEl: Selector to use when inserting the puzzle
  * @param {Options} options: WordFind options to use when creating the puzzle
  */
  var WordFindGame = function (puzzleEl, options) {

    // Class properties, game initial config:
    var wordList, puzzle;

    /**
    * Game play events.
    *
    * The following events handle the turns, word selection, word finding, and
    * game end.
    *
    */

    // Game state
    var startSquare, selectedSquares = [], curOrientation, curWord = '';

    // Touch/tap state
    var touchMoved = false;
    var touchStartTarget = null;
    var suppressClickUntil = 0; // timestamp to ignore synthetic clicks after touch

    /**
    * Event that handles mouse down on a new square. Initializes the game state
    * to the letter that was selected.
    *
    */
    var startTurn = function () {
      $(this).addClass('selected');
      startSquare = this;
      selectedSquares.push(this);
      curWord = $(this).text();
    };

    
    var touchStart = function(e) {
      touchMoved = false;
      touchStartTarget = $(e.currentTarget).closest('.puzzleSquare').get(0);
    };

    var touchEnd = function(e) {
      // If we handled a tap (no movement), run click-like activation and suppress the synthetic click.
      if (!touchMoved) {
        e.preventDefault();
        e.stopPropagation();
        if (touchStartTarget) {
          // Reuse the click activation path// Reuse the click activation path; mark synthetic so it bypasses suppression
        clickActivate({ currentTarget: touchStartTarget, synthetic: true, preventDefault: function(){}, stopPropagation: function(){} });
        // Now suppress the follow-up synthetic click for a short window
        suppressClickUntil = Date.now() + 500;
        }
      } else {
        // Drag path: finish normally
        endTurn.call(e.currentTarget);
      }
      touchStartTarget = null;
      touchMoved = false;
    };
var touchMove = function(e) {
      var xPos = e.originalEvent.touches[0].pageX;
      var yPos = e.originalEvent.touches[0].pageY;
      var targetElement = document.elementFromPoint(xPos, yPos);
      touchMoved = true;
      // Ensure selection started when user drags
      if (!startSquare && targetElement) {
        var sq0 = $(targetElement).closest('.puzzleSquare').get(0);
        if (sq0) {
          startTurn.call(sq0);
        }
      }
      if (targetElement) {
        var sq = $(targetElement).closest('.puzzleSquare').get(0);
        if (sq) {
          select(sq);
          return;
        }
      }
      // Fallback: attempt with the raw element
      select(targetElement);
    };

    var mouseMove = function () {
      var sq = $(this).closest('.puzzleSquare').get(0) || this;
      select(sq);
    };

    /**
    * Event that handles mouse over on a new square. Ensures that the new square
    * is adjacent to the previous square and the new square is along the path
    * of an actual word.
    *
    */
    var select = function (target) {
      // if the user hasn't started a word yet, just return
      if (!startSquare) {
        return;
      }

      // if the new square is actually the previous square, just return
      var lastSquare = selectedSquares[selectedSquares.length - 1];
      if (lastSquare == target) {
        return;
      }

      // see if the user backed up and correct the selectedSquares state if
      // they did
      var backTo;
      for (var i = 0, len = selectedSquares.length; i < len; i++) {
        if (selectedSquares[i] == target) {
          backTo = i + 1;
          break;
        }
      }

      while (backTo < selectedSquares.length) {
        $(selectedSquares[selectedSquares.length - 1]).removeClass('selected');
        selectedSquares.splice(backTo, 1);
        curWord = curWord.substr(0, curWord.length - 1);
      }


      // see if this is just a new orientation from the first square
      // this is needed to make selecting diagonal words easier
      var newOrientation = calcOrientation(
        $(startSquare).attr('x') - 0,
        $(startSquare).attr('y') - 0,
        $(target).attr('x') - 0,
        $(target).attr('y') - 0
      );

      if (newOrientation) {
        selectedSquares = [startSquare];
        curWord = $(startSquare).text();
        if (lastSquare !== startSquare) {
          $(lastSquare).removeClass('selected');
          lastSquare = startSquare;
        }
        curOrientation = newOrientation;
      }

      // see if the move is along the same orientation as the last move
      var orientation = calcOrientation(
        $(lastSquare).attr('x') - 0,
        $(lastSquare).attr('y') - 0,
        $(target).attr('x') - 0,
        $(target).attr('y') - 0
      );

      // if the new square isn't along a valid orientation, just ignore it.
      // this makes selecting diagonal words less frustrating
      if (!orientation) {
        return;
      }

      // finally, if there was no previous orientation or this move is along
      // the same orientation as the last move then play the move
      if (!curOrientation || curOrientation === orientation) {
        curOrientation = orientation;
        playTurn(target);
      }
    };

    /**
    * Updates the game state when the previous selection was valid.
    *
    * @param {el} square: The jQuery element that was played
    */
    var playTurn = function (square) {

      // make sure we are still forming a valid word
      for (var i = 0, len = wordList.length; i < len; i++) {
        if (wordList[i].indexOf(curWord + $(square).text()) === 0) {
          $(square).addClass('selected');
          selectedSquares.push(square);
          curWord += $(square).text();
          break;
        }
      }
    };

    /**
    * Event that handles mouse up on a square. Checks to see if a valid word
    * was created and updates the class of the letters and word if it was. Then
    * resets the game state to start a new word.
    *
    */
    var endTurn = function () {
      // see if we formed a valid word
      for (var i = 0, len = wordList.length; i < len; i++) {

        if (wordList[i] === curWord) {
          $('.selected').addClass('found');
          wordList.splice(i,1);
          $('input.word[value="' + curWord + '"]').addClass('wordFound');
        
          
          if (wordList.length) {
            announce('Found ' + curWord + '. ' + wordList.length + ' words remaining.');
          } else {
            announce('Found ' + curWord + '. Puzzle complete.');
          }
    }

        if (wordList.length === 0) {
          $('.puzzleSquare').addClass('complete');
        }
      }

      // reset the turn
      $('.selected').removeClass('selected');
      startSquare = null;
      selectedSquares = [];
      curWord = '';
      curOrientation = null;
    };



    // Accessible live region for announcements
    var $srStatus = $('#alert');

    var announce = function (msg) {
      if (!$srStatus.parent().length) {
        $(puzzleEl).prepend($srStatus);
      }
      $srStatus.text(msg);
    };

    // Keyboard support: press Enter/Space on a square to start selection,
    // then navigate focus and press Enter/Space on the ending square.
    var keyboardSelecting = false;

    var clickActivate = function (e) {
      // Allow synthetic calls from touch to bypass suppression
      if ((!e || !e.synthetic) && Date.now() < suppressClickUntil) { return; }
      if (Date.now() < suppressClickUntil) { return; }

      //e.preventDefault(); // avoid native click duplication

      var target = $(e.currentTarget).closest('.puzzleSquare').get(0);
      if (!startSquare) {
        // start a new selection
        startTurn.call(target);
        keyboardSelecting = true;
        var letter = $(target).text().trim() || 'blank';
        var x = ($(target).attr('x') - 0) + 1, y = ($(target).attr('y') - 0) + 1;
        announce('Start at row ' + y + ', column ' + x + ', letter ' + letter + '.');
      } else {
        // end selection: compute straight/diagonal path and walk it
        var sx = $(startSquare).attr('x') - 0;
        var sy = $(startSquare).attr('y') - 0;
        var ex = $(target).attr('x') - 0;
        var ey = $(target).attr('y') - 0;

        var dir = calcLineOrientation(sx, sy, ex, ey);
        if (!dir) {
          announce('Choose an end square in the same row, column, or diagonal.');
          return;
        }

        var nextFn = wordfind.orientations[dir];
        curOrientation = dir;

        var i = 1, safety = 0;
        while (safety++ < 1000) {
          var pos = nextFn(sx, sy, i);
          var $sq = $('.puzzleSquare[x="' + pos.x + '"][y="' + pos.y + '"]');
          if (!$sq.length) break;

          playTurn($sq.get(0));

          if (pos.x === ex && pos.y === ey) break;
          i++;
        }

        endTurn.call(target);
        keyboardSelecting = false;
      }
    }

    var keyActivate = function (e) {
      var key = e.key || e.keyCode;
      var isEnter = key === 'Enter' || key === 13;
      var isSpace = key === ' ' || key === 'Spacebar' || key === 32;

      if (key === 'Escape' || key === 27) {
        if (startSquare) {
          // cancel current selection
          $('.selected').removeClass('selected');
          startSquare = null;
          selectedSquares = [];
          curWord = '';
          curOrientation = null;
          announce('Selection cancelled.');
          e.preventDefault();
        }
      }
    };

    

    // Move focus by dx/dy among .puzzleSquare based on x/y attributes
    var moveFocus = function(dx, dy) {
      console.log('moveFocus', dx, dy);
      var $current = $(document.activeElement).closest('.puzzleSquare');
      if (!$current.length) return;
      var x = ($current.attr('x') - 0) + dx;
      var y = ($current.attr('y') - 0) + dy;
      var $next = $('.puzzleSquare[x="' + x + '"][y="' + y + '"]');
      if ($next.length) {
        $next.focus();
        // announce position for SR
        var letter = $next.text().trim() || 'blank';
        announce('Row ' + (y+1) + ', column ' + (x+1) + ', letter ' + letter + '.');
      } else {
        announce('No cell ' + (dy < 0 ? 'above' : dy > 0 ? 'below' : dx < 0 ? 'to the left' : 'to the right') + '.');
      }
    };

    // Handle arrow keys for grid navigation
    var gridArrows = function(e) {
      var key = e.key || e.keyCode;
      if (key === 'ArrowUp' || key === 38) { e.preventDefault(); moveFocus(0, -1); }
      else if (key === 'ArrowDown' || key === 40) { e.preventDefault(); moveFocus(0, 1); }
      else if (key === 'ArrowLeft' || key === 37) { e.preventDefault(); moveFocus(-1, 0); }
      else if (key === 'ArrowRight' || key === 39) { e.preventDefault(); moveFocus(1, 0); }
    };

/* Constructor START */
    $('input.word').removeClass('wordFound');

    // Class properties, game initial config:
    wordList = getWords().sort();
    puzzle = wordfind.newPuzzleLax(wordList, options);

    // Draw all of the words
    drawPuzzle(puzzleEl, puzzle);
    // Inject an SR-only directional pad for vertical navigation on touch SRs
    var $srNav = $('<div class="sr-only sr-dpad" role="group" aria-label="Grid navigation">' +
      '<button type="button" class="sr-move" data-d="up">Move up</button>' +
      '<button type="button" class="sr-move" data-d="left">Move left</button>' +
      '<button type="button" class="sr-move" data-d="right">Move right</button>' +
      '<button type="button" class="sr-move" data-d="down">Move down</button>' +
    '</div>');
    $(puzzleEl).prepend($srNav);

    $(puzzleEl).on('click', '.sr-move', function() {
      var d = $(this).data('d');

      console.log('clickity', d);
      if (d === 'up') moveFocus(0, -1);
      else if (d === 'down') moveFocus(0, 1);
      else if (d === 'left') moveFocus(-1, 0);
      else if (d === 'right') moveFocus(1, 0);
    });
    

    // attach events to the buttons
    // optimistically add events for windows 8 touch
    if (window.navigator.msPointerEnabled) {
      $('.puzzleSquare').on('MSPointerDown', startTurn);
      $('.puzzleSquare').on('MSPointerOver', select);
      $('.puzzleSquare').on('MSPointerUp', endTurn);
    } else {
      $('.puzzleSquare').mousedown(startTurn);
      $('.puzzleSquare').mouseenter(mouseMove);
      $('.puzzleSquare').mouseup(endTurn);
      $('.puzzleSquare').on("touchstart", touchStart);
      $('.puzzleSquare').on("touchmove", touchMove);
      $('.puzzleSquare').on("touchend", touchEnd);
      $('.puzzleSquare').on('keydown', keyActivate);
      $('.puzzleSquare').on('keydown', gridArrows);
      $('.puzzleSquare').on('click', clickActivate);
    }

    /**
    * Solves an existing puzzle.
    *
    * @param {[[String]]} puzzle: The puzzle to solve
    */
    this.solve = function () {
      var solution = wordfind.solve(puzzle, wordList).found;

      for (var i = 0, len = solution.length; i < len; i++) {
        var word = solution[i].word,
          orientation = solution[i].orientation,
          x = solution[i].x,
          y = solution[i].y,
          next = wordfind.orientations[orientation];

        var wordEl = $('input.word[value="' + word + '"]');
        if (!wordEl.hasClass('wordFound')) {
          for (var j = 0, size = word.length; j < size; j++) {
            var nextPos = next(x, y, j);
            $('[x="' + nextPos.x + '"][y="' + nextPos.y + '"]').addClass('solved');
          }

          wordEl.addClass('wordFound');
        }
      }
    };
  };

  WordFindGame.emptySquaresCount = function () {
    var allSquares = $('.puzzleSquare').toArray();
    return allSquares.length - allSquares.filter(b => b.textContent.trim()).length;
  };

  // Static method
  WordFindGame.insertWordBefore = function (el, word) {
    $('<li><input class="word" value="' + (word || '') + '"></li>').insertBefore(el);
  };


  /**
  * Allow game to be used within the browser
  */
  window.WordFindGame = WordFindGame;

}(document, jQuery, wordfind));
