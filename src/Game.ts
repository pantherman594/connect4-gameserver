enum Color {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  NONE = 'NONE',
}

export default class Game {
  id: number;
  lightUser: string;
  darkUser: string;

  currentTurn: Color;
  grid: Color[][];
  lastMove: number | null;
  winner: Color | null;
  illegalMoves: number;

  constructor(id: number, lightUser: string, darkUser: string) {
    this.id = id;
    this.lightUser = lightUser;
    this.darkUser = darkUser;
    this.currentTurn = Color.LIGHT;

    this.grid = [];
    for (let col = 0; col < 7; col++) {
      this.grid.push([]);
    }

    this.lastMove = null;
    this.winner = null;
    this.illegalMoves = 0;
  }

  poll(user: string) {
    if (this.winner !== null) {
      return {
        status: 'OK',
        data: {
          action: 'GAME_OVER',
          winner: (() => {

            switch(this.winner) {
              case Color.LIGHT:
                return 'LIGHT';
              case Color.DARK:
                return 'DARK';
              default:
                return 'DRAW';
            }

          })(),
        },
      };
    }

    const wait = {
        status: 'OK',
        data: {
          action: 'wait',
        },
    }

    const move = (color: Color) => ({
      status: 'OK',
      data: {
        action: 'YOUR_MOVE',
        lastmove: this.lastMove,
        moveAs: color,
      },
    });

    let isYourTurn;
    switch(this.currentTurn) {
      case Color.LIGHT:
        isYourTurn = user === this.lightUser;
        break;
      case Color.DARK:
        isYourTurn = user === this.darkUser;
        break;
      default:
        return {
          status: 'ERROR',
          data: {
            reason: 'Game is over',
          },
        };
    }

    if (isYourTurn) return move(this.currentTurn);
    return wait;
  }

  move(user: string, column: number) {
    let isYourTurn;
    let nextTurn;
    switch(this.currentTurn) {
      case Color.LIGHT:
        isYourTurn = user === this.lightUser;
        nextTurn = Color.DARK;
        break;
      case Color.DARK:
        isYourTurn = user === this.darkUser;
        nextTurn = Color.LIGHT;
        break;
      default:
        return {
          status: 'ERROR',
          data: {
            reason: 'Game is over',
          },
        };
    }

    if (!isYourTurn) {
      return {
        status: 'ERROR',
        data: {
          reason: 'It is not your turn!',
        },
      };
    }

    if (column > 6 || column < 0 || this.grid[column].length === 6) {
      if (++this.illegalMoves >= 3) {
        this.destroy(user, nextTurn);
      }

      return {
        status: 'ERROR',
        data: {
          reason: 'Not a legal move'
        },
      };
    }
    this.illegalMoves = 0;
    this.lastMove = column;
    this.grid[column].push(this.currentTurn);

    if (this._checkWin(column, this.grid[column].length - 1, this.currentTurn)) {
      this._win(this.currentTurn);
    } else {
      this.currentTurn = nextTurn;
    }

    return {
      status: 'OK',
      data: {},
    };
  }

  _checkWin(col: number, row: number, color: Color) {
    const isWinVert = (() => {
      let numConsec = 0;
      for (let r = 0; r <= row; r++) {
        if (this.grid[col][r] === color) {
          numConsec += 1;
        } else {
          numConsec = 0;
        }

        if (numConsec >= 4) return true;
      }

      return false;
    })();

    if (isWinVert) return true;

    const isWinLine = (mult: number) => {
      let numConsec = 0;
      for (let c = 0; c < 7; c++) {
        const r = row + mult * (col - c);
        if (r < 0 || r >= this.grid[c].length) continue;

        if (this.grid[c][r] === color) {
          numConsec += 1;
        } else {
          numConsec = 0;
        }

        if (numConsec >= 4) return true;
      }

      return false;
    };

    if (isWinLine(0)) return true;
    if (isWinLine(1)) return true;
    if (isWinLine(-1)) return true;

    return false;
  }

  _win(color: Color) {
    this.winner = color;
    this.currentTurn = Color.NONE;
  }

  destroy(quitter: string, winner: Color | undefined = undefined) {
    if (winner !== undefined) {
      this._win(winner);
      return;
    }

    const isLight = quitter === this.lightUser;
    const isDark = quitter === this.darkUser;

    if (isLight && isDark) {
      this._win(Color.NONE);
      return;
    }

    if (isLight) {
      this._win(Color.DARK);
      return;
    }

    this._win(Color.LIGHT);
  }
}
