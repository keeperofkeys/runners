// Game specific data
(function() {
    var locations = {
        podRoom: {
            name: "podRoom",
            grammarName: "the pod room",
            description: "The dimly lit room is filled with hundreds of human-sized pods just like" +
            " the open one next you that you just climbed out of.",
            exits: {
                n: "hall"
            },
            page: 'index.html'
        },
        hall: {
            name: 'hall',
            grammarName: "the hall",
            description: "It's a long and winding hall",
            exits: {
                s: "podRoom"
            },
            page: 'hall.html'
        }

    };

    var things = {
        whisk: {
            name: "whisk",
            grammarName: "a whisk",
            description: "It's pink and dangerous.",
            location: "podRoom"
        },
        button: {
            name: "button",
            grammarName: "some kind of button",
            description: function() {
                return "The button is glowing " + (this.on ? "green." : "red.");
            },
            location: "podRoom",
            bespoke: {
                on: false,
                push: function() {
                    this.on = !this.on;
                    return "Its colour changes to " + (this.on ? "green." : "red.");
                },
                press: function() {
                    return this.push();
                }
            }
        },
        piano: {
            name: "piano",
            grammarName: "a piano",
            description: "It's a baby grand",
            weight: 80
        }
    };

    var alignments = { // optional
        leadership: {
            name: 'authority',
            grammarName: 'The Colony Authority'
        },
        mafia: {
            name: 'mafia',
            grammarName: 'The Mafia'
        },
        rebels: {
            name: 'rebels',
            grammarName: 'the rebels'
        }
    };

    var roles = {
        colonist: {
            name: 'colonist' // base role
        },
        farmer: {
            name: 'farmer'
        },
        cop: {
            name: 'cop'
        },
        pilot: {
            name: 'pilot'
        },
        dustman: {
            name: 'garbage operative'
        }

    };

    var characters = {
        protagonist: {
            description: "I probably look much the same as usual.",
            name: "Me",
            money: 20, // what is a reasonable amount for a newcomer?
            personality: { // undefined types are randomized
                experience: 0,
                morality: 50 // player starts neutral but this is only perceptions of others
            },
            alignments: { // nonaligned at start, just average worker
                leadership: 0,
                mafia: 0,
                rebels: 0
            },
            roles: ['colonist'],
            inventory: ['piano']
        },
        greeter: {
            name: "Herbert",
            description: "He's a generic Herbert.",
            location: "r",
            money: 0,
            personality: {
                dexterity: 1
            },
            roles: ['pilot','r','r','r','r'],
            alignments: {
                mafia: 80,
                rebels: 40
            }
        }
    };
    $(document).ready(function() {
        V.init({
            PLAYER: 'me',
            locations: locations,
            characters: characters,
            things: things,
            start: 'podRoom',
            alignments: alignments,
            roles: roles
        });
    });


})();