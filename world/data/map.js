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
            grammarName: "a whisk",
            description: "It's pink and dangerous.",
            location: "kitchen"
        },
        button: {
            name: "button",
            grammarName: "some kind of button",
            description: function() {
                return "The button is glowing " + (this.on ? "green." : "red.");
            },
            location: "kitchen",
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
            description: "It's a baby grand"
        }
    };

    var characters = {
        myself: {
            description: "I probably look much the same as usual.",
            name: "Me",
            money: 20,
            personality: { // undefined types will be randomized
                stamina: 20 // 0-100
            },
            inventory: ['piano']
        },
        herbert: {
            name: "Herbert",
            description: "He's a generic Herbert.",
            location: "r",
            money: 0,
            personality: {
                dexterity: 1
            }
        }
    };
    $(document).ready(function() {
        V.init({
            PLAYER: 'me',
            map: map,
            characters: characters,
            things: things,
            start: 'kitchen'
        });
    });

})();