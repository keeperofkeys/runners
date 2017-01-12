// Game specific data
(function() {
    var map = {
        kitchen: {
            name: "kitchen",
            description: "It looks like a student kitchen - dirty, with washing up piled high in the sink.",
            exits: {
                n: "hall"
            }
        },
        hall: {
            name: 'hall',
            description: 'The long and winding hall',
            exits: {
                s: "kitchen"
            }
        }

    };

    var things = {
        whisk: {
            name: "whisk",
            description: "It's pink and dangerous.",
            location: "kitchen"
        },
        button: {
            name: "button",
            description: function(b) {
                return "The button is glowing " + (b.on ? "green." : "red.");
            },
            location: "kitchen",
            bespoke: {
                on: false,
                push: function(b) {
                    b.on = !b.on; // TODO: this doesn't work - 'this' needs to be passed in somehow - by language parser?
                    return "Its colour changes to " + (b.on ? "green." : "red.");
                }
            }
        },
        piano: {
            name: "piano",
            description: "It's a baby grand"
        }
    };

    var characters = {
        myself: {
            description: "I probably look much the same as usual.",
            name: "Me",
            location: "kitchen",
            money: 20,
            personality: {
                stealth: 'r', // denotes randomized
                dexterity: 'r',
                charisma: 'r',
                stamina: 20, // 0-100
                morality: 'r'
            },
            inventory: ['piano']
        },
        herbert: {
            name: "Herbert",
            description: "He's a generic Herbert.",
            location: "r",
            money: 0,
            personality: {
                stealth: 'r',
                dexterity: 1,
                charisma: 'r',
                stamina: 'r',
                morality: 'r'
            }
        }
    };

    V.init({
        PLAYER: 'me',
        map: map,
        characters: characters,
        things: things
    });
})();