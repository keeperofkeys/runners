// Game specific data
(function() {
    var locations = {
        podRoom: {
            name: "podRoom",
            grammarName: "the pod room",
            description: "The dimly lit room is filled with hundreds of human-sized pods just like" +
            " the open one next you that you just climbed out of.",
            exits: {
                n: "hall",
                d: "aperture"
            },
            page: 'index.html',
            down: function () {
                var hatch = V.findThingsByName('hatch');
                if (hatch._open) {
                    return this.d();
                } else {
                    return V.messages.cantGoThatWay;
                }
            }
        },
        hall: {
            name: 'hall',
            grammarName: "the hall",
            description: "It's a long and winding hall",
            exits: {
                s: "podRoom"
            },
            page: 'hall.html'
        },
        aperture: {
            name: "aperture",
            grammarName: "a service aperture",
            description: "You're in a small aperture, little more than a metal cube. ",
            exits: {
                u: "podRoom"
            }
        }

    };

    var things = {
        whisk: {
            name: "whisk",
            grammarName: "a whisk",
            description: "It's pink and dangerous.",
            location: "podRoom"
        },
        hatch: {
            name: "hatch",
            grammarName: "a hatch in the pod room floor",
            description: function() {
                return (this._open ? "It's hinged upwards, revealing a small aperture below." : "It's square and lies tightly flush with the floor.");
            },
            location: "podRoom",
            bespoke: {
                _open: false,
                open: function() {
                    return (this._open ? "The hatch is already open." : "It has no handle and lies flush to the floor. You can't grip it.");
                }
            },
            down: function () {
                var pr = V.findLocationByName('podRoom');
                return pr.d();
            }
        },
        button: {
            name: "button",
            grammarName: "some kind of button",
            description: function() {
                return "The button is glowing " + (this._on ? "green." : "red.");
            },
            location: "podRoom",
            bespoke: {
                _on: false,
                push: function() {
                    this._on = !this._on;
                    var hatch = V.findThingsByName('hatch');
                    hatch._open = this._on;
                    return "The button changes to " + (this._on ? "green. A hatch in the floor springs open." : "red. The hatch snaps shut.") + "";
                },
                press: function() {
                    return this.push();
                }
            }
        },
        pamphlet: {
            name: "pamphlet",
            grammarName: "a shiny yellow pamphlet",
            location: "aperture",
            description: "RESIST AUTHORITY LIES AND VIOLENCE!<br>" +
            "The Authority withholds supplies and locks up anyone who questions their power.<br>" +
            "Come to Central Square on Moonday to make your feelings heard!<br>" +
            "Cameras are everywhere; wear a mask."
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
            roles: roles,
            messageOverrides: {
                genericImpossibleAction: "Do what?"
            }
        });
    });


})();