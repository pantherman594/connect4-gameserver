import * as bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';

import Game from './Game';

const PORT = process.env.PORT || 5000;
const app = express();

const games = new Map<number, Game>(); // game id -> game
const gameIds = new Map<string, number>(); // pair key -> game id
const pairs = new Map<string, string>(); // user num -> opponent num

interface WaitInterface {
  waitee: string;
  callback: () => number;
}

const waitingOn = new Map<string, WaitInterface>(); // opponent id -> wait data 

let lastGameId = 0;

const corsOptionsDelegate = (req: any, callback: any) => {
  let corsOptions = {
    origin: true,
    credentials: true,
  };
  callback(null, corsOptions); // callback expects two parameters: error and options
};

app.use(bodyParser.json());
app.use(cors(corsOptionsDelegate));

const genKey = (player1: string, player2: string) => {
  player1 = player1.toLowerCase();
  player2 = player1.toLowerCase();
  if (player1 < player2) return `${player1}-${player2}`;
  return `${player2}-${player1}`;
}

app.get('/registergame/:playerUsernum/:opponentUsernum', (req, res) => {
  const { playerUsernum, opponentUsernum } = req.params;

  const key = genKey(playerUsernum, opponentUsernum);

  if (pairs.has(playerUsernum)) {
    const oldOpponent = pairs.get(playerUsernum)!;
    const oldKey = genKey(playerUsernum, oldOpponent);
    const oldGameId = gameIds.get(oldKey);

    if (oldGameId) {
      const oldGame = games.get(oldGameId);
      if (oldGame) {
        oldGame.destroy(playerUsernum);
      }
    }
  }

  if (waitingOn.has(opponentUsernum)) {
    const { waitee, callback } = waitingOn.get(opponentUsernum)!;
    if (waitee === playerUsernum) {
      const newGameId  = callback();

      res.json({
        status: 'OK',
        data: {
          game_id: newGameId,
        },
      });
    }
  }

  const callback = () => {
    pairs.set(playerUsernum, opponentUsernum);
    pairs.set(opponentUsernum, playerUsernum);
    const newGameId = ++lastGameId;
    gameIds.set(key, newGameId);

    const players = [playerUsernum, opponentUsernum];
    players.sort(() => Math.random() - 0.5); // randomly set light and dark

    const newGame = new Game(newGameId, players[0], players[1]);
    games.set(newGameId, newGame);

    res.json({
      status: 'OK',
      data: {
        game_id: newGameId,
      },
    });

    console.log(games);
    console.log(gameIds);
    console.log(pairs);

    return newGameId;
  };

  if (playerUsernum === opponentUsernum) {
    callback();
  } else {
    waitingOn.set(playerUsernum, { waitee: opponentUsernum, callback });
  }
});

app.get('/poll/:gameIdS/:playerUsernum', (req, res) => {
  const { gameIdS, playerUsernum } = req.params;
  const gameId = parseInt(gameIdS);

  console.log('chk', gameId, games);
  if (!games.has(gameId)) {
    res.json({
      status: 'ERROR',
      data: {
        reason: 'Invalid game id',
      },
    });
    return;
  }

  const game = games.get(gameId);
  console.log(game!.grid);
  res.json(game!.poll(playerUsernum));
});

app.get('/move/:gameIdS/:playerUsernum/:columnS', (req, res) => {
  const { gameIdS, playerUsernum, columnS } = req.params;
  const gameId = parseInt(gameIdS);
  const column = parseInt(columnS);

  if (!games.has(gameId)) {
    res.json({
      status: 'ERROR',
      data: {
        reason: 'Invalid game id',
      },
    });
    return;
  }

  const game = games.get(gameId);
  console.log('before', game!.grid);
  res.json(game!.move(playerUsernum, column));
  console.log('after', game!.grid);
});

app.use(((err, _req, _res, next) => { // Handle 500
  console.error(err);
  next();
}) as express.ErrorRequestHandler);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}.`);
});
