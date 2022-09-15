const express = require('express');
const app = express();
const http = require('http');
const { connect } = require('http2');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

server.listen(3000, () => {
    console.log('listening on *:3000');
  });

const card_values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const card_suits = ['♥', '♦', '♠', '♣'];

//global variables
let community_hands = { history: [ ], last_draw: [ ] };
let hands = [ ];
let hands_played = 0;
let round = 0;

// create new community hand
var community_hand = { cards:[ ] };

io.on('connection', (socket) => {
    let client;
    // Here you handle the `connected` event
    socket.on('connected', (client) => {
        // And now you can handle this clientUuid
        client = client;
        console.log(client)
        console.log(hands)

        //find currently dealt hand
        let dealt_hand = hands.find(hand => hand.id == client.uuid)

        //id player has hand connected to uuid, send player their hand
        if(dealt_hand){
            console.log(hands[client.uuid])
            io.to(client.socketid).emit('hand', dealt_hand.cards);
        }
    });

        // socket.emit('remember_player', {socketID: socket.id, hands});
    
    socket.emit('community_hand', community_hands.last_draw);
    
    socket.on('deal', () => {
        //resets clients hands
        hands = [];
        //resets community hands last draw
        community_hands.last_draw = [];
        

        //reset to round 0 (pre-flop)
        round = 0;
        //count hands played
        hands_played++;

        ///get all connected players (by id)
        let connected_players = io.allSockets();
        console.log(connected_players)

        //create new deck
        let active_deck = getDeck();
        
        connected_players.then((players) => {
            //loop through each player
            players.forEach((player) => {
                // create new hand
                let hand = { socket, cards:[ ] };

                // add some cards
                for (let i = 0; i < 2; i++) {
                    hand.cards.push(pickCard(active_deck));
                }

                //remember players at the table using sessionstorage
                // sessionStorage.setItem('initialID', player);

                //send player their hand
                io.to(player).emit('hand', hand.cards);
            })
        })

        //resets community hand
        community_hand = { cards:[ ] };
        io.emit('community_hand', community_hand.cards);
        // add some cards
        for (let i = 0; i < 5; i++) {
            community_hand.cards.push(pickCard(active_deck));
        }

        // remember hand
        community_hands.history.push(community_hand);
    })

    socket.on('dealt', (clientHand) => {
        // remember hands dealt
        hands.push(clientHand);
    })

    socket.on('draw', () => {
        let show_cards = [];

        //flop
        if(round == 0) show_cards = community_hand.cards.slice(0,3);
        //turn
        if(round == 1) show_cards = community_hand.cards.slice(0,4);
        //river
        if(round == 2) show_cards = community_hand.cards.slice(0,5);
        //reveal
        if(round == 3) show_cards = community_hand.cards.slice(0,5);

        // send hand to all players
        io.emit('community_hand', show_cards);

        //save last seen draw
        community_hands.last_draw = show_cards;
        
        //count round
        round++;
    })
    

    console.log('a user connected');

    // a player disconnected
    socket.on('disconnect', () => {
        console.log('user disconnected');



        // remove player
        // hands = hands.filter((hand) => hand.socket !== socket);
    });
});

// io.on('deal', (socket) => {
//     console.log('deal')

//     // create new hand
//     var hand = { socket, cards:[ ] };
//     // create new community hand
//     var community_hand = { socket, cards:[ ] };

//     // add some cards
//     for (let i = 0; i < 2; i++) {
//         hand.cards.push((Math.random() * 10) >>> 0);
//     }
//     // add some cards
//     for (let i = 0; i < 5; i++) {
//         community_hand.cards.push((Math.random() * 10) >>> 0);
//     }

//     // remember hand
//     hands.push(hand);
//     // remember hand
//     community_hands.push(community_hand);

//     // send hand to player
//     socket.emit('hand', hand.cards);
// })


//general functions
function getDeck(){
    let deck = [];
    card_suits.forEach((suit) => {
        card_values.forEach((value) => {
            let card = {value: value, suit: suit};
            deck.push(card);
        });
    });
    return deck;
}
function pickCard(active_deck){
    let random_index = (Math.random() * active_deck.length) >>> 0;
    let dealt_card = active_deck.splice(random_index, 1);
    return dealt_card[0];
}



